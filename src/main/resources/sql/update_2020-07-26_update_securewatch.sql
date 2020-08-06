UPDATE imagery
SET source_config = source_config || '{"baseUrl": "https://securewatch.digitalglobe.com"}'::jsonb
WHERE source_config->>'type'='SecureWatch'
    AND source_config->'baseUrl' IS NULL;
