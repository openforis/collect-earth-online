ALTER TABLE project_widgets DROP COLUMN dashboard_id;

UPDATE project_widgets
SET widget = jsonb_set(widget, '{"layout"}', (widget->'layout') - 'i') - 'id';
