-- A pass can be a referral reward (feature 72): free, with no payment behind it, given
-- once to each passenger of a referral when the invited member completes a first trip.
ALTER TABLE passes
    ALTER COLUMN method DROP NOT NULL,
    ALTER COLUMN provider_ref DROP NOT NULL,
    ADD COLUMN reward_for_referee BIGINT REFERENCES referrals(referee_id),
    DROP CONSTRAINT passes_price_check,
    ADD CONSTRAINT passes_bought_or_rewarded CHECK (
        (reward_for_referee IS NULL AND price > 0 AND method IS NOT NULL AND provider_ref IS NOT NULL)
        OR (reward_for_referee IS NOT NULL AND price = 0 AND method IS NULL AND provider_ref IS NULL));

CREATE UNIQUE INDEX uq_passes_one_reward ON passes(passenger_id, reward_for_referee)
    WHERE reward_for_referee IS NOT NULL;
