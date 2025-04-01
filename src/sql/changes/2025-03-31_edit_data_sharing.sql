ALTER TABLE data_sharing
ADD COLUMN project_rid INTEGER REFERENCES projects(project_uid) ON DELETE SET NULL;
