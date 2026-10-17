package com.dypcet.journex.call;

import com.dypcet.journex.notification.NotificationService;
import com.dypcet.journex.notification.NotificationService.Type;
import com.dypcet.journex.notification.Text;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Masked calling between a passenger and their driver (feature 61), simulated. No telephony
 * provider is connected: nothing is dialled, and no number is shown to anyone, then or ever.
 * What is real is who may call whom and when, and that the other side is told someone tried.
 */
@Service
public class CallService {

    /** What the caller is told. It names the other side and carries no phone number, by design. */
    public record Relay(String provider, String calleeName) {
    }

    private record Parties(long passengerId, String passengerName, boolean passengerPhone,
            long driverId, String driverName, boolean driverPhone, String status, Instant boarding) {
    }

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;
    private final Clock clock;
    private final Duration opensBefore;

    public CallService(JdbcTemplate jdbc, NotificationService notifications, Clock clock,
            @Value("${journex.calling.opens-before}") Duration opensBefore) {
        this.jdbc = jdbc;
        this.notifications = notifications;
        this.clock = clock;
        this.opensBefore = opensBefore;
    }

    /**
     * The passenger calls the driver of their booking, or the driver calls that passenger:
     * only while the booking is confirmed, from shortly before boarding, and only between
     * confirmed phone numbers, as a real relay would need.
     */
    @Transactional
    public Relay call(long callerId, long bookingId) {
        List<Parties> found = jdbc.query("""
                SELECT b.passenger_id, p.full_name AS passenger_name,
                       p.phone_verified_at IS NOT NULL AS passenger_phone,
                       r.driver_id, d.full_name AS driver_name,
                       d.phone_verified_at IS NOT NULL AS driver_phone, b.status,
                       r.departure_time + make_interval(mins => s.offset_minutes) AS boarding
                FROM bookings b
                JOIN rides r ON r.id = b.ride_id
                JOIN users p ON p.id = b.passenger_id
                JOIN users d ON d.id = r.driver_id
                JOIN ride_stops s ON s.ride_id = r.id AND s.seq = b.from_seq
                WHERE b.id = ?""",
                (rs, n) -> new Parties(rs.getLong("passenger_id"), rs.getString("passenger_name"),
                        rs.getBoolean("passenger_phone"), rs.getLong("driver_id"),
                        rs.getString("driver_name"), rs.getBoolean("driver_phone"),
                        rs.getString("status"), rs.getObject("boarding", OffsetDateTime.class).toInstant()),
                bookingId);
        // Someone else's booking looks the same as one that does not exist.
        if (found.isEmpty() || (found.get(0).passengerId() != callerId && found.get(0).driverId() != callerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        }
        Parties parties = found.get(0);
        boolean passengerCalls = parties.passengerId() == callerId;
        if (!"CONFIRMED".equals(parties.status())) {
            throw conflict("A call can only be made while the booking is confirmed");
        }
        if (clock.instant().isBefore(parties.boarding().minus(opensBefore))) {
            throw conflict("It is too early to call: calls open shortly before the trip");
        }
        if (!(passengerCalls ? parties.passengerPhone() : parties.driverPhone())) {
            throw conflict("Confirm your phone number on your account page before calling");
        }
        if (!(passengerCalls ? parties.driverPhone() : parties.passengerPhone())) {
            throw conflict("They have no confirmed phone number. Use the chat instead.");
        }
        String callerName = passengerCalls ? parties.passengerName() : parties.driverName();
        notifications.send(passengerCalls ? parties.driverId() : parties.passengerId(), Type.CALL_REQUESTED,
                Text.of("{name} tried to call you through JOURNEX. Calls are simulated, so no call came through. "
                        + "Reply in the ride's chat.", "name", callerName),
                bookingId);
        return new Relay("mock", passengerCalls ? parties.driverName() : parties.passengerName());
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
