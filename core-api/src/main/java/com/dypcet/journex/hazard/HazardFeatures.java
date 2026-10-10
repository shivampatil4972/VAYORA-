package com.dypcet.journex.hazard;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Computes the booking-durability model's features, version {@code f1}.
 *
 * <p>Must mean exactly what {@code intel/app/hazard/features.py} means; that file is the
 * definition. History counts only bookings a driver accepted, and only cancellations the
 * passenger made.
 */
@Component
public class HazardFeatures {

    public static final String VERSION = "f1";

    private static final ZoneId CORRIDOR_ZONE = ZoneId.of("Asia/Kolkata");

    private final JdbcTemplate jdbc;

    public HazardFeatures(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Features of a booking this passenger is requesting now. Call before the booking
     * row exists, so that it is not part of its own history.
     */
    public Map<String, Double> snapshot(long passengerId, int seats, Instant now, Instant boarding) {
        Map<String, Double> features = new LinkedHashMap<>();
        features.put("lead_hours", Duration.between(now, boarding).toSeconds() / 3600.0);
        features.put("seats", (double) seats);
        features.put("departure_hour", (double) boarding.atZone(CORRIDOR_ZONE).getHour());
        // A search here names a day, not a time, so there is no preferred time to be
        // far from. The model was trained with real gaps; see KNOWN_LIMITATIONS.
        features.put("desired_gap_hours", 0.0);

        jdbc.query("""
                SELECT COUNT(*) FILTER (WHERE accepted_at IS NOT NULL) AS accepted,
                       COUNT(*) FILTER (WHERE accepted_at IS NOT NULL AND status = 'CANCELLED'
                                          AND cancelled_by = 'passenger') AS cancellations,
                       COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
                       COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_shows
                FROM bookings WHERE passenger_id = ?""",
                rs -> {
                    double accepted = rs.getLong("accepted");
                    double cancellations = rs.getLong("cancellations");
                    features.put("prior_accepted", accepted);
                    features.put("prior_cancellations", cancellations);
                    features.put("prior_completed", (double) rs.getLong("completed"));
                    features.put("prior_no_shows", (double) rs.getLong("no_shows"));
                    features.put("prior_cancel_share", accepted == 0 ? 0.0 : cancellations / accepted);
                },
                passengerId);
        return features;
    }
}
