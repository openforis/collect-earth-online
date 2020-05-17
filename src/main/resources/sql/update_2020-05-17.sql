DROP FUNCTION update_project(
    _project_uid             integer,
    _name                    text,
    _description             text,
    _privacy_level           text,
    _base_map_source         text
);

-- Update select set of project fields
CREATE FUNCTION update_project(
    _project_uid             integer,
    _name                    text,
    _description             text,
    _privacy_level           text,
    _base_map_source         text,
    _show_gee_script         boolean
 ) RETURNS void AS $$

    UPDATE projects
    SET name = _name,
        description = _description,
        privacy_level = _privacy_level,
        base_map_source = _base_map_source,
        options = jsonb_set(options, '{showGEEScript}', _show_gee_script::text::jsonb)
    WHERE project_uid = _project_uid

$$ LANGUAGE SQL;
