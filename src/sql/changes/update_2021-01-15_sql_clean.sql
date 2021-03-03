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

CREATE OR REPLACE FUNCTION convert_snake_to_camel(json_arr jsonb)
 RETURNS jsonb AS $$

    SELECT jsonb_agg(questions)
    FROM (
        SELECT jsonb_build_object(
            'id', value->'id',
            'question', value->'question',
            'answers', value->'answers',
            'dataType', (CASE WHEN value->>'dataType' IS NOT NULL THEN value->>'dataType' ELSE 'text' END),
            'componentType', (CASE WHEN value->>'componentType' IS NOT NULL THEN value->>'componentType' ELSE 'button' END),
            'parentQuestion', value->'parent_question',
            'parentAnswer', value->'parent_answer'
        )  AS questions
        FROM jsonb_array_elements(json_arr)
    ) a

$$ LANGUAGE SQL;

UPDATE projects
SET survey_questions = (SELECT convert_name_to_question(survey_questions))
WHERE survey_questions->0->'values' IS NOT NULL;

UPDATE projects
SET survey_questions = (SELECT convert_snake_to_camel(survey_questions))
WHERE survey_questions->0->'parent_question' IS NOT NULL;

SELECT count(1) AS empty_questions_deletes
FROM (
    SELECT (SELECT delete_project(project_uid))
    FROM projects
    WHERE survey_questions->0 IS NULL
        OR survey_questions IS NULL
        OR survey_questions = 'null'
) a;

-- Sanity check

SELECT count(1) AS malformed_questions_count
FROM projects
WHERE survey_questions->0 IS NULL
    OR survey_questions IS NULL
    OR survey_questions = 'null'
    OR survey_questions->0->'id' IS NULL
    OR survey_questions->0->'question' IS NULL
    OR survey_questions->0->'answers' IS NULL
    OR survey_questions->0->'dataType' IS NULL
    OR survey_questions->0->'componentType' IS NULL
    OR survey_questions->0->'parentQuestion' IS NULL
    OR survey_questions->0->'parentAnswer' IS NULL;

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

CREATE OR REPLACE FUNCTION answer_medium_to_long(json_obj jsonb, survey_questions jsonb)
 RETURNS jsonb AS $$

    WITH pairs AS (
        SELECT * FROM jsonb_each(json_obj)
    ), new_values as (
        SELECT key,
            jsonb_build_object(
                'answer', value->>'answer',
                'answerId', (SELECT find_json_id(
                    survey_questions->(
                        SELECT find_json_index(survey_questions, 'question', key)
                    )->'answers',
                    'answer',
                    value->>'answer')),
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

UPDATE sample_values sv1 SET value = (
    SELECT answer_medium_to_long(value, survey_questions)
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
        AND jsonb_typeof(val) = 'object'
        AND (val->'questionId' is null
            OR val->'answerId' is null)
);

ALTER TABLE sample_values RENAME COLUMN value TO saved_answers;

-- Sanity Checks

SELECT count(1) as answers_not_objects
FROM sample_values
WHERE jsonb_typeof(saved_answers) <> 'object';

SELECT count(1) as malformed_answer_objects
    FROM (
        SELECT sample_value_uid,
            saved_answers,
            sample_rid,
            saved_answers->jsonb_object_keys(saved_answers) as val
        FROM sample_values
    ) a, samples, plots, projects as p
    WHERE sample_uid = sample_rid
        AND plot_rid = plot_uid
        AND project_rid = project_uid
        AND jsonb_typeof(saved_answers) = 'object'
        AND (jsonb_typeof(val) <> 'object'
            OR val->'questionId' is null
            OR val->'answerId' is null);

DROP FUNCTION IF EXISTS find_json_id;
DROP FUNCTION IF EXISTS find_json_index;
DROP FUNCTION IF EXISTS find_json_by_id;
DROP FUNCTION IF EXISTS convert_values_to_answers;
DROP FUNCTION IF EXISTS convert_name_to_question;
DROP FUNCTION IF EXISTS answer_short_to_long;
DROP FUNCTION IF EXISTS answer_medium_to_long;

-- Update project routes
DROP TYPE IF EXISTS project_return CASCADE;
DROP VIEW IF EXISTS project_boundary CASCADE;

-- Convert logo to bytea

DROP TYPE IF EXISTS institution_return CASCADE;

ALTER TABLE institutions DROP COLUMN IF EXISTS logo;

-- Clean up
DELETE FROM institution_users WHERE user_rid = -1;

-- Eliminate plots_return types
DROP TYPE IF EXISTS plots_return CASCADE;
DROP TYPE IF EXISTS plot_collection_return CASCADE;
