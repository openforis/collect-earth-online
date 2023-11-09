-- NAMESPACE: doi
-- REQUIRES: clear


-- Select DOI by its id.
CREATE OR REPLACE FUNCTION select_doi_by_id(_doi_id INTEGER)
  RETURNS TABLE (
          doi_uid     integer,
          project_rid integer,
          user_id     integer,
          doi_path    text,
          full_data   jsonb,
          created     timestamp
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
          full_data   jsonb,
          created     timestamp
  ) AS $$
     SELECT * FROM doi
     WHERE project_rid = _project_id
$$ LANGUAGE SQL;

-- Insert DOI
CREATE OR REPLACE FUNCTION insert_doi(_id integer, _project_id integer,
                                      _user_id integer, _doi_path text,
                                      _full_data jsonb)
 RETURNS integer AS $$

    INSERT INTO doi
        (doi_uid, project_rid, user_id, doi_path, full_data)
    VALUES (
        _id, _project_id,
        _user_id, _doi_path, _full_data
    )
    RETURNING doi_uid

$$ LANGUAGE SQL;

-- Update DOI
CREATE OR REPLACE FUNCTION update_doi(_id integer, _full_data jsonb)
 RETURNS integer AS $$

    UPDATE doi
        set full_data = _full_data
    WHERE doi_uid = _id
    RETURNING doi_uid

$$ LANGUAGE SQL;
