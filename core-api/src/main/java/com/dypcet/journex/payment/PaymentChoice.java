package com.dypcet.journex.payment;

/**
 * How the passenger chose to pay.
 *
 * @param mockOutcome only meaningful to the mock provider: {@code "DECLINE"} makes the hold
 *                    fail, so the failure path can be exercised. Null otherwise.
 */
public record PaymentChoice(Method method, String mockOutcome) {

    public enum Method {
        CARD,
        UPI,
        WALLET
    }

    public static PaymentChoice card() {
        return new PaymentChoice(Method.CARD, null);
    }
}
