-- What a driver says about a ride, and which rides were published together.

ALTER TABLE rides
    ADD COLUMN notes           TEXT CHECK (char_length(notes) <= 500),
    -- The driver's promise that no more than two passengers share the back seat.
    ADD COLUMN max_two_in_back BOOLEAN NOT NULL DEFAULT FALSE,
    -- Shared by a ride, its return and their weekly repeats. Each is still a ride of its
    -- own: booked, changed and withdrawn separately.
    ADD COLUMN series_id       UUID;

CREATE INDEX idx_rides_series ON rides(series_id) WHERE series_id IS NOT NULL;
