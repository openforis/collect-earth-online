--
--  USER FUCNTIONS
--

-- Adds a new user to the database.
CREATE OR REPLACE FUNCTION add_user(_email text, _password text)
    RETURNS integer AS $$

	INSERT INTO users(email, password)
	VALUES (_email, _password)
	RETURNING id

$$ LANGUAGE SQL;

-- Adds a new user to the database (3 params for migration).
CREATE OR REPLACE FUNCTION add_user_migration(_user_id integer,_email text, _password text)
  RETURNS integer AS $$

	INSERT INTO users(id,email, password)
	VALUES (_user_id,_email, _password)
	RETURNING id

$$ LANGUAGE SQL;

-- Returns all of the user fields associated with the provided email.
CREATE OR REPLACE FUNCTION get_all_users()
 RETURNS TABLE(
        id              integer,
        email           text,
        administrator   boolean,
        reset_key       text
    ) AS $$

	SELECT id, email, administrator, reset_key
	FROM users
	WHERE email <> 'admin@openforis.org'
        AND email <> 'guest'

$$ LANGUAGE SQL;

-- Get all users by institution ID, includes role
CREATE OR REPLACE FUNCTION get_all_users_by_institution_id(_institution_id integer)
    RETURNS TABLE(
        id                  integer,
        email               text,
        administrator       boolean,
        reset_key           text,
        institution_role    text
    ) AS $$

	SELECT users.id, email, administrator, reset_key, title AS institution_role
	FROM get_all_users() AS users
	INNER JOIN institution_users ON users.id = institution_users.user_id
	INNER JOIN roles ON roles.id = institution_users.role_id
	WHERE institution_users.institution_id = _institution_id

$$ LANGUAGE SQL;

-- Returns all of the user fields associated with the provided email.
CREATE OR REPLACE FUNCTION get_user(_email text)
    RETURNS TABLE(
        id              integer,
        identity        text,
        password        text,
        administrator   boolean,
        reset_key       text
    ) AS $$

	SELECT id, email AS identity, password, administrator, reset_key
	FROM users
	WHERE email = _email

$$ LANGUAGE SQL;

-- Adds a new role to the database.
CREATE OR REPLACE FUNCTION insert_role(_title text)
    RETURNS integer AS $$

	INSERT INTO roles(title)
	VALUES (_title)
	RETURNING id

$$ LANGUAGE SQL;

-- Set user 1 as admin for migration
CREATE OR REPLACE FUNCTION set_admin()
  RETURNS void AS $$

	UPDATE users
	SET administrator = true
	WHERE id = 1

$$ LANGUAGE SQL;

-- Resets the email for the given user.
CREATE OR REPLACE FUNCTION set_user_email(_email text, _new_email text)
 RETURNS text AS $$

	UPDATE users
	SET email = _new_email
	WHERE email = _email
	RETURNING email;

$$ LANGUAGE SQL;

-- Resets the email for the given user.
CREATE OR REPLACE FUNCTION set_user_email_and_password(_user_id integer, _email text, _password text)
 RETURNS text AS $$

	UPDATE users
	SET email = _email, 
		password = _password
	WHERE id = _user_id
	RETURNING email;

$$ LANGUAGE SQL;

-- Sets the password reset key for the given user. If one already exists, it is replaced.
CREATE OR REPLACE FUNCTION set_password_reset_key(_email text, _reset_key text)
 RETURNS text AS $$

	UPDATE users
	SET reset_key = _reset_key
	WHERE email = _email
	RETURNING email;

$$ LANGUAGE SQL;

-- Sets the password reset key for the given user. If one already exists, it is replaced.
CREATE OR REPLACE FUNCTION update_password(_email text, _password text)
 RETURNS text AS $$

	UPDATE users
	SET password = _password, 
		reset_key = null
	WHERE email = _email
	RETURNING email;

$$ LANGUAGE SQL;

--
--  INSTITUTION FUNCTIONS
--

-- Return type for institution data
CREATE TYPE instituion_return AS (
      id            integer,
      name          text,
      logo          text,
      description   text,
      url           text,
      archived      boolean,
      members       jsonb,
      admins        jsonb,
      pending       jsonb
    );
    
-- Adds a new institution to the database.
CREATE OR REPLACE FUNCTION add_institution(_name text, _logo text, _description text, _url text, _archived boolean)
    RETURNS integer AS $$

	INSERT INTO institutions(name, logo, description, url, archived)
	VALUES (_name, _logo, _description, _url, _archived)
	RETURNING id

$$ LANGUAGE SQL;

-- Adds a new institution to the database(extra param for migration)
CREATE OR REPLACE FUNCTION add_institution_migration(_institution_id integer,_name text, _logo text, _description text, _url text, _archived boolean)
    RETURNS integer AS $$

	INSERT INTO institutions(id,name, logo, description, url, archived)
	VALUES (_institution_id,_name, _logo, _description, _url, _archived)
	RETURNING id

$$ LANGUAGE SQL;

-- Archive  institution
CREATE OR REPLACE FUNCTION archive_institution(_institution_id integer) 
    RETURNS integer AS $$

        UPDATE institutions
        SET archived = true
        WHERE id = _institution_id
        RETURNING id
		
