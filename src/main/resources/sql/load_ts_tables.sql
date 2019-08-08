-- TS related tables
DROP TABLE IF EXISTS packets cascade;
CREATE TABLE packets (
  packet_uid    serial primary key,
  project_rid   integer not null references projects(project_uid) on delete cascade on update cascade,
  title         varchar(12) not null,
  created_date  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP INDEX IF EXISTS packets_project_rid_packet_label;
CREATE UNIQUE INDEX packets_project_rid_packet_label on packets USING btree(project_rid, title);

DROP TABLE IF EXISTS packet_users;
CREATE TABLE packet_users (
  packet_user_uid serial primary key,
  packet_rid      integer DEFAULT NULL references packets(packet_uid) on delete cascade on update cascade,
  user_rid        integer not null references users(user_uid) on delete cascade on update cascade
)
DROP INDEX IF EXISTS packet_users_packet_rid_user_rid;
CREATE UNIQUE INDEX packet_users_packet_rid_user_rid on packet_users USING btree (user_rid, packet_rid);

DROP TABLE IF EXISTS packet_plots;
CREATE TABLE packet_plots (
  packet_plot_uid serial primary key,
  packet_rid      integer not null references packets(packet_uid) on delete cascade on update cascade,
  plot_rid        integer not null references plots(plot_uid) on delete cascade on update cascade
)
DROP INDEX IF EXISTS packet_plots_packet_rid_plot_rid 
CREATE UNIQUE INDEX packet_plots_packet_rid_plot_rid on packet_plots USING btree (packet_rid, plot_rid);

DROP TABLE IF EXISTS plot_comments cascade;
CREATE TABLE plot_comments (
  plot_comments_uid     bigserial primary key,
  project_rid           integer not null references projects(project_uid) on update cascade,
  plot_rid              integer not null references plots(plot_uid) on delete cascade on update cascade,
  user_rid              integer not null references users(user_uid) on update cascade,
  comment               text,
  is_example            integer DEFAULT NULL,
  is_complete           integer DEFAULT NULL,
  is_wetland            integer DEFAULT NULL,
  uncertainty           integer DEFAULT NULL,
  last_modified_date    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  packet_rid            integer default NULL references packets(packet_uid) on delete cascade on update cascade
);
DROP INDEX IF EXISTS plot_comments_project_plot_user_packet;
CREATE UNIQUE INDEX plot_comments_project_plot_user_packet ON plot_comments USING btree (project_rid, plot_rid, user_rid, packet_rid);

DROP TABLE IF EXISTS vertex cascade;
CREATE TABLE vertex (
  vertex_uid                bigserial PRIMARY KEY,
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
  user_rid                  integer not null references users (user_uid) on update cascade,
  last_modified             timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  history_flag              integer DEFAULT 0,
  packet_rid                integer DEFAULT NULL references packets(packet_uid) on delete cascade on update cascade
);
DROP INDEX IF EXISTS vertex_project_rid_plot_rid_user_rid;
CREATE INDEX vertex_project_plot_user_packet ON vertex USING btree (project_rid, plot_rid, user_rid, packet_rid);


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
    packet_rid            integer DEFAULT NULL references packets(packet_uid) on delete cascade on update cascade
);
DROP INDEX IF EXISTS image_preference_project_plot_year_user_packet;
CREATE UNIQUE INDEX image_preference_project_plot_year_user_packet ON image_preference (project_rid, plot_rid, image_year, user_rid, packet_rid);
