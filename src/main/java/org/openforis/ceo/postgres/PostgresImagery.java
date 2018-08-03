package org.openforis.ceo.postgres;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

import java.sql.*;
import java.util.UUID;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresImagery {
    private static final String url = "jdbc:postgresql://localhost";
    private static final String user = "ceo";
    private static final String password = "ceo";
    public static String getAllImagery(Request req, Response res) {
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
                newImagery.addProperty("id", Integer.toString(rs.getInt("id")));
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
            return "";
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
    }

    public synchronized String deleteInstitutionImagery(Request req, Response res) {


        return "";
    }

    //Returns a connection to the database
    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

}

