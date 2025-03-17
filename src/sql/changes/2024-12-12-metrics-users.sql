CREATE TABLE metrics_users (
    metric_users_uid   SERIAL PRIMARY KEY,
    user_rid           INTEGER NOT NULL REFERENCES users (user_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    created_date       DATE DEFAULT NOW()
);
