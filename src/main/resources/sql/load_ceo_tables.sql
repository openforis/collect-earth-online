-- Create tables
CREATE TABLE users (
  id        serial primary key,
  email     text not null,
  password  text not null,
  role      text not null,
  reset_key text
);

CREATE TABLE institutions (
  id            serial primary key,
  name          text not null,
  logo          text not null,
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
  classification_start_date	date,
  classification_end_date   date,
  classification_timestep   integer
);

CREATE TABLE plots (
  id         serial primary key,
  project_id integer not null references projects (id) on delete cascade on update cascade,
  center     geometry(Point,4326),
  flagged    integer default 0,
  assigned   integer default 0
);

CREATE TABLE samples (
  id      serial primary key,
  plot_id integer not null references plots (id) on delete cascade on update cascade,
  point   geometry(Point,4326)
);

CREATE TABLE imagery (
    id              serial primary key,
    institution_id  integer references institutions (id) on delete cascade on update cascade,
    visibility      text not null,
    title           text not null,
    attribution     text not null,
    extent          geometry(Polygon,4326),
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
	confidence      integer default 0 CHECK (confidence > 0 AND confidence < 100),
	collection_time timestamp with time zone default now()
);

CREATE TABLE sample_values(
	id             serial primary key,
	user_plot_id   integer not null references user_plots (id) on delete cascade on update cascade,
    sample_id      integer not null references samples (id) on delete cascade on update cascade,     
	imagery_id     integer not null references imagery (id) on delete cascade on update cascade,
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