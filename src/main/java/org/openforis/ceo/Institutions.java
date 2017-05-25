package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.io.File;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Optional;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.Part;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.*;

public class Institutions {

    public static String getAllInstitutions(Request req, Response res) {
        JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
        String[] hiddenInstitutions = new String[]{"All Users", "Administrators"};
        JsonArray visibleInstitutions = filterJsonArray(institutions, institution -> !Arrays.asList(hiddenInstitutions).contains(institution.get("name").getAsString()));
        return visibleInstitutions.toString();
    }

    private static Optional<JsonObject> getInstitutionById(int institutionId) {
        JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
        return findInJsonArray(institutions, institution -> institution.get("id").getAsInt() == institutionId);
    }

    public static String getInstitutionDetails(Request req, Response res) {
        int institutionId = Integer.parseInt(req.body());
        Optional<JsonObject> matchingInstitution = getInstitutionById(institutionId);
        if (matchingInstitution.isPresent()) {
            return matchingInstitution.get().toString();
        } else {
            JsonObject noInstitutionFound = new JsonObject();
            noInstitutionFound.addProperty("id", "-1");
            noInstitutionFound.addProperty("name", "No institution with ID=" + institutionId);
            noInstitutionFound.addProperty("logo", "");
            noInstitutionFound.addProperty("url", "");
            noInstitutionFound.addProperty("description", "");
            return noInstitutionFound.toString();
        }
    }

    public static String updateInstitution(Request req, Response res) {
        try {
            String institutionId = req.params(":id");
            String imageDir = expandResourcePath("/public/img/institution-logos/");

            // FIXME: Will this work with Tomcat?
            if (req.raw().getAttribute("org.eclipse.jetty.multipartConfig") == null) {
                MultipartConfigElement multipartConfigElement = new MultipartConfigElement(imageDir);
                req.raw().setAttribute("org.eclipse.jetty.multipartConfig", multipartConfigElement);
            }

            Part name = req.raw().getPart("institution-name");
            Part logo = req.raw().getPart("institution-logo");
            Part url = req.raw().getPart("institution-url");
            Part description = req.raw().getPart("institution-description");

            if (logo.getSubmittedFileName() != null) {
                String logoFileName = logo.getSubmittedFileName();
                String logoFileType = logoFileName.substring(logoFileName.lastIndexOf(".") + 1);
                String logoFileNameFinal = "institution-" + institutionId + "." + logoFileType;
                logo.write(logoFileNameFinal);
                String lastModified = Files.getLastModifiedTime((new File(imageDir, logoFileNameFinal)).toPath()).toString();
                return "img/institution-logos/" + logoFileNameFinal + "?m=" + lastModified;
            } else {
                return "";
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}
