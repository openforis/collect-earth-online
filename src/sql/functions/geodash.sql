-- NAMESPACE: geodash
-- REQUIRES: clear, project

--
--  WIDGET FUNCTIONS
--

-- Gets project widgets by project id from the database
CREATE OR REPLACE FUNCTION get_project_widgets_by_project_id(_project_id integer)
 RETURNS table (
    widget_id    integer,
    widget       jsonb
 ) AS $$

    SELECT widget_uid, widget
    FROM project_widgets
    WHERE project_rid = _project_id

$$ LANGUAGE SQL;

-- Adds a project_widget to the database
CREATE OR REPLACE FUNCTION add_project_widget(_project_id integer, _widget jsonb)
 RETURNS integer AS $$

    INSERT INTO project_widgets
        (project_rid, widget)
    VALUES
        (_project_id, _widget)
    RETURNING widget_uid

$$ LANGUAGE SQL;

-- Updates a project_widget from the database
CREATE OR REPLACE FUNCTION update_project_widget_by_widget_id(_widget_id integer, _widget jsonb)
 RETURNS void AS $$

    UPDATE project_widgets
    SET widget = _widget
    WHERE widget_uid = _widget_id

$$ LANGUAGE SQL;

-- Deletes a project_widget from the database
CREATE OR REPLACE FUNCTION delete_project_widget_by_widget_id( _widget_id integer)
 RETURNS void AS $$

    DELETE FROM project_widgets
    WHERE widget_uid = _widget_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION copy_project_widgets(_from_project_id integer, _to_project_id integer)
 RETURNS void AS $$

    INSERT INTO project_widgets
        (project_rid, widget)
    SELECT _to_project_id, widget
    FROM project_widgets
    WHERE project_rid = _from_project_id

$$ LANGUAGE SQL;
