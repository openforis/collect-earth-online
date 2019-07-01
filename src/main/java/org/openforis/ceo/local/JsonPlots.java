package org.openforis.ceo.local;

import static org.openforis.ceo.local.JsonUsers.sumUserInfo;
import static org.openforis.ceo.utils.JsonUtils.elementToArray;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
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
import java.util.Comparator;
import java.util.function.Predicate;
import java.util.stream.Stream;
import org.openforis.ceo.db_api.Plots;
import spark.Request;
import spark.Response;

public class JsonPlots implements Plots {

    public String getProjectPlots(Request req, Response res) {
        var projectId = req.queryParams("projectId");
        var maxPlots = Integer.parseInt(req.queryParams("max"));
        var plots = elementToArray(readJsonFile("plot-data-" + projectId + ".json"));
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
        final var projectId = req.queryParams("projectId");
        final var plotId = req.queryParams("plotId");
        final var plots = elementToArray(readJsonFile("plot-data-" + projectId + ".json"));
        final var matchingPlot = findInJsonArray(plots, plot -> plot.get("id").getAsString().equals(plotId));
        if (matchingPlot.isPresent()) {
            return matchingPlot.get().toString();
        } else {
            return "";
        }
    }

    private static Boolean isLocked(JsonObject plot) {
        return plot.has("locks") && toStream(plot.get("locks").getAsJsonArray())
                                    .anyMatch(l -> l.get("lockEnd").getAsLong() > System.currentTimeMillis());
    }

    private static Integer getBestPlotId(JsonObject plot) {
        return plot.has("plotId") ? plot.get("plotId").getAsInt() : plot.get("id").getAsInt();
    }

    private static String singlePlotReturn(
                            Comparator<JsonObject> sortComparator,
                            Predicate<JsonObject> filterPredicate,
                            Integer projectId,
                            Boolean getUserPlots,
                            String userName,
                            Integer userId
    ) {

        final var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();

        final var matchingPlot = toStream(plots)
                                    .filter(pl -> getUserPlots
                                        ?  getOrEmptyString(pl, "user").getAsString().equals(userName)
                                        :  pl.get("analyses").getAsInt() == 0
                                            && pl.get("flagged").getAsBoolean() == false
                                            && !isLocked(pl)
                                    )
                                    .filter(filterPredicate)
                                    .sorted(sortComparator)
                                    .findFirst();

        if (matchingPlot.isPresent()) {
            unlockLockPlots(projectId, matchingPlot.get().get("id").getAsInt(), userId);
            return matchingPlot.get().toString();
        } else {
            return "done";
        }
    }

    public synchronized String getPlotById(Request req, Response res) {
        final var getUserPlots =       Boolean.parseBoolean(req.queryParams("getUserPlots"));
        final var projectId =          Integer.parseInt(req.queryParams("projectId"));
        final var plotId =             Integer.parseInt(req.queryParams("plotId"));
        final var userId =             Integer.parseInt(req.queryParams("userId"));
        final var userName =           req.queryParams("userName");;

        return singlePlotReturn(
                (a,b) -> 0,
                pl -> getBestPlotId(pl) == plotId,
                projectId,
                getUserPlots,
                userName,
                userId
        );
    }

    public synchronized String getNextPlot(Request req, Response res) {
        final var getUserPlots =       Boolean.parseBoolean(req.queryParams("getUserPlots"));
        final var projectId =          Integer.parseInt(req.queryParams("projectId"));
        final var plotId =             Integer.parseInt(req.queryParams("plotId"));
        final var userId =             Integer.parseInt(req.queryParams("userId"));
        final var userName =           req.queryParams("userName");

        return singlePlotReturn(
                (a, b) -> getBestPlotId(a) - getBestPlotId(b),
                pl -> getBestPlotId(pl) > plotId,
                projectId,
                getUserPlots,
                userName,
                userId
        );

    }

    public synchronized String getPrevPlot(Request req, Response res) {
        final var getUserPlots =       Boolean.parseBoolean(req.queryParams("getUserPlots"));
        final var projectId =          Integer.parseInt(req.queryParams("projectId"));
        final var plotId =             Integer.parseInt(req.queryParams("plotId"));
        final var userId =             Integer.parseInt(req.queryParams("userId"));
        final var userName =           req.queryParams("userName");

        return singlePlotReturn(
                (a, b) -> getBestPlotId(b) - getBestPlotId(a),
                pl -> getBestPlotId(pl) < plotId,
                projectId,
                getUserPlots,
                userName,
                userId
        );

    }

    public String resetPlotLock(Request req, Response res) {
        final var jsonInputs =            parseJson(req.body()).getAsJsonObject();
        final var projectId =             jsonInputs.get("projectId").getAsInt();
        final var plotId =                jsonInputs.get("plotId").getAsInt();
        final var userId =                jsonInputs.get("userId").getAsInt();

        mapJsonFile("plot-data-" + projectId + ".json",
                plot -> {
                    if (plot.get("id").getAsInt() == plotId && plot.has("locks")) {
                        final var updatedLocks = mapJsonArray(plot.get("locks").getAsJsonArray(),
                            lock -> {
                                final var lockUserId = lock.get("userId").getAsInt();
                                if (lockUserId == userId) {
                                    lock.addProperty("lockEnd", System.currentTimeMillis() +  5 * 60 * 1000);
                                    return lock;
                                } else {
                                    return lock;
                                }
                            });
                        plot.add("locks", updatedLocks);
                        return plot;
                    } else {
                        return plot;
                    }
                });
        return "";
    }

