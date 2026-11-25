ALTER TABLE users
ADD COLUMN otp_secret text,
ADD COLUMN otp_pending_secret text;
