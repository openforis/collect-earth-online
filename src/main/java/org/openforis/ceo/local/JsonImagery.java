package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.filterJsonFile;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;

import com.google.gson.JsonObject;
import org.openforis.ceo.db_api.Imagery;
import spark.Request;
import spark.Response;

public class JsonImagery implements Imagery {

    public String getAllImagery(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");
        var imageryList = readJsonFile("imagery-list.json").getAsJsonArray();
        if (institutionId == null || institutionId.isEmpty()) {
            return filterJsonArray(imageryList,
                                   imagery -> imagery.get("visibility").getAsString().equals("public")).toString();
        } else {
            return filterJsonArray(imageryList,
                                   imagery -> imagery.get("visibility").getAsString().equals("public")
                                           || imagery.get("institution").getAsString().equals(institutionId)).toString();
        }
    }

    public static String getImageryTitle(String id) {
        var imageryList = readJsonFile("imagery-list.json").getAsJsonArray();

        var matchingImagery = filterJsonArray(imageryList,
                                imagery -> imagery.get("id").getAsString().equals(id));
        return matchingImagery.get(0).getAsJsonObject().get("title").getAsString();
        
    }

    public synchronized String addInstitutionImagery(Request req, Response res) {
        try {
            var jsonInputs            = parseJson(req.body()).getAsJsonObject();
            var institutionId         = jsonInputs.get("institutionId").getAsInt();
            var imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            var geoserverURL          = jsonInputs.get("geoserverURL").getAsString();
            var layerName             = jsonInputs.get("layerName").getAsString();
            var geoserverParamsString = jsonInputs.get("geoserverParams").getAsString();
            var geoserverParams       = geoserverParamsString.equals("")
                                            ? new JsonObject()
                                            : parseJson(geoserverParamsString).getAsJsonObject();

            // Add layerName to geoserverParams
            geoserverParams.addProperty("LAYERS", layerName);

            // Read in the existing imagery list
            var imageryList = readJsonFile("imagery-list.json").getAsJsonArray();

            // Generate a new imagery id
            var newImageryId = getNextId(imageryList);

            // Create a new source configuration for this imagery
            var sourceConfig = new JsonObject();
            sourceConfig.addProperty("type", "GeoServer");
            sourceConfig.addProperty("geoserverUrl", geoserverURL);
            sourceConfig.add("geoserverParams", geoserverParams);

            // Create a new imagery object
            var newImagery = new JsonObject();
            newImagery.addProperty("id", newImageryId);
            newImagery.addProperty("institution", institutionId);
            newImagery.addProperty("visibility", "private");
            newImagery.addProperty("title", imageryTitle);
            newImagery.addProperty("attribution", imageryAttribution);
            newImagery.add("extent", null);
            newImagery.add("sourceConfig", sourceConfig);

            // Write the new entry to imagery-list.json
            imageryList.add(newImagery);
            writeJsonFile("imagery-list.json", imageryList);

            return "";
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
    }

    public String addGeoDashImagery(Request req, Response res) {
        try {
            var jsonInputs         = parseJson(req.body()).getAsJsonObject();
            var institutionId      = jsonInputs.get("institutionId").getAsInt();
            var imageryTitle       = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution = jsonInputs.get("imageryAttribution").getAsString();
            var geeUrl             = jsonInputs.get("geeUrl").getAsString();
            var geeParams          = jsonInputs.get("geeParams").getAsJsonObject();

            // Read in the existing imagery list
            var imageryList = readJsonFile("imagery-list.json").getAsJsonArray();

            // Check to see if this imagery has already been added to this institution
            var matchingImagery = findInJsonArray(imageryList, imagery -> imagery.get("title").getAsString().equals(imageryTitle));

            if (matchingImagery.isPresent()) {
                var imagery = matchingImagery.get();

                if (imagery.get("institution").getAsInt() == institutionId) {
                    // This imagery has already been added to this institution
                    return "";
                } else {
                    // Generate a new imagery id
                    var newImageryId = getNextId(imageryList);

                    // Create a new source configuration for this imagery
                    var sourceConfig = new JsonObject();
                    sourceConfig.addProperty("type", "GeeGateway");
                    sourceConfig.addProperty("geeUrl", geeUrl);
                    sourceConfig.add("geeParams", geeParams);

                    // Create a new imagery object
                    var newImagery = new JsonObject();
                    newImagery.addProperty("id", newImageryId);
                    newImagery.addProperty("institution", institutionId);
                    newImagery.addProperty("visibility", "private");
                    newImagery.addProperty("title", imageryTitle);
                    newImagery.addProperty("attribution", imageryAttribution);
                    newImagery.add("extent", null);
                    newImagery.add("sourceConfig", sourceConfig);

                    // Write the new entry to imagery-list.json
                    imageryList.add(newImagery);
                    writeJsonFile("imagery-list.json", imageryList);

                    return "";
                }
            } else {
                // Generate a new imagery id
                var newImageryId = getNextId(imageryList);

                // Create a new source configuration for this imagery
                var sourceConfig = new JsonObject();
                sourceConfig.addProperty("type", "GeeGateway");
                sourceConfig.addProperty("geeUrl", geeUrl);
                sourceConfig.add("geeParams", geeParams);

                // Create a new imagery object
                var newImagery = new JsonObject();
                newImagery.addProperty("id", newImageryId);
                newImagery.addProperty("institution", institutionId);
                newImagery.addProperty("visibility", "private");
                newImagery.addProperty("title", imageryTitle);
                newImagery.addProperty("attribution", imageryAttribution);
                newImagery.add("extent", null);
                newImagery.add("sourceConfig", sourceConfig);

                // Write the new entry to imagery-list.json
                imageryList.add(newImagery);
                writeJsonFile("imagery-list.json", imageryList);

                return "";
            }
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
    }

    public synchronized String deleteInstitutionImagery(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var imageryId = jsonInputs.get("imageryId").getAsString();
        var institutionId = jsonInputs.get("institutionId").getAsInt();

        filterJsonFile("imagery-list.json",
                       imagery -> !imagery.get("id").getAsString().equals(imageryId)
                               || imagery.get("institution").getAsInt() != institutionId);

        return "";
    }

}
