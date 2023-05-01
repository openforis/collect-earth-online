-- NAMESPACE: doi
-- REQUIRES: clear


-- Select DOI by its id.
CREATE OR REPLACE FUNCTION select_doi_by_id(_doi_id INTEGER)
  RETURNS TABLE (feature jsonb) AS $$
     SELECT * FROM doi
     WHERE doi_uid = _doi_id
$$ LANGUAGE SQL;

-- Select DOI by project id.
CREATE OR REPLACE FUNCTION select_doi_by_project(_project_id INTEGER)
  RETURNS TABLE (feature jsonb) AS $$
     SELECT * FROM doi
     WHERE project_rid = _project_id
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION select_plots_view(_project_id INTEGER)
  RETURNS TABLE (feature jsonb) AS $$
  SELECT * FROM plot_shapes
  WHERE p_id = _project_id
$$ LANGUAGE SQL;
