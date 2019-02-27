#!/bin/sh
unzip -d $1 $1.zip
cd $1
sname=$(find . -type f -iname "*.shp" -exec basename {} .shp ';')

shp2pgsql -s 4326 $sname $1_shp | sed -e 's/-/_/g' | PGPASSWORD=ceo psql -d ceo --host=localhost -p5432 -U ceo
