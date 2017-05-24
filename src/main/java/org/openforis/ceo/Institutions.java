package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.util.Arrays;
import java.util.Optional;
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

}
