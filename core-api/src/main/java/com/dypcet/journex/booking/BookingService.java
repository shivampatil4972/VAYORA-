package com.dypcet.journex.booking;

import com.dypcet.journex.eventlog.EventLogService;
import com.dypcet.journex.eventlog.EventType;
import com.dypcet.journex.eventlog.HasActor;
import com.dypcet.journex.hazard.HazardFeatures;
import com.dypcet.journex.payment.PaymentChoice;
import com.dypcet.journex.payment.PaymentService;
import com.dypcet.journex.payment.PaymentService.RefundReason;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Owns the booking state machine and the seat inventory it moves.
 *
 * <p>Every method that touches seats locks the ride row first, then the booking row, then
 * updates segments. One lock order everywhere means concurrent requests on a ride queue
 * up instead of deadlocking, and the last seat goes to exactly one of them.
 */
@Service
public class BookingService {

    /**
     * @param price        the fare: what the driver is owed if the trip runs
     * @param serviceFee   the platform's fee on top of the fare; null if nothing was charged
     * @param total        fare plus fee: what was held from the passenger; null as above
     * @param refunded     what has been returned to the passenger; null if nothing
     * @param boardingTime   when the ride leaves the passenger's boarding stop
     * @param passengerRated whether the passenger has rated the driver for this trip
     * @param driverRated    whether the driver has rated the passenger for this trip
     */
    public record Booking(long id, long rideId, long passengerId, String passengerName,
            int fromSeq, int toSeq, String fromStop, String toStop, int seats, BigDecimal price,
            BigDecimal serviceFee, BigDecimal total, BigDecimal refunded,
            BookingStatus status, Instant boardingTime, Instant createdAt,
            boolean passengerRated, boolean driverRated) {
    }

    record Requested(long bookingId, long rideId, long passengerId, int fromSeq, int toSeq,
            int seats, Instant departureTime) implements HasActor {
        @Override
        public String actorType() {
            return "passenger";
        }

        @Override
        public Long actorId() {
            return passengerId;
        }
    }

    /** @param instant true when the ride confirms bookings without the driver deciding */
    record Decided(long bookingId, long rideId, long driverId, boolean instant) implements HasActor {
        @Override
        public String actorType() {
            return "driver";
        }

        @Override
        public Long actorId() {
            return driverId;
        }
    }

    /**
     * {@code departureTime} is required by the late-cancellation metric.
     *
     * @param cancelledBy "passenger", or "driver" when the driver withdrew the whole ride
     */
    record Cancelled(long bookingId, long rideId, long passengerId, int seats,
            Instant departureTime, String cancelledBy, long cancelledById) implements HasActor {
        @Override
        public String actorType() {
            return cancelledBy;
        }

        @Override
        public Long actorId() {
            return cancelledById;
        }
    }

    record LockedRide(long driverId, boolean instantBooking, String status,
            Instant departureTime) {
    }

    private static final String SELECT_BOOKING = """
            SELECT b.*, u.full_name AS passenger_name, s.name AS from_stop, t.name AS to_stop,
                   r.departure_time + make_interval(mins => s.offset_minutes) AS boarding,
                   p.service_fee, p.amount AS total, f.amount AS refunded,
                   EXISTS (SELECT 1 FROM ratings g WHERE g.booking_id = b.id
                             AND g.rater_id = b.passenger_id) AS passenger_rated,
                   EXISTS (SELECT 1 FROM ratings g WHERE g.booking_id = b.id
                             AND g.rater_id = r.driver_id) AS driver_rated
            FROM bookings b
            JOIN rides r ON r.id = b.ride_id
            JOIN users u ON u.id = b.passenger_id
            JOIN ride_stops s ON s.ride_id = b.ride_id AND s.seq = b.from_seq
            JOIN ride_stops t ON t.ride_id = b.ride_id AND t.seq = b.to_seq
            LEFT JOIN payment_intents p ON p.booking_id = b.id
            LEFT JOIN refunds f ON f.booking_id = b.id
            """;

