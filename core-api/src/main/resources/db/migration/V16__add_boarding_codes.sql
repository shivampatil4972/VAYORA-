-- A four-digit code the passenger shows at pickup and the driver checks. Bookings made
-- before this get one now.
ALTER TABLE bookings ADD COLUMN boarding_code TEXT CHECK (boarding_code ~ '^[0-9]{4}$');
UPDATE bookings SET boarding_code = lpad(floor(random() * 10000)::int::text, 4, '0');
