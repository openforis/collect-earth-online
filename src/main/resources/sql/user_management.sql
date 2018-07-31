-- name: find-user-info-sql
-- Returns all of the user fields associated with the provided email.
SELECT id, email AS identity, password, role, reset_key
  FROM mapcha.users
  WHERE email = :email;

-- name: add-user-sql
-- Adds a new user to the database.
INSERT INTO mapcha.users (email, password, role)
  VALUES (:email, :password, :role)
  RETURNING email, password, role;

-- name: set-user-email-sql
-- Resets the email for the given user.
UPDATE mapcha.users
  SET email = :new_email
  WHERE email = :old_email
  RETURNING email;

-- name: set-user-password-sql
-- Resets the password for the given user.
UPDATE mapcha.users
  SET password = :password
  WHERE email = :email
  RETURNING email, password;

-- name: set-password-reset-key-sql
-- Sets the password reset key for the given user. If one already exists, it is replaced.
UPDATE mapcha.users
  SET reset_key = :reset_key
  WHERE email = :email
  RETURNING email, reset_key;
