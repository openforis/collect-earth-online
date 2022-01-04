CREATE OR REPLACE FUNCTION survey_rules_rename_key(_questions jsonb, _from text, _to text)
 RETURNS jsonb AS $$

    SELECT  jsonb_agg(
        CASE WHEN value->_from IS NOT NULL THEN
            jsonb_set(value, ('{"' || _to || '"}')::text[], value->_from) - _from
        ELSE
            value
        END
    )
    FROM (
        SELECT value
        FROM jsonb_array_elements(_questions)
    ) a

$$ LANGUAGE SQL;

-- sum of answers
UPDATE projects SET survey_rules = survey_rules_rename_key(survey_rules, 'questions', 'questionIds');

-- incompatible answers
UPDATE projects SET survey_rules = survey_rules_rename_key(survey_rules, 'question1', 'questionId1');
UPDATE projects SET survey_rules = survey_rules_rename_key(survey_rules, 'question2', 'questionId2');
UPDATE projects SET survey_rules = survey_rules_rename_key(survey_rules, 'answer1', 'answerId1');
UPDATE projects SET survey_rules = survey_rules_rename_key(survey_rules, 'answer2', 'answerId2');

-- matching sums
UPDATE projects SET survey_rules = survey_rules_rename_key(survey_rules, 'questionSetIds1', 'questionIds1');
UPDATE projects SET survey_rules = survey_rules_rename_key(survey_rules, 'questionSetIds2', 'questionIds2');
