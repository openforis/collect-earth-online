ALTER TABLE users ADD COLUMN on_mailing_list boolean DEFAULT NULL;

CREATE OR REPLACE FUNCTION set_mailing_list(_user_uid integer, _on_mailing_list boolean)
 RETURNS void AS $$

    UPDATE users SET on_mailing_list = _on_mailing_list WHERE user_uid = _user_uid

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_user_details(_user_uid integer)
 RETURNS TABLE (
    on_mailing_list    boolean
 ) AS $$

    SELECT on_mailing_list FROM users WHERE user_uid = _user_uid

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_all_mailing_list_users()
 RETURNS TABLE (
    email    text
 ) AS $$

    SELECT email FROM users WHERE on_mailing_list = TRUE

$$ LANGUAGE SQL;

DROP FUNCTION add_user(text, text);

-- Adds a new user to the database
CREATE OR REPLACE FUNCTION add_user(_email text, _password text, _on_mailing_list boolean)
 RETURNS integer AS $$

    INSERT INTO users (email, password, on_mailing_list)
    VALUES (_email, crypt(_password, gen_salt('bf')), _on_mailing_list)
    RETURNING user_uid

$$ LANGUAGE SQL;
