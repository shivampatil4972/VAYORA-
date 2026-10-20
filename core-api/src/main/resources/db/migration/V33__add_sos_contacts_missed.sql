-- With a real text-message provider (feature 64), a text to an emergency contact can fail.
-- contacts_told then counts the texts that went, and this the ones that did not, so the
-- member and the administrators know whom to call. Always 0 with the simulated sender.
ALTER TABLE sos_alerts ADD COLUMN contacts_missed INT NOT NULL DEFAULT 0 CHECK (contacts_missed >= 0);
