DELETE FROM institutions WHERE institution_uid <> 785 AND institution_uid <> 3;

DELETE FROM users WHERE user_uid NOT IN (
    SELECT user_rid FROM institution_users
);
