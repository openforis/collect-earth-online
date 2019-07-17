CREATE OR REPLACE FUNCTION archive_institution(_institution_uid integer)
 RETURNS integer AS $$

    SELECT (archive_project(project_uid))
    FROM projects
    WHERE institution_rid = _institution_uid;

    UPDATE institutions
    SET archived = true
    WHERE institution_uid = _institution_uid
    RETURNING institution_uid;

$$ LANGUAGE SQL;
