CREATE TABLE project_drafts (
    project_draft_uid SERIAL PRIMARY KEY,
    user_rid INT,
    institution_rid INT,
    name text NOT NULL,
    project_state JSONB,
    created_date date, 
    updated_date date,
    CONSTRAINT fk_project_draft_users
        FOREIGN KEY (user_rid) 
        REFERENCES users (user_uid),
    CONSTRAINT fk_project_draft_institutions
        FOREIGN KEY (institution_rid) 
        REFERENCES institutions (institution_uid)
);