$$ LANGUAGE SQL;

-- Returns all institutions
CREATE OR REPLACE FUNCTION select_all_institutions() 
    RETURNS setOf instituion_return AS $$

    WITH inst_roles as (
        SELECT user_id, title, institution_id
        FROM institution_users as iu
        LEFT JOIN roles
            ON roles.id = iu.role_id
    ),
    members as (
        SELECT jsonb_agg(user_id) as member_list, institution_id
        FROM inst_roles        
        WHERE title = 'member'
            OR title = 'admin'
        GROUP BY institution_id
    ),
    admins as (
        SELECT jsonb_agg(user_id) as admin_list, institution_id
        FROM inst_roles        
        WHERE title = 'admin'
        GROUP BY institution_id
    ),
    pending as (
        SELECT jsonb_agg(user_id) as pending_list, institution_id
        FROM inst_roles        
        WHERE title = 'pending'
        GROUP BY institution_id
    )
    
    SELECT i.id, i.name, i.logo, i.description, i.url, i.archived, 
        (CASE WHEN member_list IS NULL THEN '[]' ELSE member_list END), 
        (CASE WHEN admin_list IS NULL THEN '[]' ELSE admin_list END),
        (CASE WHEN pending_list IS NULL THEN '[]' ELSE pending_list END)
    FROM institutions as i
    LEFT JOIN members as m
        ON i.id = m.institution_id
    LEFT JOIN admins as a
        ON i.id = a.institution_id
    LEFT JOIN pending as p
        ON i.id = p.institution_id
    WHERE archived = false
    ORDER by id

$$ LANGUAGE SQL;

-- Returns one institution
CREATE OR REPLACE FUNCTION select_institution_by_id(_institution_id integer) 
    RETURNS setOf instituion_return AS $$

    SELECT * from select_all_institutions()
    WHERE id = _institution_id
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
	WHERE id = _institution_id
	RETURNING id

$$ LANGUAGE SQL;

-- update only logo.  Id is not know on during add_institution
CREATE OR REPLACE FUNCTION update_institution_logo(_id integer, _logo text)
    RETURNS integer AS $$

	UPDATE institutions
	SET logo = _logo 
	WHERE id = _id
	RETURNING institutions.id

$$ LANGUAGE SQL;

--
--     INSTITUTION USER FUNCTIONS 
--

-- Adds a new institution_user to the database.
CREATE OR REPLACE FUNCTION add_institution_user(_institution_id integer, _user_id integer, _role_id integer)
    RETURNS integer AS $$

	INSERT INTO institution_users(
	institution_id, user_id, role_id)
	VALUES (_institution_id, _user_id, _role_id)
	RETURNING id

$$ LANGUAGE SQL;

-- Adding a institution_user with role as text
CREATE OR REPLACE FUNCTION add_institution_user(_institution_id integer, _user_id integer, _role text)
    RETURNS integer AS $$

	INSERT INTO institution_users(
	institution_id, user_id, role_id)
	SELECT _institution_id, _user_id, tr.id
	FROM (SELECT id from roles where title = _role) AS tr
	RETURNING id

$$ LANGUAGE SQL;

-- Adds a returns institution user roles from the database.
CREATE OR REPLACE FUNCTION get_institution_user_roles(_user_id integer)
    RETURNS TABLE (
        institution_id  integer,
        role            text
		) AS $$

		SELECT institution_id, title AS role
		FROM institution_users AS iu
		INNER JOIN roles AS r
			ON iu.role_id = r.id
		WHERE iu.user_id = _user_id
        ORDER BY institution_id

$$ LANGUAGE SQL;

-- Remove user from instituion
CREATE OR REPLACE FUNCTION remove_institution_user_role(_institution_id integer, _user_id integer)
    RETURNS void AS $$

	DELETE FROM institution_users
	WHERE institution_id = _institution_id
		AND user_id = _user_id

$$ LANGUAGE SQL;

-- Update the role of the user in a given institution
CREATE OR REPLACE FUNCTION update_institution_user_role(_institution_id integer, _user_id integer, _role text)
    RETURNS integer AS $$

	UPDATE institution_users
	SET role_id = r.id
	FROM roles AS r
	WHERE institution_id = _institution_id
		AND user_id = _user_id
		AND title = _role
	RETURNING institution_users.id

$$ LANGUAGE SQL;

--
--  IMAGERY FUNCTIONS
--

CREATE TYPE imagery_return AS (
        id              integer,
        institution_id  integer,
        visibility      text,
        title           text,
        attribution     text,
        extent          jsonb,
        source_config   jsonb
    );

-- Adds institution imagery
CREATE OR REPLACE  FUNCTION add_institution_imagery(_institution_id integer, _visibility text, _title text, _attribution text, _extent jsonb, _source_config jsonb) 
    RETURNS integer AS $$

	INSERT INTO imagery (institution_id,visibility,title,attribution,extent,source_config)
	VALUES (_institution_id, _visibility, _title, _attribution, _extent, _source_config)
	RETURNING id

$$ LANGUAGE SQL;

