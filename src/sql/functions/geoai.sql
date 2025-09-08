-- NAMESPACE: geoai
-- REQUIRES: clear


CREATE OR REPLACE FUNCTION get_plots_as_geojson(_project_id int)
  RETURNS TABLE (
      id integer,
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


CREATE OR REPLACE FUNCTION update_geoai_assets(_project_id int, _geoai_assets jsonb)
  RETURNS void AS $$
    UPDATE projects
    SET geoai_assets = _geoai_assets
    WHERE project_uid = _project_id

  $$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION insert_geoai_cache(
  _project_id    int,
  _plot_id       int,
  _similar_plots integer[],
  _metadata      jsonb
  ) RETURNS integer AS $$

  INSERT INTO geoai_cache(
    project_rid,
    plot_rid,
    similar_plots,
    metadata
  ) VALUES (
    _project_id,
    _plot_id,
    _similar_plots,
    _metadata
  )
  RETURNING geoai_cache_uid

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_bigquery_table(_project_id int, _year int)
  RETURNS text AS $$

    SELECT geoai_assets ->> p_year
    FROM projects
    WHERE project_uid = p_project_uid

  $$ LANGUAGE SQL;
