ALTER TABLE IF EXISTS sample_values DROP CONSTRAINT IF EXISTS sample_values_imagery_rid_fkey;
ALTER TABLE sample_values
    ADD CONSTRAINT sample_values_imagery_rid_fkey FOREIGN KEY (imagery_rid)
    REFERENCES imagery (imagery_uid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;


ALTER TABLE IF EXISTS projects DROP CONSTRAINT IF EXISTS projects_imagery_rid_fkey;
ALTER TABLE IF EXISTS projects
    ADD CONSTRAINT projects_imagery_rid_fkey FOREIGN KEY (imagery_rid)
    REFERENCES imagery (imagery_uid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE SET NULL;
