ALTER TABLE institutions ADD COLUMN created_date date DEFAULT NOW();
ALTER TABLE imagery ADD COLUMN created_date date DEFAULT NOW();
