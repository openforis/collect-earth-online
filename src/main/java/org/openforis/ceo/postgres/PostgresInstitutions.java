package org.openforis.ceo.postgres;

import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

import javax.servlet.MultipartConfigElement;

import java.util.Optional;

import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresInstitutions {
    public String getAllInstitutions(Request req, Response res) {

        return "";
    }

    private Optional<JsonObject> getInstitutionById(int institutionId) {

        return null;
    }

    public String getInstitutionDetails(Request req, Response res) {
        int institutionId = Integer.parseInt(req.params(":id"));
        return "";
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

            if (institutionId.equals("0")) {
                // NOTE: This branch creates a new institution

                // Read in the existing institution list


                return "";
            } else {
                // NOTE: This branch edits an existing institution

                // Upload the logo image if one was provided
                String logoFileName = writeFilePart(req, "institution-logo", expandResourcePath("/public/img/institution-logos"), "institution-" + institutionId);
                String logoPath = logoFileName != null ? "img/institution-logos/" + logoFileName : "";

                return "";
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public String archiveInstitution(Request req, Response res) {
        String institutionId = req.params(":id");

        return "";
    }

}
