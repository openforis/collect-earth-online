#!/bin/sh
GEE_DIR="/home/openforis/github/gee-gateway"
cd $GEE_DIR
sudo pkill -f 'python2 run.py'
nohup sudo python2 run.py >> gee-gateway.log 2>&1 &
