-- NAMESPACE: imagery
-- REQUIRES: clear, member

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

-- Check if imagery title already exists
CREATE OR REPLACE FUNCTION imagery_name_taken(_institution_rid integer, _title text, _imagery_id integer)
 RETURNS boolean AS $$

    SELECT EXISTS(
        SELECT 1
        FROM imagery
        WHERE institution_rid = _institution_rid
            AND title = _title
            AND imagery_uid <> _imagery_id
    )

$$ LANGUAGE SQL;

-- Adds institution imagery
CREATE OR REPLACE FUNCTION add_institution_imagery(
    _institution_id    integer,
    _visibility        text,
    _title             text,
    _attribution       text,
    _extent            jsonb,
    _source_config     jsonb
 ) RETURNS integer AS $$

    INSERT INTO imagery
        (institution_rid, visibility, title, attribution, extent, source_config)
    VALUES
        (_institution_id, _visibility, _title, _attribution, _extent, _source_config)
    RETURNING imagery_uid

$$ LANGUAGE SQL;

-- Updates institution imagery
CREATE OR REPLACE FUNCTION update_institution_imagery(
    _imagery_id       integer,
    _title            text,
    _attribution      text,
    _source_config    jsonb
 ) RETURNS integer AS $$

    UPDATE imagery
    SET title = _title,
        attribution = _attribution,
        source_config = _source_config
    WHERE imagery_uid = _imagery_id
    RETURNING imagery_uid

$$ LANGUAGE SQL;

-- Delete single imagery by id
CREATE OR REPLACE FUNCTION archive_imagery(_imagery_id integer)
 RETURNS void AS $$

    UPDATE imagery
    SET archived = true
    WHERE imagery_uid = _imagery_id;

    UPDATE projects
    SET imagery_rid = (SELECT select_first_public_imagery())
    WHERE imagery_rid = _imagery_id;

    DELETE FROM project_imagery
    WHERE imagery_rid = _imagery_id;

$$ LANGUAGE SQL;

-- FIXME, source config wont need to be stripped if the function is updated
-- Returns all rows in imagery for which visibility = "public"
CREATE OR REPLACE FUNCTION select_public_imagery()
 RETURNS setOf imagery_return AS $$

    SELECT imagery_uid, institution_rid, visibility, title, attribution, extent, source_config
    FROM imagery
    WHERE visibility = 'public'
        AND archived = FALSE

$$ LANGUAGE SQL;

-- Returns all rows in imagery associated with institution_rid
CREATE OR REPLACE FUNCTION select_imagery_by_institution(_institution_id integer, _user_id integer)
 RETURNS setOf imagery_return AS $$

    SELECT imagery_uid, institution_rid, visibility, title, attribution, extent, source_config
        FROM imagery
        WHERE archived = FALSE
            AND (visibility = 'public'
                OR (institution_rid = _institution_id
                    AND ((SELECT count(*) > 0
                            FROM get_all_users_by_institution_id(_institution_id)
                            WHERE user_id = _user_id)
                        OR _user_id = 1)))
    ORDER BY visibility DESC, title

$$ LANGUAGE SQL;

-- Returns all rows in imagery associated with institution_rid
CREATE OR REPLACE FUNCTION select_imagery_by_project(_project_id integer, _user_id integer, _token_key text)
 RETURNS setOf imagery_return AS $$

    SELECT DISTINCT imagery_uid, p.institution_rid, visibility, title, attribution, extent, source_config
    FROM projects p
    LEFT JOIN project_imagery pi
        ON pi.project_rid = p.project_uid
    INNER JOIN imagery i
        ON pi.imagery_rid = i.imagery_uid
            OR p.imagery_rid = i.imagery_uid
    WHERE project_uid = _project_id
        AND archived = FALSE
        AND (visibility = 'public'
             OR (i.institution_rid = p.institution_rid
                 AND ((SELECT count(*) > 0
                        FROM get_all_users_by_institution_id(p.institution_rid)
                        WHERE user_id = _user_id)
                      OR (token_key IS NOT NULL AND token_key = _token_key)))
             OR _user_id = 1)

    ORDER BY title

$$ LANGUAGE SQL;

-- Updates imagery attributes
CREATE OR REPLACE FUNCTION update_imagery(
    _imagery_id        integer,
    _institution_id    integer,
    _visibility        text,
    _title             text,
    _attribution       text,
    _extent            jsonb,
    _source_config     jsonb
 ) RETURNS integer AS $$

    UPDATE imagery
    SET institution_rid = _institution_id,
        visibility = _visibility,
        title = _title,
        attribution = _attribution,
        extent = _extent,
        source_config = _source_config
    WHERE imagery_uid = _imagery_id
    RETURNING imagery_uid

$$ LANGUAGE SQL;

-- Deletes all imagery associated with a project
CREATE OR REPLACE FUNCTION delete_project_imagery(_project_id integer)
 RETURNS void AS $$

    DELETE FROM project_imagery
    WHERE project_rid = _project_id

$$ LANGUAGE SQL;

-- insert into project_imagery table
CREATE OR REPLACE FUNCTION insert_project_imagery(_project_id integer, _imagery_id integer)
 RETURNS integer AS $$

    INSERT INTO project_imagery
        (project_rid, imagery_rid)
    VALUES
        (_project_id, _imagery_id)
    RETURNING project_imagery_uid

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION add_all_institution_imagery(_project_id integer)
 RETURNS void AS $$

    INSERT INTO project_imagery
        (project_rid, imagery_rid)
    SELECT _project_id, imagery_id
    FROM select_imagery_by_institution(
        (SELECT institution_rid
         FROM projects
         WHERE project_uid = _project_id),
        1
    )
    ON CONFLICT DO NOTHING

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION add_imagery_to_all_institution_projects(_imagery_id integer)
 RETURNS void AS $$

    INSERT INTO project_imagery
        (project_rid, imagery_rid)
    SELECT project_uid, _imagery_id
    FROM projects
    WHERE institution_rid = (SELECT institution_rid FROM imagery WHERE imagery_uid = _imagery_id)
    ON CONFLICT DO NOTHING

$$ LANGUAGE SQL;
