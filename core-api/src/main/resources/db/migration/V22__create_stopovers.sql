-- Rest stops and chargers on the corridor, entered by administrators. None ship with the
-- platform, and nothing checks that a charger works or a stop is open.
CREATE TABLE stopovers (
    id         BIGSERIAL PRIMARY KEY,
    kind       TEXT NOT NULL CHECK (kind IN ('REST', 'CHARGER')),
    name       TEXT NOT NULL,
    location   geography(Point, 4326) NOT NULL,
    -- The charger's stated power. Only a charger has one.
    charger_kw NUMERIC(6, 1) CHECK (charger_kw > 0),
    notes      TEXT,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (kind = 'CHARGER' OR charger_kw IS NULL)
);

CREATE INDEX idx_stopovers_location ON stopovers USING GIST (location);
