package org.openforis.ceo.collect;

import static java.lang.String.format;
import static org.openforis.ceo.collect.CollectClient.getFromCollect;
import static org.openforis.ceo.collect.CollectClient.postToCollect;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findElement;
import static org.openforis.ceo.utils.JsonUtils.getMemberValue;
import static org.openforis.ceo.utils.JsonUtils.intoJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.toElementStream;
import static org.openforis.ceo.utils.RequestUtils.getIntParam;
import static org.openforis.ceo.utils.RequestUtils.getParam;

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
import java.util.Map;
import java.util.stream.Stream;
import org.openforis.ceo.db_api.Plots;
import spark.Request;
import spark.Response;

public class CollectPlots implements Plots {

    private static final String ADMIN_USERNAME = "admin@openforis.org";
    private static final int MAX_PLOT_MEASUREMENTS = 3;
    private static final double SAMPLE_POINT_WIDTH_M = 10.0d;
    private static final String COLLECT_EARTH_ONLINE_TARGET = "COLLECT_EARTH_ONLINE";


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

    // FIXME: stub
    public String getProjectPlot(Request req, Response res) {
        return "";
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
    public String getPlotById(Request req, Response res) {
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

    public String getNextPlot(Request req, Response res) {
        return "";//FIXME
    }

    public String getPrevPlot(Request req, Response res) {
        return "";//FIXME
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
    public String addUserSamples(Request req, Response res) {
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
    public String flagPlot(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId = jsonInputs.get("projectId").getAsInt();
        var plotId = jsonInputs.get("plotId").getAsString();

        var samplingPointItem = getCollectSamplingPointItems(projectId, plotId, true).getAsJsonArray().get(0).getAsJsonObject();
        var infoAttributes = findElement(samplingPointItem, "infoAttributes").getAsJsonArray();
        infoAttributes.set(0, new JsonPrimitive(true));
        postToCollect(format("survey/%d/sampling_point_data", projectId), samplingPointItem);
        return "";
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
        return getCollectRecordSummariesByPlotId(username, projectId, plotId, false, null, "CLEANSING").size();
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
        return getFromCollect(format("survey/%d/sampling_point_data", projectId),
                (plotId == null)
                        ? Map.of("only_parent_item", onlyParentItem)
                        : Map.of("only_parent_item", onlyParentItem,
                        "parent_keys", plotId))
                .getAsJsonArray();
    }

    private static JsonObject getCollectPlotSamplingPointItem(int projectId, String plotId) {
        return getCollectSamplingPointItems(projectId, plotId, true).get(0).getAsJsonObject();
    }

    private static JsonObject createNewCollectRecord(int projectId, String username, String plotId, int measurement) {
        return postToCollect(String.format("survey/%s/data/records", projectId),
                Map.of("username",               username,
                        "recordKey",              Arrays.asList(plotId, measurement),
                        "addSecondLevelEntities", true))
                .getAsJsonObject();
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

    private static String getLoggedUsername(Request req) {
        var session = req.raw().getSession();
        var username = (String) session.getAttribute("username");
        return username;
    }

    public String resetPlotLock(Request req, Response res) {return "";}
    public String releasePlotLock(Request req, Response res) {return "";}
}
