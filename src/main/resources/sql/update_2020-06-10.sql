UPDATE imagery
SET source_config = source_config || '{"startDate": "2018-01-01", "endDate": "2018-12-31"}'::jsonb
WHERE source_config->>'type'='SecureWatch'
	AND (source_config->>'startDate' IS NULL OR source_config->>'endDate' IS NULL);