-- Adds institution imagery(for migration script)
CREATE OR REPLACE  FUNCTION add_institution_imagery_migration(_imagery_id integer, _institution_id integer, _visibility text, _title text, _attribution text, _extent jsonb, _source_config jsonb) 
    RETURNS integer AS $$

	INSERT INTO imagery (id, institution_id, visibility, title, attribution, extent, source_config)
	VALUES (_imagery_id, _institution_id, _visibility, _title, _attribution, _extent, _source_config)
	RETURNING id

$$ LANGUAGE SQL;

-- Delete single imagery by id
CREATE OR REPLACE FUNCTION delete_imagery(_imagery_id integer)
    RETURNS integer AS $$

	DELETE FROM imagery
	WHERE id = _imagery_id
	RETURNING id

$$ LANGUAGE SQL;

-- Returns all rows in imagery for which visibility  =  "public".
CREATE OR REPLACE FUNCTION select_public_imagery() 
 RETURNS setOf imagery_return AS $$

    SELECT id, institution_id, visibility, title, attribution, extent, source_config
    FROM imagery
    WHERE visibility = 'public'

$$ LANGUAGE SQL;

-- Returns all rows in imagery for with an institution_id or public
CREATE OR REPLACE FUNCTION select_public_imagery_by_institution(_institution_id integer) 
  RETURNS setOf imagery_return AS $$

    WITH images as (
		SELECT * from select_public_imagery()
		UNION
		SELECT *
		FROM imagery
		WHERE institution_id = _institution_id
    )
    
    SELECT * from images 
    ORDER BY visibility DESC, id
    
$$ LANGUAGE SQL;

-- Updates imagery to the database.
CREATE OR REPLACE FUNCTION update_imagery(_id integer, _institution_id integer, _visibility text, _title text, _attribution text, _extent jsonb, _source_config jsonb )
    RETURNS integer AS $$

	UPDATE imagery
	SET institution_id=_institution_id, 
		visibility=_visibility, 
		title=_title, 
		attribution=_attribution, 
		extent=_extent, 
		source_config=_source_config
	WHERE id = _id
	RETURNING id

$$ LANGUAGE SQL;

--
--  WIDGET FUNCTIONS
--

-- Adds a project_widget to the database.
CREATE OR REPLACE FUNCTION add_project_widget(_project_id integer, _dashboard_id  uuid, _widget  jsonb)
    RETURNS integer AS $$

	INSERT INTO project_widgets(project_id, dashboard_id, widget)
	VALUES (_project_id, _dashboard_id , _widget)
	RETURNING id

$$ LANGUAGE SQL;

-- Deletes a delete_project_widget_by_widget_id from the database.
CREATE OR REPLACE FUNCTION delete_project_widget_by_widget_id(_id integer)
    RETURNS integer AS $$

	DELETE FROM project_widgets
	WHERE CAST(jsonb_extract_path_text(widget, 'id') as int) = _id
	RETURNING id

$$ LANGUAGE SQL;

-- Gets project_widgets_by_project_id returns a project_widgets from the database.
CREATE OR REPLACE FUNCTION get_project_widgets_by_project_id(_project_id integer)
    RETURNS TABLE(
        id              integer,
        project_id      integer,
        dashboard_id    uuid,
        widget          jsonb,
		project_title	text
    ) AS $$

	SELECT pw.*, p.name
	FROM project_widgets pw
	INNER JOIN projects p
		ON p.id = pw.project_id
	WHERE project_id = _project_id

$$ LANGUAGE SQL;

-- Updates a update_project_widget_by_widget_id from the database.
CREATE OR REPLACE FUNCTION update_project_widget_by_widget_id(_id integer, _dash_id uuid, _widget  jsonb)
    RETURNS integer AS $$

	UPDATE project_widgets
	SET widget = _widget
	WHERE CAST(jsonb_extract_path_text(widget, 'id') as int) = _id
	AND dashboard_id = _dash_id
	RETURNING id

$$ LANGUAGE SQL;

--
-- PROJECT FUNCTIONS
--

CREATE TYPE project_return AS (
      id                        integer,
      institution_id            integer,
      availability              text,
      name                      text,
      description               text,
      privacy_level             text,
      boundary                  text,
      base_map_source           text,
      plot_distribution         text,
      num_plots                 integer,
      plot_spacing              float,
      plot_shape                text,
      plot_size                 float,
      sample_distribution       text,
      samples_per_plot          integer,
      sample_resolution         float,
      sample_survey             jsonb,
      plots_csv_file            text,
      plots_shp_file            text,
      samples_csv_file          text,
      samples_shp_file          text,
      classification_times      jsonb,
      editable                  boolean
    );

