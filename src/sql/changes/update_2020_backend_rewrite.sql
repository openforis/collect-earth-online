UPDATE imagery SET extent = NULL WHERE extent = 'null';

-- FIXME update imagery_functions.sql after PR 602 is merged
DROP FUNCTION IF EXISTS check_institution_imagery(integer, text);
CREATE OR REPLACE FUNCTION imagery_name_taken(_institution_rid integer, _title text, _imagery_id)
 RETURNS boolean AS $$

    SELECT EXISTS(
        SELECT 1
        FROM imagery
        WHERE institution_rid = _institution_rid
            AND title = _title
            AND imagery_uid <> _imagery_id
    )

$$ LANGUAGE SQL;
