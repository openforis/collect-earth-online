ALTER TABLE projects ADD COLUMN aoi_features jsonb;
ALTER TABLE projects ADD COLUMN aoi_file_name text DEFAULT '';

UPDATE projects SET aoi_features = ('[' || ST_AsGeoJSON(boundary) || ']')::jsonb;
