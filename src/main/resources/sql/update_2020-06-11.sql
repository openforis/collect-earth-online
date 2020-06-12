-- Stores project imagery
-- 1 project -> many imagery
CREATE TABLE project_imagery (
    project_imagery_uid        SERIAL PRIMARY KEY,
    project_rid                integer REFERENCES projects(project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    imagery_rid                integer REFERENCES imagery (imagery_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

-- insert into project_imagery table
CREATE FUNCTION insert_project_imagery(_project_rid integer, _imagery_rid integer)

 RETURNS integer AS $$

    INSERT INTO project_imagery
        (project_rid, imagery_rid)
    VALUES
        (_project_rid, _imagery_rid)
    RETURNING project_imagery_uid

$$ LANGUAGE  SQL;

-- Returns all imagery associated with a project
CREATE FUNCTION select_project_imagery(_project_rid integer)
 RETURNS setOf imagery_return AS $$

    SELECT imagery_uid, institution_rid, visibility, title, attribution, extent, source_config
    FROM project_imagery pi
    INNER JOIN imagery
	    ON pi.imagery_rid = imagery.imagery_uid
	WHERE project_rid = _project_rid
	ORDER BY visibility DESC, imagery_uid

$$ LANGUAGE SQL;

-- Deletes all imagery associated with a project
CREATE FUNCTION delete_project_imagery(_project_rid integer)
 RETURNS void AS $$

    DELETE FROM project_imagery
    WHERE project_rid = _project_rid

$$ LANGUAGE SQL;
