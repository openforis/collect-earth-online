DELETE FROM ext_samples
WHERE plot_rid IN (
    SELECT plot_uid
    FROM projects, plots
    WHERE project_rid = project_uid
        AND (availability = 'published'
            OR availability = 'closed')
);
