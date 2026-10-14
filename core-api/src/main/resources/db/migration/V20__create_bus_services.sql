-- Bus services entered by administrators. None ship with the platform, and nothing checks
-- them against an operator's timetable.
CREATE TABLE bus_services (
    id               BIGSERIAL PRIMARY KEY,
    operator         TEXT NOT NULL,
    from_stop        TEXT NOT NULL,
    to_stop          TEXT NOT NULL,
    -- Local time of day (Asia/Kolkata) it leaves from_stop, every day.
    departs          TIME NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes BETWEEN 10 AND 1440),
    fare             NUMERIC(10, 2) NOT NULL CHECK (fare >= 0),
    notes            TEXT,
    created_by       BIGINT NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (lower(from_stop) <> lower(to_stop))
);

CREATE INDEX idx_bus_services_route ON bus_services(lower(from_stop), lower(to_stop), departs);
