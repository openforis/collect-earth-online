ALTER TABLE institutions ADD COLUMN created_date date DEFAULT NOW();
ALTER TABLE institutions ADD COLUMN archived_date date;
ALTER TABLE imagery ADD COLUMN created_date date DEFAULT NOW();

UPDATE institutions SET archived_date = NOW() WHERE archived = true;

CREATE OR REPLACE FUNCTION archive_institution(_institution_uid integer)
 RETURNS integer AS $$

    SELECT (archive_project(project_uid))
    FROM projects
    WHERE institution_rid = _institution_uid;

    UPDATE institutions
    SET archived = true,
        archived_date = NOW()
    WHERE institution_uid = _institution_uid
    RETURNING institution_uid;

$$ LANGUAGE SQL;

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

    DELETE FROM projects WHERE project_uid = _project_uid CASCADE;

    EXECUTE
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_plots_csv;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_plots_shp;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_samples_csv;'
    'DROP TABLE IF EXISTS ext_tables.project_' || _project_uid || '_samples_shp;';
 END

$$ LANGUAGE PLPGSQL;
