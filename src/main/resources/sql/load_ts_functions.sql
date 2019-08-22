--TimeSync related functions

-- Add packet to a project
-- Not every project needs a packet. If no packet is defined, there is no need to create a packet for that project.
CREATE OR REPLACE FUNCTION add_packet(_project_id integer, _title text)
 RETURNS integer AS $$

    INSERT INTO packets (project_rid, title)
    VALUES (_project_id, _title)
    RETURNING packet_uid

$$ LANGUAGE SQL;

-- Add multiple packets to a single user
CREATE OR REPLACE FUNCTION add_packets_to_user(_packet_ids integer[], _user_id integer)
 RETURNS void AS $$

    INSERT INTO packet_users (user_rid, packet_rid)
    SELECT _user_id, u.* FROM unnest(_packet_ids) u

$$ LANGUAGE SQL;

-- Add a single packet to multiple users
CREATE OR REPLACE FUNCTION add_users_to_packet(_packet_id integer, _user_ids integer[])
 RETURNS void AS $$

    INSERT INTO packet_users (packet_rid, user_rid)
    SELECT _packet_id, u.* FROM unnest(_user_ids) u

$$ LANGUAGE SQL;

-- Add plots to a packet
CREATE OR REPLACE FUNCTION add_plots_to_packet(_plot_ids integer[], _packet_id integer)
 RETURNS void AS $$

    INSERT INTO packet_plots (packet_rid, plot_rid)
    SELECT _packet_id, u.* FROM unnest(_plot_ids) u

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_plot_comments(_user_id integer, _project_id integer, _plot_id integer, _packet_id integer)
 RETURNS TABLE (
    project_id  integer,
    plot_id     integer,
    user_id     integer,
    packet_id   integer,
    comment     text,
    is_complete integer,
    is_example  integer,
    is_wetland  integer,
    uncertainty integer
) AS $$

    SELECT project_rid, plot_rid, user_rid,
           packet_rid, comment, is_complete,
           is_example, is_wetland, uncertainty
    FROM plot_comments
    WHERE project_rid = _project_id
      AND plot_rid    = _plot_id
      AND user_rid    = _user_id
      AND packet_rid  = _packet_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_plot_comments(_user_id integer, _project_id integer, _plot_id integer, _packet_id integer,
    _comment text, _is_complete integer DEFAULT 0, _is_example integer DEFAULT 0, _is_wetland integer DEFAULT 0,
    _uncertainty integer DEFAULT 0)
 RETURNS bigint AS $$

    INSERT INTO plot_comments
        (project_rid, plot_rid, user_rid, packet_rid, comment, is_complete, is_example, is_wetland, uncertainty)
    VALUES
        (_project_id, _plot_id, _user_id, _packet_id, _comment, _is_complete, _is_example, _is_wetland, _uncertainty)
    ON CONFLICT (project_rid, plot_rid, user_rid, packet_rid) DO UPDATE
    SET comment     = _comment,
        is_complete = _is_complete,
        is_example  = _is_example,
        is_wetland  = _is_wetland,
        uncertainty = _uncertainty
    RETURNING plot_comments_uid

$$ LANGUAGE SQL;

