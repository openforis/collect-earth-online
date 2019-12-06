-- Store spectral data used for the interpretation
CREATE TABLE spectral (
    project_rid           integer NOT NULL REFERENCES projects(project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    plot_rid              integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    user_rid              integer NOT NULL REFERENCES users(user_uid) ON UPDATE CASCADE,
    packet_rid            integer DEFAULT NULL REFERENCES packets(packet_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    reflectance           jsonb
);

CREATE UNIQUE INDEX spectral_project_plot_user_packet ON spectral (project_rid, plot_rid, user_rid, packet_rid);

