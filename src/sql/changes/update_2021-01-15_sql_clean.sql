-- Helper functions

CREATE OR REPLACE FUNCTION find_json_id(json_arr jsonb, key text, match text)
 RETURNS integer AS $$

    SELECT (value->>'id')::int
    FROM jsonb_array_elements(json_arr)
    WHERE value->>key = match

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION find_json_index(json_arr jsonb, key text, match text)
 RETURNS integer AS $$

    SELECT idx
    FROM (
        SELECT (row_number() over() -1)::int as idx, value
        FROM jsonb_array_elements(json_arr)
    ) i
    WHERE value->>key = match

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION find_json_by_id(json_arr jsonb, id text, field text)
 RETURNS text AS $$

    SELECT value->>field
    FROM jsonb_array_elements(json_arr)
    WHERE value->>'id' = id

$$ LANGUAGE SQL;

-- projects.survey_questions

CREATE OR REPLACE FUNCTION convert_values_to_answers(json_arr jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_agg(answers)
    FROM (
        SELECT jsonb_build_object(
            'id', value->'id',
            'color', CASE WHEN value->'color' IS NULL THEN '"#1527f6"' ELSE value->'color' END,
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

-- sample_values.value

CREATE OR REPLACE FUNCTION answer_short_to_long(json_obj jsonb, survey_questions jsonb)
 RETURNS jsonb AS $$

    WITH pairs AS (
        SELECT * FROM jsonb_each(json_obj)
    ), new_values as (
        SELECT key,
            jsonb_build_object(
                'answer', value,
                'answerId', (SELECT find_json_id(
                    survey_questions->(
                        SELECT find_json_index(survey_questions, 'question', key)
                    )->'answers',
                    'answer',
                    value->>0)),
                'questionId', (SELECT find_json_id(survey_questions, 'question', key))
            ) as value
        FROM pairs
    )

    SELECT jsonb_object_agg(key, value) FROM new_values

$$ LANGUAGE SQL;

UPDATE sample_values sv1 SET value = (
    SELECT jsonb_build_object(
        survey_questions->0->>'question',
        jsonb_build_object(
            'answer', (SELECT find_json_by_id(survey_questions->0->'answers', value::text, 'answer')),
            'answerId', value::text,
            'questionId', 1
        )
    )
    FROM sample_values sv2, samples, plots, projects
    WHERE sv1.sample_value_uid = sv2.sample_value_uid
        AND sample_uid = sample_rid
        AND plot_rid = plot_uid
        AND project_rid = project_uid
)
WHERE sample_value_uid IN (
    SELECT sample_value_uid
    FROM sample_values, samples, plots, projects
    WHERE sample_uid = sample_rid
        AND plot_rid = plot_uid
        AND project_rid = project_uid
        AND jsonb_typeof(value) = 'number'
);

UPDATE sample_values sv1 SET value = (
    SELECT answer_short_to_long(value, survey_questions)
    FROM sample_values sv2, samples, plots, projects
    WHERE sv1.sample_value_uid = sv2.sample_value_uid
        AND sample_uid = sample_rid
        AND plot_rid = plot_uid
        AND project_rid = project_uid
)
WHERE sample_value_uid IN (
    SELECT sample_value_uid
    FROM (
        SELECT sample_value_uid,
            value,
            sample_rid,
            value->jsonb_object_keys(value) as val
        FROM sample_values
    ) a, samples, plots, projects as p
    WHERE sample_uid = sample_rid
        AND plot_rid = plot_uid
        AND project_rid = project_uid
        AND jsonb_typeof(value) = 'object'
        AND jsonb_typeof(val) = 'string'
);

DROP FUNCTION IF EXISTS find_json_id;
DROP FUNCTION IF EXISTS find_json_index;
DROP FUNCTION IF EXISTS find_json_by_id;
DROP FUNCTION IF EXISTS convert_values_to_answers;
DROP FUNCTION IF EXISTS convert_name_to_question;
DROP FUNCTION IF EXISTS answer_short_to_long;

ALTER TABLE sample_values RENAME COLUMN value TO saved_answers;

-- Update project routes
DROP TYPE IF EXISTS project_return IF EXISTS CASCADE;
DROP VIEW IF EXISTS project_boundary CASCADE;

-- Convert logo to bytea

DROP TYPE IF EXISTS institution_return CASCADE;

ALTER TABLE institutions DROP COLUMN IF EXISTS logo;

CREATE OR REPLACE FUNCTION add_institution_logo_by_file(_institution_id integer, _file_name text)
 RETURNS integer AS $$

    UPDATE institutions
    SET logo_data = pg_read_binary_file(_file_name)
    WHERE institution_uid = _institution_id
    RETURNING institution_uid

$$ LANGUAGE SQL;

-- Clean up
DELETE FROM institution_users WHERE user_rid = -1;

-- Eliminate plots_return types
DROP TYPE IF EXISTS plots_return;
DROP TYPE IF EXISTS plot_collection_return;
