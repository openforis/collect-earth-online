--TS related functions
-- Add packet to a project.
-- Not every project needs packet. If no packet is defined, there is no need to create packet for that project.
CREATE OR REPLACE FUNCTION add_packet(project_id integer, packet_id integer, plots integer[]) RETURNS VOID AS $$
    INSERT INTO packets (project_id, packet_id, plot_id)
    SELECT project_id, packet_id, u.* FROM unnest(plots) u;
$$ LANGUAGE SQL;

-- Get all plots from a project for a user
CREATE OR REPLACE FUNCTION get_project_plots_for_user(prj_id integer, interpreter_id integer) RETURNS TABLE
(
  project_id integer,
  plot_id integer,
  lng float,
  lat float,
  is_complete integer,
  is_example integer,
  packet_id integer
) AS $$
    SELECT plots.project_rid, plots.plot_uid as plot_id,
       ST_X(center) as lng, ST_Y(center) as lat,
       is_complete, is_example, -1 as packet_id
    FROM plots left outer join plot_comments
    ON plots.plot_uid = plot_comments.plot_id
        AND plots.project_rid = plot_comments.project_id
        AND plot_comments.interpreter = interpreter_id
        AND plot_comments.packet_id = -1
    WHERE plots.project_rid=prj_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_project_plots_for_user(prj_id integer, interpreter_id integer, packet integer) RETURNS TABLE
(
    project_id integer,
    plot_id integer,
    lng float,
    lat float,
    is_complete integer,
    is_example integer,
    packet_id integer
) AS $$
    SELECT plots.project_rid, plots.plot_uid as plot_id,
           ST_X(center) as lng, ST_Y(center) as lat,
           is_complete, is_example, packets.packet_id
    FROM plots inner join packets
    ON plots.project_rid = packets.project_id
        AND plots.plot_uid = packets.plot_id
    LEFT OUTER JOIN plot_comments
    ON plots.plot_uid = plot_comments.plot_id
        AND plots.project_rid = plot_comments.project_id
        AND plot_comments.interpreter = interpreter_id
    WHERE plots.project_rid = prj_id
        AND packets.packet_id = packet
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
    FROM plot_comments
    WHERE project_id = prj_id
    AND plot_id = plotid
    AND packet_id = packet
    AND interpreter = interpreter_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_plot_comments(interpreter integer, project_id integer, plot_id integer, packet_id integer,
    comments text, complete integer default 0, example integer default 0, wetland integer default 0, certainty integer default 0)
    RETURNS BIGINT
AS $$
    INSERT INTO plot_comments
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
  FROM vertex
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
  DELETE FROM vertex
  WHERE project_id = project_id
    AND plot_id = plot_id
    AND interpreter = interpreter
    AND packet_id = packet;

  -- add new vertices
  INSERT INTO vertex (
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
  SELECT  project_id,
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
  FROM image_preference
  WHERE project_id = project_id
    AND plot_id = plot_id
    AND interpreter = interpreter
    AND packet_id = packet
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION update_image_preference(preference jsonb) RETURNS VOID
AS $$
  INSERT INTO image_preference (
    project_id, 
    plot_id, 
    image_id, 
    image_year, 
    image_julday, 
    priority, 
    interpreter, 
    packet_id)
  SELECT  project_id, 
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

CREATE OR REPLACE FUNCTION get_response_design(project_id integer) RETURNS TABLE 
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
  FROM response_design
  WHERE project_id = project_id
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION create_response_design(design jsonb) RETURNS VOID
AS $$
  INSERT INTO response_design (
    project_id, 
    landuse,
    landcover,
    change_process)
  SELECT  project_id, 
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
