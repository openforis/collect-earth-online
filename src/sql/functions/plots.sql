-- NAMESPACE: plots
-- REQUIRES: clear, project

--
--  PLOT FUNCTIONS
--

CREATE OR REPLACE FUNCTION project_has_assigned(_project_id integer)
 RETURNS boolean AS $$

    SELECT count(*) > 0
    FROM plots, plot_assignments
    WHERE project_rid = _project_id
        AND plot_uid = plot_rid

$$ LANGUAGE SQL;

-- Select plots but only return a maximum number
-- TODO, CEO-32 update to only show users available plots
CREATE OR REPLACE FUNCTION select_limited_project_plots(_project_id integer, _maximum integer)
 RETURNS table (
    plot_id    integer,
    center     text,
    flagged    boolean,
    status     text
 ) AS $$

    WITH plot_sums AS (
        SELECT plot_uid,
            ST_AsGeoJSON(ST_Centroid(plot_geom)) AS center,
            sum(coalesce(flagged, false)::int) > 0 AS flagged,
            sum((pa.user_rid IS NOT NULL)::int) AS assigned,
            sum((up.user_rid IS NOT NULL)::int) AS collected
        FROM plots pl
        LEFT JOIN plot_assignments AS pa
                ON pa.plot_rid = pl.plot_uid
        LEFT JOIN user_plots up
            ON up.plot_rid = pl.plot_uid
            AND (pa.user_rid = up.user_rid OR NOT (SELECT project_has_assigned(_project_id)))
        GROUP BY plot_uid
        HAVING project_rid = _project_id
        LIMIT _maximum
    )

    SELECT plot_uid,
        center,
        flagged,
        CASE WHEN (assigned = 0 AND collected = 1) OR (assigned > 0 AND assigned = collected)
            THEN 'analyzed'
        WHEN assigned > collected AND collected > 1
            THEN 'partial'
        ELSE
            'unanalyzed'
        END
    FROM plot_sums

$$ LANGUAGE SQL;

-- Returns plot geom for the geodash
CREATE OR REPLACE FUNCTION select_plot_geom(_plot_id integer)
 RETURNS text AS $$

    SELECT ST_AsGeoJSON(plot_geom)
    FROM plots p
    WHERE p.plot_uid = _plot_id

$$ LANGUAGE SQL;

-- Get all users who have plotted on a project
CREATE OR REPLACE FUNCTION select_plotters(_project_id integer, _plot_id integer)
 RETURNS table (
    user_id    integer,
    email      text
 ) AS $$

    SELECT DISTINCT(u.user_uid) user_id, u.email
    FROM plots p
    LEFT JOIN user_plots up
        ON p.plot_uid = up.plot_rid
    LEFT JOIN plot_assignments pa
        ON p.plot_uid = pa.plot_rid
    INNER JOIN users u
        ON u.user_uid = up.user_rid
        OR u.user_uid = pa.user_rid
    WHERE p.project_rid = _project_id
        AND (plot_uid = _plot_id
             OR _plot_id = -1)
    ORDER BY u.email

$$ LANGUAGE SQL;

-- Get user plots for a plot
CREATE OR REPLACE FUNCTION select_user_plots_info( _plot_id integer)
 RETURNS table (
    user_id       integer,
    flagged       boolean,
    confidence    integer
 ) AS $$

    SELECT user_rid,
        flagged,
        confidence
    FROM user_plots
    WHERE plot_rid = _plot_id

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
    extra_plot_info    jsonb,
    user_id            integer,
    email              text
);

