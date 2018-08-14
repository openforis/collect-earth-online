package org.openforis.ceo.collect;

import static org.openforis.ceo.collect.CollectClient.getFromCollect;
import static org.openforis.ceo.collect.CollectClient.postToCollect;
import static org.openforis.ceo.users.OfGroups.associateResource;
import static org.openforis.ceo.users.OfGroups.disassociateResource;
import static org.openforis.ceo.users.OfGroups.getResourceIds;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findElement;
import static org.openforis.ceo.utils.JsonUtils.forEachInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.toElementStream;
import static spark.utils.StringUtils.isBlank;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
import org.openforis.ceo.db_api.Imagery;
import spark.Request;
import spark.Response;

public class CollectImagery implements Imagery {

    private static final String IMAGERY_RESOURCE_TYPE = "IMAGERY";

    public String getAllImagery(Request req, Response res) throws IOException {
        var institutionId = req.queryParams("institutionId");
        var imageryList = getFromCollect("imagery").getAsJsonArray();
        forEachInJsonArray(imageryList, imagery -> {
            imagery.add("sourceConfig", parseJson(imagery.get("sourceConfig").getAsString()));
            imagery.addProperty("visibility", imagery.get("visibility").getAsString().toLowerCase());
        });
        var institutionImageryIdsArray = isBlank(institutionId)
            ? new JsonArray()
            : getResourceIds(Integer.parseInt(institutionId), IMAGERY_RESOURCE_TYPE);
        var institutionImageryIds = toElementStream(institutionImageryIdsArray)
            .map(idEl -> idEl.getAsInt())
            .collect(Collectors.toList());
        return filterJsonArray(imageryList, imagery -> 
                imagery.get("visibility").getAsString().equals("public")
                    || institutionImageryIds.contains(imagery.get("id").getAsInt())
            )
            .toString();
    }

    public synchronized String addInstitutionImagery(Request req, Response res) throws IOException {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var institutionId = jsonInputs.get("institutionId").getAsInt();
        var imageryTitle = jsonInputs.get("imageryTitle").getAsString();
        var imageryAttribution = jsonInputs.get("imageryAttribution").getAsString();
        var geoserverURL = jsonInputs.get("geoserverURL").getAsString();
        var layerName = jsonInputs.get("layerName").getAsString();
        var geoserverParamsString = jsonInputs.get("geoserverParams").getAsString();
        var geoserverParams = geoserverParamsString.equals("")
            ? new JsonObject()
            : parseJson(geoserverParamsString).getAsJsonObject();

        // Add layerName to geoserverParams
        geoserverParams.addProperty("LAYERS", layerName);

        // Create a new source configuration for this imagery
        var sourceConfig = new JsonObject();
        sourceConfig.addProperty("type", "GeoServer");
        sourceConfig.addProperty("geoserverUrl", geoserverURL);
        sourceConfig.add("geoserverParams", geoserverParams);

        // Create a new imagery object
        var imagery = new JsonObject();
        imagery.addProperty("visibility", "PRIVATE");
        imagery.addProperty("title", imageryTitle);
        imagery.addProperty("attribution", imageryAttribution);
        imagery.add("extent", null);
        imagery.addProperty("sourceConfig", sourceConfig.toString());

        //insert new imagery into Collect DB
        var insertImageryResponse = postToCollect("imagery", imagery).getAsJsonObject();
        if ("OK".equals(insertImageryResponse.get("status").getAsString())) {
            var imageryId = findElement(insertImageryResponse, "form.id").getAsString();
            //associate imagery to institution
            associateResource(institutionId, IMAGERY_RESOURCE_TYPE, imageryId);
            return "";
        } else {
            var errorMessage = insertImageryResponse.get("errorMessage").getAsString();
            throw new RuntimeException("Error inserting new imagery: " + errorMessage);
        }
    }

    // FIXME: Delete imagery entries from imagery-list.json once they are no longer referenced by any institution
    public synchronized String deleteInstitutionImagery(Request req, Response res) throws IOException {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var institutionId = jsonInputs.get("institutionId").getAsInt();
        var imageryId = jsonInputs.get("imageryId").getAsString();
        
        disassociateResource(institutionId, IMAGERY_RESOURCE_TYPE, imageryId);
        return "";
    }

}
