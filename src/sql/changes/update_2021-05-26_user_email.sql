ALTER TABLE users ADD COLUMN verified boolean DEFAULT FALSE;

UPDATE users SET verified = true;
