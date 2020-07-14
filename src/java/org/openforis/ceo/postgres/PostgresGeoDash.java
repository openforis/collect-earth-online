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


    // Returns either the dashboard for a project or an empty dashboard if it has not been configured
    public String geodashId(Request req, Response res) {
        var projectId =    req.queryParams("projectId");

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM get_project_widgets_by_project_id(?)")) {

            pstmt.setInt(1, Integer.parseInt(projectId));
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {
                    var dashboard = new JsonObject();
                    dashboard.addProperty("projectID", projectId);
                    dashboard.addProperty("dashboardID", rs.getString("dashboard_id"));
                    var widgetsJson = new JsonArray();

                    do {
                        widgetsJson.add(parseJson(rs.getString("widget")).getAsJsonObject());
                    } while (rs.next());

                    dashboard.add("widgets", widgetsJson);

                    return dashboard.toString();
                } else {
                    //No widgets return empty dashboard
                    var newDashboardId = UUID.randomUUID().toString();
                    var newDashboard = new JsonObject();
                    newDashboard.addProperty("projectID", projectId);
                    newDashboard.addProperty("dashboardID", newDashboardId);
                    newDashboard.add("widgets", new JsonArray());

                    return newDashboard.toString();

                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    // Creates a dashboard widget for a specific project
    public String createDashBoardWidgetById(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId = jsonInputs.get("projectId").getAsString();
        var dashboardId = jsonInputs.get("dashID").getAsString();
        var widgetJsonString = jsonInputs.get("widgetJSON").getAsString();


        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM add_project_widget(?, ?, ?::JSONB)")) {

            pstmt.setInt(1, Integer.parseInt(projectId));
            pstmt.setObject(2, UUID.fromString(dashboardId));
            pstmt.setString(3, widgetJsonString);
            pstmt.execute();

             return "";

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    // Updates a dashboard widget by widget_id
    public String updateDashBoardWidgetById(Request req, Response res) {
        var widgetId = req.queryParams("widgetId");
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var dashboardId = getOrEmptyString(jsonInputs, "dashID").getAsString();
        var widgetJsonString = jsonInputs.get("widgetJSON").getAsString();

        try (var conn = connect();
            var pstmt = conn.prepareStatement(
                "SELECT * FROM update_project_widget_by_widget_id(?, ?, ?::JSONB)")) {

            pstmt.setInt(1, Integer.parseInt(widgetId));
            pstmt.setObject(2, UUID.fromString(dashboardId));
            pstmt.setString(3, widgetJsonString);
            pstmt.execute();

            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    // Deletes a dashboard widget by widget_id
    public String deleteDashBoardWidgetById(Request req, Response res) {
        var widgetId = req.queryParams("widgetId");
        var jsonInputs = elementToObject(parseJson(req.body()));
        var dashboardId = jsonInputs.get("dashID").getAsString();

        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM delete_project_widget_by_widget_id(?, ?)")) {

            pstmt.setInt(1, Integer.parseInt(widgetId));
            pstmt.setObject(2, UUID.fromString(dashboardId));
            pstmt.execute();

            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

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
