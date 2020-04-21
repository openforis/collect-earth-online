#!/bin/sh
unzip -o -d $1 $1.zip
cd $1

sname=$(find . -type f -iname "*.shp" ! -iname "._*" -exec basename {} .shp ';')
tname=`echo ext_tables.$1_shp | sed -e 's/-/_/g'`

check_path()
{
  shpfile=(`find ./ -maxdepth 1 -name "*.shp"`)
  if ! [ ${#shpfile[@]} -gt 0 ]; then
    dname=$(find . -type d -iname "*" ! -iname "_*" ! -iname ".*" -maxdepth 1 -exec basename {} .shp ';')
    cd $dname
    check_path
  fi
}

check_path

shp2pgsql -s 4326 $sname $tname | PGPASSWORD=ceo psql -h localhost -U ceo -d ceo
