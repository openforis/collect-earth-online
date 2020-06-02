-- Returns first public imagery
CREATE FUNCTION select_first_public_imagery()
 RETURNS integer AS $$

    SELECT imagery_uid
    FROM imagery
    WHERE visibility = 'public'
    ORDER BY imagery_uid
    LIMIT 1

$$ LANGUAGE SQL;

-- add imagery_rid
ALTER TABLE projects
ADD COLUMN imagery_rid integer REFERENCES imagery (imagery_uid);

-- projects utilizing public imagery
UPDATE projects
SET imagery_rid = imagery.imagery_uid
FROM imagery
WHERE projects.base_map_source = imagery.title
    AND imagery.visibility = 'public';

-- projects for the institution utilizing private imagery
UPDATE projects
SET imagery_rid = imagery.imagery_uid
FROM imagery
WHERE projects.base_map_source = imagery.title
    AND imagery.visibility = 'private'
    AND projects.institution_rid = imagery.institution_rid;

-- projects without base_map_source
UPDATE projects
SET imagery_rid = (
    SELECT imagery_uid
    FROM imagery
    WHERE visibility = 'public'
    ORDER BY imagery_uid
    LIMIT 1
)
WHERE base_map_source = '';

-- projects where the base_map_source is not available in the imagery table
UPDATE projects
SET imagery_rid = (
    SELECT imagery_uid
    FROM imagery
    WHERE visibility = 'public'
    ORDER BY imagery_uid
    LIMIT 1
)
WHERE base_map_source NOT IN (
	SELECT title FROM imagery
);

-- update where base_map_source is PlanetGlobalMosaic
UPDATE projects
SET imagery_rid = (
    SELECT imagery_uid
    FROM imagery
    WHERE title='PlanetGlobalMosaic'
        AND institution_rid=3
    LIMIT 1
)
WHERE base_map_source = 'PlanetGlobalMosaic';

-- drop base_map_source
ALTER TABLE projects
DROP COLUMN base_map_source CASCADE;

DROP FUNCTION create_project(
    _institution_rid         integer,
    _availability            text,
    _name                    text,
    _description             text,
    _privacy_level           text,
    _boundary                geometry,
    _base_map_source         text,
    _plot_distribution       text,
    _num_plots               integer,
    _plot_spacing            float,
    _plot_shape              text,
    _plot_size               float,
    _sample_distribution     text,
    _samples_per_plot        integer,
    _sample_resolution       float,
    _survey_questions        jsonb,
    _survey_rules            jsonb,
    _created_date            date,
    _classification_times    jsonb,
    _token_key               text,
    _options                 jsonb
);

CREATE FUNCTION create_project(
    _institution_rid         integer,
    _imagery_rid             integer,
    _availability            text,
    _name                    text,
    _description             text,
    _privacy_level           text,
    _boundary                geometry,
    _plot_distribution       text,
    _num_plots               integer,
    _plot_spacing            float,
    _plot_shape              text,
    _plot_size               float,
    _sample_distribution     text,
    _samples_per_plot        integer,
    _sample_resolution       float,
    _survey_questions        jsonb,
    _survey_rules            jsonb,
    _created_date            date,
    _classification_times    jsonb,
    _token_key               text,
    _options                 jsonb
 ) RETURNS integer AS $$

    INSERT INTO projects (
        institution_rid,        imagery_rid,
        availability,           name,
        description,            privacy_level,
        boundary,               plot_distribution,
        num_plots,              plot_spacing,
        plot_shape,             plot_size,
        sample_distribution,    samples_per_plot,
        sample_resolution,      survey_questions,
        survey_rules,           created_date,
        classification_times,   token_key,
        options
    ) VALUES (
        _institution_rid,       _imagery_rid,
        _availability,           _name,
        _description,            _privacy_level,
        _boundary,               _plot_distribution,
        _num_plots,              _plot_spacing,
        _plot_shape,             _plot_size,
        _sample_distribution,    _samples_per_plot,
        _sample_resolution,      _survey_questions,
        _survey_rules,           _created_date,
        _classification_times,   _token_key,
        _options
    ) RETURNING project_uid

$$ LANGUAGE SQL;

DROP FUNCTION update_project(
    _project_uid             integer,
    _name                    text,
    _description             text,
    _privacy_level           text,
    _base_map_source         text,
    _options                 jsonb
);

-- Update select set of project fields
CREATE FUNCTION update_project(
    _project_uid             integer,
    _name                    text,
    _description             text,
    _privacy_level           text,
    _imagery_rid             integer,
    _options                 jsonb
 ) RETURNS void AS $$

    UPDATE projects
    SET name = _name,
        description = _description,
        privacy_level = _privacy_level,
        imagery_rid = _imagery_rid,
        options = _options
    WHERE project_uid = _project_uid

$$ LANGUAGE SQL;

CREATE VIEW project_boundary AS
SELECT
    project_uid,
    institution_rid,
    imagery_rid,
    availability,
    name,
    description,
    privacy_level,
    ST_AsGeoJSON(boundary),
    plot_distribution,
    num_plots,
    plot_spacing,
    plot_shape,
    plot_size,
    sample_distribution,
    samples_per_plot,
    sample_resolution,
    survey_questions,
    survey_rules,
    classification_times,
    valid_boundary(boundary),
    token_key,
    options
FROM projects;

DROP TYPE project_return CASCADE;

CREATE TYPE project_return AS (
    project_id              integer,
    institution_id          integer,
    imagery_id              integer,
    availability            text,
    name                    text,
    description             text,
    privacy_level           text,
    boundary                text,
    plot_distribution       text,
    num_plots               integer,
    plot_spacing            float,
    plot_shape              text,
    plot_size               float,
    sample_distribution     text,
    samples_per_plot        integer,
    sample_resolution       float,
    survey_questions        jsonb,
    survey_rules            jsonb,
    classification_times    jsonb,
    valid_boundary          boolean,
    token_key               text,
    options                 jsonb,
    editable                boolean
);

-- Returns a row in projects by id
CREATE FUNCTION select_project(_project_uid integer)
 RETURNS setOf project_return AS $$

    SELECT *, FALSE as editable
    FROM project_boundary
    WHERE project_uid = _project_uid

$$ LANGUAGE SQL;

-- Returns all public projects
CREATE FUNCTION select_all_projects()
 RETURNS setOf project_return AS $$

    SELECT *, FALSE AS editable
    FROM project_boundary
    WHERE privacy_level = 'public'
      AND availability = 'published'
    ORDER BY project_uid

$$ LANGUAGE SQL;

-- Returns projects for institution_rid
CREATE FUNCTION select_all_institution_projects(_institution_rid integer)
 RETURNS setOf project_return AS $$

    SELECT *
    FROM select_all_projects()
    WHERE institution_id = _institution_rid
    ORDER BY project_id

$$ LANGUAGE SQL;

-- Returns all rows in projects for a user_id with roles
CREATE FUNCTION select_all_user_projects(_user_rid integer)
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

-- Returns all rows in projects for a user_id and institution_rid with roles
CREATE FUNCTION select_institution_projects_with_roles( _user_rid integer, _institution_rid integer)
 RETURNS setOf project_return AS $$

    SELECT *
    FROM select_all_user_projects(_user_rid)
    WHERE institution_id = _institution_rid
    ORDER BY project_id

$$ LANGUAGE SQL;
