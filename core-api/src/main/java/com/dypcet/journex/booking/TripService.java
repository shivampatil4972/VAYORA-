package com.dypcet.journex.booking;

import static com.dypcet.journex.booking.BookingService.conflict;
import static com.dypcet.journex.booking.BookingService.notFound;

import com.dypcet.journex.booking.BookingService.Booking;
import com.dypcet.journex.booking.BookingService.Cancelled;
import com.dypcet.journex.booking.BookingService.Decided;
import com.dypcet.journex.booking.BookingService.LockedRide;
import com.dypcet.journex.eventlog.EventLogService;
import com.dypcet.journex.eventlog.EventType;
import com.dypcet.journex.eventlog.HasActor;
import com.dypcet.journex.notification.NotificationService;
import com.dypcet.journex.notification.NotificationService.Type;
import com.dypcet.journex.payment.PaymentService;
import com.dypcet.journex.payment.PaymentService.RefundReason;
import com.dypcet.journex.payment.PaymentService.SettlementReason;
import com.dypcet.journex.ride.RideService;
import com.dypcet.journex.routing.RouteService.Point;
import com.dypcet.journex.ride.RideService.Candidate;
import com.dypcet.journex.ride.RideService.Ride;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * What a driver does to a whole ride: start it, complete it, withdraw it.
 *
 * <p>Trip events are per passenger booking, not per vehicle: the primary metric divides
 * completed trips by searches, and a search is one passenger's. Every booking that gets a
 * {@code trip_started} later gets exactly one {@code trip_completed} or {@code trip_failed}.
 *
 * <p>Takes the ride lock first, like {@link BookingService}.
 */
@Service
public class TripService {

    record Trip(long bookingId, long rideId, long passengerId, long driverId) implements HasActor {
        @Override
        public String actorType() {
            return "driver";
        }

        @Override
        public Long actorId() {
            return driverId;
        }
    }

    record TripFailed(long bookingId, long rideId, long passengerId, long driverId,
            String reason) implements HasActor {
        @Override
        public String actorType() {
            return "driver";
        }

        @Override
        public Long actorId() {
            return driverId;
        }
    }

    // How far either side of the withdrawn ride an alternative may leave.
    private static final Duration ALTERNATIVES_WINDOW = Duration.ofHours(3);
    private static final ZoneId CORRIDOR_ZONE = ZoneId.of("Asia/Kolkata");

    private final JdbcTemplate jdbc;
    private final BookingService bookings;
    private final PaymentService payments;
    private final NotificationService notifications;
    private final RideService rides;
    private final EventLogService events;
    private final Clock clock;
    private final Duration earlyStart;

    public TripService(JdbcTemplate jdbc, BookingService bookings, PaymentService payments,
            NotificationService notifications, RideService rides,
            EventLogService events, Clock clock,
            @Value("${journex.trip.early-start}") Duration earlyStart) {
        this.jdbc = jdbc;
        this.bookings = bookings;
        this.payments = payments;
        this.notifications = notifications;
        this.rides = rides;
        this.events = events;
        this.clock = clock;
        this.earlyStart = earlyStart;
    }

    /**
     * Starts the ride. Requests the driver never answered are rejected and their seats
     * returned; each confirmed booking becomes a trip.
     */
    @Transactional
    public Ride start(long driverId, long rideId) {
        LockedRide ride = lockOwned(driverId, rideId);
        if (!"SCHEDULED".equals(ride.status())) {
            throw conflict("Only a scheduled ride can be started");
        }
        if (clock.instant().isBefore(ride.departureTime().minus(earlyStart))) {
            throw conflict("It is too early to start this ride");
        }
        setStatus(rideId, "IN_PROGRESS");
        for (Booking unanswered : bookings.lockAll(rideId, BookingStatus.PENDING)) {
            bookings.move(unanswered, BookingStatus.REJECTED);
            // Never answered: not the driver's decision, whoever started the ride.
            bookings.recordRejectedBy(unanswered.id(), "platform");
            payments.releaseInFull(unanswered.id(), RefundReason.NOT_ACCEPTED);
            bookings.notifyDeclined(unanswered);
            events.write(EventType.BOOKING_REJECTED,
                    new Decided(unanswered.id(), rideId, driverId, false));
        }
        for (Booking booking : bookings.lockAll(rideId, BookingStatus.CONFIRMED)) {
            events.write(EventType.TRIP_STARTED,
                    new Trip(booking.id(), rideId, booking.passengerId(), driverId));
        }
        return rides.get(rideId);
    }

