#!/bin/sh
echo "starting package"

sudo openssl pkcs12 -export -in /etc/letsencrypt/live/collect.earth/cert.pem -inkey /etc/letsencrypt/live/collect.earth/privkey.pem -out ceo.p12 -name ceo -passout pass:collect

sudo keytool -importkeystore -destkeystore keystore.jks -srckeystore ceo.p12 -srcstoretype PKCS12 -storepass collect -srcstorepass collect -alias ceo -noprompt

sudo keytool -delete -keystore /etc/ssl/certs/java/cacerts -alias 'ceo_chain' -storepass changeit -noprompt

sudo keytool --importcert -file /etc/letsencrypt/live/collect.earth/fullchain.pem -keystore /etc/ssl/certs/java/cacerts -v -alias ceo_chain -storepass changeit -noprompt

sudo mv keystore.jks ../

echo "starting CEO server"
sh startceo.sh

echo "starting Geo-Dash"
sh startgeegateway.sh
