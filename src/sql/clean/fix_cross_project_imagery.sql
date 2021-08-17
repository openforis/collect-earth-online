UPDATE projects
SET imagery_rid = (SELECT select_first_public_imagery())
WHERE project_uid IN (
    SELECT project_uid
    FROM imagery i
    INNER JOIN projects p
        ON imagery_uid = imagery_rid
    WHERE i.institution_rid <> p.institution_rid
        AND i.institution_rid <> 3
);
