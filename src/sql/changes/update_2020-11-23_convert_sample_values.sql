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

CREATE OR REPLACE FUNCTION find_json_id(json_arr jsonb, key text, match text)
 RETURNS integer AS $$

    SELECT (value->>'id')::int
    FROM jsonb_array_elements(json_arr)
    WHERE value->>key = match

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION find_json_index(json_arr jsonb, key text, match text)
 RETURNS integer AS $$

    SELECT (row_number() over() -1)::int
    FROM jsonb_array_elements(json_arr)
    WHERE value->>key = match

$$ LANGUAGE SQL;

DROP FUNCTION convert_values_to_answers;
DROP FUNCTION convert_name_to_question;
DROP FUNCTION find_json_id;
DROP FUNCTION find_json_index;
