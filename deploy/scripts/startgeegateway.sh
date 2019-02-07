#!/bin/sh
cd ../../../gee-gateway
sudo pkill -f 'python2 run.py'
nohup sudo python2 run.py >> gee-gateway.log 2>&1 & 