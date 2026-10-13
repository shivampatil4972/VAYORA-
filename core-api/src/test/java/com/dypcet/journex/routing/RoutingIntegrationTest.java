package com.dypcet.journex.routing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dypcet.journex.PostgresIntegrationTest;
import com.dypcet.journex.booking.BookingService;
import com.dypcet.journex.booking.TripService;
import com.dypcet.journex.identity.IdentityService;
import com.dypcet.journex.identity.TokenService;
import com.dypcet.journex.identity.UserRole;
import com.dypcet.journex.payment.PaymentChoice;
import com.dypcet.journex.rating.RatingService;
import com.dypcet.journex.ride.RideService;
import com.dypcet.journex.ride.RideService.Candidate;
import com.dypcet.journex.ride.RideService.PublishRide;
import com.dypcet.journex.ride.RideService.Ride;
import com.dypcet.journex.ride.RideService.Sort;
import com.dypcet.journex.ride.RideService.StopInput;
import com.dypcet.journex.routing.RouteService.Point;
import com.dypcet.journex.vehicle.VehicleService;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Routes on rides and search by location. No routing service runs here, so every route is
 * a straight line; what OSRM itself returns is covered by {@link RouteServiceTest}.
 */
@AutoConfigureMockMvc
class RoutingIntegrationTest extends PostgresIntegrationTest {

    private static final Point KOLHAPUR = new Point(16.7050, 74.2433);
    private static final Point KARAD = new Point(17.2890, 74.1818);
    private static final Point PUNE = new Point(18.5204, 73.8567);
    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    @Autowired
    private IdentityService identity;

    @Autowired
    private VehicleService vehicles;

    @Autowired
    private RideService rides;

    @Autowired
    private BookingService bookings;

    @Autowired
    private TripService trips;

    @Autowired
    private RatingService ratings;

    @Autowired
    private RedisRouteCache cache;

    @Autowired
    private TokenService tokens;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private MockMvc mvc;

    private long passengerId;
    // A day of its own, so other tests' rides cannot appear in these searches.
    private LocalDate day;
    private Instant morning;

    @BeforeEach
    void setUp() {
        passengerId = user(UserRole.PASSENGER);
        day = LocalDate.now(ZONE).plusDays(3);
        jdbc.update("UPDATE rides SET status = 'CANCELLED' WHERE status = 'SCHEDULED'");
        morning = day.atTime(8, 0).atZone(ZONE).toInstant();
    }

    @Test
    void aPublishedRideCarriesItsRouteAndSaysWhereItCameFrom() {
        Ride ride = rides.get(ride(user(UserRole.DRIVER), morning, "500.00", KOLHAPUR, KARAD, PUNE));

        assertThat(ride.routeSource()).isEqualTo("STRAIGHT_LINE");
        assertThat(ride.distanceKm()).isBetween(200.0, 208.0);
        assertThat(ride.durationMinutes()).isBetween(240, 250); // at the 50 km/h fallback
        assertThat(ride.path()).hasSize(3);
        assertThat(ride.path().get(0)).containsExactly(KOLHAPUR.lat(), KOLHAPUR.lon());
        assertThat(jdbc.queryForObject(
                "SELECT ST_NPoints(route::geometry) FROM rides WHERE id = ?", Integer.class, ride.id()))
                .isEqualTo(3);
    }

    @Test
    void aPassengerNearAStopFindsTheRideAndOneTooFarDoesNot() {
        long rideId = ride(user(UserRole.DRIVER), morning, "500.00", KOLHAPUR, KARAD, PUNE);
        Point twoKmFromKarad = new Point(KARAD.lat() + 0.018, KARAD.lon());   // about 2.0 km north
        Point eightKmFromKarad = new Point(KARAD.lat() + 0.072, KARAD.lon()); // about 8.0 km north

        List<Candidate> near = rides.search(passengerId, twoKmFromKarad, PUNE, day, 1, Sort.TIME);
        List<Candidate> far = rides.search(passengerId, eightKmFromKarad, PUNE, day, 1, Sort.TIME);

        assertThat(near).singleElement().satisfies(candidate -> {
            assertThat(candidate.rideId()).isEqualTo(rideId);
            assertThat(candidate.fromStop()).isEqualTo("Stop 2");
            assertThat(candidate.fromSeq()).isEqualTo(1);
            assertThat(candidate.pickupDistanceM()).isBetween(1900L, 2100L);
            assertThat(candidate.dropoffDistanceM()).isZero();
        });
        assertThat(far).isEmpty(); // beyond the 5 km access limit: not ranked low, not returned
    }

    @Test
    void aRideGoingTheOtherWayIsNotOffered() {
        ride(user(UserRole.DRIVER), morning, "500.00", KOLHAPUR, KARAD, PUNE);

        assertThat(rides.search(passengerId, PUNE, KOLHAPUR, day, 1, Sort.TIME)).isEmpty();
        assertThat(rides.search(passengerId, KARAD, KARAD, day, 1, Sort.TIME)).isEmpty();
    }

