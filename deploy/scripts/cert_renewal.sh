#!/bin/sh
echo "starting cert renewal"
certbot certonly --webroot -w /home/openforis/github/collect-earth-online/target/classes/public -n -d collect.earth --deploy-hook /home/openforis/sh/packageKeysAndRestartApps.sh
echo "completed cert renewal"