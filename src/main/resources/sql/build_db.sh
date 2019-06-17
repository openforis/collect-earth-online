#!/bin/sh
psql -h localhost -U postgres -a -f create_ceo_db.sql --echo-errors
PGPASSWORD=ceo psql -h localhost -U ceo -d ceo -a -f load_ceo_tables.sql --echo-errors
PGPASSWORD=ceo psql -h localhost -U ceo -d ceo -a -f load_ceo_functions.sql --echo-errors
PGPASSWORD=ceo psql -h localhost -U ceo -d ceo -a -f update_2019_05_16.sql --echo-errors
PGPASSWORD=ceo psql -h localhost -U ceo -d ceo -a -f update_2019_05_20.sql --echo-errors
PGPASSWORD=ceo psql -h localhost -U ceo -d ceo -a -f update_2019_06_02.sql --echo-errors
PGPASSWORD=ceo psql -h localhost -U ceo -d ceo -a -f update_2019_06_13.sql --echo-errors
