CREATE TABLE ext_samples (
    sample_uid           SERIAL PRIMARY KEY,
    plot_rid             integer NOT NULL REFERENCES plots (plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
    sample_geom          geometry(geometry,4326),
    visible_id           integer,
    extra_sample_info    jsonb
);
