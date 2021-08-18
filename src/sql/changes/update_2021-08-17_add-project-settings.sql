-- Create project settings column
ALTER TABLE projects ADD COLUMN project_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Enable all geometries for existing projects where allow_drawn_samples is true
UPDATE projects
SET project_settings = '{"sampleGeometries":{"points": true, "lines": true, "polygons":true}}'::jsonb
WHERE allow_drawn_samples = true OR sample_distribution = 'none';
