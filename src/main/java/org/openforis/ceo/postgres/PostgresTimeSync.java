package org.openforis.ceo.postgres;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.openforis.ceo.db_api.TimeSync;
import org.openforis.ceo.utils.DatabaseUtils;
import org.openforis.ceo.utils.JsonUtils;
import spark.Request;
import spark.Response;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

public class PostgresTimeSync implements TimeSync {
  //TODO: make generic function to excute query
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
      pstmt.setInt(1, Integer.parseInt(interpreter));
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

//    var project_id = jsonInputs.get("projectID").getAsInt();
//    var interpreter = jsonInputs.get("userID").getAsInt();
//    var plot_id = jsonInputs.get("plotID").getAsInt();
//    var packetElement = jsonInputs.get("packetID");
//    var packet = packetElement == null ? -1 : packetElement.getAsInt();

    var json = JsonUtils.mapJsonArray(vertInfos,
            element -> {
              var image_year = element.get("year").getAsInt();
              var image_julday = element.get("julday").getAsInt();
              var t = element.get("image_id");
              var image_id = t == null ? "" : t.getAsString();

              var landuse = element.get("landUse").getAsJsonObject();
              var dominantLandUse = landuse.get("primary").getAsJsonObject();
              var dominant_landuse = dominantLandUse.get("landUse").getAsString();
              var dominant_landuse_notes = dominantLandUse.get("notes").getAsJsonObject().toString();

              //TODO: should we keep secondary land use
              //var secondaryLandUse = landuse.get("secondary").getAsJsonObject();
              //var secondary_landuse = secondaryLandUse.get("landUse").getAsString();
              //var secondary_landuse_notes = secondaryLandUse.get("notes").getAsJsonObject().toString();

              var dominantLandCover = element.get("landCover").getAsJsonObject();
              var dominant_landcover = dominantLandCover.get("landCover").getAsString();
              var dominant_landcover_notes = dominantLandCover.get("other").getAsJsonObject().toString();

              var changeProcess = element.get("changeProcess").getAsJsonObject();
              var change_process = changeProcess.get("changeProcess").getAsString();
              var change_process_notes = changeProcess.get("notes").getAsJsonObject().toString();

              var obj = new JsonObject();
              obj.addProperty("project_id", project_id);
              obj.addProperty("plot_id", plot_id);
              obj.addProperty("image_year", image_year);
              obj.addProperty("image_julday", image_julday);
              obj.addProperty("image_id", image_id);
              obj.addProperty("dominant_landuse", dominant_landuse);
              obj.addProperty("dominant_landuse_notes", dominant_landuse_notes);
              obj.addProperty("dominant_landcover", dominant_landcover);
              obj.addProperty("dominant_landcover_notes", dominant_landcover_notes);
              obj.addProperty("change_process", change_process);
              obj.addProperty("change_process_notes", change_process_notes);
              obj.addProperty("interpreter", interpreter);
              obj.addProperty("packet_id", packet);

              return obj;
            });

    var sql = "SELECT create_vertices(?,?,?,?,?::jsonb)";

    try {
      var conn = connect();
      var pstmt = conn.prepareStatement(sql);
      pstmt.setInt(1, project_id);
      pstmt.setInt(2, plot_id);
      pstmt.setInt(3, interpreter);
      pstmt.setInt(4, packet);
      pstmt.setString(5, json.toString());
      var rs = pstmt.executeQuery();

      return "";
    } catch (Exception e) {
      return null;
    }

  }

  private String saveVertexWithForm(Request req, Response res) {
    return "Not implemented yet";
  }

  @Override
  public String saveVertex(Request req, Response res) {
    if (req.contentType().contains("multipart/form-data")) {
      return saveVertexWithForm(req, res);
    } else {
      return saveVertexViaRequestBody(req, res);
    }
  }

  private String saveCommentViaRequestBody(Request req, Response res) {
    //TODO: take advantage of Postgres JSON function. Chanee the implementaiton to use JSON
    // as input in the stored procedure to avoid all these extraction
    var jsonInputs = parseJson(req.body()).getAsJsonObject();
    var project_id = jsonInputs.get("projectID").getAsInt();
    var interpreter = jsonInputs.get("userID").getAsInt();
    var plot_id = jsonInputs.get("plotID").getAsInt();
    var packetElement = jsonInputs.get("packetID");
    var packet = packetElement == null ? -1 : packetElement.getAsInt();

    var comment = jsonInputs.get("comment").getAsString();
    var is_complete = jsonInputs.get("isComplete").getAsInt();
    var is_example = jsonInputs.get("isExample").getAsInt();

    var sql = "SELECT create_plot_comments(?,?,?,?,?,?,?,?,?)";

    try {
      var conn = connect();
      var pstmt = conn.prepareStatement(sql);
      pstmt.setInt(1, interpreter);
      pstmt.setInt(2, project_id);
      pstmt.setInt(3, plot_id);
      pstmt.setInt(4, packet);
      pstmt.setString(5, comment);
      pstmt.setInt(6, is_complete);
      pstmt.setInt(7, is_example);
      pstmt.setInt(8, 0); //not used
      pstmt.setInt(9, 0); //not used
      var rs = pstmt.executeQuery();

      return "";
    } catch (Exception e) {
      return null;
    }

  }

  private String saveCommentWithForm(Request req, Response res) {
    return "Not implemented: please submit Comment within request body.";
  }

  @Override
  public String saveComment(Request req, Response res) {
    if (req.contentType().contains("multipart/form-data")) {
      return saveCommentWithForm(req, res);
    } else {
      return saveCommentViaRequestBody(req, res);
    }
  }

  @Override
  public String getComment(Request req, Response res) {
    ///timesync//comment/:interpreter/:project_id/:plotid/:packet
    var interpreter = req.params(":interpreter");
    var project_id = req.params(":project_id");
    var plotid = req.params(":plotid");
    var packet = req.params("packet");

    var sql = "SELECT * FROM get_plot_comments(?,?,?,?)";
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
}
