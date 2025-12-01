ALTER TABLE projects ADD COLUMN plot_similatirty_asset text;

CREATE TABLE geoai_cache (
  geoai_cache_uid SERIAL,
  project_rid integer NOT NULL REFERENCES projects(project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
  plot_rid integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
  similar_plots integer[],
  metadata jsonb
);

ALTER TABLE geoai_cache
ADD CONSTRAINT geoai_cache_project_plot_unique UNIQUE (project_rid, plot_rid);
ALTER TABLE projects add reference_plot_rid integer REFERENCES plots (plot_uid) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE projects ADD COLUMN geoai_assets jsonb;
