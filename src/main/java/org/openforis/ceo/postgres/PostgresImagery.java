package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.JsonUtils.parseJson;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.openforis.ceo.db_api.Imagery;
import spark.Request;
import spark.Response;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresImagery implements Imagery {
    private static final String url = "jdbc:postgresql://localhost";
    private static final String user = "ceo";
    private static final String password = "ceo";

    public String getAllImagery(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");
        var SQL = "";
        var hasInstitutionId = false;

        if (institutionId == null || institutionId.isEmpty()) {
            SQL = "SELECT * FROM select_public_imagery()";
        } else {
            SQL = "SELECT * FROM select_public_imagery_by_institution(?)";
            hasInstitutionId = true;
        }
        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            if(hasInstitutionId) {
                pstmt.setInt(1, Integer.parseInt(institutionId));
            }
            var imageryArray = new JsonArray();
            var rs = pstmt.executeQuery();
            while(rs.next()) {
                //create imagery json to send back
                var newImagery = new JsonObject();
                newImagery.addProperty("id", rs.getInt("id"));
                newImagery.addProperty("visibility", rs.getString("visibility"));
                newImagery.addProperty("title", rs.getString("title"));
                newImagery.addProperty("attribution", rs.getString("attribution"));
                newImagery.addProperty("extent", rs.getObject("extent").toString());
                newImagery.addProperty("sourceConfig", rs.getObject("source_config").toString());

                imageryArray.add(newImagery);
            }
            return imageryArray.toString();

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return "";
    }

    public String addInstitutionImagery(Request req, Response res) {
        try {
            var jsonInputs            = parseJson(req.body()).getAsJsonObject();
            var institutionId         = jsonInputs.get("institutionId").getAsInt();
            var imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            var geoserverURL          = jsonInputs.get("geoserverURL").getAsString();
            var layerName             = jsonInputs.get("layerName").getAsString();
            var geoserverParamsString = jsonInputs.get("geoserverParams").getAsString();
            var geoserverParams       = geoserverParamsString.equals("")
                                            ? new JsonObject()
                                            : parseJson(geoserverParamsString).getAsJsonObject();

            // Add layerName to geoserverParams
            geoserverParams.addProperty("LAYERS", layerName);
            var sourceConfig = new JsonObject();
            sourceConfig.addProperty("type", "GeoServer");
            sourceConfig.addProperty("geoserverUrl", geoserverURL);
            sourceConfig.add("geoserverParams", geoserverParams);

            var SQL = "SELECT * FROM add_project_widget(?, ?, ?, ?, ?::JSONB, ?::JSONB)";

            try (var conn = this.connect();
                 var pstmt = conn.prepareStatement(SQL)) {
                pstmt.setInt(1, institutionId);
                pstmt.setString(2, "private");
                pstmt.setString(3, imageryTitle);
                pstmt.setString(4, imageryAttribution);
                pstmt.setString(5, ""); //This is the extent
                pstmt.setString(6, sourceConfig.toString());
                var rs = pstmt.executeQuery();
                return "";
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }

            return "";
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
    }

    public synchronized String deleteInstitutionImagery(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var imageryId = jsonInputs.get("imageryId").getAsString();
        var SQL = "SELECT * FROM delete_imagery(?)";

        try (var conn = this.connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(imageryId));
            var rs = pstmt.executeQuery();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return "";
    }

    //Returns a connection to the database
    private Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

}

