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
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.HttpServletResponse;
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
        var userId = getLoggedUserId(req);
        var institutionId = req.queryParams("institutionId");

        var params = Map.of("userId",                (Object) userId,
                            "groupId",               (Object) institutionId,
                            "includeTemporary",      (Object) true,
                            "full",                  (Object) true,
                            "includeCodeListValues", (Object) true,
                            "target",                (Object) COLLECT_EARTH_ONLINE_TARGET);

        var allSurveys = getFromCollect("survey", params).getAsJsonArray();
        var allProjects = toElementStream(allSurveys)
            .map(s -> convertToCeoProject((JsonObject) s));

        //consider only not archived projects
        var filteredProjects = allProjects.filter(project -> ! project.get("archived").getAsBoolean());

        //filter by institution
        if (! isBlank(institutionId)) {
            filteredProjects = filteredProjects.filter(project -> project.get("institution").getAsString().equals(institutionId));
        }

        if (userId == null) {
            // Not logged in
            filteredProjects = filteredProjects
                .filter(project ->
                        project.get("privacyLevel").getAsString().equals("public") &&
                        project.get("availability").getAsString().equals("published"))
                .map(project -> {
                        project.addProperty("editable", false);
                        return project;
                    });
        } else {
            //logged in
            var institutionRoles = (new OfUsers()).getInstitutionRoles(userId);
            filteredProjects = filteredProjects.filter(project -> {
                    var role = institutionRoles.getOrDefault(project.get("institution").getAsInt(), "");
                    var privacyLevel = project.get("privacyLevel").getAsString();
                    var availability = project.get("availability").getAsString();
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
                        var role = institutionRoles.getOrDefault(project.get("institution").getAsInt(), "");
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
        var projectId = req.params(":id");
        if ("0".equals(projectId)) {
            var el = JsonUtils.readJsonFile("default-project.json");
            return el.toString();
        } else {
            var collectSurvey = getCollectSurvey(Integer.parseInt(projectId));
            return convertToCeoProject(collectSurvey.getAsJsonObject()).toString();
        }
    }

    private static JsonArray convertSamplingPointItems(String username, int projectId, JsonArray samplingPointItems) {
        return mapJsonArray(samplingPointItems,
                            itemObj -> {
                                var plotId = findElement(itemObj, "levelCodes[0]").getAsString();
                                var sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
                                return convertToCeoRecord(username, projectId, itemObj, sampleItems, null);
                            });
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return JSON array of plot objects if numPlots < maxPlots.
    // Otherwise, select an evenly spaced sample of the plots of
    // size maxPlots.
    //
    // ==> "[{},{},{}]" where [].length <= maxPlots
    public String getProjectPlots(Request req, Response res) {
        var projectId = getIntParam(req, "id");
        var maxPlots = getIntParam(req, "max");
        var username = getLoggedUsername(req);
        var samplingPointItems = getCollectSamplingPointItems(projectId);
        var numPlots = samplingPointItems.size();

        if (numPlots > maxPlots) {
            var stepSize = 1.0 * numPlots / maxPlots;
            var filteredSamplingPointItems =
                Stream.iterate(0.0, i -> i + stepSize)
                .limit(maxPlots)
                .map(i -> (JsonObject) samplingPointItems.get(Math.toIntExact(Math.round(i))))
                .collect(intoJsonArray);
            return convertSamplingPointItems(username, projectId, filteredSamplingPointItems).toString();
        } else {
            return convertSamplingPointItems(username, projectId, samplingPointItems).toString();
        }
        //[{center: "{\"type\":\"Point\",\"coordinates\":[102.999640127073,22.0468074686287]}", id: 4289, flagged: false, analyses: 0, user: null,
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object with several computed integer fields
    //
    // ==> "{flaggedPlots:#,assignedPlots:#,unassignedPlots:#,members:#,contributors:#}"
    public String getProjectStats(Request req, Response res) {
        var projectId = getIntParam(req, "id");
        var userId = getLoggedUserId(req);

        var stats = new ProjectStats();

        var totalPlots = countCollectSamplingPointItems(projectId, 0, null);
        stats.setFlaggedPlots(countCollectSamplingPointItems(projectId, 0, Arrays.asList("true")));
        stats.setAssignedPlots(countCollectRecords(projectId, true, userId));
        stats.setUnassignedPlots(totalPlots - stats.getAssignedPlots() - stats.getFlaggedPlots());
        stats.setContributors(countCollectContributors(projectId));
        stats.setMembers(getProjectUsers(projectId).length);
        return JsonUtils.toJson(stats);
    }

    private static int getOrCreateCollectRecordId(String username, int projectId, String plotId, int count) {
        var existingRecordSummary = getTemporaryCollectRecordSummaryByPlotId(username, projectId, plotId);
        if (existingRecordSummary == null) {
            var collectRecord = createNewCollectRecord(projectId, username, plotId, count + 1);
            return collectRecord.get("id").getAsInt();
        } else {
            return existingRecordSummary.get("id").getAsInt();
        }
    }

    // Call Collect's REST API to QUERY the database.
    //
    // Return a JSON object representing a randomly selected plot
    // with attributes flagged=false and analyses=0. If no such
    // plots exist in the database, return the string "done".
    //
    // ==> "{flagged:false,analyses:0,...}" | "done"
    public String getUnassignedPlot(Request req, Response res) {
        var projectId = getIntParam(req, "id");
        var username = getLoggedUsername(req);
        var params = Map.of("username", (Object) username);
        var recordKeysEl = getFromCollect(format("survey/%d/sampling_point_data/unanalyzed/random", projectId), params);
        if (recordKeysEl.isJsonNull()) {
            return "done";
        } else {
            var recordKeysArray = recordKeysEl.getAsJsonArray();
            var plotId = recordKeysArray.get(0).getAsString();
            var measurement = recordKeysArray.get(1).getAsInt();
            var recordId = getOrCreateCollectRecordId(username, projectId, plotId, measurement);
            var plotSamplingPointItem = getCollectPlotSamplingPointItem(projectId, plotId);
            var sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
            return convertToCeoRecord(username, projectId, plotSamplingPointItem, sampleItems, recordId).toString();
        }
    }

    public String getUnassignedPlotById(Request req, Response res) {
        var projectId = getIntParam(req, "projid");
        var plotId = getParam(req, "id");
        var username = getLoggedUsername(req);
        var count = getCollectRecordsCountByPlotId(username, projectId, plotId);
        if (count < MAX_PLOT_MEASUREMENTS) {
            var recordId = getOrCreateCollectRecordId(username, projectId, plotId, count);
            var plotSamplingPointItem = getCollectPlotSamplingPointItem(projectId, plotId);
            var sampleItems = getCollectSamplingPointItems(projectId, plotId, false);
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
        var projectId = getIntParam(req, "id");
        var username = getLoggedUsername(req);

        var collectSurveyEl = getCollectSurvey(projectId);
        if (collectSurveyEl.isJsonNull()) {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        } else {
            var collectSurvey = collectSurveyEl.getAsJsonObject();
            var ceoProject = convertToCeoProject(collectSurvey);
            var sampleValueTranslations = getSampleValueTranslations(ceoProject);
            var plotPoints = getCollectSamplingPointItems(projectId);
            var plotSummaries = mapJsonArray(plotPoints,
                                             plot -> {
                                                 var plotUsername = ADMIN_USERNAME; //TODO
                                                 var plotSummary = new JsonObject();
                                                 var plotId = findElement(plot, "levelCodes[0]").getAsString();
                                                 plotSummary.addProperty("plot_id", plotId);
                                                 plotSummary.addProperty("center_lon", plot.get("x").getAsDouble());
                                                 plotSummary.addProperty("center_lat", plot.get("y").getAsDouble());
                                                 plotSummary.addProperty("size_m", ceoProject.get("plotSize").getAsDouble());
                                                 plotSummary.addProperty("shape", ceoProject.get("plotShape").getAsString());
                                                 plotSummary.addProperty("flagged", isFlagged(plot));
                                                 plotSummary.addProperty("analyses", getCollectRecordsCountByPlotId(username,
                                                                                                                    projectId,
                                                                                                                    plotId));
                                                 var samples = getCollectSamplingPointItems(projectId, plotId, false);
                                                 plotSummary.addProperty("sample_points", samples.size());
                                                 plotSummary.addProperty("user_id", plotUsername);
                                                 plotSummary.add("distribution", getValueDistribution(collectSurvey,
                                                                                                      username,
                                                                                                      projectId,
                                                                                                      plotId,
                                                                                                      samples,
                                                                                                      sampleValueTranslations));
                                                 return plotSummary;
                                             });

            var fields = new String[]{"plot_id", "center_lon", "center_lat", "size_m", "shape",
                                      "flagged", "analyses", "sample_points", "user_id"};
            var labels = getValueDistributionLabels(ceoProject);

            var csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels))
                .map(String::toUpperCase).collect(Collectors.joining(","));

            var csvContent = toStream(plotSummaries)
                .map(plotSummary -> {
                        var fieldStream = Arrays.stream(fields);
                        var labelStream = Arrays.stream(labels);
                        var distribution = plotSummary.get("distribution").getAsJsonObject();
                        return Stream.concat(fieldStream.map(field ->
                                                             plotSummary.get(field).isJsonNull()
                                                             ? ""
                                                             : plotSummary.get(field).getAsString()),
                                             labelStream.map(label ->
                                                             distribution.has(label)
                                                             ? distribution.get(label).getAsString()
                                                             : "0.0"))
                            .collect(Collectors.joining(","));
                    })
                .collect(Collectors.joining("\n"));

            var projectName = ceoProject.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            var currentDate = LocalDate.now().toString();
            var outputFileName = "ceo-" + projectName + "-plot-data-" + currentDate;

            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        }
    }

    public HttpServletResponse dumpProjectRawData(Request req, Response res) {
        var projectId = getIntParam(req, "id");
        var username = getLoggedUsername(req);

        var collectSurveyEl = getCollectSurvey(projectId);
        if (collectSurveyEl.isJsonNull()) {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        } else {
            var collectSurvey = collectSurveyEl.getAsJsonObject();
            var ceoProject = convertToCeoProject(collectSurvey);
            var sampleValueTranslations = getSampleValueTranslations(ceoProject);
            var plotPoints = getCollectSamplingPointItems(projectId);
            var sampleSummaries = flatMapJsonArray(plotPoints,
                                                   plot -> {
                                                       var plotId = getMemberValue(plot, "levelCodes[0]", String.class);
                                                       var recordSummaries = getCollectRecordSummariesByPlotId(username, projectId, plotId, false, null, "CLEANSING");
                                                       var flagged = isFlagged(plot);
                                                       var analyses = recordSummaries.size();
                                                       var samplingPoints = getCollectSamplingPointItems(projectId, plotId, false);
                                                       var records = toStream(recordSummaries).map(recordSummary -> {
                                                               return getCollectRecord(projectId, recordSummary.getAsJsonObject().get("id").getAsInt());
                                                           }).collect(intoJsonArray);

                                                       return toStream(samplingPoints).flatMap(samplingPoint -> {
                                                               var subplotId = getMemberValue(samplingPoint, "levelCodes[1]", String.class);
                                                               if (records.size() == 0) {
                                                                   //unanalyzed sampling point
                                                                   var sampleSummary = new JsonObject();
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
                                                                           var subplot = getCollectRecordSubplot(collectSurvey, collectRecord, subplotId);
                                                                           var valueDefId = getCollectSurveyNodeDefinitionId(collectSurvey, "subplot/values_1");
                                                                           var val = getCollectRecordAttributeValue(subplot, valueDefId);
                                                                           var sampleSummary = new JsonObject();
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

            var sampleValueGroups = ceoProject.get("sampleValues").getAsJsonArray();
            var sampleValueGroupNames = toStream(sampleValueGroups)
                .collect(Collectors.toMap(sampleValueGroup -> sampleValueGroup.get("id").getAsInt(),
                                          sampleValueGroup -> sampleValueGroup.get("name").getAsString(),
                                          (a, b) -> b));

            var fields = new String[]{"plot_id", "sample_id", "lon", "lat", "flagged", "analyses", "user_id"};
            var labels = sampleValueGroupNames.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(Map.Entry::getValue)
                .toArray(String[]::new);

            var csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels))
                .map(String::toUpperCase).collect(Collectors.joining(","));

            var csvContent = toStream(sampleSummaries)
                .map(sampleSummary -> {
                        var fieldStream = Arrays.stream(fields);
                        var labelStream = Arrays.stream(labels);
                        return Stream.concat(fieldStream.map(field ->
                                                             sampleSummary.get(field).isJsonNull()
                                                             ? ""
                                                             : sampleSummary.get(field).getAsString()),
                                             labelStream.map(label -> {
                                                     var value = sampleSummary.get("value");
                                                     if (value.isJsonNull()) {
                                                         return "";
                                                     } else if (value.isJsonPrimitive()) {
                                                         return sampleValueTranslations
                                                             .getOrDefault(value.getAsString(), "LULC:NoValue")
                                                             .split(":")[1];
                                                     } else {
                                                         return value.getAsJsonObject().get(label).getAsString();
                                                     }}))
                            .collect(Collectors.joining(","));
                    })
                .collect(Collectors.joining("\n"));

            var projectName = ceoProject.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            var currentDate = LocalDate.now().toString();
            var outputFileName = "ceo-" + projectName + "-sample-data-" + currentDate;

            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        }
    }

    private static JsonObject getValueDistribution(JsonObject collectSurvey, String username, int projectId, String plotId,
                                                   JsonArray samples, final Map<String, String> sampleValueTranslations) {
        var recordSummaries = getCollectRecordSummariesByPlotId(username, projectId, plotId, false, null, "CLEANSING");
        var records = toElementStream(recordSummaries)
            .map(s -> getCollectRecord(projectId, s.getAsJsonObject().get("id").getAsInt()))
            .collect(intoJsonArray);

        var valueCounts = toStream(samples)
            .map(sample -> findElement(sample, "levelCodes[1]").getAsString())
            .map(subplotId -> {
                    var values = toStream(records)
                        .map(record -> {
                                var subplot = getCollectRecordSubplot(collectSurvey, record, subplotId);
                                var valueDefId = getCollectSurveyNodeDefinitionId(collectSurvey, "subplot/values_1");
                                return getCollectRecordAttributeValue(subplot, valueDefId);
                            })
                        .map(value -> sampleValueTranslations.getOrDefault(value, "NoValue"))
                        .collect(Collectors.toList());
                    return values;
                }).flatMap(List::stream)
            .collect(countDistinct);
        var valueDistribution = new JsonObject();
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
        var projectId = req.params(":id");
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
        var projectId = req.params(":id");
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
        var projectId = req.params(":id");
        postToCollect("survey/archive/" + projectId);
        return "";
    }

    private static JsonObject getOrCreateCollectRecord(Integer collectRecordId, int projectId, String plotId, String username) {
        if (collectRecordId == null) {
            var currentAnalyses = getCollectRecordsCountByPlotId(username, projectId, plotId);
            return createNewCollectRecord(projectId, username, plotId, currentAnalyses+1);
        } else {
            return getCollectRecord(projectId, collectRecordId);
        }
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
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId = jsonInputs.get("projectId").getAsInt();
        var plotId = jsonInputs.get("plotId").getAsString();
        var username = jsonInputs.get("userId").getAsString();
        var userSamples = jsonInputs.get("userSamples").getAsJsonObject();
        var collectRecordId = getMemberValue(jsonInputs, "collectRecordId", Integer.class);

        var collectRecord = getOrCreateCollectRecord(collectRecordId, projectId, plotId, username);
        var recordId = collectRecord.get("id").getAsInt();

        var survey = getCollectSurvey(projectId).getAsJsonObject();

        userSamples.entrySet().forEach(e -> {
                var sampleSubplotKey = e.getKey();
                var sampleValue = e.getValue().getAsJsonObject();

                var subplot = getCollectRecordSubplot(survey, collectRecord, sampleSubplotKey);

                var attributeUpdateCommands = sampleValue.entrySet().stream().map(sampleValueEntry -> {
                        var codeListLabel = sampleValueEntry.getKey();
                        var codeList = getCollectCodeListFromLabel(survey, codeListLabel);
                        var codeListName = codeList.get("name").getAsString();
                        var codeListItemLabel = sampleValueEntry.getValue().getAsString();
                        var attrName = codeListName;
                        var attrVal = getCollectCodeListItemCodeFromLabel(codeList, codeListItemLabel);
                        return createAttributeUpdateCommand(projectId, survey, recordId, subplot,
                                                            format("subplot/%s", attrName), attrVal, username);
                    }).collect(intoJsonArray);

                var attributeUpdateCommandsWrapper = new JsonObject();
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
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId = jsonInputs.get("projectId").getAsInt();
        var plotId = jsonInputs.get("plotId").getAsString();

        var samplingPointItem = getCollectSamplingPointItems(projectId, plotId, true).getAsJsonArray().get(0).getAsJsonObject();
        var infoAttributes = findElement(samplingPointItem, "infoAttributes").getAsJsonArray();
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
            var newProject = partsToJsonObject(req,
                                               new String[]{"institution", "privacy-level", "lon-min", "lon-max", "lat-min",
                                                            "lat-max", "base-map-source", "plot-distribution", "num-plots",
                                                            "plot-spacing", "plot-shape", "plot-size", "sample-distribution",
                                                            "samples-per-plot", "sample-resolution", "sample-values"});

            // Manually add the name and description fields since they may be invalid JSON
            newProject.addProperty("name", partToString(req.raw().getPart("name")));
            newProject.addProperty("description", partToString(req.raw().getPart("description")));

            var collectSurveyCreationParams = convertToCollectProjectParameters(newProject);

            //extract sampling points from plot distribution csv file
            if (newProject.get("plotDistribution").getAsString().equals("csv")) {
                var plotDistributionIs = req.raw().getPart("plot-distribution-csv-file").getInputStream();
                var nextPlotId = new AtomicInteger(1);
                var plotSamplingPonints = new BufferedReader(new InputStreamReader(plotDistributionIs)).lines().skip(1).map(line -> {
                        var samplingPoint = new JsonObject();
                        samplingPoint.add("levelCodes", singletonArray(new JsonPrimitive(nextPlotId.getAndIncrement())));
                        samplingPoint.addProperty("srsId", "EPGS:4326");
                        var lineFields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                        samplingPoint.addProperty("y", lineFields[0]);
                        samplingPoint.addProperty("x", lineFields[1]);
                        return samplingPoint;
                }).collect(intoJsonArray);
                collectSurveyCreationParams.add("samplingPointsByLevel", singletonArray(plotSamplingPonints));
            }
            var newSurvey = postToCollect("survey/simple", collectSurveyCreationParams).getAsJsonObject();
            return newSurvey.get("id").getAsString();
        } catch (Exception e) {
            // Indicate that an error occurred with project creation
            throw new RuntimeException(e);
        }
    }

    private static JsonObject convertToCeoProject(JsonObject collectSurvey) {
        var p = new JsonObject();
        var projectId = collectSurvey.get("id").getAsInt();
        p.addProperty("id", projectId);
        p.add("name", collectSurvey.get("projectName"));
        p.add("description", collectSurvey.get("description"));
        p.addProperty("institution", getMemberValue(collectSurvey, "userGroup.id", Integer.class));
        p.addProperty("availability", collectSurvey.get("availability").getAsString().toLowerCase());
        var collectSurveyPrivacyLevel = collectSurvey.get("privacyLevel").getAsString().toLowerCase();
        p.addProperty("privacyLevel", collectSurveyPrivacyLevel.equals("group") ? "institution": collectSurveyPrivacyLevel);
        var ceoApplicationOptionsEl = collectSurvey.get("ceoApplicationOptions");
        if (! ceoApplicationOptionsEl.isJsonNull()) {
            var ceoApplicationOptions = ceoApplicationOptionsEl.getAsJsonObject();
            p.add("baseMapSource", ceoApplicationOptions.get("baseMapSource"));

            var samplingPointDataConfiguration = ceoApplicationOptions.get("samplingPointDataConfiguration").getAsJsonObject();

            var boundary = new JsonObject();
            boundary.addProperty("type", "Polygon");
            var coordinates = Stream.iterate(0, i -> i + 1).limit(4)
                .map(i -> {
                        var coordinate = new JsonArray();
                        coordinate.add(findElement(samplingPointDataConfiguration, format("aoiBoundary[%d].x", i)));
                        coordinate.add(findElement(samplingPointDataConfiguration, format("aoiBoundary[%d].y", i)));
                        return coordinate;
                    }).collect(intoJsonArray);
            var coordinatesWrapper = new JsonArray();
            coordinatesWrapper.add(coordinates);
            boundary.add("coordinates", coordinatesWrapper);
            p.addProperty("boundary", boundary.toString());

            var plotLevelSettings = findElement(samplingPointDataConfiguration, "levelsSettings[0]").getAsJsonObject();
            var samplePointLevelSettings = findElement(samplingPointDataConfiguration, "levelsSettings[1]").getAsJsonObject();

            p.addProperty("plotDistribution", plotLevelSettings.get("distribution").getAsString().toLowerCase());
            p.addProperty("numPlots", plotLevelSettings.get("numPoints").getAsInt());
            p.add("plotSpacing", plotLevelSettings.get("resolution"));
            p.addProperty("plotShape", plotLevelSettings.get("shape").getAsString().toLowerCase());
            p.addProperty("plotSize", plotLevelSettings.get("pointWidth").getAsInt());

            p.addProperty("sampleDistribution", samplePointLevelSettings.get("distribution").getAsString().toLowerCase());
            p.addProperty("samplesPerPlot", samplePointLevelSettings.get("numPoints").getAsInt());
            p.add("sampleResolution", samplePointLevelSettings.get("resolution"));
        }

        var codeLists = collectSurvey.get("codeLists").getAsJsonArray();
        var sampleValuesList = toElementStream(codeLists)
            .filter(codeListEl -> ((JsonObject) codeListEl).get("name").getAsString().startsWith("values_"))
            .map(codeListEl -> {
                    var codeListObj = (JsonObject) codeListEl;

                    var result = new JsonObject();
                    result.add("id", codeListObj.get("id"));
                    result.add("name", codeListObj.get("label"));

                    var sampleValues = toElementStream(codeListObj.get("items").getAsJsonArray()).map(item -> {
                            var obj = (JsonObject) item;
                            var sampleValue = new JsonObject();
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
        var plotId = findElement(plotSamplingItem, "levelCodes[0]").getAsString();
        var obj = new JsonObject();
        obj.addProperty("id", plotId);
        if (recordId != null) {
            obj.addProperty("collectRecordId", recordId);
        }
        obj.add("center", createPointObject(plotSamplingItem.get("x").getAsDouble(), plotSamplingItem.get("y").getAsDouble()));

        var flagged = isFlagged(plotSamplingItem);

        obj.addProperty("flagged", flagged);
        obj.addProperty("analyses", getCollectRecordsCountByPlotId(username, projectId, plotId));
        obj.addProperty("user", username); //TODO

        var samples = toElementStream(sampleItems).map(item -> {
                var itemObj = (JsonObject) item;
                var sampleId = findElement(itemObj, "levelCodes[1]").getAsString();
                var o = new JsonObject();
                o.addProperty("id", sampleId);
                o.add("point", createPointObject(itemObj.get("x").getAsDouble(), itemObj.get("y").getAsDouble()));
                return o;
            }).collect(intoJsonArray);

        obj.add("samples", samples);
        return obj;
    }

    private static JsonObject convertToCollectProjectParameters(JsonObject ceoProject) {
        var data = new JsonObject();
        data.addProperty("target", COLLECT_EARTH_ONLINE_TARGET);
        data.addProperty("projectName", ceoProject.get("name").getAsString());
        data.add("description", ceoProject.get("description"));
        data.addProperty("userGroupId", ceoProject.get("institution").getAsLong());
        var ceoPrivacyLevel = ceoProject.get("privacyLevel").getAsString();
        data.addProperty("privacyLevel", (ceoPrivacyLevel.equals("institution") ? "group": ceoPrivacyLevel).toUpperCase(Locale.ENGLISH));

        var ceoSettings = new JsonObject();
        ceoSettings.add("baseMapSource", ceoProject.get("baseMapSource"));
        data.add("ceoSettings", ceoSettings);

        var samplingPointGenerationData = new JsonObject();

        var aoiBoundary = extractAoiBoundaryData(ceoProject);
        samplingPointGenerationData.add("aoiBoundary", aoiBoundary);

        var samplingPointSettings = new JsonArray();
        var plotLevelSettings = new JsonObject();
        plotLevelSettings.add("numPoints", ceoProject.get("numPlots"));
        plotLevelSettings.addProperty("shape", ceoProject.get("plotShape").getAsString().toUpperCase());
        plotLevelSettings.addProperty("distribution", ceoProject.get("plotDistribution").getAsString().toUpperCase());
        plotLevelSettings.add("resolution", ceoProject.get("plotSpacing"));
        plotLevelSettings.addProperty("pointShape", ceoProject.get("plotShape").getAsString().toUpperCase());
        plotLevelSettings.add("pointWidth", ceoProject.get("plotSize"));
        samplingPointSettings.add(plotLevelSettings);

        var sampleLevelSettings = new JsonObject();
        sampleLevelSettings.add("numPoints", ceoProject.get("samplesPerPlot"));
        sampleLevelSettings.addProperty("shape", "CIRCLE");
        sampleLevelSettings.addProperty("distribution", ceoProject.get("sampleDistribution").getAsString().toUpperCase());
        sampleLevelSettings.add("resolution", ceoProject.get("sampleResolution"));
        sampleLevelSettings.addProperty("pointShape", "CIRCLE");
        sampleLevelSettings.addProperty("pointWidth", SAMPLE_POINT_WIDTH_M);
        samplingPointSettings.add(sampleLevelSettings);

        samplingPointGenerationData.add("levelsSettings", samplingPointSettings);

        data.add("samplingPointGenerationSettings", samplingPointGenerationData);

        var sampleValueLists = ceoProject.get("sampleValues").getAsJsonArray();
        var codeLists = toElementStream(sampleValueLists).map(sampleValueList -> {
                var sampleValueListObj = (JsonObject) sampleValueList;
                var codeList = new JsonObject();
                codeList.addProperty("label", sampleValueListObj.get("name").getAsString());

                var values = sampleValueListObj.get("values").getAsJsonArray();
                var codeListItems = toElementStream(values).map(valEl -> {
                        var valObj = valEl.getAsJsonObject();
                        var item = new JsonObject();
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
        var result = new JsonArray();
        result.add(extractCoordinateData(jsonObj, "latMin", "lonMax"));
        result.add(extractCoordinateData(jsonObj, "latMin", "lonMin"));
        result.add(extractCoordinateData(jsonObj, "latMax", "lonMin"));
        result.add(extractCoordinateData(jsonObj, "latMax", "lonMax"));
        return result;
    }

    private static JsonObject extractCoordinateData(JsonObject jsonObj, String latMember, String lonMember) {
        var data = new JsonObject();
        data.addProperty("x", jsonObj.get(lonMember).getAsDouble());
        data.addProperty("y", jsonObj.get(latMember).getAsDouble());
        data.addProperty("srsId", "EPSG:4326");
        return data;
    }

    //COLLECT API HELPER FUNCTIONS
    private static JsonElement getCollectSurvey(int surveyId) {
        var url = "survey/" + surveyId;
        return getFromCollect(url);
    }

    // FIXME: Replace loop with recursion
    private static int getCollectSurveyNodeDefinitionId(JsonObject collectSurvey, String nodePath) {
        var currentObj = findElement(collectSurvey, "schema.rootEntities[0]").getAsJsonObject();
        var pathParts = nodePath.split("/");
        for (var pathPart : pathParts) {
            var currentChildrenDefs = findElement(currentObj, "children").getAsJsonArray();
            currentObj = filterJsonArray(currentChildrenDefs, o -> pathPart.equals(o.get("name").getAsString()))
                .get(0).getAsJsonObject();
        };
        return currentObj.get("id").getAsInt();
    }


    private static JsonObject getCollectCodeListFromLabel(JsonObject survey, String codeListLabel) {
        var codeLists = survey.get("codeLists").getAsJsonArray();
        var codeList = filterJsonArray(codeLists,
                                       l -> codeListLabel.equals(getMemberValue(l, "label", String.class))).get(0).getAsJsonObject();
        return codeList;
    }

    private static String getCollectCodeListItemCodeFromLabel(JsonObject codeList, String codeListItemLabel) {
        var codeListItems = codeList.get("items").getAsJsonArray();
        var codeListItem = filterJsonArray(codeListItems,
                                           i -> i.get("label").getAsString().equals(codeListItemLabel)).get(0).getAsJsonObject();
        return codeListItem.get("code").getAsString();
    }

    private static JsonObject getCollectRecord(int surveyId, int recordId) {
        return getFromCollect(format("survey/%s/data/records/%s", surveyId, recordId)).getAsJsonObject();
    }

    private static JsonArray getCollectRecordSummariesByPlotId(String username, int projectId, String plotId,
                                                               boolean onlyOwnedRecords, String step, String stepGreaterOrEqualTo) {
        var params = Map.of("username",             (Object) username,
                            "keyValues[0]",         (Object) plotId,
                            "sortFields[0].field",  (Object) "KEY2",
                            "onlyOwnedRecords",     (Object) onlyOwnedRecords,
                            "stepGreaterOrEqualTo", (Object) stepGreaterOrEqualTo);
        var fromCollect = getFromCollect(format("survey/%d/data/records/summary", projectId), params).getAsJsonObject();
        var plotSummaries = fromCollect.get("records").getAsJsonArray();
        return plotSummaries;
    }

    private static JsonObject getTemporaryCollectRecordSummaryByPlotId(String username, int projectId, String plotId) {
        var summaries = getCollectRecordSummariesByPlotId(username, projectId, plotId, true, "ENTRY", null);
        return summaries.isJsonNull() || summaries.size() == 0 ? null : summaries.get(0).getAsJsonObject();
    }

    private static int getCollectRecordsCountByPlotId(String username, int projectId, String plotId) {
        var summaries = getCollectRecordSummariesByPlotId(username, projectId, plotId, false, null, "CLEANSING");
        return summaries.size();
    }

    private static boolean isFlagged(JsonObject samplingPointItem) {
        return Boolean.TRUE.equals(getMemberValue(samplingPointItem, "infoAttributes[0]", Boolean.class));
    }

    private static JsonObject createPointObject(double x, double y) {
        var o = new JsonObject();
        o.add("type", new JsonPrimitive("Point"));
        var coordinates = new JsonArray();
        coordinates.add(x);
        coordinates.add(y);
        o.add("coordinates", coordinates);
        return o;
    }

    private static JsonArray getCollectSamplingPointItems(int projectId) {
        return getCollectSamplingPointItems(projectId, null, true);
    }

    private static JsonArray getCollectSamplingPointItems(int projectId, String plotId, boolean onlyParentItem) {
        var params = new HashMap<String, Object>();
        if (plotId != null) {
            params.put("parent_keys", plotId);
        }
        params.put("only_parent_item", onlyParentItem);
        var sampleItems = getFromCollect(format("survey/%d/sampling_point_data", projectId), params)
            .getAsJsonArray();
        return sampleItems;
    }

    private static JsonObject getCollectPlotSamplingPointItem(int projectId, String plotId) {
        var plotSamplingPointItems = getCollectSamplingPointItems(projectId, plotId, true);
        return plotSamplingPointItems.get(0).getAsJsonObject();
    }

    private static int countCollectSamplingPointItems(int projectId, int levelIndex, List<String> infoAttributes) {
        var params = Map.of("level",           levelIndex,
                            "info_attributes", infoAttributes);
        var count = getFromCollect(format("survey/%d/count/sampling_point_data", projectId), params).getAsInt();
        return count;
    }

    private static int countCollectRecords(int projectId, boolean ignoreMeasurements, Integer userId) {
        var params = Map.of("ignore_measurements", (Object) ignoreMeasurements,
                            "user_id",             (Object) userId);
        var count = getFromCollect(format("survey/%d/data/count/records", projectId), params).getAsInt();
        return count;
    }

    private static JsonObject createNewCollectRecord(int projectId, String username, String plotId, int measurement) {
        var newRecordParams = Map.of("username",               username,
                                     "recordKey",              Arrays.asList(plotId, measurement),
                                     "addSecondLevelEntities", true);
        var newRecord = postToCollect(String.format("survey/%s/data/records", projectId), newRecordParams).getAsJsonObject();
        return newRecord;
    }

    private static int countCollectContributors(int projectId) {
        var params = new HashMap<String, Object>();
        var count = getFromCollect(format("survey/%d/data/count/contributors", projectId), params).getAsInt();
        return count;
    }

    private static JsonObject getCollectRecordSubplot(JsonObject survey, JsonObject record, String subplotId) {
        var subplotNodeDefId = getCollectSurveyNodeDefinitionId(survey, "subplot");
        var subplots = findElement(record,
                                   format("rootEntity.childrenByDefinitionId.%d", subplotNodeDefId)).getAsJsonArray();

        var subplot = toElementStream(subplots).filter(s -> {
                var subplotKeyDefId = getCollectSurveyNodeDefinitionId(survey, "subplot/subplot_id");
                var subplotKey = getCollectRecordAttributeValue((JsonObject) s, subplotKeyDefId);
                return subplotKey.equals(subplotId);
            }).collect(intoJsonArray).get(0).getAsJsonObject();
        return subplot;
    }

    private static JsonObject getCollectRecordAttribute(JsonObject parentEntity, int attrDefId) {
        return findElement(parentEntity, format("childrenByDefinitionId.%d[0]", attrDefId)).getAsJsonObject();
    }

    private static String getCollectRecordAttributeValue(JsonObject parentEntity, int attrDefId) {
        var attr = getCollectRecordAttribute(parentEntity, attrDefId);
        var valEl = findElement(attr, "fields[0].value");
        return valEl.isJsonNull() ? null : valEl.getAsString();
    }

    private static JsonObject createAttributeUpdateCommand(int projectId, JsonObject survey, int recordId,
                                                           JsonObject parentEntity, String attributeDefPath, String value, String username) {
        var command = new JsonObject();

        var valueAttrDefId = getCollectSurveyNodeDefinitionId(survey, attributeDefPath);
        var valueAttr = getCollectRecordAttribute(parentEntity, valueAttrDefId);
        command.addProperty("username", username);
        command.addProperty("surveyId", projectId);
        command.addProperty("recordId", recordId);
        command.addProperty("nodeDefId", valueAttrDefId);
        command.addProperty("nodePath", valueAttr.get("path").getAsString());
        command.addProperty("parentEntityPath", parentEntity.get("path").getAsString());
        command.addProperty("attributeType", "CODE");
        var valueByField = new JsonObject();
        valueByField.addProperty("code", value);
        command.add("valueByField", valueByField);
        return command;
    }

    private static String[] getProjectUsers(int projectId) {
        var collectSurvey = getCollectSurvey(projectId);
        var project = convertToCeoProject(collectSurvey.getAsJsonObject());

        var archived = project.get("archived").getAsBoolean();
        var privacyLevel = project.get("privacyLevel").getAsString();
        var availability = project.get("availability").getAsString();
        var institutionId = project.get("institution").getAsString();
        if (archived == true) {
            // return no users
            return new String[]{};
        } else if (privacyLevel.equals("public")) {
            // return all users
            var users = OfUsers.getAllUsers(institutionId);
            return toStream(users).map(user -> user.get("id").getAsString()).toArray(String[]::new);
        } else {
            var institutions = OfGroups.getAllInstitutions(null);
            var matchingInstitution = findInJsonArray(institutions,
                                                                       institution ->
                                                                       institution.get("id").getAsString().equals(institutionId));
            if (matchingInstitution.isPresent()) {
                var institution = matchingInstitution.get();
                var admins = institution.getAsJsonArray("admins");
                var members = institution.getAsJsonArray("members");
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
        var sampleValueGroups = project.get("sampleValues").getAsJsonArray();
        var firstGroup = sampleValueGroups.get(0).getAsJsonObject();
        var firstGroupName = firstGroup.get("name").getAsString();
        return toStream(firstGroup.get("values").getAsJsonArray())
            .collect(Collectors.toMap(sampleValue -> sampleValue.get("code").getAsString(),
                                      sampleValue -> firstGroupName + ":" + sampleValue.get("name").getAsString(),
                                      (a, b) -> b));
    }

    private static String[] getValueDistributionLabels(JsonObject project) {
        var sampleValueGroups = project.get("sampleValues").getAsJsonArray();
        return toStream(sampleValueGroups)
            .flatMap(group -> {
                    var sampleValues = group.get("values").getAsJsonArray();
                    return toStream(sampleValues).map(sampleValue -> group.get("name").getAsString() + ":" + sampleValue.get("name").getAsString());
                })
            .toArray(String[]::new);
    }

    private static HttpServletResponse writeCsvFile(HttpServletResponse response, String header, String content,
                                                    String outputFileName) {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=" + outputFileName + ".csv");

        try (var os = response.getOutputStream()) {
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
        var session = req.raw().getSession();
        var username = (String) session.getAttribute("username");
        return username;
    }

    private static Integer getLoggedUserId(Request req) {
        var session = req.raw().getSession();
        var userIdStr = (String) session.getAttribute("userid");
        if (isBlank(userIdStr)) {
            return null;
        } else {
            return Integer.parseInt(userIdStr);
        }
    }

}
