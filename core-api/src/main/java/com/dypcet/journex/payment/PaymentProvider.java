package com.dypcet.journex.payment;

import java.math.BigDecimal;
import java.util.Optional;

/** The outside party that actually moves money. The only implementation is a mock. */
public interface PaymentProvider {

    /** Stored with every intent and settlement, so a record always says who handled it. */
    String name();

    /** Reserves the amount. Returns the provider's reference, or empty if it declined. */
    Optional<String> hold(BigDecimal amount, PaymentChoice choice);

    void capture(String holdReference, BigDecimal amount);

    void release(String holdReference, BigDecimal amount);

    /** Pays a driver and returns the provider's reference for the payout. */
    String payout(long driverId, BigDecimal amount);
}
