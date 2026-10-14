package com.dypcet.journex.admin;

import com.dypcet.journex.audit.AuditService;
import com.dypcet.journex.audit.AuditService.Entry;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only views for administrators. Every figure is counted from the database. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    /**
     * @param users    members by role
     * @param rides    rides by status
     * @param bookings bookings by status
     */
    public record Overview(Map<String, Long> users, Map<String, Long> rides,
            Map<String, Long> bookings, long suspendedMembers, long openReports, long disputedTrips) {
    }

    public record Member(long id, String fullName, String email, String role, String status,
            Instant memberSince) {
    }

    private static final int LISTED = 100;

    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public AdminController(JdbcTemplate jdbc, AuditService audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @GetMapping("/overview")
    public Overview overview() {
        return new Overview(
                counts("SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role"),
                counts("SELECT status, COUNT(*) FROM rides GROUP BY status ORDER BY status"),
                counts("SELECT status, COUNT(*) FROM bookings GROUP BY status ORDER BY status"),
                jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE status = 'SUSPENDED'", Long.class),
                jdbc.queryForObject("SELECT COUNT(*) FROM reports WHERE status = 'OPEN'", Long.class),
                jdbc.queryForObject("SELECT COUNT(*) FROM bookings WHERE passenger_confirmed IS FALSE", Long.class));
    }

    /** Members whose name or email contains {@code q}, newest first. */
    @GetMapping("/users")
    public List<Member> users(@RequestParam(defaultValue = "") String q) {
        // The pattern is a bound parameter; % and _ in the search text are matched literally.
        String pattern = "%" + q.strip().replace("\\", "\\\\").replace("%", "\\%")
                .replace("_", "\\_") + "%";
        return jdbc.query("""
                SELECT id, full_name, email, role, status, created_at FROM users
                WHERE full_name ILIKE ? OR email ILIKE ?
                ORDER BY id DESC LIMIT ?""",
                (rs, n) -> new Member(rs.getLong("id"), rs.getString("full_name"),
                        rs.getString("email"), rs.getString("role"), rs.getString("status"),
                        rs.getObject("created_at", OffsetDateTime.class).toInstant()),
                pattern, pattern, LISTED);
    }

    @GetMapping("/audit")
    public List<Entry> audit() {
        return audit.latest();
    }

    private Map<String, Long> counts(String sql) {
        Map<String, Long> counts = new LinkedHashMap<>();
        jdbc.query(sql, rs -> {
            counts.put(rs.getString(1), rs.getLong(2));
        });
        return counts;
    }
}