    private static final RowMapper<Booking> MAPPER = (rs, n) -> new Booking(
            rs.getLong("id"), rs.getLong("ride_id"), rs.getLong("passenger_id"),
            rs.getString("passenger_name"), rs.getInt("from_seq"), rs.getInt("to_seq"),
            rs.getString("from_stop"), rs.getString("to_stop"), rs.getInt("seats"),
            rs.getBigDecimal("price"), rs.getBigDecimal("service_fee"),
            rs.getBigDecimal("total"), rs.getBigDecimal("refunded"),
            BookingStatus.valueOf(rs.getString("status")),
            rs.getObject("boarding", OffsetDateTime.class).toInstant(),
            rs.getObject("created_at", OffsetDateTime.class).toInstant(),
            rs.getBoolean("passenger_rated"), rs.getBoolean("driver_rated"));

    private final JdbcTemplate jdbc;
    private final EventLogService events;
    private final HazardFeatures hazardFeatures;
    private final PaymentService payments;
    private final ObjectMapper mapper;
    private final Clock clock;

    public BookingService(JdbcTemplate jdbc, EventLogService events,
            HazardFeatures hazardFeatures, PaymentService payments, ObjectMapper mapper,
            Clock clock) {
        this.jdbc = jdbc;
        this.events = events;
        this.hazardFeatures = hazardFeatures;
        this.payments = payments;
        this.mapper = mapper;
        this.clock = clock;
    }

