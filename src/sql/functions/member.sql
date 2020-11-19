-- NAMESPACE: member
-- REQUIRES: clear, project

--
--  USER FUNCTIONS
--

-- Adds a new user to the database
CREATE OR REPLACE FUNCTION add_user(_email text, _password text, _on_mailing_list boolean)
 RETURNS integer AS $$

    INSERT INTO users
        (email, password, on_mailing_list)
    VALUES
        (_email, crypt(_password, gen_salt('bf')), _on_mailing_list)
    RETURNING user_uid

$$ LANGUAGE SQL;

-- Get information for single user
CREATE OR REPLACE FUNCTION get_user(_email text)
 RETURNS TABLE (
    user_id          integer,
    administrator    boolean,
    reset_key        text
 ) AS $$

    SELECT user_uid, administrator, reset_key
    FROM users
    WHERE email = _email

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_user_by_id(_user_id integer)
 RETURNS TABLE (
    email            text,
    administrator    boolean,
    reset_key        text
 ) AS $$

    SELECT email, administrator, reset_key
    FROM users
    WHERE user_uid = _user_id
        AND _user_id > 0

$$ LANGUAGE SQL;

-- Get all users by institution ID, includes role
CREATE OR REPLACE FUNCTION get_all_users_by_institution_id(_institution_id integer)
 RETURNS TABLE (
    user_id             integer,
    email               text,
    institution_role    text
 ) AS $$

    SELECT user_uid, email, title AS institution_role
    FROM users u
    INNER JOIN institution_users iu
        ON u.user_uid = iu.user_rid
    INNER JOIN roles
        ON roles.role_uid = iu.role_rid
    WHERE iu.institution_rid = _institution_id
        AND administrator = FALSE
        AND email <> 'guest'

$$ LANGUAGE SQL;

-- Returns all of the user fields associated with the provided email
CREATE OR REPLACE FUNCTION check_login(_email text, _password text)
 RETURNS TABLE (
    user_id          integer,
    administrator    boolean
 ) AS $$

    SELECT user_uid, administrator
    FROM users
    WHERE email = _email
        AND password = crypt(_password, password)

$$ LANGUAGE SQL;

-- Returns all of the user fields associated with the provided email
CREATE OR REPLACE FUNCTION email_taken(_email text, _user_id integer)
 RETURNS boolean AS $$

    SELECT EXISTS(SELECT 1 FROM users WHERE email = _email AND user_uid <> _user_id)

$$ LANGUAGE SQL;

-- Returns plot stats for user
CREATE OR REPLACE FUNCTION get_user_stats(_user_id integer)
 RETURNS TABLE (
    total_projects     integer,
    total_plots        integer,
    average_time       numeric,
    per_project        text
 ) AS $$

    WITH users_plots as (
        SELECT plot_uid,
            p.*,
            (CASE WHEN collection_time IS NULL OR collection_start IS NULL THEN 0
                ELSE EXTRACT(EPOCH FROM (collection_time - collection_start)) END) as seconds
        FROM user_plots up
        INNER JOIN plots pl
            ON up.plot_rid = plot_uid
        INNER JOIN projects p
            ON pl.project_rid = project_uid
        INNER JOIN users u
            ON up.user_rid = _user_id
    ), user_totals as (
        SELECT COUNT(DISTINCT project_uid)::int as proj_count,
            COUNT(DISTINCT plot_uid)::int as plot_count
        FROM users_plots
    ), average_totals as (
        SELECT round(avg(seconds)::numeric, 1) as sec_avg
        FROM users_plots
        WHERE seconds IS NOT NULL
    ), proj_groups as (
        SELECT project_uid,
            "name",
            description,
            availability,
            COUNT(plot_uid)::int as plot_cnt,
            round(avg(seconds)::numeric, 1) as sec_avg
        FROM users_plots
        GROUP BY project_uid, "name", description, availability
        ORDER BY project_uid DESC
    ), proj_agg as (
        SELECT
            format('[%s]',
                   string_agg(
                       format('{"id":%s, "name":"%s", "description":"%s", "availability":"%s", "plotCount":%s, "analysisAverage":%s}',
                              project_uid, "name", description, availability, plot_cnt, sec_avg), ', ')) as per_project
        FROM proj_groups
    )

    SELECT * FROM user_totals, average_totals, proj_agg

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION set_mailing_list(_user_id integer, _on_mailing_list boolean)
 RETURNS void AS $$

    UPDATE users
    SET on_mailing_list = _on_mailing_list
    WHERE user_uid = _user_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_user_details(_user_id integer)
 RETURNS TABLE (
    on_mailing_list    boolean
 ) AS $$

    SELECT on_mailing_list FROM users WHERE user_uid = _user_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_all_mailing_list_users()
 RETURNS TABLE (
    email    text
 ) AS $$

    SELECT email FROM users WHERE on_mailing_list = TRUE

