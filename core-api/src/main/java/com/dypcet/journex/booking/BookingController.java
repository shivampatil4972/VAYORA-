package com.dypcet.journex.booking;

import com.dypcet.journex.booking.BookingService.Booking;
import com.dypcet.journex.identity.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class BookingController {

    public record CreateBookingRequest(
            @NotNull Long rideId,
            @Min(0) int fromSeq,
            @Min(1) int toSeq,
            @Min(1) @Max(8) int seats) {
    }

    private final BookingService bookings;

    public BookingController(BookingService bookings) {
        this.bookings = bookings;
    }

    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('PASSENGER')")
    public Booking request(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateBookingRequest request) {
        return bookings.request(CurrentUser.id(jwt), request.rideId(), request.fromSeq(),
                request.toSeq(), request.seats());
    }

    @GetMapping("/bookings")
    @PreAuthorize("hasRole('PASSENGER')")
    public List<Booking> mine(@AuthenticationPrincipal Jwt jwt) {
        return bookings.forPassenger(CurrentUser.id(jwt));
    }

    @PostMapping("/bookings/{id}/cancel")
    @PreAuthorize("hasRole('PASSENGER')")
    public Booking cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return bookings.cancel(CurrentUser.id(jwt), id);
    }

    @PostMapping("/bookings/{id}/accept")
    @PreAuthorize("hasRole('DRIVER')")
    public Booking accept(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return bookings.accept(CurrentUser.id(jwt), id);
    }

    @PostMapping("/bookings/{id}/reject")
    @PreAuthorize("hasRole('DRIVER')")
    public Booking reject(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return bookings.reject(CurrentUser.id(jwt), id);
    }

    @GetMapping("/rides/{rideId}/bookings")
    @PreAuthorize("hasRole('DRIVER')")
    public List<Booking> forRide(@AuthenticationPrincipal Jwt jwt, @PathVariable long rideId) {
        return bookings.forRide(CurrentUser.id(jwt), rideId);
    }
}
