package org.openforis.ceo.collect;

import static java.lang.String.format;
import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.collect.CollectClient.getFromCollect;
import static org.openforis.ceo.collect.CollectClient.postToCollect;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findElement;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.flatMapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.getDateAsString;
import static org.openforis.ceo.utils.JsonUtils.getMemberValue;
import static org.openforis.ceo.utils.JsonUtils.intoJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.singletonArray;
import static org.openforis.ceo.utils.JsonUtils.toElementStream;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.partsToJsonObject;
import static org.openforis.ceo.utils.RequestUtils.getIntParam;
import static org.openforis.ceo.utils.RequestUtils.getParam;
import static spark.utils.StringUtils.isBlank;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import org.openforis.ceo.db_api.Projects;
import org.openforis.ceo.model.ProjectStats;
import org.openforis.ceo.users.OfGroups;
import org.openforis.ceo.users.OfUsers;
import org.openforis.ceo.utils.JsonUtils;
import spark.Request;
import spark.Response;

public class CollectProjects implements Projects {

    private static final String ADMIN_USERNAME = "admin@openforis.org";
    private static final int MAX_PLOT_MEASUREMENTS = 3;
    private static final double SAMPLE_POINT_WIDTH_M = 10.0d;
    private static final String COLLECT_EARTH_ONLINE_TARGET = "COLLECT_EARTH_ONLINE";

    /**
     * Call Collect's REST API to QUERY the database.
     * @param req
     * @param res
     * @return the JSON array of JSON objects (one per project) that match the relevant query filters
     */
    public String getAllProjects(Request req, Response res) {
        Integer userId = getLoggedUserId(req);
        String institutionId = req.queryParams("institutionId");
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userId", userId);
        params.put("groupId", institutionId);
        params.put("includeTemporary", true);
        params.put("full", true);
        params.put("includeCodeListValues", true);
        params.put("target", COLLECT_EARTH_ONLINE_TARGET);
        
        JsonArray allSurveys = getFromCollect("survey", params).getAsJsonArray();
        Stream<JsonObject> allProjects = toElementStream(allSurveys)
            .map(s -> convertToCeoProject((JsonObject) s));
        
        //consider only not archived projects
        Stream<JsonObject> filteredProjects = allProjects.filter(
                project -> ! project.get("archived").getAsBoolean());
        
        //filter by institution
        if (! isBlank(institutionId)) {
            filteredProjects = filteredProjects.filter(project -> project.get("institution").getAsString().equals(institutionId));
        }

        if (userId == null) {
            // Not logged in
           filteredProjects = filteredProjects.filter(project -> 
                               project.get("privacyLevel").getAsString().equals("public")
                               && project.get("availability").getAsString().equals("published")
               ).map(project -> {
                    project.addProperty("editable", false);
                    return project;
                });
        } else {
        	//logged in
            Map<Integer, String> institutionRoles = (new OfUsers()).getInstitutionRoles(userId);
            filteredProjects = filteredProjects.filter(project -> {
                        String role = institutionRoles.getOrDefault(project.get("institution").getAsInt(), "");
                        String privacyLevel = project.get("privacyLevel").getAsString();
                        String availability = project.get("availability").getAsString();
                        if (role.equals("admin")) {
                            return (privacyLevel.equals("public") || privacyLevel.equals("private") || privacyLevel.equals("institution"))
                                && (availability.equals("unpublished") || availability.equals("published") || availability.equals("closed"));
                        } else if (role.equals("member")) {
                            return (privacyLevel.equals("public") || privacyLevel.equals("institution")) && availability.equals("published");
                        } else {
                            return privacyLevel.equals("public") && availability.equals("published");
                        }
                    })
                .map(project -> {
                        String role = institutionRoles.getOrDefault(project.get("institution").getAsInt(), "");
                        if (role.equals("admin")) {
                            project.addProperty("editable", true);
                        } else {
                            project.addProperty("editable", false);
                        }
                        return project;
                    });
            
        }
        return filteredProjects.collect(intoJsonArray).toString();
    }

    /**
     * Call Collect's REST API to QUERY the database.
     * @param req
     * @param res
     * @return the JSON object for project with matching id or an empty
     */
    public String getProjectById(Request req, Response res) {
        String projectId = req.params(":id");
        if ("0".equals(projectId)) {
            JsonElement el = JsonUtils.readJsonFile("default-project.json");
            return el.toString();
        } else {
            JsonElement collectSurvey = getCollectSurvey(Integer.parseInt(projectId));
            return convertToCeoProject(collectSurvey.getAsJsonObject()).toString();
        }
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return JSON array of plot objects if numPlots < maxPlots.
    // Otherwise, select an evenly spaced sample of the plots of
    // size maxPlots.
    //
    // ==> "[{},{},{}]" where [].length <= maxPlots
    public String getProjectPlots(Request req, Response res) {
        int projectId = getIntParam(req, "id");
        int maxPlots = getIntParam(req, "max");
        String username = getLoggedUsername(req);
        JsonArray samplingPointItems = getCollectSamplingPointItems(projectId);
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
            JsonArray sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
            return convertToCeoRecord(username, projectId, itemObj, sampleItems, null);
        }).collect(intoJsonArray);

