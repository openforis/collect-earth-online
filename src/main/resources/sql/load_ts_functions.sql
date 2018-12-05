--TS related functions
-- Add packet to a project.
-- Not every project needs packet. If no packet is defined, there is no need to create packet for that project.
CREATE OR REPLACE FUNCTION add_ts_packet(project_id integer, packet_id integer, plots integer[]) RETURNS VOID AS $$
    INSERT INTO ts_packets (project_id, packet_id, plot_id)
    SELECT project_id, packet_id, u.* FROM unnest(ts_plots) u;
$$ LANGUAGE SQL;

-- Assign a project (and packets if there is any) to a user
CREATE OR REPLACE FUNCTION assign_project_to_user(user_id integer, project_id integer) RETURNS VOID AS $$
    INSERT INTO ts_project_user (project_id, user_id)
    VALUES (project_id, user_id);
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION assign_project_to_user(user_id integer, project_id integer, packet_ids integer[]) RETURNS VOID AS $$
    INSERT INTO ts_project_user (project_id, user_id, packet_id)
    SELECT project_id, user_id, u.* FROM unnest(packet_ids) u;
$$ LANGUAGE SQL;

-- Get project and packet if any assigned to a user
CREATE OR REPLACE FUNCTION get_project_for_user(interpreter integer) RETURNS TABLE
(
  project_id    integer,
  name          text,
  description   text,
  interpreter   integer,
  ts_plot_size  integer,
  ts_start_year integer,
  ts_end_year   integer,
  ts_target_day integer,
  packet_ids    text
) AS $$
    SELECT projects.id as project_id, projects.name, projects.description,
        users.id as interpreter, ts_plot_size, ts_start_year, ts_end_year, ts_target_day,
        array_to_string(array_agg(packet_id), ',') as packet_ids
    FROM projects, users, ts_project_user
    WHERE projects.id = ts_project_user.project_id
        AND ts_project_user.user_id = users.id
        AND users.id = interpreter
    GROUP BY projects.id, projects.name, projects.description,
        users.id, ts_plot_size, ts_start_year, ts_end_year, ts_target_day
    ORDER BY projects.id, packet_ids
$$ LANGUAGE SQL;

-- Get all plots from a project for a user
CREATE OR REPLACE FUNCTION get_project_plots_for_user(prj_id integer, interpreter_id integer) RETURNS TABLE
(
    project_id integer,
    plot_id    integer,
    lng float,
    lat float,
    is_complete integer,
    is_example integer,
    packet_id integer
) AS $$
    SELECT plots.project_id, plots.id as plot_id,
       ST_X(center) as lng, ST_Y(center) as lat,
       is_complete, is_example, -1 as packet_id
    FROM plots left outer join ts_plot_comments
    ON plots.id = ts_plot_comments.plot_id
        AND plots.project_id = ts_plot_comments.project_id
        AND ts_plot_comments.interpreter = interpreter_id
    WHERE plots.project_id=prj_id
        AND ts_plot_comments.packet_id = -1
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_project_plots_for_user(prj_id integer, interpreter_id integer, packet integer) RETURNS TABLE
(
    project_id integer,
    plot_id    integer,
    lng float,
    lat float,
    is_complete integer,
    is_example integer,
    packet_id integer
) AS $$
    SELECT plots.project_id, plots.id as plot_id,
           ST_X(center) as lng, ST_Y(center) as lat,
           is_complete, is_example, packet_id
    FROM plots inner join ts_packets
    ON plots.project_id = ts_packets.project_id
        AND plots.id = ts_packets.plot_id
    LEFT OUTER JOIN ts_plot_comments
    ON plots.id = ts_plot_comments.plot_id
        AND plots.project_id = ts_plot_comments.project_id
        AND ts_plot_comments.interpreter = interpreter_id
    WHERE plots.project_id = prj_id
        AND ts_packets.packet_id = packet
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_plot_comments(interpreter_id integer, prj_id integer, plotid integer, packet integer) RETURNS TABLE
(
    project_id integer,
    plot_id integer,
    interpreter integer,
    comment text,
    is_complete integer,
    is_example integer,
    is_wetland integer,
    uncertainty integer

) AS $$
    SELECT project_id, plot_id, interpreter,
           comment, is_complete, is_example,
           is_wetland, uncertainty
    FROM ts_plot_comments
    WHERE project_id = prj_id
    AND plot_id = plotid
    AND packet_id = packet
    AND interpreter = interpreter_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_plot_comments(interpreter integer, project_id integer, plot_id integer, packet_id integer,
    comments text, complete integer default 0, example integer default 0, wetland integer default 0, certainty integer default 0)
    RETURNS BIGINT
AS $$
    INSERT INTO ts_plot_comments
        (project_id, plot_id, interpreter, packet_id, comment, is_complete, is_example, is_wetland, uncertainty)
        VALUES (project_id, plot_id, interpreter, packet_id, comments, complete, example, wetland, certainty)
    ON CONFLICT (project_id, plot_id, interpreter, packet_id) DO UPDATE
    SET comment = comments,
        is_example=example,
        is_complete=complete,
        is_wetland=wetland,
        uncertainty=certainty

    RETURNING id;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_plot_vertices_for_project(prj_id integer) RETURNS TABLE
