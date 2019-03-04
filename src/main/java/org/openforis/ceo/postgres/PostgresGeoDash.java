package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.SQLException;
import java.util.UUID;
import org.openforis.ceo.db_api.GeoDash;
import spark.Request;
import spark.Response;

public class PostgresGeoDash implements GeoDash {


    // Returns either the dashboard for a project or an empty dashboard if it has not been configured
    public String geodashId(Request req, Response res) {
        var projectId = req.params(":id");
        var projectTitle =  req.queryParams("title");

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM get_project_widgets_by_project_id(?)")) {
                 
            pstmt.setInt(1, Integer.parseInt(projectId));
            try(var rs = pstmt.executeQuery()){
                if(rs.next()) {
                    var dashboard = new JsonObject();
                    dashboard.addProperty("projectID", projectId);
                    dashboard.addProperty("projectTitle", rs.getString("project_title"));
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
                    newDashboard.addProperty("projectTitle", projectTitle);
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

    // Will be removed once confirmed it is abandoned and not needed
    public String updateDashBoardById(Request req, Response res) {
        /* Code will go here to update dashboard*/
        return "";
    }

    // Creates a dashboard widget for a specific project
    public String createDashBoardWidgetById(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId =jsonInputs.get("pID").getAsString();
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
        var widgetId = req.params(":id");
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var dashboardId = jsonInputs.get("dashID").getAsString();
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
        var widgetId = req.params(":id");

        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM delete_project_widget_by_widget_id(?)")) {

            pstmt.setInt(1, Integer.parseInt(widgetId));
            pstmt.execute();

            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

}
