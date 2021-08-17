ALTER TABLE projects DROP COLUMN ts_start_year;
ALTER TABLE projects DROP COLUMN ts_end_year;
ALTER TABLE projects DROP COLUMN ts_target_day;
ALTER TABLE projects DROP COLUMN ts_plot_size;

ALTER TABLE user_plots DROP COLUMN packet_rid;

DROP TABLE packets;
DROP TABLE packet_users;
DROP TABLE packet_plots;
DROP TABLE plot_comments;
DROP TABLE vertex;
DROP TABLE image_preference;
