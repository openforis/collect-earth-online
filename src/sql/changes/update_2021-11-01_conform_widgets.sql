-- Drop archived projects with odd widgets
-- This includes all widgets that were "dualLayer", ie the precursor to dualImageWidget
SELECT delete_project(project_uid) FROM projects WHERE project_uid IN (4998, 1057, 1054, 1080);

-- Update Stats widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'statistics',
    'name', widget->'name',
    'layout', widget->'layout'
)
WHERE widget->'properties'->>0 = 'getStats';

-- Update Elevation widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageElevation',
    'name', widget->'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'assetName', widget->>'ImageAsset',
    'visParams', widget->'visParams'
)
WHERE widget->>'ImageAsset' is not null
    AND widget->>'ImageAsset' = 'USGS/SRTMGL1_003';

-- Update Image Asset widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageAsset',
    'name', widget->'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'assetName', widget->>'ImageAsset',
    'visParams', widget->'visParams'
)
WHERE widget->>'ImageAsset' is not null
    AND widget->>'ImageAsset' <> 'USGS/SRTMGL1_003';

-- Update Degradation widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'degradationTool',
    'name', widget->'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'band', widget->'graphBand',
    'startDate', widget->'startDate',
    'endDate', widget->'endDate'
)
WHERE widget->'properties'->>0 = 'DegradationTool';

-- Update Polygon widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'polygonCompare',
    'name', widget->'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'assetName', widget->>'featureCollection',
    'field', widget->'field',
    'visParams', widget->'visParams'
)
WHERE widget->'properties'->>0 = 'featureCollection';

-- Update Time Series widgets not custom
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'timeSeries',
    'name', widget->'name',
    'layout', widget->'layout',
    'indexName', widget->'properties'->4,
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 ilike '%timeseries%';
    AND widget->'properties'->>4 <> 'Custom'

-- Update Time Series widgets custom
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'timeSeries',
    'name', widget->'name',
    'layout', widget->'layout',
    'indexName', widget->'properties'->4,
    'assetName', widget->'properties'->1,
    'band', widget->'graphBand',
    'reducer', widget->>'graphReducer',
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 ilike '%timeseries%';
    AND widget->'properties'->>4 = 'Custom'

-- Update Pre Image Collection -> emodis widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'preImageCollection',
    'name', widget->>'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'indexName', widget->'properties'->4,
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 in (
    'ImageCollectionNDVI',
    'ImageCollectionEVI',
    'ImageCollectionEVI2',
    'ImageCollectionNDWI',
    'ImageCollectionNDMI'
);

-- Update Pre Image Collection -> landsat / sentinel widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'preImageCollection',
    'name', widget->>'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'indexName', widget->'properties'->>4,
    'bands', widget->'visParams'->'bands',
    'min', widget->'visParams'->'min',
    'max', widget->'visParams'->'max',
    'cloudLessThan', widget->'cloudLessThan',
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 in (
    'ImageCollectionLANDSAT5',
    'ImageCollectionLANDSAT7',
    'ImageCollectionLANDSAT8',
    'ImageCollectionSentinel2'
);

-- Update Image Collection -> cloud filter
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageCollectionAsset',
    'name', widget->>'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'assetName', widget->'properties'->>1,
    'reducer', 'Cloud',
    'visParams', CASE WHEN widget->'min' IS NULL
        THEN jsonb_build_object(
            'bands', widget->'properties'->>4
        )
        ELSE jsonb_build_object(
            'min', widget->'min',
            'max', widget->'max',
            'bands', widget->'properties'->>4
        )
        END,
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 = 'addImageCollection'
    AND widget->'properties'->>1 <> '';

-- Update Image Collection -> Custom
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageCollectionAsset',
    'name', widget->>'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'assetName', widget->'properties'->>1,
    'reducer', 'Mean',
    'visParams', widget->'visParams',
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 = 'ImageCollectionCustom'
    AND widget->'properties'->>1 <> '';

-- Update Image Collection Asset
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'imageCollectionAsset',
    'name', widget->>'name',
    'layout', widget->'layout',
    'assetName', widget->'ImageCollectionAsset',
    'reducer', 'Mosaic',
    'visParams', widget->'visParams',
    'startDate', '',
    'endDate', ''
)
WHERE widget->'ImageCollectionAsset' IS NOT NULL
    AND widget->>'ImageCollectionAsset' <> '';

-- Update Dual Imagery widgets, step 1
UPDATE project_widgets
SET widget = jsonb_build_object(
    'type', 'dualImagery',
    'name', widget->>'name',
    'layout', widget->'layout',
    'basemapId', widget->'basemapId',
    'swipeAsDefault', coalesce(widget->>'swipeAsDefault', 'false')::jsonb,
    'image1', widget->'dualImageCollection'->0,
    'image2', widget->'dualImageCollection'->1
)
WHERE widget->>'dualImageCollection' IS NOT NULL;

-- Clean visParams
CREATE OR REPLACE FUNCTION clean_json_string(_str text)
 RETURNS text AS $$

    SELECT regexp_replace(
        regexp_replace(_str, '”|“', '"', 'g'),
        '[^"]:', '":'
    )

$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION try_parse_json(_str text)
 RETURNS jsonb AS $$

 DECLARE
 BEGIN
    RETURN(SELECT clean_json_string(_str)::jsonb);
 EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '%', _str;
    RETURN '{}';
 END

$$ LANGUAGE plpgsql;

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"visParams"}', try_parse_json(widget->>'visParams'))
WHERE widget->'visParams' IS NOT NULL;

-- Sanity check.  108
select widget from project_widgets
where widget->>'visParams' = '{}'
and widget->>'dualImageCollection' is null
order by widget->>'type';

-- remove invalid widgets. 43
delete from project_widgets
WHERE widget->'type' IS NULL
and widget->>'dualImageCollection' is null;

-- Clean up missing basemapId
-- FIXME, set to OSM
UPDATE project_widgets
SET widget = widget - 'basemapId'
WHERE widget->>'basemapId' IS NULL;

-- FIXME, split out title, type, layout, design
-- Change name -> title to match
UPDATE project_widgets
SET widget = jsonb_set(widget, '{"title"}', widget->'name') - 'name';
