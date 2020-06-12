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
