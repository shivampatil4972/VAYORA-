-- With a real provider (feature 46) one payment must pay for one booking or one pass. The
-- provider checks this under a lock; these make it impossible to record twice anyway.
CREATE UNIQUE INDEX payment_intents_one_per_payment ON payment_intents (provider, provider_ref);
CREATE UNIQUE INDEX passes_one_per_payment ON passes (provider, provider_ref) WHERE provider_ref IS NOT NULL;
