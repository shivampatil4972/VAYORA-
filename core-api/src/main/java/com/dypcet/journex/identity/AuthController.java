package com.dypcet.journex.identity;

import com.dypcet.journex.identity.IdentityService.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            // BCrypt reads at most 72 bytes.
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 100) String fullName,
            @NotNull UserRole role) {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record TokenResponse(String accessToken, long expiresInSeconds, User user) {
    }

    private final IdentityService identity;
    private final TokenService tokens;

    public AuthController(IdentityService identity, TokenService tokens) {
        this.identity = identity;
        this.tokens = tokens;
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody RegisterRequest request) {
        return tokenFor(identity.register(
                request.email(), request.password(), request.fullName(), request.role()));
    }

    @PostMapping("/auth/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return tokenFor(identity.authenticate(request.email(), request.password()));
    }

    @GetMapping("/me")
    public User me(@AuthenticationPrincipal Jwt jwt) {
        return identity.get(CurrentUser.id(jwt));
    }

    private TokenResponse tokenFor(User user) {
        return new TokenResponse(tokens.issue(user.id(), user.role()), tokens.ttlSeconds(), user);
    }
}
