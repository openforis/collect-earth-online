ALTER TABLE users
ADD COLUMN password_reset_required BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN password_changed_at TIMESTAMP;
