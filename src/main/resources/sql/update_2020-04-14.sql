DROP FUNCTION dump_project_plot_data(_project_uid integer);

-- Returns project aggregate data
CREATE FUNCTION dump_project_plot_data(_project_uid integer)
 RETURNS TABLE (
        plot_id              integer,
        lon                  float,
        lat                  float,
        plot_shape           text,
        plot_size            float,
        email                text,
        confidence           integer,
        flagged              integer,
        assigned             integer,
        collection_time      timestamp,
        analysis_duration    numeric,
        samples              text,
        ext_plot_data        jsonb
 ) AS $$

    WITH all_rows AS (
        SELECT pl.ext_id as pl_ext_id, *
        FROM select_all_project_plots(_project_uid) pl
        INNER JOIN samples s
            ON s.plot_rid = pl.plot_id
        LEFT JOIN sample_values sv
            ON sample_uid = sv.sample_rid
    ), tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_uid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), plots_agg AS (
        SELECT plot_id,
            center,
            MAX(username) AS email,
            MAX(confidence) as confidence,
            cast(SUM(CASE WHEN flagged > 0 THEN 1 ELSE 0 END) as int) as flagged,
            cast(SUM(CASE WHEN username <> '' AND username IS NOT NULL AND flagged=0 THEN 1 ELSE 0 END) as int) as assigned,
            MAX(collection_time) as collection_time,
            MAX(analysis_duration) as analysis_duration,
            format('[%s]', string_agg(
                (CASE WHEN "value" IS NULL THEN
                    format('{"%s":"%s"}', 'id', sample_uid)
                ELSE
                    format('{"%s":"%s", "%s":%s}', 'id', sample_uid, 'value', "value")
                END) , ', ')) as samples,
            pl_ext_id,
            project_id
        FROM all_rows
        GROUP BY plot_id, center, pl_ext_id, project_id
    )
    SELECT plot_id,
        ST_X(ST_SetSRID(ST_GeomFromGeoJSON(center), 4326)) AS lon,
        ST_Y(ST_SetSRID(ST_GeomFromGeoJSON(center), 4326)) AS lat,
        plot_shape,
        plot_size,
        email,
        confidence,
        flagged,
        assigned,
        collection_time::timestamp,
        analysis_duration,
        samples,
        pfd.rem_data
    FROM projects p
    INNER JOIN plots_agg pa
        ON project_uid = pa.project_id
    LEFT JOIN plots_file_data pfd
        ON pl_ext_id = pfd.ext_id
    ORDER BY plot_id

$$ LANGUAGE SQL;
