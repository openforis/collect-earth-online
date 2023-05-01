-- NAMESPACE: doi
-- REQUIRES: clear


-- Select DOI by its id.
CREATE OR REPLACE FUNCTION select_doi_by_id(_doi_id INTEGER)
  RETURNS TABLE (
          doi_uid     integer,
          project_rid integer,
          user_id     integer,
          doi_path    text,
          full_data   jsonb
  ) AS $$
     SELECT * FROM doi
     WHERE doi_uid = _doi_id
$$ LANGUAGE SQL;

-- Select DOI by project id.
CREATE OR REPLACE FUNCTION select_doi_by_project(_project_id INTEGER)
  RETURNS TABLE (
          doi_uid     integer,
          project_rid integer,
          user_id     integer,
          doi_path    text,
          full_data   jsonb
  ) AS $$
     SELECT * FROM doi
     WHERE project_rid = _project_id
$$ LANGUAGE SQL;
