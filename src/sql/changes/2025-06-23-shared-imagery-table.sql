CREATE TABLE shared_imagery (
    shared_imagery_uid  SERIAL PRIMARY KEY,
    visibility          text NOT NULL,
    title               text NOT NULL,
    attribution         text NOT NULL,
    extent              jsonb,
    source_config       jsonb,
    archived            boolean DEFAULT FALSE,
    created_date        date DEFAULT NOW(),
    archived_date       date,
    is_proxied          boolean DEFAULT FALSE
);
