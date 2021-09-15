-- NAMESPACE: plots
-- REQUIRES: clear, project

--
--  PLOT FUNCTIONS
--

-- Select plots but only return a maximum number
-- TODO, CEO-32 update to only show users available plots
CREATE OR REPLACE FUNCTION select_limited_project_plots(_project_id integer, _maximum integer)
 RETURNS table (
    plot_id     integer,
    center      text,
    flagged     boolean,
    analyzed    boolean
 ) AS $$

    SELECT plot_uid,
        ST_AsGeoJSON(ST_Centroid(plot_geom)) as center,
        CASE WHEN flagged IS NULL THEN FALSE ELSE flagged END,
        CASE WHEN user_plot_uid IS NULL THEN FALSE ELSE TRUE END
    FROM plots
    LEFT JOIN user_plots
        ON plot_uid = plot_rid
    WHERE project_rid = _project_id
    LIMIT _maximum;

$$ LANGUAGE SQL;

-- Returns plot geom for the geodash
CREATE OR REPLACE FUNCTION select_plot_geom(_plot_id integer)
 RETURNS text AS $$

    SELECT ST_AsGeoJSON(plot_geom)
    FROM plots p
    WHERE p.plot_uid = _plot_id

$$ LANGUAGE SQL;

-- This return type is so the collection functions match return types.
DROP TYPE IF EXISTS collection_return CASCADE;
CREATE TYPE collection_return AS (
    plot_id            integer,
    flagged            boolean,
    flagged_reason     text,
    confidence         integer,
    visible_id         integer,
    plot_geom          text,
    extra_plot_info    jsonb
);

CREATE OR REPLACE FUNCTION select_unanalyzed_plots(_project_id integer, _user_id integer, _admin_mode boolean)
 RETURNS setOf collection_return AS $$

    WITH assigned_count AS (
        SELECT count(*)
        FROM plots, assigned_plots
        WHERE project_rid = _project_id
            AND plot_uid = plot_rid
    )

    SELECT plot_uid,
        flagged,
        flagged_reason,
        confidence,
        visible_id,
        ST_AsGeoJSON(plot_geom) as plot_geom,
        extra_plot_info
    FROM plots
    LEFT JOIN assigned_plots ap
        ON plot_uid = ap.plot_rid
    LEFT JOIN user_plots up
        ON plot_uid = up.plot_rid
        AND (ap.user_rid = up.user_rid OR (select count from assigned_count) = 0)
    LEFT JOIN plot_locks pl
        ON plot_uid = pl.plot_rid
    WHERE project_rid = _project_id
        AND user_plot_uid IS NULL
        AND ((ap.user_rid IS NULL
                AND (pl.lock_end IS NULL
                     OR localtimestamp > pl.lock_end)) -- unlocked
             OR ap.user_rid = _user_id                  -- assigned
             OR _admin_mode)                            -- admin TODO, CEO-208 should admin be able to visit a locked plot? probably.
    ORDER BY visible_id ASC

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_analyzed_plots(_project_id integer, _user_id integer, _admin_mode boolean)
 RETURNS setOf collection_return AS $$

    SELECT plot_uid,
        flagged,
        flagged_reason,
        confidence,
        visible_id,
        ST_AsGeoJSON(plot_geom) as plot_geom,
        extra_plot_info
    FROM plots
    INNER JOIN user_plots up
        ON plot_uid = plot_rid
    WHERE project_rid = _project_id
        AND (up.user_rid = _user_id OR _admin_mode)
    ORDER BY visible_id ASC

$$ LANGUAGE SQL;

-- Lock plot to user
CREATE OR REPLACE FUNCTION lock_plot(_plot_id integer, _user_id integer, _lock_end timestamp)
 RETURNS VOID AS $$

    INSERT INTO plot_locks
        (user_rid, plot_rid, lock_end)
    VALUES
        (_user_id, _plot_id, _lock_end)

$$ LANGUAGE SQL;

