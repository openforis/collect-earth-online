ALTER TABLE imagery ADD COLUMN is_proxied boolean DEFAULT FALSE;

-- Existing always proxied
UPDATE imagery
SET is_proxied = TRUE
WHERE source_config->>'type' = 'SecureWatch'
    OR source_config->>'type' = 'Planet';

-- Existing sometimes proxied
UPDATE imagery
SET is_proxied = TRUE
WHERE source_config->>'type' = 'GeoServer'
    AND source_config->'geoserverParams'->'CONNECTID' IS NOT NULL;

-- FIXME, making these proxied is a future PR
-- -- NICFI needs to be proxied
-- UPDATE imagery
-- SET is_proxied = TRUE
-- WHERE source_config->>'type' = 'PlanetNICFI';

-- -- PlanetDaily needs to be proxied
-- UPDATE imagery
-- SET is_proxied = TRUE
-- WHERE source_config->>'type' = 'PlanetDaily';
