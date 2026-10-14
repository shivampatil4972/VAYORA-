-- A member may sign up with a phone number instead of an email address. Either one
-- identifies them at sign-in, so a phone number now belongs to one account, as an email does.

-- The form the application now writes (see Phones.normalise): +91 for Indian numbers.
UPDATE users SET phone = '+91' || right(phone, 10) WHERE phone ~ '^0?[0-9]{10}$';
UPDATE users SET phone = '+' || phone WHERE phone ~ '^91[0-9]{10}$';

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL);
-- Fails if two members already share a number; that has to be settled by hand first.
ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone);