-- Create a project
CREATE OR REPLACE FUNCTION create_project_migration(
        _id                         integer,
        _institution_id             integer,
        _availability               text,
        _name                       text,
        _description                text,
        _privacy_level              text,
        _boundary                   geometry,
        _base_map_source            text,
        _plot_distribution          text,
        _num_plots                  integer,
        _plot_spacing               float,
        _plot_shape                 text,
        _plot_size                  float,
        _sample_distribution        text,
        _samples_per_plot           integer,
        _sample_resolution          float,
        _sample_survey              jsonb,
        _plots_csv_file             text,
        _plots_shp_file             text,
        _samples_csv_file           text,
        _samples_shp_file           text,
        _classification_times       jsonb
	) RETURNS integer AS $$

    INSERT INTO projects (id, institution_id, availability, name, description, privacy_level, boundary, 
                            base_map_source, plot_distribution, num_plots, plot_spacing, plot_shape, plot_size,
                            sample_distribution, samples_per_plot,sample_resolution, sample_survey, 
                            plots_csv_file, plots_shp_file, samples_csv_file, samples_shp_file,
                            classification_times)
    VALUES (_id, _institution_id, _availability, _name, _description, _privacy_level, _boundary,
            _base_map_source, _plot_distribution, _num_plots, _plot_spacing, _plot_shape, _plot_size, 
            _sample_distribution, _samples_per_plot, _sample_resolution, _sample_survey, 
            _plots_csv_file, _plots_shp_file, _samples_csv_file, _samples_shp_file,
            _classification_times)
    RETURNING id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_project(
        _institution_id             integer,
        _availability               text,
        _name                       text,
        _description                text,
        _privacy_level              text,
        _boundary                   geometry,
        _base_map_source            text,
        _plot_distribution          text,
        _num_plots                  integer,
        _plot_spacing               float,
        _plot_shape                 text,
        _plot_size                  float,
        _sample_distribution        text,
        _samples_per_plot           integer,
        _sample_resolution          float,
        _sample_survey              jsonb,
        _plots_csv_file             text,
        _plots_shp_file             text,
        _samples_csv_file           text,
        _samples_shp_file           text,
        _classification_times       jsonb
	) RETURNS integer AS $$

    INSERT INTO projects (institution_id, availability, name, description, privacy_level, boundary, 
                            base_map_source, plot_distribution, num_plots, plot_spacing, plot_shape, plot_size,
                            sample_distribution, samples_per_plot,sample_resolution, sample_survey, 
                            plots_csv_file, plots_shp_file, samples_csv_file, samples_shp_file,
                            classification_times, created_date)
    VALUES (_institution_id, _availability, _name, _description, _privacy_level, _boundary,
            _base_map_source, _plot_distribution, _num_plots, _plot_spacing, _plot_shape, _plot_size, 
            _sample_distribution, _samples_per_plot, _sample_resolution, _sample_survey, 
            _plots_csv_file, _plots_shp_file, _samples_csv_file, _samples_shp_file,
            _classification_times, Now())
    RETURNING id

$$ LANGUAGE SQL;

-- Returns project aggregate data
CREATE OR REPLACE FUNCTION dump_project_plot_data(_project_id integer) 
    RETURNS TABLE (
           plot_id          integer,
           lon              float,
           lat              float,
           plot_shape       text,
           plot_size        float,
           user_id          integer,
           confidence       integer,
           flagged          boolean,
           --assigned         integer,
           sample_points    bigint,
           collection_time  timestamp,
           imagery_title    text,
           imagery_date     date,
           value            jsonb
    ) AS $$

    SELECT plots.id as plot_id,
           ST_X(center) AS lon,
           ST_Y(center) AS lat,
           plot_shape,
           plot_size,
           user_id,
           confidence,
           user_plots.flagged AS flagged,
           --assigned,
           count(point) AS sample_points,
           collection_time::timestamp,
           json_agg(title)::text AS imagery_title,
           imagery_date,
           json_agg(value)::jsonb
    FROM projects
    INNER JOIN plots
        ON plots.project_id = projects.id
    INNER JOIN user_plots
        ON user_plots.plot_id = plots.id
    INNER JOIN sample_values
        ON sample_values.user_plot_id = user_plots.id
    INNER JOIN samples
        ON samples.id = sample_values.sample_id
    INNER JOIN imagery
        ON imagery.id = sample_values.imagery_id
    WHERE projects.id = _project_id
    GROUP BY plots.id,center,plot_shape,plot_size,user_id,confidence,user_plots.flagged,collection_time,imagery_date --,assigned

$$ LANGUAGE SQL;

-- Returns project raw data
CREATE OR REPLACE FUNCTION dump_project_sample_data(_project_id integer) 
    RETURNS TABLE (
           plot_id          integer,
           sample_id        integer,
           lon              float,
           lat              float,
           email            text,
           confidence       integer,
           flagged          boolean,
           assigned         boolean,
           collection_time  timestamp,
           imagery_title    text,
           imagery_date     date,
           value            jsonb
    ) AS $$

    SELECT plots.id as plot_id,
           samples.id AS sample_id,
           ST_X(point) AS lon,
           ST_Y(point) AS lat,
           users.email,
           confidence,
           (CASE WHEN user_plots.flagged IS NULL THEN false ELSE user_plots.flagged END) AS flagged,
           (CASE WHEN user_plots.flagged IS NOT NULL AND user_plots.flagged = false THEN true ELSE false END) AS assigned,
           collection_time::timestamp,
           title AS imagery_title,
           imagery_date,
           value
    FROM projects
    INNER JOIN plots
        ON plots.project_id = projects.id
    INNER JOIN samples
        ON samples.plot_id = plots.id
    LEFT JOIN user_plots
        ON user_plots.plot_id = plots.id
    LEFT JOIN sample_values
        ON samples.id = sample_values.sample_id
    LEFT JOIN imagery
        ON imagery.id = sample_values.imagery_id
    LEFT JOIN users
        ON users.id = user_id
    WHERE projects.id = _project_id

