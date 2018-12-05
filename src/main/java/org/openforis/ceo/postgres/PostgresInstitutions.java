package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.util.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.servlet.MultipartConfigElement;
import org.openforis.ceo.db_api.Institutions;
import spark.Request;
import spark.Response;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresInstitutions implements Institutions {

    private static JsonObject buildInstitutionJson( ResultSet rs) {
        var newInstitution = new JsonObject();
        try {
            newInstitution.addProperty("id", rs.getInt("id"));
            newInstitution.addProperty("name", rs.getString("name"));
            newInstitution.addProperty("logo", rs.getString("logo"));
            newInstitution.addProperty("description", rs.getString("description"));
            newInstitution.addProperty("url", rs.getObject("url").toString());
            newInstitution.addProperty("archived", rs.getObject("archived").toString());
            newInstitution.add("members", parseJson(rs.getString("members")).getAsJsonArray());
            newInstitution.add("admins", parseJson(rs.getString("admins")).getAsJsonArray());
            newInstitution.add("pending", parseJson(rs.getString("pending")).getAsJsonArray());
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return newInstitution;
    }


    public String getAllInstitutions(Request req, Response res) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_all_institutions()");
             var rs = pstmt.executeQuery()) {

            var institutionArray = new JsonArray();
            while(rs.next()) {
                //create institution json to send back
                institutionArray.add(buildInstitutionJson(rs));
            }
            
            return institutionArray.toString();

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

    public static String getInstitutionById(Integer instId) {
        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM select_institution_by_id(?)")) {

            pstmt.setInt(1, instId);
            var newInstitution = new JsonObject();
            try(var rs = pstmt.executeQuery()){
                if(rs.next()) {
                    //create institution json to send back
                    return buildInstitutionJson(rs).toString();
                } else {
                    // create a blank institution json to send back
                    newInstitution.addProperty("id"         , -1);
                    newInstitution.addProperty("name"       , "No institution with ID=" + instId);
                    newInstitution.addProperty("logo"       , "");
                    newInstitution.addProperty("description", "");
                    newInstitution.addProperty("url"        , "");
                    newInstitution.add("members"            , parseJson("[]").getAsJsonArray());
                    newInstitution.add("admins"             , parseJson("[]").getAsJsonArray());
                    newInstitution.add("pending"            , parseJson("[]").getAsJsonArray());
                    newInstitution.addProperty("archived"   , false);
                    return newInstitution.toString();
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

    public String getInstitutionDetails(Request req, Response res) {
        var institutionId = Integer.parseInt(req.params(":id"));
        return getInstitutionById(institutionId);
    }
    
    public String updateInstitution(Request req, Response res) {
        try {
            var institutionId = req.params(":id");
            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            var userid =        Integer.parseInt(partToString(req.raw().getPart("userid")));
            var name =          partToString(req.raw().getPart("institution-name"));
            var url =           partToString(req.raw().getPart("institution-url"));
            var description =   partToString(req.raw().getPart("institution-description"));

            if (institutionId.equals("0")) {
                // NOTE: This branch creates a new institution
                try (var conn = connect();
                     var pstmt = conn.prepareStatement("SELECT * FROM add_institution( ?, ?, ?, ?, ?)")) {

                    pstmt.setString(1, name);
                    pstmt.setString(2, "");
                    pstmt.setString(3, description);
                    pstmt.setString(4, url);
                    pstmt.setBoolean(5, false);
                    try(var rs = pstmt.executeQuery()){
                        if (rs.next()) {
                            var newInstitutionId = rs.getInt("add_institution");
                            var logoFileName = writeFilePart(req,
                                    "institution-logo",
                                    expandResourcePath("/public/img/institution-logos"),
                                    "institution-" + newInstitutionId);
                            var logoPath = logoFileName != null ? "img/institution-logos/" + logoFileName : "";
                            
                            try(var logoPstmt = conn.prepareStatement("SELECT * FROM update_institution_logo(?,?)")){
                                logoPstmt.setInt(1, newInstitutionId);
                                logoPstmt.setString(2, logoPath);
                                logoPstmt.executeQuery();
                            }
                            
                            // add user and default admin to group
                            try(var userPstmt = conn.prepareStatement("SELECT * FROM add_institution_user(?,?,?)")){
                                userPstmt.setInt(1,newInstitutionId);
                                userPstmt.setInt(2,userid);
                                userPstmt.setInt(3,1);
                                userPstmt.execute();
                            }

                            try(var adminPstmt = conn.prepareStatement("SELECT * FROM add_institution_user(?,?,?)")){
                                adminPstmt.setInt(1,newInstitutionId);
                                adminPstmt.setInt(2,1);
                                adminPstmt.setInt(3,1);
                                adminPstmt.execute();
                            }
    
                            return getInstitutionById(newInstitutionId);
                        }
                    }
                } catch (SQLException e) {
                    System.out.println(e.getMessage());
                }

                return "";
            } else {
                // NOTE: This branch edits an existing institution

                
                try (var conn = connect(); 
                     var pstmt = conn.prepareStatement("SELECT * FROM select_institution_by_id(?)")) {

                    pstmt.setInt(1, Integer.parseInt(institutionId));
                    try(var rs = pstmt.executeQuery()){
                        if (rs.next()) {
                            var logoPath = rs.getString("logo");
                            var logodata = partToString(req.raw().getPart("institution-logo"));
                            if (!logodata.equals("null") && logodata.length() > 0) {
                                var logoFileName = writeFilePart(req,
                                                                "institution-logo",
                                                                expandResourcePath("/public/img/institution-logos"),
                                                                "institution-" + institutionId);
                                logoPath = logoFileName != null ? "img/institution-logos/" + logoFileName : "";
                            }
                            try(var updatePstmt = 
                                 conn.prepareStatement("SELECT * FROM update_institution(?, ?, ?, ?, ?)")){
                                updatePstmt.setInt(1, Integer.parseInt(institutionId));
                                updatePstmt.setString(2, name);
                                updatePstmt.setString(3, logoPath);
                                updatePstmt.setString(4, description);
                                updatePstmt.setString(5, url);
                                updatePstmt.execute();
                            }

                            var updatedInstitution = new JsonObject();
                            updatedInstitution.addProperty("id", institutionId);
                            updatedInstitution.addProperty("logo", logoPath.equals("") ? "" : logoPath + "?t=" + (new Date().toString()));
                            return updatedInstitution.toString();
                        }
                    }
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
        var institutionId = Integer.parseInt(req.params(":id"));
        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM archive_institution(?)")) {
                
            pstmt.setInt(1, institutionId);
            pstmt.execute();
            return getInstitutionById(institutionId);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

}
