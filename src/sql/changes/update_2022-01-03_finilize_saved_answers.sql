CREATE OR REPLACE FUNCTION simple_val(_saved_answers jsonb, _survey_questions jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_object_agg(
        value->>'questionId',
        CASE WHEN pg_typeof(value)::text <> 'jsonb' THEN
            value
        WHEN _survey_questions->(value->>'questionId')->>'componentType' = 'input' THEN
            value - 'questionId'
        ELSE
            value - 'questionId' - 'answer'
        END
    )
    FROM (
        SELECT value
        FROM jsonb_each(_saved_answers)
    ) a

$$ LANGUAGE SQL;

UPDATE sample_values sv
SET saved_answers = simple_val(sv.saved_answers, survey_questions)
FROM (
    SELECT sample_value_uid, survey_questions, saved_answers
    FROM sample_values, user_plots, plots, projects
    WHERE project_uid = project_rid
        AND plot_uid = plot_rid
        AND user_plot_uid = user_plot_rid
		AND sample_value_uid < 8000000
) x
WHERE sv.sample_value_uid = x.sample_value_uid;

UPDATE sample_values sv
SET saved_answers = simple_val(sv.saved_answers, survey_questions)
FROM (
    SELECT sample_value_uid, survey_questions, saved_answers
    FROM sample_values, user_plots, plots, projects
    WHERE project_uid = project_rid
        AND plot_uid = plot_rid
        AND user_plot_uid = user_plot_rid
		AND sample_value_uid >= 8000000
) x
WHERE sv.sample_value_uid = x.sample_value_uid;