        return convertedItems.toString();
        //[{center: "{\"type\":\"Point\",\"coordinates\":[102.999640127073,22.0468074686287]}", id: 4289, flagged: false, analyses: 0, user: null,
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object with several computed integer fields
    //
    // ==> "{flaggedPlots:#,analyzedPlots:#,unanalyzedPlots:#,members:#,contributors:#}"
    public String getProjectStats(Request req, Response res) {
        int projectId = getIntParam(req, "id");
        Integer userId = getLoggedUserId(req);
        
        ProjectStats stats = new ProjectStats();
        
        int totalPlots = countCollectSamplingPointItems(projectId, 0, null);
        stats.setFlaggedPlots(countCollectSamplingPointItems(projectId, 0, Arrays.asList("true")));
        stats.setAnalyzedPlots(countCollectRecords(projectId, true, userId));
        stats.setUnanalyzedPlots(totalPlots - stats.getAnalyzedPlots() - stats.getFlaggedPlots());
        stats.setContributors(countCollectContributors(projectId));
        stats.setMembers(getProjectUsers(projectId).length);
        return JsonUtils.toJson(stats);
    }
    
    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object representing a randomly selected plot
    // with attributes flagged=false and analyses=0. If no such
    // plots exist in the database, return the string "done".
    //
    // ==> "{flagged:false,analyses:0,...}" | "done"
    public String getUnanalyzedPlot(Request req, Response res) {
        int projectId = getIntParam(req, "id");
        String username = getLoggedUsername(req);
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("username", username);
        JsonElement recordKeysEl = getFromCollect(format("survey/%d/sampling_point_data/unanalyzed/random", projectId), params);
        if (recordKeysEl.isJsonNull()) {
            return "done";
        } else {
            JsonArray recordKeysArray = recordKeysEl.getAsJsonArray();
            String plotId = recordKeysArray.get(0).getAsString();
            
            JsonObject existingRecordSummary = getTemporaryCollectRecordSummaryByPlotId(username, projectId, plotId);
            int recordId;
            if (existingRecordSummary == null) {
                int measurement = recordKeysArray.get(1).getAsInt();
                JsonObject collectRecord = createNewCollectRecord(projectId, username, plotId, measurement + 1);
                recordId = collectRecord.get("id").getAsInt();
            } else {
                recordId = existingRecordSummary.get("id").getAsInt();
            }
            JsonObject plotSamplingPointItem = getCollectPlotSamplingPointItem(projectId, plotId);
            JsonArray sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
            return convertToCeoRecord(username, projectId, plotSamplingPointItem, sampleItems, recordId).toString();
        }
    }

    public String getUnanalyzedPlotById(Request req, Response res) {
        int projectId = getIntParam(req, "projid");
        String plotId = getParam(req, "id");
        String username = getLoggedUsername(req);
        int count = getCollectRecordsCountByPlotId(username, projectId, plotId);
        if (count < MAX_PLOT_MEASUREMENTS) {
            JsonObject existingRecordSummary = getTemporaryCollectRecordSummaryByPlotId(username, projectId, plotId);
            int recordId;
            if (existingRecordSummary == null) {
                JsonObject collectRecord = createNewCollectRecord(projectId, username, plotId, count + 1);
                recordId = collectRecord.get("id").getAsInt();
            } else {
                recordId = existingRecordSummary.get("id").getAsInt();
            }
            JsonObject plotSamplingPointItem = getCollectPlotSamplingPointItem(projectId, plotId);
            JsonArray sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
            return convertToCeoRecord(username, projectId, plotSamplingPointItem, sampleItems, recordId).toString();
        } else {
            return "done";
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
    public HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
        int projectId = getIntParam(req, "id");
        String username = getLoggedUsername(req);
        
        JsonElement collectSurveyEl = getCollectSurvey(projectId);
        if (collectSurveyEl.isJsonNull()) {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        } else {
            JsonObject collectSurvey = collectSurveyEl.getAsJsonObject();
            JsonObject ceoProject = convertToCeoProject(collectSurvey);
            Map<String, String> sampleValueTranslations = getSampleValueTranslations(ceoProject);
            JsonArray plotPoints = getCollectSamplingPointItems(projectId);
            JsonArray plotSummaries = mapJsonArray(plotPoints,
                                               plot -> {
                                                   String plotUsername = ADMIN_USERNAME; //TODO
                                                   JsonObject plotSummary = new JsonObject();
                                                   String plotId = findElement(plot, "levelCodes[0]").getAsString();
                                                   plotSummary.addProperty("plot_id", plotId);
                                                   plotSummary.addProperty("center_lon", plot.get("x").getAsDouble());
                                                   plotSummary.addProperty("center_lat", plot.get("y").getAsDouble());
                                                   plotSummary.addProperty("size_m", ceoProject.get("plotSize").getAsDouble());
                                                   plotSummary.addProperty("shape", ceoProject.get("plotShape").getAsString());
                                                   plotSummary.addProperty("flagged", isFlagged(plot));
                                                   plotSummary.addProperty("analyses", getCollectRecordsCountByPlotId(username, projectId, plotId));
                                                   JsonArray samples = getCollectSamplingPointItems(projectId, plotId, false);
                                                   plotSummary.addProperty("sample_points", samples.size());
                                                   plotSummary.addProperty("user_id", plotUsername);
                                                   plotSummary.add("distribution", getValueDistribution(collectSurvey, username, projectId, plotId, samples, sampleValueTranslations));
                                                   return plotSummary;
                                               });

            String[] fields = {"plot_id", "center_lon", "center_lat", "size_m", "shape", "flagged", "analyses", "sample_points", "user_id"};
            String[] labels = getValueDistributionLabels(ceoProject);

            String csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase).collect(Collectors.joining(","));

            String csvContent = toStream(plotSummaries)
                    .map(plotSummary -> {
                            Stream<String> fieldStream = Arrays.stream(fields);
                            Stream<String> labelStream = Arrays.stream(labels);
                            JsonObject distribution = plotSummary.get("distribution").getAsJsonObject();
                            return Stream.concat(fieldStream.map(field -> plotSummary.get(field).isJsonNull() ? "" : plotSummary.get(field).getAsString()),
                                                 labelStream.map(label -> distribution.has(label) ? distribution.get(label).getAsString() : "0.0"))
                                         .collect(Collectors.joining(","));
                        })
                .collect(Collectors.joining("\n"));

            String projectName = ceoProject.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            String currentDate = LocalDate.now().toString();
            String outputFileName = "ceo-" + projectName + "-plot-data-" + currentDate;

            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        }
    }

