DROP FUNCTION IF EXISTS get_plot_vertices_for_project(integer);

DROP FUNCTION IF EXISTS create_vertices(integer, integer, integer, integer, jsonb);

DROP FUNCTION IF EXISTS get_plot_vertices(integer,integer,integer,integer);

ALTER TABLE IF EXISTS vertex
	DROP COLUMN dominant_landuse,
	DROP COLUMN secondary_landuse,
	DROP COLUMN dominant_landuse_notes,
	DROP COLUMN secondary_landuse_notes,
	DROP COLUMN dominant_landcover,
	DROP COLUMN secondary_landcover,
	DROP COLUMN dominant_landcover_notes,
	DROP COLUMN secondary_landcover_notes,
	DROP COLUMN landcover_ephemeral,
	DROP COLUMN change_process,
	DROP COLUMN change_process_notes;

ALTER TABLE IF EXISTS vertex
	ADD landuse 		jsonb,
	ADD landcover 		jsonb,
	ADD change_process 	jsonb,
	ADD reflectance 	jsonb,
	ADD is_vertex 		boolean;
