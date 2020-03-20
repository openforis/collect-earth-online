DROP FUNCTION select_partial_table_by_name(text);

-- Select known columns from a shp or csv file
CREATE FUNCTION select_partial_table_by_name(_table_name text)
 RETURNS TABLE (
    ext_id          integer,
    plotId          integer,
    center          geometry,
    geom            geometry,
    extra_fields    text
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
            'SELECT gid, plotid::integer, ST_SetSRID(ST_MakePoint(lon, lat), 4326), ST_Centroid(NULL) as geom, extra_fields FROM ext_tables.' || _table_name;
    ELSE
        RETURN QUERY EXECUTE
            'SELECT gid, plotid::integer, ST_Centroid(ST_Force2D(geom)), ST_Force2D(geom) FROM ext_tables.' || _table_name;
    END IF;
 END

$$ LANGUAGE PLPGSQL;

ALTER TYPE plots_return ADD ATTRIBUTE extra_fields text;

-- Select known columns from a shp or csv file
CREATE OR REPLACE FUNCTION select_partial_table_by_name(_table_name text)
 RETURNS TABLE (
    ext_id          integer,
    plotId          integer,
    center          geometry,
    geom            geometry,
    extra_fields    text
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
            'SELECT gid, plotid::integer, ST_SetSRID(ST_MakePoint(lon, lat), 4326), ST_Centroid(NULL) as geom, extra_fields FROM ext_tables.' || _table_name;
    ELSE
        RETURN QUERY EXECUTE
            'SELECT gid, plotid::integer, ST_Centroid(ST_Force2D(geom)), ST_Force2D(geom) FROM ext_tables.' || _table_name;
    END IF;
 END

$$ LANGUAGE PLPGSQL;

-- Select plots
-- FIXME when multiple users can be assigned to plots, returning a single username does not make sense
CREATE OR REPLACE FUNCTION select_all_project_plots(_project_rid integer)
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
        WHERE project_uid = _project_rid
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
        plotsum.analysis_duration,
        fd.extra_fields
    FROM plots
    LEFT JOIN plotsum
        ON plot_uid = plotsum.plot_rid
    LEFT JOIN username
        ON plot_uid = username.plot_rid
    LEFT JOIN file_data fd
        ON plots.ext_id = fd.ext_id
    WHERE project_rid = _project_rid

$$ LANGUAGE SQL;