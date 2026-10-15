-- Browsers a member has turned push notifications on in. The address is where the
-- browser's push service accepts messages; the two keys encrypt them for that browser.
CREATE TABLE push_subscriptions (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id),
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     BYTEA NOT NULL,
    auth       BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
