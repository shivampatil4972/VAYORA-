package com.dypcet.journex.payment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** The platform's fee, charged to the passenger on top of the fare. */
@Component
public class ServiceFee {

    private final BigDecimal rate;

    public ServiceFee(@Value("${journex.payment.service-fee-rate}") BigDecimal rate) {
        if (rate.signum() < 0 || rate.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("journex.payment.service-fee-rate must be 0 to 1");
        }
        this.rate = rate;
    }

    public BigDecimal on(BigDecimal fare) {
        return fare.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }
}
