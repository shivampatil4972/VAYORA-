-- What the booking-durability model needs to know about a booking and its passenger.
--
-- accepted_at      the model's time origin; also tells an accepted booking that was
--                  later cancelled apart from one cancelled while still pending
-- cancelled_by     a driver withdrawing a ride is not the passenger's cancellation
-- hazard_features  the model features as they stood when the booking was requested;
--                  written once and never updated

ALTER TABLE bookings
    ADD COLUMN accepted_at     TIMESTAMPTZ,
    ADD COLUMN cancelled_by    TEXT CHECK (cancelled_by IN ('passenger', 'driver')),
    ADD COLUMN hazard_features JSONB;

-- Bookings accepted before this migration have no recorded acceptance time. Their
-- last update is the closest thing on record.
UPDATE bookings SET accepted_at = updated_at
WHERE status IN ('CONFIRMED', 'COMPLETED', 'NO_SHOW');
