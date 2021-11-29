DELETE FROM user_plots up
USING (
    SELECT project_uid, plot_uid, visible_id, count(plot_uid) as cnt, MAX(user_plot_uid), jsonb_agg(user_rid) as max_id
    FROM plots p, user_plots up, projects
    WHERE project_uid = project_rid
        AND plot_uid = up.plot_rid
        AND design_settings->'userAssignment' IS NULL
    GROUP BY project_uid, plot_uid
    HAVING count(plot_uid) > 1;
) b
WHERE up.plot_rid = b.plot_uid
    AND up.user_plot_uid <> max_id
