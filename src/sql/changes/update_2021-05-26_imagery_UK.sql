-- Set imagery with repeating names to (#)
UPDATE imagery i
SET title = new_title
FROM
(
    SELECT i.imagery_uid, i.title || ' (' || ROW_NUMBER() OVER(PARTITION BY i.institution_rid) || ')' as new_title
    FROM imagery i
    INNER JOIN
    (
        SELECT institution_rid, title, count(imagery_uid), max(imagery_uid)
        FROM imagery
        WHERE archived = false
        GROUP BY institution_rid, title
        HAVING count(imagery_uid) > 1
    ) aa
    ON aa.institution_rid = i.institution_rid
        AND aa.title = i.title
) zz
where zz.imagery_uid = i.imagery_uid
