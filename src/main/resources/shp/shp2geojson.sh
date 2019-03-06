#!/bin/sh
unzip -o -d $1 $1.zip
cd $1
find . -name "*.shp" -exec ogr2ogr -t_srs EPSG:4326 -f geojson $1.json {} \;
