package com.dypcet.journex.rating;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RatingService {

    /** @param reviewerName the first name only of whoever wrote it */
    public record Review(int stars, String comment, String reviewerName, Instant createdAt) {
    }

    /**
     * What anyone signed in may know about a member. No contact details.
     *
     * @param completedTrips trips travelled as a passenger or driven as a driver
     * @param averageStars   null until somebody has rated them
     * @param reviews        the ten newest ratings that came with a comment
     */
    public record Profile(long id, String fullName, String role, Instant memberSince,
            int completedTrips, Double averageStars, int ratingCount, List<Review> reviews) {
    }

    /** A completed trip the caller has not rated yet. */
    public record Unrated(long bookingId, long otherPartyId, String otherPartyName, String fromStop,
            String toStop, Instant boardingTime) {
    }

    private record Parties(long passengerId, long driverId, String status) {
    }

    private static final int REVIEWS_SHOWN = 10;

    private final JdbcTemplate jdbc;

    public RatingService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Rates the other party of a completed booking. Each side may do so once. */
    public void rate(long raterId, long bookingId, int stars, String comment) {
        List<Parties> found = jdbc.query("""
                SELECT b.passenger_id, r.driver_id, b.status
                FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE b.id = ?""",
                (rs, n) -> new Parties(rs.getLong("passenger_id"), rs.getLong("driver_id"),
                        rs.getString("status")),
                bookingId);
        // A booking the caller had no part in looks the same as one that does not exist.
        if (found.isEmpty() || (found.get(0).passengerId() != raterId
                && found.get(0).driverId() != raterId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        Parties parties = found.get(0);
        if (!"COMPLETED".equals(parties.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only a completed trip can be rated");
        }
        long rateeId = parties.passengerId() == raterId ? parties.driverId() : parties.passengerId();
        String text = comment == null || comment.isBlank() ? null : comment.strip();
        try {
            jdbc.update("""
                    INSERT INTO ratings (booking_id, rater_id, ratee_id, stars, comment)
                    VALUES (?, ?, ?, ?, ?)""",
                    bookingId, raterId, rateeId, stars, text);
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already rated this trip");
        }
    }

    public Profile profile(long userId) {
        List<Review> reviews = jdbc.query("""
                SELECT g.stars, g.comment, split_part(u.full_name, ' ', 1) AS reviewer, g.created_at
                FROM ratings g JOIN users u ON u.id = g.rater_id
                WHERE g.ratee_id = ? AND g.comment IS NOT NULL
                ORDER BY g.id DESC LIMIT ?""",
                (rs, n) -> new Review(rs.getInt("stars"), rs.getString("comment"),
                        rs.getString("reviewer"),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()),
                userId, REVIEWS_SHOWN);
        List<Profile> found = jdbc.query("""
                SELECT u.id, u.full_name, u.role, u.created_at,
                       (SELECT COUNT(*) FROM bookings b JOIN rides r ON r.id = b.ride_id
                        WHERE b.status = 'COMPLETED'
                          AND (b.passenger_id = u.id OR r.driver_id = u.id)) AS completed,
                       (SELECT AVG(stars)::float8 FROM ratings WHERE ratee_id = u.id) AS average,
                       (SELECT COUNT(*) FROM ratings WHERE ratee_id = u.id) AS rating_count
                FROM users u WHERE u.id = ? AND u.role <> 'ADMIN'""",
                (rs, n) -> new Profile(rs.getLong("id"), rs.getString("full_name"),
                        rs.getString("role"),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                        rs.getInt("completed"), (Double) rs.getObject("average"),
                        rs.getInt("rating_count"), reviews),
                userId);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found");
        }
        return found.get(0);
    }

    /** The caller's completed trips still waiting for their rating, newest first. */
    public List<Unrated> unratedBy(long userId) {
        return jdbc.query("""
                SELECT b.id, o.id AS other_id, o.full_name AS other_name,
                       s.name AS from_stop, t.name AS to_stop,
                       r.departure_time + make_interval(mins => s.offset_minutes) AS boarding
                FROM bookings b
                JOIN rides r ON r.id = b.ride_id
                JOIN users o ON o.id = CASE WHEN b.passenger_id = ? THEN r.driver_id
                                            ELSE b.passenger_id END
                JOIN ride_stops s ON s.ride_id = b.ride_id AND s.seq = b.from_seq
                JOIN ride_stops t ON t.ride_id = b.ride_id AND t.seq = b.to_seq
                WHERE b.status = 'COMPLETED' AND (b.passenger_id = ? OR r.driver_id = ?)
                  AND NOT EXISTS (SELECT 1 FROM ratings g
                                  WHERE g.booking_id = b.id AND g.rater_id = ?)
                ORDER BY b.id DESC""",
                (rs, n) -> new Unrated(rs.getLong("id"), rs.getLong("other_id"),
                        rs.getString("other_name"), rs.getString("from_stop"),
                        rs.getString("to_stop"),
                        rs.getObject("boarding", OffsetDateTime.class).toInstant()),
                userId, userId, userId, userId);
    }
}