$$ LANGUAGE SQL;

-- Returns a row in projects by id.
CREATE OR REPLACE FUNCTION select_project(_id integer) 
    RETURNS setOf project_return AS $$

    SELECT id,institution_id, availability, name, description,privacy_level,  ST_AsGeoJSON(boundary) as boundary, base_map_source,
        plot_distribution, num_plots, plot_spacing, plot_shape, plot_size, sample_distribution, samples_per_plot, sample_resolution,
        sample_survey, plots_csv_file, plots_shp_file, samples_csv_file, samples_csv_file, classification_times, false as editable
    FROM projects
    WHERE id = _id

$$ LANGUAGE SQL;

-- Returns all rows in projects for a user_id.
CREATE OR REPLACE FUNCTION select_all_projects() 
    RETURNS setOf project_return  AS $$

    SELECT id,institution_id, availability, name, description,privacy_level,  ST_AsGeoJSON(boundary) as boundary, base_map_source,
        plot_distribution, num_plots, plot_spacing, plot_shape, plot_size, sample_distribution, samples_per_plot, sample_resolution,
        sample_survey, plots_csv_file, plots_shp_file, samples_csv_file, samples_csv_file, classification_times, false AS editable
    FROM projects
    WHERE privacy_level  =  'public'
      AND availability  =  'published'
    ORDER BY id

$$ LANGUAGE SQL;

-- Returns all rows in projects for institution_id.
CREATE OR REPLACE FUNCTION select_all_institution_projects(_institution_id integer) 
    RETURNS setOf project_return AS $$

    SELECT *
    FROM select_all_projects()
    WHERE institution_id = _institution_id
    ORDER BY id

$$ LANGUAGE SQL;

-- Returns all rows in projects for a user_id with roles.
CREATE OR REPLACE FUNCTION select_all_user_projects(_user_id integer) 
    RETURNS setOf project_return AS $$

    WITH project_roles AS (
        SELECT *
        FROM projects
        LEFT JOIN get_institution_user_roles(_user_id) AS roles USING (institution_id)
    )
    SELECT p.id,p.institution_id,p.availability,p.name,p.description,p.privacy_level,ST_AsGeoJSON(p.boundary) as boundary,
        p.base_map_source,p.plot_distribution,p.num_plots,p.plot_spacing,p.plot_shape,p.plot_size,p.sample_distribution,
        p.samples_per_plot,p.sample_resolution,p.sample_survey,p.plots_csv_file, p.plots_shp_file, p.samples_csv_file, p.samples_csv_file,
        p.classification_times,true AS editable
    FROM project_roles as p
    WHERE role = 'admin'
    UNION
    SELECT p.id,p.institution_id,p.availability,p.name,p.description,p.privacy_level,ST_AsGeoJSON(p.boundary) as boundary,
        p.base_map_source,p.plot_distribution,p.num_plots,p.plot_spacing,p.plot_shape,p.plot_size,p.sample_distribution,
        p.samples_per_plot,p.sample_resolution,p.sample_survey,p.plots_csv_file, p.plots_shp_file, p.samples_csv_file, p.samples_csv_file,
        p.classification_times,false AS editable
    FROM project_roles as p
    WHERE role = 'member'
      AND p.privacy_level IN ('public','institution')
      AND p.availability  =  'published'
    UNION
    SELECT p.id,p.institution_id,p.availability,p.name,p.description,p.privacy_level,ST_AsGeoJSON(p.boundary) as boundary,
        p.base_map_source,p.plot_distribution,p.num_plots,p.plot_spacing,p.plot_shape,p.plot_size,p.sample_distribution,
        p.samples_per_plot,p.sample_resolution,p.sample_survey,p.plots_csv_file, p.plots_shp_file, p.samples_csv_file, p.samples_csv_file,
        p.classification_times,false AS editable
    FROM project_roles as p
    WHERE (role NOT IN ('admin','member') OR role IS NULL)
      AND p.privacy_level IN ('public','institution')
      AND p.availability  =  'published'
    ORDER BY id

$$ LANGUAGE SQL;

-- Returns all rows in projects for a user_id and institution_id with roles.
CREATE OR REPLACE FUNCTION select_institution_projects_with_roles( _user_id integer, _institution_id integer) 
    RETURNS setOf project_return AS $$

    SELECT *
    FROM select_all_user_projects(_user_id)
    WHERE institution_id = _institution_id
    ORDER BY id

$$ LANGUAGE SQL;

