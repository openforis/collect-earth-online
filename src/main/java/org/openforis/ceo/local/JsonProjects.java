package org.openforis.ceo.local;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
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
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.function.IntSupplier;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.HttpServletResponse;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.openforis.ceo.db_api.Projects;
import spark.Request;
import spark.Response;

public class JsonProjects implements Projects {

    public String getAllProjects(Request req, Response res) {
        var userId = req.queryParams("userId");
        var institutionId = req.queryParams("institutionId");
        var projects = readJsonFile("project-list.json").getAsJsonArray();

        if (userId == null || userId.isEmpty()) {
            // Not logged in
            var filteredProjects = toStream(projects)
                    .filter(project -> project.get("archived").getAsBoolean() == false
                            && project.get("privacyLevel").getAsString().equals("public")
                            && project.get("availability").getAsString().equals("published"))
                    .map(project -> {
                        project.addProperty("editable", false);
                        return project;
                    });
            if (institutionId == null || institutionId.isEmpty()) {
                return filteredProjects.collect(intoJsonArray).toString();
            } else {
                return filteredProjects
                        .filter(project -> project.get("institution").getAsString().equals(institutionId))
                        .collect(intoJsonArray)
                        .toString();
            }
        } else {
            var institutionRoles = (new JsonUsers()).getInstitutionRoles(Integer.parseInt(userId));
            var filteredProjects = toStream(projects)
                    .filter(project -> project.get("archived").getAsBoolean() == false)
                    .filter(project -> {
                        var role = institutionRoles.getOrDefault(project.get("institution").getAsInt(), "");
                        var privacyLevel = project.get("privacyLevel").getAsString();
                        var availability = project.get("availability").getAsString();
                        if (role.equals("admin")) {
                            return (privacyLevel.equals("public") ||
                                    privacyLevel.equals("private") ||
                                    privacyLevel.equals("institution"))
                                    && (availability.equals("unpublished") ||
                                    availability.equals("published") ||
                                    availability.equals("closed"));
                        } else if (role.equals("member")) {
                            return (privacyLevel.equals("public") ||
                                    privacyLevel.equals("institution"))
                                    && availability.equals("published");
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
            if (institutionId == null || institutionId.isEmpty()) {
                return filteredProjects.collect(intoJsonArray).toString();
            } else {
                return filteredProjects
                        .filter(project -> project.get("institution").getAsString().equals(institutionId))
                        .collect(intoJsonArray)
                        .toString();
            }
        }
    }

    
    private static JsonObject singleProjectJson(String projectId){
        var projects = readJsonFile("project-list.json").getAsJsonArray();
        var matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));
        if (matchingProject.isPresent()) {
            return matchingProject.get();
        } else {
            return new JsonObject();
        }
    }

    public String getProjectById(Request req, Response res) {
        var projectId = req.params(":id");
        return singleProjectJson(projectId).toString();
    }

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
        var projectId = req.params(":project-id");
        var plotId = req.params(":plot-id");
        var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        var matchingPlot = findInJsonArray(plots, plot -> plot.get("id").getAsString().equals(plotId));
        if (matchingPlot.isPresent()) {
            return matchingPlot.get().toString();
        } else {
            return "";
        }
    }

