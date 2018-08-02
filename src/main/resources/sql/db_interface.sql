
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
--Returns project aggregate database
CREATE FUNCTION dump_project_aggregate_data(project_id integer) RETURNS TABLE
	(
	) AS $$
	SELECT plot_id,ST_X(center) AS center_lon,ST_Y(center) AS center_lat,
		   plot_size AS size_m, plot_shape AS shape, flagged, assigned, 
	       count(samples.id) AS sample_points, 
		   user_id AS user,
		   collection_time AS timestamp
	FROM projects 
	INNER JOIN plots
	  ON projects.id=plots.project_id
	INNER JOIN user_plots
	  ON user_plots.plot_id=plots.id
    INNER JOIN samples
	  ON samples.plot_id=plots.id
	WHERE project.id=project_id
	
$$ LANGUAGE $$