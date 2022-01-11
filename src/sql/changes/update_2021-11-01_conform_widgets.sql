-- Drop archived projects with odd widgets
SELECT delete_project(project_uid) FROM projects WHERE project_uid IN (4998, 1057, 1054, 1080);

ALTER TABLE project_widgets ADD COLUMN widget_bk jsonb;
UPDATE project_widgets SET widget_bk = widget;

ALTER TABLE imagery ADD COLUMN sc_bk jsonb;
UPDATE imagery SET sc_bk = source_config;

-- Update Stats widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'layout', widget->'layout',
    'name', widget->'name',
    'type', 'statistics'
)
WHERE widget->'properties'->>0 = 'getStats';

-- Update Image Asset widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'layout', widget->'layout',
    'name', widget->'name',
    'type', 'imageAsset',
    'basemapId', widget->'basemapId',
    'assetId', widget->>'ImageAsset',
    'visParams', widget->>'visParams'
)
WHERE widget->>'ImageAsset' is not null

-- Update Degradation widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'layout', widget->'layout',
    'name', widget->'name',
    'type', 'degradationTool',
    'basemapId', widget->'basemapId',
    'band', widget->'graphBand',
    'startDate', widget->'startDate',
    'endDate', widget->'endDate'
)
WHERE widget->'properties'->>0 = 'DegradationTool';

-- Update Polygon widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'layout', widget->'layout',
    'name', widget->'name',
    'type', 'polygonCompare',
    'basemapId', widget->'basemapId',
    'assetId', widget->>'featureCollection',
    'field', widget->'field',
    'visParams', widget->>'visParams'
)
WHERE widget->'properties'->>0 = 'featureCollection';