$$ LANGUAGE SQL;


-- Adds a new role to the database
CREATE OR REPLACE FUNCTION insert_role(_title text)
 RETURNS integer AS $$

    INSERT INTO roles (title)
    VALUES (_title)
    RETURNING role_uid

$$ LANGUAGE SQL;

-- Resets the email for the given user
CREATE OR REPLACE FUNCTION set_user_email(_email text, _new_email text)
 RETURNS text AS $$

    UPDATE users
    SET email = _new_email
    WHERE email = _email
    RETURNING email

$$ LANGUAGE SQL;

-- Sets the password reset key for the given user. If one already exists, it is replaced.
CREATE OR REPLACE FUNCTION set_password_reset_key(_email text, _reset_key text)
 RETURNS text AS $$

    UPDATE users
    SET reset_key = _reset_key
    WHERE email = _email
    RETURNING email

$$ LANGUAGE SQL;

-- Updates password for a given user and clears the reset key.
CREATE OR REPLACE FUNCTION update_password(_email text, _password text)
 RETURNS text AS $$

    UPDATE users
    SET password = crypt(_password, gen_salt('bf')),
        reset_key = NULL
    WHERE email = _email
    RETURNING email

$$ LANGUAGE SQL;

--
--  INSTITUTION FUNCTIONS
--

-- Adds a new institution to the database
CREATE OR REPLACE FUNCTION add_institution(_name text, _logo text, _description text, _url text, _archived boolean)
 RETURNS integer AS $$

    INSERT INTO institutions
        (name, logo, description, url, archived)
    VALUES
        (_name, _logo, _description, _url, _archived)
    RETURNING institution_uid

$$ LANGUAGE SQL;

-- Archive institution and all projects under it
CREATE OR REPLACE FUNCTION archive_institution(_institution_id integer)
 RETURNS integer AS $$

    SELECT (archive_project(project_uid))
    FROM projects
    WHERE institution_rid = _institution_id;

    UPDATE institutions
    SET archived = TRUE,
        archived_date = NOW()
    WHERE institution_uid = _institution_id
    RETURNING institution_uid;

$$ LANGUAGE SQL;

-- FIXME all institutions does not need to return the whole institution_return
-- Returns all institutions
CREATE OR REPLACE FUNCTION select_all_institutions()
 RETURNS setOf institution_return AS $$

    WITH inst_roles AS (
        SELECT user_rid, title, institution_rid
        FROM institution_users as iu
        LEFT JOIN roles
            ON role_uid = iu.role_rid
    ), members AS (
        SELECT jsonb_agg(user_rid) as member_list, institution_rid
        FROM inst_roles
        WHERE title = 'member'
            OR title = 'admin'
        GROUP BY institution_rid
    ), admins AS (
        SELECT jsonb_agg(user_rid) as admin_list, institution_rid
        FROM inst_roles
        WHERE title = 'admin'
        GROUP BY institution_rid
    ), pending AS (
        SELECT jsonb_agg(user_rid) as pending_list, institution_rid
        FROM inst_roles
        WHERE title = 'pending'
        GROUP BY institution_rid
    )

    SELECT institution_uid,
        i.name,
        i.logo,
        i.description,
        i.url,
        i.archived,
        (CASE WHEN member_list IS NULL THEN '[]' ELSE member_list END),
        (CASE WHEN admin_list IS NULL THEN '[]' ELSE admin_list END),
        (CASE WHEN pending_list IS NULL THEN '[]' ELSE pending_list END)
    FROM institutions as i
    LEFT JOIN members as m
        ON institution_uid = m.institution_rid
    LEFT JOIN admins as a
        ON institution_uid = a.institution_rid
    LEFT JOIN pending as p
        ON institution_uid = p.institution_rid
    WHERE archived = false
    ORDER by institution_uid

$$ LANGUAGE SQL;

-- Returns one institution
CREATE OR REPLACE FUNCTION select_institution_by_id(_institution_id integer)
 RETURNS setOf institution_return AS $$

    SELECT * FROM select_all_institutions()
    WHERE institution_id = _institution_id
        AND archived = false

$$ LANGUAGE SQL;