CREATE OR REPLACE FUNCTION select_unanalyzed_plots(_project_id integer, _user_id integer, _review_mode boolean)
 RETURNS setOf collection_return AS $$

    SELECT plot_uid,
        flagged,
        flagged_reason,
        confidence,
        visible_id,
        ST_AsGeoJSON(plot_geom) as plot_geom,
        extra_plot_info,
        pa.user_rid,
        u.email
    FROM plots
    LEFT JOIN plot_assignments pa
        ON plot_uid = pa.plot_rid
    LEFT JOIN user_plots up
        ON plot_uid = up.plot_rid
        AND (pa.user_rid = up.user_rid OR NOT (SELECT project_has_assigned(_project_id)))
    LEFT JOIN plot_locks pl
        ON plot_uid = pl.plot_rid
    LEFT JOIN users u
        ON pa.user_rid = u.user_uid
    WHERE project_rid = _project_id
        AND user_plot_uid IS NULL
        AND ((pa.user_rid IS NULL
                AND (pl.lock_end IS NULL
                     OR localtimestamp > pl.lock_end)) -- unlocked
             OR pa.user_rid = _user_id                 -- assigned
             OR _review_mode)                          -- admin TODO, CEO-208 should admin be able to visit a locked plot? probably.
    ORDER BY visible_id ASC

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_analyzed_plots(_project_id integer, _user_id integer, _review_mode boolean)
 RETURNS setOf collection_return AS $$

    SELECT plot_uid,
        flagged,
        flagged_reason,
        confidence,
        visible_id,
        ST_AsGeoJSON(plot_geom) as plot_geom,
        extra_plot_info,
        u.user_uid,
        u.email
    FROM plots
    INNER JOIN user_plots up
        ON plot_uid = plot_rid
    INNER JOIN users u
        ON u.user_uid = up.user_rid
    WHERE project_rid = _project_id
        AND (up.user_rid = _user_id OR _review_mode)
    ORDER BY visible_id ASC

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_flagged_plots(_project_id integer, _user_id integer, _review_mode boolean)
 RETURNS setOf collection_return AS $$

    SELECT plot_uid,
        flagged,
        flagged_reason,
        confidence,
        visible_id,
        ST_AsGeoJSON(plot_geom) as plot_geom,
        extra_plot_info,
        u.user_uid,
        u.email
    FROM plots
    LEFT JOIN user_plots up
        ON plot_uid = plot_rid
    INNER JOIN users u
        ON u.user_uid = up.user_rid
    WHERE project_rid = _project_id
        AND (up.user_rid = _user_id OR _review_mode)
        AND flagged = TRUE
    ORDER BY visible_id ASC

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_confidence_plots(
    _project_id integer,
    _user_id integer,
    _review_mode boolean,
    _threshold integer
 ) RETURNS setOf collection_return AS $$

    SELECT plot_uid,
        flagged,
        flagged_reason,
        confidence,
        visible_id,
        ST_AsGeoJSON(plot_geom) as plot_geom,
        extra_plot_info,
        u.user_uid,
        u.email
    FROM plots
    INNER JOIN user_plots up
        ON plot_uid = plot_rid
    INNER JOIN users u
        ON u.user_uid = up.user_rid
    WHERE project_rid = _project_id
        AND (up.user_rid = _user_id OR _review_mode)
        AND confidence <= _threshold
    ORDER BY visible_id ASC

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_qaqc_plots(_project_id integer)
 RETURNS setOf collection_return AS $$

    WITH assigned_count AS (
        SELECT pa.plot_rid AS plot_rid, count(pa.user_rid) users
        FROM plots, plot_assignments pa
        WHERE project_rid = _project_id
            AND plot_uid = pa.plot_rid
        GROUP BY pa.plot_rid
    )

    SELECT plot_uid,
        up.flagged,
        up.flagged_reason,
        confidence,
        visible_id,
        ST_AsGeoJSON(plot_geom) as plot_geom,
        extra_plot_info,
        u.user_uid,
        u.email
    FROM plots
    INNER JOIN assigned_count ac
        ON plot_uid = ac.plot_rid
    INNER JOIN user_plots up
        ON plot_uid = up.plot_rid
    INNER JOIN users u
        ON u.user_uid = up.user_rid
    WHERE project_rid = _project_id
        AND ac.users > 1
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
        SELECT count(*) as user_count
        FROM plot_assignments
        WHERE plot_rid = _plot_id
    )

    SELECT sample_uid,
        ST_AsGeoJSON(sample_geom) AS sample_geom,
        (CASE WHEN sv.saved_answers IS NULL THEN '{}' ELSE sv.saved_answers END)
    FROM samples s
    LEFT JOIN plot_assignments pa
        ON s.plot_rid = pa.plot_rid
    LEFT JOIN user_plots up
        ON s.plot_rid = up.plot_rid
        AND (pa.user_rid = up.user_rid OR (SELECT user_count FROM assigned_count) = 0)
    LEFT JOIN sample_values sv
        ON sample_uid = sv.sample_rid
        AND user_plot_uid = sv.user_plot_rid
    WHERE s.plot_rid = _plot_id
        AND (pa.user_rid IS NULL OR pa.user_rid = _user_id)

$$ LANGUAGE SQL;

-- Select samples for a plot.
CREATE OR REPLACE FUNCTION select_qaqc_plot_samples(_plot_id integer)
 RETURNS table (
    user_id          integer,
    sample_id        integer,
    saved_answers    jsonb
 ) AS $$


    SELECT up.user_rid,
        sample_uid,
        (CASE WHEN sv.saved_answers IS NULL THEN '{}' ELSE sv.saved_answers END)
    FROM samples s
    LEFT JOIN user_plots up
        ON s.plot_rid = up.plot_rid
    LEFT JOIN sample_values sv
        ON sample_uid = sv.sample_rid
        AND user_plot_uid = sv.user_plot_rid
    WHERE s.plot_rid = _plot_id

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
