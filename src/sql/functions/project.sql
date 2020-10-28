-- NAMESPACE: project
-- REQUIRES: clear

--
--  READ EXTERNAL FILE FUNCTIONS
--

-- Select known columns from a shp or csv file
CREATE OR REPLACE FUNCTION select_partial_table_by_name(_table_name text)
 RETURNS TABLE (
    ext_id    integer,
    plotId    integer,
    center    geometry,
    geom      geometry
 ) AS $$

 DECLARE
    i integer;
 BEGIN
    IF _table_name IS NULL OR _table_name = '' THEN RETURN; END IF;
    EXECUTE 'SELECT * FROM information_schema.columns
                WHERE table_name = ''' || _table_name || ''' AND column_name = ''geom''';
    GET DIAGNOSTICS i = ROW_COUNT;
    IF i = 0
    THEN
        RETURN QUERY EXECUTE
            'SELECT gid, plotid::integer, ST_SetSRID(ST_MakePoint(lon, lat), 4326), ST_Centroid(NULL) as geom FROM ext_tables.' || _table_name;
    ELSE
        RETURN QUERY EXECUTE
            'SELECT gid, plotid::integer, ST_Centroid(ST_Force2D(geom)), ST_Force2D(geom) FROM ext_tables.' || _table_name;
    END IF;
 END

$$ LANGUAGE PLPGSQL;

-- Converts all columns (including uknown) to a single json column for processing
CREATE OR REPLACE FUNCTION select_json_table_by_name(_table_name text)
 RETURNS TABLE (
    ext_id      integer,
    rem_data    jsonb
 ) AS $$

 DECLARE
    i integer;
 BEGIN
    IF _table_name IS NULL OR _table_name = '' THEN RETURN; END IF;

    RETURN QUERY EXECUTE 'SELECT gid, row_to_json(p)::jsonb FROM ext_tables.' || _table_name || ' as p';
 END

$$ LANGUAGE PLPGSQL;

-- Select known columns from a shp or csv file
CREATE OR REPLACE FUNCTION select_partial_sample_table_by_name(_table_name text)
 RETURNS TABLE (
    ext_id      integer,
    plotId      integer,
    sampleId    integer,
    center      geometry,
    geom        geometry
 ) AS $$

 DECLARE
    i integer;
 BEGIN
    IF _table_name IS NULL OR _table_name = '' THEN RETURN; END IF;
    EXECUTE 'SELECT * FROM information_schema.columns
                    WHERE table_name = ''' || _table_name || ''' AND column_name = ''geom''';
    GET DIAGNOSTICS i = ROW_COUNT;
    IF i = 0
    THEN
        RETURN QUERY EXECUTE
            'SELECT gid, plotId::integer, sampleId::integer, ST_SetSRID(ST_MakePoint(lon, lat), 4326), ST_Centroid(NULL) as geom FROM ext_tables.' || _table_name;
    ELSE
        RETURN QUERY EXECUTE
            'SELECT gid, plotId::integer, sampleId::integer, ST_Centroid(ST_Force2D(geom)), ST_Force2D(geom) FROM ext_tables.' || _table_name;
    END IF;
 END

$$ LANGUAGE PLPGSQL;

-- Returns all headers without prior knowledge
CREATE OR REPLACE FUNCTION get_plot_headers(_project_id integer)
 RETURNS TABLE (column_names text) AS $$

 DECLARE
    _plots_ext_table text;
 BEGIN
    SELECT plots_ext_table INTO _plots_ext_table FROM projects WHERE project_uid = _project_id;

    IF _plots_ext_table IS NOT NULL THEN
        RETURN QUERY EXECUTE
        'SELECT column_name::text FROM information_schema.columns
            WHERE table_name = ''' || _plots_ext_table || '''';
    END IF;
 END

$$ LANGUAGE PLPGSQL;

-- Returns all headers without prior knowledge
CREATE OR REPLACE FUNCTION get_sample_headers(_project_id integer)
 RETURNS TABLE (column_names text) AS $$

 DECLARE
    _samples_ext_table text;
 BEGIN
    SELECT samples_ext_table INTO _samples_ext_table FROM projects WHERE project_uid = _project_id;

    IF _samples_ext_table IS NOT NULL THEN
        RETURN QUERY EXECUTE
        'SELECT column_name::text FROM information_schema.columns
        WHERE table_name = ''' || _samples_ext_table || '''';
    END IF;
 END

$$ LANGUAGE PLPGSQL;

--
--  WIDGET FUNCTIONS
--

-- Adds a project_widget to the database
CREATE OR REPLACE FUNCTION add_project_widget(_project_id integer, _dashboard_id uuid, _widget jsonb)
 RETURNS integer AS $$

    INSERT INTO project_widgets
        (project_rid, dashboard_id, widget)
    VALUES
        (_project_id, _dashboard_id , _widget)
    RETURNING widget_uid

$$ LANGUAGE SQL;

-- Deletes a project_widget from the database
CREATE OR REPLACE FUNCTION delete_project_widget_by_widget_id(_widget_uid integer, _dashboard_id uuid)
 RETURNS integer AS $$

    DELETE FROM project_widgets
    WHERE dashboard_id = _dashboard_id
        AND CAST(jsonb_extract_path_text(widget, 'id') as int) = _widget_uid
    RETURNING widget_uid

$$ LANGUAGE SQL;

-- Gets project widgets by project id from the database
CREATE OR REPLACE FUNCTION get_project_widgets_by_project_id(_project_id integer)
 RETURNS TABLE(
    widget_id        integer,
    project_id       integer,
    dashboard_id     uuid,
    widget           jsonb,
    project_title    text
 ) AS $$

    SELECT pw.*, p.name
    FROM project_widgets pw
    INNER JOIN projects p
        ON project_uid = project_rid
    WHERE project_rid = _project_id

$$ LANGUAGE SQL;

-- Updates a project_widget from the database
CREATE OR REPLACE FUNCTION update_project_widget_by_widget_id(_widget_uid integer, _dash_id uuid, _widget jsonb)
 RETURNS integer AS $$

    UPDATE project_widgets
    SET widget = _widget
    WHERE CAST(jsonb_extract_path_text(widget, 'id') as int) = _widget_uid
        AND dashboard_id = _dash_id
    RETURNING widget_uid

$$ LANGUAGE SQL;

--
--  MODIFY PROJECT FUNCTIONS
--

