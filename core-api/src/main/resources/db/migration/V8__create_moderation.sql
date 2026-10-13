-- Reports about members, what administrators did about them, and a record of every
-- administrative action.

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED'));

CREATE TABLE reports (
    id               BIGSERIAL PRIMARY KEY,
    reporter_id      BIGINT NOT NULL REFERENCES users(id),
    reported_user_id BIGINT NOT NULL REFERENCES users(id),
    -- The trip it happened on, if the reporter named one.
    booking_id       BIGINT REFERENCES bookings(id),
    reason           TEXT NOT NULL
                     CHECK (reason IN ('UNSAFE_DRIVING', 'HARASSMENT', 'NO_SHOW', 'FRAUD', 'OTHER')),
    details          TEXT CHECK (char_length(details) <= 1000),
    status           TEXT NOT NULL DEFAULT 'OPEN'
                     CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    -- What the administrator decided: DISMISS, WARN or SUSPEND.
    outcome          TEXT CHECK (outcome IN ('DISMISS', 'WARN', 'SUSPEND')),
    resolution_note  TEXT CHECK (char_length(resolution_note) <= 1000),
    resolved_by      BIGINT REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at      TIMESTAMPTZ,
    CHECK (reporter_id <> reported_user_id)
);

-- One open report per pair: a second complaint waits until the first is dealt with.
CREATE UNIQUE INDEX idx_reports_one_open
    ON reports(reporter_id, reported_user_id) WHERE status = 'OPEN';
CREATE INDEX idx_reports_status ON reports(status, id);

-- Who did what, as an administrator. Append-only, like the ledger.
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    BIGINT NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,
    target_type TEXT,
    target_id   BIGINT,
    detail      JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_rewrite
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