(
    project_id integer,
    plot_id integer,
    image_year integer,
    image_julday integer,
    dominant_landuse text,
    dominant_landuse_notes text,
    dominant_landcover text,
    dominant_landcover_notes text,
    change_process text,
    change_process_notes text,
    interpreter integer,
    packet_id integer
) AS $$
    SELECT project_id,
        plot_id,
        image_year,
        image_julday,
        dominant_landuse,
        coalesce(dominant_landuse_notes, '') as dominant_landuse_notes,
        dominant_landcover,
        coalesce(dominant_landcover_notes,'') as dominant_landcover_notes,
        change_process,
        coalesce(change_process_notes,'') as change_process_notes,
        interpreter,
        packet_id
    FROM ts_vertex
    WHERE project_id = prj_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_plot_vertices(interpreter_id integer, prj_id integer, plotid integer, packet integer) RETURNS TABLE
(
    project_id integer,
    plot_id integer,
    image_year integer,
    image_julday integer,
    dominant_landuse text,
    dominant_landuse_notes text,
    dominant_landcover text,
    dominant_landcover_notes text,
    change_process text,
    change_process_notes text,
    interpreter integer,
    packet_id integer
) AS $$
    SELECT project_id,
        plot_id,
        image_year,
        image_julday,
        dominant_landuse,
        dominant_landuse_notes,
        dominant_landcover,
        dominant_landcover_notes,
        change_process,
        change_process_notes,
        interpreter,
        packet_id
    FROM get_plot_vertices_for_project(prj_id)
    WHERE plot_id = plotid
        AND interpreter = interpreter_id
        AND packet_id = packet
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_vertices(project_id integer, plot_id integer, interpreter integer, packet integer, vertices jsonb) RETURNS VOID 
AS $$
    -- remove existing vertex
    DELETE FROM ts_vertex
    WHERE project_id = project_id
        AND plot_id = plot_id
        AND interpreter = interpreter
        AND packet_id = packet;

    -- add new vertices
    INSERT INTO ts_vertex (
        project_id,
        plot_id,
        image_year,
        image_julday,
        image_id,
        dominant_landuse,
        dominant_landuse_notes,
        dominant_landcover,
        dominant_landcover_notes,
        change_process,
        change_process_notes,
        interpreter,
        packet_id
    )
    SELECT     project_id,
        plot_id,
        image_year,
        image_julday,
        image_id,
        dominant_landuse,
        dominant_landuse_notes,
        dominant_landcover,
        dominant_landcover_notes,
        change_process,
        change_process_notes,
        interpreter,
        packet_id
    FROM jsonb_to_recordset(vertices) as X(
        project_id integer,
        plot_id integer,
        image_year integer,
        image_julday integer,
        image_id text,
        dominant_landuse text,
        dominant_landuse_notes text,
        dominant_landcover text,
        dominant_landcover_notes text,
        change_process text,
        change_process_notes text,
        interpreter integer,
        packet_id integer
    );
$$ LANGUAGE SQL;

CREATE OR REPLACE function get_image_preference(interpreter integer, project_id integer, packet integer, plot_id integer) RETURNS TABLE
(
    project_id integer, 
    plot_id integer, 
    image_id text, 
    image_year integer, 
    image_julday integer, 
    priority integer, 
    interpreter integer, 
    packet_id integer
) AS $$
    SELECT project_id, plot_id, image_id, image_year, image_julday, priority, interpreter, packet_id
    FROM ts_image_preference
    WHERE project_id = project_id
        AND plot_id = plot_id
        AND interpreter = interpreter
        AND packet_id = packet
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION update_image_preference(preference jsonb) RETURNS VOID
AS $$
    INSERT INTO ts_image_preference (
        project_id, 
        plot_id, 
        image_id, 
        image_year, 
        image_julday, 
        priority, 
        interpreter, 
        packet_id)
    SELECT     project_id, 
        plot_id, 
        image_id, 
        image_year, 
        image_julday, 
        priority, 
        interpreter, 
        packet_id
    FROM jsonb_to_record(preference) as X(
        project_id integer,
        plot_id integer,
        image_id text,
        image_year integer,
        image_julday integer,
        priority integer,
        interpreter integer,
        packet_id integer
    )
    ON CONFLICT (project_id, plot_id, image_year, interpreter, packet_id) DO UPDATE
        SET image_id = EXCLUDED.image_id,
            image_julday = EXCLUDED.image_julday,
            priority = EXCLUDED.priority;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_response_design(project_id) RETURNS TABLE 
(
    project_id integer,
    landuse text,
    landcover text,
    change_process text
) AS $$
    SELECT project_id,
           landuse,
           landcover,
           change_process
    FROM ts_response_design
    WHERE project_id = project_id
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION create_response_design(design jsonb) RETURNS VOID
AS $$
    INSERT INTO ts_response_design (
        project_id, 
        landuse,
        landcover,
        change_process)
    SELECT project_id, 
        landuse,
        landcover,
        change_process
    FROM jsonb_to_record(design) as X(
        project_id integer,
        landuse text,
        landcover text,
        change_process text
    )
    ON CONFLICT (project_id) DO UPDATE
        SET landuse = EXCLUDED.landuse,
            landcover = EXCLUDED.landcover,
            change_process = EXCLUDED.change_process;
$$ LANGUAGE SQL;