-- Create a project
CREATE OR REPLACE FUNCTION create_project(
    _institution_id         integer,
    _name                   text,
    _description            text,
    _privacy_level          text,
    _imagery_id             integer,
    _boundary               jsonb,
    _plot_distribution      text,
    _num_plots              integer,
    _plot_spacing           float,
    _plot_shape             text,
    _plot_size              float,
    _sample_distribution    text,
    _samples_per_plot       integer,
    _sample_resolution      float,
    _allow_drawn_samples    boolean,
    _survey_questions       jsonb,
    _survey_rules           jsonb,
    _token_key              text,
    _options                jsonb
 ) RETURNS integer AS $$

    INSERT INTO projects (
        institution_rid,
        availability,
        name,
        description,
        privacy_level,
        imagery_rid,
        boundary,
        plot_distribution,
        num_plots,
        plot_spacing,
        plot_shape,
        plot_size,
        sample_distribution,
        samples_per_plot,
        sample_resolution,
        allow_drawn_samples,
        survey_questions,
        survey_rules,
        created_date,
        token_key,
        options
    ) VALUES (
        _institution_id,
        'unpublished',
        _name,
        _description,
        _privacy_level,
        _imagery_id,
        ST_SetSRID(ST_GeomFromGeoJSON(_boundary), 4326),
        _plot_distribution,
        _num_plots,
        _plot_spacing,
        _plot_shape,
        _plot_size,
        _sample_distribution,
        _samples_per_plot,
        _sample_resolution,
        _allow_drawn_samples,
        _survey_questions,
        _survey_rules,
        now(),
        _token_key,
        _options
    )
    RETURNING project_uid

$$ LANGUAGE SQL;

-- Publish project
CREATE OR REPLACE FUNCTION publish_project(_project_id integer)
 RETURNS integer AS $$

    UPDATE projects
    SET availability = 'published',
        published_date = Now()
    WHERE project_uid = _project_id
    RETURNING _project_id

$$ LANGUAGE SQL;

-- Close project
CREATE OR REPLACE FUNCTION close_project(_project_id integer)
 RETURNS integer AS $$

    UPDATE projects
    SET availability = 'closed',
        closed_date = Now()
    WHERE project_uid = _project_id
    RETURNING _project_id

$$ LANGUAGE SQL;

-- Archive project
CREATE OR REPLACE FUNCTION archive_project(_project_id integer)
 RETURNS integer AS $$

    UPDATE projects
    SET availability = 'archived',
        archived_date = Now()
    WHERE project_uid = _project_id
    RETURNING _project_id

$$ LANGUAGE SQL;

-- Delete project and external file
CREATE OR REPLACE FUNCTION delete_project(_project_id integer)
 RETURNS void AS $$

 BEGIN
    DELETE FROM plots
    WHERE plot_uid IN (
        SELECT plot_uid
        FROM projects
        INNER JOIN plots
            ON project_uid = project_rid
            AND project_uid = _project_id
    );

    DELETE FROM projects WHERE project_uid = _project_id;

    EXECUTE
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_id || '_plots_csv;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_id || '_plots_shp;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_id || '_samples_csv;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_id || '_samples_shp;';
 END

$$ LANGUAGE PLPGSQL;

-- Update select set of project fields
CREATE OR REPLACE FUNCTION update_project(
    _project_id             integer,
    _name                   text,
    _description            text,
    _privacy_level          text,
    _imagery_id             integer,
    _survey_questions       jsonb,
    _survey_rules           jsonb,
    _options                jsonb
 ) RETURNS void AS $$

    UPDATE projects
    SET name = _name,
        description = _description,
        privacy_level = _privacy_level,
        imagery_rid = _imagery_id,
        survey_questions = _survey_questions,
        survey_rules = _survey_rules,
        options = _options
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

 ) RETURNS void AS $$

    UPDATE projects
    SET name = _name,
        description = _description,
        privacy_level = _privacy_level,
        imagery_rid = _imagery_id,
        options = _options
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- Update counts after plots are created
CREATE OR REPLACE FUNCTION update_project_counts(_project_id integer)
 RETURNS void AS $$

    WITH project_plots AS (
        SELECT project_uid, plot_uid, sample_uid
        FROM projects p
        INNER JOIN plots pl
            ON pl.project_rid = project_uid
        INNER JOIN samples s
            ON plot_uid = s.plot_rid
        WHERE project_uid = _project_id
    )

    UPDATE projects
    SET num_plots = plots,
        samples_per_plot = samples
    FROM (
        SELECT COUNT(DISTINCT plot_uid) as plots,
            (CASE WHEN COUNT(DISTINCT plot_uid) = 0 THEN
                0
            ELSE
                COUNT(sample_uid) / COUNT(DISTINCT plot_uid)
            END) as samples
        FROM project_plots
    ) a
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- CSV REQUIRED FUNCTIONS

-- Create empty table before loading csv
CREATE OR REPLACE FUNCTION create_new_table(_table_name text, _cols text)
 RETURNS void AS $$

 DECLARE
    iter text;
 BEGIN
    EXECUTE 'CREATE TABLE ext_tables.' || _table_name || '()';

    FOREACH iter IN ARRAY string_to_array(_cols, ',')
    LOOP
        EXECUTE format('ALTER TABLE ext_tables.' || _table_name || ' add column %s;', iter);
    END LOOP;

 END

$$ LANGUAGE PLPGSQL;

-- Add index to csv file for reference later
CREATE OR REPLACE FUNCTION add_index_col(_table_name text)
 RETURNS void AS $$

 BEGIN
    EXECUTE 'ALTER TABLE ext_tables.' || _table_name || ' ADD COLUMN gid serial primary key';
 END

$$ LANGUAGE PLPGSQL;

--  CLEAN UP FUNCTIONS

-- Delete duplicates after loading
CREATE OR REPLACE FUNCTION delete_duplicates(_table_name text, _on_cols text)
 RETURNS void AS $$

 BEGIN
    IF _table_name IS NULL OR _table_name = '' THEN RETURN; END IF;

    EXECUTE
        'WITH duplicates AS (
            SELECT * FROM
                (SELECT *, COUNT(*) OVER
                    (PARTITION BY ' || _on_cols || ') as xx_count
            FROM ext_tables.' || _table_name || ') tableWithCount
            WHERE tableWithCount.xx_count > 1
        )

        DELETE FROM ext_tables.' || _table_name || ' WHERE gid IN
        (SELECT DISTINCT ON (' || _on_cols || ') gid FROM duplicates)';
 END

$$ LANGUAGE PLPGSQL;

-- Calculates boundary from for csv data
CREATE OR REPLACE FUNCTION csv_boundary(_project_id integer, _m_buffer real)
 RETURNS void AS $$

    UPDATE projects SET boundary = b
    FROM (
        SELECT ST_Envelope(ST_Buffer(ST_SetSRID(ST_Extent(center) , 4326)::geography , _m_buffer)::geometry) as b
        FROM select_partial_table_by_name((
            SELECT plots_ext_table
            FROM projects
            WHERE project_uid = _project_id
    ))) bb
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- Calculates boundary from shp file using geometry. Padding not needed.
CREATE OR REPLACE FUNCTION shp_boundary(_project_id integer)
 RETURNS void AS $$

    UPDATE projects SET boundary = b
    FROM (
        SELECT ST_SetSRID(ST_Extent(geom), 4326) AS b
        FROM select_partial_table_by_name((
            SELECT plots_ext_table
            FROM projects
            WHERE project_uid = _project_id
    ))) bb
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- Runs a few functions after data has been uploaded
CREATE OR REPLACE FUNCTION cleanup_project_tables(_project_id integer, _m_buffer real)
 RETURNS void AS $$

    DECLARE
        _plots_ext_table text;
        _samples_ext_table text;
    BEGIN
        SELECT plots_ext_table INTO _plots_ext_table FROM projects WHERE project_uid = _project_id;
        SELECT samples_ext_table INTO _samples_ext_table FROM projects WHERE project_uid = _project_id;

        IF _plots_ext_table SIMILAR TO '%(_csv)' THEN
            PERFORM csv_boundary(_project_id, _m_buffer);
        ELSIF _plots_ext_table SIMILAR TO '%(_shp)' THEN
            PERFORM shp_boundary(_project_id);
        END IF;

        -- TODO consider rejecting files with duplicate data
        PERFORM delete_duplicates(_plots_ext_table, 'plotid');
        PERFORM delete_duplicates(_samples_ext_table, 'plotid, sampleid');
    END

