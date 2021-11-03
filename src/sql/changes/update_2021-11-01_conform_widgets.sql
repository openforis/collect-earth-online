
-- Update stats widgets
UPDATE project_widgets
SET widget = jsonb_build_object(
    'name', widget->>'name',
    'type', 'statistics',
    'layout', widget->'layout'
)
WHERE widget->'properties'->>0 = 'getStats';
