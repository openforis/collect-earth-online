CREATE OR REPLACE FUNCTION update_project(
    _project_uid             integer,
    _name                    text,
    _description             text,
    _privacy_level           text,
    _base_map_source         text
 ) RETURNS void AS $$

    UPDATE projects
    SET name = _name,
        description = _description,
        privacy_level = _privacy_level,
        base_map_source = _base_map_source
    WHERE project_uid = _project_uid

$$ LANGUAGE SQL;