$$ LANGUAGE PLPGSQL;

-- Add plots from file
CREATE OR REPLACE FUNCTION add_file_plots(_project_id integer)
 RETURNS TABLE (
    plot_uid    integer,
    plotid      integer,
    lon         double precision,
    lat         double precision
 ) AS $$

    WITH plot_tbl AS (
        SELECT * FROM select_partial_table_by_name((
            SELECT plots_ext_table
            FROM projects
            WHERE project_uid = _project_id
    ))), plotrows AS (
        INSERT INTO plots (project_rid, center, ext_id)
        SELECT _project_id, center, ext_id
        FROM plot_tbl
        RETURNING plot_uid, ext_id, center
    )

    SELECT plot_uid, plotid, ST_X(plotrows.center), ST_Y(plotrows.center)
    FROM plotrows
    INNER JOIN plot_tbl
        ON plotrows.ext_id = plot_tbl.ext_id

$$ LANGUAGE SQL;

-- Add samples from file assuming plot data will also come from a file
CREATE OR REPLACE FUNCTION samples_from_plots_with_files(_project_id integer)
 RETURNS integer AS $$

    WITH sample_tbl AS (
        SELECT * FROM select_partial_table_by_name((
            SELECT samples_ext_table
            FROM projects
            WHERE project_uid = _project_id
        )) as st
        INNER JOIN add_file_plots(_project_id) asp
            ON asp.plotId = st.plotId
    ), samplerows AS (
        INSERT INTO samples (plot_rid, sample_geom, ext_id)
        SELECT plot_uid, center as sample_geom, ext_id
        FROM sample_tbl
        RETURNING sample_uid, ext_id, sample_geom
    )

    SELECT COUNT(*)::integer
    FROM samplerows
    INNER JOIN sample_tbl
        ON samplerows.ext_id = sample_tbl.ext_id

$$ LANGUAGE SQL;

-- Update tables for external data after project is created
CREATE OR REPLACE FUNCTION update_project_tables(
    _project_id           integer,
    _plots_ext_table      text,
    _samples_ext_table    text
 ) RETURNS void AS $$

    UPDATE projects
    SET plots_ext_table = _plots_ext_table,
        samples_ext_table = _samples_ext_table
    WHERE project_uid = _project_id;

$$ LANGUAGE SQL;

-- TEMPLATE RELATED

