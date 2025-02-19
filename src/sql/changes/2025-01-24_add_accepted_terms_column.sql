ALTER TABLE users ADD COLUMN accepted_terms boolean default false;

CREATE TYPE project_type AS ENUM ('simplified', 'regular');

ALTER TABLE proejcts ADD COLUMN type project_type DEFAULT 'regular';

CREATE TABLE data_sharing(
       data_sharing_uid SERIAL PRIMARY KEY,
       interpreter_name TEXT NOT NULL,
       accepted_date DATE DEFAULT NOW(),
       ip TEXT
);
