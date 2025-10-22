CREATE TYPE visibility_type AS ENUM ('public', 'private', 'platform');

UPDATE imagery SET visibility='platform' WHERE global_imagery=TRUE;

update imagery SET visibility='private' where visibility is null or visibility='';

ALTER TABLE imagery
  DROP COLUMN global_imagery,
  ALTER COLUMN visibility TYPE visibility_type USING visibility::visibility_type;