-- Update Time Series widgets not custom
UPDATE project_widgets
SET widget = jsonb_build_object(
    'layout', widget->'layout',
    'name', widget->'name',
    'type', 'timeSeries',
    'indexName', widget->'properties'->4,
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 ilike '%timeseries%'
    AND widget->'properties'->>4 <> 'Custom';

-- Update Time Series widgets custom
UPDATE project_widgets
SET widget = jsonb_build_object(
    'layout', widget->'layout',
    'name', widget->'name',
    'type', 'timeSeries',
    'indexName', widget->'properties'->4,
    'assetId', widget->'properties'->1,
    'band', widget->'graphBand',
    'reducer', widget->>'graphReducer',
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 ilike '%timeseries%'
    AND widget->'properties'->>4 = 'Custom';

-- Update Pre Image Collection -> emodis widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'layout', widget->'layout',
    'name', widget->>'name',
    'type', 'preImageCollection',
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
    'layout', widget->'layout',
    'name', widget->>'name',
    'type', 'preImageCollection',
    'basemapId', widget->'basemapId',
    'indexName', widget->'properties'->>4,
    'bands', coalesce(widget->'visParams'->>'bands', ''),
    'min', coalesce(widget->'visParams'->>'min', ''),
    'max', coalesce(widget->'visParams'->>'max', ''),
    'cloudLessThan', coalesce(widget->>'cloudLessThan', '90')::int,
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
    'layout', widget->'layout',
    'name', widget->>'name',
    'type', 'imageCollectionAsset',
    'basemapId', widget->'basemapId',
    'assetId', widget->'properties'->>1,
    'reducer', 'Cloud',
    'visParams', CASE WHEN widget->'min' IS NULL
        THEN jsonb_build_object(
            'bands', coalesce(widget->'properties'->>4, '')
        )
        ELSE jsonb_build_object(
            'min', coalesce(widget->>'min', ''),
            'max', coalesce(widget->>'max', ''),
            'bands', coalesce(widget->'properties'->>4, '')
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
    'layout', widget->'layout',
    'name', widget->>'name',
    'type', 'imageCollectionAsset',
    'basemapId', widget->'basemapId',
    'assetId', widget->'properties'->>1,
    'reducer', 'Mean',
    'visParams', widget->>'visParams',
    'startDate', TRIM(widget->'properties'->>2),
    'endDate', TRIM(widget->'properties'->>3)
)
WHERE widget->'properties'->>0 = 'ImageCollectionCustom'
    AND widget->'properties'->>1 <> '';

-- Update Image Collection Asset
UPDATE project_widgets
SET widget = jsonb_build_object(
    'layout', widget->'layout',
    'name', widget->>'name',
    'type', 'imageCollectionAsset',
    'basemapId', widget->'basemapId',
    'assetId', widget->'ImageCollectionAsset',
    'reducer', 'Mosaic',
    'visParams', widget->>'visParams',
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
    'layout', widget->'layout',
    'name', widget->>'name',
    'type', 'dualImagery',
    'basemapId', widget->'basemapId',
    'image1', widget->'dualImageCollection'->0,
    'image2', widget->'dualImageCollection'->1
)
WHERE widget->>'dualImageCollection' IS NOT NULL;

--- ImageAsset

CREATE OR REPLACE FUNCTION build_image_asset(_widget jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_build_object(
        'type', 'imageAsset',
        'assetId', _widget->>'imageAsset',
        'visParams', _widget->>'visParams'
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
        'assetId', _widget->'ImageCollectionAsset',
        'reducer', 'Mosaic',
        'visParams', _widget->>'visParams',
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
        'bands', coalesce(_widget->'visParams'->>'bands', ''),
        'min', coalesce(_widget->'visParams'->>'min', ''),
        'max', coalesce(_widget->'visParams'->>'max', ''),
        'cloudLessThan', CASE WHEN _widget->'visParams'->>'cloudLessThan' = '' THEN 90
            ELSE coalesce(_widget->'visParams'->>'cloudLessThan', '90')::int END,
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

-- Remove invalid widgets.
DELETE FROM project_widgets
WHERE widget->'type' IS NULL;

DELETE FROM project_widgets
WHERE widget->>'type' = 'dualImagery'
    AND (widget->'image1'-> 'type' IS NULL
         OR widget->'image2'-> 'type' IS NULL);

-- Clean up missing basemapId
UPDATE project_widgets
SET widget = jsonb_set(widget, '{"basemapId"}', to_jsonb(select_public_osm()))
WHERE widget->>'basemapId' IS NULL
    AND widget ? 'basemapId' = TRUE;

---------------------------------------------------
--- Conform Imagery -------------------------------
---------------------------------------------------

UPDATE imagery
SET source_config = jsonb_build_object(
    'type', 'GEEImage',
    'assetId', source_config->>'imageId',
    'visParams', source_config->>'imageVisParams'
)
WHERE source_config->>'type' = 'GEEImage';

UPDATE imagery
SET source_config = jsonb_build_object(
    'type', 'GEEImageCollection',
    'assetId', source_config->'collectionId',
    'visParams', source_config->>'collectionVisParams',
    'startDate', source_config->>'startDate',
    'endDate', source_config->>'endDate',
    'reducer', 'Mean'
)
WHERE source_config->>'type' = 'GEEImageCollection';

-- Old style

UPDATE imagery
SET source_config = jsonb_build_object(
    'type', 'GEEImage',
    'assetId', source_config->'geeParams'->>'ImageAsset',
    'visParams', source_config->'geeParams'->>'visParams'
)
WHERE source_config->>'type' = 'GeeGateway'
    AND ((source_config->>'geeUrl' = '/geo-dash/gateway-request'
            AND source_config->'geeParams'->>'path' = 'image')
        OR source_config->>'geeUrl' LIKE '%:8888/image');

UPDATE imagery
SET source_config = jsonb_build_object(
    'type', 'GEEImageCollection',
    'assetId', source_config->'geeParams'->>'ImageCollectionAsset',
    'visParams', source_config->'geeParams'->>'visParams',
    'startDate', source_config->'geeParams'->>'startDate',
    'endDate', source_config->'geeParams'->>'endDate',
    'reducer', 'Mean'
)
WHERE source_config->>'type' = 'GeeGateway'
    AND (source_config->>'geeUrl' = '/geo-dash/gateway-request'
    AND source_config->'geeParams'->>'path' = 'ImageCollectionAsset');

-- Remove remaining which were created in error
SELECT archive_imagery(imagery_uid)
FROM imagery
WHERE source_config->>'type' = 'GeeGateway';