-- Returns project users (SQL helper functions)
CREATE OR REPLACE FUNCTION select_project_users(_project_id integer) 
    RETURNS TABLE (
        user_id integer
    ) AS $$

    WITH matching_projects AS(
        SELECT  *
        FROM projects
        WHERE id = _project_id
    ),
    matching_institutions AS(
        SELECT *
        FROM projects p
        INNER JOIN institutions i
            ON p.institution_id = i.id
        WHERE p.id = _project_id
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
    SELECT users.id
    FROM matching_projects
    CROSS JOIN users
    WHERE privacy_level = 'public'
    UNION ALL
    SELECT user_id
    FROM matching_institution_users
    WHERE  privacy_level = 'private'
      AND title = 'admin'
    UNION ALL
    SELECT user_id
    FROM matching_institution_users
    WHERE  privacy_level = 'institution'
      AND availability = 'published'
      AND title = 'member'

$$ LANGUAGE SQL;

-- Returns project statistics
-- FIXME in the future a plot could have both an assigned piece and a flagged piece
CREATE OR REPLACE FUNCTION select_project_statistics(_project_id integer) 
    RETURNS TABLE(
        flagged_plots       integer,
        assigned_plots      integer,
        unassigned_plots    integer,
        members             integer,
        contributors        integer,
		created_date        date,
  	    published_date        date,
        closed_date          date,
        archived_date        date
    ) AS $$

    WITH members AS(
        SELECT count(distinct user_id) as members
        FROM select_project_users(_project_id)
    ),
    plotsum AS (
        SELECT plot_id,
            sum(flagged::int) > 0 as flagged, 
            cast(count(user_id) as int)  > 0 and sum(flagged::int) = 0 as assigned
        FROM user_plots
        GROUP BY plot_id
    ),
    sums AS(
        SELECT MAX(prj.created_date) as created_date, 
			MAX(prj.published_date) as published_date, 
			MAX(prj.closed_date) as closed_date, 
			MAX(prj.archived_date) as archived_date,
			(CASE WHEN sum(ps.flagged::int) IS NULL THEN 0 ELSE sum(ps.flagged::int) END) as flagged, 
            (CASE WHEN sum(ps.assigned::int) IS NULL THEN 0 ELSE sum(ps.assigned::int) END) as assigned,
            count(distinct pl.id) as plots
        FROM projects prj
        INNER JOIN plots pl
          ON prj.id =  pl.project_id
        LEFT JOIN plotsum ps
          ON ps.plot_id = pl.id
        WHERE prj.id = _project_id  
    ),
    users_count as (
        SELECT COUNT (DISTINCT user_id) as users
        FROM projects prj
        INNER JOIN plots pl
          ON prj.id =  pl.project_id
            AND prj.id = _project_id
        LEFT JOIN user_plots up
          ON up.plot_id = pl.id
    )
    SELECT CAST(flagged AS int) AS flagged_plots,
           CAST(assigned AS int) assigned_plots,
           CAST(GREATEST(0,(plots-flagged-assigned)) as int) AS unassigned_plots,
           CAST(members AS int) AS members,
           CAST(users_count.users AS int) AS contributors,
           created_date, published_date, closed_date, archived_date
    FROM members, sums, users_count
$$ LANGUAGE SQL;

-- Upade data that requires the project number after a project is created
CREATE OR REPLACE FUNCTION update_project_files(
    _proj_id            integer,
    _plots_csv_file      text,
    _plots_shp_file      text,
    _samples_csv_file    text,
    _samples_shp_file    text,
    _boundary geometry(Polygon,4326)
    ) RETURNS integer AS $$

    UPDATE projects 
    SET plots_csv_file = _plots_csv_file,
        plots_shp_file = _plots_shp_file,
        samples_csv_file = _samples_csv_file,
        samples_shp_file = _samples_shp_file,
        boundary = _boundary
    WHERE id = _proj_id
    RETURNING id
$$ LANGUAGE SQL;

-- Publish project
CREATE OR REPLACE FUNCTION publish_project(_project_id integer) 
    RETURNS integer AS $$

	UPDATE projects
	SET availability = 'published',
		published_date = Now()
	WHERE id = _project_id
	RETURNING _project_id

$$ LANGUAGE SQL;

-- Close project
CREATE OR REPLACE FUNCTION close_project(_project_id integer) 
 RETURNS integer AS $$

	UPDATE projects
	SET availability = 'closed',
		closed_date = Now()
	WHERE id = _project_id
	RETURNING _project_id

$$ LANGUAGE SQL;

-- Archive project
CREATE OR REPLACE FUNCTION archive_project(_project_id integer) 
    RETURNS integer AS $$

	UPDATE projects
	SET availability = 'archived',
		archived_date = Now()
	WHERE id = _project_id
	RETURNING _project_id

$$ LANGUAGE SQL;

--
--  PLOT FUNCTIONS
--

CREATE TYPE plots_return  AS (
      id                integer,
      project_id        integer,
      center            text,
      flagged           integer,
      assigned          integer,
      username          text,
	  confidence        integer,
	  collection_time   timestamp,
      plotId            text,
      geom              text
    );

-- Create a single project plot
CREATE OR REPLACE FUNCTION create_project_plot(_project_id integer, _center geometry(Point,4326), _plotId text, _geom geometry(Polygon,4326)) 
    RETURNS integer AS $$

	INSERT INTO plots (project_id, center, plotId, geom)
	(SELECT _project_id, _center, _plotId, _geom)
	RETURNING id

$$ LANGUAGE SQL;

-- Flag plot
CREATE OR REPLACE FUNCTION flag_plot(_plot_id integer, _username text, _confidence integer) 
    RETURNS integer AS $$

    with user_id as (
		SELECT id FROM users WHERE email = _username
	)
	INSERT INTO user_plots (user_id, plot_id, flagged, confidence, collection_time)
	SELECT user_id.id, _plot_id, true, _confidence, Now()
	FROM user_id
	RETURNING _plot_id

$$ LANGUAGE SQL;

-- Select plots
-- FIXME when multiple users can be assigned to plots, returning a single username does not make sense
CREATE OR REPLACE FUNCTION select_all_project_plots(_project_id integer)
	RETURNS setOf plots_return AS $$

 WITH username AS (
        SELECT MAX(email) as email, plot_id 
        FROM users 
        INNER JOIN user_plots
            ON users.id = user_plots.user_id
		GROUP BY plot_id
    ),
    plotsum AS (
        SELECT cast(sum(case when flagged then 1 else 0 end) as int) as flagged, 
            cast(count(1) - sum(case when flagged then 1 else 0 end)  as int) as assigned, 
			MAX(confidence) as confidence,
			MAX(collection_time) as collection_time,
            plot_id
        FROM user_plots
        GROUP BY plot_id
    )
	SELECT plots.id as id, 
		project_id,
		ST_AsGeoJSON(center) as center, 
		(case when plotsum.flagged is null then 0 else plotsum.flagged end) as flagged,
		(case when plotsum.assigned is null then 0 else plotsum.assigned end) as assigned,
		(case when username.email is null then '' else username.email end) as username,
		plotsum.confidence,
		plotsum.collection_time,
		plots.plotId,
		ST_AsGeoJSON(geom) as geom
	FROM plots
	LEFT JOIN plotsum
		ON plots.id = plotsum.plot_id
	LEFT JOIN username
		ON plots.id = username.plot_id
    WHERE project_id = _project_id

$$ LANGUAGE SQL;

-- Select plots
-- FIXME when multiple users can be assigned to plots, returning a single username does not make sense
CREATE OR REPLACE FUNCTION select_project_plots(_project_id integer, _maximum integer) 
    RETURNS setOf plots_return AS $$

	SELECT all_plots.id, all_plots.project_id, all_plots.center, all_plots.flagged, all_plots.assigned, all_plots.username,
            all_plots.confidence, all_plots.collection_time, all_plots.plotId, all_plots.geom
     FROM (
		SELECT *,
			row_number() OVER(ORDER BY id) AS rows,
			count(*) OVER() as total_plots
		FROM select_all_project_plots(_project_id)
		WHERE project_id = _project_id
	) as all_plots
	WHERE all_plots.rows % 
		(CASE WHEN _maximum > all_plots.total_plots THEN 0.5 ELSE all_plots.total_plots / _maximum END) = 0
	LIMIT _maximum;

$$ LANGUAGE SQL;

-- Select singe plot
CREATE OR REPLACE FUNCTION select_single_plot(_plot_id integer) 
    RETURNS setOf plots_return AS $$

	SELECT * FROM select_all_plots()
	WHERE id = _plot_id

$$ LANGUAGE SQL;

-- Returns unanalyzed plots
CREATE OR REPLACE FUNCTION select_unassigned_plot(_project_id integer, _plot_id integer) 
    RETURNS setOf plots_return AS $$

    SELECT * from select_all_project_plots(_project_id) as spp
    WHERE spp.id <> _plot_id
    AND flagged = 0
    AND assigned = 0
    ORDER BY random()
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns unanalyzed plots by plot id
CREATE OR REPLACE FUNCTION select_unassigned_plots_by_plot_id(_project_id integer,_plot_id integer) 
    RETURNS setOf plots_return AS $$

    SELECT * from select_all_project_plots(_project_id) as spp
    WHERE spp.id = _plot_id
    AND flagged = 0
    AND assigned = 0

$$ LANGUAGE SQL;

--
--  SAMPLE FUNCTIONS
--

-- Create project plot sample
CREATE OR REPLACE FUNCTION create_project_plot_sample(_plot_id integer, _sample_point geometry(Point,4326), _sampleId text, _geom geometry(Polygon,4326)) 
    RETURNS integer AS $$

	INSERT INTO samples (plot_id, point, sampleId, geom)
	(SELECT _plot_id, _sample_point, _sampleId, _geom)
	RETURNING id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_plot_samples(_plot_id integer) 
    RETURNS TABLE (
      id            integer,
      point         text,
	  sampleId      text,
	  geom	        text,
      value         jsonb,
      imagery_id    integer,
	  imagery_date  date
    ) AS $$
    
    SELECT samples.id, ST_AsGeoJSON(point) as point, samples.sampleId, ST_AsGeoJSON(geom) as geom,
        (CASE WHEN sample_values.value IS NULL THEN '{}' ELSE sample_values.value END),
        sample_values.imagery_id, sample_values.imagery_date
    FROM samples
    LEFT JOIN sample_values
    ON samples.id = sample_values.sample_id
    WHERE samples.plot_id = _plot_id

$$ LANGUAGE SQL;

-- Add user sample value selections, includes two new fields unused (imagery_id and imagery_date)
CREATE OR REPLACE FUNCTION add_user_samples( 
        _project_id     integer, 
        _plot_id        integer,
        _user_id        integer, 
        _confidence     integer, 
        _samples        jsonb, 
        _imagery_id     integer, 
        _imagery_date   date
        ) 
    RETURNS integer AS $$

	WITH user_plot_table AS(
		INSERT INTO user_plots(user_id, plot_id, confidence, collection_time) 
            VALUES (_user_id, _plot_id, _confidence, Now())
		RETURNING id
	),
	sample_values AS (
		SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_samples)
	)

	INSERT INTO sample_values(user_plot_id, sample_id, imagery_id, imagery_date, value)

	(SELECT upt.id, sv.sample_id, _imagery_id, _imagery_date, sv.value
		FROM user_plot_table AS upt, samples AS s
			INNER JOIN sample_values as sv
				ON s.id = sv.sample_id
		WHERE s.plot_id = _plot_id)

	RETURNING sample_id

