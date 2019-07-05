CREATE OR REPLACE FUNCTION plots_missing_samples(_project_uid integer)
 RETURNS TABLE (plot_id integer) AS $$

    WITH plot_tbl AS (
        SELECT * FROM select_partial_table_by_name((
            SELECT plots_ext_table
            FROM projects
            WHERE project_uid = _project_uid
    )))

    SELECT plotid
    FROM projects p
    INNER JOIN plots pl
        ON pl.project_rid = project_uid
    INNER JOIN plot_tbl
        ON pl.ext_id = plot_tbl.ext_id
    LEFT JOIN samples s
        ON plot_uid = s.plot_rid
    WHERE project_uid = _project_uid
        AND sample_uid IS NULL

$$ LANGUAGE SQL;
