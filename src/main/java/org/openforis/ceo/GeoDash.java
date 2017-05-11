package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.net.URLDecoder;
import java.util.Optional;
import java.util.UUID;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.*;

public class GeoDash {

    public static String geodashId(Request req, Response res) {
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
            newDashboard.addProperty("widgets", "[]");
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

    public static String updateDashBoardByID(Request req, Response res) {
        /* Code will go here to update dashboard*/
        return  "";
    }

    public static String createDashBoardWidgetByID(Request req, Response res) {
        JsonObject dashboard = readJsonFile("dash-" + req.queryParams("dashID") + ".json").getAsJsonObject();
        JsonArray widgets = dashboard.getAsJsonArray("widgets");
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

    public static String updateDashBoardWidgetByID(Request req, Response res) {
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

    public static String deleteDashBoardWidgetByID(Request req, Response res) {
        JsonObject dashboard = readJsonFile("dash-" + req.queryParams("dashID") + ".json").getAsJsonObject();
        JsonArray widgets = dashboard.getAsJsonArray("widgets");
        JsonArray updatedWidgets = filterJsonArray(widgets, widget -> !widget.get("id").getAsString().equals(req.params(":id")));
        dashboard.add("widgets", updatedWidgets);
        writeJsonFile("dash-" + req.queryParams("dashID") + ".json", updatedWidgets);
        if (req.queryParams("callback") != null) {
            return req.queryParams("callback") + "()";
        } else {
            return "";
        }
    }

}
