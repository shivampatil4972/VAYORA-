-- Government ID (feature 7), a labelled mock: which identity document a driver says they
-- hold. Only the kind is kept, never its number or a copy. Nothing checks it, and nothing
-- may call the member verified because of it.
ALTER TABLE users
    ADD COLUMN id_document TEXT
        CHECK (id_document IN ('AADHAAR', 'PAN', 'DRIVING_LICENCE', 'PASSPORT', 'VOTER_ID'));
