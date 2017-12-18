package org.openforis.ceo;

import static java.lang.String.format;
import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.Collect.getFromCollect;
import static org.openforis.ceo.Collect.postToCollect;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findElement;
import static org.openforis.ceo.JsonUtils.flatMapJsonArray;
import static org.openforis.ceo.JsonUtils.forEachInJsonArray;
import static org.openforis.ceo.JsonUtils.getMemberValue;
import static org.openforis.ceo.JsonUtils.intoJsonArray;
import static org.openforis.ceo.JsonUtils.mapJsonArray;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.singletonArray;
import static org.openforis.ceo.JsonUtils.toElementStream;
import static org.openforis.ceo.JsonUtils.toStream;
import static org.openforis.ceo.PartUtils.partToString;
import static org.openforis.ceo.PartUtils.partsToJsonObject;
import static org.openforis.ceo.RequestUtils.getIntParam;
import static org.openforis.ceo.RequestUtils.getParam;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.servlet.MultipartConfigElement;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

import spark.Request;
import spark.Response;

public class CollectProjects {

    private static final String ADMIN_USERNAME = "admin@openforis.org";
    private static final int MAX_PLOT_MEASUREMENTS = 3;
    private static final double SAMPLE_POINT_WIDTH_M = 10.0d;

    /**
     * Call Collect's REST API to QUERY the database.
     * @param req
     * @param res
     * @return the JSON array of JSON objects (one per project) that match the relevant query filters
     */
    public static String getAllProjects(Request req, Response res) {
        String username = getLoggedUsername(req);
        String institutionId = req.queryParams("institutionId");
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("username", username);
        params.put("groupId", institutionId);
        params.put("includeTemporary", true);
        params.put("full", true);
        params.put("includeCodeListValues", true);
        
        JsonArray allSurveys = getFromCollect("survey", params).getAsJsonArray();
        JsonArray result = toElementStream(allSurveys)
            .map(s -> convertToCeoProject((JsonObject) s))
            .collect(intoJsonArray);
        return result.toString();
    }

    /**
     * Call Collect's REST API to QUERY the database.
     * @param req
     * @param res
     * @return the JSON object for project with matching id or an empty
     */
    public static String getProjectById(Request req, Response res) {
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
    public static String getProjectPlots(Request req, Response res) {
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
            return convertToCeoRecord(username, projectId, itemObj, sampleItems);
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
        int projectId = getIntParam(req, "id");
        String username = getLoggedUsername(req);
        JsonArray samplingPointItems = getCollectSamplingPointItems(projectId);
        
        final Set<Integer> contributorIds = new HashSet<Integer>();
        
        ProjectStats stats = new ProjectStats();
        
        forEachInJsonArray(samplingPointItems, item -> {
            boolean flagged = isFlagged(item);
            if (flagged) {
                stats.flaggedPlots++;
            }
            String plotId = item.get("id").getAsString();
            JsonArray recordSummaries = getCollectRecordSummariesByPlotId(username, projectId, plotId);
            if (recordSummaries.size() == 0) {
                stats.unanalyzedPlots++;
            } else {
                stats.analyzedPlots++;
                
                toElementStream(recordSummaries).forEach(summary -> {
                    contributorIds.add(findElement((JsonObject) summary, "modifiedBy.id").getAsInt());
                });
            }
            stats.contributors = contributorIds.size();
        });
        return JsonUtils.toJson(stats);
    }
    
    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object representing a randomly selected plot
    // with attributes flagged=false and analyses=0. If no such
    // plots exist in the database, return the string "done".
    //
    // ==> "{flagged:false,analyses:0,...}" | "done"
    public static String getUnanalyzedPlot(Request req, Response res) {
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
            JsonArray plotSamplingPointItems = getCollectSamplingPointItems(projectId, plotId, true);
            JsonObject plotSamplingPointItem = plotSamplingPointItems.get(0).getAsJsonObject();
            JsonArray sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
            return convertToCeoRecord(username, projectId, plotSamplingPointItem, sampleItems).toString();
        }
    }

