package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.SQLException;
import java.util.UUID;
import org.openforis.ceo.db_api.GeoDash;
import spark.Request;
import spark.Response;

public class PostgresGeoDash implements GeoDash {

    // returns either the dashboard for a project or an empty dashboard if it has not been configured
    public String geodashId(Request req, Response res) {
        var projectId = req.params(":id");
        var projectTitle = req.queryParams("title");
        var callback = req.queryParams("callback");
        var SQL = "SELECT * FROM get_project_widgets_by_project_id(?)";

        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
            if(rs.next()) {
                var newDashboard = new JsonObject();
                newDashboard.addProperty("projectID", projectId);
                newDashboard.addProperty("projectTitle", projectTitle);
                newDashboard.addProperty("dashboardID", rs.getString("dashboard_id"));

                var widgets = new JsonArray();
                do {
                    var widgetJson = rs.getString("widget");
                    widgets.add(widgetJson);
                } while (rs.next());
                newDashboard.add("widgets", widgets);
                if (callback != null) {
                    return callback + "(" + newDashboard.toString() + ")";
                } else {
                    return newDashboard.toString();
                }
            }
            else{
                //no widgets return empty dashboard
                var newDashboardId = UUID.randomUUID().toString();
                var newDashboard = new JsonObject();
                newDashboard.addProperty("projectID", projectId);
                newDashboard.addProperty("projectTitle", projectTitle);
                newDashboard.addProperty("dashboardID", newDashboardId);
                newDashboard.add("widgets", new JsonArray());
                if (callback != null) {
                    return callback + "(" + newDashboard.toString() + ")";
                } else {
                    return newDashboard.toString();
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return this.returnBlank(callback);
    }

    // will be removed once confirmed it is abandoned and not needed
    public String updateDashBoardByID(Request req, Response res) {
        /* Code will go here to update dashboard*/
        return "";
    }

    // Creates a dashboard widget for a specific project
    public String createDashBoardWidgetByID(Request req, Response res) {
        var projectId = req.queryParams("pID");
        var dashboardId = req.queryParams("dashID");
        var widgetJson = req.queryParams("widgetJSON");
        var callback = req.queryParams("callback");
        var SQL = "SELECT * FROM add_project_widget(?, ?, ?::JSONB)";

        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(projectId));
            pstmt.setString(2, dashboardId);
            pstmt.setString(3, widgetJson);
            var rs = pstmt.executeQuery();
            return this.returnBlank(callback);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return this.returnBlank(callback);
    }

    // Updates a dashboard widget by widget_id
    public String updateDashBoardWidgetByID(Request req, Response res) {
        var widgetId = req.params(":id");
        var widgetJson = req.queryParams("widgetJSON");
        var callback = req.queryParams("callback");
        var SQL = "SELECT * FROM update_project_widget_by_widget_id(?, ?::JSONB)";

        try (var conn = connect();
            var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(widgetId));
            pstmt.setString(2, widgetJson);
            var rs = pstmt.executeQuery();
            return this.returnBlank(callback);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return this.returnBlank(callback);
    }

    // Deletes a dashboard widget by widget_id
    public String deleteDashBoardWidgetByID(Request req, Response res) {
        var widgetId = req.params(":id");
        var callback = req.queryParams("callback");
        var SQL = "SELECT * FROM delete_project_widget_by_widget_id(?)";

        try (var conn = connect();
            var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(widgetId));
            var rs = pstmt.executeQuery();
            return this.returnBlank(callback);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return this.returnBlank(callback);
    }

    /* Helper functions */
    // Returns the appended callback string or ""
    private String returnBlank(String callback) {
        if (callback != null) {
            return callback + "()";
        } else {
            return "";
        }
    }

}
