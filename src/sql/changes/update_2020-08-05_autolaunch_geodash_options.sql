UPDATE projects
SET options = options || '{"autoLaunchGeoDash": true}'::jsonb
WHERE options->'autoLaunchGeoDash' IS NULL;
