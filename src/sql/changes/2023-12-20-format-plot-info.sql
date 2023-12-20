CREATE OR REPLACE FUNCTION format_extra_plot_info (project_id_arg INT)
RETURNS VOID AS $$
UPDATE plots AS p
SET extra_plot_info = (
    SELECT jsonb_object_agg(
        key,
        CASE
            WHEN value ~ '^[-+]?[0-9]*\.?[0-9]+$' THEN
                CAST(value AS NUMERIC(10,4))::TEXT
            ELSE
                value::TEXT
        END
    )
    FROM jsonb_each_text(p.extra_plot_info)
)
WHERE p.project_rid = project_id_arg
$$ LANGUAGE SQL;