-- Reset time on lock
CREATE OR REPLACE FUNCTION lock_plot_reset(_plot_id integer, _user_id integer, _lock_end timestamp)
 RETURNS VOID AS $$

    UPDATE plot_locks pl
    SET lock_end = _lock_end
    WHERE pl.plot_rid = _plot_id
        AND pl.user_rid = _user_id

$$ LANGUAGE SQL;

-- Remove all locks from user and old locks
CREATE OR REPLACE FUNCTION unlock_plots(_user_id integer)
 RETURNS VOID AS $$

    DELETE FROM plot_locks pl
    WHERE pl.user_rid = _user_id
        OR pl.lock_end < localtimestamp

$$ LANGUAGE SQL;

--
--  SAMPLE FUNCTIONS
--

-- Create project plot sample with no external file data
CREATE OR REPLACE FUNCTION create_project_plot_sample(_plot_id integer, _sample_geom jsonb)
 RETURNS integer AS $$

    INSERT INTO samples
        (plot_rid, sample_geom)
    VALUES
        (_plot_id, ST_SetSRID(ST_GeomFromGeoJSON(_sample_geom), 4326))
    RETURNING sample_uid

$$ LANGUAGE SQL;

-- Select samples for a plot.
CREATE OR REPLACE FUNCTION select_plot_samples(_plot_id integer, _user_id integer)
 RETURNS table (
    sample_id        integer,
    sample_geom      text,
    saved_answers    jsonb
 ) AS $$

    WITH assigned_count AS (
        SELECT count(*)
        FROM assigned_plots
        WHERE plot_rid = _plot_id
    )

    SELECT sample_uid,
        ST_AsGeoJSON(sample_geom) as sample_geom,
        (CASE WHEN sv.saved_answers IS NULL THEN '{}' ELSE sv.saved_answers END)
    FROM samples s
    LEFT JOIN assigned_plots ap
        ON s.plot_rid = ap.plot_rid
    LEFT JOIN user_plots up
        ON s.plot_rid = up.plot_rid
        AND (ap.user_rid = up.user_rid or (select count from assigned_count) = 0)
    LEFT JOIN sample_values sv
        ON sample_uid = sv.sample_rid
        AND user_plot_uid = sv.user_plot_rid
    WHERE s.plot_rid = _plot_id
        AND (ap.user_rid IS NULL OR ap.user_rid = _user_id)

$$ LANGUAGE SQL;

-- Select just sample geoms.
CREATE OR REPLACE FUNCTION select_plot_sample_geoms(_plot_id integer)
 RETURNS table (sample_geom text) AS $$

    SELECT ST_AsGeoJSON(sample_geom)
    FROM samples s
    WHERE s.plot_rid = _plot_id

$$ LANGUAGE SQL;

--
--  SAVING COLLECTION
--

