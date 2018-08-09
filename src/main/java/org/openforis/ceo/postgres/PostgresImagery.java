package org.openforis.ceo.postgres;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

import java.sql.*;
import java.util.UUID;

import org.openforis.ceo.db_api.Imagery;
import static org.openforis.ceo.utils.JsonUtils.parseJson;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresImagery implements Imagery {
    private static final String url = "jdbc:postgresql://localhost";
    private static final String user = "ceo";
    private static final String password = "ceo";
    public String getAllImagery(Request req, Response res) {
        String institutionId = req.queryParams("institutionId");
        String SQL = "";
        boolean hasInstitutionId = false;
        if (institutionId == null || institutionId.isEmpty()) {
            SQL = "SELECT * FROM select_public_imagery()";
        } else {
            SQL = "SELECT * FROM select_public_imagery_by_institution(?)";
            hasInstitutionId = true;
        }
        try (Connection conn = connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            if(hasInstitutionId) {
                pstmt.setInt(1, Integer.parseInt(institutionId));
            }
            JsonArray imageryArray = new JsonArray();
            ResultSet rs = pstmt.executeQuery();
            while(rs.next()) {
                //create imagery json to send back
                JsonObject newImagery = new JsonObject();
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
            JsonObject jsonInputs        = parseJson(req.body()).getAsJsonObject();
            int institutionId            = jsonInputs.get("institutionId").getAsInt();
            String imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            String imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            String geoserverURL          = jsonInputs.get("geoserverURL").getAsString();
            String layerName             = jsonInputs.get("layerName").getAsString();
            String geoserverParamsString = jsonInputs.get("geoserverParams").getAsString();
            JsonObject geoserverParams   = geoserverParamsString.equals("")
                    ? new JsonObject()
                    : parseJson(geoserverParamsString).getAsJsonObject();

            // Add layerName to geoserverParams
            geoserverParams.addProperty("LAYERS", layerName);
            JsonObject sourceConfig = new JsonObject();
            sourceConfig.addProperty("type", "GeoServer");
            sourceConfig.addProperty("geoserverUrl", geoserverURL);
            sourceConfig.add("geoserverParams", geoserverParams);

            String SQL = "SELECT * FROM add_project_widget(?, ?, ?, ?, ?::JSONB, ?::JSONB)";

            try (Connection conn = this.connect();
                 PreparedStatement pstmt = conn.prepareStatement(SQL)) {
                pstmt.setInt(1, institutionId);
                pstmt.setString(2, "private");
                pstmt.setString(3, imageryTitle);
                pstmt.setString(4, imageryAttribution);
                pstmt.setString(5, ""); //This is the extent
                pstmt.setString(6, sourceConfig.toString());
                ResultSet rs = pstmt.executeQuery();
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
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String imageryId      = jsonInputs.get("imageryId").getAsString();
        String SQL = "SELECT * FROM delete_imagery(?)";

        try (Connection conn = this.connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(imageryId));
            ResultSet rs = pstmt.executeQuery();
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

