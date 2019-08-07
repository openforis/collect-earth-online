-- TS related tables
DROP TABLE IF EXISTS packets cascade;
CREATE TABLE packets (
  packet_id     integer not null,
  project_rid   integer not null references projects(project_uid) on delete cascade on update cascade,
  plot_rid      integer not null references plots(plot_uid) on delete cascade on update cascade
);
DROP INDEX IF EXISTS packets_pp;
CREATE INDEX packets_pp ON packets USING btree (project_rid, packet_id);

DROP TABLE IF EXISTS plot_comments cascade;
CREATE TABLE plot_comments (
  plot_comments_uid           bigserial primary key,
  project_rid           integer not null references projects(project_uid) on update cascade,
  plot_rid              integer not null references plots(plot_uid) on delete cascade on update cascade,
  user_rid              integer not null references users(user_uid) on update cascade,
  comment               text,
  is_example            integer DEFAULT NULL,
  is_complete           integer DEFAULT NULL,
  is_wetland            integer DEFAULT NULL,
  uncertainty           integer DEFAULT NULL,
  last_modified_date    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  packet_id             integer default -1 --references packets(packet_id) on delete cascade on update cascade
);
DROP INDEX IF EXISTS comments_ppi;
CREATE UNIQUE INDEX comments_ppi ON plot_comments USING btree (project_rid, plot_rid, user_rid, packet_id);


DROP TABLE IF EXISTS response_design cascade;
CREATE TABLE response_design (
    response_design_uid serial primary key,
    project_rid         integer not null references projects(project_uid) on delete cascade on update cascade,
    landuse             text NOT NULL,
    landcover           text NOT NULL,
    change_process      text NOT NULL
);
DROP INDEX IF EXISTS prjid;
CREATE UNIQUE INDEX prjid on response_design(project_rid);


DROP TABLE IF EXISTS vertex cascade;
CREATE TABLE vertex (
  vertex_id                 bigserial PRIMARY KEY,
  project_rid               integer not null references projects(project_uid) on update cascade,
  plot_rid                  integer not null references plots(plot_uid) on delete cascade on update cascade,
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
  user_rid               integer not null references users (user_uid) on update cascade,
  last_modified             timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  history_flag              integer DEFAULT 0,
  packet_id                integer DEFAULT -1 --references packets(packet_id) on delete cascade on update cascade
);
DROP INDEX IF EXISTS vertex_ptp;
CREATE INDEX vertex_ptp ON vertex USING btree (project_rid, plot_rid, user_rid);


DROP TABLE IF EXISTS image_preference cascade;
--TODO: with GEE as the backend, is it still necessary to keep image_year, image_julday, and priority
CREATE TABLE image_preference (
    image_preference_uid  serial primary key,
    project_rid           integer not null references projects(project_uid) on delete cascade on update cascade,
    plot_rid              integer not null,
    image_id              text,
    image_year            integer not null,
    image_julday          integer not null,
    user_rid              integer not null references users (user_uid) on update cascade,
    "priority"            integer not null,
    packet_id            integer default -1
);
DROP INDEX IF EXISTS image_uindex_pppiip;
CREATE UNIQUE INDEX image_uindex_pppiip ON image_preference (project_rid, plot_rid, image_year, user_rid, packet_id);

