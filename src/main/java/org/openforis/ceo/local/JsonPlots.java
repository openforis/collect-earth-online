package org.openforis.ceo.local;

import static org.openforis.ceo.local.JsonUsers.sumUserInfo;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.flatMapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.intoJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonFile;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.ProjectUtils.getOrEmptyString;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import java.time.LocalDate;
import java.io.File;
import java.io.StringWriter;
import java.io.PrintWriter;
import java.text.DateFormat; 
import java.text.SimpleDateFormat; 
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date; 
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.IntSupplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.openforis.ceo.db_api.Plots;
import spark.Request;
import spark.Response;

public class JsonPlots implements Plots {

    public String getProjectPlots(Request req, Response res) {
        var projectId = req.params(":id");
        var maxPlots = Integer.parseInt(req.params(":max"));
        var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        var numPlots = plots.size();
        if (numPlots > maxPlots) {
            var stepSize = 1.0 * numPlots / maxPlots;
            return Stream.iterate(0.0, i -> i + stepSize)
                    .limit(maxPlots)
                    .map(i -> plots.get(Math.toIntExact(Math.round(i))))
                    .collect(intoJsonArray)
                    .toString();
        } else {
            return plots.toString();
        }
    }

    public String getProjectPlot(Request req, Response res) {
        var projectId = req.params(":projid");
        var plotId = req.params(":plotid");
        var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        var matchingPlot = findInJsonArray(plots, plot -> plot.get("id").getAsString().equals(plotId));
        if (matchingPlot.isPresent()) {
            return matchingPlot.get().toString();
        } else {
            return "";
        }
    }


    public String getPlotById(Request req, Response res) {
        final var projectId =       req.params(":projid");
        final var currPlotId =      req.params(":id");
        final var userName =        req.queryParamOrDefault("userName", "");

        final var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();

        // Search through user plots or unanalyzed plots
        final var searchPlots = userName.length() > 0 
            ? filterJsonArray(plots, pl -> getOrEmptyString(pl, "user").getAsString().equals(userName))
            :  filterJsonArray(plots, pl -> pl.get("analyses").getAsInt() == 0 && pl.get("flagged").getAsBoolean() == false);

        final var matchingPlotId = toStream(searchPlots)
                .map(pl -> pl.has("plotId") ? pl.get("plotId").getAsInt() : pl.get("id").getAsInt())
                .sorted()
                .filter(plotId -> plotId == Integer.parseInt(currPlotId))
                .findFirst();

        if (matchingPlotId.isPresent()) {
            var nextPlotId = matchingPlotId.get();
            var nextPlot = findInJsonArray(searchPlots, plot -> plot.has("plotId") 
                                                                ? plot.get("plotId").getAsInt() == nextPlotId 
                                                                : plot.get("id").getAsInt() == nextPlotId);
            return nextPlot.get().toString();
        } else {
            return "done";
        }
    }

    public String getNextPlot(Request req, Response res) {
        final var projectId =       req.params(":projid");
        final var currPlotId =      req.params(":id");
        final var userName =        req.queryParamOrDefault("userName", "");

        final var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();

        // Search through user plots or unanalyzed plots
        final var searchPlots = userName.length() > 0 
            ? filterJsonArray(plots, pl -> getOrEmptyString(pl, "user").getAsString().equals(userName))
            :  filterJsonArray(plots, pl -> pl.get("analyses").getAsInt() == 0 && pl.get("flagged").getAsBoolean() == false);

        final var matchingPlotId = toStream(searchPlots)
                .map(pl -> pl.has("plotId") ? pl.get("plotId").getAsInt() : pl.get("id").getAsInt())
                .sorted()
                .filter(plotId -> plotId > Integer.parseInt(currPlotId))
                .findFirst();

        if (matchingPlotId.isPresent()) {
            var nextPlotId = matchingPlotId.get();
            var nextPlot = findInJsonArray(searchPlots, plot -> plot.has("plotId") ? plot.get("plotId").getAsInt() == nextPlotId : plot.get("id").getAsInt() == nextPlotId);
            return nextPlot.get().toString();
        } else {
            return "done";
        }
    }

