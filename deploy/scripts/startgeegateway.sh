#!/bin/sh
GEE_DIR="/home/openforis/github/gee-gateway"
DATE=`date +%Y-%m-%d`
cd $GEE_DIR
sudo pkill -f 'python2 run.py'
nohup sudo python2 run.py >> gee-gateway_$DATE.log 2>&1 &
