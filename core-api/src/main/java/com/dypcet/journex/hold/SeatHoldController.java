package com.dypcet.journex.hold;

import com.dypcet.journex.hold.SeatHolds.Hold;
import com.dypcet.journex.identity.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Lets a passenger set seats aside for a few minutes before deciding to book. */
@RestController
@RequestMapping("/api/v1/holds")
@PreAuthorize("hasRole('PASSENGER')")
public class SeatHoldController {

    public record HoldRequest(@NotNull Long rideId, @Min(0) int fromSeq, @Min(1) int toSeq,
            @Min(1) @Max(8) int seats) {
    }

    private final SeatHolds holds;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public SeatHoldController(SeatHolds holds, JdbcTemplate jdbc, Clock clock) {
        this.holds = holds;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Hold place(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody HoldRequest request) {
        if (request.toSeq() <= request.fromSeq()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "toSeq must come after fromSeq");
        }
        // What is free now on each leg, for a ride still open and not yet past that stop.
        List<Integer> free = jdbc.queryForList("""
                SELECT g.seats_available
                FROM ride_segments g
                JOIN rides r ON r.id = g.ride_id
                JOIN ride_stops s ON s.ride_id = r.id AND s.seq = ?
                WHERE g.ride_id = ? AND g.seq >= ? AND g.seq < ? AND r.status = 'SCHEDULED'
                  AND r.departure_time + make_interval(mins => s.offset_minutes) > ?
                ORDER BY g.seq""",
                Integer.class, request.fromSeq(), request.rideId(), request.fromSeq(),
                request.toSeq(), OffsetDateTime.ofInstant(clock.instant(), java.time.ZoneOffset.UTC));
        if (free.size() != request.toSeq() - request.fromSeq()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No ride open for booking has those stops");
        }
        try {
            return holds.place(CurrentUser.id(jwt), request.rideId(), request.fromSeq(),
                            request.toSeq(), request.seats(), free)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "Not enough seats left on that part of the ride to hold"));
        } catch (SeatHolds.Unavailable e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Seats cannot be held right now. You can still book.");
        }
    }

    /** The caller's hold, or 204 if they have none. */
    @GetMapping("/mine")
    public ResponseEntity<Hold> mine(@AuthenticationPrincipal Jwt jwt) {
        return holds.of(CurrentUser.id(jwt)).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @DeleteMapping("/mine")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void release(@AuthenticationPrincipal Jwt jwt) {
        holds.release(CurrentUser.id(jwt));
    }
}
