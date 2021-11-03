
-- Update Stats widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'statistics',
    'name', widget->>'name',
    'layout', widget->'layout'
)
WHERE widget->'properties'->>0 = 'getStats';

-- Update Elevation widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageElevation',
    'name', widget->>'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'eeType', 'Image',
    'assetName', widget->>'ImageAsset',
    'visParams', widget->'visParams'
)
WHERE widget->>'ImageAsset' is not null
    AND widget->>'ImageAsset' = 'USGS/SRTMGL1_003'

-- Update Image Asset widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageAsset',
    'name', widget->>'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'eeType', 'Image',
    'assetName', widget->>'ImageAsset',
    'visParams', widget->'visParams'
)
WHERE widget->>'ImageAsset' is not null
    AND widget->>'ImageAsset' <> 'USGS/SRTMGL1_003'

-- Clean up missing basemapId
-- FIXME, set to OSM
UPDATE project_widgets
SET widget = widget - 'basemapId'
WHERE widget->>'basemapId' IS NULL;
