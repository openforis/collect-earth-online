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

ALTER TABLE plots ADD COLUMN extra_fields text DEFAULT NULL;

-- Add plots from file
CREATE OR REPLACE FUNCTION add_file_plots(_project_uid integer)
 RETURNS TABLE (
    plot_uid    integer,
    plotid      integer,
    lon         float,
    lat         float
 ) AS $$

    WITH plot_tbl AS (
        SELECT * FROM select_partial_table_by_name((
            SELECT plots_ext_table
            FROM projects
            WHERE project_uid = _project_uid
    ))), plotrows AS (
        INSERT INTO plots (project_rid, center, ext_id, extra_fields)
        SELECT _project_uid, center, ext_id, extra_fields
        FROM plot_tbl
        RETURNING plot_uid, ext_id, center
    )

    SELECT plot_uid, plotid, ST_X(plotrows.center), ST_Y(plotrows.center)
    FROM plotrows
    INNER JOIN plot_tbl
        ON plotrows.ext_id = plot_tbl.ext_id

$$ LANGUAGE SQL;
