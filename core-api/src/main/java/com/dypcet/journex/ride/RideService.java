package com.dypcet.journex.ride;

import com.dypcet.journex.eventlog.EventLogService;
import com.dypcet.journex.eventlog.EventType;
import com.dypcet.journex.eventlog.HasActor;
import com.dypcet.journex.payment.ServiceFee;
import com.dypcet.journex.vehicle.VehicleService;
import com.dypcet.journex.vehicle.VehicleService.Vehicle;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RideService {

    /** The corridor is Kolhapur to Pune; a search date is a calendar day there. */
    private static final ZoneId CORRIDOR_ZONE = ZoneId.of("Asia/Kolkata");

    /** @param offsetMinutes minutes after the ride's departure at which it leaves this stop */
    public record StopInput(String name, double lat, double lon, int offsetMinutes) {
    }

    /** @param segmentPrices price per seat of each leg; one fewer than the stops */
    public record PublishRide(long vehicleId, Instant departureTime, int seatsOffered,
            boolean instantBooking, List<StopInput> stops, List<BigDecimal> segmentPrices) {
    }

    public record Stop(int seq, String name, double lat, double lon, Instant departureTime) {
    }

    /** Segment {@code seq} runs from stop {@code seq} to stop {@code seq + 1}. */
    public record Segment(int seq, BigDecimal price, int seatsTotal, int seatsAvailable) {
    }

    public record Ride(long id, long driverId, String driverName, long vehicleId,
            Instant departureTime, int seatsOffered, boolean instantBooking, String status,
            List<Stop> stops, List<Segment> segments) {
    }

    /**
     * One search result: a ride and the stretch of it the passenger would travel.
     *
     * @param fare       for the seats searched for
     * @param serviceFee the platform's fee on that fare
     * @param total      fare plus fee: what booking it would hold
     */
    public record Candidate(long rideId, String driverName, boolean instantBooking,
            int fromSeq, int toSeq, String fromStop, String toStop, Instant boardingTime,
            Instant arrivalTime, BigDecimal pricePerSeat, int seatsAvailable, BigDecimal fare,
            BigDecimal serviceFee, BigDecimal total) {
    }

    record SearchIssued(long passengerId, String origin, String destination, String date,
            int seats) implements HasActor {
        @Override
        public String actorType() {
            return "passenger";
        }

        @Override
        public Long actorId() {
            return passengerId;
        }
    }

    record CandidatesReturned(long passengerId, int count, List<Long> rideIds) implements HasActor {
        @Override
        public String actorType() {
            return "passenger";
        }

        @Override
        public Long actorId() {
            return passengerId;
        }
    }

    private final JdbcTemplate jdbc;
    private final VehicleService vehicles;
    private final EventLogService events;
    private final ServiceFee serviceFee;
    private final Clock clock;

    public RideService(JdbcTemplate jdbc, VehicleService vehicles, EventLogService events,
            ServiceFee serviceFee, Clock clock) {
        this.jdbc = jdbc;
        this.vehicles = vehicles;
        this.events = events;
        this.serviceFee = serviceFee;
        this.clock = clock;
    }

    @Transactional
    public Ride publish(long driverId, PublishRide ride) {
        validate(driverId, ride);

        Long rideId = jdbc.queryForObject("""
                INSERT INTO rides (driver_id, vehicle_id, departure_time, seats_offered,
                                   instant_booking, status)
                VALUES (?, ?, ?, ?, ?, 'SCHEDULED') RETURNING id""",
                Long.class, driverId, ride.vehicleId(), utc(ride.departureTime()),
                ride.seatsOffered(), ride.instantBooking());

        for (int seq = 0; seq < ride.stops().size(); seq++) {
            StopInput stop = ride.stops().get(seq);
            jdbc.update("""
                    INSERT INTO ride_stops (ride_id, seq, name, location, offset_minutes)
                    VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)""",
                    rideId, seq, stop.name().strip(), stop.lon(), stop.lat(), stop.offsetMinutes());
        }
        for (int seq = 0; seq < ride.segmentPrices().size(); seq++) {
            jdbc.update("""
                    INSERT INTO ride_segments (ride_id, seq, price, seats_total, seats_available)
                    VALUES (?, ?, ?, ?, ?)""",
                    rideId, seq, ride.segmentPrices().get(seq), ride.seatsOffered(),
                    ride.seatsOffered());
        }
        return get(rideId);
    }

    private void validate(long driverId, PublishRide ride) {
        Vehicle vehicle = vehicles.findOwned(ride.vehicleId(), driverId);
        if (vehicle == null) {
            throw badRequest("Vehicle not found among your vehicles");
        }
        if (ride.seatsOffered() > vehicle.seats() - 1) {
            throw badRequest("This vehicle can offer at most " + (vehicle.seats() - 1) + " seats");
        }
        if (!ride.departureTime().isAfter(clock.instant())) {
            throw badRequest("Departure time must be in the future");
        }
        if (ride.segmentPrices().size() != ride.stops().size() - 1) {
            throw badRequest("A ride needs exactly one price per leg between stops");
        }
        if (ride.stops().get(0).offsetMinutes() != 0) {
            throw badRequest("The first stop must have offsetMinutes 0");
        }
        for (int i = 1; i < ride.stops().size(); i++) {
            if (ride.stops().get(i).offsetMinutes() <= ride.stops().get(i - 1).offsetMinutes()) {
                throw badRequest("Stops must be in travel order with increasing offsetMinutes");
            }
        }
    }

    public Ride get(long rideId) {
        List<Stop> stops = jdbc.query("""
                SELECT s.seq, s.name, ST_Y(s.location::geometry) AS lat,
                       ST_X(s.location::geometry) AS lon,
                       r.departure_time + make_interval(mins => s.offset_minutes) AS leaves_at
                FROM ride_stops s JOIN rides r ON r.id = s.ride_id
                WHERE s.ride_id = ? ORDER BY s.seq""",
                (rs, n) -> new Stop(rs.getInt("seq"), rs.getString("name"), rs.getDouble("lat"),
                        rs.getDouble("lon"),
                        rs.getObject("leaves_at", OffsetDateTime.class).toInstant()),
                rideId);
        List<Segment> segments = jdbc.query("""
                SELECT seq, price, seats_total, seats_available
                FROM ride_segments WHERE ride_id = ? ORDER BY seq""",
                (rs, n) -> new Segment(rs.getInt("seq"), rs.getBigDecimal("price"),
                        rs.getInt("seats_total"), rs.getInt("seats_available")),
                rideId);
        List<Ride> found = jdbc.query("""
                SELECT r.*, u.full_name FROM rides r JOIN users u ON u.id = r.driver_id
                WHERE r.id = ?""",
                (rs, n) -> new Ride(rs.getLong("id"), rs.getLong("driver_id"),
                        rs.getString("full_name"), rs.getLong("vehicle_id"),
                        rs.getObject("departure_time", OffsetDateTime.class).toInstant(),
                        rs.getInt("seats_offered"), rs.getBoolean("instant_booking"),
                        rs.getString("status"), stops, segments),
                rideId);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ride not found");
        }
        return found.get(0);
    }

    /** A driver's own rides, soonest departure first. */
    public List<Ride> publishedBy(long driverId) {
        return jdbc.queryForList(
                "SELECT id FROM rides WHERE driver_id = ? ORDER BY departure_time, id",
                Long.class, driverId)
                .stream().map(this::get).toList();
    }

    /**
     * Finds scheduled rides that pass through both named stops in that order on the given
     * day and still have the seats on every leg in between. Stops match by name only;
     * distance-based feasibility is a later stage.
     */
    public List<Candidate> search(long passengerId, String origin, String destination,
            LocalDate date, int seats) {
        events.write(EventType.SEARCH_ISSUED,
                new SearchIssued(passengerId, origin, destination, date.toString(), seats));

        Instant dayStart = date.atStartOfDay(CORRIDOR_ZONE).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(CORRIDOR_ZONE).toInstant();
        List<Candidate> candidates = jdbc.query("""
                SELECT r.id, u.full_name, r.instant_booking,
                       o.seq AS from_seq, d.seq AS to_seq, o.name AS from_stop, d.name AS to_stop,
                       r.departure_time + make_interval(mins => o.offset_minutes) AS boarding,
                       r.departure_time + make_interval(mins => d.offset_minutes) AS arrival,
                       SUM(s.price) AS price, MIN(s.seats_available) AS seats
                FROM rides r
                JOIN users u ON u.id = r.driver_id
                JOIN ride_stops o ON o.ride_id = r.id AND lower(o.name) = lower(?)
                JOIN ride_stops d ON d.ride_id = r.id AND lower(d.name) = lower(?)
                                 AND d.seq > o.seq
                JOIN ride_segments s ON s.ride_id = r.id AND s.seq >= o.seq AND s.seq < d.seq
                WHERE r.status = 'SCHEDULED'
                  AND r.departure_time + make_interval(mins => o.offset_minutes) >= ?
                  AND r.departure_time + make_interval(mins => o.offset_minutes) < ?
                  AND r.departure_time + make_interval(mins => o.offset_minutes) > ?
                GROUP BY r.id, u.full_name, o.seq, d.seq, o.name, d.name,
                         o.offset_minutes, d.offset_minutes
                HAVING MIN(s.seats_available) >= ?
                ORDER BY boarding, r.id""",
                (rs, n) -> {
                    BigDecimal fare = rs.getBigDecimal("price").multiply(BigDecimal.valueOf(seats));
                    BigDecimal fee = serviceFee.on(fare);
                    return new Candidate(rs.getLong("id"), rs.getString("full_name"),
                            rs.getBoolean("instant_booking"), rs.getInt("from_seq"),
                            rs.getInt("to_seq"), rs.getString("from_stop"), rs.getString("to_stop"),
                            rs.getObject("boarding", OffsetDateTime.class).toInstant(),
                            rs.getObject("arrival", OffsetDateTime.class).toInstant(),
                            rs.getBigDecimal("price"), rs.getInt("seats"), fare, fee, fare.add(fee));
                },
                origin.strip(), destination.strip(), utc(dayStart), utc(dayEnd),
                utc(clock.instant()), seats);

        events.write(EventType.CANDIDATES_RETURNED, new CandidatesReturned(passengerId,
                candidates.size(), candidates.stream().map(Candidate::rideId).toList()));
        return candidates;
    }

    private static OffsetDateTime utc(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private static ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
