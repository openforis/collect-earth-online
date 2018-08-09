package org.openforis.ceo.postgres;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

import javax.servlet.MultipartConfigElement;

import java.sql.*;
import java.util.Optional;

import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;
import org.openforis.ceo.db_api.Institutions;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresInstitutions implements Institutions {
    private static final String url = "jdbc:postgresql://localhost";
    private static final String user = "ceo";
    private static final String password = "ceo";
    public String getAllInstitutions(Request req, Response res) {
        String SQL = "SELECT * FROM select_all_institutions()";

        try (Connection conn = connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {

            JsonArray institutionArray = new JsonArray();
            ResultSet rs = pstmt.executeQuery();
            while(rs.next()) {
                //create institution json to send back
                JsonObject newInstitution = new JsonObject();
                newInstitution.addProperty("id", rs.getInt("id"));
                newInstitution.addProperty("name", rs.getString("name"));
                newInstitution.addProperty("logo", rs.getString("logo"));
                newInstitution.addProperty("attribution", rs.getString("attribution"));
                newInstitution.addProperty("extent", rs.getObject("extent").toString());
                newInstitution.addProperty("sourceConfig", rs.getObject("source_config").toString());

                institutionArray.add(newInstitution);
            }
            return institutionArray.toString();

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

    private Optional<JsonObject> getInstitutionById(int institutionId) {
        String SQL = "SELECT * FROM select_all_institutions(?)";

        try (Connection conn = connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, institutionId);
            JsonObject newInstitution = new JsonObject();
            ResultSet rs = pstmt.executeQuery();
            rs.next();
                //create institution json to send back

            newInstitution.addProperty("id", rs.getInt("id"));
            newInstitution.addProperty("name", rs.getString("name"));
            newInstitution.addProperty("logo", rs.getString("logo"));
            newInstitution.addProperty("attribution", rs.getString("attribution"));
            newInstitution.addProperty("extent", rs.getObject("extent").toString());
            newInstitution.addProperty("sourceConfig", rs.getObject("source_config").toString());

            return Optional.of(newInstitution);

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return null;
    }

    public String getInstitutionDetails(Request req, Response res) {
        int institutionId = Integer.parseInt(req.params(":id"));
        Optional<JsonObject> matchingInstitution = getInstitutionById(institutionId);
        if (matchingInstitution.isPresent()) {
            return matchingInstitution.get().toString();
        } else {
            JsonObject noInstitutionFound = new JsonObject();
            noInstitutionFound.addProperty("id"         , -1);
            noInstitutionFound.addProperty("name"       , "No institution with ID=" + institutionId);
            noInstitutionFound.addProperty("logo"       , "");
            noInstitutionFound.addProperty("description", "");
            noInstitutionFound.addProperty("url"        , "");
            noInstitutionFound.addProperty("archived"   , false);
            noInstitutionFound.add("members"            , new JsonArray());
            noInstitutionFound.add("admins"             , new JsonArray());
            noInstitutionFound.add("pending"            , new JsonArray());
            return noInstitutionFound.toString();
        }
    }

    public String updateInstitution(Request req, Response res) {
        try {
            String institutionId = req.params(":id");

            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            int userid = Integer.parseInt(partToString(req.raw().getPart("userid")));
            String name = partToString(req.raw().getPart("institution-name"));
            String url = partToString(req.raw().getPart("institution-url"));
            String description = partToString(req.raw().getPart("institution-description"));
            String logoFileName = writeFilePart(req, "institution-logo", expandResourcePath("/public/img/institution-logos"), "institution-" + newInstitutionId);
            String logoPath = logoFileName != null ? "img/institution-logos/" + logoFileName : "";

            if (institutionId.equals("0")) {
                // NOTE: This branch creates a new institution

                String SQL = "SELECT * FROM add_institution(?, ?, ?, ?, ?)";

                try (Connection conn = this.connect();
                     PreparedStatement pstmt = conn.prepareStatement(SQL)) {
                    pstmt.setInt(1, userid);
                    pstmt.setString(2, name);
                    pstmt.setString(3, logoPath);
                    pstmt.setString(4, description);
                    pstmt.setString(5, url); //This is the extent
                    pstmt.setBoolean(6, false);
                    ResultSet rs = pstmt.executeQuery();
                    return "";
                } catch (SQLException e) {
                    System.out.println(e.getMessage());
                }


                return "";
            } else {
                // NOTE: This branch edits an existing institution
                String SQL = "SELECT * FROM update_institution(?, ?, ?, ?)";

                try (Connection conn = this.connect();
                     PreparedStatement pstmt = conn.prepareStatement(SQL)) {
                    pstmt.setInt(1, Integer.parseInt(institutionId));
                    pstmt.setString(2, name);
                    pstmt.setString(3, logoPath);
                    pstmt.setString(4, description);
                    pstmt.setString(5, url);
                    ResultSet rs = pstmt.executeQuery();
                    return "";
                } catch (SQLException e) {
                    System.out.println(e.getMessage());
                }


                return "";
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public String archiveInstitution(Request req, Response res) {
        String institutionId = req.params(":id");
        String SQL = "SELECT * FROM archive_institution(?)";

        try (Connection conn = this.connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(institutionId));
            ResultSet rs = pstmt.executeQuery();
            return "";
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
