package com.dypcet.journex.vehicle;

import com.dypcet.journex.identity.CurrentUser;
import com.dypcet.journex.vehicle.VehicleService.Vehicle;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/vehicles")
@PreAuthorize("hasRole('DRIVER')")
public class VehicleController {

    public record CreateVehicleRequest(
            @NotBlank @Size(max = 50) String make,
            @NotBlank @Size(max = 50) String model,
            @Min(1980) @Max(2100) Integer year,
            @Size(max = 30) String colour,
            @Min(2) @Max(9) int seats) {
    }

    private final VehicleService vehicles;

    public VehicleController(VehicleService vehicles) {
        this.vehicles = vehicles;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Vehicle create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateVehicleRequest request) {
        return vehicles.create(CurrentUser.id(jwt), request.make(), request.model(),
                request.year(), request.colour(), request.seats());
    }

    @GetMapping
    public List<Vehicle> mine(@AuthenticationPrincipal Jwt jwt) {
        return vehicles.ownedBy(CurrentUser.id(jwt));
    }
}
