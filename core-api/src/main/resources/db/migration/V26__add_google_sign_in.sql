-- The Google account a member signs in with, by Google's stable subject id.
ALTER TABLE users ADD COLUMN google_sub TEXT UNIQUE;