    private static String[] getProjectUsers(String projectId) {
        var projects = readJsonFile("project-list.json").getAsJsonArray();
        var matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));
        if (matchingProject.isPresent()) {
            var project = matchingProject.get();
            var archived = project.get("archived").getAsBoolean();
            var privacyLevel = project.get("privacyLevel").getAsString();
            var availability = project.get("availability").getAsString();
            var institutionId = project.get("institution").getAsString();
            if (archived == true) {
                // return no users
                return new String[]{};
            } else if (privacyLevel.equals("public")) {
                // return all users
                var users = readJsonFile("user-list.json").getAsJsonArray();
                return toStream(users).map(user -> user.get("id").getAsString()).toArray(String[]::new);
            } else {
                var institutions = readJsonFile("institution-list.json").getAsJsonArray();
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
        } else {
            // return no users
            return new String[]{};
        }
    }

    public String getProjectStats(Request req, Response res) {
        var projectId = req.params(":id");
        var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        var flaggedPlots = filterJsonArray(plots, plot -> plot.get("flagged").getAsBoolean() == true);
        var analyzedPlots = filterJsonArray(plots, plot -> plot.get("analyses").getAsInt() > 0);
        var members = getProjectUsers(projectId);
        var project = singleProjectJson(projectId);
        var contributors = toStream(plots)
                .filter(plot -> !plot.get("user").isJsonNull())
                .map(plot -> plot.get("user").getAsString())
                .distinct()
                .toArray(String[]::new);

        var stats = new JsonObject();
        stats.addProperty("flaggedPlots", flaggedPlots.size());
        stats.addProperty("analyzedPlots", analyzedPlots.size());
        stats.addProperty("unanalyzedPlots", Math.max(0, plots.size() - flaggedPlots.size() - analyzedPlots.size()));
        stats.addProperty("members", members.length);
        stats.addProperty("contributors", contributors.length);
        stats.add("created_date", project.get("created_date"));
        stats.add("publish_date", project.get("publish_date"));
        stats.add("archive_date", project.get("archive_date"));
        stats.add("close_date", project.get("close_date"));
        return stats.toString();
    }

    public String getUnassignedPlot(Request req, Response res) {
        var projectId = req.params(":id");
        var currentPlotId = req.queryParams("currentPlotId");
        var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        var unanalyzedPlots = filterJsonArray(plots, plot -> plot.get("flagged").getAsBoolean() == false
                && plot.get("analyses").getAsInt() == 0
                && !plot.get("id").getAsString().equals(currentPlotId));
        var numPlots = unanalyzedPlots.size();
        if (numPlots > 0) {
            var randomIndex = (int) Math.floor(numPlots * Math.random());
            return unanalyzedPlots.get(randomIndex).toString();
        } else {
            return "done";
        }
    }

    public String getUnassignedPlotById(Request req, Response res) {
        var projectId = req.params(":projid");
        var plotId = req.params(":id");
        var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();

        var matchingPlot = findInJsonArray(plots, plot -> plot.get("id").getAsString().equals(plotId));
        if (matchingPlot.isPresent()) {
            var plot = matchingPlot.get();
            if (plot.get("flagged").getAsBoolean() == false && plot.get("analyses").getAsInt() == 0) {
                return plot.toString();
            } else {
                return "done";
            }
        } else {
            return "not found";
        }
    }

    private static Collector<String, ?, Map<String, Long>> countDistinct =
            Collectors.groupingBy(Function.identity(), Collectors.counting());

    // FIXME: Update this function for the new surveyQuestion JSON structure
    private static String[] getValueDistributionLabels(JsonObject project) {
        var sampleValueGroups = project.get("sampleValues").getAsJsonArray();
        return toStream(sampleValueGroups)
                .flatMap(group -> {
                    var sampleValues = group.get("values").getAsJsonArray();
                    return toStream(sampleValues)
                            .map(sampleValue -> group.get("name").getAsString() + ":" + sampleValue.get("name").getAsString());
                })
                .toArray(String[]::new);
    }

    // FIXME: Update this function for the new surveyQuestion JSON structure
    private static Map<Integer, String> getSampleValueTranslations(JsonObject project) {
        var sampleValueGroups = project.get("sampleValues").getAsJsonArray();
        var firstGroup = sampleValueGroups.get(0).getAsJsonObject();
        var firstGroupName = firstGroup.get("name").getAsString();
        return toStream(firstGroup.get("values").getAsJsonArray())
                .collect(Collectors.toMap(sampleValue -> sampleValue.get("id").getAsInt(),
                        sampleValue -> firstGroupName + ":" + sampleValue.get("name").getAsString(),
                        (a, b) -> b));
    }

    // FIXME: Update this function for the new surveyQuestion JSON structure
    // Returns a JsonObject like this:
    // {"Land Use:Timber" 10.0,
    //  "Land Use:Agriculture": 20.0,
    //  "Land Use:Urban": 70.0,
    //  "Land Cover:Forest": 10.0,
    //  "Land Cover:Grassland": 40.0,
    //  "Land Cover:Impervious": 50.0}
    private static JsonObject getValueDistribution(JsonArray samples, Map<Integer, String> sampleValueTranslations) {
        var firstSample = samples.get(0).getAsJsonObject();
        if (!firstSample.has("value")) {
            return new JsonObject();
        } else if (firstSample.get("value").isJsonPrimitive()) {
            var valueCounts = toStream(samples)
                    .map(sample -> sample.get("value").getAsInt())
                    .map(value -> sampleValueTranslations.getOrDefault(value, "NoValue"))
                    .collect(countDistinct);
            var valueDistribution = new JsonObject();
            valueCounts.forEach((name, count) -> valueDistribution.addProperty(name, 100.0 * count / samples.size()));
            return valueDistribution;
        } else {
            var valueCounts = toStream(samples)
                    .flatMap(sample -> sample.get("value").getAsJsonObject().entrySet().stream())
                    .collect(Collectors.groupingBy(Map.Entry::getKey,
                            Collectors.mapping(entry -> entry.getValue().getAsString(),
                                    countDistinct)));
            var valueDistribution = new JsonObject();
            valueCounts.forEach((group, frequencies) -> {
                frequencies.forEach((name, count) -> valueDistribution.addProperty(group + ":" + name, 100.0 * count / samples.size()));
            });
            return valueDistribution;
        }
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

    // FIXME: Update this function for the new surveyQuestion JSON structure
    public HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
        var projectId = req.params(":id");
        var projects = readJsonFile("project-list.json").getAsJsonArray();
        var matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));

        if (matchingProject.isPresent()) {
            var project = matchingProject.get();
            var sampleValueTranslations = getSampleValueTranslations(project);
            var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
            var plotSummaries = mapJsonArray(plots,
                    plot -> {
                        var samples = plot.get("samples").getAsJsonArray();
                        var center = parseJson(plot.get("center").getAsString()).getAsJsonObject();
                        var coords = center.get("coordinates").getAsJsonArray();
                        var plotSummary = new JsonObject();
                        plotSummary.addProperty("plot_id", plot.get("id").getAsInt());
                        plotSummary.addProperty("center_lon", coords.get(0).getAsDouble());
                        plotSummary.addProperty("center_lat", coords.get(1).getAsDouble());
                        plotSummary.addProperty("size_m", project.get("plotSize").getAsDouble());
                        plotSummary.addProperty("shape", project.get("plotShape").getAsString());
                        plotSummary.addProperty("flagged", plot.get("flagged").getAsBoolean());
                        plotSummary.addProperty("analyses", plot.get("analyses").getAsInt());
                        plotSummary.addProperty("sample_points", samples.size());
                        plotSummary.add("user_id", plot.get("user"));
                        plotSummary.add("collectTime", plot.get("collectTime"));
                        plotSummary.add("distribution",
                                getValueDistribution(samples, sampleValueTranslations));
                        return plotSummary;
                    });

            var fields = new String[]{"plot_id", "center_lon", "center_lat", "size_m", "shape", "flagged", "analyses", "sample_points", "user_id", "collectionTime"};
            var labels = getValueDistributionLabels(project);

            var csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase).collect(Collectors.joining(","));

            var csvContent = toStream(plotSummaries)
                    .map(plotSummary -> {
                        var fieldStream = Arrays.stream(fields);
                        var labelStream = Arrays.stream(labels);
                        var distribution = plotSummary.get("distribution").getAsJsonObject();
                        return Stream.concat(fieldStream.map(field -> plotSummary.get(field).isJsonNull()
                                        ? ""
                                        : plotSummary.get(field).getAsString()),
                                labelStream.map(label -> distribution.has(label)
                                        ? distribution.get(label).getAsString()
                                        : "0.0"))
                                .collect(Collectors.joining(","));
                    })
                    .collect(Collectors.joining("\n"));

            var projectName = project.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            var currentDate = LocalDate.now().toString();
            var outputFileName = "ceo-" + projectName + "-plot-data-" + currentDate;

            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        } else {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        }
    }

    // FIXME: Update this function for the new surveyQuestion JSON structure
    public HttpServletResponse dumpProjectRawData(Request req, Response res) {
        var projectId = req.params(":id");
        var projects = readJsonFile("project-list.json").getAsJsonArray();
        var matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));

        if (matchingProject.isPresent()) {
            var project = matchingProject.get();
            var sampleValueTranslations = getSampleValueTranslations(project);
            var plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
            var sampleSummaries = flatMapJsonArray(plots,
                    plot -> {
                        var plotId = plot.get("id").getAsInt();
                        var flagged = plot.get("flagged").getAsBoolean();
                        var analyses = plot.get("analyses").getAsInt();
                        var userId = plot.get("user");
                        var collectionTime = plot.get("collectionTime");
                        var samples = plot.get("samples").getAsJsonArray();
                        return toStream(samples).map(sample -> {
                            var center = parseJson(sample.get("point").getAsString())
                                    .getAsJsonObject();
                            var coords = center.get("coordinates").getAsJsonArray();
                            var sampleSummary = new JsonObject();
                            sampleSummary.addProperty("plot_id", plotId);
                            sampleSummary.addProperty("sample_id", sample.get("id").getAsInt());
                            sampleSummary.addProperty("lon", coords.get(0).getAsDouble());
                            sampleSummary.addProperty("lat", coords.get(1).getAsDouble());
                            sampleSummary.addProperty("flagged", flagged);
                            sampleSummary.addProperty("analyses", analyses);
                            sampleSummary.add("user_id", userId);
                            sampleSummary.add("collectionTime", collectionTime);
                            sampleSummary.add("value", sample.get("value"));
                            return sampleSummary;
                        });
                    });

            var sampleValueGroups = project.get("sampleValues").getAsJsonArray();
            var sampleValueGroupNames = toStream(sampleValueGroups)
                    .collect(Collectors.toMap(sampleValueGroup -> sampleValueGroup.get("id").getAsInt(),
                            sampleValueGroup -> sampleValueGroup.get("name").getAsString(),
                            (a, b) -> b));

            var fields = new String[]{"plot_id", "sample_id", "lon", "lat", "flagged", "analyses", "user_id", "collectionTime"};
            var labels = sampleValueGroupNames.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(Map.Entry::getValue).toArray(String[]::new);

            var csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase).collect(Collectors.joining(","));

            var csvContent = toStream(sampleSummaries)
                    .map(sampleSummary -> {
                        var fieldStream = Arrays.stream(fields);
                        var labelStream = Arrays.stream(labels);
                        return Stream.concat(fieldStream.map(field -> sampleSummary.get(field).isJsonNull() ? "" : sampleSummary.get(field).getAsString()),
                                labelStream.map(label -> {
                                    var value = sampleSummary.get("value");
                                    if (value.isJsonNull()) {
                                        return "";
                                    } else if (value.isJsonPrimitive()) {
                                        return sampleValueTranslations
                                                .getOrDefault(value.getAsInt(), "LULC:NoValue")
                                                .split(":")[1];
                                    } else {
                                        return value.getAsJsonObject().get(label).getAsString();
                                    }}))
                                .collect(Collectors.joining(","));
                    })
                    .collect(Collectors.joining("\n"));

            var projectName = project.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            var currentDate = LocalDate.now().toString();
            var outputFileName = "ceo-" + projectName + "-sample-data-" + currentDate;

            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        } else {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        }
    }

    public synchronized String publishProject(Request req, Response res) {
        var projectId = req.params(":id");
        mapJsonFile("project-list.json",
                project -> {
                    if (project.get("id").getAsString().equals(projectId)) {
                        project.addProperty("availability", "published");
                        project.addProperty("publish_date", LocalDate.now().toString());
                        return project;
                    } else {
                        return project;
                    }
                });
        return "";
    }

    public synchronized String closeProject(Request req, Response res) {
        var projectId = req.params(":id");
        mapJsonFile("project-list.json",
                project -> {
                    if (project.get("id").getAsString().equals(projectId)) {
                        project.addProperty("availability", "closed");
                        project.addProperty("close_date", LocalDate.now().toString());
                        return project;
                    } else {
                        return project;
                    }
                });
        return "";
    }

    public synchronized String archiveProject(Request req, Response res) {
        var projectId = req.params(":id");
        mapJsonFile("project-list.json",
                project -> {
                    if (project.get("id").getAsString().equals(projectId)) {
                        project.addProperty("availability", "archived");
                        project.addProperty("archive_date", LocalDate.now().toString());
                        project.addProperty("archived", true);
                        return project;
                    } else {
                        return project;
                    }
                });
        return "";
    }

    public synchronized String addUserSamples(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId = jsonInputs.get("projectId").getAsString();
        var plotId = jsonInputs.get("plotId").getAsString();
        var userName = jsonInputs.get("userId").getAsString();
        var userSamples = jsonInputs.get("userSamples").getAsJsonObject();

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
                                    return sample;
                                });
                        plot.add("samples", updatedSamples);
                        plot.addProperty("collectionTime", LocalDateTime.now().toString());
                        return plot;
                    } else {
                        return plot;
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
                        plot.addProperty("collectionTime", LocalDateTime.now().toString());
                        return plot;
                    } else {
                        return plot;
                    }
                });

        return "";
    }

    private static IntSupplier makeCounter() {
        var counter = new int[]{0}; // Have to use an array to move the value onto the heap
        return () -> { counter[0] += 1; return counter[0]; };
    }

    private static JsonObject makeGeoJsonPoint(double lon, double lat) {
        var coordinates = new JsonArray();
        coordinates.add(lon);
        coordinates.add(lat);

        var geoJsonPoint = new JsonObject();
        geoJsonPoint.addProperty("type", "Point");
        geoJsonPoint.add("coordinates", coordinates);

        return geoJsonPoint;
    }

    private static JsonObject makeGeoJsonPolygon(double lonMin, double latMin, double lonMax, double latMax) {
        var lowerLeft = new JsonArray();
        lowerLeft.add(lonMin);
        lowerLeft.add(latMin);

        var upperLeft = new JsonArray();
        upperLeft.add(lonMin);
        upperLeft.add(latMax);

        var upperRight = new JsonArray();
        upperRight.add(lonMax);
        upperRight.add(latMax);

        var lowerRight = new JsonArray();
        lowerRight.add(lonMax);
        lowerRight.add(latMin);

        var coordinates = new JsonArray();
        coordinates.add(lowerLeft);
        coordinates.add(upperLeft);
        coordinates.add(upperRight);
        coordinates.add(lowerRight);
        coordinates.add(lowerLeft);

        var polygon = new JsonArray();
        polygon.add(coordinates);

        var geoJsonPolygon = new JsonObject();
        geoJsonPolygon.addProperty("type", "Polygon");
        geoJsonPolygon.add("coordinates", polygon);

        return geoJsonPolygon;
    }

    private static Double[] reprojectPoint(Double[] point, int fromEPSG, int toEPSG) {
        try {
            var oldPoint = (new GeometryFactory(new PrecisionModel(), fromEPSG)).createPoint(new Coordinate(point[0], point[1]));
            var sourceCRS = CRS.decode("EPSG:" + fromEPSG, true);
            var targetCRS = CRS.decode("EPSG:" + toEPSG, true);
            var transform = CRS.findMathTransform(sourceCRS, targetCRS);
            var newPoint = JTS.transform(oldPoint, transform).getCoordinate();
            return new Double[]{newPoint.x, newPoint.y};
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Double[] reprojectBounds(double left, double bottom, double right, double top, int fromEPSG, int toEPSG) {
        var lowerLeft = reprojectPoint(new Double[]{left, bottom}, fromEPSG, toEPSG);
        var upperRight = reprojectPoint(new Double[]{right, top}, fromEPSG, toEPSG);
        return new Double[]{lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]};
    }

    private static Double[] padBounds(double left, double bottom, double right, double top, double buffer) {
        return new Double[]{left + buffer, bottom + buffer, right - buffer, top - buffer};
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    private static Double[][] createRandomPointsInBounds(double left, double bottom, double right, double top, int numPoints) {
        var xRange = right - left;
        var yRange = top - bottom;
        return Stream.generate(() -> new Double[]{left + Math.random() * xRange,
                bottom + Math.random() * yRange})
                .limit(numPoints)
                .map(point -> reprojectPoint(point, 3857, 4326))
                .toArray(Double[][]::new);
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    private static Double[][] createGriddedPointsInBounds(double left, double bottom, double right, double top, double spacing) {
        var xRange = right - left;
        var yRange = top - bottom;
        var xSteps = (long) Math.floor(xRange / spacing);
        var ySteps = (long) Math.floor(yRange / spacing);
        var xPadding = (xRange - xSteps * spacing) / 2.0;
        var yPadding = (yRange - ySteps * spacing) / 2.0;
        return Stream.iterate(left + xPadding, x -> x + spacing)
                .limit(xSteps + 1)
                .flatMap(x -> Stream.iterate(bottom + yPadding, y -> y + spacing)
                        .limit(ySteps + 1)
                        .map(y -> reprojectPoint(new Double[]{x, y}, 3857, 4326)))
                .toArray(Double[][]::new);
    }

    private static Double[][] createRandomSampleSet(Double[] plotCenter, String plotShape, double plotSize, int samplesPerPlot) {
        var plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        var plotX =  plotCenterWebMercator[0];
        var plotY =  plotCenterWebMercator[1];
        var radius = plotSize / 2.0;
        var left =   plotX - radius;
        var right =  plotX + radius;
        var top =    plotY + radius;
        var bottom = plotY - radius;
        if (plotShape.equals("circle")) {
            return Stream.generate(() -> 2.0 * Math.PI * Math.random())
                    .limit(samplesPerPlot)
                    .map(offsetAngle -> {
                        var offsetMagnitude = radius * Math.random();
                        var xOffset = offsetMagnitude * Math.cos(offsetAngle);
                        var yOffset = offsetMagnitude * Math.sin(offsetAngle);
                        return reprojectPoint(new Double[]{plotX + xOffset, plotY + yOffset}, 3857, 4326);
                    })
                    .toArray(Double[][]::new);
        } else {
            return createRandomPointsInBounds(left, bottom, right, top, samplesPerPlot);
        }
    }

    private static double squareDistance(double x1, double y1, double x2, double y2) {
        return Math.pow(x2 - x1, 2.0) + Math.pow(y2 - y1, 2.0);
    }

    private static Double[][] createGriddedSampleSet(Double[] plotCenter, String plotShape, double plotSize, double sampleResolution) {
        var plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        var centerX = plotCenterWebMercator[0];
        var centerY = plotCenterWebMercator[1];
        var radius = plotSize / 2.0;
        var radiusSquared = radius * radius;
        var left = centerX - radius;
        var bottom = centerY - radius;
        var right = centerX + radius;
        var top = centerY + radius;
        var steps = (long) Math.floor(plotSize / sampleResolution);
        var padding = (plotSize - steps * sampleResolution) / 2.0;
        return Stream.iterate(left + padding, x -> x + sampleResolution)
                .limit(steps + 1)
                .flatMap(x -> Stream.iterate(bottom + padding, y -> y + sampleResolution)
                        .limit(steps + 1)
                        .filter(y -> plotShape.equals("square") || squareDistance(x, y, centerX, centerY) < radiusSquared)
                        .map(y -> reprojectPoint(new Double[]{x, y}, 3857, 4326)))
                .toArray(Double[][]::new);
    }

    // NOTE: The CSV file should contain a header row (which will be skipped) and these fields: LON,LAT,PLOTID
    private static HashMap<String, Double[]> loadCsvPlotPoints(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            var plotPoints = new HashMap<String, Double[]>();
            lines
                .skip(1)
                .forEach(line -> {
                        var fields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                        var plotId = fields[2];
                        var plotCenter = new Double[]{Double.parseDouble(fields[0]),
                                                      Double.parseDouble(fields[1])};
                        plotPoints.put(plotId, plotCenter);
                    });
            return plotPoints;
        } catch (Exception e) {
            throw new RuntimeException("Malformed plot CSV. Fields must be LON,LAT,PLOTID.");
        }
    }

    // NOTE: The CSV file should contain a header row (which will be skipped) and these fields: LON,LAT,PLOTID,SAMPLEID
    private static HashMap<String, HashMap<String, Double[]>> loadCsvSamplePoints(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            var samplesByPlot = new HashMap<String, HashMap<String, Double[]>>();
            lines
                .skip(1)
                .forEach(line -> {
                        var fields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                        var plotId = fields[2];
                        var sampleId = fields[3];
                        var sampleCenter = new Double[]{Double.parseDouble(fields[0]),
                                                        Double.parseDouble(fields[1])};
                        if (samplesByPlot.containsKey(plotId)) {
                            var samplePoints = samplesByPlot.get(plotId);
                            samplePoints.put(sampleId, sampleCenter);
                        } else {
                            var samplePoints = new HashMap<String, Double[]>();
                            samplePoints.put(sampleId, sampleCenter);
                            samplesByPlot.put(plotId, samplePoints);
                        }
                    });
            return samplesByPlot;
        } catch (Exception e) {
            throw new RuntimeException("Malformed sample CSV. Fields must be LON,LAT,PLOTID,SAMPLEID.");
        }
    }

    private static Double[] calculateBounds(Double[][] points, double buffer) {
        var lons = Arrays.stream(points).map(point -> point[0]).toArray(Double[]::new);
        var lats = Arrays.stream(points).map(point -> point[1]).toArray(Double[]::new);
        var lonMin = Arrays.stream(lons).min(Comparator.naturalOrder()).get();
        var latMin = Arrays.stream(lats).min(Comparator.naturalOrder()).get();
        var lonMax = Arrays.stream(lons).max(Comparator.naturalOrder()).get();
        var latMax = Arrays.stream(lats).max(Comparator.naturalOrder()).get();
        var bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
        var paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], -buffer);
        return reprojectBounds(paddedBounds[0], paddedBounds[1], paddedBounds[2], paddedBounds[3], 3857, 4326);
    }

    private static JsonElement getOrZero(JsonObject obj, String field) {
        return obj.get(field).isJsonNull() ? new JsonPrimitive(0) : obj.get(field);
    }

    private static JsonElement getOrEmptyString(JsonObject obj, String field) {
        return obj.get(field).isJsonNull() ? new JsonPrimitive("") : obj.get(field);
    }

    private static void deleteShapeFileDirectory(String shapeFileDirectory) {
        var shapeFileDirectoryPath = Paths.get(expandResourcePath("/shp"), shapeFileDirectory);
        try {
            if (shapeFileDirectoryPath.toFile().exists()) {
                System.out.println("Deleting directory at: " + shapeFileDirectoryPath);
                Files.walk(shapeFileDirectoryPath)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            } else {
                System.out.println("No directory found at: " + shapeFileDirectoryPath);
            }
        } catch (Exception e) {
            System.out.println("Error deleting directory at: " + shapeFileDirectoryPath);
        }
    }

    private static void deleteShapeFileDirectories(int projectId) {
        deleteShapeFileDirectory("project-" + projectId + "-plots");
        deleteShapeFileDirectory("project-" + projectId + "-samples");
    }

    private static void extractZipFileToGeoJson(int projectId, String plotsOrSamples) {
        try {
            System.out.println("Converting the uploaded ZIP file into GeoJSON.");
            var pb = new ProcessBuilder("/bin/sh", "shp2geojson.sh", "project-" + projectId + "-" + plotsOrSamples);
            pb.directory(new File(expandResourcePath("/shp")));
            var p = pb.start();
            if (p.waitFor(10L, TimeUnit.SECONDS)) {
                System.out.println("Conversion complete.");
            } else {
                p.destroy();
                throw new RuntimeException("");
            }
        } catch (Exception e) {
             // for windows
             try {
                System.out.println("Converting the uploaded ZIP file into GeoJSON with git bash.");
                var pb = new ProcessBuilder("C:\\Program Files\\Git\\bin\\bash.exe", "shp2geojson.sh", "project-" + projectId + "-" + plotsOrSamples);
                pb.directory(new File(expandResourcePath("/shp")));
                var p = pb.start();
                if (p.waitFor(10L, TimeUnit.SECONDS)) {
                    System.out.println("Git bash Conversion complete.");
                } else {
                    p.destroy();
                    throw new RuntimeException("");
                }
            } catch (Exception e2) {
                deleteShapeFileDirectories(projectId);
                throw new RuntimeException("Error in processing the zipped Shapefile. Please check the format and try again.");
            }
        }
    }

    // The uploaded GeoJson must contain Polygon geometries with PLOTID properties
    private static HashMap<String, JsonObject> getGeoJsonPlotGeometries(int projectId) {
        try {
            var geoJson = readJsonFile("../shp/project-" + projectId + "-plots"
                                       + "/project-" + projectId + "-plots.json").getAsJsonObject();
            if (geoJson.get("type").getAsString().equals("FeatureCollection")) {
                var plotGeoms = new HashMap<String, JsonObject>();
                toStream(geoJson.get("features").getAsJsonArray())
                    .filter(feature -> {
                            var geometry = feature.get("geometry").getAsJsonObject();
                            return geometry.get("type").getAsString().equals("Polygon");
                        })
                    .forEach(feature -> {
                            var geometry = feature.get("geometry").getAsJsonObject();
                            var properties = feature.get("properties").getAsJsonObject();
                            var plotId = properties.get("PLOTID").getAsString();
                            plotGeoms.put(plotId, geometry);
                        });
                return plotGeoms;
            } else {
                throw new RuntimeException("");
            }
        } catch (Exception e) {
            deleteShapeFileDirectories(projectId);
            throw new RuntimeException("Malformed plot Shapefile. All features must be of type polygon and include a PLOTID field.");
        }
    }

    // The uploaded GeoJson must contain Polygon geometries with PLOTID and SAMPLEID properties
    private static HashMap<String, HashMap<String, JsonObject>> getGeoJsonSampleGeometries(int projectId) {
        try {
            var geoJson = readJsonFile("../shp/project-" + projectId + "-samples"
                                       + "/project-" + projectId + "-samples.json").getAsJsonObject();
            if (geoJson.get("type").getAsString().equals("FeatureCollection")) {
                var sampleGeomsByPlot = new HashMap<String, HashMap<String, JsonObject>>();
                toStream(geoJson.get("features").getAsJsonArray())
                    .filter(feature -> {
                            var geometry = feature.get("geometry").getAsJsonObject();
                            return geometry.get("type").getAsString().equals("Polygon");
                        })
                    .forEach(feature -> {
                            var geometry = feature.get("geometry").getAsJsonObject();
                            var properties = feature.get("properties").getAsJsonObject();
                            var plotId = properties.get("PLOTID").getAsString();
                            var sampleId = properties.get("SAMPLEID").getAsString();
                            if (sampleGeomsByPlot.containsKey(plotId)) {
                                var sampleGeoms = sampleGeomsByPlot.get(plotId);
                                sampleGeoms.put(sampleId, geometry);
                            } else {
                                var sampleGeoms = new HashMap<String, JsonObject>();
                                sampleGeoms.put(sampleId, geometry);
                                sampleGeomsByPlot.put(plotId, sampleGeoms);
                            }
                        });
                return sampleGeomsByPlot;
            } else {
                throw new RuntimeException("");
            }
        } catch (Exception e) {
            deleteShapeFileDirectories(projectId);
            throw new RuntimeException("Malformed sample Shapefile. All features must be of type polygon and include PLOTID and SAMPLEID fields.");
        }
    }

    private static Double[] getGeometryCentroid(JsonObject geoJsonGeometry) {
        var coordinates = geoJsonGeometry.get("coordinates").getAsJsonArray();
        var exteriorRing = coordinates.get(0).getAsJsonArray();
        var centroidX = toElementStream(exteriorRing)
            .skip(1) // linear rings repeat the same point as their first and last vertex
            .mapToDouble(point -> point.getAsJsonArray().get(0).getAsDouble())
            .average()
            .getAsDouble();
        var centroidY = toElementStream(exteriorRing)
            .skip(1) // linear rings repeat the same point as their first and last vertex
            .mapToDouble(point -> point.getAsJsonArray().get(1).getAsDouble())
            .average()
            .getAsDouble();
        return new Double[]{centroidX, centroidY};
    }

    // FIXME: Can you re-implement this using the Collectors functions?
    private static HashMap<String, Double[]> getPlotGeometryCenters(HashMap<String, JsonObject> plotGeoms) {
        var plotCenters = new HashMap<String, Double[]>();
        plotGeoms.entrySet().forEach(plot -> {
                var plotId = plot.getKey();
                var plotGeom = plot.getValue();
                var centroid = getGeometryCentroid(plotGeom);
                plotCenters.put(plotId, centroid);
            });
        return plotCenters;
    }

    // FIXME: Can you re-implement this using the Collectors functions?
    private static HashMap<String, HashMap<String, Double[]>> getSampleGeometryCenters(HashMap<String, HashMap<String, JsonObject>> sampleGeomsByPlot) {
        var sampleCentersByPlot = new HashMap<String, HashMap<String, Double[]>>();
        sampleGeomsByPlot.entrySet().forEach(plot -> {
                var plotId = plot.getKey();
                var sampleGeoms = plot.getValue();
                var sampleCenters = new HashMap<String, Double[]>();
                sampleGeoms.entrySet().forEach(sample -> {
                        var sampleId = sample.getKey();
                        var sampleGeom = sample.getValue();
                        var centroid = getGeometryCentroid(sampleGeom);
                        sampleCenters.put(sampleId, centroid);
                    });
                sampleCentersByPlot.put(plotId, sampleCenters);
            });
        return sampleCentersByPlot;
    }

    private static synchronized JsonObject createProjectPlots(JsonObject newProject) {
        // Store the parameters needed for plot generation in local variables with nulls set to 0
        var projectId =          newProject.get("id").getAsInt();
        var lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
        var latMin =             getOrZero(newProject,"latMin").getAsDouble();
        var lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
        var latMax =             getOrZero(newProject,"latMax").getAsDouble();
        var plotDistribution =   newProject.get("plotDistribution").getAsString();
        var numPlots =           getOrZero(newProject,"numPlots").getAsInt();
        var plotSpacing =        getOrZero(newProject,"plotSpacing").getAsDouble();
        var plotShape =          getOrEmptyString(newProject,"plotShape").getAsString();
        var plotSize =           getOrZero(newProject,"plotSize").getAsDouble();
        var sampleDistribution = newProject.get("sampleDistribution").getAsString();
        var samplesPerPlot =     getOrZero(newProject,"samplesPerPlot").getAsInt();
        var sampleResolution =   getOrZero(newProject,"sampleResolution").getAsDouble();

        // If plotDistribution is csv, calculate the lat/lon bounds from the csv contents
        var csvPlotPoints = new HashMap<String, Double[]>();
        if (plotDistribution.equals("csv")) {
            csvPlotPoints = loadCsvPlotPoints(newProject.get("plots-csv").getAsString());
            var csvPlotBounds = calculateBounds(csvPlotPoints.values().toArray(new Double[][]{}), plotSize / 2.0);
            lonMin = csvPlotBounds[0];
            latMin = csvPlotBounds[1];
            lonMax = csvPlotBounds[2];
            latMax = csvPlotBounds[3];
        }

        // If sampleDistribution is csv, calculate the lat/lon bounds from the csv contents
        var csvSamplePoints = new HashMap<String, HashMap<String, Double[]>>();
        if (sampleDistribution.equals("csv")) {
            csvSamplePoints = loadCsvSamplePoints(newProject.get("samples-csv").getAsString());
        }
        final var csvSamplePointsFinal = csvSamplePoints;

        // If plotDistribution is shp, calculate the lat/lon bounds from the shp contents
        var shpPlotGeoms = new HashMap<String, JsonObject>();
        var shpPlotCenters = new HashMap<String, Double[]>();
        if (plotDistribution.equals("shp")) {
            extractZipFileToGeoJson(projectId, "plots");
            shpPlotGeoms = getGeoJsonPlotGeometries(projectId);
            shpPlotCenters = getPlotGeometryCenters(shpPlotGeoms);
            var shpPlotBounds = calculateBounds(shpPlotCenters.values().toArray(new Double[][]{}), 500.0); // FIXME: replace hard-coded padding with a calculated value
            lonMin = shpPlotBounds[0];
            latMin = shpPlotBounds[1];
            lonMax = shpPlotBounds[2];
            latMax = shpPlotBounds[3];
        }
        final var shpPlotGeomsFinal = shpPlotGeoms;

        // If sampleDistribution is shp, calculate the lat/lon bounds from the shp contents
        var shpSampleGeoms = new HashMap<String, HashMap<String, JsonObject>>();
        var shpSampleCenters = new HashMap<String, HashMap<String, Double[]>>();
        if (sampleDistribution.equals("shp")) {
            extractZipFileToGeoJson(projectId, "samples");
            shpSampleGeoms = getGeoJsonSampleGeometries(projectId);
            shpSampleCenters = getSampleGeometryCenters(shpSampleGeoms);
        }
        final var shpSampleGeomsFinal = shpSampleGeoms;
        final var shpSampleCentersFinal = shpSampleCenters;

        // Store the lat/lon bounding box coordinates as GeoJSON and remove their original fields
        newProject.addProperty("boundary", makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());
        newProject.remove("lonMin");
        newProject.remove("latMin");
        newProject.remove("lonMax");
        newProject.remove("latMax");

        // Convert the lat/lon boundary coordinates to Web Mercator (units: meters) and apply an interior buffer of plotSize / 2
        var bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
        var paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], plotSize / 2.0);
        var left = paddedBounds[0];
        var bottom = paddedBounds[1];
        var right = paddedBounds[2];
        var top = paddedBounds[3];

        // Generate the plot objects and their associated sample points
        var newPlotCenters =
            plotDistribution.equals("random") ? createRandomPointsInBounds(left, bottom, right, top, numPlots)
            : plotDistribution.equals("gridded") ? createGriddedPointsInBounds(left, bottom, right, top, plotSpacing)
            : plotDistribution.equals("csv") ? csvPlotPoints.entrySet().toArray()
            : shpPlotCenters.entrySet().toArray();

        var plotIndexer = makeCounter();

        var newPlots = Arrays.stream(newPlotCenters)
            .map(plotEntry -> {
                    var newPlot = new JsonObject();
                    var newPlotId = plotIndexer.getAsInt();
                    newPlot.addProperty("id", newPlotId);
                    newPlot.addProperty("flagged", false);
                    newPlot.addProperty("analyses", 0);
                    newPlot.add("user", null);

                    var plotId =
                        List.of("csv", "shp").contains(plotDistribution)
                        ? (String) ((Map.Entry) plotEntry).getKey()
                        : "";

                    var plotCenter =
                        List.of("csv", "shp").contains(plotDistribution)
                        ? (Double[]) ((Map.Entry) plotEntry).getValue()
                        : (Double[]) plotEntry;

                    newPlot.addProperty("center", makeGeoJsonPoint(plotCenter[0], plotCenter[1]).toString());

                    if (List.of("csv", "shp").contains(plotDistribution)) {
                        newPlot.addProperty("plotId", plotId);
                    }

                    if (plotDistribution.equals("shp")) {
                        newPlot.addProperty("geom", shpPlotGeomsFinal.get(plotId).toString());
                    }

                    var newSamplePoints =
                        sampleDistribution.equals("random")
                        ? (List.of("random", "gridded", "csv").contains(plotDistribution)
                           ? createRandomSampleSet(plotCenter, plotShape, plotSize, samplesPerPlot)
                           : new Double[][]{plotCenter})
                        : (sampleDistribution.equals("gridded")
                           ? (List.of("random", "gridded", "csv").contains(plotDistribution)
                              ? createGriddedSampleSet(plotCenter, plotShape, plotSize, sampleResolution)
                              : new Double[][]{plotCenter})
                           : (sampleDistribution.equals("csv")
                              ? csvSamplePointsFinal.getOrDefault(plotId,  new HashMap<String, Double[]>()).entrySet().toArray()
                              : shpSampleCentersFinal.getOrDefault(plotId, new HashMap<String, Double[]>()).entrySet().toArray()));

                    var sampleIndexer = makeCounter();

                    var newSamples = Arrays.stream(newSamplePoints)
                        .map(sampleEntry -> {
                                var newSample = new JsonObject();
                                var newSampleId = sampleIndexer.getAsInt();
                                newSample.addProperty("id", newSampleId);

                                var sampleId =
                                    List.of("csv", "shp").contains(sampleDistribution)
                                    ? (String) ((Map.Entry) sampleEntry).getKey()
                                    : "";

                                var sampleCenter =
                                    List.of("csv", "shp").contains(sampleDistribution)
                                    ? (Double[]) ((Map.Entry) sampleEntry).getValue()
                                    : (Double[]) sampleEntry;

                                newSample.addProperty("point", makeGeoJsonPoint(sampleCenter[0], sampleCenter[1]).toString());

                                if (List.of("csv", "shp").contains(sampleDistribution)) {
                                    newSample.addProperty("sampleId", sampleId);
                                }

                                if (sampleDistribution.equals("shp")) {
                                    newSample.addProperty("geom", shpSampleGeomsFinal.get(plotId).get(sampleId).toString());
                                }

                                return newSample;
                            })
                        .collect(intoJsonArray);

                    newPlot.add("samples", newSamples);
                    return newPlot;
                })
            .collect(intoJsonArray);

        // Write the plot data to a new plot-data-<id>.json file
        writeJsonFile("plot-data-" + newProject.get("id").getAsString() + ".json", newPlots);

        // Update numPlots and samplesPerPlot to match the numbers that were generated
        newProject.addProperty("numPlots", newPlots.size());
        newProject.addProperty("samplesPerPlot", newPlots.get(0).getAsJsonObject().getAsJsonArray("samples").size());

        // Return the updated project object
        return newProject;
    }

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

            // Read in the existing project list
            var projects = readJsonFile("project-list.json").getAsJsonArray();

            // Generate a new project id
            var newProjectId = getNextId(projects);
            newProject.addProperty("id", newProjectId);

            // Upload the plot-distribution-csv-file if one was provided
            if (newProject.get("plotDistribution").getAsString().equals("csv")) {
                var csvFileName = writeFilePart(req,
                        "plot-distribution-csv-file",
                        expandResourcePath("/csv"),
                        "project-" + newProjectId + "-plots");
                newProject.addProperty("plots-csv", csvFileName);
            } else {
                newProject.add("plots-csv", null);
            }

            // Upload the sample-distribution-csv-file if one was provided
            if (newProject.get("sampleDistribution").getAsString().equals("csv")) {
                var csvFileName = writeFilePart(req,
                        "sample-distribution-csv-file",
                        expandResourcePath("/csv"),
                        "project-" + newProjectId + "-samples");
                newProject.addProperty("samples-csv", csvFileName);
            } else {
                newProject.add("samples-csv", null);
            }

            // Upload the plot-distribution-shp-file if one was provided (this should be a ZIP file)
            if (newProject.get("plotDistribution").getAsString().equals("shp")) {
                var shpFileName = writeFilePart(req,
                                                "plot-distribution-shp-file",
                                                expandResourcePath("/shp"),
                                                "project-" + newProjectId + "-plots");
                newProject.addProperty("plots-shp", shpFileName);
            } else {
                newProject.add("plots-shp", null);
            }

            // Upload the sample-distribution-shp-file if one was provided (this should be a ZIP file)
            if (newProject.get("sampleDistribution").getAsString().equals("shp")) {
                var shpFileName = writeFilePart(req,
                                                "sample-distribution-shp-file",
                                                expandResourcePath("/shp"),
                                                "project-" + newProjectId + "-samples");
                newProject.addProperty("samples-shp", shpFileName);
            } else {
                newProject.add("samples-shp", null);
            }

            // Add some missing fields that don't come from the web UI
            newProject.addProperty("archived", false);
            newProject.addProperty("availability", "unpublished");

            newProject.addProperty("created_date", LocalDate.now().toString());

            // Create the requested plot set and write it to plot-data-<newProjectId>.json
            var newProjectUpdated = createProjectPlots(newProject);

            // Write the new entry to project-list.json
            projects.add(newProjectUpdated);
            writeJsonFile("project-list.json", projects);

            // Indicate that the project was created successfully
            return newProjectId + "";
        } catch (Exception e) {
            // Indicate that an error occurred with project creation
            return e.getMessage();
        }
    }

}
