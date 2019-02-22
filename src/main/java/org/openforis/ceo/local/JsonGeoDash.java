package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.net.URLDecoder;
import java.util.UUID;
import org.openforis.ceo.db_api.GeoDash;
import spark.Request;
import spark.Response;

public class JsonGeoDash implements GeoDash {

    public synchronized String geodashId(Request req, Response res) {
        var projectId = req.params(":id");
        var projectTitle = req.queryParams("title");
        var callback = req.queryParams("callback");

        var projects = readJsonFile("proj.json").getAsJsonArray();
        var matchingProject = findInJsonArray(projects,
            project -> project.get("projectID").getAsString().equals(projectId));
        if (matchingProject.isPresent()) {
            var project = matchingProject.get();
            var dashboardId = project.get("dashboard").getAsString();
            try {
                var dashboardJson = readJsonFile("dash-" + dashboardId + ".json").toString();
                if (callback != null) {
                    return callback + "(" + dashboardJson + ")";
                } else {
                    return dashboardJson;
                }
            } catch (Exception e) {
                // The dash-<dashboardId>.json file doesn't exist, so we need to create a blank one.
                var newDashboard = new JsonObject();
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

            if (callback != null) {
                return callback + "(" + newDashboard.toString() + ")";
            } else {
                return newDashboard.toString();
            }
        }
    }

    public synchronized String updateDashBoardById(Request req, Response res) {
        /* Code will go here to update dashboard*/
        return "";
    }

    
    public synchronized String createDashBoardWidgetById(Request req, Response res) {
        var jsonInputs            = parseJson(req.body()).getAsJsonObject();
        var dashboardId = jsonInputs.get("dashID").getAsString();
        var widgetJson = jsonInputs.get("widgetJSON").getAsString();
        var callback = jsonInputs.get("callback") == null? null: jsonInputs.get("callback").getAsString();

        var dashboard = readJsonFile("dash-" + dashboardId + ".json").getAsJsonObject();
        var widgets = dashboard.getAsJsonArray("widgets");

        try {
            var newWidget = parseJson(URLDecoder.decode(widgetJson, "UTF-8")).getAsJsonObject();
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

    // FIXME: the new react design is using the body to pass the widget JSON (see PostgresGeoDash for updated form)
    public synchronized String updateDashBoardWidgetById(Request req, Response res) {
        var jsonInputs            = parseJson(req.body()).getAsJsonObject();
        var dashboardId = jsonInputs.get("dashID").getAsString();
        var widgetId = req.params(":id");
        var widgetJson = jsonInputs.get("widgetJSON").getAsString();
        var callback = jsonInputs.get("callback") == null? null: jsonInputs.get("callback").getAsString();
        var dashboard = readJsonFile("dash-" + dashboardId + ".json").getAsJsonObject();
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

        if (callback != null) {
            return callback + "()";
        } else {
            return "";
        }
    }

    public synchronized String deleteDashBoardWidgetById(Request req, Response res) {
        var jsonInputs            = parseJson(req.body()).getAsJsonObject();
        var dashboardId = jsonInputs.get("dashID").getAsString();
        var widgetId = req.params(":id");
        var callback = jsonInputs.get("callback") == null? null: jsonInputs.get("callback").getAsString();

        var dashboard = readJsonFile("dash-" + dashboardId + ".json").getAsJsonObject();
        var widgets = dashboard.getAsJsonArray("widgets");

        var updatedWidgets = filterJsonArray(widgets, widget -> !widget.get("id").getAsString().equals(widgetId));

        dashboard.add("widgets", updatedWidgets);
        writeJsonFile("dash-" + dashboardId + ".json", dashboard);

        if (callback != null) {
            return callback + "()";
        } else {
            return "";
        }
    }

}
