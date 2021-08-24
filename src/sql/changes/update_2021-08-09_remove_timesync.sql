ALTER TABLE projects DROP COLUMN ts_start_year;
ALTER TABLE projects DROP COLUMN ts_end_year;
ALTER TABLE projects DROP COLUMN ts_target_day;
ALTER TABLE projects DROP COLUMN ts_plot_size;

ALTER TABLE user_plots DROP COLUMN packet_rid;

DROP TABLE packets CASCADE;
DROP TABLE packet_users CASCADE;
DROP TABLE packet_plots CASCADE;
DROP TABLE plot_comments CASCADE;
DROP TABLE vertex CASCADE;
DROP TABLE image_preference CASCADE;