    /**
     * Takes seats on every leg from stop {@code fromSeq} to stop {@code toSeq}, or none.
     * Confirms at once on an instant-booking ride; otherwise the seats are held while the
     * driver decides. The fare and fee are held in the same transaction: a declined
     * payment leaves no booking and no seat taken.
     *
     * @param idempotencyKey if not null, a repeat of an earlier request with the same key
     *                       returns that booking instead of making another
     */
    @Transactional
    public Booking request(long passengerId, long rideId, int fromSeq, int toSeq, int seats,
            PaymentChoice payment, String idempotencyKey) {
        if (toSeq <= fromSeq) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "toSeq must come after fromSeq");
        }
        LockedRide ride = lockRide(rideId);
        if (ride == null) {
            throw notFound("Ride not found");
        }
        // Checked under the ride lock, so two copies of one request cannot both get here.
        if (idempotencyKey != null) {
            Booking repeat = repeatOf(passengerId, idempotencyKey, rideId, fromSeq, toSeq, seats);
            if (repeat != null) {
                return repeat;
            }
        }
        if (!"SCHEDULED".equals(ride.status())) {
            throw conflict("This ride is not open for booking");
        }
        int legs = toSeq - fromSeq;
        Integer legsOnRide = jdbc.queryForObject("""
                SELECT COUNT(*) FROM ride_segments WHERE ride_id = ? AND seq >= ? AND seq < ?""",
                Integer.class, rideId, fromSeq, toSeq);
        if (legsOnRide != legs) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Those stops are not on this ride");
        }
        Instant boarding = jdbc.queryForObject("""
                SELECT r.departure_time + make_interval(mins => s.offset_minutes)
                FROM rides r JOIN ride_stops s ON s.ride_id = r.id AND s.seq = ?
                WHERE r.id = ?""",
                OffsetDateTime.class, fromSeq, rideId).toInstant();
        Instant now = clock.instant();
        if (!boarding.isAfter(now)) {
            throw conflict("This ride has already left that stop");
        }

        // Only legs that still have the seats are decremented. If any leg is short the
        // count comes up short and the rollback puts the others back.
        int taken = jdbc.update("""
                UPDATE ride_segments SET seats_available = seats_available - ?
                WHERE ride_id = ? AND seq >= ? AND seq < ? AND seats_available >= ?""",
                seats, rideId, fromSeq, toSeq, seats);
        if (taken != legs) {
            throw conflict("Not enough seats left on that part of the ride");
        }

        BookingStatus status = ride.instantBooking() ? BookingStatus.CONFIRMED : BookingStatus.PENDING;
        // Taken before the row exists: a booking is not part of its own history.
        String features = featuresJson(passengerId, seats, now, boarding);
        Long bookingId;
        try {
            bookingId = jdbc.queryForObject("""
                    INSERT INTO bookings (ride_id, passenger_id, from_seq, to_seq, seats, price,
                                          status, hazard_features, accepted_at, idempotency_key)
                    SELECT ?, ?, ?, ?, ?, SUM(price) * ?, ?, CAST(? AS jsonb), ?, ?
                    FROM ride_segments WHERE ride_id = ? AND seq >= ? AND seq < ?
                    RETURNING id""",
                    Long.class, rideId, passengerId, fromSeq, toSeq, seats, seats, status.name(),
                    features, status == BookingStatus.CONFIRMED ? utc(now) : null, idempotencyKey,
                    rideId, fromSeq, toSeq);
        } catch (DuplicateKeyException e) {
            // The same key, sent for a different ride at the same moment.
            throw conflict("This request was already submitted");
        }
        BigDecimal fare = jdbc.queryForObject(
                "SELECT price FROM bookings WHERE id = ?", BigDecimal.class, bookingId);
        payments.hold(bookingId, passengerId, fare, payment);

        events.write(EventType.BOOKING_REQUESTED,
                new Requested(bookingId, rideId, passengerId, fromSeq, toSeq, seats, boarding));
        if (status == BookingStatus.CONFIRMED) {
            events.write(EventType.BOOKING_ACCEPTED,
                    new Decided(bookingId, rideId, ride.driverId(), true));
        }
        return load(bookingId);
    }

    @Transactional
    public Booking accept(long driverId, long bookingId) {
        Booking booking = lockForDriver(driverId, bookingId);
        move(booking, BookingStatus.CONFIRMED);
        jdbc.update("UPDATE bookings SET accepted_at = ? WHERE id = ?", utc(clock.instant()),
                bookingId);
        events.write(EventType.BOOKING_ACCEPTED,
                new Decided(bookingId, booking.rideId(), driverId, false));
        return load(bookingId);
    }

    @Transactional
    public Booking reject(long driverId, long bookingId) {
        Booking booking = lockForDriver(driverId, bookingId);
        move(booking, BookingStatus.REJECTED);
        payments.releaseInFull(bookingId, RefundReason.NOT_ACCEPTED);
        events.write(EventType.BOOKING_REJECTED,
                new Decided(bookingId, booking.rideId(), driverId, false));
        return load(bookingId);
    }

    @Transactional
    public Booking cancel(long passengerId, long bookingId) {
        Long rideId = rideOf(bookingId);
        if (rideId == null) {
            throw notFound("Booking not found");
        }
        LockedRide ride = lockRide(rideId);
        Booking booking = lockBooking(bookingId);
        // Someone else's booking looks the same as one that does not exist.
        if (booking.passengerId() != passengerId) {
            throw notFound("Booking not found");
        }
        Instant now = clock.instant();
        if ("IN_PROGRESS".equals(ride.status()) || !booking.boardingTime().isAfter(now)) {
            throw conflict("This ride has already left; the booking can no longer be cancelled");
        }
        move(booking, BookingStatus.CANCELLED);
        recordCancelledBy(bookingId, "passenger");
        payments.settlePassengerCancellation(bookingId, ride.driverId(),
                booking.status() == BookingStatus.CONFIRMED, booking.boardingTime(), now);
        events.write(EventType.BOOKING_CANCELLED, new Cancelled(bookingId, booking.rideId(),
                passengerId, booking.seats(), booking.boardingTime(), "passenger", passengerId));
        return load(bookingId);
    }

    /**
     * Locks and returns the ride's bookings in one status, oldest first. The caller must
     * already hold the ride lock.
     */
    List<Booking> lockAll(long rideId, BookingStatus status) {
        return jdbc.query(SELECT_BOOKING + "WHERE b.ride_id = ? AND b.status = ? "
                + "ORDER BY b.id FOR UPDATE OF b", MAPPER, rideId, status.name());
    }

    public List<Booking> forPassenger(long passengerId) {
        return jdbc.query(SELECT_BOOKING + "WHERE b.passenger_id = ? ORDER BY b.id DESC",
                MAPPER, passengerId);
    }

    /** Bookings on a ride, visible only to the driver who published it. */
    public List<Booking> forRide(long driverId, long rideId) {
        Integer owned = jdbc.queryForObject(
                "SELECT COUNT(*) FROM rides WHERE id = ? AND driver_id = ?",
                Integer.class, rideId, driverId);
        if (owned == 0) {
            throw notFound("Ride not found");
        }
        return jdbc.query(SELECT_BOOKING + "WHERE b.ride_id = ? ORDER BY b.id", MAPPER, rideId);
    }

    /** Applies a status change and returns the seats when the booking stops holding them. */
    void move(Booking booking, BookingStatus next) {
        if (!booking.status().canTransitionTo(next)) {
            throw conflict("A " + booking.status() + " booking cannot become " + next);
        }
        jdbc.update("UPDATE bookings SET status = ?, updated_at = now() WHERE id = ?",
                next.name(), booking.id());
        if (booking.status().holdsSeats() && !next.holdsSeats()) {
            jdbc.update("""
                    UPDATE ride_segments SET seats_available = seats_available + ?
                    WHERE ride_id = ? AND seq >= ? AND seq < ?""",
                    booking.seats(), booking.rideId(), booking.fromSeq(), booking.toSeq());
        }
    }

    private Booking lockForDriver(long driverId, long bookingId) {
        Long rideId = rideOf(bookingId);
        if (rideId == null) {
            throw notFound("Booking not found");
        }
        LockedRide ride = lockRide(rideId);
        if (ride.driverId() != driverId) {
            throw notFound("Booking not found");
        }
        return lockBooking(bookingId);
    }

    /**
     * The booking an earlier request with this key made, or null if there was none.
     * A key reused for a different request is refused, not silently answered.
     */
    private Booking repeatOf(long passengerId, String key, long rideId, int fromSeq, int toSeq,
            int seats) {
        List<Long> found = jdbc.queryForList(
                "SELECT id FROM bookings WHERE passenger_id = ? AND idempotency_key = ?",
                Long.class, passengerId, key);
        if (found.isEmpty()) {
            return null;
        }
        Booking earlier = load(found.get(0));
        if (earlier.rideId() != rideId || earlier.fromSeq() != fromSeq
                || earlier.toSeq() != toSeq || earlier.seats() != seats) {
            throw conflict("This idempotency key was already used for a different booking");
        }
        return earlier;
    }

    void recordCancelledBy(long bookingId, String who) {
        jdbc.update("UPDATE bookings SET cancelled_by = ? WHERE id = ?", who, bookingId);
    }

    /** Null if the features cannot be written; the booking goes ahead unscored. */
    private String featuresJson(long passengerId, int seats, Instant now, Instant boarding) {
        try {
            return mapper.writeValueAsString(
                    hazardFeatures.snapshot(passengerId, seats, now, boarding));
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private static OffsetDateTime utc(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    Long rideOf(long bookingId) {
        List<Long> found = jdbc.queryForList(
                "SELECT ride_id FROM bookings WHERE id = ?", Long.class, bookingId);
        return found.isEmpty() ? null : found.get(0);
    }

    /** Returns null when there is no such ride. */
    LockedRide lockRide(long rideId) {
        List<LockedRide> found = jdbc.query("""
                SELECT driver_id, instant_booking, status, departure_time
                FROM rides WHERE id = ? FOR UPDATE""",
                (rs, n) -> new LockedRide(rs.getLong("driver_id"),
                        rs.getBoolean("instant_booking"), rs.getString("status"),
                        rs.getObject("departure_time", OffsetDateTime.class).toInstant()),
                rideId);
        return found.isEmpty() ? null : found.get(0);
    }

    Booking lockBooking(long bookingId) {
        jdbc.queryForObject("SELECT id FROM bookings WHERE id = ? FOR UPDATE", Long.class,
                bookingId);
        return load(bookingId);
    }

    Booking load(long bookingId) {
        return jdbc.queryForObject(SELECT_BOOKING + "WHERE b.id = ?", MAPPER, bookingId);
    }

    static ResponseStatusException notFound(String reason) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, reason);
    }

    static ResponseStatusException conflict(String reason) {
        return new ResponseStatusException(HttpStatus.CONFLICT, reason);
    }
}
