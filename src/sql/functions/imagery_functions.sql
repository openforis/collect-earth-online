-- NAMESPACE: imagery
-- REQUIRES: clear

--
--  IMAGERY FUNCTIONS
--

-- Returns first public imagery
CREATE OR REPLACE FUNCTION select_first_public_imagery()
 RETURNS integer AS $$

    SELECT imagery_uid
    FROM imagery
    WHERE visibility = 'public'
        AND archived = FALSE
    ORDER BY imagery_uid
    LIMIT 1

$$ LANGUAGE SQL;

-- Adds institution imagery
CREATE OR REPLACE FUNCTION check_institution_imagery(_institution_rid integer, _title text)
 RETURNS boolean AS $$

    SELECT EXISTS(SELECT 1 FROM imagery WHERE institution_rid = _institution_rid AND title = _title)

$$ LANGUAGE SQL;

-- Adds institution imagery
CREATE OR REPLACE FUNCTION add_institution_imagery(_institution_rid integer, _visibility text, _title text, _attribution text, _extent jsonb, _source_config jsonb)
 RETURNS integer AS $$

    INSERT INTO imagery
        (institution_rid, visibility, title, attribution, extent, source_config)
    VALUES
        (_institution_rid, _visibility, _title, _attribution, _extent, _source_config)
    RETURNING imagery_uid

$$ LANGUAGE SQL;

-- Updates institution imagery
CREATE OR REPLACE FUNCTION update_institution_imagery(_imagery_uid integer, _title text, _attribution text, _source_config jsonb)
 RETURNS integer AS $$

    UPDATE imagery
    SET title = _title,
        attribution = _attribution,
        source_config = _source_config
    WHERE imagery_uid = _imagery_uid
    RETURNING imagery_uid

$$ LANGUAGE SQL;

-- Delete single imagery by id
CREATE OR REPLACE FUNCTION archive_imagery(_imagery_uid integer)
 RETURNS void AS $$

    UPDATE imagery
    SET archived = true
    WHERE imagery_uid = _imagery_uid;

    UPDATE projects
    SET imagery_rid = (SELECT select_first_public_imagery())
    WHERE imagery_rid = _imagery_uid;

    DELETE FROM project_imagery
    WHERE imagery_rid = _imagery_uid;

$$ LANGUAGE SQL;

-- Returns all rows in imagery for which visibility = "public"
CREATE OR REPLACE FUNCTION select_public_imagery()
 RETURNS setOf imagery_return AS $$

    SELECT imagery_uid, institution_rid, visibility, title, attribution, extent, source_config
    FROM imagery
    WHERE visibility = 'public'
        AND archived = FALSE

$$ LANGUAGE SQL;

-- Returns all rows in imagery associated with institution_rid
CREATE OR REPLACE FUNCTION select_imagery_by_institution(_institution_rid integer, _user_rid integer)
 RETURNS setOf imagery_return AS $$

    WITH images AS (
        SELECT * FROM select_public_imagery()

        UNION
        SELECT imagery_uid, institution_rid, visibility, title, attribution, extent, source_config
        FROM imagery
        WHERE institution_rid = _institution_rid
            AND archived = FALSE
            AND (visibility = 'public'
                OR (SELECT count(*) > 0
                    FROM get_all_users_by_institution_id(_institution_rid)
                    WHERE user_id = _user_rid)
                OR _user_rid = 1)
    )

    SELECT * FROM images
    ORDER BY visibility DESC, title

$$ LANGUAGE SQL;

-- Returns all rows in imagery associated with institution_rid
CREATE OR REPLACE FUNCTION select_imagery_by_project(_project_rid integer, _user_rid integer, _token_key text)
 RETURNS setOf imagery_return AS $$

    SELECT DISTINCT imagery_uid, p.institution_rid, visibility, title, attribution, extent, source_config
    FROM projects p
    LEFT JOIN project_imagery pi
        ON pi.project_rid = p.project_uid
    INNER JOIN imagery i
        ON pi.imagery_rid = i.imagery_uid
            OR p.imagery_rid = i.imagery_uid
    WHERE project_uid = _project_rid
        AND archived = FALSE
        AND (visibility = 'public'
             OR (i.institution_rid = p.institution_rid
                 AND ((SELECT count(*) > 0
                        FROM get_all_users_by_institution_id(p.institution_rid)
                        WHERE user_id = _user_rid)
                      OR (token_key IS NOT NULL AND token_key = _token_key)))
             OR _user_rid = 1)

    ORDER BY title

$$ LANGUAGE SQL;

-- Updates imagery attributes
CREATE OR REPLACE FUNCTION update_imagery(_imagery_uid integer, _institution_rid integer, _visibility text, _title text, _attribution text, _extent jsonb, _source_config jsonb )
 RETURNS integer AS $$

    UPDATE imagery
    SET institution_rid = _institution_rid,
        visibility = _visibility,
        title = _title,
        attribution = _attribution,
        extent = _extent,
        source_config = _source_config
    WHERE imagery_uid = _imagery_uid
    RETURNING imagery_uid

$$ LANGUAGE SQL;

-- Deletes all imagery associated with a project
CREATE OR REPLACE FUNCTION delete_project_imagery(_project_rid integer)
 RETURNS void AS $$

    DELETE FROM project_imagery
    WHERE project_rid = _project_rid

$$ LANGUAGE SQL;

-- insert into project_imagery table
CREATE OR REPLACE FUNCTION insert_project_imagery(_project_rid integer, _imagery_rid integer)
 RETURNS integer AS $$

    INSERT INTO project_imagery
        (project_rid, imagery_rid)
    VALUES
        (_project_rid, _imagery_rid)
    RETURNING project_imagery_uid

$$ LANGUAGE SQL;

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
