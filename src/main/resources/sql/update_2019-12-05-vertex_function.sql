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
      AND COALESCE(packet_id, -1) = coalesce(_packet_id, -1);

$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION create_vertices(_project_id integer, _plot_id integer, _user_id integer, _packet_id integer, _vertices jsonb)
 RETURNS void AS $$
    -- Remove existing vertex
    DELETE FROM vertex
    WHERE project_rid = _project_id
    AND plot_rid    = _plot_id
    AND user_rid    = _user_id
    AND coalesce(packet_rid, -1)  = coalesce(_packet_id, -1);

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