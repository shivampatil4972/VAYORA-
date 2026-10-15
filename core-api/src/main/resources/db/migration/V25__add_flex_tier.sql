-- What the passenger agreed to, when booking, should the driver withdraw the ride.
ALTER TABLE bookings ADD COLUMN flex_tier TEXT NOT NULL DEFAULT 'EXACT'
    CHECK (flex_tier IN ('EXACT', 'FLEXIBLE', 'ANY_TIME'));
