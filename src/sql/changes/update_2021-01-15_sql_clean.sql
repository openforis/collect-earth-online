DROP TYPE project_return;

CREATE OR REPLACE FUNCTION convert_values_to_answers(json_arr jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_agg(answers)
    FROM (
        SELECT jsonb_build_object(
            'id', value->'id',
            'color', value->'color',
            'answer', value->'name'
        )  AS answers
        FROM jsonb_array_elements(json_arr)
    ) a

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION convert_name_to_question(json_arr jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_agg(questions)
    FROM (
        SELECT jsonb_build_object(
            'id', value->'id',
            'question', value->'name',
            'answers', convert_values_to_answers(value->'values'),
            'dataType', 'text',
            'componentType', 'button',
            'parentQuestion', -1,
            'parentAnswer', -1
        )  AS questions
        FROM jsonb_array_elements(json_arr)
    ) a

$$ LANGUAGE SQL;

UPDATE projects
SET survey_questions = (SELECT convert_name_to_question(survey_questions))
WHERE survey_questions->0->'values' IS NOT NULL;

DROP FUNCTION convert_values_to_answers;
DROP FUNCTION convert_name_to_question;
