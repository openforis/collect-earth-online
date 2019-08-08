--TS related functions
-- Add packet to a project.
-- Not every project needs packet. If no packet is defined, there is no need to create packet for that project.
CREATE OR REPLACE FUNCTION add_packet(_project_id integer, _title text) RETURNS INTEGER AS $$
    INSERT INTO packets (project_rid, title)
    VALUES (_project_id, _title)
    RETURNING packet_uid
$$ LANGUAGE SQL;

-- add packets to a user
CREATE OR REPLACE FUNCTION add_packet_user(_packet_ids integer[], _user_id integer) RETURNS VOID AS $$
    INSERT INTO packet_users (user_rid, packet_rid)
    SELECT _user_id, u.* FROM unnest(_packet_ids) u;
$$ LANGUAGE SQL;

-- add a packet to multiple users
CREATE OR REPLACE FUNCTION add_packet_user(_packet_id integer, _user_ids integer[]) RETURNS VOID AS $$
    INSERT INTO packet_users (packet_rid, user_rid)
    SELECT _packet_id, u.* FROM unnest(_user_ids) u;
$$ LANGUAGE SQL;

-- add plots to a packet
CREATE OR REPLACE FUNCTION add_packet_plot(_packet_id integer, _plot_ids integer[]) RETURNS VOID AS $$
    INSERT INTO packet_plots (packet_rid, plot_rid)
    SELECT _packet_id, u.* FROM unnest(_plot_ids) u;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_plot_comments(_user_id integer, _project_id integer, _plot_id integer, _packet_id integer) RETURNS TABLE
(
    project_id  integer,
    plot_id     integer,
    user_id     integer,
    comment     text,
    is_complete integer,
    is_example  integer,
    is_wetland  integer,
    uncertainty integer,
    packet_id   integer

) AS $$
    SELECT project_rid, plot_rid, user_rid,
           comment, is_complete, is_example,
           is_wetland, uncertainty, packet_rid
    FROM plot_comments
    WHERE project_rid = _project_id
    AND plot_rid = _plot_id
    AND packet_rid = _packet_id
    AND user_rid = _user_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_plot_comments(_user_id integer, _project_id integer, _plot_id integer, _packet_id integer,
    _comments text, _is_complete integer default 0, _is_example integer default 0, _is_wetland integer default 0,
    _uncertainty integer default 0)
    RETURNS BIGINT
AS $$
    INSERT INTO plot_comments
        (project_rid, plot_rid, user_rid, packet_rid, comment, is_complete, is_example, is_wetland, uncertainty)
        VALUES (_project_id, _plot_id, _user_id, _packet_id, _comments, _is_complete, _is_example, _is_wetland, _uncertainty)
    ON CONFLICT (project_rid, plot_rid, user_rid, packet_rid) DO UPDATE
    SET comment = _comments,
        is_example=_is_example,
        is_complete=_is_complete,
        is_wetland=_is_wetland,
        uncertainty=_uncertainty

    RETURNING plot_comments_uid;
$$ LANGUAGE SQL;


--TODO: maybe convert this to a View
CREATE OR REPLACE FUNCTION get_plot_vertices_for_project(_project_id integer) RETURNS TABLE
(
  project_id                integer,
  plot_id                   integer,
  image_year                integer,
  image_julday              integer,
  dominant_landuse          text,
  dominant_landuse_notes    text,
  dominant_landcover        text,
  dominant_landcover_notes  text,
  change_process            text,
  change_process_notes      text,
  user_id                   integer,
  packet_id                 integer
) AS $$
  SELECT project_rid,
    plot_rid,
    image_year,
    image_julday,
    dominant_landuse,
    coalesce(dominant_landuse_notes, '') as dominant_landuse_notes,
    dominant_landcover,
    coalesce(dominant_landcover_notes,'') as dominant_landcover_notes,
    change_process,
    coalesce(change_process_notes,'') as change_process_notes,
    user_rid,
    packet_rid
  FROM vertex
  WHERE project_rid = _project_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_plot_vertices(_user_id integer, _project_id integer, _plot_id integer, _packet_id integer) RETURNS TABLE
(
  project_id                integer,
  plot_id                   integer,
  image_year                integer,
  image_julday              integer,
  dominant_landuse          text,
  dominant_landuse_notes    text,
  dominant_landcover        text,
  dominant_landcover_notes  text,
  change_process            text,
  change_process_notes      text,
  user_id                   integer,
  packet_id                 integer
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
    user_id,
    packet_id
  FROM get_plot_vertices_for_project(_project_id)
  WHERE plot_id = _plot_id
    AND user_id = _user_id
    AND packet_id = _packet_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_vertices(_project_id integer, _plot_id integer, _user_id integer, _packet_id integer, _vertices jsonb) RETURNS VOID
AS $$
  -- remove existing vertex
  DELETE FROM vertex
  WHERE project_rid = _project_id
    AND plot_rid = _plot_id
    AND user_rid = _user_id
    AND packet_rid = _packet_id;

  -- add new vertices
  INSERT INTO vertex (
    project_rid,
    plot_rid,
    image_year,
    image_julday,
    image_id,
    dominant_landuse,
    dominant_landuse_notes,
    dominant_landcover,
    dominant_landcover_notes,
    change_process,
    change_process_notes,
    user_rid,
    packet_rid
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
    user_id,
    packet_id
  FROM jsonb_to_recordset(_vertices) as X(
    project_id                integer,
    plot_id                   integer,
    image_year                integer,
    image_julday              integer,
    image_id                  text,
    dominant_landuse          text,
    dominant_landuse_notes    text,
    dominant_landcover        text,
    dominant_landcover_notes  text,
    change_process            text,
    change_process_notes      text,
    user_id                   integer,
    packet_id                 integer
  );
$$ LANGUAGE SQL;

CREATE OR REPLACE function get_image_preference(_user_id integer, _project_id integer, _packet_id integer, _plot_id integer) RETURNS TABLE
(
  project_id    integer,
  plot_id       integer,
  image_id      text,
  image_year    integer,
  image_julday  integer,
  priority      integer,
  user_id       integer,
  packet_id     integer
) AS $$
  SELECT project_rid, plot_rid, image_id, image_year, image_julday, priority, user_rid, packet_rid
  FROM image_preference
  WHERE project_rid = _project_id
    AND plot_rid = _plot_id
    AND user_rid = _user_id
    AND packet_rid = _packet_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION update_image_preference(_preference jsonb) RETURNS VOID
AS $$
  INSERT INTO image_preference (
    project_rid,
    plot_rid,
    image_id,
    image_year,
    image_julday,
    priority,
    user_rid,
    packet_rid)
  SELECT  project_id,
    plot_id,
    image_id,
    image_year,
    image_julday,
    priority,
    user_id,
    packet_id
  FROM jsonb_to_record(_preference) as X(
    project_id integer,
    plot_id integer,
    image_id text,
    image_year integer,
    image_julday integer,
    priority integer,
    user_id integer,
    packet_id integer
  )
  ON CONFLICT (project_rid, plot_rid, image_year, user_rid, packet_rid) DO UPDATE
    SET image_id = EXCLUDED.image_id,
      image_julday = EXCLUDED.image_julday,
      priority = EXCLUDED.priority;
$$ LANGUAGE SQL;