$$ LANGUAGE SQL;

-- Add user samples for migration (with add_user_plots)
CREATE OR REPLACE FUNCTION add_sample_values_migration(_user_plot_id integer, _sample_id integer, _value jsonb) 
    RETURNS integer AS $$

	INSERT INTO sample_values(user_plot_id, sample_id, value)
	VALUES ( _user_plot_id, _sample_id, _value)
	RETURNING id

$$ LANGUAGE SQL;

-- Add user plots for migration (with add_sample_values)
CREATE OR REPLACE FUNCTION add_user_plots_migration(_plot_id integer, _username text, _flagged boolean) 
    RETURNS integer AS $$

	with user_id as (
		SELECT id FROM users WHERE email = _username
	),
	guest_id as (
		SELECT id FROM users WHERE email = 'guest'
	)
	
	INSERT INTO user_plots(plot_id, flagged, user_id)
	(SELECT _plot_id, _flagged, (CASE WHEN user_id.id is NULL then guest_id.id ELSE user_id.id END)
	FROM user_id, guest_id)
	RETURNING id

$$ LANGUAGE SQL;

--
--  MAINT FUNCTIONS
--

-- Manually adding rows while specifying id will not update the sequence
-- Update the sequnce at the end of the migration
CREATE OR REPLACE FUNCTION update_sequence(_table text)
  RETURNS void AS $$

    BEGIN
    EXECUTE 
            'WITH nextval as (            
            SELECT MAX(id)+1 as nextval FROM ' 
            || quote_ident(_table) ||
            ')
            SELECT setval(pg_get_serial_sequence('''  
            || quote_ident(_table) || 
            ''', ''id''), nextval , false) FROM nextval';
    END

