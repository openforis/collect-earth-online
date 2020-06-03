ALTER TABLE users ADD mailing_list boolean DEFAULT TRUE;

CREATE OR REPLACE FUNCTION set_mailing_list(_user_uid integer, _enable boolean)
 RETURNS void AS $$

    UPDATE users SET mailing_list = _enable WHERE user_uid = _user_rid

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_user_details(_user_rid integer)
 RETURNS TABLE (
    mailing_list    boolean
 ) AS $$

    SELECT mailing_list FROM users WHERE user_uid = _user_rid

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_all_mailing_list_users()
 RETURNS TABLE (
    email    text
 ) AS $$

    SELECT email FROM users WHERE mailing_list = TRUE

$$ LANGUAGE SQL;
