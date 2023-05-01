CREATE TABLE doi(
       doi_uid INTEGER NOT NULL PRIMARY KEY,
       project_rid INTEGER NOT NULL REFERENCES projects (project_uid) ON DELETE CASCADE ON UPDATE CASCADE,
       user_id INTEGER NOT NULL REFERENCES users (user_uid) ON DELETE CASCADE ON UPDATE CASCADE,
       doi_path TEXT,
       full_data jsonb NOT NULL
);
