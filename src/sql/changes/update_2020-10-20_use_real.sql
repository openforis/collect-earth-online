DROP VIEW project_boundary cascade;
DROP TYPE project_return CASCADE;

ALTER TABLE projects ALTER COLUMN plot_spacing TYPE real;
ALTER TABLE projects ALTER COLUMN plot_size TYPE real;
ALTER TABLE projects ALTER COLUMN sample_resolution TYPE real;

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
    plot_spacing            real,
    plot_shape              text,
    plot_size               real,
    sample_distribution     text,
    samples_per_plot        integer,
    sample_resolution       real,
    allow_drawn_samples     boolean,
    survey_questions        jsonb,
    survey_rules            jsonb,
    classification_times    jsonb,
    valid_boundary          boolean,
    token_key               text,
    options                 jsonb,
    editable                boolean
);
