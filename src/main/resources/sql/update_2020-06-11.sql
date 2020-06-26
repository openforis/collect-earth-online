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

DROP FUNCTION select_imagery_by_project(_project_rid integer, _user_rid integer);

CREATE FUNCTION select_imagery_by_project(_project_rid integer, _user_rid integer)
 RETURNS setOf imagery_return AS $$

    SELECT DISTINCT imagery_uid, p.institution_rid, visibility, title, attribution, extent, source_config
    FROM imagery i, projects p, project_imagery pi
    WHERE i.institution_rid = p.institution_rid
        AND project_rid = _project_rid
        AND pi.imagery_rid = i.imagery_uid
        AND i.archived = FALSE
        AND (i.visibility = 'public'
            OR (SELECT count(*) > 0
                FROM get_all_users_by_institution_id(p.institution_rid)
                WHERE user_id = _user_rid)
            OR _user_rid = 1)

    ORDER BY title

$$ LANGUAGE SQL;
