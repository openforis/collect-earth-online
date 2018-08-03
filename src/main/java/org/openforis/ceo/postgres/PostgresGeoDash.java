package org.openforis.ceo.postgres;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

import java.net.URLDecoder;
import java.sql.*;
import java.util.Optional;
import java.util.UUID;


import static org.openforis.ceo.utils.JsonUtils.*;

public class PostgresGeoDash {
    private final String url = "jdbc:postgresql://localhost";
    private final String user = "ceo";
    private final String password = "ceo";

    public String geodashId(Request req, Response res) {
        String projectId = req.params(":id");
        String projectTitle = req.queryParams("title");
        String callback = req.queryParams("callback");
        String SQL = "SELECT * FROM get_project_widgets_by_project_id(?)";

        try (Connection conn = this.connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {

            pstmt.setInt(1, Integer.parseInt(projectId));
            ResultSet rs = pstmt.executeQuery();
            if(rs.next()) {
                JsonObject newDashboard = new JsonObject();
                newDashboard.addProperty("projectID", projectId);
                newDashboard.addProperty("projectTitle", projectTitle);
                newDashboard.addProperty("dashboardID", rs.getString("dashboard_id"));

                JsonArray widgets = new JsonArray();
                do {
                    String widgetJson = rs.getString("widget");
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
                String newDashboardId = UUID.randomUUID().toString();
                JsonObject newDashboard = new JsonObject();
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

    public String updateDashBoardByID(Request req, Response res) {
        /* Code will go here to update dashboard*/
        return "";
    }
    public String createDashBoardWidgetByID(Request req, Response res) {
        String projectId = req.queryParams("pID");
        String dashboardId = req.queryParams("dashID");
        String widgetJson = req.queryParams("widgetJSON");
        String callback = req.queryParams("callback");
        String SQL = "SELECT * FROM add_project_widget(?, ?, ?)";

        try (Connection conn = this.connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(projectId));
            pstmt.setString(2, dashboardId);
            pstmt.setString(3, widgetJson);
            ResultSet rs = pstmt.executeQuery();
            return this.returnBlank(callback);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return this.returnBlank(callback);
    }

    public String updateDashBoardWidgetByID(Request req, Response res) {
        String widgetId = req.params(":id");
        String widgetJson = req.queryParams("widgetJSON");
        String callback = req.queryParams("callback");
        String SQL = "SELECT * FROM update_project_widget_by_widget_id(?, ?)";

        try (Connection conn = this.connect();
            PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(widgetId));
            pstmt.setString(2, widgetJson);
            ResultSet rs = pstmt.executeQuery();
            return this.returnBlank(callback);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return this.returnBlank(callback);
    }

    public String deleteDashBoardWidgetByID(Request req, Response res) {
        String widgetId = req.params(":id");
        String callback = req.queryParams("callback");
        String SQL = "SELECT * FROM delete_project_widget_by_widget_id(?)";

        try (Connection conn = this.connect();
            PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(widgetId));
            ResultSet rs = pstmt.executeQuery();
            return this.returnBlank(callback);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return this.returnBlank(callback);
    }
    /* Helper functions */
    private String returnBlank(String callback)
    {
        if (callback != null) {
            return callback + "()";
        } else {
            return "";
        }
    }
    private Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }
}
