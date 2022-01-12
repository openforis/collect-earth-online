ALTER TABLE institutions ADD COLUMN image_name text DEFAULT '';

UPDATE institutions SET image_name = 'Image Uploaded'
WHERE logo_data IS NOT NULL;

UPDATE institutions SET image_name = ''
WHERE logo_data IS NULL;
