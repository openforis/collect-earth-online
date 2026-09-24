ALTER TABLE users
    ADD COLUMN tos_accepted_date timestamptz;

ALTER TABLE projects
    ADD COLUMN tos_accepted_date timestamptz,
    ADD COLUMN tos_accepted_by   integer REFERENCES users (user_uid) ON DELETE SET NULL;
