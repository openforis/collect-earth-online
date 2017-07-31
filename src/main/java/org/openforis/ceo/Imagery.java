package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.Optional;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.mapJsonFile;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.readJsonFile;

public class Imagery {

    public static String getAllImagery(Request req, Response res) {
        String institutionId = req.queryParams("institutionId");
        JsonArray imagery = readJsonFile("imagery-list.json").getAsJsonArray();
        if (institutionId.equals("")) {
            return imagery.toString();
        } else {
            JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
            Optional<JsonObject> matchingInstitution = findInJsonArray(institutions, institution -> institution.get("id").getAsString().equals(institutionId));
            if (matchingInstitution.isPresent()) {
                JsonObject institution = matchingInstitution.get();
                JsonArray institutionImagery = institution.getAsJsonArray("imagery");
                return filterJsonArray(imagery, imageryEntry -> institutionImagery.contains(imageryEntry.get("id"))).toString();
            } else {
                return (new JsonArray()).toString();
            }
        }
    }

    public static synchronized String deleteInstitutionImagery(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String institutionId = jsonInputs.get("institutionId").getAsString();
        JsonElement imageryId = jsonInputs.get("imageryId");

        mapJsonFile("institution-list.json",
                    institution -> {
                        if (institution.get("id").getAsString().equals(institutionId)) {
                            JsonArray imagery = institution.getAsJsonArray("imagery");
                            if (imagery.contains(imageryId)) {
                                imagery.remove(imageryId);
                            }
                            return institution;
                        } else {
                            return institution;
                        }

                    });

        return "";
    }

}
