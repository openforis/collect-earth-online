CREATE OR REPLACE FUNCTION delete_project(_project_uid integer, _archive boolean)
 RETURNS void AS $$

 BEGIN
    DELETE FROM plots
    WHERE plot_uid IN (
        SELECT plot_uid
        FROM projects
        INNER JOIN plots
            ON project_uid = project_rid
            AND project_uid = _project_uid
    );


    IF _archive THEN
        PERFORM archive_project(_project_uid);
    ELSE
        PERFORM CASE WHEN availability <> 'archived' THEN (SELECT close_project(_project_uid)) END
        FROM projects
        WHERE project_uid = _project_uid;
    END IF;

    EXECUTE
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_plots_csv;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_plots_shp;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_samples_csv;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_samples_shp;';
 END

$$ LANGUAGE PLPGSQL;