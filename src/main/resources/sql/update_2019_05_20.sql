CREATE OR REPLACE FUNCTION is_institution_user_admin(_user_rid integer, _institution_rid integer)
 RETURNS boolean AS $$

    SELECT EXISTS(
        SELECT title
        FROM institution_users as iu
        INNER JOIN roles as r
            ON iu.role_rid = role_uid
        WHERE iu.user_rid = _user_rid
            AND institution_rid = _institution_rid
            AND title = 'admin'
            AND archived = TRUE
    )

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION can_user_collect(_user_rid integer, _project_uid integer)
 RETURNS boolean AS $$

    SELECT EXISTS(SELECT * FROM select_all_user_projects(_user_rid) WHERE project_id = _project_uid)

$$ LANGUAGE SQL;

-- A user can edit if editable = true.  This is the case if the user is an admin (see select_all_user_projects())
CREATE OR REPLACE FUNCTION can_user_edit(_user_rid integer, _project_uid integer)
 RETURNS boolean AS $$

    SELECT EXISTS(
        SELECT *
        FROM select_all_user_projects(_user_rid)
        WHERE project_id = _project_uid
            AND editable = true
    )

$$ LANGUAGE SQL;

-- Returns all rows in projects for a user_id with roles.
CREATE OR REPLACE FUNCTION select_all_user_projects(_user_rid integer)
 RETURNS setOf project_return AS $$

    SELECT p.*, (CASE WHEN role IS NULL THEN FALSE ELSE role = 'admin' END) AS editable
    FROM project_boundary as p
    LEFT JOIN get_institution_user_roles(_user_rid) AS roles
        USING (institution_rid)
    WHERE (role = 'admin' AND p.availability <> 'archived')
        OR (role = 'member'
            AND p.privacy_level IN ('public', 'institution', 'users')
            AND p.availability = 'published')
        OR (_user_rid > 0
            AND p.privacy_level IN ('public', 'users')
            AND p.availability = 'published')
        OR (p.privacy_level IN ('public')
            AND p.availability = 'published')
    ORDER BY project_uid

$$ LANGUAGE SQL;
