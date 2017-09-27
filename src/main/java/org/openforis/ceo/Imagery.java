package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.getNextId;
import static org.openforis.ceo.JsonUtils.mapJsonFile;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.readJsonFile;
import static org.openforis.ceo.JsonUtils.writeJsonFile;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.Optional;
import spark.Request;
import spark.Response;

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

    public static synchronized String addInstitutionImagery(Request req, Response res) {
        try {
            JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
            String institutionId = jsonInputs.get("institutionId").getAsString();
            String imageryTitle = jsonInputs.get("imageryTitle").getAsString();
            String imageryAttribution = jsonInputs.get("imageryAttribution").getAsString();
            String geoserverURL = jsonInputs.get("geoserverURL").getAsString();
            String layerName = jsonInputs.get("layerName").getAsString();
            String geoserverParamsString = jsonInputs.get("geoserverParams").getAsString();
            JsonObject geoserverParams = geoserverParamsString.equals("")
                                         ? new JsonObject()
                                         : parseJson(geoserverParamsString).getAsJsonObject();

            // Add layerName to geoserverParams
            geoserverParams.addProperty("LAYERS", layerName);

            // Read in the existing imagery list
            JsonArray imagery = readJsonFile("imagery-list.json").getAsJsonArray();

            // Generate a new imagery id
            int newImageryId = getNextId(imagery);

            // Create a new source configuration for this imagery
            JsonObject sourceConfig = new JsonObject();
            sourceConfig.addProperty("type", "GeoServer");
            sourceConfig.addProperty("geoserver_url", geoserverURL);
            sourceConfig.add("geoserver_params", geoserverParams);

            // Create a new imagery object
            JsonObject newImagery = new JsonObject();
            newImagery.addProperty("id", newImageryId);
            newImagery.addProperty("title", imageryTitle);
            newImagery.addProperty("attribution", imageryAttribution);
            newImagery.add("extent", null);
            newImagery.add("source_config", sourceConfig);

            // Write the new entry to imagery-list.json
            imagery.add(newImagery);
            writeJsonFile("imagery-list.json", imagery);

            // Add newImageryId to the selected institution's imagery list
            mapJsonFile("institution-list.json",
                        institution -> {
                            if (institution.get("id").getAsString().equals(institutionId)) {
                                JsonArray imageryList = institution.getAsJsonArray("imagery");
                                imageryList.add(newImageryId);
                                return institution;
                            } else {
                                return institution;
                            }
                        });

            return "";
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
    }

}
