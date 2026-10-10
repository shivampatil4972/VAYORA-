-- A ride is started and completed by its driver; each booking on it ends as COMPLETED
-- or NO_SHOW.

ALTER TABLE rides DROP CONSTRAINT rides_status_check;
ALTER TABLE rides ADD CONSTRAINT rides_status_check
    CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));

ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'));