    /** Records that a passenger with a confirmed booking never boarded. */
    @Transactional
    public Booking noShow(long driverId, long bookingId) {
        Long rideId = bookings.rideOf(bookingId);
        if (rideId == null) {
            throw notFound("Booking not found");
        }
        LockedRide ride = bookings.lockRide(rideId);
        if (ride.driverId() != driverId) {
            throw notFound("Booking not found");
        }
        if (!"IN_PROGRESS".equals(ride.status())) {
            throw conflict("A no-show can only be recorded while the ride is in progress");
        }
        Booking booking = bookings.lockBooking(bookingId);
        bookings.move(booking, BookingStatus.NO_SHOW);
        payments.captureInFull(bookingId, driverId, SettlementReason.PASSENGER_NO_SHOW);
        notifications.send(booking.passengerId(), Type.MARKED_NO_SHOW,
                "The driver reported that you did not board for " + BookingService.seatsOn(booking)
                        + ". Nothing is refunded for a missed ride.", bookingId);
        events.write(EventType.TRIP_FAILED, new TripFailed(bookingId, rideId,
                booking.passengerId(), driverId, "passenger_no_show"));
        return bookings.load(bookingId);
    }

    /** Ends the ride. Every booking still confirmed is completed. */
    @Transactional
    public Ride complete(long driverId, long rideId) {
        LockedRide ride = lockOwned(driverId, rideId);
        if (!"IN_PROGRESS".equals(ride.status())) {
            throw conflict("Only a ride in progress can be completed");
        }
        setStatus(rideId, "COMPLETED");
        for (Booking booking : bookings.lockAll(rideId, BookingStatus.CONFIRMED)) {
            bookings.move(booking, BookingStatus.COMPLETED);
            payments.captureInFull(booking.id(), driverId, SettlementReason.TRIP_COMPLETED);
            notifications.send(booking.passengerId(), Type.TRIP_COMPLETED,
                    "Your trip from " + booking.fromStop() + " to " + booking.toStop()
                            + " is complete. You can rate your driver in My bookings.", booking.id());
            events.write(EventType.TRIP_COMPLETED,
                    new Trip(booking.id(), rideId, booking.passengerId(), driverId));
        }
        return rides.get(rideId);
    }

    /** Withdraws a ride that has not started, cancelling every live booking on it. */
    @Transactional
    /**
     * Up to three other rides that could take this passenger, as one sentence for the
     * notification, or nothing if there are none. A suggestion only: nothing is booked.
     */
    private String otherRides(long rideId, Booking booking) {
        List<Point> ends = jdbc.query("""
                SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon
                FROM ride_stops WHERE ride_id = ? AND seq IN (?, ?) ORDER BY seq""",
                (rs, n) -> new Point(rs.getDouble("lat"), rs.getDouble("lon")),
                rideId, booking.fromSeq(), booking.toSeq());
        List<Candidate> others = rides.alternatives(booking.passengerId(), rideId, ends.get(0), ends.get(1),
                booking.boardingTime(), booking.seats(), ALTERNATIVES_WINDOW, 3);
        if (others.isEmpty()) {
            return " No other ride with seats leaves near that time.";
        }
        DateTimeFormatter time = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH).withZone(CORRIDOR_ZONE);
        return " Other rides that could take you: " + others.stream()
                .map(c -> time.format(c.boardingTime()) + " from " + c.fromStop() + " with " + c.driverName())
                .collect(Collectors.joining("; ")) + ". Search again to book one.";
    }

    public Ride cancel(long driverId, long rideId) {
        LockedRide ride = lockOwned(driverId, rideId);
        if (!"SCHEDULED".equals(ride.status())) {
            throw conflict("Only a scheduled ride can be cancelled");
        }
        setStatus(rideId, "CANCELLED");
        for (BookingStatus live : new BookingStatus[] {BookingStatus.PENDING, BookingStatus.CONFIRMED}) {
            for (Booking booking : bookings.lockAll(rideId, live)) {
                bookings.move(booking, BookingStatus.CANCELLED);
                bookings.recordCancelledBy(booking.id(), "driver");
                payments.releaseInFull(booking.id(), RefundReason.DRIVER_CANCELLED);
                notifications.send(booking.passengerId(), Type.RIDE_CANCELLED,
                        "The driver cancelled the ride you booked for "
                                + BookingService.seatsOn(booking)
                                + ". Everything you paid has been returned." + otherRides(rideId, booking),
                        booking.id());
                events.write(EventType.BOOKING_CANCELLED, new Cancelled(booking.id(), rideId,
                        booking.passengerId(), booking.seats(), booking.boardingTime(),
                        "driver", driverId));
            }
        }
        return rides.get(rideId);
    }

    /** Someone else's ride looks the same as one that does not exist. */
    private LockedRide lockOwned(long driverId, long rideId) {
        LockedRide ride = bookings.lockRide(rideId);
        if (ride == null || ride.driverId() != driverId) {
            throw notFound("Ride not found");
        }
        return ride;
    }

    private void setStatus(long rideId, String status) {
        jdbc.update("UPDATE rides SET status = ? WHERE id = ?", status, rideId);
    }
}
