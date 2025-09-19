-- NAMESPACE: geoai
-- REQUIRES: clear


CREATE OR REPLACE FUNCTION get_plots_as_geojson(_project_id INTEGER)
  RETURNS TABLE (
      id INTEGER,
      geometry jsonb
  )
  AS $$
  SELECT
      p.plot_uid AS id,
      (ST_AsGeoJSON (p.plot_geom))::jsonb
  FROM
      plots p
  WHERE project_rid = _project_id

$$
LANGUAGE SQL;


CREATE OR REPLACE FUNCTION update_geoai_assets(_project_id INTEGER, _reference_plot INTEGER, _geoai_assets jsonb)
  RETURNS void AS $$
    UPDATE projects
    SET geoai_assets = _geoai_assets,
        reference_plot_rid = _reference_plot
    WHERE project_uid = _project_id

  $$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION insert_geoai_cache(
  _project_id    INTEGER,
  _plot_id       INTEGER,
  _similar_plots TEXT,
  _metadata      JSONB
) RETURNS INTEGER AS $$

  INSERT INTO geoai_cache (
    project_rid,
    plot_rid,
    similar_plots,
    metadata
  ) VALUES (
    _project_id,
    _plot_id,
    _similar_plots::INTEGER[],
    _metadata
  )
  ON CONFLICT (project_rid, plot_rid)
  DO UPDATE SET
    similar_plots = EXCLUDED.similar_plots,
    metadata = EXCLUDED.metadata
  RETURNING geoai_cache_uid;

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_bq_table(_project_id INTEGER, _year text)
  RETURNS text AS $$

    SELECT geoai_assets ->> _year
    FROM projects
    WHERE project_uid = _project_id

  $$ LANGUAGE SQL;
