package com.dypcet.journex.payment;

import com.dypcet.journex.identity.CurrentUser;
import com.dypcet.journex.payment.PaymentService.Payment;
import com.dypcet.journex.payment.PaymentService.Settlement;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** A person's own money history. All of it was handled by the mock provider. */
@RestController
@RequestMapping("/api/v1")
public class PaymentController {

    private final PaymentService payments;

    public PaymentController(PaymentService payments) {
        this.payments = payments;
    }

    @GetMapping("/payments")
    @PreAuthorize("hasRole('PASSENGER')")
    public List<Payment> payments(@AuthenticationPrincipal Jwt jwt) {
        return payments.forPassenger(CurrentUser.id(jwt));
    }

    @GetMapping("/settlements")
    @PreAuthorize("hasRole('DRIVER')")
    public List<Settlement> settlements(@AuthenticationPrincipal Jwt jwt) {
        return payments.forDriver(CurrentUser.id(jwt));
    }
}
