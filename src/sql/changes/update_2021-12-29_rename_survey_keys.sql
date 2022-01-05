CREATE OR REPLACE FUNCTION survey_rename_key(_questions jsonb, _from text, _to text)
 RETURNS jsonb AS $$

    SELECT jsonb_object_agg(
        key, jsonb_set(value, ('{"' || _to || '"}')::text[], value->_from) - _from
    )
    FROM (
        SELECT key, value
        FROM jsonb_each(_questions)
    ) a

$$ LANGUAGE SQL;

UPDATE projects SET survey_questions = survey_rename_key(survey_questions, 'parentQuestion', 'parentQuestionId');
UPDATE projects SET survey_questions = survey_rename_key(survey_questions, 'parentAnswer', 'parentAnswerId');
