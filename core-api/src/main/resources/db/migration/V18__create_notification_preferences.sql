-- Whether a member wants copies of their notifications by email and by SMS. In-app
-- notifications are always kept. A copy goes only to an address the member has confirmed.
CREATE TABLE notification_preferences (
    user_id    BIGINT PRIMARY KEY REFERENCES users(id),
    email      BOOLEAN NOT NULL DEFAULT FALSE,
    sms        BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
