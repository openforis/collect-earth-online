PGPASSWORD=ceo psql -U postgres -p5432 -a -f /C/Code/GitHub/collect-earth-online/src/main/resources/sql/create_ceo_db.sql --echo-errors
PGPASSWORD=ceo psql -U ceo -p5432 -d ceo -a -f /C/Code/GitHub/collect-earth-online/src/main/resources/sql/load_ceo_tables.sql --echo-errors
PGPASSWORD=ceo psql -U ceo -p5432 -d ceo -a -f /C/Code/GitHub/collect-earth-online/src/main/resources/sql/load_ceo_functions.sql --echo-errors
