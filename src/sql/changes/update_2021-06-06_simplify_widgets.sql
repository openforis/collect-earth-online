-- Reset id numbers. about 25 projects have duplicate ids
UPDATE project_widgets p
SET widget = nw.new_widget
FROM (
    SELECT widget_uid,
    widget || jsonb_build_object(
        'id', row_number() over( partition by project_rid order by widget->'id')::int - 1
    ) AS new_widget
    FROM project_widgets
    ORDER BY project_rid, widget->'id'
) AS nw
WHERE p.widget_uid = nw.widget_uid;

-- Convert grid column / row to layout
UPDATE project_widgets
SET widget = jsonb_set(widget, '{"layout"}', jsonb_build_object(
    'x', split_part(widget->>'gridcolumn', ' ', 1)::int - 1,
    'w', CASE WHEN split_part(widget->>'gridcolumn', ' ', 4) <> ''
            THEN split_part(widget->>'gridcolumn', ' ', 4)::int
        WHEN split_part(widget->>'gridcolumn', ' ', 3) <> ''
            THEN split_part(widget->>'gridcolumn', ' ', 3)::int
        ELSE 3
        END,
    'y', split_part(widget->>'gridrow', ' ', 1)::int - 1,
    'h', CASE WHEN split_part(widget->>'gridrow', ' ', 4) <> ''
            THEN split_part(widget->>'gridrow', ' ', 4)::int
        ELSE 1
        END
))
WHERE widget->'gridcolumn' is NOT NULL
    AND widget->'layout' is NULL;

-- Convert width only to layout
UPDATE project_widgets
SET widget = jsonb_set(widget, '{"layout"}', jsonb_build_object(
    'x', 0,
    'w', CASE WHEN widget->>'width' <> ''
            THEN (widget->>'width')::int
        ELSE 3
        END,
    'y', (widget->>'id')::int,
    'h', 1
))
WHERE widget->'gridcolumn' is NULL
    AND widget->'layout' is NULL
    AND widget->'width' is NOT NULL;

-- Remove all unused params
UPDATE project_widgets
SET widget = widget - 'width' - 'position' - 'gridcolumn' - 'gridrow'
WHERE widget->'layout' is NOT NULL;

-- Remove all unused layout params, reset i to id
UPDATE project_widgets
SET widget = jsonb_set(widget, '{"layout"}', jsonb_build_object(
    'h', widget->'layout'->'h',
    'i', widget->>'id',
    'w', widget->'layout'->'w',
    'x', widget->'layout'->'x',
    'y', widget->'layout'->'y'
));

-- Check all widget
SELECT widget
FROM project_widgets
WHERE widget->'layout' IS NULL
    OR widget->'layout'->'y' IS NULL
    OR widget->'layout'->'i' IS NULL
    OR jsonb_typeof(widget->'layout'->'i') <> 'string'
    OR widget->'gridcolumn' IS NOT NULL
    OR widget->'gridrow' IS NOT NULL
    OR widget->'width' IS NOT NULL
    OR widget->'position' IS NOT NULL
    OR widget->'layout'->'minW' IS NOT NULL
    OR widget->'layout'->'static' IS NOT NULL
    OR widget->'layout'->'moved' IS NOT NULL
    OR (widget->'layout'->>'i')::int <> (widget->>'id')::int;
