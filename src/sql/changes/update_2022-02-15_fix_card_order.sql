CREATE OR REPLACE FUNCTION survey_card_order(_questions jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_object_agg(
        key,
        CASE WHEN value->>'parentQuestionId' = '-1' THEN
            jsonb_set(
                value,
                '{"cardOrder"}',
                to_jsonb(rr::int)
            )
        ELSE
            value
        END
    )
    FROM (
        SELECT key, value, row_number() over() as rr
        FROM jsonb_each(_questions)
    ) a

$$ LANGUAGE SQL;

UPDATE projects SET survey_questions = survey_card_order(survey_questions);
