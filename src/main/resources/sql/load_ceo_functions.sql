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

-- name: set-user-email-sql
-- Resets the email for the given user.
CREATE OR REPLACE FUNCTION set_user_email_and_password(_email text, _new_email text, _password text)
RETURNS text AS
    $$
        UPDATE users
        SET email = _new_email, password = _password
        WHERE email = _email
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

-- Sets the password reset key for the given user. If one already exists, it is replaced.
CREATE OR REPLACE FUNCTION update_password(_email text, _password text, _reset_key text)
RETURNS text AS
    $$
        UPDATE users
        SET password = _password, reset_key = null
        WHERE email = _email
        RETURNING email;
    $$
  LANGUAGE 'sql'

-- Returns all of the user fields associated with the provided email.
CREATE OR REPLACE FUNCTION get_all_users()
    RETURNS TABLE(
        id integer,
        email text,
        role text,
        reset_key text
    ) AS
    $$
        SELECT id, email, role, reset_key
        FROM users
        WHERE email <> "admin@openforis.org"
    $$
  LANGUAGE 'sql'

CREATE OR REPLACE FUNCTION get_all_users_by_institution_id(_institution_id integer)
    RETURNS TABLE(
        id integer,
        email text,
        role text,
        reset_key text,
        institution_role text
    ) AS
    $$
        SELECT id, email, role, reset_key, title AS institution_role
        FROM get_all_users() AS users
        INNER JOIN institution_users ON users.id = institution_users.user_id
        INNER JOIN roles on roles.id = institution_users.role_id
        WHERE institution_users.institution_id = _institution_id
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

-- Adds imagery to the database.
CREATE FUNCTION insert_imagery(institution_id integer, visibility text, title text, attribution text, extent geometry(Polygon,4326), source_config jsonb) RETURNS integer AS $$
	INSERT INTO imagery (institution_id, visibility, title, attribution, extent,source_config)
	VALUES (institution_id, visibility, title, attribution, extent, source_config)
	RETURNING id
$$ LANGUAGE SQL;
  
  
-- Adds projects to the database.
CREATE FUNCTION insert_projects (institution_id integer, availability text, name text, description text, privacy_level text, boundary geometry(Polygon,4326), base_map_source text, plot_distribution text, num_plots integer,    plot_spacing float, plot_shape text, plot_size integer, sample_distribution text, samples_per_plot integer, sample_resolution float, sample_values jsonb, classification_start_date date, classification_end_date date, 		    classification_timestep integer) RETURNS integer AS $$
	INSERT INTO projects (institution_id, availability, name, description, privacy_level, boundary, base_map_source, plot_distribution, num_plots, plot_spacing, plot_shape, plot_size, sample_distribution, samples_per_plot,sample_resolution, sample_values, classification_start_date, classification_end_date, classification_timestep)
	VALUES (institution_id, availability, name, description,privacy_level, boundary,base_map_source, plot_distribution, num_plots, plot_spacing, plot_shape, plot_size, sample_distribution, samples_per_plot,
	sample_resolution, sample_values, classification_start_date, classification_end_date, classification_timestep)
	RETURNING id
$$ LANGUAGE SQL;

-- Adds plots to the database.
CREATE FUNCTION insert_plots(project_id integer, center geometry(Point,4326), flagged integer, assigned integer) RETURNS integer AS $$
	INSERT INTO plots (project_id, center, flagged, assigned)
	VALUES (project_id, center, flagged, assigned)
	RETURNING id
$$ LANGUAGE SQL;

-- Adds samples to the database.
CREATE FUNCTION insert_samples(plot_id integer, point geometry(Point,4326)) RETURNS integer AS $$
	INSERT INTO samples (plot_id, point)
	VALUES (plot_id, point)
	RETURNING id
$$ LANGUAGE SQL;

-- Adds user_plots to the database.
CREATE FUNCTION insert_user_plots(user_id integer, plot_id integer, flagged boolean, confidence integer, collection_time timestamp) RETURNS integer AS $$
	INSERT INTO user_plots (user_id, plot_id, flagged, confidence, collection_time)
	VALUES (user_id, plot_id, flagged, confidence, collection_time)
	RETURNING id
$$ LANGUAGE SQL;


