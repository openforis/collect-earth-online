-- ALTER TABLE projects DROP COLUMN plot_similarity_asset;


ALTER TABLE projects ADD COLUMN geoai_assets jsonb;
