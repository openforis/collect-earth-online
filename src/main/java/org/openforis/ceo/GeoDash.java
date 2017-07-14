package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.net.URLDecoder;
import java.util.Optional;
import java.util.UUID;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.mapJsonArray;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.readJsonFile;
import static org.openforis.ceo.JsonUtils.writeJsonFile;

public class GeoDash {

    public static synchronized String geodashId(Request req, Response res) {
        JsonArray projects = readJsonFile("proj.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects, project -> project.get("projectID").getAsString().equals(req.params(":id")));
        if (matchingProject.isPresent()) {
            JsonObject project = matchingProject.get();
            String dashboardJson = readJsonFile("dash-" + project.get("dashboard").getAsString() + ".json").toString();
            if (req.queryParams("callback") != null) {
                return req.queryParams("callback") + "(" + dashboardJson + ")";
            } else {
                return dashboardJson;
            }
        } else if (req.session().attribute("role") != null && req.session().attribute("role").equals("admin")) {
            String newUUID = UUID.randomUUID().toString();

            JsonObject newProject = new JsonObject();
            newProject.addProperty("projectID", req.params(":id"));
            newProject.addProperty("dashboard", newUUID);
            projects.add(newProject);

            writeJsonFile("proj.json", projects);

            JsonObject newDashboard = new JsonObject();
            newDashboard.addProperty("projectID", req.params(":id"));
            newDashboard.addProperty("projectTitle", req.queryParams("title"));
            newDashboard.add("widgets", new JsonArray());
            newDashboard.addProperty("dashboardID", newUUID);

            writeJsonFile("dash-" + newUUID + ".json", newDashboard);

            if (req.queryParams("callback") != null) {
                return req.queryParams("callback") + "(" + newDashboard.toString() + ")";
            } else {
                return newDashboard.toString();
            }
        } else {
            return "No project exists with ID: " + req.params(":id") + ".";
        }
    }

    public static synchronized String updateDashBoardByID(Request req, Response res) {
        /* Code will go here to update dashboard*/
        return  "";
    }

    public static synchronized String createDashBoardWidgetByID(Request req, Response res) {
        JsonObject dashboard = readJsonFile("dash-" + req.queryParams("dashID") + ".json").getAsJsonObject();
        JsonArray widgets;
        try {
            widgets = dashboard.getAsJsonArray("widgets");
        } catch (Exception e) {
            String oWidgets = dashboard.get("widgets").getAsString();
            widgets = (JsonArray) parseJson(oWidgets);
        }
        try {
            JsonObject newWidget = parseJson(URLDecoder.decode(req.queryParams("widgetJSON"), "UTF-8")).getAsJsonObject();
            widgets.add(newWidget);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        dashboard.add("widgets", widgets);
        writeJsonFile("dash-" + req.queryParams("dashID") + ".json", dashboard);
        if (req.queryParams("callback") != null) {
            return req.queryParams("callback") + "()";
        } else {
            return "";
        }
    }

    public static synchronized String updateDashBoardWidgetByID(Request req, Response res) {
        JsonObject dashboard = readJsonFile("dash-" + req.queryParams("dashID") + ".json").getAsJsonObject();
        JsonArray widgets = dashboard.getAsJsonArray("widgets");
        JsonArray updatedWidgets = mapJsonArray(widgets, widget -> {
                if (widget.get("id").getAsString().equals(req.params(":id"))) {
                    try {
                        return parseJson(URLDecoder.decode(req.queryParams("widgetJSON"), "UTF-8")).getAsJsonObject();
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                } else {
                    return widget;
                }
            });
        dashboard.add("widgets", updatedWidgets);
        writeJsonFile("dash-" + req.queryParams("dashID") + ".json", dashboard);
        if (req.queryParams("callback") != null) {
            return req.queryParams("callback") + "()";
        } else {
            return "";
        }
    }

    public static synchronized String deleteDashBoardWidgetByID(Request req, Response res) {
        JsonObject dashboard = readJsonFile("dash-" + req.queryParams("dashID") + ".json").getAsJsonObject();
        JsonArray widgets = dashboard.getAsJsonArray("widgets");
        JsonArray updatedWidgets = filterJsonArray(widgets, widget -> !widget.get("id").getAsString().equals(req.params(":id")));
        dashboard.add("widgets", updatedWidgets);
        writeJsonFile("dash-" + req.queryParams("dashID") + ".json", dashboard);
        if (req.queryParams("callback") != null) {
            return req.queryParams("callback") + "()";
        } else {
            return "";
        }
    }

}