-- Adds sample_values to the database.
CREATE FUNCTION insert_sample_values(user_plot_id integer, sample_id integer, imagery_id integer, imagery_date date, value jsonb) RETURNS integer AS $$
	INSERT INTO sample_values (user_plot_id, sample_id, imagery_id, imagery_date, value)
	VALUES (user_plot_id, sample_id, imagery_id, imagery_date, value)
	RETURNING id
$$ LANGUAGE SQL;

--Returns all rows in imagery for which visibility  =  "public".
CREATE FUNCTION select_public_imagery() RETURNS TABLE
	(
		id              integer,
		institution_id  integer,
		visibility      text,
		title           text,
		attribution     text,
		extent          geometry(Polygon,4326),
		source_config   jsonb	
	) AS $$
	SELECT * 
	FROM imagery 
	WHERE visibility = "public"
$$ LANGUAGE SQL;

--Returns all rows in imagery for with an institution_id.
CREATE FUNCTION select_institution_imagery(institution_id integer) RETURNS TABLE
	(
		id              integer,
		institution_id  integer,
		visibility      text,
		title           text,
		attribution     text,
		extent          geometry(Polygon,4326),
		source_config   jsonb	
	) AS $$
	SELECT * 
	FROM imagery 
	WHERE institution_id = institution_id
$$ LANGUAGE SQL;

--Returns a row in projects by id.
CREATE FUNCTION select_project(id integer) RETURNS TABLE
	(
	  id                        integer,
	  institution_id            integer,
	  availability              text,
	  name                      text,
	  description               text,
	  privacy_level             text,
	  boundary                  geometry(Polygon,4326),
	  base_map_source           text,
	  plot_distribution         text,
	  num_plots                 integer,
	  plot_spacing              float,
	  plot_shape                text,
	  plot_size                 integer,
	  sample_distribution       text,
	  samples_per_plot          integer,
	  sample_resolution         float,
	  sample_values             jsonb,
	  classification_start_date	date,
	  classification_end_date   date,
	  classification_timestep   integer
	) AS $$
	SELECT * 
	FROM projects 
	WHERE id = id
$$ LANGUAGE SQL;

--Returns all rows in projects for a user_id.
CREATE FUNCTION select_all_projects() RETURNS TABLE
	(
	  id                        integer,
	  institution_id            integer,
	  availability              text,
	  name                      text,
	  description               text,
	  privacy_level             text,
	  boundary                  geometry(Polygon,4326),
	  base_map_source           text,
	  plot_distribution         text,
	  num_plots                 integer,
	  plot_spacing              float,
	  plot_shape                text,
	  plot_size                 integer,
	  sample_distribution       text,
	  samples_per_plot          integer,
	  sample_resolution         float,
	  sample_values             jsonb,
	  classification_start_date	date,
	  classification_end_date   date,
	  classification_timestep   integer,
	  editable                  boolean
	) AS $$
	SELECT *, false AS editable
	FROM projects 
	WHERE archived  =  false
	  AND privacy_level  =  "public"
	  AND availability  =  "published"
$$ LANGUAGE SQL;

--Returns all rows in projects for a user_id and institution_id.
CREATE FUNCTION select_all_user_institution_projects(user_id integer,institution_id integer) RETURNS TABLE
	(
	  id                        integer,
	  institution_id            integer,
	  availability              text,
	  name                      text,
	  description               text,
	  privacy_level             text,
	  boundary                  geometry(Polygon,4326),
	  base_map_source           text,
	  plot_distribution         text,
	  num_plots                 integer,
	  plot_spacing              float,
	  plot_shape                text,
	  plot_size                 integer,
	  sample_distribution       text,
	  samples_per_plot          integer,
	  sample_resolution         float,
	  sample_values             jsonb,
	  classification_start_date	date,
	  classification_end_date   date,
	  classification_timestep   integer,
	  editable					boolean
	) AS $$
	SELECT * 
	FROM select_all_projects() 
	WHERE user_id = user_id 
	  AND institution_id = institution_id
$$ LANGUAGE SQL;

