-- Updates institution imagery
CREATE FUNCTION update_institution_imagery(_imagery_uid integer, _title text, _attribution text, _source_config jsonb)
 RETURNS integer AS $$

    UPDATE imagery
    SET title = _title,
        attribution = _attribution,
        source_config = _source_config
    WHERE imagery_uid = _imagery_uid
    RETURNING imagery_uid

$$ LANGUAGE SQL;
