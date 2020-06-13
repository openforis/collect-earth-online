UPDATE imagery
SET source_config = source_config || '{"startDate": "2018-01-01", "endDate": "2018-12-31"}'::jsonb
WHERE source_config->>'type'='SecureWatch'
	AND (source_config->>'startDate' IS NULL OR source_config->>'endDate' IS NULL);

-- update imagery attributes where imagerySecureWatchDate is present and its value is null
UPDATE sample_values
SET imagery_attributes = imagery_attributes || '{"imagerySecureWatchDate": ""}'::jsonb
WHERE (imagery_attributes->'imagerySecureWatchDate') IS NOT NULL
    AND imagery_attributes->>'imagerySecureWatchDate' IS NULL;


DROP FUNCTION dump_project_plot_data(_project_uid integer);

-- Returns project aggregate data
CREATE FUNCTION dump_project_plot_data(_project_uid integer)
 RETURNS TABLE (
        plot_id                     integer,
        lon                         float,
        lat                         float,
        plot_shape                  text,
        plot_size                   float,
        email                       text,
        confidence                  integer,
        flagged                     integer,
        assigned                    integer,
        collection_time             timestamp,
        analysis_duration           numeric,
        samples                     text,
        common_securewatch_date     date,
        total_securewatch_dates     integer,
        ext_plot_data               jsonb
 ) AS $$

    WITH all_rows AS (
        SELECT pl.ext_id as pl_ext_id,
        (CASE WHEN imagery_attributes->>'imagerySecureWatchDate' = '' OR imagery_attributes->'imagerySecureWatchDate' IS NULL THEN NULL
  			ELSE TO_DATE(imagery_attributes->>'imagerySecureWatchDate', 'YYYY-MM-DD') END) as imagerySecureWatchDate,
        *
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
    ), _plots_agg AS (
        SELECT plot_id,
            center,
            MAX(username) AS email,
            MAX(confidence) as confidence,
            MAX(flagged) as flagged,
            MAX(assigned) as assigned,
            MAX(collection_time) as collection_time,
            MAX(analysis_duration) as analysis_duration,
            format('[%s]', string_agg(
                (CASE WHEN "value" IS NULL THEN
                    format('{"%s":"%s"}', 'id', sample_uid)
                ELSE
                    format('{"%s":"%s", "%s":%s}', 'id', sample_uid, 'value', "value")
                END) , ', ')) as samples,
            pl_ext_id,
            project_id,
            imagerySecureWatchDate as grouped_securewatch_date,
            COUNT(imagerySecureWatchDate) as grouped_count_securewatch_date
        FROM all_rows
        GROUP BY plot_id, center, pl_ext_id, project_id, imagerySecureWatchDate
    ), plots_agg AS (
	    SELECT *
	    FROM _plots_agg
	    INNER JOIN (
   		    SELECT plot_id AS _plot_id, MAX(grouped_count_securewatch_date) AS max_count
   		    FROM _plots_agg
   		    GROUP BY plot_id
	    ) AS t
		    ON t._plot_id = _plots_agg.plot_id
			    AND t.max_count = _plots_agg.grouped_count_securewatch_date
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
        grouped_securewatch_date AS common_securewatch_date,
        grouped_count_securewatch_date::integer AS total_securewatch_dates,
        pfd.rem_data
    FROM projects p
    INNER JOIN plots_agg pa
        ON project_uid = pa.project_id
    LEFT JOIN plots_file_data pfd
        ON pl_ext_id = pfd.ext_id
    ORDER BY plot_id

$$ LANGUAGE SQL;
