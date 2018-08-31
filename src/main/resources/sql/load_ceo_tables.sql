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
  classification_timestep   integer,
  ts_start_year             integer default 1985,
  ts_end_year               integer,
  ts_target_day             integer default 215,
  ts_plot_size              integer default 1
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



-- TS related tables
DROP TABLE IF EXISTS ts_packets cascade;
CREATE TABLE ts_packets (
	id             serial primary key,
    project_id     integer not null references projects(id) on delete cascade on update cascade,
	packet_id      integer not null,
    plot_id        integer not null references user_plots (id) on delete cascade on update cascade
);
CREATE INDEX packets_pp ON ts_packets USING btree (project_id, packet_id);


DROP TABLE IF EXISTS ts_project_user cascade;
CREATE TABLE ts_project_user (
  id            bigserial primary key,
  project_id    integer not null references projects(id) on delete cascade on update cascade,
  packet_id     integer DEFAULT NULL,
  user_id       integer not null references users (id) on delete cascade on update cascade,
  date_assigned timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  isactive      integer DEFAULT 1,
  complete_date timestamp NULL DEFAULT NULL
);

DROP TABLE IF EXISTS ts_response_design cascade;
CREATE TABLE ts_response_design (
    id_design       serial primary key,
    project_id      integer not null references projects(id) on delete cascade on update cascade,
    landuse         text NOT NULL,
    landcover       text NOT NULL,
    change_process  text NOT NULL
);

DROP TABLE IF EXISTS ts_plot_comments cascade;
CREATE TABLE ts_plot_comments (
  id                    bigserial primary key,
  project_id            integer not null references projects(id) on update cascade,
  plot_id               integer not null references user_plots (id) on delete cascade on update cascade,
  interpreter           integer not null references users (id) on update cascade,
  comment               text,
  is_example            bit DEFAULT NULL,
  is_complete           bit DEFAULT NULL,
  is_wetland            bit DEFAULT NULL,
  uncertainty           smallint DEFAULT NULL,
  last_modified_date    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP INDEX IF EXISTS comments_ppi;
CREATE INDEX comments_ppi ON ts_plot_comments USING btree (project_id, plot_id, interpreter);


DROP TABLE IF EXISTS ts_vertex cascade;
CREATE TABLE ts_vertex (
  vertex_id                 bigserial PRIMARY KEY,
  project_id                integer not null references projects(id) on update cascade,
  plot_id                   integer not null references user_plots (id) on delete cascade on update cascade,
  image_year                integer DEFAULT NULL,
  image_julday              integer DEFAULT NULL,
  dominant_landuse          varchar(50) DEFAULT NULL,
  secondary_landuse         varchar(50) DEFAULT NULL,
  dominant_landuse_notes    text,
  secondary_landuse_notes   text,
  dominant_landcover        varchar(50) DEFAULT NULL,
  secondary_landcover       varchar(50) DEFAULT NULL,
  dominant_landcover_notes  text,
  secondary_landcover_notes text,
  landcover_ephemeral       smallint DEFAULT NULL,
  change_process            varchar(30) DEFAULT NULL,
  change_process_notes      varchar(255) DEFAULT NULL,
  comments                  varchar(255) DEFAULT NULL,
  interpreter               integer not null references users (id) on update cascade,
  last_modified             timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  history_flag              integer DEFAULT 0
);
DROP INDEX IF EXISTS vertex_ptp;
CREATE INDEX vertex_ptp ON ts_vertex USING btree (project_id, plot_id, interpreter);


DROP TABLE IF EXISTS ts_image_preference cascade;
CREATE TABLE ts_image_preference (
    id              serial primary key,
    project_id      integer not null references projects(id) on delete cascade on update cascade,
    plot_id         integer not null,
    image_year      integer not null,
    image_julday    integer not null,
    interpreter     integer not null references users (id) on update cascade,
    "priority"      integer not null
);
DROP INDEX IF EXISTS image_ppii;
CREATE INDEX image_ppii ON ts_image_preference USING btree (project_id, plot_id, image_year, interpreter);