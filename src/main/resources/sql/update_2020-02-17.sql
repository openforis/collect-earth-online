DROP FUNCTION flag_plot(
    _plot_rid integer,
    _user_rid integer,
    _confidence integer
);

DROP FUNCTION update_user_samples(
    _user_plots_uid      integer,
    _project_rid         integer,
    _plot_rid            integer,
    _user_rid            integer,
    _confidence          integer,
    _collection_start    timestamp,
    _samples             jsonb,
    _images              jsonb
);

-- Flag plot
CREATE FUNCTION flag_plot(_plot_rid integer, _user_rid integer, _confidence integer)
 RETURNS integer AS $$

    DELETE FROM sample_values WHERE user_plot_rid = (SELECT user_plot_uid FROM user_plots WHERE user_rid = _user_rid AND plot_rid = _plot_rid);

    INSERT INTO user_plots
        (user_rid, plot_rid, flagged, confidence, collection_time)
    VALUES
        (_user_rid, _plot_rid, true, _confidence, Now())
    ON CONFLICT (plot_rid) DO UPDATE
        SET flagged = excluded.flagged,
            user_rid = excluded.user_rid,
            confidence = excluded.confidence,
            collection_time = Now()

    RETURNING _plot_rid

$$ LANGUAGE SQL;

-- Update user sample value selections
CREATE FUNCTION update_user_samples(
    _user_plots_uid      integer,
    _project_rid         integer,
    _plot_rid            integer,
    _user_rid            integer,
    _confidence          integer,
    _collection_start    timestamp,
    _samples             jsonb,
    _images              jsonb
 ) RETURNS integer AS $$

    WITH user_plot_table AS (
        UPDATE user_plots
            SET confidence = _confidence,
                collection_start = _collection_start,
                collection_time = localtimestamp,
                flagged = FALSE
        WHERE user_plot_uid = _user_plots_uid
        RETURNING user_plot_uid
    ), new_sample_values AS (
        SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_samples)
    ), image_values AS (
        SELECT sample_id, id as imagery_id, attributes as imagery_attributes
        FROM (SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_images)) a
        CROSS JOIN LATERAL
        jsonb_to_record(a.value) as (id int, attributes text)
    ), plot_samples AS (
        SELECT user_plot_uid, sv.sample_id, iv.imagery_id, iv.imagery_attributes::jsonb, sv.value
        FROM user_plot_table AS upt, samples AS s
        INNER JOIN new_sample_values as sv ON sample_uid = sv.sample_id
        INNER JOIN image_values as iv ON sample_uid = iv.sample_id
        WHERE s.plot_rid = _plot_rid
    )

    INSERT INTO sample_values
        (user_plot_rid, sample_rid, imagery_rid, imagery_attributes, value)
        (SELECT user_plot_uid, sample_id, imagery_id, imagery_attributes, value FROM plot_samples)
        ON CONFLICT (sample_rid) DO UPDATE
        SET user_plot_rid = excluded.user_plot_rid,
            imagery_rid = excluded.imagery_rid,
            imagery_attributes = excluded.imagery_attributes,
            value = excluded.value

    RETURNING sample_values.sample_rid

$$ LANGUAGE SQL;
