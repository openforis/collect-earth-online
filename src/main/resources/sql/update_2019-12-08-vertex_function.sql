--TODO: Maybe convert this to a view
DROP FUNCTION IF EXISTS get_plot_vertices_for_project(integer);
CREATE OR REPLACE FUNCTION get_plot_vertices_for_project(_project_id integer)
 RETURNS TABLE(
    project_id                integer,
    plot_id                   integer,
    user_id                   integer,
    packet_id                 integer,
    image_year                integer,
    image_julday              integer,
    is_vertex                 boolean,
    landuse                   jsonb,
    landcover                 jsonb,
    change_process            jsonb,
    reflectance               jsonb
 ) AS $$

SELECT project_rid,
    plot_rid,
    user_rid,
    packet_rid,
    image_year,
    image_julday,
    is_vertex,
    landuse,
    landcover,
    change_process,
    reflectance
FROM vertex
WHERE project_rid = _project_id

$$ LANGUAGE SQL;

DROP FUNCTION IF EXISTS get_plot_vertices(integer,integer,integer,integer);
CREATE OR REPLACE FUNCTION get_plot_vertices(_user_id integer, _project_id integer, _plot_id integer, _packet_id integer)
 RETURNS TABLE(
    project_id                integer,
    plot_id                   integer,
    user_id                   integer,
    packet_id                 integer,
    image_year                integer,
    image_julday              integer,
    landuse                   jsonb,
    landcover                 jsonb,
    change_process            jsonb,
    reflectance               jsonb,
    is_vertex                 boolean
 ) AS $$

SELECT project_id,
    plot_id,
    user_id,
    packet_id,
    image_year,
    image_julday,
    landuse,
    landcover,
    change_process,
    reflectance,
    is_vertex
FROM get_plot_vertices_for_project(_project_id)
WHERE plot_id   = _plot_id
    AND user_id   = _user_id
    AND COALESCE(packet_id, -1) = coalesce(_packet_id, -1)
ORDER BY image_year

$$ LANGUAGE SQL;

DROP FUNCTION IF EXISTS create_vertices(integer, integer, integer, integer, jsonb);
CREATE OR REPLACE FUNCTION create_vertices(_project_id integer, _plot_id integer, _user_id integer, _packet_id integer, _vertices jsonb)
 RETURNS void AS $$

-- Remove existing vertex
DELETE FROM vertex
    WHERE project_rid = _project_id
    AND plot_rid    = _plot_id
    AND user_rid    = _user_id
    AND coalesce(packet_rid, -1)  = coalesce(_packet_id, -1);

-- Add new vertices
INSERT INTO vertex(
    project_rid,
    plot_rid,
    user_rid,
    packet_rid,
    image_year,
    image_julday,
    image_id,
    is_vertex,
    landuse,
    landcover,
    change_process,
    reflectance
)
SELECT project_id,
    plot_id,
    user_id,
    packet_id,
    image_year,
    image_julday,
    image_id,
    is_vertex,
    landuse,
    landcover,
    change_process,
    reflectance
FROM jsonb_to_recordset(_vertices) AS X (
    project_id                integer,
    plot_id                   integer,
    user_id                   integer,
    packet_id                 integer,
    image_year                integer,
    image_julday              integer,
    image_id                  text,
    is_vertex                 boolean,
    landuse                   jsonb,
    landcover                 jsonb,
    change_process            jsonb,
    reflectance               jsonb
);
$$ LANGUAGE SQL;