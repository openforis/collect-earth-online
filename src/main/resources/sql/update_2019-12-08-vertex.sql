-- remove spectral table
DROP TABLE IF EXISTS spectral;
DROP INDEX IF EXISTS spectral_project_plot_user_packet;

-- modify vertex table structure
CREATE TABLE vertex
(
    vertex_uid bigserial PRIMARY KEY,
    project_rid integer NOT NULL REFERENCES projects(project_uid) ON UPDATE CASCADE,
    plot_rid integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    user_rid integer NOT NULL REFERENCES users (user_uid) ON UPDATE CASCADE,
    packet_rid integer DEFAULT NULL references packets(packet_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    image_year integer DEFAULT NULL,
    image_julday integer DEFAULT NULL,
    image_id text,
    landuse jsonb,
    landcover jsonb,
    change_process jsonb,
    reflectance jsonb,
    is_vertex boolean,
    comments varchar(255) DEFAULT NULL,
    last_modified timestamp NOT NULL DEFAULT current_timestamp,
    history_flag integer DEFAULT 0
);