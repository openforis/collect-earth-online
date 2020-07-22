package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.elementToObject;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.ProjectUtils.getOrEmptyString;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.security.cert.X509Certificate;
import java.security.SecureRandom;
import java.sql.SQLException;
import java.util.UUID;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.util.EntityUtils;
import org.openforis.ceo.db_api.GeoDash;
import spark.Request;
import spark.Response;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public class PostgresGeoDash implements GeoDash {

    public String gatewayRequest(Request req, Response res) {
        try {
            var trustAllCerts = new TrustManager[]{
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[0];
                        }

                        public void checkClientTrusted(X509Certificate[] certs, String authType) {
                        }

                        public void checkServerTrusted(X509Certificate[] certs, String authType) {
                        }
                    }
            };

            var jsonInputs = parseJson(req.body()).getAsJsonObject();
            var path = jsonInputs.get("path").getAsString();

            var builder = new SSLContextBuilder();
            builder.loadTrustMaterial(null, new TrustSelfSignedStrategy());
            var sslsf = new SSLConnectionSocketFactory(builder.build());
            var httpclient = HttpClients.custom().setSSLSocketFactory(sslsf).build();

            var endurl = req.host();
            if (endurl.lastIndexOf(":") > 0) {
                endurl = endurl.substring(0, endurl.lastIndexOf(":"));
            }
            var reqUrl = req.scheme() + "://" + endurl;
            /* this sends localhost calls to the dev server */
            reqUrl = reqUrl.replace("localhost", "ceodev.servirglobal.net");
            var request = new HttpPost(reqUrl + ":8888/" + path);

            var params = new StringEntity(jsonInputs.toString());
            params.setContentType("application/json");
            request.setEntity(params);

            var sc = SSLContext.getInstance("SSL");
            sc.init(null, trustAllCerts, new SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());

            var response = httpclient.execute(request);
            return EntityUtils.toString(response.getEntity(), "UTF-8");
        } catch (Exception e) {
            // e.printStackTrace();
            System.out.println("Error with gateway request: " + e.getMessage());
            return "";
        }
    }

}