--Returns all rows in projects for a user_id with roles.
CREATE FUNCTION select_all_user_projects(user_id integer) RETURNS TABLE
	(
	  id                        integer,
	  institution_id            integer,
	  availability              text,
	  name                      text,
	  description               text,
	  privacy_level             text,
	  boundary                  geometry(Polygon,4326),
	  base_map_source           text,
	  plot_distribution         text,
	  num_plots                 integer,
	  plot_spacing              float,
	  plot_shape                text,
	  plot_size                 integer,
	  sample_distribution       text,
	  samples_per_plot          integer,
	  sample_resolution         float,
	  sample_values             jsonb,
	  classification_start_date	date,
	  classification_end_date   date,
	  classification_timestep   integer,
	  editable					boolean
	) AS $$
	WITH project_roles AS (	
		SELECT * 
		FROM projects 
		LEFT JOIN get_institution_user_roles(user_id) AS roles USING (institution_id)
		WHERE archived  =  false
	)
	SELECT *,true AS editable
	FROM project_roles,projects
	WHERE role = "admin" 
	  AND privacy_level IN ("public","private","institution")  
	  AND availability IN ("unpublished","published","closed")
    UNION ALL
	SELECT * ,false AS editable
	FROM project_roles,projects
	WHERE role = "member" 
	  AND privacy_level IN ("public","institution") 
	  AND availability  =  "published")
	UNION ALL
	SELECT *,false AS editable
	FROM project_roles,projects
	WHERE role NOT IN ("admin","member")
	  AND privacy_level IN ("public","institution") 
	  AND availability  =  "published")
    	  
$$ LANGUAGE SQL;


--Returns all rows in projects for a user_id and institution_id with roles.
CREATE FUNCTION select_institution_projects_with_roles(user_id integer,institution_id integer) RETURNS TABLE
	(
	  id                        integer,
	  institution_id            integer,
	  availability              text,
	  name                      text,
	  description               text,
	  privacy_level             text,
	  boundary                  geometry(Polygon,4326),
	  base_map_source           text,
	  plot_distribution         text,
	  num_plots                 integer,
	  plot_spacing              float,
	  plot_shape                text,
	  plot_size                 integer,
	  sample_distribution       text,
	  samples_per_plot          integer,
	  sample_resolution         float,
	  sample_values             jsonb,
	  classification_start_date	date,
	  classification_end_date   date,
	  classification_timestep   integer,
	  editable					boolean
	) AS $$
	SELECT * 
	FROM select_all_user_projects(user_id)
	WHERE institution_id = institution_id
$$ LANGUAGE SQL;

--Returns project plots with a max value.
CREATE FUNCTION select_project_plots(project_id integer,maximum integer) RETURNS TABLE
	(
	  id         integer,
	  project_id integer,
	  center     geometry(Point,4326),
	  flagged    integer,
	  assigned   integer
	) AS $$
	WITH project_plots AS (	
		SELECT *
		FROM plots
		WHERE project_id  =  project_id
        ),
		project_plots_filtered AS(
			SELECT *,count(id) AS num_plots,row_number() OVER (ORDER BY id) AS row_num
			FROM project_plots
			WHERE num_plots % row_num  =  0
	    )
	SELECT * 
	FROM project_plots_filtered  AS ppf
	RIGHT JOIN project_plots AS pp
	ON pp.id = ppf.id
	  AND num_plots < =  maximum
	  	
$$ LANGUAGE SQL;

--Returns project users
CREATE FUNCTION select_project_users(project_id integer) RETURNS TABLE
	(
		user_id integer
	) AS $$
	
	WITH matching_projects AS(
		SELECT  *
		FROM projects 
		WHERE id = project_id
	    ),
		matching_institutions AS(
			SELECT *
			FROM projects p
			INNER JOIN institutions i
			   ON p.institution_id = i.id
			WHERE p.id = project_id 
			   
		),
		matching_institution_users AS (
			SELECT *
			FROM matching_institutions mi
			INNER JOIN institution_users ui
				ON mi.institution_id = ui.institution_id
			INNER JOIN users u
				ON u.id = ui.user_id
			INNER JOIN roles r
			    ON r.id = ui.role_id
		)
	SELECT *
	FROM matching_projects
	WHERE archived = false
	UNION ALL
	SELECT users.id
	FROM matching_projects
	CROSS JOIN users
	WHERE privacy_level = "public"
	UNION ALL
	SELECT user_id
	FROM matching_institution_users
	WHERE  privacy_level = "private"
	  AND title = "admin"
	UNION ALL
	SELECT user_id
	FROM matching_institution_users
	WHERE  privacy_level = "institution"
	  AND availability = "published"
	  AND title = "member"
	
$$ LANGUAGE SQL;
	
