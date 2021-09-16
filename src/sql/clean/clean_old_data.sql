-- Validate and then move to functions where it can run every time the server is re-deployed

-- Archive malformed projects
SELECT archive_project(project_uid)
FROM projects
WHERE availability <> 'archived'
    AND (survey_questions->0 IS NULL
        OR survey_questions IS NULL
        OR survey_questions = 'null');

-- Archive old projects
SELECT archive_project(project_uid)
FROM (
    SELECT project_uid,
        availability,
        EXTRACT(days FROM now() - (
            CASE WHEN max(collection_start) IS NULL
                 THEN created_date
                 ELSE max(collection_start)
            END
        )) as proj_age,
        CASE WHEN count(DISTINCT(user_plot_uid)) = 0
             THEN 0
             ELSE count(DISTINCT(user_plot_uid)) / count(DISTINCT(plot_uid))::float
        END as pct_complete
    FROM projects
    LEFT JOIN plots
        ON project_uid = project_rid
    LEFT JOIN user_plots up
        ON plot_uid = up.plot_rid
    WHERE availability <> 'archived'
    GROUP BY project_uid
) a
WHERE (proj_age > 180
        AND ((availability = 'unpublished' AND pct_complete < 0.05)
            OR (availability = 'closed' AND pct_complete < 0.05)
            OR (availability = 'published' AND pct_complete = 0)))
    OR (proj_age > 270 AND pct_complete < 0.05)
    OR (proj_age > 730 AND pct_complete < 0.20);

-- Deep archive projects
SELECT deep_archive_project(project_uid)
FROM (
    SELECT project_uid, EXTRACT(days FROM now() - archived_date) as days_archived
    FROM projects
    WHERE availability = 'archived'
) a
WHERE days_archived > 120;

-- Delete deep archive projects
SELECT delete_project(project_uid)
FROM (
    SELECT project_uid, EXTRACT(days FROM now() - archived_date) as days_archived
    FROM projects
    WHERE availability = 'archived'
) a
WHERE days_archived > 365;

-- Archive empty institutions
SELECT archive_institution(institution_uid)
FROM (
    SELECT institution_uid,
        count(project_uid) FILTER (WHERE availability <> 'archived') active_project_cnt,
        count(project_uid) total_project_cnt,
        EXTRACT(days FROM now() - i.created_date) as inst_age,
        EXTRACT(days FROM now() - max(p.archived_date)) as last_project_age
    FROM institutions i
    LEFT JOIN projects p
        ON institution_uid = institution_rid
    WHERE archived = FALSE
    GROUP BY institution_uid
) a
WHERE (total_project_cnt = 0 AND inst_age > 180) -- Institutions that never had a project
    OR (active_project_cnt = 0 AND last_project_age > 180); -- Inactive institutions

REINDEX DATABASE ceo;
VACUUM FULL;
