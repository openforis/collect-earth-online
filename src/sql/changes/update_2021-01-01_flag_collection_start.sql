DROP FUNCTION IF EXISTS flag_plot(integer, integer, integer);

-- Flag plot
CREATE OR REPLACE FUNCTION flag_plot(_plot_id integer, _user_id integer, _confidence integer, _collection_start timestamp)
 RETURNS integer AS $$

    DELETE
    FROM sample_values
    WHERE user_plot_rid = (
        SELECT user_plot_uid
        FROM user_plots
        WHERE user_rid = _user_id
            AND plot_rid = _plot_id
    );

    INSERT INTO user_plots
        (user_rid, plot_rid, flagged, confidence, collection_start, collection_time)
    VALUES
        (_user_id, _plot_id, true, _confidence, _collection_start, Now())
    ON CONFLICT (user_rid, plot_rid) DO
        UPDATE
        SET flagged = excluded.flagged,
            user_rid = excluded.user_rid,
            confidence = excluded.confidence,
            collection_start = excluded.collection_start,
            collection_time = Now()

    RETURNING _plot_id

$$ LANGUAGE SQL;