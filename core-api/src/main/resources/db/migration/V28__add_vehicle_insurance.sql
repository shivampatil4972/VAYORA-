-- Insurance as the driver declares it (feature 58). Nothing is checked with an insurer and
-- no policy number is kept: wherever it is shown, it says it was not checked.
ALTER TABLE vehicles
    ADD COLUMN insurer TEXT,
    ADD COLUMN insured_until DATE,
    ADD CONSTRAINT vehicles_insurance_whole CHECK ((insurer IS NULL) = (insured_until IS NULL));
