package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.DatabaseUtils.convertResultSetToJsonString;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

import com.google.gson.JsonObject;
import org.openforis.ceo.db_api.TimeSync;
import spark.Request;
import spark.Response;

public class PostgresTimeSync implements TimeSync {

    public String getVersion(Request req, Response res) {
        return "Version 1.0";
    }

    public String getAssignedProjects(Request req, Response res) {
        var interpreter = req.params(":interpreter");
        var sql         = "SELECT * FROM get_project_for_user(?)";
        try {
            var conn  = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, Integer.parseInt(interpreter));
            var rs = pstmt.executeQuery();
            return convertResultSetToJsonString(rs);
        } catch (Exception e) {
            return "";
        }
    }

    public String getPlots(Request req, Response res) {
        // timesync/plot/:interpreter/:project_id/:packet
        var interpreter = Integer.parseInt(req.params(":interpreter"));
        var projectId   = Integer.parseInt(req.params(":project_id"));
        var packet      = Integer.parseInt(req.params("packet"));

        var sql = packet < 0
            ? "SELECT * FROM get_project_plots_for_user(?, ?)"
            : "SELECT * FROM get_project_plots_for_user(?, ?, ?)";
        try {
            var conn = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, interpreter);
            pstmt.setInt(2, projectId);
            if (packet >= 0) {
                pstmt.setInt(3, packet);
            }
            var rs = pstmt.executeQuery();
            return convertResultSetToJsonString(rs);
        } catch (Exception e) {
            return "";
        }
    }

    public String getVerticesForPlot(Request req, Response res) {
        // timesync/vertex/:interpreter/:project_id/:plotid/:packet
        var interpreter = req.params(":interpreter");
        var projectId   = req.params(":project_id");
        var plotId      = req.params(":plotid");
        var packet      = req.params("packet");

        var sql = "SELECT * FROM get_plot_vertices(?,?,?,?)";
        try {
            var conn  = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, Integer.parseInt(interpreter));
            pstmt.setInt(2, Integer.parseInt(projectId));
            pstmt.setInt(3, Integer.parseInt(plotId));
            pstmt.setInt(4, Integer.parseInt(packet));
            var rs = pstmt.executeQuery();
            return convertResultSetToJsonString(rs);
        } catch (Exception e) {
            return "";
        }
    }

    public String getVerticesForProject(Request req, Response res) {
        // timesync/vertex/:project_id
        var projectId = req.params(":project_id");

        var sql = "SELECT * FROM get_plot_vertices_for_project(?)";
        try {
            var conn  = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
            return convertResultSetToJsonString(rs);
        } catch (Exception e) {
            return "";
        }
    }

    private static String saveVertexViaRequestBody(Request req, Response res) {
        var jsonInputs    = parseJson(req.body()).getAsJsonObject();
        var projectId     = jsonInputs.get("projectId").getAsInt();
        var interpreter   = jsonInputs.get("userId").getAsInt();
        var plotId        = jsonInputs.get("plotId").getAsInt();
        var packetElement = jsonInputs.get("packet");
        var packet        = packetElement == null ? -1 : packetElement.getAsInt();
        var vertInfos     = jsonInputs.get("timeSync").getAsJsonArray();
        var json          = mapJsonArray(vertInfos, element -> {
            var imageYear   = element.get("image_year").getAsInt();
            var imageJulDay = element.get("image_julday").getAsInt();
            var iId         = element.get("iid");
            var imageId     = iId == null ? "" : iId.getAsString();

            var reflectance = new JsonObject();
            reflectance.addProperty("B1", element.get("B1").getAsFloat());
            reflectance.addProperty("B2", element.get("B2").getAsFloat());
            reflectance.addProperty("B3", element.get("B3").getAsFloat());
            reflectance.addProperty("B4", element.get("B4").getAsFloat());
            reflectance.addProperty("B5", element.get("B5").getAsFloat());
            reflectance.addProperty("B7", element.get("B7").getAsFloat());
            reflectance.addProperty("cfmask", element.get("cfmask").getAsInt());
            reflectance.addProperty("iid", element.get("iid").getAsString());
            reflectance.addProperty("image_julday", element.get("image_julday").getAsInt());
            reflectance.addProperty("image_year", element.get("image_year").getAsInt());

            var packetJson = new JsonObject();
            packetJson.addProperty("project_id", projectId);
            packetJson.addProperty("plot_id", plotId);
            packetJson.addProperty("user_id", interpreter);
            var sqlPacket = packet == -1 ? null : packet;
            packetJson.addProperty("packet_id", sqlPacket);
            packetJson.addProperty("image_year", imageYear);
            packetJson.addProperty("image_julday", imageJulDay);
            packetJson.addProperty("image_id", imageId);

            if (element.has("landuse")) {
                packetJson.addProperty("is_vertex", true);
                packetJson.add("landuse", element.get("landuse").getAsJsonObject());
                packetJson.add("landcover", element.get("landcover").getAsJsonObject());
                packetJson.add("change_process", element.get("change_process").getAsJsonObject());
            } else {
                packetJson.addProperty("is_vertex", false);
                packetJson.add("landuse", null);
                packetJson.add("landcover", null);
                packetJson.add("change_process", null);
            }

            packetJson.add("reflectance", reflectance);
            return packetJson;
        });

        var sql = "SELECT create_vertices(?,?,?,?,?::jsonb)";
        try {
            var conn  = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, projectId);
            pstmt.setInt(2, plotId);
            pstmt.setInt(3, interpreter);
            pstmt.setInt(4, packet);
            pstmt.setString(5, json.toString());
            pstmt.execute();
            return "";
        } catch (Exception e) {
            return "";
        }
    }

    private static String saveVertexWithForm(Request req, Response res) {
        return "Not implemented yet";
    }

    public String saveVertex(Request req, Response res) {
        if (req.contentType().contains("multipart/form-data")) {
            return saveVertexWithForm(req, res);
        } else {
            return saveVertexViaRequestBody(req, res);
        }
    }

    private static String saveCommentViaRequestBody(Request req, Response res) {
        // TODO: take advantage of Postgres JSON function. Change the implementation to
        // use JSON as input in the stored procedure to avoid all these extraction
        var jsonInputs    = parseJson(req.body()).getAsJsonObject();
        var projectId     = jsonInputs.get("projectID").getAsInt();
        var interpreter   = jsonInputs.get("userID").getAsInt();
        var plotId        = jsonInputs.get("plotID").getAsInt();
        var packetElement = jsonInputs.get("packetID");
        var packet        = packetElement == null ? -1 : packetElement.getAsInt();
        var comment       = jsonInputs.get("comment").getAsString();
        var isComplete    = jsonInputs.get("isComplete").getAsInt();
        var isExample     = jsonInputs.get("isExample").getAsInt();

        var sql = "SELECT create_plot_comments(?,?,?,?,?,?,?,?,?)";
        try {
            var conn = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, interpreter);
            pstmt.setInt(2, projectId);
            pstmt.setInt(3, plotId);
            pstmt.setInt(4, packet);
            pstmt.setString(5, comment);
            pstmt.setInt(6, isComplete);
            pstmt.setInt(7, isExample);
            pstmt.setInt(8, 0); // not used
            pstmt.setInt(9, 0); // not used
            pstmt.execute();
            return "";
        } catch (Exception e) {
            return "";
        }
    }

    private static String saveCommentWithForm(Request req, Response res) {
        return "Not implemented: please submit Comment within request body.";
    }

    public String saveComment(Request req, Response res) {
        if (req.contentType().contains("multipart/form-data")) {
            return saveCommentWithForm(req, res);
        } else {
            return saveCommentViaRequestBody(req, res);
        }
    }

    public String getComment(Request req, Response res) {
        // timesync//comment/:interpreter/:project_id/:plotid/:packet
        var interpreter = req.params(":interpreter");
        var projectId   = req.params(":project_id");
        var plotId      = req.params(":plotid");
        var packet      = req.params("packet");

        var sql = "SELECT * FROM get_plot_comments(?,?,?,?)";
        try {
            var conn = connect();
            var pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, Integer.parseInt(interpreter));
            pstmt.setInt(2, Integer.parseInt(projectId));
            pstmt.setInt(3, Integer.parseInt(plotId));
            pstmt.setInt(4, Integer.parseInt(packet));
            var rs = pstmt.executeQuery();
            return convertResultSetToJsonString(rs);
        } catch (Exception e) {
            return "";
        }
    }

    public String getImagePreference(Request req, Response res) {
        return "";
    }

    public String updateImagePreference(Request req, Response res) {
        return "";
    }

}
