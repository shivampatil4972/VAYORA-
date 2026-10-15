-- Profile and vehicle photos. Only a re-encoded JPEG is kept: no file name, no metadata.
CREATE TABLE user_photos (
    user_id    BIGINT PRIMARY KEY REFERENCES users(id),
    jpeg       BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicle_photos (
    vehicle_id BIGINT PRIMARY KEY REFERENCES vehicles(id),
    jpeg       BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
