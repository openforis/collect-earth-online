package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.SQLException;
import java.util.List;
import org.openforis.ceo.db_api.Imagery;
import spark.Request;
import spark.Response;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresImagery implements Imagery {

    public String getAllImagery(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");
        var hasInstitutionId = !(institutionId == null || institutionId.isEmpty());

        try (var conn = connect();
             var pstmt = hasInstitutionId
                ? conn.prepareStatement("SELECT * FROM select_public_imagery_by_institution(?)")
                : conn.prepareStatement("SELECT * FROM select_public_imagery()")) {

            if (hasInstitutionId) {
                pstmt.setInt(1, Integer.parseInt(institutionId));
            }
            var imageryArray = new JsonArray();
            try (var rs = pstmt.executeQuery()) {
                while(rs.next()) {
                    //create imagery json to send back
                    var newImagery = new JsonObject();
                    newImagery.addProperty("id",          rs.getInt("imagery_id"));
                    newImagery.addProperty("institution", rs.getInt("institution_id"));
                    newImagery.addProperty("visibility",  rs.getString("visibility"));
                    newImagery.addProperty("title",       rs.getString("title"));
                    newImagery.addProperty("attribution", rs.getString("attribution"));
                    newImagery.add("extent", rs.getString("extent") == null || rs.getString("extent").equals("null")
                        ? null
                        : parseJson(rs.getString("extent")).getAsJsonArray());
                    var sourceConfig = parseJson(rs.getString("source_config")).getAsJsonObject();
                    // Return only necessary fields for types we proxy
                    if (sourceConfig.get("type").getAsString().equals("GeoServer")) {
                        var cleanSource = new JsonObject();
                        cleanSource.add("type", sourceConfig.get("type"));
                        cleanSource.add("geoserverUrl", sourceConfig.get("geoserverUrl"));
                        cleanSource.add("geoserverParams", sourceConfig.get("geoserverParams"));
                        newImagery.add("sourceConfig", cleanSource);
                    } else if (sourceConfig.get("type").getAsString().equals("SecureWatch")) {
                        var cleanSource = new JsonObject();
                        cleanSource.add("type", sourceConfig.get("type"));
                        cleanSource.add("startDate", sourceConfig.get("startDate"));
                        cleanSource.add("endDate", sourceConfig.get("endDate"));
                        cleanSource.add("featureProfile", sourceConfig.get("featureProfile"));
                        cleanSource.add("geoserverParams", sourceConfig.get("geoserverParams"));
                        newImagery.add("sourceConfig", cleanSource);
                    } else if (sourceConfig.get("type").getAsString().equals("Planet")) {
                        var cleanSource = new JsonObject();
                        cleanSource.add("type",  sourceConfig.get("type"));
                        cleanSource.add("month", sourceConfig.get("month"));
                        cleanSource.add("year",  sourceConfig.get("year"));
                        cleanSource.add("accessToken", sourceConfig.get("accessToken"));
                        newImagery.add("sourceConfig", cleanSource);
                    } else {
                        newImagery.add("sourceConfig", sourceConfig);
                    };
                    imageryArray.add(newImagery);
                }
            }
            return imageryArray.toString();

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public JsonObject getImagerySourceConfig(Integer imageryId) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM imagery WHERE imagery_uid=?")) {
                pstmt.setInt(1, imageryId);
            try (var rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return parseJson(rs.getString("source_config")).getAsJsonObject();
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return new JsonObject();
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

    public String updateInstitutionImagery(Request req, Response res) {
        try {
            var jsonInputs            = parseJson(req.body()).getAsJsonObject();
            var imageryId             = jsonInputs.get("imageryId").getAsInt();
            var imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            var sourceConfig          = jsonInputs.get("sourceConfig").getAsJsonObject();

            try (var conn = connect();
                var pstmt = conn.prepareStatement(
                    "SELECT * FROM update_institution_imagery(?, ?, ?, ?::JSONB)")) {

                pstmt.setInt(1, imageryId);
                pstmt.setString(2, imageryTitle);
                pstmt.setString(3, imageryAttribution);
                pstmt.setString(4, sourceConfig.toString());
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
                pstmt_check.setString(2, imageryTitle);
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
            res.status(409);
        }

        return "";
    }

}
