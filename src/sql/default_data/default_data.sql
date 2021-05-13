-- NAMESPACE: default-data

INSERT INTO roles
    (role_uid, title)
VALUES
    (1, 'admin'),
    (2, 'member'),
    (3, 'pending');

INSERT INTO users
    (user_uid, email, password, administrator, reset_key)
VALUES
    (-1, 'guest', '', false, null);
