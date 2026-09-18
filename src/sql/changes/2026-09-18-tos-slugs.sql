ALTER TABLE projects
  ADD COLUMN tos_slug text;

ALTER TABLE users
  ADD COLUMN tos_slug text;
