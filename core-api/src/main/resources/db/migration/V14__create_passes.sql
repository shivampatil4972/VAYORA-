-- Travel passes. A pass waives the platform's service fee on bookings requested while it
-- runs; drivers are paid the same fare either way.

CREATE TABLE passes (
    id           BIGSERIAL PRIMARY KEY,
    passenger_id BIGINT NOT NULL REFERENCES users(id),
    kind         TEXT NOT NULL CHECK (kind IN ('WEEKLY', 'MONTHLY', 'ANNUAL')),
    price        NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    starts_at    TIMESTAMPTZ NOT NULL,
    ends_at      TIMESTAMPTZ NOT NULL,
    method       TEXT NOT NULL CHECK (method IN ('CARD', 'UPI', 'WALLET')),
    -- MOCK means no money moved.
    provider     TEXT NOT NULL,
    provider_ref TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);

CREATE INDEX idx_passes_passenger ON passes(passenger_id, ends_at DESC);
