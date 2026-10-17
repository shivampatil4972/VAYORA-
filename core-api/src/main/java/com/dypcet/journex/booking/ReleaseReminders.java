package com.dypcet.journex.booking;

import com.dypcet.journex.eventlog.EventLogService;
import com.dypcet.journex.eventlog.EventType;
import com.dypcet.journex.eventlog.HasActor;
import com.dypcet.journex.notification.NotificationService;
import com.dypcet.journex.notification.NotificationService.Type;
import com.dypcet.journex.notification.Text;
import com.dypcet.journex.refund.RefundPolicy;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Asks each passenger with a confirmed seat, once, shortly before boarding, to release it if
 * their plans have changed (feature 79): a seat released while someone can still take it is
 * the project's whole idea. Everyone is asked alike. Nothing reads the durability model or
 * anyone's predicted risk, and nothing is ever cancelled for the passenger.
 *
 * <p>In the simulator, asking (targeted, there) moved cancellations earlier but added no
 * completed rides, so this claims no gain.
 */
@Service
public class ReleaseReminders {

    private static final ZoneId CORRIDOR_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter WHEN =
            DateTimeFormatter.ofPattern("EEE d MMM, HH:mm", Locale.ENGLISH).withZone(CORRIDOR_ZONE);

    /** Logged as the simulator logs a request, with no survival probability: none was used. */
    record Issued(long bookingId, long passengerId, String action) implements HasActor {
        @Override
        public String actorType() {
            return "platform";
        }

        @Override
        public Long actorId() {
            return null;
        }
    }

    private record Due(long bookingId, long passengerId, BigDecimal fare, String fromStop, String toStop,
            Instant boarding) {
    }

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;
    private final EventLogService events;
    private final RefundPolicy refunds;
    private final Clock clock;
    private final Duration before;

    public ReleaseReminders(JdbcTemplate jdbc, NotificationService notifications,
            EventLogService events, RefundPolicy refunds, Clock clock,
            @Value("${journex.reminders.release-before}") Duration before) {
        this.jdbc = jdbc;
        this.notifications = notifications;
        this.events = events;
        this.refunds = refunds;
        this.clock = clock;
        this.before = before;
    }

    /**
     * Reminds every confirmed booking now within the reminder window that has not been
     * reminded. A booking made inside the window is never reminded: it was just made.
     *
     * @return how many passengers were reminded
     */
    @Transactional
    public int remindDue() {
        Instant now = clock.instant();
        OffsetDateTime from = OffsetDateTime.ofInstant(now, ZoneOffset.UTC);
        OffsetDateTime until = OffsetDateTime.ofInstant(now.plus(before), ZoneOffset.UTC);
        List<Due> due = jdbc.query("""
                SELECT b.id, b.passenger_id, b.price, f.name AS from_stop, t.name AS to_stop, boarding
                FROM bookings b
                JOIN rides r ON r.id = b.ride_id
                JOIN ride_stops f ON f.ride_id = r.id AND f.seq = b.from_seq
                JOIN ride_stops t ON t.ride_id = r.id AND t.seq = b.to_seq
                CROSS JOIN LATERAL (SELECT r.departure_time + make_interval(mins => f.offset_minutes) AS boarding) s
                WHERE b.status = 'CONFIRMED' AND r.status = 'SCHEDULED' AND b.release_reminded_at IS NULL
                  AND boarding > ? AND boarding <= ?
                  AND b.created_at < boarding - make_interval(secs => ?)
                ORDER BY b.id
                FOR UPDATE OF b SKIP LOCKED""",
                (rs, n) -> new Due(rs.getLong("id"), rs.getLong("passenger_id"), rs.getBigDecimal("price"),
                        rs.getString("from_stop"), rs.getString("to_stop"),
                        rs.getObject("boarding", OffsetDateTime.class).toInstant()),
                from, until, (double) before.toSeconds());
        for (Due booking : due) {
            jdbc.update("UPDATE bookings SET release_reminded_at = ? WHERE id = ?", from, booking.bookingId());
            BigDecimal back = refunds.fareRefund(booking.fare(), Duration.between(now, booking.boarding()));
            notifications.send(booking.passengerId(), Type.RELEASE_REMINDER, Text.of(
                    "Your seat from {from} to {to} leaves {when}. If your plans have changed, cancelling now lets "
                            + "someone else take it, and Rs {refund} of your Rs {fare} fare comes back. "
                            + "If you are still travelling, there is nothing to do.",
                    "from", booking.fromStop(), "to", booking.toStop(), "when", WHEN.format(booking.boarding()),
                    "refund", back.toPlainString(), "fare", booking.fare().toPlainString()),
                    booking.bookingId());
            events.write(EventType.INTERVENTION_ISSUED,
                    new Issued(booking.bookingId(), booking.passengerId(), "release_reminder"));
        }
        return due.size();
    }
}
