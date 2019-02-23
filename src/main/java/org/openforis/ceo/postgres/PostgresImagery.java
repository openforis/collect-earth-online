package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.SQLException;
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
            try(var rs = pstmt.executeQuery()) {
                while(rs.next()) {
                    //create imagery json to send back
                    var newImagery = new JsonObject();
                    newImagery.addProperty("id", rs.getInt("id"));
                    newImagery.addProperty("institution", rs.getInt("institution_id"));
                    newImagery.addProperty("visibility", rs.getString("visibility"));
                    newImagery.addProperty("title", rs.getString("title"));
                    newImagery.addProperty("attribution", rs.getString("attribution"));
                    newImagery.add("extent", rs.getString("extent") == null || rs.getString("extent").equals("null") 
                        ? null 
                        : parseJson(rs.getString("extent")).getAsJsonArray());
                    newImagery.add("sourceConfig", parseJson(rs.getString("source_config")).getAsJsonObject());

                    imageryArray.add(newImagery);
                }
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

            // Create a new source configuration for this imagery
            var sourceConfig = new JsonObject();
            sourceConfig.addProperty("type", "GeoServer");
            sourceConfig.addProperty("geoserverUrl", geoserverURL);
            sourceConfig.add("geoserverParams", geoserverParams);

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

    // FIXME: stub
    public String addGeoDashImagery(Request req, Response res) {
        return "";
    }

    // FIXME add check to validate the user has permission to delete
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
