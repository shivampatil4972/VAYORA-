-- The postgis image enables this in the default database already; stating it here
-- makes the schema self-contained on any PostgreSQL that has PostGIS installed.
CREATE EXTENSION IF NOT EXISTS postgis;
