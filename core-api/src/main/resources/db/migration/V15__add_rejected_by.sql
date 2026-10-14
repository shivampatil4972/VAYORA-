-- Who closed a request that was not accepted: the driver, or the platform because it was
-- not answered in time or the ride started first. A driver's response rate counts only
-- the driver's own answers. Rows from before this column are left empty.
ALTER TABLE bookings ADD COLUMN rejected_by TEXT CHECK (rejected_by IN ('driver', 'platform'));
