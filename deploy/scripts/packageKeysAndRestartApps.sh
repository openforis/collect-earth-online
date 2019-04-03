#!/bin/sh
echo "starting package"
CERT_DOMAIN="collect.earth"
CERT_PASSWORD="collect"
CACERT_PASSWORD="changeit"

sudo openssl pkcs12 -export -in /etc/letsencrypt/live/$CERT_DOMAIN/fullchain.pem -inkey /etc/letsencrypt/live/$CERT_DOMAIN/privkey.pem -out ceo.p12 -name ceo -passout pass:$CERT_PASSWORD

sudo keytool -importkeystore -destkeystore keystore.jks -srckeystore ceo.p12 -srcstoretype PKCS12 -storepass $CERT_PASSWORD -srcstorepass $CERT_PASSWORD -alias ceo -noprompt

sudo keytool -delete -keystore /etc/ssl/certs/java/cacerts -alias 'ceo_chain' -storepass $CACERT_PASSWORD -noprompt

sudo keytool --importcert -file /etc/letsencrypt/live/$CERT_DOMAIN/fullchain.pem -keystore /etc/ssl/certs/java/cacerts -v -alias ceo_chain -storepass $CACERT_PASSWORD -noprompt

sudo mv keystore.jks ../

echo "starting CEO server"
sh startceo.sh

echo "starting Geo-Dash"
sh startgeegateway.sh
