package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.elementToArray;
import static org.openforis.ceo.utils.JsonUtils.elementToObject;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.net.URLDecoder;
import java.security.cert.X509Certificate;
import java.security.SecureRandom;
import java.util.UUID;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import javax.net.ssl.SSLContext;
import javax.net.ssl.HttpsURLConnection;
import org.apache.http.util.EntityUtils;
import org.openforis.ceo.db_api.GeoDash;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.conn.ssl.TrustSelfSignedStrategy;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import spark.Request;
import spark.Response;

public class JsonGeoDash implements GeoDash {

    public synchronized String geodashId(Request req, Response res) {
        var projectId = req.queryParams("projectId");
        var projectTitle = req.queryParams("title");

        var projects = elementToArray(readJsonFile("proj.json"));
        var matchingProject = findInJsonArray(projects,
            project -> project.get("projectID").getAsString().equals(projectId));
        if (matchingProject.isPresent()) {
            var project = matchingProject.get();
            var dashboardId = project.get("dashboard").getAsString();
            try {
                var dashboardJson = readJsonFile("dash-" + dashboardId + ".json").toString();
                return dashboardJson;
            } catch (Exception e) {
                // The dash-<dashboardId>.json file doesn't exist, so we need to create a blank one.
                var newDashboard = new JsonObject();
                newDashboard.addProperty("projectID", projectId);
                newDashboard.addProperty("projectTitle", projectTitle);
                newDashboard.add("widgets", new JsonArray());
                newDashboard.addProperty("dashboardID", dashboardId);

                writeJsonFile("dash-" + dashboardId + ".json", newDashboard);
                return newDashboard.toString();
            }
        } else {
            var newDashboardId = UUID.randomUUID().toString();

            var newProject = new JsonObject();
            newProject.addProperty("projectID", projectId);
            newProject.addProperty("dashboard", newDashboardId);
            projects.add(newProject);

            writeJsonFile("proj.json", projects);

            var newDashboard = new JsonObject();
            newDashboard.addProperty("projectID", projectId);
            newDashboard.addProperty("projectTitle", projectTitle);
            newDashboard.add("widgets", new JsonArray());
            newDashboard.addProperty("dashboardID", newDashboardId);

            writeJsonFile("dash-" + newDashboardId + ".json", newDashboard);

            return newDashboard.toString();
        }
    }

    public synchronized String createDashBoardWidgetById(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var dashboardId = jsonInputs.get("dashID").getAsString();
        var widgetJson = jsonInputs.get("widgetJSON").getAsString();

        var dashboard = elementToObject(readJsonFile("dash-" + dashboardId + ".json"));
        var widgets = dashboard.getAsJsonArray("widgets");

        try {
            var newWidget = elementToObject(parseJson(URLDecoder.decode(widgetJson, "UTF-8")));
            widgets.add(newWidget);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        dashboard.add("widgets", widgets);
        writeJsonFile("dash-" + dashboardId + ".json", dashboard);

        return "";
    }

    // FIXME: the new react design is using the body to pass the widget JSON (see PostgresGeoDash for updated form)
    public synchronized String updateDashBoardWidgetById(Request req, Response res) {
        var widgetId = req.queryParams("widgetId");
        var jsonInputs = elementToObject(parseJson(req.body()));
        var dashboardId = jsonInputs.get("dashID").getAsString();
        var widgetJson = jsonInputs.get("widgetJSON").getAsString();
        var dashboard = elementToObject(readJsonFile("dash-" + dashboardId + ".json"));
        var widgets = dashboard.getAsJsonArray("widgets");

        var updatedWidgets = mapJsonArray(widgets, widget -> {
                if (widget.get("id").getAsString().equals(widgetId)) {
                    try {
                        return parseJson(URLDecoder.decode(widgetJson, "UTF-8")).getAsJsonObject();
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                } else {
                    return widget;
                }
            });

        dashboard.add("widgets", updatedWidgets);
        writeJsonFile("dash-" + dashboardId + ".json", dashboard);

        return "";
    }

    public synchronized String deleteDashBoardWidgetById(Request req, Response res) {
        var widgetId = req.queryParams("widgetId");
        var jsonInputs = elementToObject(parseJson(req.body()));
        var dashboardId = jsonInputs.get("dashID").getAsString();
        var dashboard = elementToObject(readJsonFile("dash-" + dashboardId + ".json"));
        var widgets = dashboard.getAsJsonArray("widgets");

        var updatedWidgets = filterJsonArray(widgets, widget -> !widget.get("id").getAsString().equals(widgetId));

        dashboard.add("widgets", updatedWidgets);
        writeJsonFile("dash-" + dashboardId + ".json", dashboard);

        return "";
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
            e.printStackTrace();
            return "";
        }
    }
}
