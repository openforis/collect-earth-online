UPDATE projects
SET options='{"showGEEScript": false}'::jsonb
WHERE options='{}'::jsonb;
