package com.dypcet.journex.vehicle;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

@Service
public class VehicleService {

    /** @param seats total seats including the driver's */
    public record Vehicle(long id, long ownerId, String make, String model, Integer year,
            String colour, int seats) {
    }

    private static final RowMapper<Vehicle> MAPPER = (rs, n) -> new Vehicle(
            rs.getLong("id"), rs.getLong("owner_id"), rs.getString("make"), rs.getString("model"),
            (Integer) rs.getObject("year"), rs.getString("colour"), rs.getInt("seats"));

    private final JdbcTemplate jdbc;

    public VehicleService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Vehicle create(long ownerId, String make, String model, Integer year, String colour,
            int seats) {
        Long id = jdbc.queryForObject("""
                INSERT INTO vehicles (owner_id, make, model, year, colour, seats)
                VALUES (?, ?, ?, ?, ?, ?) RETURNING id""",
                Long.class, ownerId, make, model, year, colour, seats);
        return new Vehicle(id, ownerId, make, model, year, colour, seats);
    }

    public List<Vehicle> ownedBy(long ownerId) {
        return jdbc.query("SELECT * FROM vehicles WHERE owner_id = ? ORDER BY id", MAPPER, ownerId);
    }

    /** Returns the vehicle only if this owner owns it; null otherwise. */
    public Vehicle findOwned(long vehicleId, long ownerId) {
        List<Vehicle> found = jdbc.query(
                "SELECT * FROM vehicles WHERE id = ? AND owner_id = ?", MAPPER, vehicleId, ownerId);
        return found.isEmpty() ? null : found.get(0);
    }
}
