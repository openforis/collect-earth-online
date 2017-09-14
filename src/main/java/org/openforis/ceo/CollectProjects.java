package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.intoJsonArray;
import static org.openforis.ceo.JsonUtils.forEachInJsonArray;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.toElementStream;
import static org.openforis.ceo.PartUtils.partToString;
import static org.openforis.ceo.PartUtils.partsToJsonObject;
import static org.openforis.ceo.JsonUtils.findElement;

import static java.lang.String.format;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import javax.servlet.MultipartConfigElement;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpContent;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.http.json.JsonHttpContent;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.GenericData;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

import spark.Request;
import spark.Response;

public class CollectProjects {

    static final String COLLECT_API_URL = CeoConfig.collectApiUrl;
    static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    static final JsonFactory JSON_FACTORY = new JacksonFactory();

    public static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
            request.setParser(new JsonObjectParser(JSON_FACTORY));
        });
    }

    /**
     * Call Collect's REST API to QUERY the database.
     * @param req
     * @param res
     * @return the JSON array of JSON objects (one per project) that match the relevant query filters
     */
    public static String getAllProjects(Request req, Response res) {
        String userId = req.queryParams("userId");
        String institutionId = req.queryParams("institutionId");
        String url = COLLECT_API_URL + "survey";
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userId", userId);
        params.put("groupId", institutionId);
        params.put("full", true);
        params.put("includeCodeListValues", true);
        
        JsonArray allSurveys = getFromCollect(url, params).getAsJsonArray();
        return toElementStream(allSurveys)
            .map(s -> convertToCEOProject((JsonObject) s))
            .collect(intoJsonArray)
            .toString();
    }

    /**
     * Call Collect's REST API to QUERY the database.
     * @param req
     * @param res
     * @return the JSON object for project with matching id or an empty
     */
    public static String getProjectById(Request req, Response res) {
        String projectId = req.params(":id");
        JsonObject collectSurvey = getCollectSurvey(Integer.parseInt(projectId)).getAsJsonObject();
		return convertToCEOProject(collectSurvey).getAsString();
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return JSON array of plot objects if numPlots < maxPlots.
    // Otherwise, select an evenly spaced sample of the plots of
    // size maxPlots.
    //
    // ==> "[{},{},{}]" where [].length <= maxPlots
    public static String getProjectPlots(Request req, Response res) {
        int projectId = Integer.parseInt(req.params(":id"));
        int maxPlots = Integer.parseInt(req.params(":max"));
        JsonArray samplingPointItems = getFromCollect("survey/" + projectId + "/sampling_point_data.json").getAsJsonArray();
        int numPlots = samplingPointItems.size();
        
        JsonArray filteredSamplingPointItems;
        if (numPlots > maxPlots) {
            double stepSize = 1.0 * numPlots / maxPlots;
            filteredSamplingPointItems = 
                Stream.iterate(0.0, i -> i + stepSize)
                    .limit(maxPlots)
                    .map(i -> (JsonObject) samplingPointItems.get(Math.toIntExact(Math.round(i))))
                    .collect(intoJsonArray);
        } else {
            filteredSamplingPointItems = samplingPointItems;
        }
        //convert Collect SamplingPointItems into CEO plots
        int flaggedAttrDefId = getCollectSurveyAttributeDefinitionId(projectId, "flagged");
        
        JsonArray convertedItems = toElementStream(filteredSamplingPointItems).map(el -> {
            JsonObject samplingItemObj = (JsonObject) el;
            JsonObject centerObj = new JsonObject();
            centerObj.add("type", new JsonPrimitive("Point"));
            centerObj.add("coordinates", Arrays.asList(samplingItemObj.get("y"), samplingItemObj.get("x")).stream().collect(intoJsonArray));
            JsonObject obj = new JsonObject();
            obj.add("center", centerObj);
            String plotId = samplingItemObj.get("levelCodes").getAsJsonArray().get(0).getAsString();
            obj.add("id", new JsonPrimitive(plotId));
            
            int collectRecordId = getLastCollectRecordIdByPlotId(projectId, plotId);
            JsonObject collectRecord = getCollectRecord(projectId, collectRecordId);
            
            JsonObject flaggedAttr = findElement(collectRecord, String.format("rootEntity.childrenByDefinitionId.%d[0]", flaggedAttrDefId)).getAsJsonObject();
            boolean flagged = findElement(flaggedAttr, "fields[0].value").getAsBoolean();
            
            obj.add("flagged", new JsonPrimitive(flagged));
            obj.add("analyses", new JsonPrimitive(getCollectRecordsCountByPlotId(projectId, plotId)));
            obj.add("user", null);
            return obj;
        }).collect(intoJsonArray);

        return convertedItems.toString();
        //[{center: "{\"type\":\"Point\",\"coordinates\":[102.999640127073,22.0468074686287]}", id: 4289, flagged: false, analyses: 0, user: null,
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object with several computed integer fields
    //
    // ==> "{flaggedPlots:#,analyzedPlots:#,unanalyzedPlots:#,members:#,contributors:#}"
    public static String getProjectStats(Request req, Response res) {
        String projectId = req.params(":id");
        // ...
        return "{flaggedPlots:0,analyzedPlots:0,unanalyzedPlots:0,members:0,contributors:0}";
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object representing a randomly selected plot
    // with attributes flagged=false and analyses=0. If no such
    // plots exist in the database, return the string "done".
    //
    // ==> "{flagged:false,analyses:0,...}" | "done"
    public static String getUnanalyzedPlot(Request req, Response res) {
        String projectId = req.params(":id");
        // ...
        return "done";
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Read in the project and plot data for a project with
    // matching id, compute several plot-level aggregate
    // statistics, write these to a file in CSV format, and return
    // a string representing the URL from which this CSV may be
    // downloaded.
    //
    // ==> "/downloads/ceo-<projectName>-<currentDate>.csv"
    public static String dumpProjectAggregateData(Request req, Response res) {
        String projectId = req.params(":id");
        // ...
        return "/downloads/ceo-i-dont-exist-today.csv";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "published" for the
    // project with matching id. Return the empty string.
    //
    // ==> ""
    public static synchronized String publishProject(Request req, Response res) {
        String projectId = req.params(":id");
        patchToCollect("survey/publish/" + projectId);
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "closed" for the
    // project with matching id. Return the empty string.
    //
    // ==> ""
    public static synchronized String closeProject(Request req, Response res) {
        String projectId = req.params(":id");
        patchToCollect("survey/close/" + projectId);
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "archived" and the
    // archived attribute to true for the project with matching
    // id. Return the empty string.
    //
    // ==> ""
    public static synchronized String archiveProject(Request req, Response res) {
        String projectId = req.params(":id");
        patchToCollect("survey/archive/" + projectId);
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Increment the analyses attribute and set the user attribute
    // to userName for the plot with matching projectId and
    // plotId. Set the value attribute to userSamples[sampleId]
    // for each sample belonging to the selected plot. Return the
    // empty string.
    //
    // ==> ""
    public static synchronized String addUserSamples(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();
        String userName = jsonInputs.get("userId").getAsString();
        JsonObject userSamples = jsonInputs.get("userSamples").getAsJsonObject();
        // ...
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the flagged attribute to true for the project with
    // matching id. Return the empty string.
    //
    // ==> ""
    public static synchronized String flagPlot(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        int projectId = jsonInputs.get("projectId").getAsInt();
        String plotId = jsonInputs.get("plotId").getAsString();
        String username = "test"; //TODO
        
        Integer recordId = getLastCollectRecordIdByPlotId(projectId, plotId);
        if (recordId == null) {
            throw new IllegalArgumentException(format("Plot with id %s not found in project %s", plotId, projectId));
        }
        
        JsonObject collectRecord = getCollectRecord(projectId, recordId);
        int plotEntityId = findElement(collectRecord, "rootEntity.id").getAsInt();
        int flaggedAttrDefId = getCollectSurveyAttributeDefinitionId(projectId, "flagged");
        JsonObject flaggedAttr = findElement(collectRecord, format("rootEntity.childrenByDefinitionId.%d[0]", flaggedAttrDefId)).getAsJsonObject();
        int flaggedAttrId = flaggedAttr.get("id").getAsInt();
        
        JsonObject command = new JsonObject();
        command.addProperty("username", username);
        command.addProperty("surveyId", projectId);
        command.addProperty("recordId", recordId);
        command.addProperty("nodeDefId", flaggedAttrDefId);
        command.addProperty("nodeId", flaggedAttrId);
        command.addProperty("parentEntityId", plotEntityId);
        command.addProperty("attributeType", "BOOLEAN");
        
        patchToCollect("record/attribute", command);
        
        return "";
    }

    // NOTE: This function is extremely complicated. We will need to
    // work together to move it to Collect.
    //
    // Create a new project and compute the layout and attributes of
    // its plots and sample points. Return the new project id as a
    // string.
    //
    // ==> "<newProjectId>"
    public static synchronized String createProject(Request req, Response res) {
        try {
            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            // Read the input fields into a new JsonObject (NOTE: fields will be camelCased)
            JsonObject newProject = partsToJsonObject(req,
                                                      new String[]{"institution", "privacy-level", "lon-min", "lon-max", "lat-min", "lat-max",
                                                                   "base-map-source", "imagery-year", "stacking-profile", "plot-distribution",
                                                                   "num-plots", "plot-spacing", "plot-shape", "plot-size", "sample-distribution",
                                                                   "samples-per-plot", "sample-resolution", "sample-values"});

            // Manually add the name and description fields since they may be invalid JSON
            newProject.addProperty("name", partToString(req.raw().getPart("name")));
            newProject.addProperty("description", partToString(req.raw().getPart("description")));

            GenericData data = convertToCollectProjectParameters(newProject);
            
            String newSurveyStr = patchToCollect("survey/simple", data);
            JsonObject newSurvey = parseJson(newSurveyStr).getAsJsonObject();
            return newSurvey.get("id").getAsString();
        } catch (Exception e) {
            // Indicate that an error occurred with project creation
            throw new RuntimeException(e);
        }
    }
    
    private static JsonObject convertToCEOProject(JsonObject collectSurvey) {
        JsonObject p = new JsonObject();
        p.addProperty("id", collectSurvey.get("id").getAsInt());
        p.addProperty("name", collectSurvey.get("name").getAsString());
        p.addProperty("availability", collectSurvey.get("availability").getAsString().toLowerCase());
        p.addProperty("description", collectSurvey.get("description").getAsString());
        p.addProperty("privacyLevel","public"); //TODO
        JsonObject boundary = new JsonObject();
        boundary.addProperty("type", "Polygon");
        JsonArray coordinates = Stream.iterate(0, i -> i + 1).limit(4)
            .map(i -> {
                JsonArray coordinate = new JsonArray();
                coordinate.add(findElement(collectSurvey, format("ceoApplicationOptions.samplingPointDataConfiguration.aoiBoundary[%d].y", i)));
                coordinate.add(findElement(collectSurvey, format("ceoApplicationOptions.samplingPointDataConfiguration.aoiBoundary[%d].x", i)));
                return coordinate;
            }).collect(intoJsonArray);
        JsonArray coordinatesWrapper1 = new JsonArray();
        coordinatesWrapper1.add(coordinates);
        JsonArray coordinatesWrapper2 = new JsonArray();
        coordinatesWrapper2.add(coordinatesWrapper1);
        boundary.add("coordinates", coordinatesWrapper2);
        p.add("boundary", boundary);
        p.addProperty("baseMapSource", "DigitalGlobeRecentImagery+Streets"); //TODO
        p.addProperty("imageryYear", 2016); //TODO
        p.addProperty("stackingProfile", "Accuracy_Profile"); //TODO
        p.addProperty("plotDistribution", findElement(collectSurvey, "ceoApplicationOptions.samplingPointDataConfiguration.levelsSettings[0].distribution").getAsString().toLowerCase());
        p.addProperty("numPlots", findElement(collectSurvey, "ceoApplicationOptions.samplingPointDataConfiguration.levelsSettings[0].numPoints").getAsInt());
        p.addProperty("plotSpacing", (String) null);
        p.addProperty("plotShape", findElement(collectSurvey, "ceoApplicationOptions.samplingPointDataConfiguration.levelsSettings[0].shape").getAsString().toLowerCase());
        p.addProperty("plotSize", findElement(collectSurvey, "ceoApplicationOptions.samplingPointDataConfiguration.levelsSettings[0].pointWidth").getAsInt());
        
        p.addProperty("sampleDistribution", findElement(collectSurvey, "ceoApplicationOptions.samplingPointDataConfiguration.levelsSettings[1].distribution").getAsString().toLowerCase());
        p.addProperty("samplesPerPlot", findElement(collectSurvey, "ceoApplicationOptions.samplingPointDataConfiguration.levelsSettings[1].numPoints").getAsInt());
        p.addProperty("sampleResolution", (String) null); //TODO
        
        JsonArray codeListItems = findElement(collectSurvey, "codeLists[1].items").getAsJsonArray();
        forEachInJsonArray(codeListItems, item -> {
            
        });
        JsonArray sampleValues = toElementStream(codeListItems).map(el -> {
            JsonObject obj = (JsonObject) el;
            JsonObject sampleValue = new JsonObject();
            sampleValue.addProperty("id", obj.get("id").getAsInt());
            sampleValue.addProperty("code", obj.get("code").getAsString());
            sampleValue.addProperty("name", obj.get("label").getAsString());
            sampleValue.addProperty("color", obj.get("color") == null ? (String) null: obj.get("color").getAsString());
            return sampleValue;
        }).collect(intoJsonArray);
        
        p.add("sampleValues", sampleValues);
        p.addProperty("attribution", "DigitalGlobe Maps API: Recent Imagery+Streets | June 2015 | © DigitalGlobe, Inc");
        p.addProperty("archived", "archived".equalsIgnoreCase(collectSurvey.get("availability").getAsString()));
        return p;
    }

    private static GenericData convertToCollectProjectParameters(JsonObject ceoProject) {
        GenericData data = new GenericData();
        data.put("name", ceoProject.get("name").getAsString());
        data.put("description", ceoProject.get("description").getAsString());
        data.put("userGroupId", ceoProject.get("institution").getAsLong());
        GenericData samplingPointGenerationData = new GenericData();
        data.put("samplingPointGenerationSettings", samplingPointGenerationData);

        List<GenericData> aoiBoundary = extractAoiBoundaryData(ceoProject);
        samplingPointGenerationData.put("aoiBoundary", aoiBoundary);

        List<GenericData> samplingPointSettings = new ArrayList<GenericData>(2);
        GenericData plotLevelSettings = new GenericData();
        plotLevelSettings.put("numPoints", ceoProject.get("num-plots").getAsInt());
        plotLevelSettings.put("shape", ceoProject.get("plot-shape").getAsString().toUpperCase());
        plotLevelSettings.put("distribution", ceoProject.get("plot-distribution").getAsString().toUpperCase());
        plotLevelSettings.put("resolution", ceoProject.get("plot-spacing").getAsDouble());
        plotLevelSettings.put("pointWidth", ceoProject.get("plot-size").getAsDouble());
        samplingPointSettings.add(plotLevelSettings);

        GenericData sampleLevelSettings = new GenericData();
        sampleLevelSettings.put("numPoints", ceoProject.get("samples-per-plot").getAsInt());
        sampleLevelSettings.put("shape", "CIRCLE");
        sampleLevelSettings.put("distribution", ceoProject.get("sample-distribution").getAsString().toUpperCase());
        sampleLevelSettings.put("resolution", ceoProject.get("sample-resolution").getAsDouble());
        sampleLevelSettings.put("pointWidth", 10.0d);
        samplingPointSettings.add(sampleLevelSettings);

        List<GenericData> valueItems = new ArrayList<GenericData>();
        JsonArray values = ceoProject.get("sample-values").getAsJsonArray();
        for (JsonElement valEl: values) {
            valueItems.add(convertToCodeItemData((JsonObject) valEl));
        }
        data.put("values", valueItems);
        return data;
    }

    private static GenericData convertToCodeItemData(JsonObject valEl) {
        GenericData codeItem = new GenericData();
        codeItem.put("code", valEl.get("id").getAsString());
        codeItem.put("label", valEl.get("name").getAsString());
        codeItem.put("color", valEl.get("color").getAsString());
        return codeItem;
    }

    private static List<GenericData> extractAoiBoundaryData(JsonObject jsonObj) {
        return Arrays.asList(
                             extractCoordinateData(jsonObj, "lat-min", "lon-min"),
                             extractCoordinateData(jsonObj, "lat-min", "lon-max"),
                             extractCoordinateData(jsonObj, "lat-max", "lon-min"),
                             extractCoordinateData(jsonObj, "lat-max", "lon-max")
                             );
    }

    private static GenericData extractCoordinateData(JsonObject jsonObj, String latMember, String lonMember) {
        GenericData data = new GenericData();
        data.put("x", jsonObj.get(latMember).getAsDouble());
        data.put("y", jsonObj.get(lonMember).getAsDouble());
        data.put("srsId", "EPSG:4326");
        return data;
    }

    private static JsonElement getFromCollect(String url) {
        return getFromCollect(url, null);
    }

    private static JsonElement getFromCollect(String url, Map<String, Object> params) {
        try {
            HttpRequestFactory requestFactory = createRequestFactory();
            HttpRequest request = requestFactory.buildGetRequest(new GenericUrl(COLLECT_API_URL + url));
            request.getUrl().putAll(params);
            String str = request.execute().parseAsString();
            return parseJson(str);
        } catch (IOException e) {
        	throw new RuntimeException("Error communicating with Collect", e);
        }
    }

    private static String postToCollect(String url) {
        return postToCollect(url, null);
    }
    
    private static String postToCollect(String url, Object data) {
        try {
            HttpRequestFactory requestFactory = createRequestFactory();
            HttpContent content = data == null ? null : new JsonHttpContent(JSON_FACTORY, data);
            HttpRequest request = requestFactory.buildPostRequest(new GenericUrl(COLLECT_API_URL + url), content);
            return request.execute().parseAsString();
        } catch (IOException e) {
        	throw new RuntimeException("Error communicating with Collect", e);
        }
    }

    private static String patchToCollect(String url) {
        return patchToCollect(url, null);
    }
    
    private static String patchToCollect(String url, Object data) {
        try {
            HttpRequestFactory requestFactory = createRequestFactory();
            HttpContent content = data == null ? null : new JsonHttpContent(JSON_FACTORY, data);
            HttpRequest request = requestFactory.buildPatchRequest(new GenericUrl(COLLECT_API_URL + url), content);
            return request.execute().parseAsString();
        } catch (IOException e) {
        	throw new RuntimeException("Error communicating with Collect", e);
        }
    }

    private static JsonElement getCollectSurvey(int surveyId) {
        String url = "survey/" + surveyId;
        return getFromCollect(url);
    }

    private static int getCollectSurveyAttributeDefinitionId(int projectId, String attributeName) {
        JsonObject collectSurvey = getCollectSurvey(projectId).getAsJsonObject();
        JsonArray plotChildrenDefs = findElement(collectSurvey, "schema.rootEntities[0].children").getAsJsonArray();
        JsonObject attrDef = filterJsonArray(plotChildrenDefs, o -> attributeName.equals(o.get("name").getAsString())).get(0).getAsJsonObject();
        return attrDef.get("id").getAsInt();
    }

    private static JsonObject getCollectRecord(int surveyId, int recordId) {
        return getFromCollect(format("survey/%s/data/records/%s", surveyId, recordId)).getAsJsonObject();
    }
    
    private static Integer getLastCollectRecordIdByPlotId(int projectId, String plotId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("keyValues[0]", plotId);
        params.put("sortFields[0].field", "KEY2");
        JsonArray plotSummaries = getFromCollect(format("survey/%d/data/records/summary", projectId), params).getAsJsonArray();
        if (plotSummaries.size() == 1) {
            JsonObject plotSummary = plotSummaries.get(0).getAsJsonObject();
            int recordId = plotSummary.get("id").getAsInt();
            return recordId;
        } else {
            return null;
        }
    }
    
    private static int getCollectRecordsCountByPlotId(int projectId, String plotId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("keyValues[0]", plotId);
        JsonArray plotSummaries = getFromCollect(format("survey/%d/data/records/summary", projectId), params).getAsJsonArray();
        return plotSummaries.size();
    }
    
    private static JsonElement getCollectRecordAttribute(int surveyId, int recordId, int attributeDefinitionId) {
        JsonObject collectRecord = getCollectRecord(surveyId, recordId);
        JsonObject attr = findElement(collectRecord, format("rootEntity.childrenByDefinitionId.%d[0]", attributeDefinitionId)).getAsJsonObject();
        return attr;
    }

}
