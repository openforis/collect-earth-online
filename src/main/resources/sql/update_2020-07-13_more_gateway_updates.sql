CREATE OR REPLACE FUNCTION add_all_institution_imagery(_project_uid integer)
 RETURNS void AS $$

    INSERT INTO project_imagery
        (project_rid, imagery_rid)
    SELECT _project_uid, imagery_id
    FROM select_imagery_by_institution((SELECT institution_rid
                                        FROM projects
                                        WHERE project_uid = _project_uid), 1)
    ON CONFLICT DO NOTHING

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION add_imagery_to_all_institution_projects(_imagery_uid integer)
 RETURNS void AS $$

    INSERT INTO project_imagery
        (project_rid, imagery_rid)
    SELECT project_uid, _imagery_uid
    FROM projects
    WHERE institution_rid = (SELECT institution_rid FROM imagery WHERE imagery_uid = _imagery_uid)
    ON CONFLICT DO NOTHING

$$ LANGUAGE SQL;
