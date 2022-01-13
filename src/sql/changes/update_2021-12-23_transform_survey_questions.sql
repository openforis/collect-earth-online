-- Clean bad surveys

CREATE OR REPLACE FUNCTION missing_answers_count(_questions jsonb)
 RETURNS int AS $$

    SELECT SUM(
        CASE WHEN (value->>'answers' = 'null' OR jsonb_typeof(value->'answers') <> 'array')
        THEN 1
        ELSE 0
        END
    )::int
    FROM (
        SELECT value
        FROM jsonb_array_elements(_questions)
    ) a

$$ LANGUAGE SQL;

SELECT delete_project(project_uid)
FROM projects
WHERE missing_answers_count(survey_questions) > 0;

-- Update survey questions

CREATE OR REPLACE FUNCTION answer_reduce(_answers jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_object_agg(
        value->>'id', value - 'id'
    )
    FROM (
        SELECT value
        FROM jsonb_array_elements(coalesce(_answers, '[]'::jsonb))
    ) a

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION survey_reduce(_questions jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_object_agg(
        value->>'id', jsonb_set(value, '{"answers"}', answer_reduce(value->'answers')) - 'id'
    )
    FROM (
        SELECT value
        FROM jsonb_array_elements(_questions)
    ) a

$$ LANGUAGE SQL;

ALTER TABLE projects ADD COLUMN sq_bk jsonb;
UPDATE projects SET sq_bk = survey_questions;
UPDATE projects SET survey_questions = survey_reduce(survey_questions);
