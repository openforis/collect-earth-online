-- Returns all rows in imagery associated with institution_rid
CREATE OR REPLACE FUNCTION select_imagery_by_project(_project_rid integer, _user_rid integer)
 RETURNS setOf imagery_return AS $$

    SELECT imagery_uid, p.institution_rid, visibility, title, attribution, extent, source_config
    FROM imagery i, projects p
    WHERE project_uid = _project_rid
        AND archived = FALSE
        AND (visibility = 'public'
            OR (i.institution_rid = p.institution_rid
                AND (SELECT count(*) > 0
                    FROM get_all_users_by_institution_id(p.institution_rid)
                    WHERE user_id = _user_rid))
            OR _user_rid = 1)

    ORDER BY title

$$ LANGUAGE SQL;
