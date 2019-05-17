#!/bin/sh
PGPASSWORD=ceo psql -U postgres --host=localhost -p5432 -a -f create_ceo_db.sql --echo-errors
PGPASSWORD=ceo psql -U ceo --host=localhost -p5432 -d ceo -a -f load_ceo_tables.sql --echo-errors
PGPASSWORD=ceo psql -U ceo --host=localhost -p5432 -d ceo -a -f load_ceo_functions.sql --echo-errors
PGPASSWORD=ceo psql -U ceo --host=localhost -p5432 -d ceo -a -f update_2019_05_16.sql --echo-errors
