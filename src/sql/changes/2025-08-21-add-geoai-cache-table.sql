ALTER TABLE projects ADD COLUMN plot_similatirty_asset text;

CREATE TABLE geoai_cache (
  geoai_cache_uid SERIAL,
  project_rid integer NOT NULL REFERENCES projects(project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
  plot_rid integer NOT NULL REFERENCES plots(plot_uid) ON DELETE CASCADE ON UPDATE CASCADE,
  similar_plots integer[],
  metadata jsonb
);
