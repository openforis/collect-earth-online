package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.mapJsonFile;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.util.Date;
import java.util.Optional;
import javax.servlet.MultipartConfigElement;
import org.openforis.ceo.db_api.Institutions;
import spark.Request;
import spark.Response;

public class JsonInstitutions implements Institutions {

    public String getAllInstitutions(Request req, Response res) {
        var institutions = readJsonFile("institution-list.json").getAsJsonArray();
        return filterJsonArray(institutions, institution -> institution.get("archived").getAsBoolean() == false).toString();
    }

    private static Optional<JsonObject> getInstitutionById(int institutionId) {
        var institutions = readJsonFile("institution-list.json").getAsJsonArray();
        return findInJsonArray(institutions, institution -> institution.get("id").getAsInt() == institutionId
                                                         && institution.get("archived").getAsBoolean() == false);
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

    public synchronized String updateInstitution(Request req, Response res) {
        try {
            var institutionId = req.params(":id");

            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            var userid = Integer.parseInt(partToString(req.raw().getPart("userid")));
            var name = partToString(req.raw().getPart("institution-name"));
            var url = partToString(req.raw().getPart("institution-url"));
            var description = partToString(req.raw().getPart("institution-description"));

            if (institutionId.equals("0")) {
                // NOTE: This branch creates a new institution

                // Read in the existing institution list
                var institutions = readJsonFile("institution-list.json").getAsJsonArray();

                // Generate a new institution id
                var newInstitutionId = getNextId(institutions);

                // Upload the logo image if one was provided
                var logoFileName = writeFilePart(req, "institution-logo", expandResourcePath("/public/img/institution-logos"), "institution-" + newInstitutionId);
                var logoPath = logoFileName != null ? "img/institution-logos/" + logoFileName : "";

                var members = new JsonArray();
                var admins = new JsonArray();
                var pending = new JsonArray();

                // Make the current user and the admin user (id=1) members and admins of the new institution
                members.add(1);
                admins.add(1);
                if (userid != 1) {
                    members.add(userid);
                    admins.add(userid);
                }

                var newInstitution = new JsonObject();
                newInstitution.addProperty("id", newInstitutionId);
                newInstitution.addProperty("name", name);
                newInstitution.addProperty("logo", logoPath);
                newInstitution.addProperty("description", description);
                newInstitution.addProperty("url", url);
                newInstitution.addProperty("archived", false);
                newInstitution.add("members", members);
                newInstitution.add("admins", admins);
                newInstitution.add("pending", pending);

                institutions.add(newInstitution);
                writeJsonFile("institution-list.json", institutions);

                return newInstitution.toString();
            } else {
                // NOTE: This branch edits an existing institution

                // Upload the logo image if one was provided
                var logoFileName = writeFilePart(req,
                                                 "institution-logo",
                                                 expandResourcePath("/public/img/institution-logos"),
                                                 "institution-" + institutionId);
                var logoPath = logoFileName != null ? "img/institution-logos/" + logoFileName : "";

                mapJsonFile("institution-list.json", institution -> {
                        if (institution.get("id").getAsString().equals(institutionId)) {
                            institution.addProperty("name", name);
                            institution.addProperty("url", url);
                            institution.addProperty("description", description);
                            if (logoFileName != null) {
                                institution.addProperty("logo", logoPath);
                            }
                            return institution;
                        } else {
                            return institution;
                        }
                    });

                var updatedInstitution = new JsonObject();
                updatedInstitution.addProperty("id", institutionId);
                updatedInstitution.addProperty("logo", logoPath.equals("") ? "" : logoPath + "?t=" + (new Date().toString()));
                return updatedInstitution.toString();
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public synchronized String archiveInstitution(Request req, Response res) {
        var institutionId = req.params(":id");

        mapJsonFile("institution-list.json",
                    institution -> {
                        if (institution.get("id").getAsString().equals(institutionId)) {
                            institution.addProperty("archived", true);
                            return institution;
                        } else {
                            return institution;
                        }
                    });

        return "";
    }

}
