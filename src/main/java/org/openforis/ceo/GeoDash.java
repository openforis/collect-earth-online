package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.mapJsonArray;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.readJsonFile;
import static org.openforis.ceo.JsonUtils.writeJsonFile;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.net.URLDecoder;
import java.util.Optional;
import java.util.UUID;
import spark.Request;
import spark.Response;

public class GeoDash {

    public static synchronized String geodashId(Request req, Response res) {
        String projectId = req.params(":id");
        String projectTitle = req.queryParams("title");
        String callback = req.queryParams("callback");

        JsonArray projects = readJsonFile("proj.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects,
            project -> project.get("projectID").getAsString().equals(projectId));
        if (matchingProject.isPresent()) {
            JsonObject project = matchingProject.get();
            String dashboardId = project.get("dashboard").getAsString();
            try {
                String dashboardJson = readJsonFile("dash-" + dashboardId + ".json").toString();
                if (callback != null) {
                    return callback + "(" + dashboardJson + ")";
                } else {
                    return dashboardJson;
                }
            } catch (Exception e) {
                // The dash-<dashboardId>.json file doesn't exist, so we need to create a blank one.
                JsonObject newDashboard = new JsonObject();
                newDashboard.addProperty("projectID", projectId);
                newDashboard.addProperty("projectTitle", projectTitle);
                newDashboard.add("widgets", new JsonArray());
                newDashboard.addProperty("dashboardID", dashboardId);

                writeJsonFile("dash-" + dashboardId + ".json", newDashboard);

                if (callback != null) {
                    return callback + "(" + newDashboard.toString() + ")";
                } else {
                    return newDashboard.toString();
                }
            }
        } else {
            String newDashboardId = UUID.randomUUID().toString();

            JsonObject newProject = new JsonObject();
            newProject.addProperty("projectID", projectId);
            newProject.addProperty("dashboard", newDashboardId);
            projects.add(newProject);

            writeJsonFile("proj.json", projects);

            JsonObject newDashboard = new JsonObject();
            newDashboard.addProperty("projectID", projectId);
            newDashboard.addProperty("projectTitle", projectTitle);
            newDashboard.add("widgets", new JsonArray());
            newDashboard.addProperty("dashboardID", newDashboardId);

            writeJsonFile("dash-" + newDashboardId + ".json", newDashboard);

            if (callback != null) {
                return callback + "(" + newDashboard.toString() + ")";
            } else {
                return newDashboard.toString();
            }
        }
    }

    public static synchronized String updateDashBoardByID(Request req, Response res) {
        /* Code will go here to update dashboard*/
        return "";
    }

    public static synchronized String createDashBoardWidgetByID(Request req, Response res) {
        String dashboardId = req.queryParams("dashID");
        String widgetJson = req.queryParams("widgetJSON");
        String callback = req.queryParams("callback");

        JsonObject dashboard = readJsonFile("dash-" + dashboardId + ".json").getAsJsonObject();
        JsonArray widgets = dashboard.getAsJsonArray("widgets");

        try {
            JsonObject newWidget = parseJson(URLDecoder.decode(widgetJson, "UTF-8")).getAsJsonObject();
            widgets.add(newWidget);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        dashboard.add("widgets", widgets);
        writeJsonFile("dash-" + dashboardId + ".json", dashboard);

        if (callback != null) {
            return callback + "()";
        } else {
            return "";
        }
    }

    public static synchronized String updateDashBoardWidgetByID(Request req, Response res) {
        String dashboardId = req.queryParams("dashID");
        String widgetId = req.params(":id");
        String widgetJson = req.queryParams("widgetJSON");
        String callback = req.queryParams("callback");

        JsonObject dashboard = readJsonFile("dash-" + dashboardId + ".json").getAsJsonObject();
        JsonArray widgets = dashboard.getAsJsonArray("widgets");

        JsonArray updatedWidgets = mapJsonArray(widgets, widget -> {
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

        if (callback != null) {
            return callback + "()";
        } else {
            return "";
        }
    }

    public static synchronized String deleteDashBoardWidgetByID(Request req, Response res) {
        String dashboardId = req.queryParams("dashID");
        String widgetId = req.params(":id");
        String callback = req.queryParams("callback");

        JsonObject dashboard = readJsonFile("dash-" + dashboardId + ".json").getAsJsonObject();
        JsonArray widgets = dashboard.getAsJsonArray("widgets");

        JsonArray updatedWidgets = filterJsonArray(widgets, widget -> !widget.get("id").getAsString().equals(widgetId));

        dashboard.add("widgets", updatedWidgets);
        writeJsonFile("dash-" + dashboardId + ".json", dashboard);

        if (callback != null) {
            return callback + "()";
        } else {
            return "";
        }
    }

}
