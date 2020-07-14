#!/bin/sh
cname=`printf ext_tables.$1_csv | sed -e 's/-/_/g'`
PGPASSWORD=ceo psql -h localhost -U ceo -d ceo -c "\copy $cname FROM $1.csv DELIMITER ',' CSV HEADER"
