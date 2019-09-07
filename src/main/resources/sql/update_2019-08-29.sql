--add packet_rid to user_plots
alter table user_plots
  add packet_rid integer NULL REFERENCES packets (packet_uid) ON DELETE CASCADE ON UPDATE CASCADE;
