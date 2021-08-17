-- Convert old object to new imagery id
UPDATE project_widgets
SET widget = jsonb_set(widget, '{"baseMap"}', widget->'baseMap'->'id')
WHERE widget->'baseMap' IS NOT NULL
    AND jsonb_typeof(widget->'baseMap') = 'object';

-- Set OSM to public OSM layer.
UPDATE project_widgets
SET widget =  jsonb_set(widget, '{"baseMap"}', to_jsonb((SELECT select_public_osm())))
WHERE widget->'baseMap' IS NOT NULL
    AND widget->>'baseMap' = 'osm';

-- Set all id to integer
UPDATE project_widgets
SET widget =  jsonb_set(widget, '{"baseMap"}', (widget->>'baseMap')::jsonb)
WHERE widget->'baseMap' IS NOT NULL
    AND jsonb_typeof(widget->'baseMap') = 'string';

-- Convert key
UPDATE project_widgets
SET widget =  jsonb_set(widget - 'baseMap', '{"basemapId"}', (widget->>'baseMap')::jsonb)
WHERE widget->'baseMap' IS NOT NULL;

-- Verify conversion
SELECT widget
FROM project_widgets
WHERE (widget->'basemapId' IS NOT NULL
        AND jsonb_typeof(widget->'basemapId') <> 'number')
    OR widget->'baseMap' IS NOT NULL;

-- Update archived imagery to OSM
UPDATE project_widgets
SET widget =  jsonb_set(widget, '{"basemapId"}', to_jsonb((SELECT select_public_osm())))
WHERE widget_uid IN (
    SELECT widget_uid
    FROM project_widgets
    LEFT JOIN imagery
        ON (widget->'basemapId')::integer = imagery_uid
    WHERE widget->'basemapId' IS NOT NULL
        AND (imagery_uid IS NULL
            OR archived = TRUE)
);
