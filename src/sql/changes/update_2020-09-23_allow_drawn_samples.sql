ALTER TABLE projects ADD COLUMN allow_drawn_samples boolean;

UPDATE projects SET allow_drawn_samples = false;

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
    allow_drawn_samples     boolean,
    survey_questions        jsonb,
    survey_rules            jsonb,
    classification_times    jsonb,
    valid_boundary          boolean,
    token_key               text,
    options                 jsonb,
    editable                boolean
);
