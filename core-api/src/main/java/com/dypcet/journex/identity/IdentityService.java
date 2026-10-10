package com.dypcet.journex.identity;

import java.util.List;
import java.util.Locale;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IdentityService {

    public record User(long id, String email, String fullName, UserRole role) {
    }

    private record Credentials(User user, String passwordHash) {
    }

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    public IdentityService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(String email, String password, String fullName, UserRole role) {
        if (role == UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Administrators cannot self-register");
        }
        String normalised = normalise(email);
        try {
            Long id = jdbc.queryForObject("""
                    INSERT INTO users (email, password_hash, full_name, role)
                    VALUES (?, ?, ?, ?) RETURNING id""",
                    Long.class, normalised, passwordEncoder.encode(password), fullName.strip(),
                    role.name());
            return new User(id, normalised, fullName.strip(), role);
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
    }

    /** Creates an administrator unless the email is already taken. Returns true if created. */
    public boolean ensureAdmin(String email, String password) {
        return jdbc.update("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES (?, ?, 'Administrator', 'ADMIN')
                ON CONFLICT (email) DO NOTHING""",
                normalise(email), passwordEncoder.encode(password)) == 1;
    }

    /** Fails with the same 401 whether the email is unknown or the password is wrong. */
    public User authenticate(String email, String password) {
        List<Credentials> found = jdbc.query("""
                SELECT id, email, full_name, role, password_hash FROM users WHERE email = ?""",
                (rs, n) -> new Credentials(
                        new User(rs.getLong("id"), rs.getString("email"),
                                rs.getString("full_name"), UserRole.valueOf(rs.getString("role"))),
                        rs.getString("password_hash")),
                normalise(email));
        if (found.isEmpty() || !passwordEncoder.matches(password, found.get(0).passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return found.get(0).user();
    }

    public User get(long id) {
        List<User> found = jdbc.query(
                "SELECT id, email, full_name, role FROM users WHERE id = ?",
                (rs, n) -> new User(rs.getLong("id"), rs.getString("email"),
                        rs.getString("full_name"), UserRole.valueOf(rs.getString("role"))),
                id);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        return found.get(0);
    }

    private static String normalise(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }
}