$$ LANGUAGE PLPGSQL;

CREATE or replace function read_json_file( _file_name text)
	RETURNS table (valuestr text) as $$
	
	BEGIN
		create temporary table temp_json (values text) on commit drop;
		EXECUTE 
		'copy temp_json from ''' || _file_name ||
		''' csv quote e''\x01'' delimiter e''\x02''';

		RETURN QUERY SELECT * from temp_json;
	END

$$ LANGUAGE PLPGSQL;

-- Add then entire json plots file directly
CREATE OR REPLACE FUNCTION add_plots_by_json(_project_id integer, _file_name text)
	RETURNS integer AS $$

	with jvalue as (
		select * 
		from (
            select json_array_elements(valuestr::json) as values
            from read_json_file(_file_name)
        ) a
	),
	plotrows as (
        SELECT *
        FROM
        jvalue s
        CROSS JOIN LATERAL
        json_to_record(s.values::json) as t(center text, flagged bool, "user" text, samples json, plotId text, geom text, collection_time timestamp)
	),
	plot_index as (
		SELECT create_project_plot(
                _project_id, ST_SetSRID(ST_GeomFromGeoJSON(center), 4326), 
                plotId, ST_Force2d(ST_SetSRID(ST_GeomFromGeoJSON(geom), 4326))
            ) as plot_id, 
			flagged,  "user" as useremail, samples
		FROM plotrows as p
		
	),
	plot_users as (
		SELECT (CASE WHEN useremail is null or useremail = 'null' then null else add_user_plots_migration(plot_id, useremail, flagged) end) as user_plot_id, 
			plot_id, useremail, samples
		FROM plot_index as p
	),
	sample_index as (
		select *,
			ST_SetSRID(ST_GeomFromGeoJSON(ss.point), 4326) as point,
			create_project_plot_sample(plot_id,ST_SetSRID(ST_GeomFromGeoJSON(ss.point), 4326), sampleId, ST_Force2d(ST_SetSRID(ST_GeomFromGeoJSON(geom), 4326))) as sample_id,
		ss.value as sample_value
		from plot_users as p
		CROSS JOIN LATERAL 
		json_array_elements(samples::json) as samples
		CROSS JOIN LATERAL
		json_to_record(value::json) as ss(id int, point text, value text, sampleId text, geom text)
	
	)	
	select COUNT((CASE WHEN user_plot_id IS NOT NULL THEN add_sample_values_migration(user_plot_id, sample_id, sample_value::jsonb) ELSE 1 END))::int from sample_index

	
$$ LANGUAGE SQL;