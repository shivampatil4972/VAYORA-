-- A ride a woman driver offers to women passengers only.
--
-- "Woman" means what the member chose as their gender on their own profile. Nobody checks
-- it. The rule is enforced on that declaration and on nothing stronger.
ALTER TABLE rides ADD COLUMN women_only BOOLEAN NOT NULL DEFAULT FALSE;