-- Flag plot
CREATE OR REPLACE FUNCTION flag_plot(
    _plot_id integer,
    _user_id integer,
    _collection_start timestamp,
    _flagged_reason text
 ) RETURNS integer AS $$

    DELETE
    FROM sample_values
    WHERE user_plot_rid = (
        SELECT user_plot_uid
        FROM user_plots
        WHERE user_rid = _user_id
            AND plot_rid = _plot_id
    );

    INSERT INTO user_plots
        (user_rid, plot_rid, flagged, collection_start, collection_time, flagged_reason)
    VALUES
        (_user_id, _plot_id, true, _collection_start, Now(), _flagged_reason)
    ON CONFLICT (user_rid, plot_rid) DO
        UPDATE
        SET flagged = excluded.flagged,
            user_rid = excluded.user_rid,
            confidence = NULL,
            collection_start = excluded.collection_start,
            collection_time = Now(),
            flagged_reason = excluded.flagged_reason

    RETURNING _plot_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION upsert_user_samples(
    _plot_id             integer,
    _user_id             integer,
    _confidence          integer,
    _collection_start    timestamp,
    _samples             jsonb,
    _images              jsonb
 ) RETURNS integer AS $$

    WITH user_plot_table AS (
        INSERT INTO user_plots AS up
            (user_rid, plot_rid, confidence, collection_start, collection_time)
        VALUES
            (_user_id, _plot_id, _confidence, _collection_start, Now())
        ON CONFLICT (user_rid, plot_rid) DO
            UPDATE
            SET confidence = coalesce(excluded.confidence, up.confidence),
                collection_start = coalesce(excluded.collection_start, up.collection_start),
                collection_time = CASE WHEN excluded.collection_start IS NOT NULL THEN localtimestamp ELSE up.collection_time END,
                flagged = FALSE,
                flagged_reason = null
        RETURNING user_plot_uid
    ), new_sample_values AS (
        SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_samples)
    ), image_values AS (
        SELECT sample_id, id as imagery_id, attributes as imagery_attributes
        FROM (SELECT CAST(key as integer) as sample_id, value FROM jsonb_each(_images)) a
        CROSS JOIN LATERAL
        jsonb_to_record(a.value) as (id int, attributes text)
    ), plot_samples AS (
        SELECT user_plot_uid, nsv.sample_id, iv.imagery_id, iv.imagery_attributes::jsonb, nsv.value
        FROM user_plot_table AS upt, samples AS s
        INNER JOIN new_sample_values as nsv ON sample_uid = nsv.sample_id
        INNER JOIN image_values as iv ON sample_uid = iv.sample_id
        WHERE s.plot_rid = _plot_id
    )

    INSERT INTO sample_values
        (user_plot_rid, sample_rid, imagery_rid, imagery_attributes, saved_answers)
        (SELECT user_plot_uid, sample_id, imagery_id, imagery_attributes, value FROM plot_samples)
    ON CONFLICT (user_plot_rid, sample_rid) DO
        UPDATE
        SET imagery_rid = excluded.imagery_rid,
            imagery_attributes = excluded.imagery_attributes,
            saved_answers = excluded.saved_answers

    RETURNING sample_values.sample_rid

$$ LANGUAGE SQL;

--
--  RESETTING COLLECTION
--

-- For clearing user plots for a single plot
CREATE OR REPLACE FUNCTION delete_user_plot_by_plot(_plot_id integer, _user_id integer)
 RETURNS void AS $$

    DELETE FROM user_plots
    WHERE plot_rid = _plot_id
        AND user_rid = _user_id

$$ LANGUAGE SQL;

-- For clearing samples for a single plot
CREATE OR REPLACE FUNCTION delete_samples_by_plot(_plot_id integer)
 RETURNS void AS $$

    DELETE FROM samples WHERE plot_rid = _plot_id

$$ LANGUAGE SQL;

-- For clearing all plots in a project
CREATE OR REPLACE FUNCTION delete_plots_by_project(_project_id integer)
 RETURNS void AS $$

    DELETE FROM plots WHERE project_rid = _project_id

$$ LANGUAGE SQL;

-- For clearing all user plots in a project
CREATE OR REPLACE FUNCTION delete_user_plots_by_project(_project_id integer)
 RETURNS void AS $$

    DELETE FROM user_plots WHERE plot_rid IN (SELECT plot_uid FROM plots WHERE project_rid = _project_id)

$$ LANGUAGE SQL;

-- For clearing all samples in a project
CREATE OR REPLACE FUNCTION delete_all_samples_by_project(_project_id integer)
 RETURNS void AS $$

    DELETE FROM samples WHERE plot_rid IN (SELECT plot_uid FROM plots WHERE project_rid = _project_id)

$$ LANGUAGE SQL;

-- Get all plots and centers to recreate samples.
CREATE OR REPLACE FUNCTION get_plot_centers_by_project(_project_id integer)
 RETURNS table (
    plot_id       integer,
    visible_id    integer,
    lon           double precision,
    lat           double precision
 ) AS $$

    SELECT plot_uid,
        visible_id,
        ST_X(ST_Centroid(plot_geom)) AS lon,
        ST_Y(ST_Centroid(plot_geom)) AS lat
    FROM plots
    WHERE project_rid = _project_id

$$ LANGUAGE SQL;
