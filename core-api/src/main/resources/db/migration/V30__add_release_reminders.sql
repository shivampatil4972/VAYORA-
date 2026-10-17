-- When the passenger was asked to release the seat if their plans had changed (feature 79),
-- so that each confirmed booking is asked once at most.
ALTER TABLE bookings ADD COLUMN release_reminded_at TIMESTAMPTZ;
