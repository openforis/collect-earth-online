package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.openforis.ceo.db_api.Imagery;
import spark.Request;
import spark.Response;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresImagery implements Imagery {

    private static JsonArray buildImageryJson(ResultSet rs, Boolean showConfig) {
        var imageryArray = new JsonArray();
        try {
            while(rs.next()) {
                //create imagery json to send back
                var newImagery = new JsonObject();
                newImagery.addProperty("id", rs.getInt("imagery_id"));
                newImagery.addProperty("institution", rs.getInt("institution_id"));
                newImagery.addProperty("visibility", rs.getString("visibility"));
                newImagery.addProperty("title", rs.getString("title"));
                newImagery.addProperty("attribution", rs.getString("attribution"));
                if (showConfig) {
                    newImagery.add("extent", rs.getString("extent") == null || rs.getString("extent").equals("null")
                        ? null
                        : parseJson(rs.getString("extent")).getAsJsonArray());
                    newImagery.add("sourceConfig", parseJson(rs.getString("source_config")).getAsJsonObject());
                }

                imageryArray.add(newImagery);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return imageryArray;
    }

    public String getPublicImagery(Request req, Response res) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_public_imagery()")) {

            try (var rs = pstmt.executeQuery()) {
                return buildImageryJson(rs, true).toString();
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getInstitutionImagery(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");
        final var userId = Integer.parseInt(req.session().attributes().contains("userid") ? req.session().attribute("userid").toString() : "0");

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_public_imagery_by_institution(?)")) {

            pstmt.setInt(1, Integer.parseInt(institutionId));

            try (var rs = pstmt.executeQuery()) {
                // FIXME check if user is member
                return buildImageryJson(rs, userId > 0).toString();
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String addInstitutionImagery(Request req, Response res) {
        try {
            var jsonInputs            = parseJson(req.body()).getAsJsonObject();
            var institutionId         = jsonInputs.get("institutionId").getAsInt();
            var imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            var sourceConfig          = jsonInputs.get("sourceConfig").getAsJsonObject();

            try (var conn = connect();
                var pstmt = conn.prepareStatement(
                    "SELECT * FROM add_institution_imagery(?, ?, ?, ?, ?::JSONB, ?::JSONB)")) {

                pstmt.setInt(1, institutionId);
                pstmt.setString(2, "private");
                pstmt.setString(3, imageryTitle);
                pstmt.setString(4, imageryAttribution);
                pstmt.setString(5, "null"); // no where to add extent in UI
                pstmt.setString(6, sourceConfig.toString());
                pstmt.execute();

            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }

        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
        return "";
    }

    public String addGeoDashImagery(Request req, Response res) {
        try {
            var jsonInputs         = parseJson(req.body()).getAsJsonObject();
            var institutionId      = jsonInputs.get("institutionId").getAsInt();
            var imageryTitle       = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution = jsonInputs.get("imageryAttribution").getAsString();
            var geeUrl             = jsonInputs.get("geeUrl").getAsString();
            var geeParams          = jsonInputs.get("geeParams").getAsJsonObject();

            try (var conn = connect();
                 var pstmt_check = conn.prepareStatement(
                    "SELECT * FROM check_institution_imagery(?,?)")) {

                pstmt_check.setInt(1, institutionId);
                pstmt_check.setString(1, imageryTitle);
                try (var rs_check = pstmt_check.executeQuery()) {
                    if (rs_check.next() && !rs_check.getBoolean("check_institution_imagery")){
                        try (var pstmt = conn.prepareStatement(
                                "SELECT * FROM add_institution_imagery(?,?,?,?,?::JSONB,?::JSONB)")) {

                            var sourceConfig = new JsonObject();
                            sourceConfig.addProperty("type",   "GeeGateway");
                            sourceConfig.addProperty("geeUrl", geeUrl);
                            sourceConfig.add("geeParams", geeParams);

                            pstmt.setInt(1, institutionId);
                            pstmt.setString(2, "private");
                            pstmt.setString(3, imageryTitle);
                            pstmt.setString(4, imageryAttribution);
                            pstmt.setString(5, "null"); // no where to add extent in UI
                            pstmt.setString(6, sourceConfig.toString());
                            pstmt.execute();
                        }
                    }
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
        return "";
    }

    // FIXME, make sure imagery is not referenced
    public String deleteInstitutionImagery(Request req, Response res) {
        var jsonInputs =    parseJson(req.body()).getAsJsonObject();
        var imageryId =     jsonInputs.get("imageryId").getAsString();

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM delete_imagery(?)")) {

            pstmt.setInt(1, Integer.parseInt(imageryId));
            pstmt.execute();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return "";
    }

}
