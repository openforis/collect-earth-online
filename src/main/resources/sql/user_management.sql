-- Adds a new role to the database.
CREATE OR REPLACE FUNCTION insert_role(_title text)
    RETURNS integer AS
    $$
        INSERT INTO roles(title)
        VALUES (_title)
        RETURNING id
    $$
LANGUAGE 'sql'

-- Adds a new user to the database.
CREATE OR REPLACE FUNCTION add_user(_email text, _password text, _role_id integer, _reset_key text)
    RETURNS integer AS
    $$
        INSERT INTO users(email, password, role_id, reset_key)
        VALUES (_email, _password, _role_id, _reset_key);
        RETURNING id
    $$
  LANGUAGE 'sql'

-- name: get-user-info-sql
-- Returns all of the user fields associated with the provided email.
CREATE OR REPLACE FUNCTION get_user(_email text)
    RETURNS TABLE(
        id integer,
        identity text,
        password text,
        role_id integer,
        reset_key text
    ) AS
    $$
        SELECT id, email AS identity, password, role, reset_key
        FROM users
        WHERE email = _email
    $$
  LANGUAGE 'sql'
-- name: set-user-email-sql
-- Resets the email for the given user.
CREATE OR REPLACE FUNCTION set_user_email(_email text, _new_email text)
RETURNS text AS
    $$
        UPDATE users
        SET email = _new_email
        WHERE email = _email
        RETURNING email;
    $$
  LANGUAGE 'sql'

-- Resets the password for the given user.
CREATE OR REPLACE FUNCTION set_user_email(_email text, _password text)
RETURNS text AS
    $$
        UPDATE users
        SET password = :password
        WHERE email = :email
        RETURNING email;
    $$
  LANGUAGE 'sql'

-- Sets the password reset key for the given user. If one already exists, it is replaced.
CREATE OR REPLACE FUNCTION set_password_reset_key(_email text, _reset_key text)
RETURNS text AS
    $$
        UPDATE users
        SET reset_key = _reset_key
        WHERE email = _email
        RETURNING email;
    $$
  LANGUAGE 'sql'

-- Adds a new institution to the database.
CREATE OR REPLACE FUNCTION add_institution(_name text, _logo text, _description text, _url text, _archived boolean)
    RETURNS integer AS
    $$
        INSERT INTO institutions(name, logo, description, url, archived))
        VALUES (_name, _logo, _description, _url, _archived);
        RETURNING id
    $$
  LANGUAGE 'sql'

-- Returns institution from the database.
CREATE OR REPLACE FUNCTION get_institution(_institution_id integer)
    RETURNS TABLE(
        id integer,
        name text,
        logo text,
        description text,
        url text,
        archived boolean
    )  AS
    $$
        SELECT *
        FROM institutions
        WHERE institution_id = _institution_id
    $$
  LANGUAGE 'sql'

-- Adds a returns institution user roles from the database.
CREATE OR REPLACE FUNCTION get_institution_user_roles(_user_id int)
    RETURNS TABLE(
        institution_id integer,
        institution text,
        role text) AS
        $$
            SELECT ti.id, ti.name, tr.title
            FROM institution_user ti_user
            INNER JOIN institutions ti
                ON ti_user.institution_id = ti.id
            INNER JOIN roles tr
                ON ti_user.role_id = tr.id
            WHERE ti_user.user_id = _user_id
        $$
  LANGUAGE 'sql'

-- Adds a update institution to the database.
CREATE OR REPLACE FUNCTION update_institution(_id integer, _name text, _logo text, _description text, _url text, _archived boolean)
    RETURNS integer AS
    $$
        UPDATE institutions
        SET name = _name, logo = _logo, description = _description, url = _url, archived = _archived
        WHERE id = _id;
        RETURNING id
    $$
  LANGUAGE 'sql'

-- Adds a new institution_user to the database.
CREATE OR REPLACE FUNCTION add_institution_user(_institution_id integer, _user_id integer, _role_id integer)
    RETURNS integer AS
    $$
        INSERT INTO institution_users(
	    institution_id, user_id, role_id)
	    VALUES (_institution_id, _user_id, _role_id);
        RETURNING id
    $$
  LANGUAGE 'sql'

-- name: update-institution-user
-- Adds a updates institution-user to the database.
CREATE OR REPLACE FUNCTION update_institution_user_role(_institution_id integer, _user_id integer, _role text)
    RETURNS integer  AS
    $$
        UPDATE institution_users
        SET role_id = tr.id
        FROM {SELECT id from roles where title = role} AS tr
        WHERE institution_id = _institution_id AND user_id = _user_id
        RETURNING id
    $$
  LANGUAGE 'sql'

-- name: update-imagery
--  updates imagery to the database.
CREATE OR REPLACE FUNCTION update_imagery(_id integer, _institution_id integer, _visibility text, _title text, _attribution text, _extent geometry, _source_config jsonb )
    RETURNS integer  AS
    $$
        UPDATE imagery
        SET institution_id=_institution_id, visibility=_visibility, title=_title, attribution=_attribution, extent=_extent, source_config=_source_config
        WHERE id = _id
        RETURNING id
    $$
  LANGUAGE 'sql'

--  deletes a delete_project_widget_by_widget_id from the database.
CREATE OR REPLACE FUNCTION delete_project_widget_by_widget_id(_id integer)
    RETURNS integer  AS
    $$
        DELETE FROM project_widgets
        WHERE id = _id
        RETURNING id
    $$
  LANGUAGE 'sql'

--  updates a update_project_widget_by_widget_id from the database.
CREATE OR REPLACE FUNCTION update_project_widget_by_widget_id(_id integer, _widget  jsonb)
    RETURNS integer  AS
    $$
        UPDATE project_widget
        SET widget = widget
        WHERE id = _id
        RETURNING id
    $$
  LANGUAGE 'sql'

-- name: add-institution
-- Adds a project_widget to the database.
CREATE OR REPLACE FUNCTION add_project_widget(_project_id integer, _dashboard_id  uuid, _widget  jsonb)
    RETURNS integer AS
    $$
        INSERT INTO project_widgets(project_id, dashboard_id, widget)
        VALUES (_project_id, _dashboard_id , _widget);
        RETURNING id
    $$
  LANGUAGE 'sql'

-- Gets project_widgets_by_project_id returns a project_widgets from the database.
CREATE OR REPLACE FUNCTION get_project_widgets_by_project_id(_project_id integer)
    RETURNS TABLE(
        id              integer,
        project_id      integer,
        dashboard_id    uuid,
        widget  jsonb
    )  AS
    $$
        SELECT *
        FROM project_widgets
        WHERE project_id = _project_id
    $$
  LANGUAGE 'sql'


-- Gets project_widgets_by_dashboard_id returns a project_widgets from the database.
CREATE OR REPLACE FUNCTION get_project_widgets_by_dashboard_id(_dashboard_id integer)
    RETURNS TABLE(
        id              integer,
        project_id      integer,
        dashboard_id    uuid,
        widget  jsonb
    )  AS
    $$
        SELECT *
        FROM project_widgets
        WHERE dashboard_id = _dashboard_id
    $$
  LANGUAGE 'sql'




