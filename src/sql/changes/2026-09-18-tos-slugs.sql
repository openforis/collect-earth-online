ALTER TABLE users
    ADD COLUMN IF NOT EXISTS accept_tos text;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS accept_tos text;