    public String getPrevPlot(Request req, Response res) {
        final var projectId =       req.params(":projid");
        final var currPlotId =      req.params(":id");
        final var userName =        req.queryParamOrDefault("userName", "");

        final var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        
        // Search through user plots or unanalyzed plots
        final var searchPlots = userName.length() > 0 
            ? filterJsonArray(plots, pl -> getOrEmptyString(pl, "user").getAsString().equals(userName))
            :  filterJsonArray(plots, pl -> pl.get("analyses").getAsInt() == 0 && pl.get("flagged").getAsBoolean() == false);

        final var matchingPlotId = toStream(searchPlots)
                .map(pl -> pl.has("plotId") ? pl.get("plotId").getAsInt() : pl.get("id").getAsInt())
                .sorted()
                .filter(plotId -> plotId < Integer.parseInt(currPlotId))
                .reduce((first, second) -> second);

        if (matchingPlotId.isPresent()) {
            var prevPlotId = matchingPlotId.get();
            var prevPlot = findInJsonArray(searchPlots, plot -> plot.has("plotId") ? plot.get("plotId").getAsInt() == prevPlotId : plot.get("id").getAsInt() == prevPlotId);
            return prevPlot.get().toString();
        } else {
            return "done";
        }
    }

    public String resetPlotLock(Request req, Response res) {return "";}
    public String releasePlotLock(Request req, Response res) {return "";}

    private static String unlockPlot(Integer plotId, Integer userId) {return "";}
    private static String lockPlot(Integer plotId, Integer userId, Integer seconds) {return "";}


    public synchronized String addUserSamples(Request req, Response res) {
        var jsonInputs =            parseJson(req.body()).getAsJsonObject();
        var projectId =             jsonInputs.get("projectId").getAsString();
        var plotId =                jsonInputs.get("plotId").getAsString();
        var userName =              jsonInputs.get("userId").getAsString();
        var confidence =            jsonInputs.get("confidence").getAsInt();
        var collectionStart =       jsonInputs.get("collectionStart").getAsLong();
        var userSamples =           jsonInputs.get("userSamples").getAsJsonObject();
        var userImages =            jsonInputs.get("userImages").getAsJsonObject();

        final var collectionTime = System.currentTimeMillis();
        mapJsonFile("plot-data-" + projectId + ".json",
                plot -> {
                    if (plot.get("id").getAsString().equals(plotId)) {
                        var currentAnalyses = plot.get("analyses").getAsInt();
                        plot.addProperty("analyses", currentAnalyses + 1);
                        plot.addProperty("user", userName);
                        var samples = plot.get("samples").getAsJsonArray();
                        var updatedSamples = mapJsonArray(samples,
                                sample -> {
                                    var sampleId = sample.get("id").getAsString();
                                    sample.add("value", userSamples.get(sampleId));
                                    sample.add("userImage", userImages.get(sampleId));
                                    return sample;
                                });
                        plot.add("samples", updatedSamples);
                        plot.addProperty("collectionTime", collectionTime);
                        plot.addProperty("confidence", confidence == -1 ? null : Integer.toString(confidence));
                        plot.addProperty("collectionStart", collectionStart);
                        return plot;
                    } else {
                        return plot;
                    }
                });
        // add new stats to project summary for speed in retreiving
        mapJsonFile("project-list.json",
                project -> {
                    if (project.get("id").getAsString().equals(projectId)) {


                        var newUserStats = new JsonObject();
                        newUserStats.addProperty("milliSecs", (int) (collectionTime - collectionStart));
                        newUserStats.addProperty("plots", 1);
                        newUserStats.addProperty("timedPlots", 1);
                        newUserStats.addProperty("user", userName);

                        project.add("userStats", 
                                    sumUserInfo(project.has("userStats") 
                                                    ? project.get("userStats").getAsJsonArray()
                                                    : new JsonArray()
                                                , newUserStats)
                                    );
                        return project;
                    } else {
                        return project;
                    }
                });

        return "";
    }

    public synchronized String flagPlot(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId = jsonInputs.get("projectId").getAsString();
        var plotId = jsonInputs.get("plotId").getAsString();
        var userName = jsonInputs.get("userId").getAsString();

        mapJsonFile("plot-data-" + projectId + ".json",
                plot -> {
                    if (plot.get("id").getAsString().equals(plotId)) {
                        plot.addProperty("flagged", true);
                        plot.addProperty("user", userName);
                        plot.addProperty("collectionTime", System.currentTimeMillis());
                        return plot;
                    } else {
                        return plot;
                    }
                });

        return "";
    }

}