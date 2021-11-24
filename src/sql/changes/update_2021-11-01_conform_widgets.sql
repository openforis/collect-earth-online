-- Drop archived projects with odd widgets
-- This includes all widgets that were "dualLayer", ie the precursor to dualImageWidget
SELECT delete_project(project_uid) FROM projects WHERE project_uid IN (4998, 1057, 1054, 1080);

ALTER TABLE project_widgets ADD COLUMN widget_bk jsonb;
UPDATE project_widgets SET widget_bk = widget;

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
    'basemapId', widget->'basemapId',
    'assetName', widget->'ImageCollectionAsset',
    'reducer', 'Mosaic',
    'visParams', widget->'visParams',
    'startDate', '',
    'endDate', ''
)
WHERE widget->'ImageCollectionAsset' IS NOT NULL
    AND widget->>'ImageCollectionAsset' <> '';

---------------------------------------------------
--- Dual Imagery ----------------------------------
---------------------------------------------------

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

--- ImageAsset

CREATE OR REPLACE FUNCTION build_image_asset(_widget jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_build_object(
        'type', 'imageAsset',
        'assetName', _widget->>'imageAsset',
        'visParams', _widget->'visParams'
    )

$$ LANGUAGE SQL;

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"image1"}', build_image_asset(widget->'image1'))
WHERE widget->>'type' = 'dualImagery'
    AND widget->'image1'->>'collectionType' = 'ImageCollectionimageAsset';

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"image2"}', build_image_asset(widget->'image2'))
WHERE widget->>'type' = 'dualImagery'
    AND widget->'image2'->>'collectionType' = 'ImageCollectionimageAsset';

--- Image collection assets

CREATE OR REPLACE FUNCTION build_collection_asset(_widget jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_build_object(
        'type', 'imageCollectionAsset',
        'assetName', _widget->'ImageCollectionAsset',
        'reducer', 'Mosaic',
        'visParams', _widget->'visParams',
        'startDate', _widget->>'startDate',
        'endDate', _widget->>'startDate'
    )

$$ LANGUAGE SQL;

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"image1"}', build_collection_asset(widget->'image1'))
WHERE widget->>'type' = 'dualImagery'
    AND widget->'image1'->>'collectionType' = 'ImageCollectionimageCollectionAsset';

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"image2"}', build_collection_asset(widget->'image2'))
WHERE widget->>'type' = 'dualImagery'
    AND widget->'image2'->>'collectionType' = 'ImageCollectionimageCollectionAsset';

-- Update Pre Image Collection -> emodis widgets

CREATE OR REPLACE FUNCTION build_index_widgets(_widget jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_build_object(
        'indexName', REPLACE(_widget->>'collectionType', 'ImageCollection', ''),
        'startDate', _widget->>'startDate',
        'endDate', _widget->>'endDate'
    )

$$ LANGUAGE SQL;

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"image1"}', build_collection_asset(widget->'image1'))
WHERE widget->>'type' = 'dualImagery'
    AND widget->'image1'->>'collectionType' in (
        'ImageCollectionNDVI',
        'ImageCollectionEVI',
        'ImageCollectionEVI2',
        'ImageCollectionNDWI',
        'ImageCollectionNDMI'
    );

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"image2"}', build_collection_asset(widget->'image2'))
WHERE widget->>'type' = 'dualImagery'
    AND widget->'image2'->>'collectionType' in (
        'ImageCollectionNDVI',
        'ImageCollectionEVI',
        'ImageCollectionEVI2',
        'ImageCollectionNDWI',
        'ImageCollectionNDMI'
    );

-- Update Pre Image Collection -> landsat / sentinel widgets

CREATE OR REPLACE FUNCTION build_landsat_widgets(_widget jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_build_object(
        'indexName', _widget->'filterType',
        'bands', _widget->'visParams'->'bands',
        'min', _widget->'visParams'->'min',
        'max', _widget->'visParams'->'max',
        'cloudLessThan', _widget->'visParams'->'cloudLessThan',
        'startDate', _widget->>'startDate',
        'endDate', _widget->>'endDate'
    )

$$ LANGUAGE SQL;

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"image1"}', build_landsat_widgets(widget->'image1'))
WHERE widget->>'type' = 'dualImagery'
    AND widget->'image1'->>'collectionType' in (
        'ImageCollectionLANDSAT5',
        'ImageCollectionLANDSAT7',
        'ImageCollectionLANDSAT8',
        'ImageCollectionSentinel2'
    );

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"image2"}', build_landsat_widgets(widget->'image2'))
WHERE widget->>'type' = 'dualImagery'
    AND widget->'image2'->>'collectionType' in (
        'ImageCollectionLANDSAT5',
        'ImageCollectionLANDSAT7',
        'ImageCollectionLANDSAT8',
        'ImageCollectionSentinel2'
    );

---------------------------------------------------
--- Post processing -------------------------------
---------------------------------------------------

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

-- Remove invalid widgets.
DELETE FROM project_widgets
WHERE widget->'type' IS NULL

DELETE FROM project_widgets
WHERE widget->>'type' = 'dualImagery'
    AND (widget->'image1'-> 'type' IS NULL
         OR widget->'image2'-> 'type' IS NULL)

-- Clean up missing basemapId
-- FIXME, double check this one.  The test run seemed high, but could have been a manual error.
UPDATE project_widgets
SET widget = jsonb_set(widget, '{"basemapId"}', to_jsonb(select_public_osm()))
WHERE widget->>'basemapId' IS NULL
    AND widget ? 'basemapId' = TRUE;
