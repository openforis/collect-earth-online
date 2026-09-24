-- Terms of Service acceptance.
-- NULL means "not accepted yet". Kept separate from users.accepted_terms,
-- which tracks the simplified-project data-sharing agreement.

ALTER TABLE users
    ADD COLUMN tos_accepted_date timestamptz;

ALTER TABLE projects
    ADD COLUMN tos_accepted_date timestamptz,
    ADD COLUMN tos_accepted_by   integer REFERENCES users (user_uid) ON DELETE SET NULL;
