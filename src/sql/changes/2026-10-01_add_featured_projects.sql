SELECT COUNT(*) FROM projects WHERE project_uid IN (42259, 50862, 35685, 19747, 34280);
-- UPDATE projects SET highlight = TRUE WHERE project_uid IN (42259, 50862, 35685, 19747, 34280);

SELECT COUNT(*) FROM imagery WHERE title = 'Dynamic World' AND visibility <> 'private';
-- UPDATE imagery SET visiblity = 'platform' WHERE WHERE title = 'Dynamic World' AND visibility <> 'private';
