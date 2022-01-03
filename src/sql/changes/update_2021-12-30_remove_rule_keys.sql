CREATE OR REPLACE FUNCTION remove_rules_keys(_rules jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_agg(
        value - 'questionsText'
            - 'questionsText'
            - 'questionSetText1'
            - 'questionSetText2'
            - 'questionText1'
            - 'questionText2'
            - 'answerText1'
            - 'answerText2'
    )
    FROM (
        SELECT value
        FROM jsonb_array_elements(_rules)
    ) a

$$ LANGUAGE SQL;

UPDATE projects SET survey_rules = remove_rules_keys(survey_rules);
