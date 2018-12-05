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
    id       serial primary key,
    project_id      integer not null references projects(id) on delete cascade on update cascade,
    landuse         text NOT NULL,
    landcover       text NOT NULL,
    change_process  text NOT NULL
);
DROP INDEX IF EXISTS prjid;
CREATE UNIQUE INDEX prjid on ts_response_design (project_id);

DROP TABLE IF EXISTS ts_plot_comments cascade;
CREATE TABLE ts_plot_comments (
  id                    bigserial primary key,
  project_id            integer not null references projects(id) on update cascade,
  plot_id               integer not null references user_plots (id) on delete cascade on update cascade,
  interpreter           integer not null references users (id) on update cascade,
  comment               text,
  is_example            integer DEFAULT NULL,
  is_complete           integer DEFAULT NULL,
  is_wetland            integer DEFAULT NULL,
  uncertainty           integer DEFAULT NULL,
  last_modified_date    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  packet_id             integer default -1
);
DROP INDEX IF EXISTS comments_ppi;
CREATE UNIQUE INDEX comments_ppi ON ts_plot_comments USING btree (project_id, plot_id, interpreter, packet_id);


DROP TABLE IF EXISTS ts_vertex cascade;
CREATE TABLE ts_vertex (
  vertex_id                 bigserial PRIMARY KEY,
  project_id                integer not null references projects(id) on update cascade,
  plot_id                   integer not null references user_plots (id) on delete cascade on update cascade,
  image_year                integer DEFAULT NULL,
  image_julday              integer DEFAULT NULL,
  image_id                  text,
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
  history_flag              integer DEFAULT 0,
  packet_id                 integer DEFAULT -1
);
DROP INDEX IF EXISTS vertex_ptp;
CREATE INDEX vertex_ptp ON ts_vertex USING btree (project_id, plot_id, interpreter);


DROP TABLE IF EXISTS ts_image_preference cascade;
--TODO: with GEE as the backend, is it still necessary to keep image_year, image_julday, and priority
CREATE TABLE ts_image_preference (
    id              serial primary key,
    project_id      integer not null references projects(id) on delete cascade on update cascade,
    plot_id         integer not null,
    image_id        text,
    image_year      integer not null,
    image_julday    integer not null,
    interpreter     integer not null references users (id) on update cascade,
    "priority"      integer not null,
    packet_id       integer default -1
);
DROP INDEX IF EXISTS image_uindex_pppiip;
CREATE UNIQUE INDEX image_uindex_pppiip ON public.ts_image_preference (project_id, plot_id, image_year, interpreter, packet_id);
