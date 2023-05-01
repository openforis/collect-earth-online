CREATE VIEW plot_shapes AS
SELECT plot_geom AS geometry, project_rid as p_id
FROM plots;

CREATE VIEW sample_shapes AS
SELECT s.sample_geom AS geometry, p.project_rid as project_id, s.plot_rid as plot_id
FROM samples AS s
INNER JOIN plots AS p ON p.plot_uid = s.plot_rid;
