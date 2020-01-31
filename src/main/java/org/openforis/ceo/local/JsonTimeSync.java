package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.addElementToJsonFile;
import static org.openforis.ceo.utils.JsonUtils.elementToArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;

import org.openforis.ceo.db_api.TimeSync;
import spark.Request;
import spark.Response;

/**
 * For JSON implementation, only two methods are used: getVerticesForPlot
 * and saveVertex. Both functions read and write data to the same JSON file.
 */
public class JsonTimeSync implements TimeSync {

    public String getVersion(Request req, Response res) {
        return "Version 1.0";
    }

    public String getAssignedProjects(Request req, Response res) {
        return "";
    }

    public String getVerticesForPlot(Request req, Response res) {
        // timesync/vertex/:interpreter/:project_id/:plotid/:packet
        var interpreter = req.params(":interpreter");
        var projectId   = req.params(":project_id");
        var plotId      = req.params(":plotid");
        var packet      = req.params(":packet");
        var plots       = elementToArray(readJsonFile("timesync-data-" + projectId + ".json"));

        var matched = findInJsonArray(plots ,plot ->
            plot.get("userId").getAsString().equals(interpreter)
                && plot.get("projectId").getAsString().equals(projectId)
                && plot.get("plotId").getAsString().equals(plotId)
                && plot.get("packet").getAsString().equals(packet));
        if (matched.isPresent()) {
            return matched.get().toString();
        } else {
            return "";
        }
    }

    public String getPlots(Request req, Response res) {
        return "";
    }

    public String getVerticesForProject(Request req, Response res) {
        return "";
    }

    public synchronized String saveVertex(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId  = jsonInputs.get("projectId").getAsString();
        var plotId     = jsonInputs.get("plotId").getAsString();
        var userName   = jsonInputs.get("userId").getAsString();
        var packet     = jsonInputs.get("packet").getAsString();

        addElementToJsonFile("timesync-data-" + projectId + ".json", jsonInputs, plot ->
            !plot.get("plotId").getAsString().equals(plotId)
                || !plot.get("userId").getAsString().equals(userName)
                || !plot.get("packet").getAsString().equals(packet));
        return "";
    }

    public String saveComment(Request req, Response res) {
        return "";
    }

    public String getComment(Request req, Response res) {
        return "";
    }

    public String getImagePreference(Request req, Response res) {
        return "";
    }

    public String updateImagePreference(Request req, Response res) {
        return "";
    }
}
