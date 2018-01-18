package org.openforis.ceo;

import static org.openforis.ceo.Collect.getFromCollect;
import static org.openforis.ceo.Collect.postToCollect;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findElement;
import static org.openforis.ceo.JsonUtils.*;
import static org.openforis.ceo.JsonUtils.toElementStream;
import static org.openforis.ceo.OfGroups.associateResource;
import static org.openforis.ceo.OfGroups.disassociateResource;
import static org.openforis.ceo.OfGroups.getResourceIds;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import spark.Request;
import spark.Response;

public class CollectImagery {

	private static final String IMAGERY_RESOURCE_TYPE = "IMAGERY";

	public static String getAllImagery(Request req, Response res) throws IOException {
        String institutionId = req.queryParams("institutionId");
		JsonArray imageryList = getFromCollect(String.format("imagery")).getAsJsonArray();
		mapJsonArray(imageryList, imagery -> {
			imagery.add("sourceConfig", parseJson(imagery.get("sourceConfig").getAsString()));
			return imagery;
		});
		if (institutionId.isEmpty()) {
			return imageryList.toString();
		} else {
			JsonArray resourceIdsArray = getResourceIds(Integer.parseInt(institutionId), IMAGERY_RESOURCE_TYPE);
			List<Integer> resourceIds = toElementStream(resourceIdsArray)
				.map(idEl -> idEl.getAsInt())
				.collect(Collectors.toList());
			return filterJsonArray(imageryList, imagery -> resourceIds.contains(imagery.get("id").getAsInt()))
				.toString();
		}
    }

    public static synchronized String addInstitutionImagery(Request req, Response res) throws IOException {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        Integer institutionId = jsonInputs.get("institutionId").getAsInt();
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

        // Create a new source configuration for this imagery
        JsonObject sourceConfig = new JsonObject();
        sourceConfig.addProperty("type", "GeoServer");
        sourceConfig.addProperty("geoserverUrl", geoserverURL);
        sourceConfig.add("geoserverParams", geoserverParams);

        // Create a new imagery object
        JsonObject imagery = new JsonObject();
        imagery.addProperty("title", imageryTitle);
        imagery.addProperty("attribution", imageryAttribution);
        imagery.add("extent", null);
        imagery.addProperty("sourceConfig", sourceConfig.toString());

        //insert new imagery into Collect DB
        JsonObject insertImageryResponse = postToCollect("imagery", imagery).getAsJsonObject();
        if ("OK".equals(insertImageryResponse.get("status").getAsString())) {
        	String imageryId = findElement(insertImageryResponse, "form.id").getAsString();
        	//associate imagery to institution
        	associateResource(institutionId, IMAGERY_RESOURCE_TYPE, imageryId);
        	return "";
        } else {
        	String errorMessage = insertImageryResponse.get("errorMessage").getAsString();
			throw new RuntimeException("Error inserting new imagery: " + errorMessage);
        }
    }

    // FIXME: Delete imagery entries from imagery-list.json once they are no longer referenced by any institution
    public static synchronized String deleteInstitutionImagery(Request req, Response res) throws IOException {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        int institutionId = jsonInputs.get("institutionId").getAsInt();
        String imageryId = jsonInputs.get("imageryId").getAsString();
        
        disassociateResource(institutionId, IMAGERY_RESOURCE_TYPE, imageryId);
        return "";
    }

}
