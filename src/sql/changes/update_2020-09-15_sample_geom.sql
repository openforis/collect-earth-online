ALTER TABLE samples ALTER COLUMN point TYPE geometry(geometry, 4326);
ALTER TABLE samples RENAME COLUMN point TO sample_geom;
