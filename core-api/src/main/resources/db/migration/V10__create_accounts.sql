-- What a member says about themselves, proof that their email and phone are theirs,
-- who to tell in an emergency, and emergencies raised.

ALTER TABLE users
    ADD COLUMN phone             TEXT CHECK (phone ~ '^\+?[0-9]{10,15}$'),
    ADD COLUMN email_verified_at TIMESTAMPTZ,
    ADD COLUMN phone_verified_at TIMESTAMPTZ;

-- Everything here is optional and NULL means "has not said".
CREATE TABLE profiles (
    user_id    BIGINT PRIMARY KEY REFERENCES users(id),
    bio        TEXT CHECK (char_length(bio) <= 500),
    birth_year INT CHECK (birth_year BETWEEN 1900 AND 2100),
    gender     TEXT CHECK (gender IN ('FEMALE', 'MALE', 'OTHER')),
    smoking    BOOLEAN,
    pets       BOOLEAN,
    music      BOOLEAN,
    chattiness TEXT CHECK (chattiness IN ('QUIET', 'MODERATE', 'TALKATIVE')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A one-time code sent to an email address or a phone. Only its hash is kept.
CREATE TABLE verification_codes (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    channel     TEXT NOT NULL CHECK (channel IN ('EMAIL', 'PHONE')),
    -- The address the code was sent to: a code for an old phone number proves nothing
    -- about a new one.
    destination TEXT NOT NULL,
    code_hash   TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INT NOT NULL DEFAULT 0,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_codes_user ON verification_codes(user_id, channel, id DESC);

CREATE TABLE emergency_contacts (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id),
    name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    phone      TEXT NOT NULL CHECK (phone ~ '^\+?[0-9]{10,15}$'),
    relation   TEXT CHECK (char_length(relation) <= 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

CREATE TABLE sos_alerts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    ride_id         BIGINT REFERENCES rides(id),
    -- Where the member said they were, if their device gave a position.
    location        geography(Point, 4326),
    -- How many emergency contacts a message was handed to the sender for, and which
    -- sender. MOCK means none of them was really messaged.
    contacts_told   INT NOT NULL,
    sender          TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED')),
    acknowledged_by BIGINT REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sos_alerts_status ON sos_alerts(status, id);
