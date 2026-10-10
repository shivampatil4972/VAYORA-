-- After a completed trip the passenger may rate the driver and the driver the passenger,
-- once each. A rating is tied to the booking it is about, so nobody can rate someone
-- they did not travel with.

CREATE TABLE ratings (
    id         BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    rater_id   BIGINT NOT NULL REFERENCES users(id),
    ratee_id   BIGINT NOT NULL REFERENCES users(id),
    stars      INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment    TEXT CHECK (char_length(comment) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (booking_id, rater_id),
    CHECK (rater_id <> ratee_id)
);

CREATE INDEX idx_ratings_ratee ON ratings(ratee_id);
