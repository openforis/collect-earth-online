#!/bin/sh
DATE=`date +%Y-%m-%d`
CEO_DIR="/home/openforis/github/collect-earth-online"
cd $CEO_DIR
npm install
npm run webpack-prod
sudo pkill -f 'java -Xmx28672m'
nohup env MAVEN_OPTS="-Xmx28672m" mvn compile exec:java -Dexec.args=JSON >> ceo_$DATE.log 2>&1 &
