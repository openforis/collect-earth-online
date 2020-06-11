DROP FUNCTION select_plot_by_id(integer, integer);
DROP FUNCTION select_next_unassigned_plot(integer, integer);
DROP FUNCTION select_next_user_plot(integer, integer, text);
DROP FUNCTION select_next_user_plot_by_admin(integer, integer);
DROP FUNCTION select_prev_unassigned_plot(integer, integer);
DROP FUNCTION select_prev_user_plot(integer, integer, text);
DROP FUNCTION select_prev_user_plot_by_admin(integer, integer);
DROP FUNCTION select_unassigned_plot_by_id(integer, integer);
DROP FUNCTION select_user_plot_by_id(integer, integer, text);

CREATE TYPE plot_collection_return AS (
    plot_id              integer,
    project_id           integer,
    center               text,
    flagged              integer,
    assigned             integer,
    username             text,
    confidence           integer,
    collection_time      timestamp,
    ext_id               integer,
    plotId               integer,
    geom                 text,
    analysis_duration    numeric,
    extra_plot           jsonb,
    extra_sample         jsonb
);

-- Returns next plot by id
CREATE OR REPLACE FUNCTION select_plot_by_id(_project_rid integer, _plot_uid integer)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId = _plot_uid

$$ LANGUAGE SQL;

-- Returns next unanalyzed plot
CREATE OR REPLACE FUNCTION select_next_unassigned_plot(_project_rid integer, _plot_uid integer)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_unlocked_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId > _plot_uid
        AND flagged = 0
        AND assigned = 0
    ORDER BY plotId ASC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns next user analyzed plot
CREATE OR REPLACE FUNCTION select_next_user_plot(_project_rid integer, _plot_uid integer, _username text)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId > _plot_uid
        AND spp.username = _username
    ORDER BY plotId ASC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns next user analyzed plot asked by admin
CREATE OR REPLACE FUNCTION select_next_user_plot_by_admin(_project_rid integer, _plot_uid integer)
    RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId > _plot_uid
        AND spp.username != ''
    ORDER BY plotId ASC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns prev unanalyzed plot
CREATE OR REPLACE FUNCTION select_prev_unassigned_plot(_project_rid integer, _plot_uid integer)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_unlocked_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId < _plot_uid
        AND flagged = 0
        AND assigned = 0
    ORDER BY plotId DESC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns prev user analyzed plot
CREATE OR REPLACE FUNCTION select_prev_user_plot(_project_rid integer, _plot_uid integer, _username text)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId < _plot_uid
        AND spp.username = _username
    ORDER BY plotId DESC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns prev user analyzed plot asked by admin
CREATE OR REPLACE FUNCTION select_prev_user_plot_by_admin(_project_rid integer, _plot_uid integer)
    RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId < _plot_uid
        AND spp.username != ''
    ORDER BY plotId DESC
    LIMIT 1

$$ LANGUAGE SQL;

-- Returns unanalyzed plots by plot id
CREATE OR REPLACE FUNCTION select_unassigned_plot_by_id(_project_rid integer, _plot_uid integer)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_unlocked_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId = _plot_uid
        AND flagged = 0
        AND assigned = 0

$$ LANGUAGE SQL;

-- Returns user analyzed plots by plot id
CREATE OR REPLACE FUNCTION select_user_plot_by_id(_project_rid integer, _plot_uid integer, _username text)
 RETURNS setOf plot_collection_return AS $$

    WITH tablenames AS (
        SELECT plots_ext_table, samples_ext_table
        FROM projects
        WHERE project_uid = _project_rid
    ), plots_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT plots_ext_table FROM tablenames))
    ), samples_file_data AS (
        SELECT * FROM select_json_table_by_name((SELECT samples_ext_table FROM tablenames))
    )

    SELECT spp.*,
       pfd.rem_data,
       sfd.rem_data
    FROM select_all_project_plots(_project_rid) as spp
    INNER JOIN samples s
        ON s.plot_rid = plot_id
    LEFT JOIN plots_file_data pfd
        ON spp.ext_id = pfd.ext_id
    LEFT JOIN samples_file_data sfd
        ON s.ext_id = sfd.ext_id
    WHERE spp.plotId = _plot_uid
        AND spp.username = _username

$$ LANGUAGE SQL;
