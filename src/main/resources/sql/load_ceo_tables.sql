-- Create tables
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         text NOT NULL UNIQUE,
    password      text NOT NULL,
    administrator boolean DEFAULT FALSE,
    reset_key     text DEFAULT NULL
);

CREATE TABLE institutions (
    id            SERIAL PRIMARY KEY,
    name          text NOT NULL,
    logo          text NOT NULL,
    logo_data     bytea,
    description   text NOT NULL,
    url           text NOT NULL,
    archived      boolean DEFAULT FALSE
);

CREATE TABLE projects (
    id                      SERIAL PRIMARY KEY,
    institution_id          integer NOT NULL REFERENCES institutions (id) ON DELETE CASCADE ON UPDATE CASCADE,
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
    id            SERIAL PRIMARY KEY,
    project_id    integer NOT NULL REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
    center        geometry(Point,4326),
    ext_id        integer
);

CREATE TABLE samples (
    id         SERIAL PRIMARY KEY,
    plot_id    integer NOT NULL REFERENCES plots (id) ON DELETE CASCADE ON UPDATE CASCADE,
    point      geometry(Point,4326),
    ext_id     integer
);

CREATE TABLE imagery (
    id                SERIAL PRIMARY KEY,
    institution_id    integer REFERENCES institutions (id) ON DELETE CASCADE ON UPDATE CASCADE,
    visibility        text NOT NULL,
    title             text NOT NULL,
    attribution       text NOT NULL,
    extent            jsonb,
    source_config     jsonb
);

CREATE TABLE roles (
    id       SERIAL PRIMARY KEY,
    title    text NOT NULL
);

CREATE TABLE institution_users (
    id                SERIAL PRIMARY KEY,
    institution_id    integer NOT NULL REFERENCES institutions (id),
    user_id           integer NOT NULL REFERENCES users (id),
    role_id          integer NOT NULL REFERENCES roles (id),
    CONSTRAINT per_institution_per_plot UNIQUE(institution_id, user_id)
);

CREATE TABLE user_plots(
    id                  SERIAL PRIMARY KEY,
    user_id             integer NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    plot_id             integer NOT NULL REFERENCES plots (id) ON DELETE CASCADE ON UPDATE CASCADE,
    flagged             boolean DEFAULT FALSE,
    confidence          integer CHECK (confidence >= 0 AND confidence <= 100),
    collection_start    timestamp,
    collection_time     timestamp,
    CONSTRAINT per_user_per_plot UNIQUE(user_id, plot_id)
);

CREATE TABLE sample_values(
    id                    SERIAL PRIMARY KEY,
    user_plot_id          integer NOT NULL REFERENCES user_plots (id) ON DELETE CASCADE ON UPDATE CASCADE,
    sample_id             integer NOT NULL REFERENCES samples (id) ON DELETE CASCADE ON UPDATE CASCADE,
    imagery_id            integer REFERENCES imagery (id) ON DELETE CASCADE ON UPDATE CASCADE,
    imagery_attributes    jsonb,
    value                 jsonb,
    CONSTRAINT per_sample_per_user UNIQUE(sample_id, user_plot_id)
);

CREATE TABLE plot_locks(
    user_id     integer NOT NULL REFERENCES users(id),
    plot_id     integer NOT NULL REFERENCES plots(id),
    lock_end    timestamp,
    PRIMARY KEY(user_id, plot_id)
);

CREATE TABLE project_widgets(
    id              SERIAL PRIMARY KEY,
    project_id      integer NOT NULL REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
    dashboard_id    uuid,
    widget          jsonb
);


CREATE INDEX projects_id ON projects (id);
CREATE INDEX plots_id ON plots (id);
CREATE INDEX samples_id ON samples (id);
CREATE INDEX imagery_id ON imagery (id);
CREATE INDEX users_id ON users (id);
CREATE INDEX institutions_id ON institutions (id);
CREATE INDEX institution_users_id ON institution_users (id);
CREATE INDEX roles_id ON roles (id);
CREATE INDEX user_plots_id ON user_plots (id);
CREATE INDEX sample_values_id ON sample_values (id);
CREATE INDEX project_widgets_project_id ON project_widgets (project_id);
CREATE INDEX project_widgets_dashboard_id ON project_widgets (dashboard_id);

--indecies on FK
CREATE INDEX plots_projects_id ON plots (project_id);
CREATE INDEX samples_plot_id ON samples (plot_id);
CREATE INDEX imagery_institution_id ON imagery (institution_id);
CREATE INDEX institution_users_institution_id ON institution_users (institution_id);
CREATE INDEX institution_users_user_id ON institution_users (user_id);
CREATE INDEX user_plots_plot_id ON user_plots (plot_id);
CREATE INDEX user_plots_user_id ON user_plots (user_id);
CREATE INDEX sample_values_user_plot_id ON sample_values (user_plot_id);
CREATE INDEX sample_values_sample_id ON sample_values (sample_id);
CREATE INDEX sample_values_imagery_id ON sample_values (imagery_id);
