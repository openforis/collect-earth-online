ALTER TABLE projects ADD COLUMN plots_ext_table text;
ALTER TABLE projects ADD COLUMN samples_ext_table text;
ALTER TABLE plots ADD COLUMN ext_id integer;
ALTER TABLE samples ADD COLUMN ext_id integer;



-- Select known columns from a shp or csv file
CREATE OR REPLACE FUNCTION select_partial_table_by_name(_table_name text)
	RETURNS TABLE (
		ext_id		integer,
		plotId		text,
		center		geometry,
		geom		geometry
	) AS $$
	DECLARE 
		i integer;
    BEGIN
		IF _table_name IS NULL THEN RETURN; END IF;
        EXECUTE 'SELECT * FROM information_schema.columns 
						WHERE table_name = '''|| _table_name ||''' AND column_name = ''geom''';
		GET DIAGNOSTICS i = ROW_COUNT;
		IF i = 0 
		THEN
			RETURN QUERY EXECUTE 'SELECT gid, plotid::text, ST_SetSRID(ST_MakePoint(lon, lat),4326), ST_Centroid(null) as geom FROM '|| _table_name;
		ELSE
			RETURN QUERY EXECUTE 'SELECT gid, plotid::text, ST_Centroid(geom), ST_Force2D(geom) FROM '|| _table_name;	
		END IF;
    END
$$ LANGUAGE PLPGSQL;

--
-- CSV REQUIRED FUNCTIONS
--

-- Create empty table before loading csv
CREATE OR REPLACE FUNCTION create_new_table(_table_name text, _cols text)
 RETURNS void AS $$
	DECLARE 
	iter text;
	BEGIN
	EXECUTE 'CREATE TABLE ' || _table_name || '()';
		
		FOREACH iter IN ARRAY string_to_array(_cols, ',')
		loop
			execute format('alter table ' || _table_name || ' add column %s ;', iter);
		end loop;
		
	END
$$ LANGUAGE PLPGSQL;

-- Add index to csv file for reference later
CREATE OR REPLACE FUNCTION add_index_col(_table_name text)
 RETURNS void AS $$
	BEGIN
	EXECUTE 'ALTER TABLE ' || _table_name || ' ADD COLUMN gid serial primary key';
	END
$$ LANGUAGE PLPGSQL;

--
--	CLEAN UP FUNCTIONS
-- 

-- Delete duplicates after loading
CREATE OR REPLACE FUNCTION delete_duplicates(_table_name text, _on_cols text)
 RETURNS void AS $$
	BEGIN
	IF _table_name IS NULL THEN RETURN; END IF;
	EXECUTE	
		'WITH duplicates as (
			SELECT * FROM
				(SELECT *, count(*) OVER
					(PARTITION BY
					' || _on_cols || '
					) AS count
		FROM ' || _table_name || ') tableWithCount
		WHERE tableWithCount.count > 1
						)
		DELETE FROM ' || _table_name || ' WHERE gid IN
		(SELECT DISTINCT ON (' || _on_cols || ') gid FROM duplicates)';
	END
$$ LANGUAGE PLPGSQL;

-- Calculates boundary from for csv data
CREATE OR REPLACE FUNCTION csv_boundary(_project_id integer, _m_buffer float)
 RETURNS void AS $$
	UPDATE projects SET boundary = b
	FROM (
		SELECT ST_Expand(ST_SetSRID(ST_Extent(center) , 4326) , _m_buffer / 1000.0) as b
	 	FROM select_partial_table_by_name(
			(SELECT plots_ext_table 
		 	FROM projects 
			WHERE id = _project_id)
		)
	) bb
	WHERE id = _project_id
$$ LANGUAGE SQL;

-- Calculates boundary from shp file using geometry.  Padding not needed
CREATE OR REPLACE FUNCTION shp_boundary(_project_id integer)
 RETURNS void AS $$
	
	UPDATE projects SET boundary = b
	FROM (
		SELECT ST_SetSRID(ST_Extent(geom), 4326) AS b 
		FROM select_partial_table_by_name(
			(SELECT plots_ext_table 
			 FROM projects 
			 WHERE id = _project_id)
			)
	) bb
	WHERE id = _project_id

$$ LANGUAGE SQL;

-- Runs a few functions after data has been uploaded
CREATE OR REPLACE FUNCTION cleanup_project_tables(_project_id integer, _m_buffer float)
 RETURNS void AS $$
	DECLARE 
		_plots_ext_table text;
		_samples_ext_table text;
	BEGIN
		SELECT plots_ext_table  INTO _plots_ext_table FROM projects WHERE id = _project_id;
		SELECT samples_ext_table INTO _samples_ext_table FROM projects WHERE id = _project_id;
		
		IF _plots_ext_table similar to '%(_csv)' THEN
			PERFORM csv_boundary(_project_id, _m_buffer);
		ELSIF  _plots_ext_table similar to '%(_shp)' THEN
			PERFORM shp_boundary(_project_id);
		END IF;
		
		PERFORM delete_duplicates(_plots_ext_table,'plotid');
		PERFORM delete_duplicates(_samples_ext_table,'plotid,sampleid');
	END
$$ LANGUAGE PLPGSQL;

-- Add plots from file
CREATE OR REPLACE FUNCTION add_file_plots(_project_id integer)
 RETURNS TABLE (
		id		integer,
		plotid	text,
		lon  	float,
		lat		float
	) AS $$
	WITH plot_tbl AS (
		SELECT * from select_partial_table_by_name((
			SELECT plots_ext_table 
			FROM projects 
			WHERE id = _project_id
		))
	),
	plotrows AS (
        INSERT INTO plots (project_id, center, ext_id)
		SELECT _project_id, center, ext_id
		FROM plot_tbl
		RETURNING id, ext_id, center
	)
	SELECT id, plotid::text, ST_X(plotrows.center), ST_Y(plotrows.center)
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
			WHERE id = _project_id
		)) as st
		INNER JOIN add_file_plots(_project_id) asp
			ON asp.plotId = st.plotId
	),
	samplerows AS (
        INSERT INTO samples (plot_id, point, ext_id)
		SELECT id, center as point, ext_id
		FROM sample_tbl
		RETURNING id, ext_id, point
	)
	SELECT COUNT(*)::integer
	FROM samplerows 
	INNER JOIN sample_tbl 
		ON samplerows.ext_id = sample_tbl.ext_id
$$ LANGUAGE SQL;

--
-- UPDATE EXISTING FUNCTIONS
--

-- Upade data that requires the project number after a project is created
DROP FUNCTION update_project_files( integer, text, text, text, text, geometry(Polygon,4326));
CREATE OR REPLACE FUNCTION update_project_tables(
	_proj_id            integer,
	_plots_ext_table 	text,
	_samples_ext_table 	text
	) 
 RETURNS void AS $$
	BEGIN
		UPDATE projects 
		SET plots_ext_table = _plots_ext_table,
			samples_ext_table = _samples_ext_table
		WHERE id = _proj_id;

	END
$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION create_project_plot(_project_id integer, _center geometry(Point,4326)) 
 RETURNS integer AS $$

	INSERT INTO plots (project_id, center)
	(SELECT _project_id, _center)
	RETURNING id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_project_plot_sample(_plot_id integer, _sample_point geometry(Point,4326)) 
 RETURNS integer AS $$

	INSERT INTO samples (plot_id, point)
	(SELECT _plot_id, _sample_point)
	RETURNING id

$$ LANGUAGE SQL;

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
    ),
	tablename AS (
		SELECT plots_ext_table 
		FROM projects 
		WHERE id = _project_id
	),
	file_data AS (
		SELECT * FROM select_partial_table_by_name((SELECT plots_ext_table FROM tablename)) 
	)
	SELECT plots.id as id, 
		project_id,
		ST_AsGeoJSON(plots.center) as center, 
		(case when plotsum.flagged is null then 0 else plotsum.flagged end) as flagged,
		(case when plotsum.assigned is null then 0 else plotsum.assigned end) as assigned,
		(case when username.email is null then '' else username.email end) as username,
		plotsum.confidence,
		plotsum.collection_time,
		fd.plotId,
		ST_AsGeoJSON(fd.geom) as geom
	FROM plots
	LEFT JOIN plotsum
		ON plots.id = plotsum.plot_id
	LEFT JOIN username
		ON plots.id = username.plot_id
	LEFT JOIN file_data fd
		ON plots.ext_id = fd.ext_id
    WHERE project_id = _project_id

$$ LANGUAGE SQL;

DROP FUNCTION select_plot_samples(integer);
CREATE OR REPLACE FUNCTION select_plot_samples(_plot_id integer, _project_id integer) 
 RETURNS TABLE (
      id            integer,
      point         text,
	  sampleId      text,
	  geom	        text,
      value         jsonb,
      imagery_id    integer,
	  imagery_date  date
    ) AS $$
    WITH tablename AS (
		SELECT samples_ext_table 
		FROM projects 
		WHERE id = _project_id
	),
	file_data AS (
		SELECT * FROM select_partial_table_by_name((SELECT samples_ext_table FROM tablename)) 
	)
    SELECT samples.id, ST_AsGeoJSON(point) as point, fd.plotId, ST_AsGeoJSON(fd.geom) as geom,
        (CASE WHEN sample_values.value IS NULL THEN '{}' ELSE sample_values.value END),
        sample_values.imagery_id, sample_values.imagery_date
    FROM samples
    LEFT JOIN sample_values
    	ON samples.id = sample_values.sample_id
	LEFT JOIN file_data fd
		ON samples.ext_id = fd.ext_id
    WHERE samples.plot_id = _plot_id

$$ LANGUAGE SQL;