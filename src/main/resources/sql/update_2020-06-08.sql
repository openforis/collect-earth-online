DROP FUNCTION create_project_migration(
    _project_uid             integer,
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
    _classification_times    jsonb,
    _created_date            date,
    _published_date          date,
    _closed_date             date,
    _archived_date           date
);

CREATE FUNCTION create_project_migration(
    _project_uid             integer,
    _institution_rid         integer,
    _availability            text,
    _name                    text,
    _description             text,
    _privacy_level           text,
    _boundary                geometry,
    _imagery_rid             integer,
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
    _classification_times    jsonb,
    _created_date            date,
    _published_date          date,
    _closed_date             date,
    _archived_date           date,
    _options                 jsonb
 ) RETURNS integer AS $$

    INSERT INTO projects (
        project_uid,             institution_rid,
        availability,            name,
        description,             privacy_level,
        boundary,                imagery_rid,
        plot_distribution,       num_plots,
        plot_spacing,            plot_shape,
        plot_size,               sample_distribution,
        samples_per_plot,        sample_resolution,
        survey_questions,        survey_rules,
        classification_times,    created_date,
        published_date,          closed_date,
        archived_date,           options
    ) VALUES (
        _project_uid,             _institution_rid,
        _availability,            _name,
        _description,             _privacy_level,
        _boundary,                _imagery_rid,
        _plot_distribution,       _num_plots,
        _plot_spacing,            _plot_shape,
        _plot_size,               _sample_distribution,
        _samples_per_plot,        _sample_resolution,
        _survey_questions,        _survey_rules,
        _classification_times,    _created_date,
        _published_date,          _closed_date,
        _archived_date,           _options
    ) RETURNING project_uid

$$ LANGUAGE SQL;

DROP FUNCTION copy_project_plots_stats(_old_project_uid integer, _new_project_uid integer);

-- Copy other project fields that may not have been correctly passed from UI
CREATE FUNCTION copy_project_plots_stats(_old_project_uid integer, _new_project_uid integer)
 RETURNS void AS $$

    UPDATE projects
    SET boundary = n.boundary,
        imagery_rid = n.imagery_rid,
        plot_distribution = n.plot_distribution,
        num_plots = n.num_plots,
        plot_spacing = n.plot_spacing,
        plot_shape = n.plot_shape,
        plot_size = n.plot_size,
        sample_distribution = n.sample_distribution,
        samples_per_plot = n.samples_per_plot,
        sample_resolution = n.sample_resolution
    FROM (SELECT
            boundary,             imagery_rid,
            plot_distribution,    num_plots,
            plot_spacing,         plot_shape,
            plot_size,            sample_distribution,
            samples_per_plot,     sample_resolution
         FROM projects
         WHERE project_uid = _old_project_uid) n
    WHERE
        project_uid = _new_project_uid

$$ LANGUAGE SQL;
