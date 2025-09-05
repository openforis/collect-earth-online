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
      (ST_AsGeoJSON (plot.plot_geom))::jsonb
  FROM
      plots p
  WHERE project_rid = _project_id

$$
LANGUAGE SQL;
