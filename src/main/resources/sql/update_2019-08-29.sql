--add packet_rid to user_plots
ALTER TABLE user_plots ADD packet_rid integer NULL REFERENCES packets (packet_uid) ON DELETE CASCADE ON UPDATE CASCADE;

-- Stores information about plot packet
CREATE TABLE packets (
    packet_uid    serial PRIMARY KEY,
    project_rid   integer NOT NULL REFERENCES projects(project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    title         varchar(12) NOT NULL,
    created_date  timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE packet_users (
    packet_user_uid serial PRIMARY KEY,
    packet_rid      integer NOT NULL REFERENCES packets(packet_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    user_rid        integer NOT NULL REFERENCES users(user_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE packet_plots (
    packet_plot_uid serial PRIMARY KEY,
    packet_rid      integer NOT NULL REFERENCES packets(packet_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    plot_rid        integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Stores timesync comment for plot
CREATE TABLE plot_comments (
    plot_comments_uid     bigserial PRIMARY KEY,
    project_rid           integer NOT NULL REFERENCES projects(project_uid) ON UPDATE CASCADE,
    plot_rid              integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    user_rid              integer NOT NULL REFERENCES users(user_uid) ON UPDATE CASCADE,
    packet_rid            integer DEFAULT NULL REFERENCES packets(packet_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    comment               text,
    is_example            integer DEFAULT NULL,
    is_complete           integer DEFAULT NULL,
    is_wetland            integer DEFAULT NULL,
    uncertainty           integer DEFAULT NULL,
    last_modified_date    timestamp NOT NULL DEFAULT current_timestamp
);

-- Stores vertex information
CREATE TABLE vertex (
    vertex_uid                bigserial PRIMARY KEY,
    project_rid               integer NOT NULL REFERENCES projects(project_uid) ON UPDATE CASCADE,
    plot_rid                  integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    user_rid                  integer NOT NULL REFERENCES users (user_uid) ON UPDATE CASCADE,
    packet_rid                integer DEFAULT NULL references packets(packet_uid) ON DELETE CASCADE ON UPDATE CASCADE,
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
    last_modified             timestamp NOT NULL DEFAULT current_timestamp,
    history_flag              integer DEFAULT 0
);

-- Stores user preference for selected image for interpretation
CREATE TABLE image_preference (
    image_preference_uid  serial PRIMARY KEY,
    project_rid           integer NOT NULL REFERENCES projects(project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    plot_rid              integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    user_rid              integer NOT NULL REFERENCES users(user_uid) ON UPDATE CASCADE,
    packet_rid            integer DEFAULT NULL REFERENCES packets(packet_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    image_id              text,
    image_year            integer NOT NULL,
    image_julday          integer NOT NULL,
    priority              integer NOT NULL
);

-- Indices for TimeSync related tables
CREATE UNIQUE INDEX packets_project_rid_title ON packets USING btree(project_rid, title);
CREATE UNIQUE INDEX packet_users_packet_rid_user_rid ON packet_users USING btree(packet_rid, user_rid);
CREATE UNIQUE INDEX packet_plots_packet_rid_plot_rid ON packet_plots USING btree(packet_rid, plot_rid);
CREATE UNIQUE INDEX plot_comments_project_plot_user_packet ON plot_comments USING btree(project_rid, plot_rid, user_rid, packet_rid);
CREATE INDEX vertex_project_plot_user_packet ON vertex USING btree(project_rid, plot_rid, user_rid, packet_rid);
CREATE UNIQUE INDEX image_preference_project_plot_user_packet_year ON image_preference (project_rid, plot_rid, user_rid, packet_rid, image_year);
