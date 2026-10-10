package com.dypcet.journex.booking;

/**
 * Where a booking is in its life. Only PENDING and CONFIRMED can still change; every
 * other status is final.
 */
public enum BookingStatus {
    PENDING,
    CONFIRMED,
    REJECTED,
    CANCELLED,
    COMPLETED,
    NO_SHOW;

    public boolean canTransitionTo(BookingStatus next) {
        return switch (this) {
            case PENDING -> next == CONFIRMED || next == REJECTED || next == CANCELLED;
            case CONFIRMED -> next == CANCELLED || next == COMPLETED || next == NO_SHOW;
            case REJECTED, CANCELLED, COMPLETED, NO_SHOW -> false;
        };
    }

    /**
     * Whether the booking's seats count against the ride's inventory. REJECTED and
     * CANCELLED give them back. A NO_SHOW keeps them: refilling an empty seat mid-route
     * is a separate, later feature.
     */
    public boolean holdsSeats() {
        return this != REJECTED && this != CANCELLED;
    }
}
