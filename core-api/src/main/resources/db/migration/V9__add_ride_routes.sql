-- The road a ride follows through its stops, and how long it is.
--
-- route_source says where it came from: OSRM for a real road route, STRAIGHT_LINE when
-- the routing service could not be reached and the stops were simply joined up.
-- All four are NULL on rides published before routes were recorded.

ALTER TABLE rides
    ADD COLUMN route        geography(LineString, 4326),
    ADD COLUMN distance_m   DOUBLE PRECISION CHECK (distance_m >= 0),
    ADD COLUMN duration_s   DOUBLE PRECISION CHECK (duration_s >= 0),
    ADD COLUMN route_source TEXT CHECK (route_source IN ('OSRM', 'STRAIGHT_LINE'));

-- Search finds stops within a distance of a point.
CREATE INDEX idx_ride_stops_location ON ride_stops USING GIST (location);
