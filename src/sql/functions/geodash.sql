-- NAMESPACE: geodash
-- REQUIRES: clear, project

--
--  WIDGET FUNCTIONS
--

-- Adds a project_widget to the database
CREATE OR REPLACE FUNCTION add_project_widget(_project_id integer, _dashboard_id uuid, _widget jsonb)
 RETURNS integer AS $$

    INSERT INTO project_widgets
        (project_rid, dashboard_id, widget)
    VALUES
        (_project_id, _dashboard_id , _widget)
    RETURNING widget_uid

$$ LANGUAGE SQL;

-- Deletes a project_widget from the database
CREATE OR REPLACE FUNCTION delete_project_widget_by_widget_id(_widget_uid integer, _dashboard_id uuid)
 RETURNS integer AS $$

    DELETE FROM project_widgets
    WHERE dashboard_id = _dashboard_id
        AND CAST(jsonb_extract_path_text(widget, 'id') as int) = _widget_uid
    RETURNING widget_uid

$$ LANGUAGE SQL;

-- Gets project widgets by project id from the database
CREATE OR REPLACE FUNCTION get_project_widgets_by_project_id(_project_id integer)
 RETURNS table (
    widget_id        integer,
    project_id       integer,
    dashboard_id     uuid,
    widget           jsonb,
    project_title    text
 ) AS $$

    SELECT widget_uid, project_uid, dashboard_id, widget, p.name
    FROM project_widgets pw
    INNER JOIN projects p
        ON project_uid = project_rid
    WHERE project_rid = _project_id

$$ LANGUAGE SQL;

-- Updates a project_widget from the database
CREATE OR REPLACE FUNCTION update_project_widget_by_widget_id(_widget_uid integer, _dash_id uuid, _widget jsonb)
 RETURNS integer AS $$

    UPDATE project_widgets
    SET widget = _widget
    WHERE CAST(jsonb_extract_path_text(widget, 'id') as int) = _widget_uid
        AND dashboard_id = _dash_id
    RETURNING widget_uid

$$ LANGUAGE SQL;
