package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.filterJsonFile;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

public class Imagery {

    public static String getAllImagery(Request req, Response res) {
        String institutionId = req.queryParams("institutionId");
        JsonArray imagery = readJsonFile("imagery-list.json").getAsJsonArray();
        if (institutionId.equals("") || institutionId.equals("0")) {
            return filterJsonArray(imagery,
                imageryEntry -> imageryEntry.get("institution").getAsString().equals("0")).toString();
        } else {
            return filterJsonArray(imagery,
                imageryEntry -> imageryEntry.get("institution").getAsString().equals("0")
                                || imageryEntry.get("institution").getAsString().equals(institutionId)).toString();
        }
    }

    public static synchronized String addInstitutionImagery(Request req, Response res) {
        try {
            JsonObject jsonInputs        = parseJson(req.body()).getAsJsonObject();
            int institutionId            = jsonInputs.get("institutionId").getAsInt();
            String imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            String imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            String geoserverURL          = jsonInputs.get("geoserverURL").getAsString();
            String layerName             = jsonInputs.get("layerName").getAsString();
            String geoserverParamsString = jsonInputs.get("geoserverParams").getAsString();
            JsonObject geoserverParams   = geoserverParamsString.equals("")
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
            sourceConfig.addProperty("geoserverUrl", geoserverURL);
            sourceConfig.add("geoserverParams", geoserverParams);

            // Create a new imagery object
            JsonObject newImagery = new JsonObject();
            newImagery.addProperty("id", newImageryId);
            newImagery.addProperty("institution", institutionId);
            newImagery.addProperty("title", imageryTitle);
            newImagery.addProperty("attribution", imageryAttribution);
            newImagery.add("extent", null);
            newImagery.add("sourceConfig", sourceConfig);

            // Write the new entry to imagery-list.json
            imagery.add(newImagery);
            writeJsonFile("imagery-list.json", imagery);

            return "";
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
    }

    public static synchronized String deleteInstitutionImagery(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String imageryId      = jsonInputs.get("imageryId").getAsString();
        String institutionId  = jsonInputs.get("institutionId").getAsString();

        filterJsonFile("imagery-list.json", imageryEntry -> !imageryEntry.get("id").getAsString().equals(imageryId));

        return "";
    }

}