--Returns project statistics
CREATE FUNCTION select_project_statistics(project_id integer) RETURNS TABLE
	(
		flagged_plots integer,
		assigned_plots integer,
		unassigned_plots integer,
		members integer,
		contributors integer
	) AS $$
	WITH members AS(
		SELECT *
		FROM select_project_users(project_id)
	),
		contributors AS(
			SELECT *
			FROM projects prj
			INNER JOIN plots pl
			  ON prj.id =  pl.project_id
			INNER JOIN user_plots up
			  ON up.plot_id = pl.id
			WHERE prj.id = project_id 
			  AND pl.flagged > 0
			  AND pl.assigned > 0
			 
	)
	SELECT count(flagged) AS flagged_plots,
		   count(assigned) AS assigned_plots,
		   max(0,(count(plot_id)-flagged_plots-assigned_plots)) AS assigned_plots,
		   count(members.user_id) AS members,
	       count(contributors.user_id) AS contributors
	FROM members, contributors	
$$ LANGUAGE SQL;

--Returns unanalyzed plots
CREATE FUNCTION select_unassigned_plot(project_id integer,plot_id integer) RETURNS TABLE
	(
		plot text
	) AS $$
	WITH unassigned_plots AS(
			SELECT *
			FROM projects prj
			INNER JOIN plots pl
			  ON prj.id =  pl.project_id
			WHERE prj.id = project_id 
			  AND pl.id <> plot_id	
	          AND flagged = 0 
              AND assigned = 0			  
	)
	SELECT plot_id
    FROM unassigned_plots
	ORDER BY plot_id 
	LIMIT 1
$$ LANGUAGE SQL;
--Returns unanalyzed plots by plot id
CREATE FUNCTION select_unassigned_plots_by_plot_id(project_id integer,plot_id integer) RETURNS TABLE
	(
		plot text
	) AS $$
	WITH matching_plots AS(
			SELECT *
			FROM projects prj
			INNER JOIN plots pl
			  ON prj.id =  pl.project_id
			WHERE prj.id = project_id 
			  AND pl.id=plot_id	 
	)
	SELECT plot_id
	FROM matching_plots
	WHERE flagged = 0 
      AND assigned = 0
$$ LANGUAGE SQL;


--Returns project raw data
CREATE FUNCTION dump_project_plot_data(project_id integer) RETURNS TABLE
	(
	       plot_id integer,
	       lon float,
	       lat float,
		   flagged integer, 
		   assigned integer, 
		   samples_id integer, 
		   user_id integer,
		   collection_time timestamp,
		   value jsonb
	) AS $$
	SELECT plot_id,ST_X(center) AS lon,ST_Y(center) AS lat,
		   flagged, assigned, 
		   samples.id AS sample_id, 
		   user_id AS user,
		   collection_time AS timestamp
		   value
	FROM projects 
	INNER JOIN plots
	  ON projects.id=plots.project_id
	INNER JOIN user_plots
	  ON user_plots.plot_id=plots.id
	INNER JOIN samples
	  ON samples.plot_id=plots.id
	WHERE project.id=project_id
$$ LANGUAGE SQL;

--Returns labels
CREATE FUNCTION get_project_sample_labels(project_id integer) RETURNS TABLE
	(
		sid integer,
		name text
	) AS $$
	SELECT (sample_values->>'id')::integer AS sid,sample_values->>'name' AS name
	FROM projects
	WHERE id = project_id
	ORDER BY sid
	
$$ LANGUAGE SQL;

--Publish project
CREATE FUNCTION publish_project(project_id integer) RETURNS integer AS $$
	UPDATE projects
	SET availability = "published"
	WHERE id = project_id
	RETURNING project_id
	
$$ LANGUAGE SQL;

--Close project
CREATE FUNCTION close_project(project_id integer) RETURNS integer AS $$
	UPDATE projects
	SET availability = "closed"
	WHERE id = project_id
	RETURNING project_id

$$ LANGUAGE SQL;

--Archive project
CREATE FUNCTION archive_project(project_id integer) RETURNS integer AS $$
	UPDATE projects
	SET availability = "archived"
	WHERE id = project_id
	RETURNING project_id

$$ LANGUAGE SQL;

--Flag plot
CREATE FUNCTION flag_plot(plot_id integer,user_id integer,collection_time timestamp) RETURNS integer AS $$
	UPDATE user_plots
	SET flagged = true
	  AND user_id = user_id
	  AND collection_time = collection_time
	WHERE plot_id = plot_id 
	RETURNING plot_id

$$ LANGUAGE SQL;