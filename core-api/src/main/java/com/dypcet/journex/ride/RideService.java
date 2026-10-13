package com.dypcet.journex.ride;

import com.dypcet.journex.eventlog.EventLogService;
import com.dypcet.journex.eventlog.EventType;
import com.dypcet.journex.eventlog.HasActor;
import com.dypcet.journex.payment.ServiceFee;
import com.dypcet.journex.routing.RouteService;
import com.dypcet.journex.routing.RouteService.Leg;
import com.dypcet.journex.routing.RouteService.Point;
import com.dypcet.journex.routing.RouteService.Route;
import com.dypcet.journex.vehicle.VehicleService;
import com.dypcet.journex.vehicle.VehicleService.Vehicle;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.UUID;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RideService {

    /** The corridor is Kolhapur to Pune; a search date is a calendar day there. */
    private static final ZoneId CORRIDOR_ZONE = ZoneId.of("Asia/Kolkata");
    private static final String BOARDING = "r.departure_time + make_interval(mins => o.offset_minutes)";
    private static final int MAX_REPEAT_WEEKS = 8;
    private static final String DRIVER_CONFIRMED =
            "(u.email_verified_at IS NOT NULL OR u.phone_verified_at IS NOT NULL)";

    /** @param offsetMinutes minutes after the ride's departure at which it leaves this stop */
    public record StopInput(String name, double lat, double lon, int offsetMinutes) {
    }

    /**
     * @param segmentPrices       price per seat of each leg; one fewer than the stops
     * @param notes               anything the driver wants passengers to know; may be null
     * @param maxTwoInBack        the driver promises at most two passengers on the back seat
     * @param returnDepartureTime when the same stops are driven in reverse, with the same
     *                            prices and intervals; null for no return ride
     * @param repeatWeeks         how many further weeks the ride, and its return, are
     *                            published for at the same time of day
     */
    public record PublishRide(long vehicleId, Instant departureTime, int seatsOffered,
            boolean instantBooking, List<StopInput> stops, List<BigDecimal> segmentPrices,
            String notes, boolean maxTwoInBack, Instant returnDepartureTime, int repeatWeeks) {

        /** One ride, once, with nothing said about it. */
        public PublishRide(long vehicleId, Instant departureTime, int seatsOffered,
                boolean instantBooking, List<StopInput> stops, List<BigDecimal> segmentPrices) {
            this(vehicleId, departureTime, seatsOffered, instantBooking, stops, segmentPrices,
                    null, false, null, 0);
        }
    }

    public record Stop(int seq, String name, double lat, double lon, Instant departureTime) {
    }

    /** Segment {@code seq} runs from stop {@code seq} to stop {@code seq + 1}. */
    public record Segment(int seq, BigDecimal price, int seatsTotal, int seatsAvailable) {
    }

    /**
     * @param distanceKm      length of the route; null on a ride with no recorded route
     * @param durationMinutes driving time of the route; null as above
     * @param routeSource     {@code OSRM} for a road route, {@code STRAIGHT_LINE} when the
     *                        stops were only joined up; null as above
     * @param path            the route to draw, as [lat, lon] pairs; empty as above
     * @param seriesSize      how many rides were published together with this one,
     *                        itself included; 1 for a ride published alone
     */
    public record Ride(long id, long driverId, String driverName, long vehicleId,
            Instant departureTime, int seatsOffered, boolean instantBooking, String status,
            List<Stop> stops, List<Segment> segments, Double distanceKm, Integer durationMinutes,
            String routeSource, List<double[]> path, String notes, boolean maxTwoInBack,
            int seriesSize) {
    }

    /**
     * One search result: a ride and the stretch of it the passenger would travel.
     *
     * @param fare              for the seats searched for
     * @param serviceFee        the platform's fee on that fare
     * @param total             fare plus fee: what booking it would hold
     * @param driverRating      mean of the stars the driver has received; null if none
     * @param driverRatingCount how many ratings that mean is over
     * @param pickupDistanceM   straight-line metres from where the passenger starts to the
     *                          boarding stop
     * @param dropoffDistanceM  straight-line metres from the alighting stop to where the
     *                          passenger is going
     * @param driverConfirmed   the driver has confirmed an email address or a phone number;
     *                          not an identity check
     * @param vehicle           make and model, as the driver entered them
     * @param comfort           the driver's own description of the car; null, like luggage,
     *                          if not said
     */
    public record Candidate(long rideId, String driverName, boolean instantBooking,
            int fromSeq, int toSeq, String fromStop, String toStop, Instant boardingTime,
            Instant arrivalTime, BigDecimal pricePerSeat, int seatsAvailable, BigDecimal fare,
            BigDecimal serviceFee, BigDecimal total, long driverId, Double driverRating,
            int driverRatingCount, long pickupDistanceM, long dropoffDistanceM,
            boolean driverConfirmed, boolean maxTwoInBack, String vehicle, String comfort,
            String luggage, boolean electric) {
    }

    /**
     * A person's place on a ride: its driver, or a passenger with a live booking on it.
     * The gateway asks for this before letting someone into the ride's chat.
     */
    public record Membership(long rideId, long userId, String fullName, String role,
            String rideStatus) {
    }

    /** How search results are ordered. Ties fall back to boarding time. */
    public enum Sort {
        TIME("boarding, id"),
        PRICE("price, boarding, id"),
        RATING("driver_rating DESC NULLS LAST, boarding, id"),
        PROXIMITY("pickup_m, boarding, id");

        private final String orderBy;

        Sort(String orderBy) {
            this.orderBy = orderBy;
        }
    }

    /**
     * What a passenger may narrow a search by. Null or false means "do not narrow".
     *
     * <p>The last three look at what the driver has said or proved. A driver who has not
     * said is left out by them: silence is not a promise of a smoke-free car.
     *
     * @param earliestHour    boarding at or after this hour of the corridor's day, 0 to 23
     * @param latestHour      boarding before this hour, 1 to 24
     * @param maxPricePerSeat for the stretch the passenger would travel
     * @param confirmedDriver the driver has confirmed an email address or a phone number
     */
    public record Filters(Integer earliestHour, Integer latestHour, BigDecimal maxPricePerSeat,
            boolean instantOnly, boolean confirmedDriver, boolean smokeFree, boolean petsWelcome,
            boolean maxTwoInBack) {

        public static final Filters NONE = new Filters(null, null, null, false, false, false, false);

        public Filters(Integer earliestHour, Integer latestHour, BigDecimal maxPricePerSeat,
                boolean instantOnly, boolean confirmedDriver, boolean smokeFree,
                boolean petsWelcome) {
            this(earliestHour, latestHour, maxPricePerSeat, instantOnly, confirmedDriver,
                    smokeFree, petsWelcome, false);
        }

        public Filters {
            if (earliestHour != null && latestHour != null && earliestHour >= latestHour) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "The earliest hour must be before the latest");
            }
        }
    }

    /** @param suggestedPrice a starting point for the per-seat price of this leg */
    public record LegPreview(double distanceKm, int durationMinutes, BigDecimal suggestedPrice) {
    }

    /** What a route through some stops would look like, before a ride is published. */
    public record RoutePreview(double distanceKm, int durationMinutes, String source,
            List<LegPreview> legs, List<double[]> path) {
    }

    record SearchIssued(long passengerId, double originLat, double originLon,
            double destinationLat, double destinationLon, String date, int seats) implements HasActor {
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
    private final NamedParameterJdbcTemplate named;
    private final VehicleService vehicles;
    private final EventLogService events;
    private final ServiceFee serviceFee;
    private final RouteService routes;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final double maxAccessMetres;
    private final BigDecimal suggestedRupeesPerKm;

    public RideService(JdbcTemplate jdbc, VehicleService vehicles, EventLogService events,
            ServiceFee serviceFee, RouteService routes, ObjectMapper mapper, Clock clock,
            @Value("${journex.search.max-access-km}") double maxAccessKm,
            @Value("${journex.pricing.suggested-rupees-per-km}") BigDecimal suggestedRupeesPerKm) {
        this.jdbc = jdbc;
        this.named = new NamedParameterJdbcTemplate(jdbc);
        this.vehicles = vehicles;
        this.events = events;
        this.serviceFee = serviceFee;
        this.routes = routes;
        this.mapper = mapper;
        this.clock = clock;
        this.maxAccessMetres = maxAccessKm * 1000.0;
        this.suggestedRupeesPerKm = suggestedRupeesPerKm;
    }

    @Transactional
    public Ride publish(long driverId, PublishRide ride) {
        validate(driverId, ride);
        // Asked before anything is written: a slow routing service must not hold locks.
        Route route = routes.through(points(ride.stops()));
        List<StopInput> stopsBack = ride.returnDepartureTime() == null ? null : reversed(ride.stops());
        Route routeBack = stopsBack == null ? null : routes.through(points(stopsBack));
        List<BigDecimal> pricesBack = new ArrayList<>(ride.segmentPrices());
        Collections.reverse(pricesBack);

        // Published together or not at all: a driver is never left with half a series.
        UUID seriesId = stopsBack != null || ride.repeatWeeks() > 0 ? UUID.randomUUID() : null;
        Long first = null;
        for (int week = 0; week <= ride.repeatWeeks(); week++) {
            long rideId = insert(driverId, ride, ride.stops(), ride.segmentPrices(),
                    weeksLater(ride.departureTime(), week), route, seriesId);
            first = first == null ? rideId : first;
            if (stopsBack != null) {
                insert(driverId, ride, stopsBack, pricesBack,
                        weeksLater(ride.returnDepartureTime(), week), routeBack, seriesId);
            }
        }
        return get(first);
    }

    private long insert(long driverId, PublishRide ride, List<StopInput> stops,
            List<BigDecimal> prices, Instant departure, Route route, UUID seriesId) {
        String notes = ride.notes() == null || ride.notes().isBlank() ? null : ride.notes().strip();
        Long rideId = jdbc.queryForObject("""
                INSERT INTO rides (driver_id, vehicle_id, departure_time, seats_offered,
                                   instant_booking, status, route, distance_m, duration_s,
                                   route_source, notes, max_two_in_back, series_id)
                VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ST_GeogFromText(?), ?, ?, ?, ?, ?, ?)
                RETURNING id""",
                Long.class, driverId, ride.vehicleId(), utc(departure),
                ride.seatsOffered(), ride.instantBooking(), lineString(route.path()),
                route.distanceMetres(), route.durationSeconds(), route.source(), notes,
                ride.maxTwoInBack(), seriesId);

        for (int seq = 0; seq < stops.size(); seq++) {
            StopInput stop = stops.get(seq);
            jdbc.update("""
                    INSERT INTO ride_stops (ride_id, seq, name, location, offset_minutes)
                    VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)""",
                    rideId, seq, stop.name().strip(), stop.lon(), stop.lat(), stop.offsetMinutes());
        }
        for (int seq = 0; seq < prices.size(); seq++) {
            jdbc.update("""
                    INSERT INTO ride_segments (ride_id, seq, price, seats_total, seats_available)
                    VALUES (?, ?, ?, ?, ?)""",
                    rideId, seq, prices.get(seq), ride.seatsOffered(), ride.seatsOffered());
        }
        return rideId;
    }

    /** The same stops driven the other way, each interval between stops kept as it was. */
    private static List<StopInput> reversed(List<StopInput> stops) {
        int total = stops.get(stops.size() - 1).offsetMinutes();
        List<StopInput> back = new ArrayList<>();
        for (int i = stops.size() - 1; i >= 0; i--) {
            StopInput stop = stops.get(i);
            back.add(new StopInput(stop.name(), stop.lat(), stop.lon(), total - stop.offsetMinutes()));
        }
        return back;
    }

    /** The same time of day on the corridor's clock, so many weeks on. */
    private static Instant weeksLater(Instant time, int weeks) {
        return time.atZone(CORRIDOR_ZONE).plusWeeks(weeks).toInstant();
    }

    /** The route through these stops, with a suggested price for each leg. */
    public RoutePreview preview(List<Point> stops) {
        Route route = routes.through(stops);
        List<LegPreview> legs = route.legs().stream()
                .map(leg -> new LegPreview(km(leg.distanceMetres()), minutes(leg.durationSeconds()),
                        suggestedPrice(leg)))
                .toList();
        return new RoutePreview(km(route.distanceMetres()), minutes(route.durationSeconds()),
                route.source(), legs, route.path());
    }

    /** Distance times the configured rate, to the nearest ten rupees. */
    private BigDecimal suggestedPrice(Leg leg) {
        return BigDecimal.valueOf(leg.distanceMetres() / 1000.0).multiply(suggestedRupeesPerKm)
                .divide(BigDecimal.TEN, 0, RoundingMode.HALF_UP).multiply(BigDecimal.TEN);
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
        if (ride.repeatWeeks() < 0 || ride.repeatWeeks() > MAX_REPEAT_WEEKS) {
            throw badRequest("A ride can repeat for at most " + MAX_REPEAT_WEEKS + " further weeks");
        }
        if (ride.returnDepartureTime() != null) {
            int lastOffset = ride.stops().get(ride.stops().size() - 1).offsetMinutes();
            Instant arrival = ride.departureTime().plus(Duration.ofMinutes(lastOffset));
            if (!ride.returnDepartureTime().isAfter(arrival)) {
                throw badRequest("The return must leave after the ride out has arrived");
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
                SELECT r.id, r.driver_id, r.vehicle_id, r.departure_time, r.seats_offered,
                       r.instant_booking, r.status, r.distance_m, r.duration_s, r.route_source,
                       ST_AsGeoJSON(r.route::geometry) AS route_json, u.full_name,
                       r.notes, r.max_two_in_back,
                       CASE WHEN r.series_id IS NULL THEN 1
                            ELSE (SELECT COUNT(*) FROM rides s WHERE s.series_id = r.series_id)
                       END AS series_size
                FROM rides r JOIN users u ON u.id = r.driver_id
                WHERE r.id = ?""",
                (rs, n) -> new Ride(rs.getLong("id"), rs.getLong("driver_id"),
                        rs.getString("full_name"), rs.getLong("vehicle_id"),
                        rs.getObject("departure_time", OffsetDateTime.class).toInstant(),
                        rs.getInt("seats_offered"), rs.getBoolean("instant_booking"),
                        rs.getString("status"), stops, segments,
                        rs.getObject("distance_m") == null ? null : km(rs.getDouble("distance_m")),
                        rs.getObject("duration_s") == null ? null : minutes(rs.getDouble("duration_s")),
                        rs.getString("route_source"), path(rs.getString("route_json")),
                        rs.getString("notes"), rs.getBoolean("max_two_in_back"),
                        rs.getInt("series_size")),
                rideId);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ride not found");
        }
        return found.get(0);
    }

    /**
     * Whether this user is on the ride. A passenger counts while their booking is pending
     * or confirmed; one who cancelled or was declined does not. Someone not on the ride
     * and a ride that does not exist are the same 404.
     */
    public Membership membership(long userId, long rideId) {
        List<Membership> found = jdbc.query("""
                SELECT u.full_name, r.status,
                       CASE WHEN r.driver_id = u.id THEN 'DRIVER' ELSE 'PASSENGER' END AS role
                FROM rides r JOIN users u ON u.id = ?
                WHERE r.id = ?
                  AND (r.driver_id = u.id
                       OR EXISTS (SELECT 1 FROM bookings b
                                  WHERE b.ride_id = r.id AND b.passenger_id = u.id
                                    AND b.status IN ('PENDING', 'CONFIRMED')))""",
                (rs, n) -> new Membership(rideId, userId, rs.getString("full_name"),
                        rs.getString("role"), rs.getString("status")),
                userId, rideId);
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
     * Finds scheduled rides the passenger could take on the given day: one with a stop
     * within the access distance of where they start, a later stop within it of where they
     * are going, and the seats free on every leg in between.
     *
     * <p>The access distance is a hard limit, measured in a straight line. A ride outside it
     * is not returned however it would have ranked. When a ride has more than one stop in
     * range at either end, the pair nearest the passenger is used.
     */
    public List<Candidate> search(long passengerId, Point origin, Point destination,
            LocalDate date, int seats, Sort sort) {
        return search(passengerId, origin, destination, date, seats, sort, Filters.NONE);
    }

    /** As above, narrowed by the filters. A filter never widens what the search returns. */
    public List<Candidate> search(long passengerId, Point origin, Point destination,
            LocalDate date, int seats, Sort sort, Filters filters) {
        // Three decimals is about a hundred metres: enough for the research log, without
        // recording anyone's doorstep.
        events.write(EventType.SEARCH_ISSUED, new SearchIssued(passengerId,
                coarse(origin.lat()), coarse(origin.lon()), coarse(destination.lat()),
                coarse(destination.lon()), date.toString(), seats));

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("olat", origin.lat()).addValue("olon", origin.lon())
                .addValue("dlat", destination.lat()).addValue("dlon", destination.lon())
                .addValue("radius", maxAccessMetres)
                .addValue("dayStart", utc(date.atStartOfDay(CORRIDOR_ZONE).toInstant()))
                .addValue("dayEnd", utc(date.plusDays(1).atStartOfDay(CORRIDOR_ZONE).toInstant()))
                .addValue("now", utc(clock.instant()))
                .addValue("seats", seats)
                .addValue("zone", CORRIDOR_ZONE.getId())
                .addValue("earliestHour", filters.earliestHour())
                .addValue("latestHour", filters.latestHour())
                .addValue("maxPrice", filters.maxPricePerSeat());
        // Each fragment is a constant chosen by a flag; caller values are bound, never spliced.
        String boardingHour = "EXTRACT(HOUR FROM (" + BOARDING + ") AT TIME ZONE :zone)";
        String narrowed = (filters.earliestHour() == null ? "" : " AND " + boardingHour + " >= :earliestHour")
                + (filters.latestHour() == null ? "" : " AND " + boardingHour + " < :latestHour")
                + (filters.maxPricePerSeat() == null ? "" : " AND legs.price <= :maxPrice")
                + (filters.instantOnly() ? " AND r.instant_booking" : "")
                + (filters.confirmedDriver() ? " AND " + DRIVER_CONFIRMED : "")
                + (filters.smokeFree() ? " AND p.smoking IS FALSE" : "")
                + (filters.petsWelcome() ? " AND p.pets IS TRUE" : "")
                + (filters.maxTwoInBack() ? " AND r.max_two_in_back" : "");
        // sort.orderBy is one of four constants above, never caller text.
        List<Candidate> candidates = named.query("""
                WITH want AS (
                    SELECT ST_SetSRID(ST_MakePoint(:olon, :olat), 4326)::geography AS origin,
                           ST_SetSRID(ST_MakePoint(:dlon, :dlat), 4326)::geography AS destination
                )
                SELECT * FROM (
                    SELECT DISTINCT ON (r.id)
                           r.id, u.full_name, r.instant_booking, r.driver_id, r.max_two_in_back,
                           v.make || ' ' || v.model AS vehicle, v.comfort, v.luggage, v.electric,
                           (SELECT AVG(stars)::float8 FROM ratings WHERE ratee_id = r.driver_id)
                               AS driver_rating,
                           (SELECT COUNT(*) FROM ratings WHERE ratee_id = r.driver_id)
                               AS driver_rating_count,
                           o.seq AS from_seq, d.seq AS to_seq,
                           o.name AS from_stop, d.name AS to_stop,
                           r.departure_time + make_interval(mins => o.offset_minutes) AS boarding,
                           r.departure_time + make_interval(mins => d.offset_minutes) AS arrival,
                           ST_Distance(o.location, want.origin) AS pickup_m,
                           ST_Distance(d.location, want.destination) AS dropoff_m,
                           legs.price, legs.seats,
                           """ + DRIVER_CONFIRMED + """
                                AS driver_confirmed
                    FROM want
                    JOIN ride_stops o ON ST_DWithin(o.location, want.origin, :radius)
                    JOIN rides r ON r.id = o.ride_id
                    JOIN users u ON u.id = r.driver_id
                    JOIN vehicles v ON v.id = r.vehicle_id
                    LEFT JOIN profiles p ON p.user_id = r.driver_id
                    JOIN ride_stops d ON d.ride_id = r.id AND d.seq > o.seq
                                     AND ST_DWithin(d.location, want.destination, :radius)
                    CROSS JOIN LATERAL (
                        SELECT SUM(s.price) AS price, MIN(s.seats_available) AS seats
                        FROM ride_segments s
                        WHERE s.ride_id = r.id AND s.seq >= o.seq AND s.seq < d.seq
                    ) legs
                    WHERE r.status = 'SCHEDULED'
                      AND r.departure_time + make_interval(mins => o.offset_minutes) >= :dayStart
                      AND r.departure_time + make_interval(mins => o.offset_minutes) < :dayEnd
                      AND r.departure_time + make_interval(mins => o.offset_minutes) > :now
                      AND legs.seats >= :seats
                    """ + narrowed + """
                    ORDER BY r.id,
                             ST_Distance(o.location, want.origin)
                                 + ST_Distance(d.location, want.destination)
                ) c
                ORDER BY\s""" + sort.orderBy,
                params,
                (rs, n) -> {
                    BigDecimal fare = rs.getBigDecimal("price").multiply(BigDecimal.valueOf(seats));
                    BigDecimal fee = serviceFee.on(fare);
                    return new Candidate(rs.getLong("id"), rs.getString("full_name"),
                            rs.getBoolean("instant_booking"), rs.getInt("from_seq"),
                            rs.getInt("to_seq"), rs.getString("from_stop"), rs.getString("to_stop"),
                            rs.getObject("boarding", OffsetDateTime.class).toInstant(),
                            rs.getObject("arrival", OffsetDateTime.class).toInstant(),
                            rs.getBigDecimal("price"), rs.getInt("seats"), fare, fee, fare.add(fee),
                            rs.getLong("driver_id"), (Double) rs.getObject("driver_rating"),
                            rs.getInt("driver_rating_count"),
                            Math.round(rs.getDouble("pickup_m")), Math.round(rs.getDouble("dropoff_m")),
                            rs.getBoolean("driver_confirmed"), rs.getBoolean("max_two_in_back"),
                            rs.getString("vehicle"), rs.getString("comfort"),
                            rs.getString("luggage"), rs.getBoolean("electric"));
                });

        events.write(EventType.CANDIDATES_RETURNED, new CandidatesReturned(passengerId,
                candidates.size(), candidates.stream().map(Candidate::rideId).toList()));
        return candidates;
    }

    private static List<Point> points(List<StopInput> stops) {
        return stops.stream().map(stop -> new Point(stop.lat(), stop.lon())).toList();
    }

    /** The path as PostGIS text. PostGIS, like OSRM, wants longitude first. */
    private static String lineString(List<double[]> path) {
        return path.stream()
                .map(p -> String.format(Locale.ROOT, "%.6f %.6f", p[1], p[0]))
                .collect(Collectors.joining(", ", "SRID=4326;LINESTRING(", ")"));
    }

    /** Reads a GeoJSON LineString back into [lat, lon] pairs. Empty if there is no route. */
    private List<double[]> path(String geoJson) {
        List<double[]> path = new ArrayList<>();
        if (geoJson == null) {
            return path;
        }
        try {
            for (JsonNode coordinate : mapper.readTree(geoJson).path("coordinates")) {
                path.add(new double[] {coordinate.get(1).asDouble(), coordinate.get(0).asDouble()});
            }
        } catch (JsonProcessingException e) {
            path.clear();
        }
        return path;
    }

    private static double km(double metres) {
        return Math.round(metres / 100.0) / 10.0;
    }

    private static int minutes(double seconds) {
        return (int) Math.round(seconds / 60.0);
    }

    private static double coarse(double degrees) {
        return Math.round(degrees * 1000.0) / 1000.0;
    }

    private static OffsetDateTime utc(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    private static ResponseStatusException badRequest(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