    @Test
    void resultsCanBeOrderedByTimePriceRatingOrPickupDistance() {
        long rated = user(UserRole.DRIVER);
        long unrated = user(UserRole.DRIVER);
        // The early ride is dear, starts 3 km from the centre, and its driver has no rating.
        Point threeKmOut = new Point(KOLHAPUR.lat() + 0.027, KOLHAPUR.lon());
        long earlyDear = ride(unrated, morning, "900.00", threeKmOut, PUNE);
        long lateCheap = ride(rated, morning.plus(4, ChronoUnit.HOURS), "400.00", KOLHAPUR, PUNE);
        rate(rated, 5);

        assertThat(order(Sort.TIME)).containsExactly(earlyDear, lateCheap);
        assertThat(order(Sort.PRICE)).containsExactly(lateCheap, earlyDear);
        assertThat(order(Sort.PROXIMITY)).containsExactly(lateCheap, earlyDear);
        // A driver nobody has rated sorts after one who has been, not before.
        assertThat(order(Sort.RATING)).containsExactly(lateCheap, earlyDear);
    }

    @Test
    void theSearchLogKeepsOnlyACoarsePosition() {
        rides.search(passengerId, new Point(16.70512345, 74.24331234), PUNE, day, 1, Sort.TIME);

        assertThat(jdbc.queryForObject("""
                SELECT payload->>'origin_lat' || ',' || (payload->>'origin_lon') FROM events
                WHERE event_type = 'search_issued' AND actor_id = ? ORDER BY id DESC LIMIT 1""",
                String.class, passengerId)).isEqualTo("16.705,74.243");
    }

    @Test
    void aRoutePreviewSuggestsAPricePerLegFromItsDistance() throws Exception {
        String driver = "Bearer " + tokens.issue(user(UserRole.DRIVER), UserRole.DRIVER);
        String body = """
                {"stops": [{"lat": 16.7050, "lon": 74.2433}, {"lat": 17.2890, "lon": 74.1818},
                           {"lat": 18.5204, "lon": 73.8567}]}""";

        mvc.perform(post("/api/v1/rides/route-preview").header("Authorization", driver)
                        .contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("STRAIGHT_LINE"))
                .andExpect(jsonPath("$.legs.length()").value(2))
                // Kolhapur to Karad is about 65 km in a straight line: 65 x 2.0, to the nearest ten.
                .andExpect(jsonPath("$.legs[0].suggestedPrice").value(130))
                .andExpect(jsonPath("$.path.length()").value(3));

        String passenger = "Bearer " + tokens.issue(passengerId, UserRole.PASSENGER);
        mvc.perform(post("/api/v1/rides/route-preview").header("Authorization", passenger)
                        .contentType("application/json").content(body))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/rides/route-preview").header("Authorization", driver)
                        .contentType("application/json").content("{\"stops\": [{\"lat\": 16.7, \"lon\": 74.2}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theRedisCacheKeepsWhatItIsGiven() {
        String key = "test-" + UUID.randomUUID();

        assertThat(cache.get(key)).isEmpty();
        cache.put(key, "{\"distanceMetres\": 1}");

        assertThat(cache.get(key)).contains("{\"distanceMetres\": 1}");
    }

    private List<Long> order(Sort sort) {
        return rides.search(passengerId, KOLHAPUR, PUNE, day, 1, sort).stream()
                .map(Candidate::rideId).toList();
    }

    /** Gives the driver one rating by running a short trip to completion. */
    private void rate(long driverId, int stars) {
        long rideId = ride(driverId, Instant.now().plus(Duration.ofMinutes(30)), "100.00", KOLHAPUR, PUNE);
        long rater = user(UserRole.PASSENGER);
        long bookingId = bookings.request(rater, rideId, 0, 1, 1, PaymentChoice.card(), null).id();
        trips.start(driverId, rideId);
        trips.complete(driverId, rideId);
        ratings.rate(rater, bookingId, stars, null);
    }

    private long ride(long driverId, Instant departure, String pricePerLeg, Point... stops) {
        long vehicleId = vehicles.create(driverId, "Maruti", "Ertiga", 2022, "Silver", 7).id();
        List<StopInput> inputs = new java.util.ArrayList<>();
        for (int i = 0; i < stops.length; i++) {
            inputs.add(new StopInput("Stop " + (i + 1), stops[i].lat(), stops[i].lon(), i * 120));
        }
        List<BigDecimal> prices = java.util.Collections.nCopies(stops.length - 1, new BigDecimal(pricePerLeg));
        return rides.publish(driverId, new PublishRide(vehicleId, departure, 3, true, inputs, prices)).id();
    }

    private long user(UserRole role) {
        return identity.register(UUID.randomUUID() + "@example.test", "correct-horse-battery",
                "Test " + role, role).id();
    }
}