    public static String getUnanalyzedPlotByID(Request req, Response res) {
        int projectId = getIntParam(req, "projid");
        String plotId = getParam(req, "id");
        String username = getLoggedUsername(req);
        JsonArray summaries = getCollectRecordSummariesByPlotId(username, projectId, plotId);
        if (summaries.size() < MAX_PLOT_MEASUREMENTS) {
            Map<String, Object> params = new HashMap<String, Object>();
            params.put("username", username);
            params.put("addSecondLevelEntities", true);
            params.put("recordKey", Arrays.asList(plotId));
            JsonArray plotSamplingPointItems = getCollectSamplingPointItems(projectId, plotId, true);
            JsonObject plotSamplingPointItem = plotSamplingPointItems.get(0).getAsJsonObject();
            JsonArray sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
            return convertToCeoRecord(username, projectId, plotSamplingPointItem, sampleItems).toString();
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
    public static HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
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

            Stream<String> contentStream = toStream(plotSummaries)
                    .map(plotSummary -> {
                            Stream<String> fieldStream = Arrays.stream(fields);
                            Stream<String> labelStream = Arrays.stream(labels);
                            JsonObject distribution = plotSummary.get("distribution").getAsJsonObject();
                            return Stream.concat(fieldStream.map(field -> plotSummary.get(field).isJsonNull() ? "" : plotSummary.get(field).getAsString()),
                                                 labelStream.map(label -> distribution.has(label) ? distribution.get(label).getAsString() : "0.0"))
                                         .collect(Collectors.joining(","));
                        });
            
            String projectName = ceoProject.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            String currentDate = LocalDate.now().toString();
            String outputFileName = "ceo-" + projectName + "-" + currentDate + ".csv";

            HttpServletResponse response = res.raw();
            writeCsvFile(response, csvHeader, contentStream, outputFileName); 
            
            return response;
        }
    }

