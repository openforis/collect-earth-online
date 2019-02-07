#!/bin/sh
CEO_DIR="/home/openforis/github/collect-earth-online"
cd $CEO_DIR
sudo pkill -f 'java -Xmx28672m'
nohup env MAVEN_OPTS="-Xmx28672m" mvn compile exec:java -Dexec.args=JSON >> ceo.log 2>&1 &