    public HttpServletResponse dumpProjectRawData(Request req, Response res) {
        int projectId = getIntParam(req, "id");
        String username = getLoggedUsername(req);
        
        JsonElement collectSurveyEl = getCollectSurvey(projectId);
        if (collectSurveyEl.isJsonNull()) {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        } else {
            JsonObject collectSurvey = collectSurveyEl.getAsJsonObject();
            JsonObject ceoProject = convertToCeoProject(collectSurvey);
            Map<String, String> sampleValueTranslations = getSampleValueTranslations(ceoProject);
            JsonArray plotPoints = getCollectSamplingPointItems(projectId);
            JsonArray sampleSummaries = flatMapJsonArray(plotPoints,
                    plot -> {
                        String plotId = getMemberValue(plot, "levelCodes[0]", String.class);
                        JsonArray recordSummaries = getCollectRecordSummariesByPlotId(username, projectId, plotId, false, null, "CLEANSING");
                        boolean flagged = isFlagged(plot);
                        int analyses = recordSummaries.size();
                        JsonArray samplingPoints = getCollectSamplingPointItems(projectId, plotId, false);
                        JsonArray records = toStream(recordSummaries).map(recordSummary -> {
                            return getCollectRecord(projectId, recordSummary.getAsJsonObject().get("id").getAsInt());
                        }).collect(intoJsonArray);

                        return toStream(samplingPoints).flatMap(samplingPoint -> {
                            String subplotId = getMemberValue(samplingPoint, "levelCodes[1]", String.class);
                            if (records.size() == 0) {
                                //unanalyzed sampling point
                                JsonObject sampleSummary = new JsonObject();
                                sampleSummary.addProperty("plot_id", plotId);
                                sampleSummary.addProperty("sample_id", subplotId);
                                sampleSummary.add("lon", samplingPoint.get("x"));
                                sampleSummary.add("lat", samplingPoint.get("y"));
                                sampleSummary.addProperty("flagged", flagged);
                                sampleSummary.addProperty("analyses", analyses);
                                sampleSummary.addProperty("user_id", (String) null);
                                sampleSummary.addProperty("value", (String) null);
                                return Arrays.asList(sampleSummary).stream();
                            } else {
                                return toStream(records).map(collectRecord -> {
                                    JsonObject subplot = getCollectRecordSubplot(collectSurvey, collectRecord, subplotId);
                                    int valueDefId = getCollectSurveyNodeDefinitionId(collectSurvey, "subplot/values_1");
                                    String val = getCollectRecordAttributeValue(subplot, valueDefId);
                                    JsonObject sampleSummary = new JsonObject();
                                    sampleSummary.addProperty("plot_id", plotId);
                                    sampleSummary.addProperty("sample_id", subplotId);
                                    sampleSummary.add("lon", samplingPoint.get("x"));
                                    sampleSummary.add("lat", samplingPoint.get("y"));
                                    sampleSummary.addProperty("flagged", flagged);
                                    sampleSummary.addProperty("analyses", analyses);
                                    sampleSummary.addProperty("user_id", ADMIN_USERNAME); //TODO
                                    sampleSummary.addProperty("value", val);
                                    return sampleSummary;
                                });
                            }
                        });
                    }
            );

            JsonArray sampleValueGroups = ceoProject.get("sampleValues").getAsJsonArray();
            Map<Integer, String> sampleValueGroupNames = toStream(sampleValueGroups)
                .collect(Collectors.toMap(sampleValueGroup -> sampleValueGroup.get("id").getAsInt(),
                                          sampleValueGroup -> sampleValueGroup.get("name").getAsString(),
                                          (a, b) -> b));

            String[] fields = {"plot_id", "sample_id", "lon", "lat", "flagged", "analyses", "user_id"};
            String[] labels = sampleValueGroupNames.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(Map.Entry::getValue).toArray(String[]::new);

            String csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase).collect(Collectors.joining(","));

            String csvContent = toStream(sampleSummaries)
                .map(sampleSummary -> {
                        Stream<String> fieldStream = Arrays.stream(fields);
                        Stream<String> labelStream = Arrays.stream(labels);
                        return Stream.concat(fieldStream.map(field -> sampleSummary.get(field).isJsonNull() ? "" : sampleSummary.get(field).getAsString()),
                                             labelStream.map(label -> {
                                                     JsonElement value = sampleSummary.get("value");
                                                     if (value.isJsonNull()) {
                                                         return "";
                                                     } else if (value.isJsonPrimitive()) {
                                                         return sampleValueTranslations.getOrDefault(value.getAsString(), "LULC:NoValue").split(":")[1];
                                                     } else {
                                                         return value.getAsJsonObject().get(label).getAsString();
                                                     }}))
                                     .collect(Collectors.joining(","));
                    })
                .collect(Collectors.joining("\n"));

            String projectName = ceoProject.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            String currentDate = LocalDate.now().toString();
            String outputFileName = "ceo-" + projectName + "-sample-data-" + currentDate;

            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        }
    }

    private static JsonObject getValueDistribution(JsonObject collectSurvey, String username, int projectId, String plotId, 
            JsonArray samples, final Map<String, String> sampleValueTranslations) {
        JsonArray recordSummaries = getCollectRecordSummariesByPlotId(username, projectId, plotId, false, null, "CLEANSING");
        JsonArray records = toElementStream(recordSummaries)
                .map(s -> getCollectRecord(projectId, s.getAsJsonObject().get("id").getAsInt()))
                .collect(intoJsonArray);
        
        Map<String, Long> valueCounts = toStream(samples)
            .map(sample -> findElement(sample, "levelCodes[1]").getAsString())
            .map(subplotId -> {
                List<String> values = toStream(records)
                    .map(record -> {
                        JsonObject subplot = getCollectRecordSubplot(collectSurvey, record, subplotId);
                        int valueDefId = getCollectSurveyNodeDefinitionId(collectSurvey, "subplot/values_1");
                        String val = getCollectRecordAttributeValue(subplot, valueDefId);
                        return val;
                    })
                    .map(value -> sampleValueTranslations.getOrDefault(value, "NoValue"))
                    .collect(Collectors.toList());
                return values;
            }).flatMap(List::stream)
            .collect(countDistinct);
        JsonObject valueDistribution = new JsonObject();
        valueCounts.forEach((name, count) -> valueDistribution.addProperty(name, 100.0 * count / samples.size()));
        return valueDistribution;
    }
    
    // Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "published" for the
    // project with matching id. Return the empty string.
    //
    // ==> ""
    public synchronized String publishProject(Request req, Response res) {
        String projectId = req.params(":id");
        postToCollect("survey/publish/" + projectId);
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "closed" for the
    // project with matching id. Return the empty string.
    //
    // ==> ""
    public synchronized String closeProject(Request req, Response res) {
        String projectId = req.params(":id");
        postToCollect("survey/close/" + projectId);
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the availability attribute to "archived" and the
    // archived attribute to true for the project with matching
    // id. Return the empty string.
    //
    // ==> ""
    public synchronized String archiveProject(Request req, Response res) {
        String projectId = req.params(":id");
        postToCollect("survey/archive/" + projectId);
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
    public synchronized String addUserSamples(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        int projectId = jsonInputs.get("projectId").getAsInt();
        String plotId = jsonInputs.get("plotId").getAsString();
        String username = jsonInputs.get("userId").getAsString();
        Integer collectRecordId = getMemberValue(jsonInputs, "collectRecordId", Integer.class);
        
        JsonObject userSamples = jsonInputs.get("userSamples").getAsJsonObject();
        
        int currentAnalyses = getCollectRecordsCountByPlotId(username, projectId, plotId);
        
        JsonObject collectRecord; 
        if (collectRecordId == null) {
            collectRecord = createNewCollectRecord(projectId, username, plotId, currentAnalyses+1);
        } else {
            collectRecord = getCollectRecord(projectId, collectRecordId);
        }
        final int recordId = collectRecord.get("id").getAsInt();
        
        JsonObject survey = getCollectSurvey(projectId).getAsJsonObject();
        
        userSamples.entrySet().forEach(e -> {
            String sampleSubplotKey = e.getKey();
            JsonObject sampleValue = e.getValue().getAsJsonObject();
            
            JsonObject subplot = getCollectRecordSubplot(survey, collectRecord, sampleSubplotKey);

            JsonArray attributeUpdateCommands = sampleValue.entrySet().stream().map(sampleValueEntry -> {
                String codeListLabel = sampleValueEntry.getKey();
                JsonObject codeList = getCollectCodeListFromLabel(survey, codeListLabel);
                String codeListName = codeList.get("name").getAsString();
                String codeListItemLabel = sampleValueEntry.getValue().getAsString();
                String attrName = codeListName;
                String attrVal = getCollectCodeListItemCodeFromLabel(codeList, codeListItemLabel);
                return createAttributeUpdateCommand(projectId, survey, recordId, subplot,
                        format("subplot/%s", attrName), attrVal, username);
            }).collect(intoJsonArray);
            
            JsonObject attributeUpdateCommandsWrapper = new JsonObject();
            attributeUpdateCommandsWrapper.add("commands", attributeUpdateCommands);
            
            postToCollect("command/record/attributes", attributeUpdateCommandsWrapper);
            
            //TODO restore it when authentication token issue in Collect is fixed
            //postToCollect(format("survey/%d/data/records/promote/%d", projectId, recordId));
        });
        return "";
    }

    // Call Collect's REST API to MODIFY the database.
    //
    // Change the flagged attribute to true for the project with
    // matching id. Return the empty string.
    //
    // ==> ""
    public synchronized String flagPlot(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        int projectId = jsonInputs.get("projectId").getAsInt();
        String plotId = jsonInputs.get("plotId").getAsString();
        
        JsonObject samplingPointItem = getCollectSamplingPointItems(projectId, plotId, true).getAsJsonArray().get(0).getAsJsonObject();
        JsonArray infoAttributes = findElement(samplingPointItem, "infoAttributes").getAsJsonArray();
        infoAttributes.set(0, new JsonPrimitive(true));
        postToCollect(format("survey/%d/sampling_point_data", projectId), samplingPointItem);
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
    public synchronized String createProject(Request req, Response res) {
        try {
            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            // Read the input fields into a new JsonObject (NOTE: fields will be camelCased)
            JsonObject newProject = partsToJsonObject(req,
                                                      new String[]{"institution", "privacy-level", "lon-min", "lon-max", "lat-min",
                                                                   "lat-max", "base-map-source", "plot-distribution", "num-plots",
                                                                   "plot-spacing", "plot-shape", "plot-size", "sample-distribution",
                                                                   "samples-per-plot", "sample-resolution", "sample-values"});

            // Manually add the name and description fields since they may be invalid JSON
            newProject.addProperty("name", partToString(req.raw().getPart("name")));
            newProject.addProperty("description", partToString(req.raw().getPart("description")));

            JsonObject collectSurveyCreationParams = convertToCollectProjectParameters(newProject);
            
            //extract sampling points from plot distribution csv file
            if (newProject.get("plotDistribution").getAsString().equals("csv")) {
                InputStream plotDistributionIs = req.raw().getPart("plot-distribution-csv-file").getInputStream();
                AtomicInteger nextPlotId = new AtomicInteger(1);
                JsonArray plotSamplingPonints = new BufferedReader(new InputStreamReader(plotDistributionIs)).lines().skip(1).map(line -> {
                    JsonObject samplingPoint = new JsonObject();
                    samplingPoint.add("levelCodes", singletonArray(new JsonPrimitive(nextPlotId.getAndIncrement())));
                    samplingPoint.addProperty("srsId", "EPGS:4326");
                    String[] lineFields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                    samplingPoint.addProperty("y", lineFields[0]);
                    samplingPoint.addProperty("x", lineFields[1]);
                    return samplingPoint;
                }).collect(intoJsonArray);
                collectSurveyCreationParams.add("samplingPointsByLevel", singletonArray(plotSamplingPonints));
            }
            JsonObject newSurvey = postToCollect("survey/simple", collectSurveyCreationParams).getAsJsonObject();
            
            return newSurvey.get("id").getAsString();
        } catch (Exception e) {
            // Indicate that an error occurred with project creation
            throw new RuntimeException(e);
        }
    }
    
    private static JsonObject convertToCeoProject(JsonObject collectSurvey) {
        JsonObject p = new JsonObject();
        int projectId = collectSurvey.get("id").getAsInt();
        p.addProperty("id", projectId);
        p.add("name", collectSurvey.get("projectName"));
        p.add("description", collectSurvey.get("description"));
        p.addProperty("institution", getMemberValue(collectSurvey, "userGroup.id", Integer.class));
        p.addProperty("availability", collectSurvey.get("availability").getAsString().toLowerCase());
        String collectSurveyPrivacyLevel = collectSurvey.get("privacyLevel").getAsString().toLowerCase();
        p.addProperty("privacyLevel", collectSurveyPrivacyLevel.equals("group") ? "institution": collectSurveyPrivacyLevel);
        JsonElement ceoApplicationOptionsEl = collectSurvey.get("ceoApplicationOptions");
        if (! ceoApplicationOptionsEl.isJsonNull()) {
            JsonObject ceoApplicationOptions = ceoApplicationOptionsEl.getAsJsonObject();
            p.add("baseMapSource", ceoApplicationOptions.get("baseMapSource"));
            
            JsonObject samplingPointDataConfiguration = ceoApplicationOptions.get("samplingPointDataConfiguration").getAsJsonObject();
            
            JsonObject boundary = new JsonObject();
            boundary.addProperty("type", "Polygon");
            JsonArray coordinates = Stream.iterate(0, i -> i + 1).limit(4)
                .map(i -> {
                    JsonArray coordinate = new JsonArray();
                    coordinate.add(findElement(samplingPointDataConfiguration, format("aoiBoundary[%d].x", i)));
                    coordinate.add(findElement(samplingPointDataConfiguration, format("aoiBoundary[%d].y", i)));
                    return coordinate;
                }).collect(intoJsonArray);
            JsonArray coordinatesWrapper = new JsonArray();
            coordinatesWrapper.add(coordinates);
            boundary.add("coordinates", coordinatesWrapper);
            p.addProperty("boundary", boundary.toString());

            JsonObject plotLevelSettings = findElement(samplingPointDataConfiguration, "levelsSettings[0]").getAsJsonObject();
            JsonObject samplePointLevelSettings = findElement(samplingPointDataConfiguration, "levelsSettings[1]").getAsJsonObject();
            
            p.addProperty("plotDistribution", plotLevelSettings.get("distribution").getAsString().toLowerCase());
            p.addProperty("numPlots", plotLevelSettings.get("numPoints").getAsInt());
            p.add("plotSpacing", plotLevelSettings.get("resolution"));
            p.addProperty("plotShape", plotLevelSettings.get("shape").getAsString().toLowerCase());
            p.addProperty("plotSize", plotLevelSettings.get("pointWidth").getAsInt());
            
            p.addProperty("sampleDistribution", samplePointLevelSettings.get("distribution").getAsString().toLowerCase());
            p.addProperty("samplesPerPlot", samplePointLevelSettings.get("numPoints").getAsInt());
            p.add("sampleResolution", samplePointLevelSettings.get("resolution"));
        }
        
        JsonArray codeLists = collectSurvey.get("codeLists").getAsJsonArray();
        JsonArray sampleValuesList = toElementStream(codeLists)
            .filter(codeListEl -> ((JsonObject) codeListEl).get("name").getAsString().startsWith("values_"))
            .map(codeListEl -> {
                JsonObject codeListObj = (JsonObject) codeListEl;
                
                JsonObject result = new JsonObject();
                result.add("id", codeListObj.get("id"));
                result.add("name", codeListObj.get("label"));
                
                JsonArray sampleValues = toElementStream(codeListObj.get("items").getAsJsonArray()).map(item -> {
                    JsonObject obj = (JsonObject) item;
                    JsonObject sampleValue = new JsonObject();
                    sampleValue.add("id", obj.get("id"));
                    sampleValue.add("code", obj.get("code"));
                    sampleValue.add("name", obj.get("label"));
                    sampleValue.addProperty("color", "#" + obj.get("color").getAsString());
                    return sampleValue;
                }).collect(intoJsonArray);
                
                result.add("values", sampleValues);
                return result;
            }).collect(intoJsonArray);
        
        p.add("sampleValues", sampleValuesList);
        p.addProperty("attribution", "DigitalGlobe Maps API: Recent Imagery+Streets | June 2015 | © DigitalGlobe, Inc");
        p.addProperty("archived", "archived".equalsIgnoreCase(collectSurvey.get("availability").getAsString()));
        p.addProperty("numPlots", countCollectSamplingPointItems(projectId, 0, null));
        p.addProperty("creationDate", getDateAsString(collectSurvey, "creationDate"));
        p.addProperty("publishedDate", getDateAsString(collectSurvey, "publishedDate"));
        p.addProperty("archivedDate", getDateAsString(collectSurvey, "archivedDate"));
        p.addProperty("closedDate", getDateAsString(collectSurvey, "closedDate"));
        return p;
    }
    
    private static JsonObject convertToCeoRecord(String username, int projectId, JsonObject plotSamplingItem, 
            JsonArray sampleItems, Integer recordId) {
        String plotId = findElement(plotSamplingItem, "levelCodes[0]").getAsString();
        JsonObject obj = new JsonObject();
        obj.addProperty("id", plotId);
        if (recordId != null) {
            obj.addProperty("collectRecordId", recordId);
        }
        obj.add("center", createPointObject(plotSamplingItem.get("x").getAsDouble(), plotSamplingItem.get("y").getAsDouble()));
        
        boolean flagged = isFlagged(plotSamplingItem);
        
        obj.addProperty("flagged", flagged);
        obj.addProperty("analyses", getCollectRecordsCountByPlotId(username, projectId, plotId));
        obj.addProperty("user", username); //TODO
        
        JsonArray samples = toElementStream(sampleItems).map(item -> {
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

    private static JsonObject convertToCollectProjectParameters(JsonObject ceoProject) {
        JsonObject data = new JsonObject();
        data.addProperty("target", COLLECT_EARTH_ONLINE_TARGET);
        data.addProperty("projectName", ceoProject.get("name").getAsString());
        data.add("description", ceoProject.get("description"));
        data.addProperty("userGroupId", ceoProject.get("institution").getAsLong());
        String ceoPrivacyLevel = ceoProject.get("privacyLevel").getAsString();
        data.addProperty("privacyLevel", (ceoPrivacyLevel.equals("institution") ? "group": ceoPrivacyLevel).toUpperCase(Locale.ENGLISH));
        
        JsonObject ceoSettings = new JsonObject();
        ceoSettings.add("baseMapSource", ceoProject.get("baseMapSource"));
        data.add("ceoSettings", ceoSettings);
        
        JsonObject samplingPointGenerationData = new JsonObject();

        JsonArray aoiBoundary = extractAoiBoundaryData(ceoProject);
        samplingPointGenerationData.add("aoiBoundary", aoiBoundary);

        JsonArray samplingPointSettings = new JsonArray();
        JsonObject plotLevelSettings = new JsonObject();
        plotLevelSettings.add("numPoints", ceoProject.get("numPlots"));
        plotLevelSettings.addProperty("shape", ceoProject.get("plotShape").getAsString().toUpperCase());
        plotLevelSettings.addProperty("distribution", ceoProject.get("plotDistribution").getAsString().toUpperCase());
        plotLevelSettings.add("resolution", ceoProject.get("plotSpacing"));
        plotLevelSettings.addProperty("pointShape", ceoProject.get("plotShape").getAsString().toUpperCase());
        plotLevelSettings.add("pointWidth", ceoProject.get("plotSize"));
        samplingPointSettings.add(plotLevelSettings);

        JsonObject sampleLevelSettings = new JsonObject();
        sampleLevelSettings.add("numPoints", ceoProject.get("samplesPerPlot"));
        sampleLevelSettings.addProperty("shape", "CIRCLE");
        sampleLevelSettings.addProperty("distribution", ceoProject.get("sampleDistribution").getAsString().toUpperCase());
        sampleLevelSettings.add("resolution", ceoProject.get("sampleResolution"));
        sampleLevelSettings.addProperty("pointShape", "CIRCLE");
        sampleLevelSettings.addProperty("pointWidth", SAMPLE_POINT_WIDTH_M);
        samplingPointSettings.add(sampleLevelSettings);
        
        samplingPointGenerationData.add("levelsSettings", samplingPointSettings);

        data.add("samplingPointGenerationSettings", samplingPointGenerationData);

        JsonArray sampleValueLists = ceoProject.get("sampleValues").getAsJsonArray();
        JsonArray codeLists = toElementStream(sampleValueLists).map(sampleValueList -> {
            JsonObject sampleValueListObj = (JsonObject) sampleValueList;
            JsonObject codeList = new JsonObject();
            codeList.addProperty("label", sampleValueListObj.get("name").getAsString());
            
            JsonArray values = sampleValueListObj.get("values").getAsJsonArray();
            JsonArray codeListItems = toElementStream(values).map(valEl -> {
                JsonObject valObj = valEl.getAsJsonObject();
                JsonObject item = new JsonObject();
                item.addProperty("label", valObj.get("name").getAsString());
                item.addProperty("color", valObj.get("color").getAsString().substring(1));
                return item;
            }).collect(intoJsonArray);
            
            codeList.add("items", codeListItems);
            return codeList;
        }).collect(intoJsonArray);
        
        data.add("codeLists", codeLists);
        return data;
    }

    private static JsonArray extractAoiBoundaryData(JsonObject jsonObj) {
        JsonArray result = new JsonArray();
        result.add(extractCoordinateData(jsonObj, "latMin", "lonMax"));
        result.add(extractCoordinateData(jsonObj, "latMin", "lonMin"));
        result.add(extractCoordinateData(jsonObj, "latMax", "lonMin"));
        result.add(extractCoordinateData(jsonObj, "latMax", "lonMax"));
        return result;
    }

    private static JsonObject extractCoordinateData(JsonObject jsonObj, String latMember, String lonMember) {
        JsonObject data = new JsonObject();
        data.addProperty("x", jsonObj.get(lonMember).getAsDouble());
        data.addProperty("y", jsonObj.get(latMember).getAsDouble());
        data.addProperty("srsId", "EPSG:4326");
        return data;
    }
    
    //COLLECT API HELPER FUNCTIONS
    private static JsonElement getCollectSurvey(int surveyId) {
        String url = "survey/" + surveyId;
        return getFromCollect(url);
    }

    private static int getCollectSurveyNodeDefinitionId(JsonObject collectSurvey, String nodePath) {
        JsonObject currentObj = findElement(collectSurvey, "schema.rootEntities[0]").getAsJsonObject();
        String[] pathParts = nodePath.split("/");
        for (String pathPart : pathParts) {
            JsonArray currentChildrenDefs = findElement(currentObj, "children").getAsJsonArray();
            currentObj = filterJsonArray(currentChildrenDefs, o -> pathPart.equals(o.get("name").getAsString()))
                    .get(0).getAsJsonObject();
        };
        return currentObj.get("id").getAsInt();
    }
    

    private static JsonObject getCollectCodeListFromLabel(JsonObject survey, String codeListLabel) {
        JsonArray codeLists = survey.get("codeLists").getAsJsonArray();
        JsonObject codeList = filterJsonArray(codeLists, l -> codeListLabel.equals(getMemberValue(l, "label", String.class))).get(0).getAsJsonObject();
        return codeList;
    }
    
    private static String getCollectCodeListItemCodeFromLabel(JsonObject codeList, String codeListItemLabel) {
        JsonArray codeListItems = codeList.get("items").getAsJsonArray();
        JsonObject codeListItem = filterJsonArray(codeListItems, i -> i.get("label").getAsString().equals(codeListItemLabel)).get(0).getAsJsonObject();
        return codeListItem.get("code").getAsString();
    }

    private static JsonObject getCollectRecord(int surveyId, int recordId) {
        return getFromCollect(format("survey/%s/data/records/%s", surveyId, recordId)).getAsJsonObject();
    }
    
    private static JsonArray getCollectRecordSummariesByPlotId(String username, int projectId, String plotId, 
            boolean onlyOwnedRecords, String step, String stepGreaterOrEqualTo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("username", username);
        params.put("keyValues[0]", plotId);
        params.put("sortFields[0].field", "KEY2");
        params.put("onlyOwnedRecords", onlyOwnedRecords);
        params.put("stepGreaterOrEqualTo", stepGreaterOrEqualTo);
        JsonObject fromCollect = getFromCollect(format("survey/%d/data/records/summary", projectId), params).getAsJsonObject();
        JsonArray plotSummaries = fromCollect.get("records").getAsJsonArray();
        return plotSummaries;
    }
    
    private static JsonObject getTemporaryCollectRecordSummaryByPlotId(String username, int projectId, String plotId) {
        JsonArray summaries = getCollectRecordSummariesByPlotId(username, projectId, plotId, true, "ENTRY", null);
        return summaries.isJsonNull() || summaries.size() == 0 ? null : summaries.get(0).getAsJsonObject();
    }

    private static int getCollectRecordsCountByPlotId(String username, int projectId, String plotId) {
        JsonArray summaries = getCollectRecordSummariesByPlotId(username, projectId, plotId, false, null, "CLEANSING");
        return summaries.size();
    }
    
    private static boolean isFlagged(JsonObject samplingPointItem) {
        return Boolean.TRUE.equals(getMemberValue(samplingPointItem, "infoAttributes[0]", Boolean.class));
    }

    private static JsonObject createPointObject(double x, double y) {
        JsonObject o = new JsonObject();
        o.add("type", new JsonPrimitive("Point"));
        JsonArray coordinates = new JsonArray();
        coordinates.add(x);
        coordinates.add(y);
        o.add("coordinates", coordinates);
        return o;
    }
    
    private static JsonArray getCollectSamplingPointItems(int projectId) {
        return getCollectSamplingPointItems(projectId, null, true);
    }
    
    private static JsonArray getCollectSamplingPointItems(int projectId, String plotId, boolean onlyParentItem) {
        HashMap<String, Object> params = new HashMap<String, Object>();
        if (plotId != null) {
            params.put("parent_keys", plotId);
        }
        params.put("only_parent_item", onlyParentItem);
        JsonArray sampleItems = getFromCollect(format("survey/%d/sampling_point_data", projectId), params)
                .getAsJsonArray();
        return sampleItems;
    }
    
    private static JsonObject getCollectPlotSamplingPointItem(int projectId, String plotId) {
        JsonArray plotSamplingPointItems = getCollectSamplingPointItems(projectId, plotId, true);
        return plotSamplingPointItems.get(0).getAsJsonObject();
    }

    private static int countCollectSamplingPointItems(int projectId, int levelIndex, List<String> infoAttributes) {
        HashMap<String, Object> params = new HashMap<String, Object>();
        params.put("level", levelIndex);
        params.put("info_attributes", infoAttributes);
        int count = getFromCollect(format("survey/%d/count/sampling_point_data", projectId), params).getAsInt();
        return count;
    }
    
    private static int countCollectRecords(int projectId, boolean ignoreMeasurements, Integer userId) {
        HashMap<String, Object> params = new HashMap<String, Object>();
        params.put("ignore_measurements", ignoreMeasurements);
        params.put("user_id", userId);
        int count = getFromCollect(format("survey/%d/data/count/records", projectId), params).getAsInt();
        return count;
    }

    private static JsonObject createNewCollectRecord(int projectId, String username, String plotId, int measurement) {
        Map<String, Object> newRecordParams = new HashMap<String, Object>();
        newRecordParams.put("username", username);
        newRecordParams.put("recordKey", Arrays.asList(plotId, measurement));
        newRecordParams.put("addSecondLevelEntities", true);
        JsonObject newRecord = postToCollect(String.format("survey/%s/data/records", projectId), newRecordParams).getAsJsonObject();
        return newRecord;
    }
    
    private static int countCollectContributors(int projectId) {
        HashMap<String, Object> params = new HashMap<String, Object>();
        int count = getFromCollect(format("survey/%d/data/count/contributors", projectId), params).getAsInt();
        return count;
    }

    private static JsonObject getCollectRecordSubplot(JsonObject survey, JsonObject record, String subplotId) {
        int subplotNodeDefId = getCollectSurveyNodeDefinitionId(survey, "subplot");
        JsonArray subplots = findElement(record,
                format("rootEntity.childrenByDefinitionId.%d", subplotNodeDefId)).getAsJsonArray();
        
        JsonObject subplot = toElementStream(subplots).filter(s -> {
            int subplotKeyDefId = getCollectSurveyNodeDefinitionId(survey, "subplot/subplot_id");
            String subplotKey = getCollectRecordAttributeValue((JsonObject) s, subplotKeyDefId);
            return subplotKey.equals(subplotId);
        }).collect(intoJsonArray).get(0).getAsJsonObject();
        return subplot;
    }
    
    private static JsonObject getCollectRecordAttribute(JsonObject parentEntity, int attrDefId) {
        return findElement(parentEntity, format("childrenByDefinitionId.%d[0]", attrDefId)).getAsJsonObject();
    }
    
    private static String getCollectRecordAttributeValue(JsonObject parentEntity, int attrDefId) {
        JsonObject attr = getCollectRecordAttribute(parentEntity, attrDefId);
        JsonElement valEl = findElement(attr, "fields[0].value");
        return valEl.isJsonNull() ? null : valEl.getAsString();
    }
    
    private static JsonObject createAttributeUpdateCommand(int projectId, JsonObject survey, int recordId,
            JsonObject parentEntity, String attributeDefPath, String value, String username) {
        JsonObject command = new JsonObject();
        
        int valueAttrDefId = getCollectSurveyNodeDefinitionId(survey, attributeDefPath);
        JsonObject valueAttr = getCollectRecordAttribute(parentEntity, valueAttrDefId);
        command.addProperty("username", username);
        command.addProperty("surveyId", projectId);
        command.addProperty("recordId", recordId);
        command.addProperty("nodeDefId", valueAttrDefId);
        command.addProperty("nodePath", valueAttr.get("path").getAsString());
        command.addProperty("parentEntityPath", parentEntity.get("path").getAsString());
        command.addProperty("attributeType", "CODE");
        JsonObject valueByField = new JsonObject();
        valueByField.addProperty("code", value);
        command.add("valueByField", valueByField);
        return command;
    }
    
    private static String[] getProjectUsers(int projectId) {
        JsonElement collectSurvey = getCollectSurvey(projectId);
        JsonObject project = convertToCeoProject(collectSurvey.getAsJsonObject());
            
        boolean archived = project.get("archived").getAsBoolean();
        String privacyLevel = project.get("privacyLevel").getAsString();
        String availability = project.get("availability").getAsString();
        String institutionId = project.get("institution").getAsString();
        if (archived == true) {
            // return no users
            return new String[]{};
        } else if (privacyLevel.equals("public")) {
            // return all users
            JsonArray users = OfUsers.getAllUsers(institutionId);
            return toStream(users).map(user -> user.get("id").getAsString()).toArray(String[]::new);
        } else {
            JsonArray institutions = (new OfGroups()).getAllInstitutions(null);
            Optional<JsonObject> matchingInstitution = findInJsonArray(institutions,
                                                                       institution ->
                                                                       institution.get("id").getAsString().equals(institutionId));
            if (matchingInstitution.isPresent()) {
                JsonObject institution = matchingInstitution.get();
                JsonArray admins = institution.getAsJsonArray("admins");
                JsonArray members = institution.getAsJsonArray("members");
                if (privacyLevel.equals("private")) {
                    // return all institution admins
                    return toElementStream(admins).map(element -> element.getAsString()).toArray(String[]::new);
                } else if (privacyLevel.equals("institution")) {
                    if (availability.equals("published")) {
                        // return all institution members
                        return toElementStream(members).map(element -> element.getAsString()).toArray(String[]::new);
                    } else {
                        // return all institution admins
                        return toElementStream(admins).map(element -> element.getAsString()).toArray(String[]::new);
                    }
                } else {
                    // FIXME: Implement this branch when privacyLevel.equals("invitation") is possible
                    // return no users
                    return new String[]{};
                }
            } else {
                // return no users
                return new String[]{};
            }
        }
    }
    
    //START OF Projects.java common functions
    private static Map<String, String> getSampleValueTranslations(JsonObject project) {
        JsonArray sampleValueGroups = project.get("sampleValues").getAsJsonArray();
        JsonObject firstGroup = sampleValueGroups.get(0).getAsJsonObject();
        String firstGroupName = firstGroup.get("name").getAsString();
        return toStream(firstGroup.get("values").getAsJsonArray())
            .collect(Collectors.toMap(sampleValue -> sampleValue.get("code").getAsString(),
                                      sampleValue -> firstGroupName + ":" + sampleValue.get("name").getAsString(),
                                      (a, b) -> b));
    }

    private static String[] getValueDistributionLabels(JsonObject project) {
        JsonArray sampleValueGroups = project.get("sampleValues").getAsJsonArray();
        return toStream(sampleValueGroups)
            .flatMap(group -> {
                    JsonArray sampleValues = group.get("values").getAsJsonArray();
                    return toStream(sampleValues).map(sampleValue -> group.get("name").getAsString() + ":" + sampleValue.get("name").getAsString());
                })
            .toArray(String[]::new);
    }

    private static HttpServletResponse writeCsvFile(HttpServletResponse response, String header, String content,
                                                    String outputFileName) {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=" + outputFileName + ".csv");
        
        try(OutputStream os = response.getOutputStream()) {
            os.write((header + "\n").getBytes());
            os.write(content.getBytes());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        return response;
    }
    
    private static Collector<String, ?, Map<String, Long>> countDistinct =
            Collectors.groupingBy(Function.identity(), Collectors.counting());

    private static String getLoggedUsername(Request req) {
        HttpSession session = req.raw().getSession();
        String username = (String) session.getAttribute("username");
        return username;
    }

    private static Integer getLoggedUserId(Request req) {
        HttpSession session = req.raw().getSession();
        String userIdStr = (String) session.getAttribute("userid");
        if (isBlank(userIdStr)) {
            return null;
        } else {
            Integer userId = Integer.parseInt(userIdStr);
            return userId;
        }
    }

    //END OF Projects.java common functions

}
