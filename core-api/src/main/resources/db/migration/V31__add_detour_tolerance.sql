-- Detour tolerance (feature 28). A driver says how many minutes in all they will go out of
-- their way on a ride, to pick passengers up at their own points; 0, the default, is none.
ALTER TABLE rides
    ADD COLUMN max_detour_minutes INT NOT NULL DEFAULT 0 CHECK (max_detour_minutes BETWEEN 0 AND 60);

-- A booking picked up at the passenger's own point rather than at a stop. It boards on the
-- leg after stop from_seq: pickup_offset_minutes after the ride is due there, at the cost of
-- detour_minutes to the driver. All three or none.
ALTER TABLE bookings
    ADD COLUMN pickup_location       geography(Point, 4326),
    ADD COLUMN pickup_offset_minutes INT CHECK (pickup_offset_minutes >= 0),
    ADD COLUMN detour_minutes        INT CHECK (detour_minutes >= 0),
    ADD CONSTRAINT bookings_pickup_whole CHECK (
        (pickup_location IS NULL) = (pickup_offset_minutes IS NULL)
        AND (pickup_location IS NULL) = (detour_minutes IS NULL));
