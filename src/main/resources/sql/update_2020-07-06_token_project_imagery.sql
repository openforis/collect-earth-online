DROP FUNCTION select_imagery_by_project(_project_rid integer, _user_rid integer);

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
                        WHERE user_id = _user_rid))
                     OR (token_key IS NOT NULL AND token_key = _token_key))
            OR _user_rid = 1)

    ORDER BY title

$$ LANGUAGE SQL;
