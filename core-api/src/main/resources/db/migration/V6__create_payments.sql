-- Money. The only provider is a mock: these tables record what a real one would have
-- been asked to do, and no money moves.
--
-- A booking's payment is one intent. The passenger's money is held when the booking is
-- requested and settled exactly once, when the booking ends: some of it captured, the
-- rest released back. What happened is in ledger_entries, which is append-only, so
-- for a settled intent  HOLD = CAPTURE + RELEASE  always holds and can be audited.

CREATE TABLE payment_intents (
    id           BIGSERIAL PRIMARY KEY,
    booking_id   BIGINT NOT NULL UNIQUE REFERENCES bookings(id),
    passenger_id BIGINT NOT NULL REFERENCES users(id),
    fare         NUMERIC(10, 2) NOT NULL CHECK (fare >= 0),
    service_fee  NUMERIC(10, 2) NOT NULL CHECK (service_fee >= 0),
    amount       NUMERIC(10, 2) NOT NULL,
    method       TEXT NOT NULL CHECK (method IN ('CARD', 'UPI', 'WALLET')),
    provider     TEXT NOT NULL,
    provider_ref TEXT NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('HELD', 'SETTLED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    settled_at   TIMESTAMPTZ,
    CONSTRAINT amount_is_fare_plus_fee CHECK (amount = fare + service_fee)
);

CREATE INDEX idx_payment_intents_passenger ON payment_intents(passenger_id);

CREATE TABLE ledger_entries (
    id         BIGSERIAL PRIMARY KEY,
    intent_id  BIGINT NOT NULL REFERENCES payment_intents(id),
    -- HOLD     passenger's money reserved
    -- CAPTURE  part of the hold kept
    -- RELEASE  part of the hold returned to the passenger
    -- PAYOUT   part of what was captured paid on to the driver
    kind       TEXT NOT NULL CHECK (kind IN ('HOLD', 'CAPTURE', 'RELEASE', 'PAYOUT')),
    amount     NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_entries_intent ON ledger_entries(intent_id);

CREATE FUNCTION ledger_is_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ledger_entries is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_no_rewrite
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION ledger_is_append_only();

-- What the passenger got back and why. At most one per booking.
CREATE TABLE refunds (
    id         BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(id),
    intent_id  BIGINT NOT NULL REFERENCES payment_intents(id),
    amount     NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    reason     TEXT NOT NULL
               CHECK (reason IN ('NOT_ACCEPTED', 'DRIVER_CANCELLED', 'PASSENGER_CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- What the driver was paid and why. At most one per booking.
CREATE TABLE settlements (
    id           BIGSERIAL PRIMARY KEY,
    booking_id   BIGINT NOT NULL UNIQUE REFERENCES bookings(id),
    driver_id    BIGINT NOT NULL REFERENCES users(id),
    amount       NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    reason       TEXT NOT NULL
                 CHECK (reason IN ('TRIP_COMPLETED', 'PASSENGER_NO_SHOW', 'LATE_CANCELLATION')),
    provider     TEXT NOT NULL,
    provider_ref TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlements_driver ON settlements(driver_id);

-- A client that retries a booking request sends the same key and gets the same booking,
-- so a double submit cannot take two holds.
ALTER TABLE bookings ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_bookings_idempotency
    ON bookings(passenger_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
