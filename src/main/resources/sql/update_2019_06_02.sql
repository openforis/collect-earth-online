CREATE OR REPLACE FUNCTION delete_project(_project_uid integer)
 RETURNS void AS $$

 BEGIN
    DELETE FROM plots
    WHERE plot_uid IN (
        SELECT plot_uid
        FROM projects
        INNER JOIN plots
            ON project_uid = project_rid
            AND project_uid = _project_uid);

    UPDATE projects SET availability='archived' WHERE project_uid = _project_uid;

    EXECUTE
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_plots_csv;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_plots_shp;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_samples_csv;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_samples_shp;';
 END

$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION plots_missing_samples(_project_uid integer)
 RETURNS integer AS $$

    SELECT count(1)::int
    FROM projects p
    INNER JOIN plots pl
        ON pl.project_rid = project_uid
    LEFT JOIN samples s
        ON plot_uid = s.plot_rid
    WHERE project_uid = _project_uid
        AND sample_uid IS NULL

$$ LANGUAGE SQL;
