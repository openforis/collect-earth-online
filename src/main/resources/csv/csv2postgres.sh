cname=${1//-/_}_csv
csvname=${1}.csv
PGPASSWORD=ceo psql -d ceo --host=localhost  -p5432 -U ceo  -c "\copy ext_tables.$cname FROM $csvname delimiter ',' csv header"
