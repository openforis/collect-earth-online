-- Projects before saving created date
UPDATE projects
SET created_date = '2018-11-01'::date
WHERE created_date IS NULL;

-- Projects archived before saving archive date
UPDATE projects
SET archived_date = '2018-12-01'::date
WHERE archived_date IS NULL
    AND availability = 'archived';

-- Projects not archived with an archived date
UPDATE projects
SET archived_date = NULL
WHERE archived_date IS NOT NULL
    AND availability <> 'archived';

-- User plots before saving collection start
UPDATE user_plots
SET collection_start = '2019-03-01'::timestamp,
    collection_time = '2019-03-01'::timestamp
WHERE collection_start IS NULL;

-- Institutions before all had user 1 as admin
INSERT INTO institution_users
(user_rid, institution_rid, role_rid)
(SELECT 1, institution_uid, 1
 FROM  institutions
 LEFT JOIN institution_users
    ON institution_rid = institution_uid
    AND user_rid = 1
 WHERE institution_rid IS NULL);