--TODO: Maybe convert this to a view
CREATE OR REPLACE FUNCTION get_plot_vertices_for_project(_project_id integer)
 RETURNS TABLE (
    project_id                integer,
    plot_id                   integer,
    user_id                   integer,
    packet_id                 integer,
    image_year                integer,
    image_julday              integer,
    dominant_landuse          text,
    dominant_landuse_notes    text,
    dominant_landcover        text,
    dominant_landcover_notes  text,
    change_process            text,
    change_process_notes      text
 ) AS $$

    SELECT project_rid,
           plot_rid,
           user_rid,
           packet_rid,
           image_year,
           image_julday,
           dominant_landuse,
           coalesce(dominant_landuse_notes, '') AS dominant_landuse_notes,
           dominant_landcover,
           coalesce(dominant_landcover_notes,'') AS dominant_landcover_notes,
           change_process,
           coalesce(change_process_notes,'') AS change_process_notes
    FROM vertex
    WHERE project_rid = _project_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_plot_vertices(_user_id integer, _project_id integer, _plot_id integer, _packet_id integer)
 RETURNS TABLE (
    project_id                integer,
    plot_id                   integer,
    user_id                   integer,
    packet_id                 integer,
    image_year                integer,
    image_julday              integer,
    dominant_landuse          text,
    dominant_landuse_notes    text,
    dominant_landcover        text,
    dominant_landcover_notes  text,
    change_process            text,
    change_process_notes      text
 ) AS $$

    SELECT project_id,
           plot_id,
           user_id,
           packet_id,
           image_year,
           image_julday,
           dominant_landuse,
           dominant_landuse_notes,
           dominant_landcover,
           dominant_landcover_notes,
           change_process,
           change_process_notes
    FROM get_plot_vertices_for_project(_project_id)
    WHERE plot_id   = _plot_id
      AND user_id   = _user_id
      AND packet_id = _packet_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_vertices(_project_id integer, _plot_id integer, _user_id integer, _packet_id integer, _vertices jsonb)
 RETURNS void AS $$

    -- Remove existing vertex
    DELETE FROM vertex
    WHERE project_rid = _project_id
      AND plot_rid    = _plot_id
      AND user_rid    = _user_id
      AND packet_rid  = _packet_id;

    -- Add new vertices
    INSERT INTO vertex (
        project_rid,
        plot_rid,
        user_rid,
        packet_rid,
        image_year,
        image_julday,
        image_id,
        dominant_landuse,
        dominant_landuse_notes,
        dominant_landcover,
        dominant_landcover_notes,
        change_process,
        change_process_notes
    )
    SELECT project_id,
           plot_id,
           user_id,
           packet_id,
           image_year,
           image_julday,
           image_id,
           dominant_landuse,
           dominant_landuse_notes,
           dominant_landcover,
           dominant_landcover_notes,
           change_process,
           change_process_notes
    FROM jsonb_to_recordset(_vertices) AS X (
        project_id                integer,
        plot_id                   integer,
        user_id                   integer,
        packet_id                 integer,
        image_year                integer,
        image_julday              integer,
        image_id                  text,
        dominant_landuse          text,
        dominant_landuse_notes    text,
        dominant_landcover        text,
        dominant_landcover_notes  text,
        change_process            text,
        change_process_notes      text
    );

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_image_preference(_user_id integer, _project_id integer, _packet_id integer, _plot_id integer)
 RETURNS TABLE (
    project_id    integer,
    plot_id       integer,
    user_id       integer,
    packet_id     integer,
    image_id      text,
    image_year    integer,
    image_julday  integer,
    priority      integer
 ) AS $$

    SELECT project_rid, plot_rid, user_rid, packet_rid, image_id, image_year, image_julday, priority
    FROM image_preference
    WHERE project_rid = _project_id
      AND plot_rid    = _plot_id
      AND user_rid    = _user_id
      AND packet_rid  = _packet_id

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION update_image_preference(_preference jsonb)
 RETURNS void AS $$

    INSERT INTO image_preference (
        project_rid,
        plot_rid,
        user_rid,
        packet_rid,
        image_id,
        image_year,
        image_julday,
        priority
    )
    SELECT project_id,
           plot_id,
           user_id,
           packet_id,
           image_id,
           image_year,
           image_julday,
           priority
    FROM jsonb_to_record(_preference) AS X (
        project_id    integer,
        plot_id       integer,
        user_id       integer,
        packet_id     integer,
        image_id      text,
        image_year    integer,
        image_julday  integer,
        priority      integer
    )
    ON CONFLICT (project_rid, plot_rid, user_rid, packet_rid, image_year) DO UPDATE
      SET image_id     = excluded.image_id,
          image_julday = excluded.image_julday,
          priority     = excluded.priority

$$ LANGUAGE SQL;