-- Copy the tables related to file data if they exist and update the projects table
CREATE OR REPLACE FUNCTION copy_file_tables(_old_project_uid integer, _new_project_uid integer)
 RETURNS VOID AS $$

 DECLARE
    _plots_ext_table text;
    _samples_ext_table text;
    _plots_ext_table_new text;
    _samples_ext_table_new text;
 BEGIN
    SELECT plots_ext_table INTO _plots_ext_table FROM projects WHERE project_uid = _old_project_uid;
    SELECT samples_ext_table INTO _samples_ext_table FROM projects WHERE project_uid = _old_project_uid;

    IF _plots_ext_table IS NOT NULL AND _plots_ext_table <> '' THEN
        EXECUTE
            'SELECT regexp_replace(''' || _plots_ext_table || ''', ''(\d+)'', ''' || _new_project_uid || ''')'
                INTO _plots_ext_table_new;
        EXECUTE 'CREATE TABLE ext_tables.' || _plots_ext_table_new || ' AS SELECT * FROM ext_tables.' || _plots_ext_table;
        EXECUTE 'UPDATE projects SET plots_ext_table = ''' || _plots_ext_table_new || ''' WHERE project_uid = ' || _new_project_uid;
    END IF;
    IF _samples_ext_table IS NOT NULL AND _samples_ext_table <> '' THEN
        EXECUTE 'SELECT regexp_replace(''' || _samples_ext_table || ''', ''(\d+)'', ''' || _new_project_uid || ''')'
            INTO _samples_ext_table_new;
        EXECUTE 'CREATE TABLE ext_tables.' || _samples_ext_table_new || ' AS SELECT * FROM ext_tables.' || _samples_ext_table;
        EXECUTE 'UPDATE projects SET samples_ext_table = ''' || _samples_ext_table_new || ''' WHERE project_uid = ' || _new_project_uid;
    END IF;
 END

$$ LANGUAGE PLPGSQL;

-- Copy plot data and sample data
CREATE OR REPLACE FUNCTION copy_project_plots_samples(_old_project_uid integer, _new_project_uid integer)
 RETURNS integer AS $$

    WITH project_plots AS (
        SELECT center, ext_id, plot_uid as plid_old, row_number() OVER(order by plot_uid) as rowid
        FROM projects p
        INNER JOIN plots pl
            ON project_rid = project_uid
            AND project_rid = _old_project_uid
    ), inserting AS (
        INSERT INTO plots (project_rid, center, ext_id)
        SELECT _new_project_uid, center, ext_id
        FROM project_plots
        RETURNING plot_uid as plid
    ), new_ordered AS (
        SELECT plid, row_number() OVER(order by plid) as rowid FROM inserting
    ), combined AS (
        SELECT * from new_ordered inner join project_plots USING (rowid)
    ), inserting_samples AS (
        INSERT INTO samples (plot_rid, sample_geom, ext_id)
        SELECT plid, sample_geom, ext_id
        FROM (
            SELECT plid, sample_geom, s.ext_id
            FROM combined c
            INNER JOIN samples s
                ON c.plid_old = s.plot_rid
        ) B
        RETURNING sample_uid
    )

    SELECT COUNT(1)::int FROM inserting_samples

$$ LANGUAGE SQL;

-- Copy other project fields that may not have been correctly passed from UI
CREATE OR REPLACE FUNCTION copy_project_plots_stats(_old_project_uid integer, _new_project_uid integer)
 RETURNS void AS $$

    UPDATE projects
    SET boundary = n.boundary,
        imagery_rid = n.imagery_rid,
        plot_distribution = n.plot_distribution,
        num_plots = n.num_plots,
        plot_spacing = n.plot_spacing,
        plot_shape = n.plot_shape,
        plot_size = n.plot_size,
        sample_distribution = n.sample_distribution,
        samples_per_plot = n.samples_per_plot,
        sample_resolution = n.sample_resolution
    FROM (SELECT
            boundary,             imagery_rid,
            plot_distribution,    num_plots,
            plot_spacing,         plot_shape,
            plot_size,            sample_distribution,
            samples_per_plot,     sample_resolution
         FROM projects
         WHERE project_uid = _old_project_uid) n
    WHERE
        project_uid = _new_project_uid

$$ LANGUAGE SQL;

-- Combines individual functions needed to copy all plot and sample information
CREATE OR REPLACE FUNCTION copy_template_plots(_old_project_uid integer, _new_project_uid integer)
 RETURNS VOID AS $$

    SELECT * FROM copy_project_plots_samples(_old_project_uid, _new_project_uid);
    SELECT * FROM copy_file_tables(_old_project_uid, _new_project_uid);
    SELECT * FROM copy_project_plots_stats(_old_project_uid, _new_project_uid);

$$ LANGUAGE SQL;

-- VALIDATIONS

-- Check if a project was created where plots have no samples
-- This only checks plots with external data. It asssumes that auto generated samples generate correctly
CREATE OR REPLACE FUNCTION plots_missing_samples(_project_id integer)
 RETURNS TABLE (plot_id integer) AS $$

    WITH plot_tbl AS (
        SELECT * FROM select_partial_table_by_name((
            SELECT plots_ext_table
            FROM projects
            WHERE project_uid = _project_id
    )))

    SELECT plotid
    FROM projects p
    INNER JOIN plots pl
        ON pl.project_rid = project_uid
    INNER JOIN plot_tbl
        ON pl.ext_id = plot_tbl.ext_id
    LEFT JOIN samples s
        ON plot_uid = s.plot_rid
    WHERE project_uid = _project_id
        AND sample_uid IS NULL

$$ LANGUAGE SQL;

-- Return table sizes for shp and csv to check against limits
CREATE OR REPLACE FUNCTION ext_table_count(_project_id integer)
 RETURNS TABLE(plot_count integer, sample_count integer) AS $$

    DECLARE
        _plots_ext_table text;
        _samples_ext_table text;
        _plots_count integer;
        _samples_count integer;
    BEGIN
        SELECT plots_ext_table INTO _plots_ext_table FROM projects WHERE project_uid = _project_id;
        SELECT samples_ext_table INTO _samples_ext_table FROM projects WHERE project_uid = _project_id;

        IF _plots_ext_table = '' OR _plots_ext_table IS NULL THEN
            _plots_count = 0;
        ELSE
            EXECUTE 'SELECT COUNT(1)::int FROM ext_tables.' || _plots_ext_table INTO _plots_count;
        END IF;

        IF _samples_ext_table = '' OR _samples_ext_table IS NULL THEN
            _samples_count = 0;
        ELSE
            EXECUTE 'SELECT COUNT(1)::int FROM ext_tables.' || _samples_ext_table INTO _samples_count;
        END IF;

        RETURN QUERY SELECT _plots_count, _samples_count;
    END

$$ LANGUAGE PLPGSQL;

--
-- USING PROJECT FUNCTIONS
--

CREATE OR REPLACE FUNCTION valid_boundary(_boundary geometry)
 RETURNS boolean AS $$

    SELECT EXISTS(
        SELECT 1
        WHERE ST_IsValid(_boundary)
            AND NOT (ST_XMax(_boundary) > 180
                OR ST_XMin(_boundary) < -180
                OR ST_YMax(_boundary) > 90
                OR ST_YMin(_boundary) < -90
                OR ST_XMax(_boundary) <= ST_XMin(_boundary)
                OR ST_YMax(_boundary) <= ST_YMin(_boundary))
    )

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION valid_project_boundary(_project_id integer)
 RETURNS boolean AS $$

    SELECT * FROM valid_boundary((SELECT boundary FROM projects WHERE project_uid = _project_id))

$$ LANGUAGE SQL;

CREATE VIEW project_boundary AS
 SELECT
    project_uid,
    institution_rid,
    imagery_rid,
    availability,
    name,
    description,
    privacy_level,
    ST_AsGeoJSON(boundary),
    plot_distribution,
    num_plots,
    plot_spacing,
    plot_shape,
    plot_size,
    sample_distribution,
    samples_per_plot,
    sample_resolution,
    allow_drawn_samples,
    survey_questions,
    survey_rules,
    classification_times,
    valid_boundary(boundary),
    token_key,
    options
FROM projects;

-- Returns a row in projects by id
CREATE OR REPLACE FUNCTION select_project_by_id(_project_id integer)
 RETURNS TABLE (
    project_id             integer,
    institution_id         integer,
    imagery_id             integer,
    availability           text,
    name                   text,
    description            text,
    privacy_level          text,
    boundary               text,
    plot_distribution      text,
    num_plots              integer,
    plot_spacing           real,
    plot_shape             text,
    plot_size              real,
    sample_distribution    text,
    samples_per_plot       integer,
    sample_resolution      real,
    allow_drawn_samples    boolean,
    survey_questions       jsonb,
    survey_rules           jsonb,
    options                jsonb,
    created_date           date,
    published_date         date,
    closed_date            date,
    token_key              text
 ) AS $$

    SELECT project_uid,
        institution_rid,
        imagery_rid,
        availability,
        name,
        description,
        privacy_level,
        ST_AsGeoJSON(boundary),
        plot_distribution,
        num_plots,
        plot_spacing,
        plot_shape,
        plot_size,
        sample_distribution,
        samples_per_plot,
        sample_resolution,
        allow_drawn_samples,
        survey_questions,
        survey_rules,
        options,
        created_date,
        published_date,
        closed_date,
        token_key
    FROM projects
    WHERE project_uid = _project_id

$$ LANGUAGE SQL;

-- FIXME this list does not need to contain all fields in project_boundary
-- FIXME Rename to select_public_projects()
-- FIXME this may not be needed, passing -1 to select_all_user_projects should give the same results (test performance)
-- Returns all public projects
CREATE OR REPLACE FUNCTION select_all_projects()
 RETURNS setOf project_return AS $$

    SELECT *, FALSE AS editable
    FROM project_boundary
    WHERE privacy_level = 'public'
      AND availability = 'published'
    ORDER BY project_uid

$$ LANGUAGE SQL;

-- Returns projects for institution_rid
CREATE OR REPLACE FUNCTION select_all_institution_projects(_institution_id integer)
 RETURNS setOf project_return AS $$

    SELECT *
    FROM select_all_projects()
    WHERE institution_id = _institution_id
    ORDER BY project_id

$$ LANGUAGE SQL;

-- Returns institution user roles from the database
CREATE OR REPLACE FUNCTION get_institution_user_roles(_user_id integer)
 RETURNS TABLE (
    institution_rid    integer,
    role               text
 ) AS $$

    SELECT institution_rid, title
    FROM institution_users as iu
    INNER JOIN roles as r
        ON iu.role_rid = role_uid
    WHERE iu.user_rid = _user_id
    ORDER BY institution_rid

$$ LANGUAGE SQL;

-- FIXME this list does not need to contain all fields in project_boundary
-- Returns all rows in projects for a user_id with roles
CREATE OR REPLACE FUNCTION select_all_user_projects(_user_id integer)
 RETURNS setOf project_return AS $$

    SELECT p.*, (CASE WHEN role IS NULL THEN FALSE ELSE role = 'admin' END) AS editable
    FROM project_boundary as p
    LEFT JOIN get_institution_user_roles(_user_id) AS roles
        USING (institution_rid)
    WHERE (role = 'admin' AND p.availability <> 'archived')
        OR (role = 'member'
            AND p.privacy_level IN ('public', 'institution', 'users')
            AND p.availability = 'published')
        OR (_user_id > 0
            AND p.privacy_level IN ('public', 'users')
            AND p.availability = 'published')
        OR (p.privacy_level IN ('public')
            AND p.availability = 'published')
    ORDER BY project_uid

$$ LANGUAGE SQL;

-- Returns all rows in projects for a user_id and institution_rid with roles
CREATE OR REPLACE FUNCTION select_institution_projects_with_roles(_user_id integer, _institution_id integer)
 RETURNS setOf project_return AS $$

    SELECT *
    FROM select_all_user_projects(_user_id)
    WHERE institution_id = _institution_id
    ORDER BY project_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_template_projects(_user_id integer)
 RETURNS TABLE (
     project_id    integer,
     name          text
 ) AS $$

    SELECT project_uid, name
    FROM projects as p
    LEFT JOIN get_institution_user_roles(_user_id) AS roles
        USING (institution_rid)
    WHERE (role = 'admin' AND p.availability <> 'archived')
        OR (role = 'member'
            AND p.privacy_level IN ('public', 'institution', 'users')
            AND p.availability = 'published')
        OR (_user_id > 0
            AND p.privacy_level IN ('public', 'users')
            AND p.availability = 'published')
        OR (p.privacy_level IN ('public')
            AND p.availability = 'published')
    ORDER BY project_uid

$$ LANGUAGE SQL;

-- Returns project users (SQL helper functions)
CREATE OR REPLACE FUNCTION select_project_users(_project_id integer)
 RETURNS TABLE (
    user_uid integer
 ) AS $$

    WITH matching_projects AS (
        SELECT *
        FROM projects
        WHERE project_uid = _project_id
    ), matching_institutions AS (
        SELECT *
        FROM projects p
        INNER JOIN institutions i
            ON p.institution_rid = institution_uid
        WHERE project_uid = _project_id
    ), matching_institution_users AS (
        SELECT *
        FROM matching_institutions mi
        INNER JOIN institution_users ui
            ON mi.institution_uid = ui.institution_rid
        INNER JOIN users u
            ON user_uid = ui.user_rid
        INNER JOIN roles r
            ON role_uid = ui.role_rid
    )

    SELECT user_uid
    FROM matching_projects
    CROSS JOIN users
    WHERE privacy_level = 'public'

    UNION ALL
    SELECT user_uid
    FROM matching_institution_users
    WHERE privacy_level = 'private'
        AND title = 'admin'

    UNION ALL
    SELECT user_uid
    FROM matching_institution_users
    WHERE privacy_level = 'institution'
        AND availability = 'published'
        AND title = 'member'

$$ LANGUAGE SQL;

-- Returns project statistics
-- Overlapping queries, consider condensing. Query time is not an issue.
CREATE OR REPLACE FUNCTION select_project_statistics(_project_id integer)
 RETURNS TABLE(
    flagged_plots       integer,
    assigned_plots      integer,
    unassigned_plots    integer,
    members             integer,
    contributors        integer,
    created_date        date,
    published_date      date,
    closed_date         date,
    archived_date       date,
    user_stats          text
 ) AS $$

    WITH project_plots AS (
        SELECT project_uid,
            plot_uid,
            (CASE WHEN collection_time IS NULL OR collection_start IS NULL THEN 0
                ELSE EXTRACT(EPOCH FROM (collection_time - collection_start)) END) as seconds,
            (CASE WHEN collection_time IS NULL OR collection_start IS NULL THEN 0 ELSE 1 END) as timed,
            u.email as email
        FROM user_plots up
        INNER JOIN plots pl
            ON up.plot_rid = plot_uid
        INNER JOIN projects p
            ON pl.project_rid = project_uid
        INNER JOIN users u
            ON up.user_rid = user_uid
        WHERE project_uid = _project_id
    ), user_groups AS (
        SELECT email,
            SUM(seconds)::int as seconds,
            COUNT(plot_uid) as plots,
            SUM(timed):: int as timedPlots
        FROM project_plots
        GROUP BY email
        ORDER BY email DESC
    ), user_agg as (
        SELECT
            format('[%s]',
                   string_agg(
                       format('{"user":"%s", "seconds":%s, "plots":%s, "timedPlots":%s}'
                              , email, seconds, plots, timedPlots), ', ')) as user_stats
        FROM user_groups
    ), members AS (
        SELECT COUNT(distinct user_uid) as members
        FROM select_project_users(_project_id)
    ), plotsum AS (
        SELECT SUM(coalesce(flagged::int, 0)) as flagged,
            SUM((user_plot_uid IS NOT NULL)::int) as assigned,
            plot_uid
        FROM projects prj
        INNER JOIN plots pl
          ON project_uid = pl.project_rid
        LEFT JOIN user_plots up
            ON up.plot_rid = pl.plot_uid
        GROUP BY project_uid, plot_uid
        HAVING project_uid = _project_id
    ), sums AS (
        SELECT MAX(prj.created_date) as created_date,
            MAX(prj.published_date) as published_date,
            MAX(prj.closed_date) as closed_date,
            MAX(prj.archived_date) as archived_date,
            (CASE WHEN SUM(ps.flagged::int) IS NULL THEN 0 ELSE SUM(ps.flagged::int) END) as flagged,
            (CASE WHEN SUM(ps.assigned::int) IS NULL THEN 0 ELSE SUM(ps.assigned::int) END) as assigned,
            COUNT(distinct pl.plot_uid) as plots
        FROM projects prj
        INNER JOIN plots pl
          ON project_uid = pl.project_rid
        LEFT JOIN plotsum ps
          ON ps.plot_uid = pl.plot_uid
        WHERE project_uid = _project_id
    ), users_count AS (
        SELECT COUNT (DISTINCT user_rid) as users
        FROM projects prj
        INNER JOIN plots pl
          ON project_uid = pl.project_rid
            AND project_uid = _project_id
        LEFT JOIN user_plots up
          ON up.plot_rid = plot_uid
    )

    SELECT CAST(flagged as int) as flagged_plots,
        CAST(assigned as int) assigned_plots,
        CAST(GREATEST(0, (plots-flagged-assigned)) as int) as unassigned_plots,
        CAST(members as int) as members,
        CAST(users_count.users as int) as contributors,
        created_date, published_date, closed_date, archived_date,
        user_stats
    FROM members, sums, users_count, user_agg

$$ LANGUAGE SQL;

--
--  PLOT FUNCTIONS
--

-- Create a single project plot with no external file data
CREATE OR REPLACE FUNCTION create_project_plot(_project_id integer, _center jsonb)
 RETURNS integer AS $$

    INSERT INTO plots
        (project_rid, center)
    VALUES
        (_project_id, ST_SetSRID(ST_GeomFromGeoJSON(_center), 4326))
    RETURNING plot_uid

$$ LANGUAGE SQL;

-- Flag plot
CREATE OR REPLACE FUNCTION flag_plot(_plot_id integer, _user_id integer, _confidence integer)
 RETURNS integer AS $$

    DELETE
    FROM sample_values
    WHERE user_plot_rid = (
        SELECT user_plot_uid
        FROM user_plots
        WHERE user_rid = _user_id
            AND plot_rid = _plot_id
    );

    INSERT INTO user_plots
        (user_rid, plot_rid, flagged, confidence, collection_time)
    VALUES
        (_user_id, _plot_id, true, _confidence, Now())
    ON CONFLICT (user_rid, plot_rid) DO
        UPDATE
        SET flagged = excluded.flagged,
            user_rid = excluded.user_rid,
            confidence = excluded.confidence,
            collection_time = Now()

    RETURNING _plot_id

$$ LANGUAGE SQL;

-- Select plots
-- FIXME when multiple users can be assigned to plots, returning a single username does not make sense
-- FIXME limit return to only the needed columns
CREATE OR REPLACE FUNCTION select_all_project_plots(_project_id integer)
 RETURNS setOf plots_return AS $$

    WITH username AS (
        SELECT MAX(email) as email, plot_rid
        FROM users
        INNER JOIN user_plots
            ON user_uid = user_rid
        GROUP BY plot_rid
    ), plotsum AS (
        SELECT cast(SUM(CASE WHEN flagged THEN 1 ELSE 0 END) as int) as flagged,
            cast(COUNT(1) - SUM(CASE WHEN flagged THEN 1 ELSE 0 END) as int) as assigned,
            MAX(confidence) as confidence,
            MAX(collection_time) as collection_time,
            ROUND(AVG(EXTRACT(EPOCH FROM (collection_time - collection_start)))::numeric, 1) as analysis_duration,
            plot_rid
        FROM user_plots
        GROUP BY plot_rid
    ), tablename AS (
        SELECT plots_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), file_data AS (
        SELECT * FROM select_partial_table_by_name((SELECT plots_ext_table FROM tablename))
    )

    SELECT plot_uid,
        project_rid,
        ST_AsGeoJSON(plots.center) as center,
        (CASE WHEN plotsum.flagged IS NULL THEN 0 ELSE plotsum.flagged END) as flagged,
        (CASE WHEN plotsum.assigned IS NULL THEN 0 ELSE plotsum.assigned END) as assigned,
        (CASE WHEN username.email IS NULL THEN '' ELSE username.email END) as username,
        plotsum.confidence,
        plotsum.collection_time,
        fd.ext_id,
        (CASE WHEN fd.plotId IS NULL THEN plot_uid ELSE fd.plotId END) as plotId,
        ST_AsGeoJSON(fd.geom) as geom,
        plotsum.analysis_duration
    FROM plots
    LEFT JOIN plotsum
        ON plot_uid = plotsum.plot_rid
    LEFT JOIN username
        ON plot_uid = username.plot_rid
    LEFT JOIN file_data fd
        ON plots.ext_id = fd.ext_id
    WHERE project_rid = _project_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_all_unlocked_project_plots(_project_id integer)
 RETURNS setOf plots_return AS $$

    SELECT ap.*
    FROM select_all_project_plots(_project_id) ap
    LEFT JOIN plot_locks pl
        ON plot_id = pl.plot_rid
    WHERE pl.lock_end IS NULL
        OR localtimestamp > pl.lock_end

$$ LANGUAGE SQL;

-- Select plots but only return a maximum number
-- FIXME not all of plots_return are needed here.
CREATE OR REPLACE FUNCTION select_limited_project_plots(_project_id integer, _maximum integer)
 RETURNS setOf plots_return AS $$

    SELECT all_plots.plot_id,     all_plots.project_id,
        all_plots.center,         all_plots.flagged,
        all_plots.assigned,       all_plots.username,
        all_plots.confidence,     all_plots.collection_time,
        all_plots.ext_id,         all_plots.plotId,
        all_plots.geom,           all_plots.analysis_duration
     FROM (
        SELECT *,
            row_number() OVER(ORDER BY plot_id) AS rows,
            COUNT(*) OVER() as total_plots
        FROM select_all_project_plots(_project_id)
        WHERE project_id = _project_id
    ) as all_plots
    WHERE all_plots.rows %
        (CASE WHEN _maximum > all_plots.total_plots THEN 0.5 ELSE all_plots.total_plots / _maximum END) = 0
    LIMIT _maximum;

$$ LANGUAGE SQL;

-- Returns next plot by id
CREATE OR REPLACE FUNCTION select_plot_by_id(_project_id integer, _plot_id integer)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data
    FROM select_all_project_plots(_project_id) as spp
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    WHERE spp.plotId = _plot_id

$$ LANGUAGE SQL;

-- FIXME, I dont think we need 6 functions for navigating plots
-- FIXME, Create dynamic function to replace select_json_table_by_name that is able to get just one row
-- FIXME, Using select_all_unlocked_project_plots is neat, but likely slower than a custom query. Test performance
-- Returns next unanalyzed plot
CREATE OR REPLACE FUNCTION select_next_unassigned_plot(_project_id integer, _plot_id integer)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data
    FROM select_all_unlocked_project_plots(_project_id) as spp
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    WHERE spp.plotId > _plot_id
        AND flagged = 0
        AND assigned = 0
    ORDER BY plotId ASC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns next user analyzed plot
CREATE OR REPLACE FUNCTION select_next_user_plot(
    _project_id    integer,
    _plot_id       integer,
    _username      text,
    _review_all    boolean
) RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data
    FROM select_all_project_plots(_project_id) as spp
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    WHERE spp.plotId > _plot_id
        AND ((_review_all AND spp.username != '')
             OR spp.username = _username)
    ORDER BY plotId ASC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns prev unanalyzed plot
CREATE OR REPLACE FUNCTION select_prev_unassigned_plot(_project_id integer, _plot_id integer)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data
    FROM select_all_unlocked_project_plots(_project_id) as spp
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    WHERE spp.plotId < _plot_id
        AND flagged = 0
        AND assigned = 0
    ORDER BY plotId DESC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns prev user analyzed plot
CREATE OR REPLACE FUNCTION select_prev_user_plot(
    _project_id    integer,
    _plot_id       integer,
    _username      text,
    _review_all    boolean
 ) RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data
    FROM select_all_project_plots(_project_id) as spp
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    WHERE spp.plotId < _plot_id
        AND ((_review_all AND spp.username != '')
             OR spp.username = _username)
    ORDER BY plotId DESC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns unanalyzed plots by plot id
CREATE OR REPLACE FUNCTION select_by_id_unassigned_plot(_project_id integer, _plot_id integer)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data
    FROM select_all_unlocked_project_plots(_project_id) as spp
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    WHERE spp.plotId = _plot_id
        AND flagged = 0
        AND assigned = 0

$$ LANGUAGE SQL;

-- Returns user analyzed plots by plot id
CREATE OR REPLACE FUNCTION select_by_id_user_plot(
    _project_id    integer,
    _plot_id       integer,
    _username      text,
    _review_all    boolean
) RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data
    FROM select_all_project_plots(_project_id) as spp
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    WHERE spp.plotId = _plot_id
        AND ((_review_all AND spp.username != '')
             OR spp.username = _username)

$$ LANGUAGE SQL;


-- Lock plot to user
CREATE OR REPLACE FUNCTION lock_plot(_plot_id integer, _user_id integer, _lock_end timestamp)
 RETURNS VOID AS $$

    INSERT INTO plot_locks
        (user_rid, plot_rid, lock_end)
    VALUES
        (_user_id, _plot_id, _lock_end)

$$ LANGUAGE SQL;

-- Reset time on lock
CREATE OR REPLACE FUNCTION lock_plot_reset(_plot_id integer, _user_id integer, _lock_end timestamp)
 RETURNS VOID AS $$

    UPDATE plot_locks pl
    SET lock_end = _lock_end
    WHERE pl.plot_rid = _plot_id
        AND pl.user_rid = _user_id

$$ LANGUAGE SQL;

-- Remove all locks from user and old locks
CREATE OR REPLACE FUNCTION unlock_plots(_user_id integer)
 RETURNS VOID AS $$

    DELETE FROM plot_locks pl
    WHERE pl.user_rid = _user_id
        OR pl.lock_end < localtimestamp

$$ LANGUAGE SQL;

--
--  SAMPLE FUNCTIONS
--

-- Create project plot sample with no external file data
CREATE OR REPLACE FUNCTION create_project_plot_sample(_plot_id integer, _sample_geom jsonb)
 RETURNS integer AS $$

    INSERT INTO samples
        (plot_rid, sample_geom)
    VALUES
        (_plot_id, ST_SetSRID(ST_GeomFromGeoJSON(_sample_geom), 4326))
    RETURNING sample_uid

$$ LANGUAGE SQL;

-- Select samples. GEOM comes from shp file table.
CREATE OR REPLACE FUNCTION select_plot_samples(_plot_id integer, _project_id integer)
 RETURNS TABLE (
    sample_id             integer,
    sample_geom           text,
    ext_id                integer,
    plotId                integer,
    sampleId              integer,
    geom                  text,
    value                 jsonb,
    imagery_id            integer,
    imagery_attributes    jsonb
 ) AS $$

    WITH tablename AS (
        SELECT samples_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), file_data AS (
        SELECT * FROM select_partial_sample_table_by_name((SELECT samples_ext_table FROM tablename))
    )

    SELECT sample_uid,
        ST_AsGeoJSON(sample_geom) as sample_geom,
        fd.ext_id,
        fd.sampleId,
        fd.sampleId,
        ST_AsGeoJSON(fd.geom) as geom,
        (CASE WHEN sv.value IS NULL THEN '{}' ELSE sv.value END),
        sv.imagery_rid,
        sv.imagery_attributes
    FROM samples
    LEFT JOIN sample_values sv
        ON sample_uid = sv.sample_rid
    LEFT JOIN file_data fd
        ON samples.ext_id = fd.ext_id
    WHERE samples.plot_rid = _plot_id

$$ LANGUAGE SQL;

-- FIXME _project_id should not be needed
-- FIXME this does not account for someone submitting to a plot already saved
-- FIXME this can probably be eliminate with a rewrite to update_user_samples
-- Returns user plots table id if available
CREATE OR REPLACE FUNCTION check_user_plots(_project_id integer, _plot_id integer, _user_id integer)
 RETURNS integer AS $$

    SELECT user_plot_uid
    FROM plots p
    INNER JOIN user_plots up
        ON plot_uid = up.plot_rid
        AND p.project_rid = _project_id
        AND up.user_rid = _user_id
        AND up.plot_rid = _plot_id

$$ LANGUAGE SQL;

-- FIXME _project_id is not used
-- Add user sample value selections
CREATE OR REPLACE FUNCTION add_user_samples(
    _project_id          integer,
    _plot_id             integer,
    _user_id             integer,
    _confidence          integer,
    _collection_start    timestamp,
    _samples             jsonb,
    _images              jsonb
 ) RETURNS integer AS $$

    WITH user_plot_table AS (
        INSERT INTO user_plots
            (user_rid, plot_rid, confidence, collection_start, collection_time)
        VALUES
            (_user_id, _plot_id, _confidence, _collection_start, Now())
        RETURNING user_plot_uid
    ), new_sample_values AS (
        SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_samples)
    ), image_values AS (
        SELECT sample_id, id as imagery_id, attributes as imagery_attributes
        FROM (SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_images)) a
        CROSS JOIN LATERAL
        jsonb_to_record(a.value) as (id int, attributes text)
    )

    INSERT INTO sample_values
        (user_plot_rid, sample_rid, imagery_rid, imagery_attributes, value)
    (SELECT user_plot_uid, sv.sample_id, iv.imagery_id, iv.imagery_attributes::jsonb, sv.value
        FROM user_plot_table AS upt, samples AS s
            INNER JOIN new_sample_values as sv
                ON sample_uid = sv.sample_id
            INNER JOIN image_values as iv
                ON sample_uid = iv.sample_id
        WHERE s.plot_rid = _plot_id)

    RETURNING sample_value_uid

$$ LANGUAGE SQL;

-- FIXME _project_id is not used
-- Update user sample value selections
CREATE OR REPLACE FUNCTION update_user_samples(
    _user_plots_uid      integer,
    _project_id          integer,
    _plot_id             integer,
    _user_id             integer,
    _confidence          integer,
    _collection_start    timestamp,
    _samples             jsonb,
    _images              jsonb
 ) RETURNS integer AS $$

    WITH user_plot_table AS (
        UPDATE user_plots
            SET confidence = _confidence,
                collection_start = _collection_start,
                collection_time = localtimestamp,
                flagged = FALSE
        WHERE user_plot_uid = _user_plots_uid
        RETURNING user_plot_uid
    ), new_sample_values AS (
        SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_samples)
    ), image_values AS (
        SELECT sample_id, id as imagery_id, attributes as imagery_attributes
        FROM (SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_images)) a
        CROSS JOIN LATERAL
        jsonb_to_record(a.value) as (id int, attributes text)
    ), plot_samples AS (
        SELECT user_plot_uid, sv.sample_id, iv.imagery_id, iv.imagery_attributes::jsonb, sv.value
        FROM user_plot_table AS upt, samples AS s
        INNER JOIN new_sample_values as sv ON sample_uid = sv.sample_id
        INNER JOIN image_values as iv ON sample_uid = iv.sample_id
        WHERE s.plot_rid = _plot_id
    )

    INSERT INTO sample_values
        (user_plot_rid, sample_rid, imagery_rid, imagery_attributes, value)
        (SELECT user_plot_uid, sample_id, imagery_id, imagery_attributes, value FROM plot_samples)
    ON CONFLICT (user_plot_rid, sample_rid) DO
        UPDATE
        SET user_plot_rid = excluded.user_plot_rid,
            imagery_rid = excluded.imagery_rid,
            imagery_attributes = excluded.imagery_attributes,
            value = excluded.value

    RETURNING sample_values.sample_rid

$$ LANGUAGE SQL;

--
--  RESETTING COLLECTION
--

-- For clearing user plots for a single plot
CREATE OR REPLACE FUNCTION delete_user_plot_by_plot(_plot_id integer)
 RETURNS void AS $$

    DELETE FROM user_plots WHERE plot_rid = _plot_id

$$ LANGUAGE SQL;

-- For clearing samples for a single plot
CREATE OR REPLACE FUNCTION delete_samples_by_plot(_plot_id integer)
 RETURNS void AS $$

    DELETE FROM samples WHERE plot_rid = _plot_id

$$ LANGUAGE SQL;

-- For clearing all user plots in a project
CREATE OR REPLACE FUNCTION delete_user_plots_by_project(_project_id integer)
 RETURNS void AS $$

    DELETE FROM user_plots WHERE plot_rid IN (SELECT plot_uid FROM plots WHERE project_rid = _project_id)

$$ LANGUAGE SQL;

-- For clearing all samples in a project
CREATE OR REPLACE FUNCTION delete_all_samples_by_project(_project_id integer)
 RETURNS void AS $$

    DELETE FROM samples WHERE plot_rid IN (SELECT plot_uid FROM plots WHERE project_rid = _project_id)

$$ LANGUAGE SQL;

-- For clearing user plots and collected samples for a project
CREATE OR REPLACE FUNCTION get_deleted_user_plots_by_project(_project_id integer)
 RETURNS TABLE (
    plot_id    integer,
    lon        double precision,
    lat        double precision
 ) AS $$

    WITH deleted_user_plots AS (
        DELETE FROM user_plots WHERE plot_rid IN (SELECT plot_uid FROM plots WHERE project_rid = _project_id)
        RETURNING plot_rid
    ), deleted_samples AS (
        DELETE FROM samples WHERE plot_rid IN (SELECT plot_rid FROM deleted_user_plots)
        RETURNING plot_rid
    )

    SELECT distinct(plot_uid),
        ST_X(center) AS lon,
        ST_Y(center) AS lat
    FROM plots
    INNER JOIN deleted_samples
        ON plot_uid = plot_rid

$$ LANGUAGE SQL;

--
--  AGGREGATE FUNCTIONS
--

-- Returns project aggregate data
CREATE OR REPLACE FUNCTION dump_project_plot_data(_project_id integer)
 RETURNS TABLE (
        plot_id                     integer,
        lon                         double precision,
        lat                         double precision,
        plot_shape                  text,
        plot_size                   real,
        email                       text,
        confidence                  integer,
        flagged                     integer,
        assigned                    integer,
        collection_time             timestamp,
        analysis_duration           numeric,
        samples                     text,
        common_securewatch_date     text,
        total_securewatch_dates     integer,
        ext_plot_data               jsonb
 ) AS $$

    WITH all_rows AS (
        SELECT pl.ext_id as pl_ext_id,
        (CASE WHEN imagery_attributes->>'imagerySecureWatchDate' = ''
                OR imagery_attributes->'imagerySecureWatchDate' IS NULL THEN NULL
              ELSE imagery_attributes->>'imagerySecureWatchDate'
         END) as imagerySecureWatchDate,
        *
        FROM select_all_project_plots(_project_id) pl
        INNER JOIN samples s
            ON s.plot_rid = pl.plot_id
        LEFT JOIN sample_values sv
            ON sample_uid = sv.sample_rid
    ), tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), plots_agg AS (
        SELECT plot_id,
            center,
            MAX(username) AS email,
            MAX(confidence) as confidence,
            MAX(flagged) as flagged,
            MAX(assigned) as assigned,
            MAX(collection_time) as collection_time,
            MAX(analysis_duration) as analysis_duration,
            format('[%s]', string_agg(
                (CASE WHEN "value" IS NULL THEN
                    format('{"%s":"%s"}', 'id', sample_uid)
                ELSE
                    format('{"%s":"%s", "%s":%s}', 'id', sample_uid, 'value', "value")
                END) , ', ')) as samples,
            pl_ext_id,
            project_id,
            MODE() WITHIN GROUP (ORDER BY imagerySecureWatchDate) as common_securewatch_date,
            COUNT(DISTINCT(imagerySecureWatchDate)) as total_securewatch_dates
        FROM all_rows
        GROUP BY plot_id, center, pl_ext_id, project_id
    )

    SELECT plot_id,
        ST_X(ST_SetSRID(ST_GeomFromGeoJSON(center), 4326)) AS lon, -- TODO, why is this already in geojson when its stored as a geometry
        ST_Y(ST_SetSRID(ST_GeomFromGeoJSON(center), 4326)) AS lat,
        plot_shape,
        plot_size,
        email,
        confidence,
        flagged,
        assigned,
        collection_time::timestamp,
        analysis_duration,
        samples,
        common_securewatch_date,
        total_securewatch_dates::integer,
        pfd.rem_data
    FROM projects p
    INNER JOIN plots_agg pa
        ON project_uid = pa.project_id
    LEFT JOIN plots_file_data pfd
        ON pl_ext_id = pfd.ext_id
    ORDER BY plot_id

$$ LANGUAGE SQL;

-- Returns project raw data
CREATE OR REPLACE FUNCTION dump_project_sample_data(_project_id integer)
 RETURNS TABLE (
        plot_id               integer,
        sample_id             integer,
        lon                   double precision,
        lat                   double precision,
        email                 text,
        confidence            integer,
        flagged               integer,
        assigned              integer,
        collection_time       timestamp,
        analysis_duration     numeric,
        imagery_title         text,
        imagery_attributes    text,
        sample_geom           text,
        value                 jsonb,
        ext_plot_data         jsonb,
        ext_sample_data       jsonb
 ) AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_id
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT p.plot_id,
        sample_uid,
        CASE WHEN ST_GeometryType(sample_geom) = 'ST_Point' THEN ST_X(sample_geom) ELSE -1 END AS lon,
        CASE WHEN ST_GeometryType(sample_geom) = 'ST_Point' THEN ST_Y(sample_geom) ELSE -1 END AS lat,
        p.username,
        p.confidence,
        p.flagged,
        p.assigned,
        p.collection_time::timestamp,
        p.analysis_duration,
        title AS imagery_title,
        imagery_attributes::text,
        ST_AsText(sample_geom),
        value,
        pfd.rem_data,
        sfd.rem_data
    FROM select_all_project_plots(_project_id) p
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN sample_values sv
        ON sample_uid = sv.sample_rid
    LEFT JOIN imagery
        ON imagery_uid = sv.imagery_rid
    LEFT JOIN plots_file_data pfd
        ON p.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    ORDER BY plot_id, sample_uid

$$ LANGUAGE SQL;
