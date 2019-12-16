package org.openforis.ceo.local;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.utils.JsonUtils.addElementToJsonFile;
import static org.openforis.ceo.utils.JsonUtils.elementToArray;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.filterJsonFile;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.flatMapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.intoJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonFile;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.toElementStream;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.partsToJsonObject;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.PrecisionModel;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.IntSupplier;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.HttpServletResponse;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.openforis.ceo.db_api.TimeSync;
import spark.Request;
import spark.Response;

/**
 * For JSON implementation, only two methods are used: getVerticesForPlot
 * saveVertex both function read and write data to the same json file.
 */
public class JsonTimeSync implements TimeSync {

    @Override
    public String getVersion(Request req, Response res) {
        return "Version 1.0";
    }

    @Override
    public String getAssignedProjects(Request req, Response res) {
        return "null";
    }

    @Override
    public String getVerticesForPlot(Request req, Response res) {
        /// timesync/vertex/:interpreter/:project_id/:plotid/:packet
        var interpreter = req.params(":interpreter");
        var projectId = req.params(":project_id");
        var plotId = req.params(":plotid");
        var packet = req.params(":packet");
        var plots = elementToArray(readJsonFile("timesync-data-" + projectId + ".json")); // .getAsJsonArray();

        var matched = findInJsonArray(plots, plot -> plot.get("userId").getAsString().equals(interpreter)
                && plot.get("projectId").getAsString().equals(projectId)
                && plot.get("plotId").getAsString().equals(plotId) && plot.get("packet").getAsString().equals(packet));
        if (matched.isPresent()) {
            return matched.get().toString();
        } else {
            return "";
        }
    }

    @Override
    public String getPlots(Request req, Response res) {
        return null;
    }

    @Override
    public String getVerticesForProject(Request req, Response res) {
        return null;
    }

    @Override
    public synchronized String saveVertex(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId = jsonInputs.get("projectId").getAsString();
        var plotId = jsonInputs.get("plotId").getAsString();
        var userName = jsonInputs.get("userId").getAsString();
        var packet = jsonInputs.get("packet").getAsString();

        // NOTE: this is not an efficient implementation.
        var tsFile = "timesync-data-" + projectId + ".json";
        addElementToJsonFile(tsFile, jsonInputs,
                plot -> !plot.get("plotId").getAsString().equals(plotId)
                        || !plot.get("userId").getAsString().equals(userName)
                        || !plot.get("packet").getAsString().equals(packet));
        return "";
    }

    @Override
    public String saveComment(Request req, Response res) {
        return null;
    }

    @Override
    public String getComment(Request req, Response res) {
        return null;
    }

    @Override
    public String getImagePreference(Request req, Response res) {
        return null;
    }

    @Override
    public String updateImagePreference(Request req, Response res) {
        return null;
    }
}
