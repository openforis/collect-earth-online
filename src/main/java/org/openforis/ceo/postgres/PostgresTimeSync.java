package org.openforis.ceo.postgres;

import com.google.gson.JsonArray;
import org.openforis.ceo.db_api.TimeSync;
import org.openforis.ceo.utils.DatabaseUtils;
import spark.Request;
import spark.Response;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

public class PostgresTimeSync implements TimeSync {

    @Override
    public String getVersion(Request req, Response res) {
        return "Version 1.0";
    }

    @Override
    public String getAssignedProjects(Request req, Response res) {
        var interpreter = req.params(":interpreter");
        var sql = "SELECT * FROM get_project_for_user(?)";
        try {
            var conn = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1,Integer.parseInt(interpreter));
            var rs = pstmt.executeQuery();

            var result = DatabaseUtils.convertResultSetToJson(rs);

            return result;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public String getPlots(Request req, Response res) {
        //timesync/plot/:interpreter/:project_id/:packet
        var interpreter = req.params(":interpreter");
        var project_id = req.params(":project_id");
        var packet = Integer.parseInt(req.params("packet"));

        var sql1 = "SELECT * FROM get_project_plots_for_user(?, ?)";
        var sql2 = "SELECT * FROM get_project_plots_for_user(?, ?, ?)";
        var sql = packet < 0 ? sql1 : sql2;

        try {
            var conn = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, Integer.parseInt(interpreter));
            pstmt.setInt(2, Integer.parseInt(project_id));
            if (packet >= 0) {
                pstmt.setInt(3, packet);
            }
            var rs = pstmt.executeQuery();

            var result = DatabaseUtils.convertResultSetToJson(rs);
            return result;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public String getVerticesForPlot(Request req, Response res) {
        //timesync/vertex/:interpreter/:project_id/:plotid/:packet
        var interpreter = req.params(":interpreter");
        var project_id = req.params(":project_id");
        var plotid = req.params(":plotid");
        var packet = req.params("packet");

        var sql = "SELECT * FROM get_plot_vertices(?,?,?,?)";
        try {
            var conn = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, Integer.parseInt(interpreter));
            pstmt.setInt(2, Integer.parseInt(project_id));
            pstmt.setInt(3, Integer.parseInt(plotid));
            pstmt.setInt(4, Integer.parseInt(packet));

            var rs = pstmt.executeQuery();

            var result = DatabaseUtils.convertResultSetToJson(rs);
            return result;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public String getVerticesForProject(Request req, Response res) {
        //timesync/vertex/:project_id
        var project_id = req.params(":project_id");

        var sql = "SELECT * FROM get_plot_vertices_for_project(?)";
        try {
            var conn = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, Integer.parseInt(project_id));

            var rs = pstmt.executeQuery();

            var result = DatabaseUtils.convertResultSetToJson(rs);
            return result;
        } catch (Exception e) {
            return null;
        }
    }

    private String saveVertexViaRequestBody(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var project_id = jsonInputs.get("projectID").getAsInt();
        var interpreter = jsonInputs.get("userID").getAsInt();
        var plot_id = jsonInputs.get("plotID").getAsInt();
        var packetElement = jsonInputs.get("packetID");
        var packet = packetElement == null ? -1 : packetElement.getAsInt();

        var vertInfos = jsonInputs.get("vertInfo").getAsJsonArray();


        return null;
    }

    private String saveVertexWithForm(Request req, Response res) {
        return "Not implemented yet";
    }

    @Override
    public String saveVertex(Request req, Response res) {
        if (req.contentType().contains("multipart/form-data")) {
            return saveVertexWithForm(req, res);
        }
        else {
            return saveVertexViaRequestBody(req, res);
        }
    }
}
