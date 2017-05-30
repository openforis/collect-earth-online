package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.Date;
import java.util.Optional;
import java.util.stream.Collectors;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.Part;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.expandResourcePath;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.getNextId;
import static org.openforis.ceo.JsonUtils.mapJsonFile;
import static org.openforis.ceo.JsonUtils.readJsonFile;
import static org.openforis.ceo.JsonUtils.writeJsonFile;

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

    private static String writeLogoImage(Part logo, String institutionId) {
        try {
            String logoFileName = logo.getSubmittedFileName();
            String logoFileType = logoFileName.substring(logoFileName.lastIndexOf(".") + 1);
            String logoFileNameFinal = "institution-" + institutionId + "." + logoFileType;
            logo.write(logoFileNameFinal);
            return "img/institution-logos/" + logoFileNameFinal;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static synchronized String updateInstitution(Request req, Response res) {
        try {
            String institutionId = req.params(":id");

            // FIXME: Will this work with Tomcat?
            if (req.raw().getAttribute("org.eclipse.jetty.multipartConfig") == null) {
                req.raw().setAttribute("org.eclipse.jetty.multipartConfig",
                                       new MultipartConfigElement(expandResourcePath("/public/img/institution-logos/")));
            }

            Part name = req.raw().getPart("institution-name");
            Part logo = req.raw().getPart("institution-logo");
            Part url = req.raw().getPart("institution-url");
            Part description = req.raw().getPart("institution-description");

            boolean uploadedLogo = logo.getSubmittedFileName() != null;

            if (institutionId.equals("0")) {
                // Create a new project
                JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
                String newInstitutionId = Integer.toString(getNextId(institutions));
                String logoPath = uploadedLogo ? writeLogoImage(logo, newInstitutionId) : "";

                JsonObject newInstitution = new JsonObject();
                newInstitution.addProperty("id", newInstitutionId);
                newInstitution.addProperty("name", partToString(name));
                newInstitution.addProperty("logo", logoPath);
                newInstitution.addProperty("url", partToString(url));
                newInstitution.addProperty("description", partToString(description));
                newInstitution.addProperty("archived", false);
                newInstitution.add("members", new JsonArray());

                institutions.add(newInstitution);
                writeJsonFile("institution-list.json", institutions);

                return newInstitution.toString();
            } else {
                // Edit an existing project
                String logoPath = uploadedLogo ? writeLogoImage(logo, institutionId) : "";

                mapJsonFile("institution-list.json", institution -> {
                        if (institution.get("id").getAsString().equals(institutionId)) {
                            institution.addProperty("name", partToString(name));
                            institution.addProperty("url", partToString(url));
                            institution.addProperty("description", partToString(description));
                            if (uploadedLogo) {
                                institution.addProperty("logo", logoPath);
                            }
                            return institution;
                        } else {
                            return institution;
                        }
                    });

                JsonObject updatedInstitution = new JsonObject();
                updatedInstitution.addProperty("id", institutionId);
                updatedInstitution.addProperty("logo", logoPath.equals("") ? "" : logoPath + "?t=" + (new Date().toString()));
                return updatedInstitution.toString();
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
