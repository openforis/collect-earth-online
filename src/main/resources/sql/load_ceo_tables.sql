-- Create tables
CREATE TABLE users (
  id        serial primary key,
  email     text not null,
  password  text not null,
  administrator boolean default false,
  reset_key text default null
);

CREATE TABLE institutions (
  id            serial primary key,
  name          text not null,
  logo          text not null,
  logo_data     bytea,
  description   text not null,
  url           text not null,
  archived      boolean default false
);

CREATE TABLE projects (
  id                        serial primary key,
  institution_id            integer not null references institutions (id) on delete cascade on update cascade,
  availability              text,
  name                      text not null,
  description               text,
  privacy_level             text,
  boundary                  geometry(Polygon,4326),
  base_map_source           text,
  plot_distribution         text,
  num_plots                 integer,
  plot_spacing              float,
  plot_shape                text,
  plot_size                 float,
  sample_distribution       text,
  samples_per_plot          integer,
  sample_resolution         float,
  sample_survey             jsonb,
  -- FIXME the file names do not need to be stored because the are calculated
  plots_csv_file            text,
  plots_shp_file            text,
  samples_csv_file          text,
  samples_shp_file          text,
  created_date              date,
  published_date              date,
  closed_date                date,
  archived_date              date,
  classification_times      jsonb,
  ts_start_year             integer default 1985,
  ts_end_year               integer,
  ts_target_day             integer default 215,
  ts_plot_size              integer default 1
);

CREATE TABLE plots (
  id            serial primary key,
  project_id    integer not null references projects (id) on delete cascade on update cascade,
  center        geometry(Point,4326),
  plotId        text,
  geom          geometry(Polygon,4326)
);

CREATE TABLE samples (
  id            serial primary key,
  plot_id       integer not null references plots (id) on delete cascade on update cascade,
  point         geometry(Point,4326),
  sampleId      text,
  geom          geometry(Polygon,4326)
);

CREATE TABLE imagery (
    id              serial primary key,
    institution_id  integer references institutions (id) on delete cascade on update cascade,
    visibility      text not null,
    title           text not null,
    attribution     text not null,
    extent          jsonb,
    source_config   jsonb
);

CREATE TABLE roles (
    id      serial primary key,
    title   text not null
);

CREATE TABLE institution_users (
    id              serial primary key,
    institution_id  integer not null references institutions (id),
    user_id         integer not null references users (id),
    role_id         integer not null references roles (id)
);

CREATE TABLE user_plots(
	id              serial primary key,
	user_id         integer not null references users (id) on delete cascade on update cascade,
    plot_id         integer not null references plots (id) on delete cascade on update cascade,
    flagged         boolean default false,
	confidence      integer CHECK (confidence >= 0 AND confidence <= 100),
	collection_time timestamp
);

CREATE TABLE sample_values(
	id             serial primary key,
	user_plot_id   integer not null references user_plots (id) on delete cascade on update cascade,
    sample_id      integer not null references samples (id) on delete cascade on update cascade,     
	imagery_id     integer references imagery (id) on delete cascade on update cascade,
	imagery_date   date,
	value          jsonb
);

CREATE TABLE project_widgets(
    id  serial primary key,
    project_id      integer not null references projects (id) on delete cascade on update cascade,
    dashboard_id    uuid,
    widget  jsonb
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
CREATE INDEX samples_plot_id on samples (plot_id);
CREATE INDEX imagery_institution_id on imagery (institution_id);
CREATE INDEX institution_users_institution_id on institution_users (institution_id);
CREATE INDEX institution_users_user_id on institution_users (user_id);
CREATE INDEX user_plots_plot_id on user_plots (plot_id);
CREATE INDEX user_plots_user_id on user_plots (user_id);
CREATE INDEX sample_values_user_plot_id on sample_values (user_plot_id);
CREATE INDEX sample_values_sample_id on sample_values (sample_id);
CREATE INDEX sample_values_imagery_id on sample_values (imagery_id);
