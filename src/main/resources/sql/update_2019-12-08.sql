-- add token_key to projects
ALTER TABLE projects ADD COLUMN token_key text DEFAULT NULL;

-- Remove and recreate a project

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
    _classification_times    jsonb
 );

CREATE FUNCTION create_project(
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
    _token_key               text
 ) RETURNS integer AS $$

    INSERT INTO projects (
        institution_rid,        availability,
        name,                   description,
        privacy_level,          boundary,
        base_map_source,        plot_distribution,
        num_plots,              plot_spacing,
        plot_shape,             plot_size,
        sample_distribution,    samples_per_plot,
        sample_resolution,      survey_questions,
        survey_rules,           created_date,
        classification_times,   token_key
    ) VALUES (
        _institution_rid,        _availability,
        _name,                   _description,
        _privacy_level,          _boundary,
        _base_map_source,        _plot_distribution,
        _num_plots,              _plot_spacing,
        _plot_shape,             _plot_size,
        _sample_distribution,    _samples_per_plot,
        _sample_resolution,      _survey_questions,
        _survey_rules,           _created_date,
        _classification_times,   _token_key
    ) RETURNING project_uid

$$ LANGUAGE SQL;

--
ALTER TYPE project_return DROP ATTRIBUTE editable;
ALTER TYPE project_return ADD ATTRIBUTE token_key text;
ALTER TYPE project_return ADD ATTRIBUTE editable boolean;

--
CREATE OR REPLACE VIEW project_boundary AS
    SELECT
        project_uid,
        institution_rid,
        availability,
        name,
        description,
        privacy_level,
        ST_AsGeoJSON(boundary),
        base_map_source,
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
        token_key
    FROM projects;
