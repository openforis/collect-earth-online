ALTER TABLE projects ADD highlight boolean;

UPDATE projects SET highlight = TRUE
WHERE project_uid IN (42259, 50862, 35685, 19747, 34280);
