-- NAMESPACE: member
-- REQUIRES: clear, project

--
-- ROUTE AUTHENTICATION FUNCTIONS
--

-- Check if user is admin of institution
CREATE OR REPLACE FUNCTION is_institution_admin(_user_id integer, _institution_id integer)
 RETURNS boolean AS $$

    SELECT count(1) > 0
    FROM institution_users as iu
    INNER JOIN institutions as i
        ON institution_rid = institution_uid
    WHERE iu.user_rid = _user_id
        AND institution_rid = _institution_id
        AND role_rid = 1
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

--  USER FUNCTIONS
--

-- Adds a new user to the database
CREATE OR REPLACE FUNCTION add_user(_email text, _password text, _reset_key text)
 RETURNS integer AS $$

    INSERT INTO users
        (email, password, reset_key)
    VALUES
        (_email, crypt(_password, gen_salt('bf')), _reset_key)
    RETURNING user_uid

$$ LANGUAGE SQL;

-- Get information for single user
CREATE OR REPLACE FUNCTION get_user_by_email(_email text)
 RETURNS table (
    user_id          integer,
    administrator    boolean,
    reset_key        text
 ) AS $$

    SELECT user_uid, administrator, reset_key
    FROM users
    WHERE email = _email

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_user_by_id(_user_id integer)
 RETURNS table (
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
 RETURNS table (
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
 RETURNS table (
    user_id          integer,
    administrator    boolean,
    verified         boolean,
    accepted_terms   boolean
 ) AS $$

    SELECT user_uid, administrator, verified, accepted_terms
    FROM users
    WHERE email = _email
        AND password = crypt(_password, password)

$$ LANGUAGE SQL;

-- Checks if email is already in use.  Ignores the current user.
CREATE OR REPLACE FUNCTION email_taken(_email text, _user_id_to_ignore integer)
 RETURNS boolean AS $$

    SELECT EXISTS(SELECT 1 FROM users WHERE email = _email AND user_uid <> _user_id_to_ignore)

$$ LANGUAGE SQL;

-- Returns plot stats for user
CREATE OR REPLACE FUNCTION get_user_stats(_user_id integer)
 RETURNS table (
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
 RETURNS void AS $$

    UPDATE users
    SET password = crypt(_password, gen_salt('bf')),
        reset_key = NULL,
        verified = TRUE
    WHERE email = _email

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION user_verified(_user_id integer)
 RETURNS void AS $$

    UPDATE users
    SET verified = TRUE
    WHERE user_uid = _user_id

$$ LANGUAGE SQL;

--
--  INSTITUTION FUNCTIONS
--

-- Checks if institution name is in use.  Ignores the current institution.
CREATE OR REPLACE FUNCTION institution_name_taken(_name text, _institution_id_to_ignore integer)
 RETURNS boolean AS $$

    SELECT count(1) > 0
    FROM institutions
    WHERE name = _name
        AND institution_uid <> _institution_id_to_ignore
        AND archived = FALSE

$$ LANGUAGE SQL;

-- Adds a new institution to the database
CREATE OR REPLACE FUNCTION add_institution(_name text, _image_name text, _url text, _description text)
 RETURNS integer AS $$

    INSERT INTO institutions
        (name, image_name, url, description, archived)
    VALUES
        (_name, _image_name, _url, _description, FALSE)
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

-- Returns all institutions
CREATE OR REPLACE FUNCTION select_all_institutions(_user_id integer)
 RETURNS table (
    institution_id    integer,
    name              text,
    is_member         boolean
 ) AS $$

    SELECT institution_uid,
        i.name,
        (SELECT count(*) > 0
         FROM institution_users
         WHERE institution_uid = institution_rid
            AND user_rid = _user_id
            AND role_rid <= 2)
    FROM institutions as i
    WHERE archived = false
    ORDER by institution_uid

$$ LANGUAGE SQL;

-- Returns institutions where user is admin
CREATE OR REPLACE FUNCTION get_user_admin_institutions(_user_id integer)
 RETURNS table (
    institution_id integer,
    institution_name text
 ) AS $$

    SELECT iu.institution_rid, i.name
    FROM institution_users iu
    INNER JOIN institutions i
        ON iu.institution_rid = i.institution_uid
    WHERE iu.user_rid = _user_id
        AND iu.role_rid = 1
        AND i.archived = FALSE
    ORDER BY i.name

$$ LANGUAGE SQL;

-- Returns one institution
CREATE OR REPLACE FUNCTION select_institution_by_id(_institution_id integer, _user_id integer)
 RETURNS table (
    institution_id       integer,
    name                 text,
    image_name           text,
    base64_image         text,
    url                  text,
    description          text,
    institution_admin    boolean
 ) AS $$

    SELECT institution_uid,
        name,
        image_name,
        encode(logo_data, 'base64'),
        url,
        description,
        (SELECT is_institution_admin(_user_id, _institution_id))
    FROM institutions
    WHERE institution_uid = _institution_id
        AND archived = false

$$ LANGUAGE SQL;

-- Updates institution details
CREATE OR REPLACE FUNCTION update_institution(_institution_id integer, _name text, _image_name text, _url text, _description text)
 RETURNS integer AS $$

    UPDATE institutions
    SET name = _name,
        image_name = _image_name,
        url = _url,
        description = _description
    WHERE institution_uid = _institution_id
    RETURNING institution_uid

$$ LANGUAGE SQL;

-- Update only logo.
CREATE OR REPLACE FUNCTION update_institution_logo(_institution_id integer, _base64_image text)
 RETURNS integer AS $$

    UPDATE institutions
    SET logo_data = decode(_base64_image, 'base64')
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

-- Returns users assigned to project's plots
CREATE OR REPLACE FUNCTION select_assigned_users_by_project(_project_id INTEGER)
RETURNS TABLE (
        email text
) AS $$

   SELECT DISTINCT u.email
   FROM projects p
   INNER JOIN plots pl
        ON pl.project_rid = p.project_uid
   INNER JOIN plot_assignments pa
        ON pa.plot_rid = pl.plot_uid
   INNER JOIN users u
        ON u.user_uid = pa.user_rid
   WHERE p.project_uid = _project_id

$$ LANGUAGE SQL; 
  
-- Returns users by email in bulk

CREATE OR REPLACE FUNCTION get_users_by_emails(_emails text[])
 RETURNS table (
    user_id integer,
    email   text
 ) AS $$

    SELECT user_uid, email
    FROM users
    WHERE email = any(_emails)

$$ LANGUAGE SQL;

-- Accepts data sharing terms for guest users
CREATE OR REPLACE FUNCTION guest_user_data_sharing(_name TEXT, _ip TEXT)
 RETURNS table (
    user_name TEXT
 ) AS $$
    INSERT INTO data_sharing (interpreter_name, ip)
    VALUES (_name, _ip);
    SELECT _name;
$$ LANGUAGE SQL;


-- Accepts data sharing terms for regular user
CREATE OR REPLACE FUNCTION user_data_sharing(_project_id INTEGER, _user_id INTEGER, _name TEXT, _ip TEXT)
RETURNS TABLE (
    project_id INTEGER,
    user_id INTEGER,
    user_name TEXT
) AS $$

    INSERT INTO data_sharing (project_rid, interpreter_name, ip)
    VALUES (_project_id, _name, _ip);

    UPDATE users
    SET accepted_terms = TRUE
    WHERE user_uid = _user_id;

    SELECT _project_id, _user_id, _name;
$$ LANGUAGE SQL;
