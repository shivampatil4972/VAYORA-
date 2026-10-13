-- What a driver says about the car beyond its seats. All of it is the driver's own
-- description; nothing here is inspected or checked.

ALTER TABLE vehicles
    ADD COLUMN comfort TEXT CHECK (comfort IN ('BASIC', 'COMFORT', 'PREMIUM')),
    -- The largest bag each passenger may bring.
    ADD COLUMN luggage TEXT CHECK (luggage IN ('NONE', 'SMALL', 'MEDIUM', 'LARGE')),
    ADD COLUMN electric BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN battery_kwh NUMERIC(5, 1) CHECK (battery_kwh > 0),
    ADD COLUMN consumption_kwh_per_100km NUMERIC(4, 1) CHECK (consumption_kwh_per_100km > 0),
    -- Battery figures describe an electric vehicle and nothing else.
    ADD CONSTRAINT vehicles_battery_only_if_electric
        CHECK (electric OR (battery_kwh IS NULL AND consumption_kwh_per_100km IS NULL));
