unzip -o -d $1 $1.zip
cd $1
sname=$(find . -type f -iname "*.shp" -exec basename {} .shp ';')
tablename=${1//-/_}_shp

shp2pgsql -s 4326 $sname $tablename | PGPASSWORD=ceo psql -d ceo -p5432 -U ceo
