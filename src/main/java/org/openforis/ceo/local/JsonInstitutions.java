package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.elementToArray;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.getBodyParam;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonFile;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;
import static org.openforis.ceo.utils.PartUtils.writeFilePartBase64;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.time.LocalDate;
import java.util.Date;
import java.util.Optional;
import org.openforis.ceo.db_api.Institutions;
import spark.Request;
import spark.Response;

public class JsonInstitutions implements Institutions {

    public static Boolean isInstitutionAdmin(String userId, Integer institutionId) {
        var matchingInstitution = getInstitutionById(institutionId);
        if (matchingInstitution.isPresent()) {
            final var institution = matchingInstitution.get();
            final var admins = institution.has("admins") ? institution.get("admins").getAsJsonArray() : new JsonArray();
            final var archived = institution.has("archived") ? institution.get("archived").getAsBoolean() : true;
            return admins.contains(parseJson(userId)) && !archived;
        } else {
            return false;
        }
    }

    public Boolean isInstAdmin(Request req) {
        final var userId = req.session().attributes().contains("userid") ? req.session().attribute("userid").toString() : "-1";
        final var qInstitutionId = req.queryParams("institutionId");
        final var jInstitutionId = getBodyParam(req.body(), "institutionId", null);

        final var institutionId =
            qInstitutionId != null ? Integer.parseInt(qInstitutionId)
            : jInstitutionId != null ? Integer.parseInt(jInstitutionId)
            : 0;

        return isInstitutionAdmin(userId, institutionId);
    }

    public static Boolean isProjectAdmin(Integer userId, Integer projectId) {
        final var projects = readJsonFile("project-list.json").getAsJsonArray();
        final var matchedProject = findInJsonArray(projects, project -> project.get("id").getAsInt() == projectId);
        if (matchedProject.isPresent()) {
            final var institutionId = matchedProject.get().get("institution").getAsInt();
            return isInstitutionAdmin(userId.toString(), institutionId);
        } else {
            return false;
        }
    }

    public static Boolean isGlobalAdmin(Integer userId) {
        final var users = readJsonFile("user-list.json").getAsJsonArray();
        final var matchedUser = findInJsonArray(users, user -> user.get("id").getAsInt() == userId);
        return matchedUser.isPresent() && matchedUser.get().get("role").equals("admin");
    }

    public String getAllInstitutions(Request req, Response res) {
        var institutions = elementToArray(readJsonFile("institution-list.json"));
        return filterJsonArray(institutions, institution -> institution.get("archived").getAsBoolean() == false).toString();
    }

    private static Optional<JsonObject> getInstitutionById(int institutionId) {
        var institutions = elementToArray(readJsonFile("institution-list.json"));
        return findInJsonArray(institutions, institution -> institution.get("id").getAsInt() == institutionId
                                                         && institution.get("archived").getAsBoolean() == false);
    }

    public String getInstitutionDetails(Request req, Response res) {
        var institutionId = Integer.parseInt(req.queryParams("institutionId"));
        var matchingInstitution = getInstitutionById(institutionId);
        if (matchingInstitution.isPresent()) {
            var institutionObject = matchingInstitution.get();
            institutionObject.addProperty("logo", institutionObject.get("logo").getAsString() + "?t=" + (new Date().toString()));
            return institutionObject.toString();
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

    public synchronized String createInstitution(Request req, Response res) {
        try {
            final var jsonInputs = parseJson(req.body()).getAsJsonObject();
            final var userId = jsonInputs.get("userId").getAsInt();
            final var name = jsonInputs.get("name").getAsString();
            final var url = jsonInputs.get("url").getAsString();
            final var logo = jsonInputs.get("logo").getAsString();
            final var base64Image = jsonInputs.get("base64Image").getAsString();
            final var description = jsonInputs.get("description").getAsString();

            // Read in the existing institution list
            var institutions = elementToArray(readJsonFile("institution-list.json"));

            // Generate a new institution id
            final var newInstitutionId = getNextId(institutions);
            // Upload the logo image if one was provided
            final var logoFileName = !logo.equals("")
                                    ? writeFilePartBase64(
                                            logo,
                                            base64Image,
                                            expandResourcePath("/public/img/institution-logos"),
                                            "institution-" + newInstitutionId
                                        )
                                    : null;

            var members = new JsonArray();
            var admins = new JsonArray();
            var pending = new JsonArray();

            // Make the current user and the admin user (id=1) members and admins of the new institution
            members.add(1);
            admins.add(1);
            if (userId != 1) {
                members.add(userId);
                admins.add(userId);
            }

            var newInstitution = new JsonObject();
            newInstitution.addProperty("id", newInstitutionId);
            newInstitution.addProperty("name", name);
            newInstitution.addProperty("logo", logoFileName != null
                                                ? "img/institution-logos/" + logoFileName
                                                : "");
            newInstitution.addProperty("description", description);
            newInstitution.addProperty("url", url);
            newInstitution.addProperty("archived", false);
            newInstitution.add("members", members);
            newInstitution.add("admins", admins);
            newInstitution.add("pending", pending);

            institutions.add(newInstitution);
            writeJsonFile("institution-list.json", institutions);

            return newInstitutionId + "";
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public String updateInstitution(Request req, Response res) {
        try {
            final var institutionId = req.queryParams("institutionId");

            final var jsonInputs = parseJson(req.body()).getAsJsonObject();
            final var name = jsonInputs.get("name").getAsString();
            final var url = jsonInputs.get("url").getAsString();
            final var logo = jsonInputs.get("logo").getAsString();
            final var base64Image = jsonInputs.get("base64Image").getAsString();
            final var description = jsonInputs.get("description").getAsString();

            // Upload the logo image if one was provided
            final var logoFileName = !logo.equals("")
                                    ? writeFilePartBase64(
                                            logo,
                                            base64Image,
                                            expandResourcePath("/public/img/institution-logos"),
                                            "institution-" + institutionId
                                        )
                                    : null;

            mapJsonFile("institution-list.json", institution -> {
                    if (institution.get("id").getAsString().equals(institutionId)) {
                        institution.addProperty("name", name);
                        institution.addProperty("url", url);
                        institution.addProperty("description", description);
                        institution.addProperty("logo", logoFileName != null
                                                        ? "img/institution-logos/" + logoFileName
                                                        : institution.get("logo").getAsString());
                        return institution;
                    } else {
                        return institution;
                    }
                });

            return institutionId + "";

        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public String archiveInstitution(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");

        mapJsonFile("project-list.json",
                    project -> {
                        if (project.get("institution").getAsString().equals(institutionId)) {
                            project.addProperty("availability", "archived");
                            project.addProperty("archived_date", LocalDate.now().toString());
                            project.addProperty("archived", true);
                            return project;
                        } else {
                            return project;
                        }
                    });

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
