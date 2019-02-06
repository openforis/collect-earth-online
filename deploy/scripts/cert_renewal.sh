#!/bin/sh
echo "starting cert renewal"
CEO_DIR="/home/openforis/github/collect-earth-online"
CERT_DOMAIN="collect.earth"

certbot certonly --webroot -w $CEO_DIR/target/classes/public -n -d $CERT_DOMAIN --deploy-hook $CEO_DIR/deploy/scripts/packageKeysAndRestartApps.sh
echo "completed cert renewal"