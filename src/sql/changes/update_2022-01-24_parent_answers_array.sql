CREATE OR REPLACE FUNCTION survey_answer_array(_questions jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_object_agg(
        key, jsonb_set(
            value,
            '{"parentAnswerId"}',
            CASE WHEN value->>'parentAnswerId' = '-1' THEN
                '[]'::jsonb
            ELSE
                jsonb_build_array(value->'parentAnswerId')
            END
        )
    )
    FROM (
        SELECT key, value
        FROM jsonb_each(_questions)
    ) a

$$ LANGUAGE SQL;

UPDATE projects SET survey_questions = survey_answer_array(survey_questions);

UPDATE projects SET survey_questions = survey_rename_key(survey_questions, 'parentAnswerId', 'parentAnswerIds');
