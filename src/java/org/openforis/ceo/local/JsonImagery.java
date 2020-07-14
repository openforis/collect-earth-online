package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonFile;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.elementToArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;

import com.google.gson.JsonObject;
import org.openforis.ceo.db_api.Imagery;
import spark.Request;
import spark.Response;

public class JsonImagery implements Imagery {

    public String getInstitutionImagery(Request req, Response res) {
        // TODO Auto-generated method stub
        return null;
    }

    public String getProjectImagery(Request req, Response res) {
        // TODO Auto-generated method stub
        return null;
    }

    public String getPublicImagery(Request req, Response res) {
        // TODO Auto-generated method stub
        return null;
    }

    public JsonObject getImagerySourceConfig(Integer imageryId) {
        var imageryList = elementToArray(readJsonFile("imagery-list.json"));
        var foundImagery = findInJsonArray(imageryList, imagery -> imagery.get("id").getAsInt() == imageryId);
        if (foundImagery.isPresent()) {
            return foundImagery.get().get("sourceConfig").getAsJsonObject();
        } else {
            return new JsonObject();
        }
    }

    public static String getImageryTitle(String id) {
        var imageryList = elementToArray(readJsonFile("imagery-list.json"));

        var matchingImagery = filterJsonArray(imageryList,
                                imagery -> imagery.get("id").getAsString().equals(id));

        if (matchingImagery.size() > 0) {
            return matchingImagery.get(0).getAsJsonObject().get("title").getAsString();
        } else {
            return "";
        }
    }

    public synchronized String addInstitutionImagery(Request req, Response res) {
        try {
            var jsonInputs            = parseJson(req.body()).getAsJsonObject();
            var institutionId         = jsonInputs.get("institutionId").getAsInt();
            var imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            var sourceConfig          = jsonInputs.get("sourceConfig").getAsJsonObject();

            // Read in the existing imagery list
            var imageryList = elementToArray(readJsonFile("imagery-list.json"));

            // Generate a new imagery id
            var newImageryId = getNextId(imageryList);

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

    public synchronized String updateInstitutionImagery(Request req, Response res) {
        try {
            var jsonInputs            = parseJson(req.body()).getAsJsonObject();
            var imageryId             = jsonInputs.get("imageryId").getAsInt();
            var imageryTitle          = jsonInputs.get("imageryTitle").getAsString();
            var imageryAttribution    = jsonInputs.get("imageryAttribution").getAsString();
            var sourceConfig          = jsonInputs.get("sourceConfig").getAsJsonObject();

            mapJsonFile("imagery-list.json", imagery -> {
                if (imagery.get("id").getAsInt() == imageryId) {
                    imagery.addProperty("title", imageryTitle);
                    imagery.addProperty("attribution", imageryAttribution);
                    imagery.add("sourceConfig", sourceConfig);
                    return imagery;
                } else {
                    return imagery;
                }
            });

            return "";
        } catch (Exception e) {
            // Indicate that an error occurred with imagery update
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
            var imageryList = elementToArray(readJsonFile("imagery-list.json"));

            // Check to see if this imagery has already been added to this institution
            var matchingImagery = findInJsonArray(imageryList, imagery -> imagery.get("title").getAsString().equals(imageryTitle));

            if (matchingImagery.isPresent() && matchingImagery.get().get("institution").getAsInt() == institutionId) {
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
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
    }

    public String archiveInstitutionImagery(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var imageryId = jsonInputs.get("imageryId").getAsString();

        mapJsonFile("imagery-list.json",
                    imagery -> {
                        if (imagery.get("id").getAsString().equals(imageryId)) {
                            imagery.addProperty("archived", true);
                            return imagery;
                        } else {
                            return imagery;
                        }
                    });
        return "";
    }

}
