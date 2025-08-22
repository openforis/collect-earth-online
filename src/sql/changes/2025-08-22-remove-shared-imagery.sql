DROP TABLE shared_imagery;

ALTER TABLE imagery ADD COLUMN global_imagery boolean default false;