    public String releasePlotLocks(Request req, Response res) {
        final var userId =                Integer.parseInt(req.queryParams("userId"));
        final var projectId =             Integer.parseInt(req.queryParams("projectId"));

        return unlockLockPlots(projectId, -1, userId);
    }

    private static String unlockLockPlots(Integer projectId, Integer plotIdToLock, Integer userId) {
        mapJsonFile("plot-data-" + projectId + ".json",
            plot -> {
                var unlockedPlot = unlockPlot(plot, userId);
                if (unlockedPlot.get("id").getAsInt() == plotIdToLock) {
                    var updatedLocks = unlockedPlot.has("locks") ? unlockedPlot.get("locks").getAsJsonArray() : new JsonArray();
                    var userLock = new JsonObject();
                    userLock.addProperty("userId", Integer.toString(userId));
                    userLock.addProperty("lockEnd", System.currentTimeMillis() +  5 * 60 * 1000);
                    updatedLocks.add(userLock);
                    unlockedPlot.add("locks", updatedLocks);
                    return unlockedPlot;
                } else {
                    return unlockedPlot;
            }
        });
        return "";
    }

    private static JsonObject unlockPlot(JsonObject plot, Integer userId) {
        if (plot.has("locks")) {
            final var updatedLocks = filterJsonArray(plot.get("locks").getAsJsonArray(),
                lock -> {
                    final var lockUserId = lock.get("userId").getAsInt();
                    final var lockEnd = lock.get("lockEnd").getAsLong();
                    return lockUserId != userId && lockEnd > System.currentTimeMillis();
                });
            plot.add("locks", updatedLocks);
            return plot;
        } else {
            return plot;
        }
    }

    public String addUserSamples(Request req, Response res) {
        var jsonInputs =            parseJson(req.body()).getAsJsonObject();
        var projectId =             jsonInputs.get("projectId").getAsString();
        var plotId =                jsonInputs.get("plotId").getAsString();
        var userName =              jsonInputs.get("userName").getAsString();
        var userId =                jsonInputs.get("userId").getAsInt();
        var confidence =            jsonInputs.get("confidence").getAsInt();
        var collectionStart =       jsonInputs.get("collectionStart").getAsLong();
        var userSamples =           jsonInputs.get("userSamples").getAsJsonObject();
        var userImages =            jsonInputs.get("userImages").getAsJsonObject();

        final var collectionTime = System.currentTimeMillis();
        mapJsonFile("plot-data-" + projectId + ".json",
                plot -> {
                    if (plot.get("id").getAsString().equals(plotId)) {
                        var lastUser = getOrEmptyString(plot, "user").getAsString();
                        var samples = plot.get("samples").getAsJsonArray();
                        var updatedSamples = mapJsonArray(samples,
                                sample -> {
                                    var sampleId = sample.get("id").getAsString();
                                    sample.add("value", userSamples.get(sampleId));
                                    sample.add("userImage", userImages.get(sampleId));
                                    return sample;
                                });
                        if (lastUser.equals("")) {
                            var currentAnalyses = plot.get("analyses").getAsInt();
                            plot.addProperty("analyses", currentAnalyses + 1);
                            plot.addProperty("user", userName);
                            plot.addProperty("collectionTime", collectionTime);
                            plot.addProperty("confidence", confidence == -1 ? null : Integer.toString(confidence));
                            plot.addProperty("collectionStart", collectionStart);
                            plot.add("samples", updatedSamples);
                            updateUserStats(projectId, collectionStart, collectionTime, userName);
                            return unlockPlot(plot, userId);
                        } else if (lastUser.equals(userName)) {
                            plot.add("samples", updatedSamples);
                            return unlockPlot(plot, userId);
                        } else {
                            return unlockPlot(plot, userId);
                        }
                    } else {
                        return plot;
                    }
                });
        return "";
    }

    private static String updateUserStats(String projectId, Long collectionStart, Long collectionTime, String userName) {
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

    public String flagPlot(Request req, Response res) {
        var jsonInputs =        parseJson(req.body()).getAsJsonObject();
        var projectId =         jsonInputs.get("projectId").getAsString();
        var plotId =            jsonInputs.get("plotId").getAsString();
        var userId =            jsonInputs.get("userId").getAsInt();
        var userName =          jsonInputs.get("userName").getAsString();

        mapJsonFile("plot-data-" + projectId + ".json",
                plot -> {
                    if (plot.get("id").getAsString().equals(plotId)) {
                        plot.addProperty("flagged", true);
                        plot.addProperty("user", userName);
                        plot.addProperty("collectionTime", System.currentTimeMillis());

                        return unlockPlot(plot, userId);
                    } else {
                        return plot;
                    }
                });

        return "";
    }

}
