-- Returns all rows in imagery for which visibility = "public"
CREATE OR REPLACE FUNCTION select_public_imagery()
 RETURNS setOf imagery_return AS $$

    SELECT imagery_uid, institution_rid, visibility, title, attribution, extent, source_config
    FROM imagery
    WHERE visibility = 'public'
        AND archived = FALSE

$$ LANGUAGE SQL;

DROP FUNCTION select_public_imagery_by_institution(integer);

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
CREATE OR REPLACE FUNCTION select_imagery_by_project(_project_rid integer, _user_rid integer)
 RETURNS setOf imagery_return AS $$

    SELECT imagery_uid, p.institution_rid, visibility, title, attribution, extent, source_config
    FROM imagery i, projects p
    WHERE i.institution_rid = p.institution_rid
        AND project_uid = _project_rid
        AND archived = FALSE
        AND (visibility = 'public'
            OR (SELECT count(*) > 0
                FROM get_all_users_by_institution_id(p.institution_rid)
                WHERE user_id = _user_rid)
            OR _user_rid = 1)

    ORDER BY title

$$ LANGUAGE SQL;