    public static HttpServletResponse dumpProjectRawData(Request req, Response res) {
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
                        JsonArray recordSummaries = getCollectRecordSummariesByPlotId(username, projectId, plotId);
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

            Stream<String> contentStream = toStream(sampleSummaries)
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
                    });

            String projectName = ceoProject.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            String currentDate = LocalDate.now().toString();
            String outputFileName = "ceo-" + projectName + "-raw-" + currentDate + ".csv";

            HttpServletResponse response = res.raw();
            writeCsvFile(response, csvHeader, contentStream, outputFileName); 
            
            return response;
        }
    }

    private static JsonObject getValueDistribution(JsonObject collectSurvey, String username, int projectId, String plotId, 
            JsonArray samples, final Map<String, String> sampleValueTranslations) {
        JsonArray recordSummaries = getCollectRecordSummariesByPlotId(username, projectId, plotId);
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
    public static synchronized String publishProject(Request req, Response res) {
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
    public static synchronized String closeProject(Request req, Response res) {
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
    public static synchronized String archiveProject(Request req, Response res) {
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
    public static synchronized String addUserSamples(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        int projectId = jsonInputs.get("projectId").getAsInt();
        String plotId = jsonInputs.get("plotId").getAsString();
        String username = jsonInputs.get("userId").getAsString();
        
        JsonObject userSamples = jsonInputs.get("userSamples").getAsJsonObject();
        
        int currentAnalyses = getCollectRecordsCountByPlotId(username, projectId, plotId);
        
        Map<String, Object> newRecordParams = new HashMap<String, Object>();
        newRecordParams.put("username", username);
        newRecordParams.put("recordKey", Arrays.asList(plotId, currentAnalyses+1));
//        newRecordParams.put("recordKey[1]", currentAnalyses+1);
        newRecordParams.put("addSecondLevelEntities", true);
        JsonObject newRecord = postToCollect(String.format("survey/%s/data/records", projectId), newRecordParams).getAsJsonObject();
        int recordId = newRecord.get("id").getAsInt();
        
        JsonObject survey = getCollectSurvey(projectId).getAsJsonObject();
        
        userSamples.entrySet().forEach(e -> {
            String sampleSubplotKey = e.getKey();
            JsonObject sampleValue = e.getValue().getAsJsonObject();
            
            JsonObject subplot = getCollectRecordSubplot(survey, newRecord, sampleSubplotKey);

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
        p.addProperty("id", collectSurvey.get("id").getAsInt());
        p.add("name", collectSurvey.get("projectName"));
        p.add("description", collectSurvey.get("description"));
        p.addProperty("institution", getMemberValue(collectSurvey, "userGroup.id", Integer.class));
        p.addProperty("availability", collectSurvey.get("availability").getAsString().toLowerCase());
        p.addProperty("privacyLevel","public"); //TODO
        JsonElement ceoApplicationOptionsEl = collectSurvey.get("ceoApplicationOptions");
        if (! ceoApplicationOptionsEl.isJsonNull()) {
            JsonObject ceoApplicationOptions = ceoApplicationOptionsEl.getAsJsonObject();
            p.add("baseMapSource", ceoApplicationOptions.get("baseMapSource"));
            p.add("imageryYear", ceoApplicationOptions.get("imageryYear"));
            p.add("stackingProfile", ceoApplicationOptions.get("stackingProfile"));
            
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
            p.addProperty("plotShape", samplePointLevelSettings.get("shape").getAsString().toLowerCase());
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
                    sampleValue.add("color", obj.get("color"));
                    return sampleValue;
                }).collect(intoJsonArray);
                
                result.add("values", sampleValues);
                return result;
            }).collect(intoJsonArray);
        
        p.add("sampleValues", sampleValuesList);
        p.addProperty("attribution", "DigitalGlobe Maps API: Recent Imagery+Streets | June 2015 | © DigitalGlobe, Inc");
        p.addProperty("archived", "archived".equalsIgnoreCase(collectSurvey.get("availability").getAsString()));
        return p;
    }
    
    private static JsonObject convertToCeoRecord(String username, int projectId, JsonObject plotSamplingItem, JsonArray sampleItems) {
        String plotId = findElement(plotSamplingItem, "levelCodes[0]").getAsString();
        JsonObject obj = new JsonObject();
        obj.addProperty("id", plotId);
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
        data.addProperty("projectName", ceoProject.get("name").getAsString());
        data.add("description", ceoProject.get("description"));
        data.addProperty("userGroupId", ceoProject.get("institution").getAsLong());
        
        JsonObject ceoSettings = new JsonObject();
        ceoSettings.add("baseMapSource", ceoProject.get("baseMapSource"));
        ceoSettings.add("imageryYear", ceoProject.get("imageryYear"));
        ceoSettings.add("stackingProfile", ceoProject.get("stackingProfile"));
        data.add("ceoSettings", ceoSettings);
        
        JsonObject samplingPointGenerationData = new JsonObject();

        JsonArray aoiBoundary = extractAoiBoundaryData(ceoProject);
        samplingPointGenerationData.add("aoiBoundary", aoiBoundary);

        JsonArray samplingPointSettings = new JsonArray();
        JsonObject plotLevelSettings = new JsonObject();
        plotLevelSettings.add("numPoints", ceoProject.get("numPlots"));
        plotLevelSettings.addProperty("shape", "SQUARE"); //aoi is always a square
        plotLevelSettings.addProperty("distribution", ceoProject.get("plotDistribution").getAsString().toUpperCase());
        plotLevelSettings.add("resolution", ceoProject.get("plotSpacing"));
        plotLevelSettings.add("pointWidth", ceoProject.get("plotSize"));
        samplingPointSettings.add(plotLevelSettings);

        JsonObject sampleLevelSettings = new JsonObject();
        sampleLevelSettings.add("numPoints", ceoProject.get("samplesPerPlot"));
        sampleLevelSettings.addProperty("shape", ceoProject.get("plotShape").getAsString().toUpperCase());
        sampleLevelSettings.addProperty("distribution", ceoProject.get("sampleDistribution").getAsString().toUpperCase());
        sampleLevelSettings.add("resolution", ceoProject.get("sampleResolution"));
        sampleLevelSettings.addProperty("pointWidth", SAMPLE_POINT_WIDTH_M);
        samplingPointSettings.add(sampleLevelSettings);
        
        samplingPointGenerationData.add("levelsSettings", samplingPointSettings);

        data.add("samplingPointGenerationSettings", samplingPointGenerationData);

        JsonArray sampleValueLists = ceoProject.get("sampleValues").getAsJsonArray();
        JsonArray codeLists = toElementStream(sampleValueLists).map(sampleValueList -> {
            JsonObject sampleValueListObj = (JsonObject) sampleValueList;
            JsonObject codeList = new JsonObject();
            codeList.addProperty("name", sampleValueListObj.get("name").getAsString());
            
            JsonArray values = sampleValueListObj.get("values").getAsJsonArray();
            JsonArray codeListItems = toElementStream(values).map(valEl -> {
                JsonObject valObj = valEl.getAsJsonObject();
                JsonObject item = new JsonObject();
                item.addProperty("label", valObj.get("name").getAsString());
                item.addProperty("color", valObj.get("color").getAsString());
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
    
    private static JsonArray getCollectRecordSummariesByPlotId(String username, int projectId, String plotId) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("username", username);
        params.put("keyValues[0]", plotId);
        params.put("sortFields[0].field", "KEY2");
        JsonObject fromCollect = getFromCollect(format("survey/%d/data/records/summary", projectId), params).getAsJsonObject();
        JsonArray plotSummaries = fromCollect.get("records").getAsJsonArray();
        return plotSummaries;
    }
    
    private static int getCollectRecordsCountByPlotId(String username, int projectId, String plotId) {
        JsonArray summaries = getCollectRecordSummariesByPlotId(username, projectId, plotId);
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
    
    /**
     * Wrapper of Project Stats info
     */
    private static class ProjectStats {
        public int flaggedPlots = 0;
        public int analyzedPlots = 0;
        public int unanalyzedPlots = 0;
        public int members = 0;
        public int contributors = 0;
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

    private static void writeCsvFile(HttpServletResponse response, String header, Stream<String> contentStream,
            String outputFileName) {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition","attachment; filename="+ outputFileName +".csv");
        
        try(OutputStream os = response.getOutputStream()) {
            os.write(header.getBytes());
            contentStream.forEach(row -> {
                try {
                    os.write(row.getBytes());
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
    
    private static Collector<String, ?, Map<String, Long>> countDistinct =
            Collectors.groupingBy(Function.identity(), Collectors.counting());

    private static String getLoggedUsername(Request req) {
        HttpSession session = req.raw().getSession();
        String username = (String) session.getAttribute("username");
        return username;
    }
    
    //END OF Projects.java common functions

}
