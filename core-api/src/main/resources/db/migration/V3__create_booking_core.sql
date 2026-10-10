-- Identity, vehicles, rides and bookings: the transactional core.
--
-- Seat inventory is per segment. A ride with stops 0..n has segments 0..n-1, where
-- segment i runs from stop i to stop i+1. A booking from stop a to stop b consumes
-- segments a..b-1 and nothing else.

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('PASSENGER', 'DRIVER', 'ADMIN')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
    id         BIGSERIAL PRIMARY KEY,
    owner_id   BIGINT NOT NULL REFERENCES users(id),
    make       TEXT NOT NULL,
    model      TEXT NOT NULL,
    year       INT,
    colour     TEXT,
    -- Total seats including the driver's.
    seats      INT NOT NULL CHECK (seats BETWEEN 2 AND 9),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_owner ON vehicles(owner_id);

CREATE TABLE rides (
    id              BIGSERIAL PRIMARY KEY,
    driver_id       BIGINT NOT NULL REFERENCES users(id),
    vehicle_id      BIGINT NOT NULL REFERENCES vehicles(id),
    departure_time  TIMESTAMPTZ NOT NULL,
    seats_offered   INT NOT NULL CHECK (seats_offered > 0),
    instant_booking BOOLEAN NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'CANCELLED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rides_departure ON rides(departure_time) WHERE status = 'SCHEDULED';
CREATE INDEX idx_rides_driver ON rides(driver_id);

CREATE TABLE ride_stops (
    ride_id        BIGINT NOT NULL REFERENCES rides(id),
    seq            INT NOT NULL CHECK (seq >= 0),
    name           TEXT NOT NULL,
    location       geography(Point, 4326) NOT NULL,
    -- Minutes after rides.departure_time at which the ride leaves this stop.
    offset_minutes INT NOT NULL CHECK (offset_minutes >= 0),
    PRIMARY KEY (ride_id, seq)
);

CREATE INDEX idx_ride_stops_name ON ride_stops(lower(name));

CREATE TABLE ride_segments (
    ride_id         BIGINT NOT NULL REFERENCES rides(id),
    seq             INT NOT NULL CHECK (seq >= 0),
    price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    seats_total     INT NOT NULL CHECK (seats_total > 0),
    seats_available INT NOT NULL,
    PRIMARY KEY (ride_id, seq),
    -- The last line of defence: no code path can oversell or over-release a segment.
    CONSTRAINT seats_within_capacity CHECK (seats_available BETWEEN 0 AND seats_total)
);

CREATE TABLE bookings (
    id           BIGSERIAL PRIMARY KEY,
    ride_id      BIGINT NOT NULL REFERENCES rides(id),
    passenger_id BIGINT NOT NULL REFERENCES users(id),
    from_seq     INT NOT NULL,
    to_seq       INT NOT NULL,
    seats        INT NOT NULL CHECK (seats > 0),
    price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    status       TEXT NOT NULL
                 CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (to_seq > from_seq)
);

CREATE INDEX idx_bookings_ride ON bookings(ride_id);
CREATE INDEX idx_bookings_passenger ON bookings(passenger_id);
