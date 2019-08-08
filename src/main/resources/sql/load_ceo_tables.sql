-- Create tables
CREATE TABLE users (
    user_uid         SERIAL PRIMARY KEY,
    email            text NOT NULL UNIQUE,
    password         varchar(72) NOT NULL,
    administrator    boolean DEFAULT FALSE,
    reset_key        text DEFAULT NULL
);

CREATE TABLE institutions (
    institution_uid    SERIAL PRIMARY KEY,
    name               text NOT NULL,
    logo               text NOT NULL,
    logo_data          bytea,
    description        text NOT NULL,
    url                text NOT NULL,
    archived           boolean DEFAULT FALSE
);

CREATE TABLE projects (
    project_uid             SERIAL PRIMARY KEY,
    institution_rid         integer NOT NULL REFERENCES institutions (institution_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    availability            text,
    name                    text NOT NULL,
    description             text,
    privacy_level           text,
    boundary                geometry(Polygon,4326),
    base_map_source         text,
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
    plots_ext_table         text,
    samples_ext_table       text,
    created_date            date,
    published_date          date,
    closed_date             date,
    archived_date           date,
    classification_times    jsonb,
    ts_start_year           integer DEFAULT 1985,
    ts_end_year             integer,
    ts_target_day           integer DEFAULT 215,
    ts_plot_size            integer DEFAULT 1
);

CREATE TABLE plots (
    plot_uid       SERIAL PRIMARY KEY,
    project_rid    integer NOT NULL REFERENCES projects (project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    center         geometry(Point,4326),
    ext_id         integer
);

CREATE TABLE samples (
    sample_uid    SERIAL PRIMARY KEY,
    plot_rid      integer NOT NULL REFERENCES plots (plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    point         geometry(Point,4326),
    ext_id        integer
);

CREATE TABLE imagery (
    imagery_uid        SERIAL PRIMARY KEY,
    institution_rid    integer REFERENCES institutions (institution_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    visibility         text NOT NULL,
    title              text NOT NULL,
    attribution        text NOT NULL,
    extent             jsonb,
    source_config      jsonb
);

CREATE TABLE roles (
    role_uid    SERIAL PRIMARY KEY,
    title       text NOT NULL
);

CREATE TABLE institution_users (
    inst_user_uid      SERIAL PRIMARY KEY,
    institution_rid    integer NOT NULL REFERENCES institutions (institution_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    user_rid           integer NOT NULL REFERENCES users (user_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    role_rid           integer NOT NULL REFERENCES roles (role_uid),
    CONSTRAINT per_institution_per_plot UNIQUE(institution_rid, user_rid)
);

CREATE TABLE user_plots (
    user_plot_uid       SERIAL PRIMARY KEY,
    user_rid            integer NOT NULL REFERENCES users (user_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    plot_rid            integer NOT NULL REFERENCES plots (plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    packet_rid          integer DEFAULT NULL REFERENCES packets (packet_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    flagged             boolean DEFAULT FALSE,
    confidence          integer CHECK (confidence >= 0 AND confidence <= 100),
    collection_start    timestamp,
    collection_time     timestamp,
    CONSTRAINT per_user_per_plot UNIQUE(user_rid, plot_rid)
);

CREATE TABLE sample_values (
    sample_value_uid      SERIAL PRIMARY KEY,
    user_plot_rid         integer NOT NULL REFERENCES user_plots (user_plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    sample_rid            integer NOT NULL REFERENCES samples (sample_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    imagery_rid           integer REFERENCES imagery (imagery_uid),
    imagery_attributes    jsonb,
    value                 jsonb,
    CONSTRAINT per_sample_per_user UNIQUE(sample_rid, user_plot_rid)
);

CREATE TABLE plot_locks (
    user_rid    integer NOT NULL REFERENCES users(user_uid),
    plot_rid    integer NOT NULL REFERENCES plots(plot_uid),
    lock_end    timestamp,
    PRIMARY KEY(user_rid, plot_rid)
);

CREATE TABLE project_widgets (
    widget_uid      SERIAL PRIMARY KEY,
    project_rid     integer NOT NULL REFERENCES projects (project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    dashboard_id    uuid,
    widget          jsonb
);

CREATE INDEX project_widgets_project_rid ON project_widgets (project_rid);
CREATE INDEX project_widgets_dashboard_id ON project_widgets (dashboard_id);

-- Indecies on FK
CREATE INDEX plots_projects_rid ON plots (project_rid);
CREATE INDEX samples_plot_rid ON samples (plot_rid);
CREATE INDEX imagery_institution_rid ON imagery (institution_rid);
CREATE INDEX institution_users_institution_rid ON institution_users (institution_rid);
CREATE INDEX institution_users_user_rid ON institution_users (user_rid);
CREATE INDEX user_plots_plot_rid ON user_plots (plot_rid);
CREATE INDEX user_plots_user_rid ON user_plots (user_rid);
CREATE INDEX sample_values_user_plot_rid ON sample_values (user_plot_rid);
CREATE INDEX sample_values_sample_rid ON sample_values (sample_rid);
CREATE INDEX sample_values_imagery_rid ON sample_values (imagery_rid);

-- Schema for external tables
CREATE SCHEMA ext_tables;
