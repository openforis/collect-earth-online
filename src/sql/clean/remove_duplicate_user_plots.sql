DELETE FROM user_plots up
USING (
    SELECT plot_uid, count(plot_uid) as cnt, MAX(user_plot_uid) as max_id
    FROM plots p INNER JOIN user_plots up
        ON plot_uid = up.plot_rid
    GROUP BY plot_uid
    HAVING count(plot_uid) > 1
) b
WHERE up.plot_rid = b.plot_uid
    AND up.user_plot_uid <> max_id
