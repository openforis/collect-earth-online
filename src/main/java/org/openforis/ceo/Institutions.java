package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Optional;
import java.util.stream.Collectors;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.Part;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.*;

public class Institutions {

    public static String getAllInstitutions(Request req, Response res) {
        JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
        String[] hiddenInstitutions = new String[]{"All Users", "Administrators"};
        JsonArray visibleInstitutions = filterJsonArray(institutions, institution ->
                                                        institution.get("archived").getAsBoolean() == false
                                                        && !Arrays.asList(hiddenInstitutions).contains(institution.get("name").getAsString()));
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

    private static String partToString(Part part) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(part.getInputStream()))) {
            return reader.lines().collect(Collectors.joining("\n"));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static synchronized String updateInstitution(Request req, Response res) {
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

                mapJsonFile("institution-list.json", institution -> {
                        if (institution.get("id").getAsString().equals(institutionId)) {
                            institution.addProperty("name", partToString(name));
                            institution.addProperty("logo", "img/institution-logos/" + logoFileNameFinal);
                            institution.addProperty("url", partToString(url));
                            institution.addProperty("description", partToString(description));
                            return institution;
                        } else {
                            return institution;
                        }
                    });

                return "img/institution-logos/" + logoFileNameFinal + "?m="
                    + Files.getLastModifiedTime((new File(imageDir, logoFileNameFinal)).toPath()).toString();
            } else {
                mapJsonFile("institution-list.json", institution -> {
                        if (institution.get("id").getAsString().equals(institutionId)) {
                            institution.addProperty("name", partToString(name));
                            institution.addProperty("url", partToString(url));
                            institution.addProperty("description", partToString(description));
                            return institution;
                        } else {
                            return institution;
                        }
                    });

                return "";
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static synchronized String archiveInstitution(Request req, Response res) {
        String institutionId = req.body();

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
