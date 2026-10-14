-- Who brought whom. No reward is recorded: none has been decided.
ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;

CREATE TABLE referrals (
    referrer_id  BIGINT NOT NULL REFERENCES users(id),
    -- Someone is referred once, by one member.
    referee_id   BIGINT PRIMARY KEY REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- When the referred member completed a first trip.
    qualified_at TIMESTAMPTZ,
    CHECK (referrer_id <> referee_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
