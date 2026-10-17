-- When the driver actually started the ride. A ride may start up to an hour early, so a
-- seat sold while it is under way is judged by the earlier of this and the timetable.
ALTER TABLE rides ADD COLUMN started_at TIMESTAMPTZ;
