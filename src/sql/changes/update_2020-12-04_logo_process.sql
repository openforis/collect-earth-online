DROP TYPE institution_return CASCADE;

ALTER TABLE institutions DROP COLUMN logo;

CREATE OR REPLACE FUNCTION add_institution_logo_by_file(_institution_id integer, _file_name text)
 RETURNS integer AS $$

    UPDATE institutions
    SET logo_data = pg_read_binary_file(_file_name)
    WHERE institution_uid = _institution_id
    RETURNING institution_uid

$$ LANGUAGE SQL;
