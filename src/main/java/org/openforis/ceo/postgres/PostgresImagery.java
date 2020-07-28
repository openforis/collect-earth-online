package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.postgres.PostgresInstitutions.isInstAdminQuery;
import static org.openforis.ceo.utils.SessionUtils.getSessionUserId;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.openforis.ceo.db_api.Imagery;
import spark.Request;
import spark.Response;

public class PostgresImagery implements Imagery {

    private JsonObject cleanSource(JsonObject sourceConfig) {
        if (sourceConfig.get("type").getAsString().equals("GeoServer")) {
            var cleanSource = new JsonObject();
            cleanSource.add("type", sourceConfig.get("type"));
            return cleanSource;
        } else if (sourceConfig.get("type").getAsString().equals("SecureWatch")) {
            var cleanSource = new JsonObject();
            cleanSource.add("type", sourceConfig.get("type"));
            cleanSource.add("startDate", sourceConfig.get("startDate"));
            cleanSource.add("endDate", sourceConfig.get("endDate"));
            return cleanSource;
        } else if (sourceConfig.get("type").getAsString().equals("Planet")) {
            var cleanSource = new JsonObject();
            cleanSource.add("type",  sourceConfig.get("type"));
            cleanSource.add("month", sourceConfig.get("month"));
            cleanSource.add("year",  sourceConfig.get("year"));
            return cleanSource;
        } else {
            return sourceConfig;
        }
    }

    private JsonArray buildImageryArray(ResultSet rs, Boolean stripConfig) {
        var imageryArray = new JsonArray();
        try {
            while(rs.next()) {
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
                newImagery.add("sourceConfig", stripConfig ? cleanSource(sourceConfig) : sourceConfig);
                imageryArray.add(newImagery);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return imageryArray;
    }

    public String getInstitutionImagery(Request req, Response res) {
        final var institutionId = Integer.parseInt(req.queryParams("institutionId"));
        final var userId        = getSessionUserId(req);

        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM select_imagery_by_institution(?, ?)")) {

            pstmt.setInt(1, institutionId);
            pstmt.setInt(2, userId);

            try (var rs = pstmt.executeQuery()) {
                return buildImageryArray(rs, !isInstAdminQuery(userId, institutionId)).toString();
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getProjectImagery(Request req, Response res) {
        final var projectId = req.queryParams("projectId");
        final var userId    = getSessionUserId(req);
        final var tokenKey  = req.session().attributes().contains("tokenKey")
                                ? req.session().attribute("tokenKey").toString()
                                : null;

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_imagery_by_project(?, ?, ?)")) {

            pstmt.setInt(1, Integer.parseInt(projectId));
            pstmt.setInt(2, userId);
            pstmt.setString(3, tokenKey);

            try (var rs = pstmt.executeQuery()) {
                return buildImageryArray(rs, true).toString();
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getPublicImagery(Request req, Response res) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_public_imagery()")) {

            try (var rs = pstmt.executeQuery()) {
                return buildImageryArray(rs, true).toString();
            }
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
            var addToAllProjects      = jsonInputs.has("addToAllProjects")
                                            ? jsonInputs.get("addToAllProjects").getAsBoolean()
                                            : true;

            try (var conn = connect();
                var pstmt = conn.prepareStatement(
                    "SELECT * FROM add_institution_imagery(?, ?, ?, ?, ?::JSONB, ?::JSONB)");
                var pstmt_add = conn.prepareStatement(
                    "SELECT * FROM add_imagery_to_all_institution_projects(?)")) {

                pstmt.setInt(1, institutionId);
                pstmt.setString(2, "private");
                pstmt.setString(3, imageryTitle);
                pstmt.setString(4, imageryAttribution);
                pstmt.setString(5, "null"); // no where to add extent in UI
                pstmt.setString(6, sourceConfig.toString());
                try (var rs = pstmt.executeQuery()) {
                    if (addToAllProjects && rs.next()) {
                        var imageryId = rs.getInt("add_institution_imagery");
                        pstmt_add.setInt(1, imageryId);
                        pstmt_add.execute();
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

    public String updateInstitutionImagery(Request req, Response res) {
        try {
            var jsonInputs            = parseJson(req.body()).getAsJsonObject();
            var imageryId             = jsonInputs.get("imageryId").getAsInt();
            var imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            var sourceConfig          = jsonInputs.get("sourceConfig").getAsJsonObject();
            var addToAllProjects      = jsonInputs.has("addToAllProjects")
                                            ? jsonInputs.get("addToAllProjects").getAsBoolean()
                                            : true;

            try (var conn = connect();
                var pstmt = conn.prepareStatement(
                    "SELECT * FROM update_institution_imagery(?, ?, ?, ?::JSONB)");
                var pstmt_add = conn.prepareStatement(
                    "SELECT * FROM add_imagery_to_all_institution_projects(?)")) {

                pstmt.setInt(1, imageryId);
                pstmt.setString(2, imageryTitle);
                pstmt.setString(3, imageryAttribution);
                pstmt.setString(4, sourceConfig.toString());
                pstmt.execute();

                if (addToAllProjects) {
                    pstmt_add.setInt(1, imageryId);
                    pstmt_add.execute();
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

    public String archiveInstitutionImagery(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var imageryId  = jsonInputs.get("imageryId").getAsString();

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM archive_imagery(?)")) {

            pstmt.setInt(1, Integer.parseInt(imageryId));
            pstmt.execute();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            res.status(409);
        }

        return "";
    }

}
