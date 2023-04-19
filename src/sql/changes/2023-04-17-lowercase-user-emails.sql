UPDATE users SET email = LOWER(email);

REINDEX INDEX users_email_key;
