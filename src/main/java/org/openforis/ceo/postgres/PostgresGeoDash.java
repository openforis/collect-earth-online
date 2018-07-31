package org.openforis.ceo.postgres;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

import java.net.URLDecoder;
import java.util.Optional;
import java.util.UUID;

import static org.openforis.ceo.utils.JsonUtils.*;

public class PostgresGeoDash {

    public String geodashId(Request req, Response res) {
        String projectId = req.params(":id");
        String projectTitle = req.queryParams("title");
        String callback = req.queryParams("callback");

        return "";
    }

    public String updateDashBoardByID(Request req, Response res) {
        /* Code will go here to update dashboard*/
        return "";
    }

    public String createDashBoardWidgetByID(Request req, Response res) {
        String dashboardId = req.queryParams("dashID");
        String widgetJson = req.queryParams("widgetJSON");
        String callback = req.queryParams("callback");
        return "";
    }

    public String updateDashBoardWidgetByID(Request req, Response res) {
        String dashboardId = req.queryParams("dashID");
        String widgetId = req.params(":id");
        String widgetJson = req.queryParams("widgetJSON");
        String callback = req.queryParams("callback");
        return "";
    }

    public String deleteDashBoardWidgetByID(Request req, Response res) {
        String dashboardId = req.queryParams("dashID");
        String widgetId = req.params(":id");
        String callback = req.queryParams("callback");
        return "";
    }

}
