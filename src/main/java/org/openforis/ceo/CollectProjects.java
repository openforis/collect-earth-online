package org.openforis.ceo;

import static java.lang.String.format;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findElement;
import static org.openforis.ceo.JsonUtils.forEachInJsonArray;
import static org.openforis.ceo.JsonUtils.intoJsonArray;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.toElementStream;
import static org.openforis.ceo.PartUtils.partToString;
import static org.openforis.ceo.PartUtils.partsToJsonObject;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpContent;
import com.google.api.client.http.HttpMethods;
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
import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
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
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userId", userId);
        params.put("groupId", institutionId);
        params.put("full", true);
        params.put("includeCodeListValues", true);
        
        JsonArray allSurveys = getFromCollect("survey", params).getAsJsonArray();
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
        getCollectSamplingPointItems(projectId, null, false);
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
        JsonArray convertedItems = toElementStream(filteredSamplingPointItems).map(el -> {
            JsonObject itemObj = (JsonObject) el;
            String plotId = findElement(itemObj, "levelCodes[0]").getAsString();
            Integer recordId = getLastCollectRecordIdByPlotId(projectId, plotId);
            JsonObject collectRecord = recordId == null ? null : getCollectRecord(projectId, recordId);
            JsonArray sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
            return convertToCeoRecord(projectId, collectRecord, itemObj, sampleItems);
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
        int projectId = Integer.parseInt(req.params(":id"));
        JsonArray samplingPointItems = getFromCollect("survey/" + projectId + "/sampling_point_data.json").getAsJsonArray();
        BigInteger analyzedPlots = BigInteger.valueOf(0), unanalyzedPlots = BigInteger.valueOf(0), 
                totalMeasurements = BigInteger.valueOf(0), totalFlagged = BigInteger.valueOf(0);
        final Set<Integer> contributorsId = new HashSet<Integer>();
        
        toElementStream(samplingPointItems)
            .forEach(item -> {
                JsonObject itemObj = (JsonObject) item;
                boolean flagged = isFlagged(itemObj);
                if (flagged) {
                    totalFlagged.add(BigInteger.ONE);
                }
                String plotId = itemObj.get("id").getAsString();
                JsonArray recordSummaries = getCollectRecordSummariesByPlotId(projectId, plotId);
                if (recordSummaries.size() == 0) {
                    unanalyzedPlots.add(BigInteger.ONE);
                } else {
                    analyzedPlots.add(BigInteger.ONE);
                    totalMeasurements.add(BigInteger.valueOf(recordSummaries.size()));
                    
                    toElementStream(recordSummaries).forEach(summary -> {
                        contributorsId.add(findElement((JsonObject) summary, "modifiedBy.id").getAsInt());
                    });
                }
            });
        return format("{flaggedPlots:%d,analyzedPlots:%d,unanalyzedPlots:%d,members:%d,contributors:%d}", 
                totalFlagged.intValue(), analyzedPlots.intValue(), unanalyzedPlots.intValue(), 0, contributorsId.size());
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object representing a randomly selected plot
    // with attributes flagged=false and analyses=0. If no such
    // plots exist in the database, return the string "done".
    //
    // ==> "{flagged:false,analyses:0,...}" | "done"
    public static String getUnanalyzedPlot(Request req, Response res) {
        int projectId = Integer.parseInt(req.params(":id"));
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userId", "test"); //TODO
        params.put("addSecondLevelEntities", true);
        params.put("onlyUnanalyzedSamplingPoints", true);
        JsonElement record = postToCollect(format("survey/%d/data/records/random", projectId), params);
        if (record.isJsonNull()) {
            return "done";
        } else {
            JsonObject recordObj = record.getAsJsonObject();
            JsonObject collectSurvey = getCollectSurvey(projectId);
            int keyAttributeDefId = getCollectSurveyNodeDefinitionId(collectSurvey, "id");
            JsonObject idAttr = getCollectRecordAttribute(projectId, recordObj.get("id").getAsInt(), keyAttributeDefId);
            String plotId = idAttr.get("value").getAsString();
            JsonArray plotSamplingPointItems = getCollectSamplingPointItems(projectId, plotId, true);
            JsonObject plotSamplingPointItem = plotSamplingPointItems.get(0).getAsJsonObject();
            JsonArray sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
            return convertToCeoRecord(projectId, recordObj, plotSamplingPointItem, sampleItems).toString();
        }
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
        int projectId = jsonInputs.get("projectId").getAsInt();
        String plotId = jsonInputs.get("plotId").getAsString();
        String userName = jsonInputs.get("userId").getAsString();
        JsonObject userSamples = jsonInputs.get("userSamples").getAsJsonObject();
        
        int currentAnalyses = getCollectRecordsCountByPlotId(projectId, plotId);
        
        Map<String, Object> newRecordParams = new HashMap<String, Object>();
        newRecordParams.put("userId", null); //TODO
        newRecordParams.put("recordKey[0]", plotId);
        newRecordParams.put("recordKey[1]", currentAnalyses+1);
        newRecordParams.put("addSecondLevelEntities", true);
        JsonObject newRecord = postToCollect(String.format("survey/%s/data/records", projectId), newRecordParams).getAsJsonObject();
        int recordId = newRecord.get("id").getAsInt();
        
        JsonObject survey = getCollectSurvey(projectId);
        
        userSamples.entrySet().forEach(e -> {
            String key = e.getKey();
            String value = e.getValue().getAsString();
            
            int subplotNodeDefId = getCollectSurveyNodeDefinitionId(survey, "subplot");
            JsonArray subplots = findElement(newRecord,
                    format("rootEntity.childrenByDefinitionId.%d[0]", subplotNodeDefId)).getAsJsonArray();
            
            JsonObject subplot = toElementStream(subplots).filter(s -> {
                int subplotKeyDefId = getCollectSurveyNodeDefinitionId(survey, "subplot/subplot_id");
                String subplotKey = findElement((JsonObject) s,
                        format("childrenByDefinitionId.%d[0].fields[0].value", subplotKeyDefId)).getAsString();
                return subplotKey.equals(key);
            }).collect(intoJsonArray).get(0).getAsJsonObject();

            JsonObject command = createAttributeUpdateCommand(projectId, survey, recordId, subplot,
                    "subplot/value", value, userName);
            
            patchToCollect("record/attribute", command);
        });
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
        
        JsonObject samplingPointItem = getCollectSamplingPointItems(projectId, plotId, true).getAsJsonArray().get(0).getAsJsonObject();
        JsonArray infoAttributes = findElement(samplingPointItem, "infoAttributes").getAsJsonArray();
        infoAttributes.set(0, new JsonPrimitive(true));
        patchToCollect(format("survey/%d/sampling_point_data", projectId), samplingPointItem);
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
            
            JsonObject newSurvey = patchToCollect("survey/simple", data).getAsJsonObject();
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
    
    private static JsonObject convertToCeoRecord(int projectId, JsonObject collectRecord, JsonObject plotSamplingItem, JsonArray sampleItems) {
        String plotId = findElement(plotSamplingItem, "levelCodes[0]").getAsString();
        JsonObject obj = new JsonObject();
        obj.addProperty("id", plotId);
        obj.add("center", createPointObject(plotSamplingItem.get("x").getAsDouble(), plotSamplingItem.get("y").getAsDouble()));
        
        boolean flagged = isFlagged(plotSamplingItem);
        
        obj.addProperty("flagged", flagged);
        obj.addProperty("analyses", getCollectRecordsCountByPlotId(projectId, plotId));
        obj.addProperty("user", (String) null); //TODO
        
        JsonArray samples = toElementStream(sampleItems)
                .map(item -> {
                    JsonObject itemObj = (JsonObject) item;
                    String sampleId = findElement(itemObj, "levelCodes[1]").getAsString();
                    JsonObject o = new JsonObject();
                    o.addProperty("id", sampleId);
                    o.add("point", createPointObject(itemObj.get("x").getAsDouble(), itemObj.get("y").getAsDouble()));
                    return o;
                }).collect(intoJsonArray);
        
        obj.add("samples", samples);
        return obj;
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
    
    //COLLECT API HELPER FUNCTIONS
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

    private static JsonElement postToCollect(String url) {
        return postToCollect(url, null);
    }
    
    private static JsonElement postToCollect(String url, Object data) {
        return sendToCollect(HttpMethods.POST, url, data);
    }

    private static JsonElement patchToCollect(String url) {
        return patchToCollect(url, null);
    }
    
    private static JsonElement patchToCollect(String url, Object data) {
        return sendToCollect(HttpMethods.PATCH, url, data);
    }
    
    private static JsonElement sendToCollect(String method, String url, Object data) {
        try {
            HttpRequestFactory requestFactory = createRequestFactory();
            HttpContent content = data == null ? null : new JsonHttpContent(JSON_FACTORY, data);
            HttpRequest request = requestFactory.buildRequest(method, new GenericUrl(COLLECT_API_URL + url), content);
            String result = request.execute().parseAsString();
            return parseJson(result);
        } catch (IOException e) {
            throw new RuntimeException("Error communicating with Collect", e);
        }
    }
    
    private static JsonObject getCollectSurvey(int surveyId) {
        String url = "survey/" + surveyId;
        return getFromCollect(url).getAsJsonObject();
    }

    private static int getCollectSurveyNodeDefinitionId(JsonObject collectSurvey, String nodePath) {
        JsonObject currentObj = findElement(collectSurvey, "schema.rootEntities[0]").getAsJsonObject();
        String[] pathParts = nodePath.split("/");
        for (String pathPart : pathParts) {
            JsonArray currentChildrenDefs = findElement(currentObj, "children").getAsJsonArray();
            currentObj = filterJsonArray(currentChildrenDefs, o -> pathPart.equals(o.get("name").getAsString())).get(0).getAsJsonObject();
        };
        return currentObj.get("id").getAsInt();
    }
    

    private static JsonObject getCollectRecord(int surveyId, int recordId) {
        return getFromCollect(format("survey/%s/data/records/%s", surveyId, recordId)).getAsJsonObject();
    }
    
    private static JsonArray getCollectRecordSummariesByPlotId(int projectId, String plotId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("keyValues[0]", plotId);
        params.put("sortFields[0].field", "KEY2");
        JsonArray plotSummaries = getFromCollect(format("survey/%d/data/records/summary", projectId), params).getAsJsonArray();
        return plotSummaries;
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
    
    private static boolean isFlagged(JsonObject samplingPointItem) {
        return findElement(samplingPointItem, "infoAttributes[0]").getAsBoolean();
    }

    private static JsonObject createPointObject(double x, double y) {
        JsonObject o = new JsonObject();
        o.add("type", new JsonPrimitive("Point"));
        JsonArray coordinates = new JsonArray();
        coordinates.add(y);
        coordinates.add(x);
        o.add("coordinates", coordinates);
        return o;
    }
    
    private static JsonArray getCollectSamplingPointItems(int projectId, String plotId, boolean onlyParentItem) {
        HashMap<String, Object> params = new HashMap<String, Object>();
        params.put("parent_keys[0]", plotId);
        params.put("only_parent_item", onlyParentItem);
        JsonArray sampleItems = getFromCollect("survey/" + projectId + "/sampling_point_data.json", params)
                .getAsJsonArray();
        return sampleItems;
    }

    private static JsonObject getCollectRecordAttribute(int surveyId, int recordId, int attributeDefinitionId) {
        JsonObject collectRecord = getCollectRecord(surveyId, recordId);
        JsonObject attr = findElement(collectRecord, format("rootEntity.childrenByDefinitionId.%d[0]", attributeDefinitionId)).getAsJsonObject();
        return attr;
    }
    
    private static JsonObject createAttributeUpdateCommand(int projectId, JsonObject survey, int recordId,
            JsonObject parentEntity, String attributeDefPath, String value, String userName) {
        JsonObject command = new JsonObject();
        
        int valueAttrDefId = getCollectSurveyNodeDefinitionId(survey, attributeDefPath);
        JsonObject valueAttr = findElement(parentEntity, format("childrenByDefinitionId.%d[0]", valueAttrDefId))
                .getAsJsonObject();
        command.addProperty("username", userName);
        command.addProperty("surveyId", projectId);
        command.addProperty("recordId", recordId);
        command.addProperty("nodeDefId", valueAttrDefId);
        command.addProperty("nodeId", valueAttr.get("id").getAsInt());
        command.addProperty("parentEntityId", parentEntity.get("id").getAsInt());
        command.addProperty("attributeType", "CODE");
        JsonObject valueByField = new JsonObject();
        valueByField.addProperty("code", value);
        command.add("valueByField", valueByField);
        return command;
    }
}
