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
    )

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION can_user_collect(_user_rid integer, _project_uid integer)
 RETURNS boolean AS $$

    SELECT EXISTS(SELECT * FROM select_all_user_projects(_user_rid) WHERE project_id = _project_uid)

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION can_user_edit(_user_rid integer, _project_uid integer)
 RETURNS boolean AS $$

    SELECT EXISTS(
        SELECT *
        FROM select_all_user_projects(_user_rid)
        WHERE project_id = _project_uid
            AND editable = true
    )

$$ LANGUAGE SQL;
