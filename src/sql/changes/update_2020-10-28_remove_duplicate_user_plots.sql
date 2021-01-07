DELETE FROM user_plots up
USING (
    SELECT * FROM (
        SELECT plot_uid, count(plot_uid) as cnt, MIN(collection_start)
        FROM plots p INNER JOIN user_plots up
            ON plot_uid = up.plot_rid
        GROUP BY plot_uid
    ) a
    WHERE cnt = 2
) b
WHERE up.plot_rid = b.plot_uid
    AND (up.collection_start = b.min OR b.min IS NULL)
