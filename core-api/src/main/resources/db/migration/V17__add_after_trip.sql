-- After a trip: the passenger's side of whether it happened, and when a reminder to rate
-- it was sent. A trip is completed on the driver's word; this records the passenger's.
ALTER TABLE bookings
    ADD COLUMN passenger_confirmed    BOOLEAN,
    ADD COLUMN passenger_confirmed_at TIMESTAMPTZ,
    ADD COLUMN rating_reminded_at     TIMESTAMPTZ;
