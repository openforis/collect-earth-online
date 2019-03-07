#!/bin/sh
unzip -o -d $1 $1.zip
cd $1

sname=$(find . -type f -iname "*.shp" -exec basename {} .shp ';')
tname=`echo $1_shp | sed -e 's/-/_/g'`

shp2pgsql -d -s 4326 $sname $tname | PGPASSWORD=ceo psql -d ceo --host=localhost -p5432 -U ceo