-- Updates institution details
CREATE OR REPLACE FUNCTION update_institution(_institution_id integer, _name text, _logo_path text, _description text, _url text)
 RETURNS integer AS $$

    UPDATE institutions
    SET name = _name,
        url = _url,
        description = _description,
        logo = _logo_path
    WHERE institution_uid = _institution_id
    RETURNING institution_uid

$$ LANGUAGE SQL;

-- Update only logo. Id is not known during add_institution.
CREATE OR REPLACE FUNCTION update_institution_logo(_institution_id integer, _logo text)
 RETURNS integer AS $$

    UPDATE institutions
    SET logo = _logo
    WHERE institution_uid = _institution_id
    RETURNING institution_uid

$$ LANGUAGE SQL;

--
--  INSTITUTION USER FUNCTIONS
--

-- FIXME, we dont use the return values, convert to void

-- Adds a new institution_user to the database
CREATE OR REPLACE FUNCTION add_institution_user(_institution_id integer, _user_id integer, _role_id integer)
 RETURNS integer AS $$

    INSERT INTO institution_users
        (institution_rid, user_rid, role_rid)
    VALUES
        (_institution_id, _user_id, _role_id)
    RETURNING inst_user_uid

$$ LANGUAGE SQL;

-- Adding a institution_user with role as text
CREATE OR REPLACE FUNCTION add_institution_user(_institution_id integer, _user_id integer, _role text)
 RETURNS integer AS $$

    INSERT INTO institution_users
        (institution_rid, user_rid, role_rid)
    SELECT _institution_id, _user_id, role_uid
    FROM (SELECT role_uid FROM roles WHERE title = _role) AS tr
    RETURNING inst_user_uid

$$ LANGUAGE SQL;

-- Remove user from institution
CREATE OR REPLACE FUNCTION remove_institution_user_role(_institution_id integer, _user_id integer)
 RETURNS void AS $$

    DELETE FROM institution_users
    WHERE institution_rid = _institution_id
        AND user_rid = _user_id

$$ LANGUAGE SQL;

-- Update the role of the user in a given institution
CREATE OR REPLACE FUNCTION update_institution_user_role(_institution_id integer, _user_id integer, _role text)
 RETURNS integer AS $$

    UPDATE institution_users
    SET role_rid = role_uid
    FROM roles AS r
    WHERE institution_rid = _institution_id
        AND user_rid = _user_id
        AND title = _role
    RETURNING inst_user_uid

$$ LANGUAGE SQL;

--
-- ROUTE AUTHENTICATION FUNCTIONS
--

-- Check if user is admin of institution
CREATE OR REPLACE FUNCTION is_institution_admin(_user_id integer, _institution_id integer)
 RETURNS boolean AS $$

    SELECT count(1) > 0
    FROM institution_users as iu
    INNER JOIN roles as r
        ON iu.role_rid = role_uid
    INNER JOIN institutions as i
        ON institution_rid = institution_uid
    WHERE iu.user_rid = _user_id
        AND institution_rid = _institution_id
        AND title = 'admin'
        AND archived = FALSE

$$ LANGUAGE SQL;

-- Check if user has collection rights (read rights) for the project
CREATE OR REPLACE FUNCTION can_user_collect_project(_user_id integer, _project_id integer)
 RETURNS boolean AS $$

    SELECT count(1) > 0
    FROM projects as p
    LEFT JOIN institution_users iu
        ON p.institution_rid = iu.institution_rid
        AND user_rid = _user_id
    LEFT JOIN roles r
        ON iu.role_rid = role_uid
    WHERE project_uid = _project_id
        AND ((r.title = 'admin' AND p.availability <> 'archived')
            OR (r.title = 'member'
                AND p.privacy_level IN ('public', 'institution', 'users')
                AND p.availability = 'published')
            OR (_user_id > 0
                AND p.privacy_level IN ('public', 'users')
                AND p.availability = 'published')
            OR (p.privacy_level IN ('public')
                AND p.availability = 'published'))

$$ LANGUAGE SQL;

-- Check if user has modify rights for the project
CREATE OR REPLACE FUNCTION can_user_edit_project(_user_id integer, _project_id integer)
 RETURNS boolean AS $$

    SELECT count(1) > 0
    FROM projects as p
    LEFT JOIN institution_users iu
        ON p.institution_rid = iu.institution_rid
        AND user_rid = _user_id
    LEFT JOIN roles r
        ON iu.role_rid = role_uid
    WHERE project_uid = _project_id
        AND (r.title = 'admin' AND p.availability <> 'archived')

$$ LANGUAGE SQL;
