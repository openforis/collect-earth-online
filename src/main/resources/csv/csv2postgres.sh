#!/bin/sh
cname=${1//-/_}_csv
csvname=${1}.csv
PGPASSWORD=ceo psql -h localhost -U ceo -d ceo -c "\copy ext_tables.$cname FROM $csvname DELIMITER ',' CSV HEADER"
