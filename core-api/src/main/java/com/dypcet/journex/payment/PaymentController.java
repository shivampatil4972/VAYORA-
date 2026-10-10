package com.dypcet.journex.payment;

import com.dypcet.journex.identity.CurrentUser;
import com.dypcet.journex.payment.PaymentService.Payment;
import com.dypcet.journex.payment.PaymentService.Settlement;
import com.dypcet.journex.refund.RefundProperties;
import java.math.BigDecimal;
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

    /** @param atLeastHoursBefore cancelling this long before boarding, or earlier, earns the tier */
    public record RefundTier(long atLeastHoursBefore, BigDecimal fareShare) {
    }

    /**
     * What a passenger is charged and what cancelling returns, for the UI to state.
     *
     * @param provider who handles payments; {@code MOCK} means no money moves
     */
    public record Terms(String provider, BigDecimal serviceFeeRate, List<RefundTier> refundTiers) {
    }

    private final PaymentService payments;
    private final Terms terms;

    public PaymentController(PaymentService payments, PaymentProvider provider, ServiceFee serviceFee,
            RefundProperties refunds) {
        this.payments = payments;
        this.terms = new Terms(provider.name(), serviceFee.rate(), refunds.tiers().stream()
                .map(tier -> new RefundTier(tier.atLeastBefore().toHours(), tier.fareShare()))
                .toList());
    }

    @GetMapping("/payment-terms")
    public Terms terms() {
        return terms;
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
