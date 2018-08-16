package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import javax.servlet.MultipartConfigElement;
import org.openforis.ceo.db_api.Institutions;
import spark.Request;
import spark.Response;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresInstitutions implements Institutions {
    public String getAllInstitutions(Request req, Response res) {
        var SQL = "SELECT * FROM select_all_institutions()";

        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {

            var institutionArray = new JsonArray();
            var rs = pstmt.executeQuery();
            while(rs.next()) {
                //create institution json to send back
                var newInstitution = new JsonObject();
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
        var SQL = "SELECT * FROM select_all_institutions(?)";

        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, institutionId);
            var newInstitution = new JsonObject();
            var rs = pstmt.executeQuery();
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
        var institutionId = Integer.parseInt(req.params(":id"));
        var matchingInstitution = getInstitutionById(institutionId);
        if (matchingInstitution.isPresent()) {
            return matchingInstitution.get().toString();
        } else {
            var noInstitutionFound = new JsonObject();
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
            var institutionId = req.params(":id");

            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            var userid = Integer.parseInt(partToString(req.raw().getPart("userid")));
            var name = partToString(req.raw().getPart("institution-name"));
            var url = partToString(req.raw().getPart("institution-url"));
            var description = partToString(req.raw().getPart("institution-description"));

            var newInstitutionId = 0;
            var logoFileName = writeFilePart(req, "institution-logo", expandResourcePath("/public/img/institution-logos"), "institution-" + newInstitutionId);
            var logoPath = logoFileName != null ? "img/institution-logos/" + logoFileName : "";

            if (institutionId.equals("0")) {
                // NOTE: This branch creates a new institution

                var SQL = "SELECT * FROM add_institution(?, ?, ?, ?, ?)";

                try (var conn = connect();
                     var pstmt = conn.prepareStatement(SQL)) {
                    pstmt.setInt(1, userid);
                    pstmt.setString(2, name);
                    pstmt.setString(3, logoPath);
                    pstmt.setString(4, description);
                    pstmt.setString(5, url); //This is the extent
                    pstmt.setBoolean(6, false);
                    var rs = pstmt.executeQuery();
                    return "";
                } catch (SQLException e) {
                    System.out.println(e.getMessage());
                }

                return "";
            } else {
                // NOTE: This branch edits an existing institution
                var SQL = "SELECT * FROM update_institution(?, ?, ?, ?)";

                try (var conn = connect();
                     var pstmt = conn.prepareStatement(SQL)) {
                    pstmt.setInt(1, Integer.parseInt(institutionId));
                    pstmt.setString(2, name);
                    pstmt.setString(3, logoPath);
                    pstmt.setString(4, description);
                    pstmt.setString(5, url);
                    var rs = pstmt.executeQuery();
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
        var institutionId = req.params(":id");
        var SQL = "SELECT * FROM archive_institution(?)";

        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, Integer.parseInt(institutionId));
            var rs = pstmt.executeQuery();
            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

}
