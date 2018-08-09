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
import com.vividsolutions.jts.geom.Point;
import com.vividsolutions.jts.geom.PrecisionModel;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map.Entry;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.IntSupplier;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.HttpServletResponse;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.opengis.referencing.operation.MathTransform;
import spark.Request;
import spark.Response;

public class JsonProjects {

    public static String getAllProjects(Request req, Response res) {
        String userId = req.queryParams("userId");
        String institutionId = req.queryParams("institutionId");
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();

        if (userId == null || userId.isEmpty()) {
            // Not logged in
            Stream<JsonObject> filteredProjects = toStream(projects)
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
            Map<Integer, String> institutionRoles = JsonUsers.getInstitutionRoles(Integer.parseInt(userId));
            Stream<JsonObject> filteredProjects = toStream(projects)
                .filter(project -> project.get("archived").getAsBoolean() == false)
                .filter(project -> {
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

    public static String getProjectById(Request req, Response res) {
        String projectId = req.params(":id");
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));
        if (matchingProject.isPresent()) {
            return matchingProject.get().toString();
        } else {
            return "";
        }
    }

    public static String getProjectPlots(Request req, Response res) {
        String projectId = req.params(":id");
        int maxPlots = Integer.parseInt(req.params(":max"));
        JsonArray plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        int numPlots = plots.size();
        if (numPlots > maxPlots) {
            double stepSize = 1.0 * numPlots / maxPlots;
            return Stream.iterate(0.0, i -> i + stepSize)
                .limit(maxPlots)
                .map(i -> plots.get(Math.toIntExact(Math.round(i))))
                .collect(intoJsonArray)
                .toString();
        } else {
            return plots.toString();
        }
    }

    private static String[] getProjectUsers(String projectId) {
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));
        if (matchingProject.isPresent()) {
            JsonObject project = matchingProject.get();
            boolean archived = project.get("archived").getAsBoolean();
            String privacyLevel = project.get("privacyLevel").getAsString();
            String availability = project.get("availability").getAsString();
            String institutionId = project.get("institution").getAsString();
            if (archived == true) {
                // return no users
                return new String[]{};
            } else if (privacyLevel.equals("public")) {
                // return all users
                JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
                return toStream(users).map(user -> user.get("id").getAsString()).toArray(String[]::new);
            } else {
                JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
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
        } else {
            // return no users
            return new String[]{};
        }
    }

    public static String getProjectStats(Request req, Response res) {
        String projectId = req.params(":id");
        JsonArray plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        JsonArray flaggedPlots = filterJsonArray(plots, plot -> plot.get("flagged").getAsBoolean() == true);
        JsonArray analyzedPlots = filterJsonArray(plots, plot -> plot.get("analyses").getAsInt() > 0);
        String[] members = getProjectUsers(projectId);
        String[] contributors = toStream(plots)
            .filter(plot -> !plot.get("user").isJsonNull())
            .map(plot -> plot.get("user").getAsString())
            .distinct()
            .toArray(String[]::new);

        JsonObject stats = new JsonObject();
        stats.addProperty("flaggedPlots", flaggedPlots.size());
        stats.addProperty("analyzedPlots", analyzedPlots.size());
        stats.addProperty("unanalyzedPlots", Math.max(0, plots.size() - flaggedPlots.size() - analyzedPlots.size()));
        stats.addProperty("members", members.length);
        stats.addProperty("contributors", contributors.length);
        return stats.toString();
    }

    public static String getUnanalyzedPlot(Request req, Response res) {
        String projectId = req.params(":id");
        String currentPlotId = req.queryParams("currentPlotId");
        JsonArray plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
        JsonArray unanalyzedPlots = filterJsonArray(plots, plot -> plot.get("flagged").getAsBoolean() == false
                                                                   && plot.get("analyses").getAsInt() == 0
                                                                   && !plot.get("id").getAsString().equals(currentPlotId));
        int numPlots = unanalyzedPlots.size();
        if (numPlots > 0) {
            int randomIndex = (int) Math.floor(numPlots * Math.random());
            return unanalyzedPlots.get(randomIndex).toString();
        } else {
            return "done";
        }
    }

    public static String getUnanalyzedPlotById(Request req, Response res) {
        String projectId = req.params(":projid");
        String plotId = req.params(":id");
        JsonArray plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();

        Optional<JsonObject> matchingPlot = findInJsonArray(plots, plot -> plot.get("id").getAsString().equals(plotId));
        if (matchingPlot.isPresent()) {
            JsonObject plot = matchingPlot.get();
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

    private static String[] getValueDistributionLabels(JsonObject project) {
        JsonArray sampleValueGroups = project.get("sampleValues").getAsJsonArray();
        return toStream(sampleValueGroups)
            .flatMap(group -> {
                    JsonArray sampleValues = group.get("values").getAsJsonArray();
                    return toStream(sampleValues).map(sampleValue -> group.get("name").getAsString() + ":" + sampleValue.get("name").getAsString());
                })
            .toArray(String[]::new);
    }

    private static Map<Integer, String> getSampleValueTranslations(JsonObject project) {
        JsonArray sampleValueGroups = project.get("sampleValues").getAsJsonArray();
        JsonObject firstGroup = sampleValueGroups.get(0).getAsJsonObject();
        String firstGroupName = firstGroup.get("name").getAsString();
        return toStream(firstGroup.get("values").getAsJsonArray())
            .collect(Collectors.toMap(sampleValue -> sampleValue.get("id").getAsInt(),
                                      sampleValue -> firstGroupName + ":" + sampleValue.get("name").getAsString(),
                                      (a, b) -> b));
    }

    // Returns a JsonObject like this:
    // {"Land Use:Timber" 10.0,
    //  "Land Use:Agriculture": 20.0,
    //  "Land Use:Urban": 70.0,
    //  "Land Cover:Forest": 10.0,
    //  "Land Cover:Grassland": 40.0,
    //  "Land Cover:Impervious": 50.0}
    private static JsonObject getValueDistribution(JsonArray samples, Map<Integer, String> sampleValueTranslations) {
        JsonObject firstSample = samples.get(0).getAsJsonObject();
        if (! firstSample.has("value")) {
            return new JsonObject();
        } else if (firstSample.get("value").isJsonPrimitive()) {
            Map<String, Long> valueCounts = toStream(samples)
                .map(sample -> sample.get("value").getAsInt())
                .map(value -> sampleValueTranslations.getOrDefault(value, "NoValue"))
                .collect(countDistinct);
            JsonObject valueDistribution = new JsonObject();
            valueCounts.forEach((name, count) -> valueDistribution.addProperty(name, 100.0 * count / samples.size()));
            return valueDistribution;
        } else {
            Map<String, Map<String, Long>> valueCounts = toStream(samples)
                .flatMap(sample -> sample.get("value").getAsJsonObject().entrySet().stream())
                .collect(Collectors.groupingBy(Map.Entry::getKey,
                                               Collectors.mapping(entry -> entry.getValue().getAsString(),
                                                                  countDistinct)));
            JsonObject valueDistribution = new JsonObject();
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

        try (OutputStream os = response.getOutputStream()) {
            os.write((header + "\n").getBytes());
            os.write(content.getBytes());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        return response;
    }

    public static HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
        String projectId = req.params(":id");
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));

        if (matchingProject.isPresent()) {
            JsonObject project = matchingProject.get();
            Map<Integer, String> sampleValueTranslations = getSampleValueTranslations(project);
            JsonArray plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
            JsonArray plotSummaries = mapJsonArray(plots,
                                                   plot -> {
                                                       JsonArray samples = plot.get("samples").getAsJsonArray();
                                                       JsonObject center = parseJson(plot.get("center").getAsString()).getAsJsonObject();
                                                       JsonArray coords = center.get("coordinates").getAsJsonArray();
                                                       JsonObject plotSummary = new JsonObject();
                                                       plotSummary.addProperty("plot_id", plot.get("id").getAsInt());
                                                       plotSummary.addProperty("center_lon", coords.get(0).getAsDouble());
                                                       plotSummary.addProperty("center_lat", coords.get(1).getAsDouble());
                                                       plotSummary.addProperty("size_m", project.get("plotSize").getAsDouble());
                                                       plotSummary.addProperty("shape", project.get("plotShape").getAsString());
                                                       plotSummary.addProperty("flagged", plot.get("flagged").getAsBoolean());
                                                       plotSummary.addProperty("analyses", plot.get("analyses").getAsInt());
                                                       plotSummary.addProperty("sample_points", samples.size());
                                                       plotSummary.add("user_id", plot.get("user"));
                                                       plotSummary.add("timestamp", plot.get("timestamp"));
                                                       plotSummary.add("distribution", getValueDistribution(samples, sampleValueTranslations));
                                                       return plotSummary;
                                                   });

            String[] fields = {"plot_id", "center_lon", "center_lat", "size_m", "shape", "flagged", "analyses", "sample_points", "user_id", "timestamp"};
            String[] labels = getValueDistributionLabels(project);

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

            String projectName = project.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            String currentDate = LocalDate.now().toString();
            String outputFileName = "ceo-" + projectName + "-plot-data-" + currentDate;

            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        } else {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        }
    }

    public static HttpServletResponse dumpProjectRawData(Request req, Response res) {
        String projectId = req.params(":id");
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));

        if (matchingProject.isPresent()) {
            JsonObject project = matchingProject.get();
            Map<Integer, String> sampleValueTranslations = getSampleValueTranslations(project);
            JsonArray plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
            JsonArray sampleSummaries = flatMapJsonArray(plots,
                                                         plot -> {
                                                             Integer plotId = plot.get("id").getAsInt();
                                                             Boolean flagged = plot.get("flagged").getAsBoolean();
                                                             Integer analyses = plot.get("analyses").getAsInt();
                                                             JsonElement userId = plot.get("user");
                                                             JsonElement timestamp = plot.get("timestamp");
                                                             JsonArray samples = plot.get("samples").getAsJsonArray();
                                                             return toStream(samples).map(sample -> {
                                                                     JsonObject center = parseJson(sample.get("point").getAsString()).getAsJsonObject();
                                                                     JsonArray coords = center.get("coordinates").getAsJsonArray();
                                                                     JsonObject sampleSummary = new JsonObject();
                                                                     sampleSummary.addProperty("plot_id", plotId);
                                                                     sampleSummary.addProperty("sample_id", sample.get("id").getAsInt());
                                                                     sampleSummary.addProperty("lon", coords.get(0).getAsDouble());
                                                                     sampleSummary.addProperty("lat", coords.get(1).getAsDouble());
                                                                     sampleSummary.addProperty("flagged", flagged);
                                                                     sampleSummary.addProperty("analyses", analyses);
                                                                     sampleSummary.add("user_id", userId);
                                                                     sampleSummary.add("timestamp", timestamp);
                                                                     sampleSummary.add("value", sample.get("value"));
                                                                     return sampleSummary;
                                                                 });
                                                         });

            JsonArray sampleValueGroups = project.get("sampleValues").getAsJsonArray();
            Map<Integer, String> sampleValueGroupNames = toStream(sampleValueGroups)
                .collect(Collectors.toMap(sampleValueGroup -> sampleValueGroup.get("id").getAsInt(),
                                          sampleValueGroup -> sampleValueGroup.get("name").getAsString(),
                                          (a, b) -> b));

            String[] fields = {"plot_id", "sample_id", "lon", "lat", "flagged", "analyses", "user_id", "timestamp"};
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
                                                         return sampleValueTranslations.getOrDefault(value.getAsInt(), "LULC:NoValue").split(":")[1];
                                                     } else {
                                                         return value.getAsJsonObject().get(label).getAsString();
                                                     }}))
                                     .collect(Collectors.joining(","));
                    })
                .collect(Collectors.joining("\n"));

            String projectName = project.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            String currentDate = LocalDate.now().toString();
            String outputFileName = "ceo-" + projectName + "-sample-data-" + currentDate;

            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        } else {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        }
    }

    public static synchronized String publishProject(Request req, Response res) {
        String projectId = req.params(":id");
        mapJsonFile("project-list.json",
                    project -> {
                        if (project.get("id").getAsString().equals(projectId)) {
                            project.addProperty("availability", "published");
                            return project;
                        } else {
                            return project;
                        }
                    });
        return "";
    }

    public static synchronized String closeProject(Request req, Response res) {
        String projectId = req.params(":id");
        mapJsonFile("project-list.json",
                    project -> {
                        if (project.get("id").getAsString().equals(projectId)) {
                            project.addProperty("availability", "closed");
                            return project;
                        } else {
                            return project;
                        }
                    });
        return "";
    }

    public static synchronized String archiveProject(Request req, Response res) {
        String projectId = req.params(":id");
        mapJsonFile("project-list.json",
                    project -> {
                        if (project.get("id").getAsString().equals(projectId)) {
                            project.addProperty("availability", "archived");
                            project.addProperty("archived", true);
                            return project;
                        } else {
                            return project;
                        }
                    });
        return "";
    }

    public static synchronized String addUserSamples(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();
        String userName = jsonInputs.get("userId").getAsString();
        JsonObject userSamples = jsonInputs.get("userSamples").getAsJsonObject();

        mapJsonFile("plot-data-" + projectId + ".json",
                    plot -> {
                        if (plot.get("id").getAsString().equals(plotId)) {
                            int currentAnalyses = plot.get("analyses").getAsInt();
                            plot.addProperty("analyses", currentAnalyses + 1);
                            plot.addProperty("user", userName);
                            JsonArray samples = plot.get("samples").getAsJsonArray();
                            JsonArray updatedSamples = mapJsonArray(samples,
                                                                    sample -> {
                                                                        String sampleId = sample.get("id").getAsString();
                                                                        sample.add("value", userSamples.get(sampleId));
                                                                        return sample;
                                                                    });
                            plot.add("samples", updatedSamples);
                            plot.addProperty("timestamp", LocalDateTime.now().toString());
                            return plot;
                        } else {
                            return plot;
                        }
                    });

        return "";
    }

    public static synchronized String flagPlot(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();
        String userName = jsonInputs.get("userId").getAsString();

        mapJsonFile("plot-data-" + projectId + ".json",
                    plot -> {
                        if (plot.get("id").getAsString().equals(plotId)) {
                            plot.addProperty("flagged", true);
                            plot.addProperty("user", userName);
                            plot.addProperty("timestamp", LocalDateTime.now().toString());
                            return plot;
                        } else {
                            return plot;
                        }
                    });

        return "";
    }

    private static IntSupplier makeCounter() {
        int[] counter = {0}; // Have to use an array to move the value onto the heap
        return () -> { counter[0] += 1; return counter[0]; };
    }

    private static JsonObject makeGeoJsonPoint(double lon, double lat) {
        JsonArray coordinates = new JsonArray();
        coordinates.add(lon);
        coordinates.add(lat);

        JsonObject geoJsonPoint = new JsonObject();
        geoJsonPoint.addProperty("type", "Point");
        geoJsonPoint.add("coordinates", coordinates);

        return geoJsonPoint;
    }

    private static JsonObject makeGeoJsonPolygon(double lonMin, double latMin, double lonMax, double latMax) {
        JsonArray lowerLeft = new JsonArray();
        lowerLeft.add(lonMin);
        lowerLeft.add(latMin);

        JsonArray upperLeft = new JsonArray();
        upperLeft.add(lonMin);
        upperLeft.add(latMax);

        JsonArray upperRight = new JsonArray();
        upperRight.add(lonMax);
        upperRight.add(latMax);

        JsonArray lowerRight = new JsonArray();
        lowerRight.add(lonMax);
        lowerRight.add(latMin);

        JsonArray coordinates = new JsonArray();
        coordinates.add(lowerLeft);
        coordinates.add(upperLeft);
        coordinates.add(upperRight);
        coordinates.add(lowerRight);
        coordinates.add(lowerLeft);

        JsonArray polygon = new JsonArray();
        polygon.add(coordinates);

        JsonObject geoJsonPolygon = new JsonObject();
        geoJsonPolygon.addProperty("type", "Polygon");
        geoJsonPolygon.add("coordinates", polygon);

        return geoJsonPolygon;
    }

    private static Double[] reprojectPoint(Double[] point, int fromEPSG, int toEPSG) {
        try {
            Point oldPoint = (new GeometryFactory(new PrecisionModel(), fromEPSG)).createPoint(new Coordinate(point[0], point[1]));
            CoordinateReferenceSystem sourceCRS = CRS.decode("EPSG:" + fromEPSG, true);
            CoordinateReferenceSystem targetCRS = CRS.decode("EPSG:" + toEPSG, true);
            MathTransform transform = CRS.findMathTransform(sourceCRS, targetCRS);
            Coordinate newPoint = JTS.transform(oldPoint, transform).getCoordinate();
            return new Double[]{newPoint.x, newPoint.y};
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Double[] reprojectBounds(double left, double bottom, double right, double top, int fromEPSG, int toEPSG) {
        Double[] lowerLeft = reprojectPoint(new Double[]{left, bottom}, fromEPSG, toEPSG);
        Double[] upperRight = reprojectPoint(new Double[]{right, top}, fromEPSG, toEPSG);
        return new Double[]{lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]};
    }

    private static Double[] padBounds(double left, double bottom, double right, double top, double buffer) {
        return new Double[]{left + buffer, bottom + buffer, right - buffer, top - buffer};
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    private static Double[][] createRandomPointsInBounds(double left, double bottom, double right, double top, int numPoints) {
        double xRange = right - left;
        double yRange = top - bottom;
        return Stream.generate(() -> new Double[]{left + Math.random() * xRange,
                                                  bottom + Math.random() * yRange})
            .limit(numPoints)
            .map(point -> reprojectPoint(point, 3857, 4326))
            .toArray(Double[][]::new);
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    private static Double[][] createGriddedPointsInBounds(double left, double bottom, double right, double top, double spacing) {
        double xRange = right - left;
        double yRange = top - bottom;
        long xSteps = (long) Math.floor(xRange / spacing);
        long ySteps = (long) Math.floor(yRange / spacing);
        double xPadding = (xRange - xSteps * spacing) / 2.0;
        double yPadding = (yRange - ySteps * spacing) / 2.0;
        return Stream.iterate(left + xPadding, x -> x + spacing)
            .limit(xSteps + 1)
            .flatMap(x -> Stream.iterate(bottom + yPadding, y -> y + spacing)
                     .limit(ySteps + 1)
                     .map(y -> reprojectPoint(new Double[]{x, y}, 3857, 4326)))
            .toArray(Double[][]::new);
    }

    private static Double[][] createRandomSampleSet(Double[] plotCenter, String plotShape, double plotSize, int samplesPerPlot) {
        Double[] plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        double plotX =  plotCenterWebMercator[0];
        double plotY =  plotCenterWebMercator[1];
        double radius = plotSize / 2.0;
        double left =   plotX - radius;
        double right =  plotX + radius;
        double top =    plotY + radius;
        double bottom = plotY - radius;
        if (plotShape.equals("circle")) {
            return Stream.generate(() -> 2.0 * Math.PI * Math.random())
                .limit(samplesPerPlot)
                .map(offsetAngle -> {
                        double offsetMagnitude = radius * Math.random();
                        double xOffset = offsetMagnitude * Math.cos(offsetAngle);
                        double yOffset = offsetMagnitude * Math.sin(offsetAngle);
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
        Double[] plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        double centerX = plotCenterWebMercator[0];
        double centerY = plotCenterWebMercator[1];
        double radius = plotSize / 2.0;
        double radiusSquared = radius * radius;
        double left = centerX - radius;
        double bottom = centerY - radius;
        double right = centerX + radius;
        double top = centerY + radius;
        long steps = (long) Math.floor(plotSize / sampleResolution);
        double padding = (plotSize - steps * sampleResolution) / 2.0;
        return Stream.iterate(left + padding, x -> x + sampleResolution)
            .limit(steps + 1)
            .flatMap(x -> Stream.iterate(bottom + padding, y -> y + sampleResolution)
                     .limit(steps + 1)
                     .filter(y -> plotShape.equals("square") || squareDistance(x, y, centerX, centerY) < radiusSquared)
                     .map(y -> reprojectPoint(new Double[]{x, y}, 3857, 4326)))
            .toArray(Double[][]::new);
    }

    // NOTE: The CSV file should contain a header row (which will be skipped) and these fields: lon, lat, ...
    private static Double[][] loadCsvPoints(String filename) {
		try (Stream<String> lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
			return lines.skip(1)
                .map(line -> {
                        String[] fields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                        return new Double[]{Double.parseDouble(fields[0]),
                                            Double.parseDouble(fields[1])};
                    })
                .toArray(Double[][]::new);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Double[] calculateBounds(Double[][] points, double buffer) {
        Double[] lons = Arrays.stream(points).map(point -> point[0]).toArray(Double[]::new);
        Double[] lats = Arrays.stream(points).map(point -> point[1]).toArray(Double[]::new);
        double lonMin = Arrays.stream(lons).min(Comparator.naturalOrder()).get();
        double latMin = Arrays.stream(lats).min(Comparator.naturalOrder()).get();
        double lonMax = Arrays.stream(lons).max(Comparator.naturalOrder()).get();
        double latMax = Arrays.stream(lats).max(Comparator.naturalOrder()).get();
        Double[] bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
        Double[] paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], -buffer);
        return reprojectBounds(paddedBounds[0], paddedBounds[1], paddedBounds[2], paddedBounds[3], 3857, 4326);
    }

    private static JsonElement getOrZero(JsonObject obj, String field) {
        return obj.get(field).isJsonNull() ? new JsonPrimitive(0) : obj.get(field);
    }

    private static synchronized JsonObject createProjectPlots(JsonObject newProject) {
        // Store the parameters needed for plot generation in local variables with nulls set to 0
        double lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
        double latMin =             getOrZero(newProject,"latMin").getAsDouble();
        double lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
        double latMax =             getOrZero(newProject,"latMax").getAsDouble();
        String plotDistribution =   newProject.get("plotDistribution").getAsString();
        int numPlots =              getOrZero(newProject,"numPlots").getAsInt();
        double plotSpacing =        getOrZero(newProject,"plotSpacing").getAsDouble();
        String plotShape =          newProject.get("plotShape").getAsString();
        double plotSize =           newProject.get("plotSize").getAsDouble();
        String sampleDistribution = newProject.get("sampleDistribution").getAsString();
        int samplesPerPlot =        getOrZero(newProject,"samplesPerPlot").getAsInt();
        double sampleResolution =   getOrZero(newProject,"sampleResolution").getAsDouble();

        // If plotDistribution is csv, calculate the lat/lon bounds from the csv contents
        Double[][] csvPoints = new Double[][]{};
        if (plotDistribution.equals("csv")) {
            csvPoints = loadCsvPoints(newProject.get("csv").getAsString());
            Double[] csvBounds = calculateBounds(csvPoints, plotSize / 2.0);
            lonMin = csvBounds[0];
            latMin = csvBounds[1];
            lonMax = csvBounds[2];
            latMax = csvBounds[3];
        }

        // Store the lat/lon bounding box coordinates as GeoJSON and remove their original fields
        newProject.addProperty("boundary", makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());
        newProject.remove("lonMin");
        newProject.remove("latMin");
        newProject.remove("lonMax");
        newProject.remove("latMax");

        // Convert the lat/lon boundary coordinates to Web Mercator (units: meters) and apply an interior buffer of plotSize / 2
        Double[] bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
        Double[] paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], plotSize / 2.0);
        double left = paddedBounds[0];
        double bottom = paddedBounds[1];
        double right = paddedBounds[2];
        double top = paddedBounds[3];

        // Generate the plot objects and their associated sample points
        Double[][] newPlotCenters = plotDistribution.equals("random") ? createRandomPointsInBounds(left, bottom, right, top, numPlots)
                                  : plotDistribution.equals("gridded") ? createGriddedPointsInBounds(left, bottom, right, top, plotSpacing)
                                  : csvPoints;
        IntSupplier plotIndexer = makeCounter();
        JsonArray newPlots = Arrays.stream(newPlotCenters)
            .map(plotCenter -> {
                    JsonObject newPlot = new JsonObject();
                    newPlot.addProperty("id", plotIndexer.getAsInt());
                    newPlot.addProperty("center", makeGeoJsonPoint(plotCenter[0], plotCenter[1]).toString());
                    newPlot.addProperty("flagged", false);
                    newPlot.addProperty("analyses", 0);
                    newPlot.add("user", null);

                    Double[][] newSamplePoints = sampleDistribution.equals("gridded")
                        ? createGriddedSampleSet(plotCenter, plotShape, plotSize, sampleResolution)
                        : createRandomSampleSet(plotCenter, plotShape, plotSize, samplesPerPlot);
                    IntSupplier sampleIndexer = makeCounter();
                    JsonArray newSamples = Arrays.stream(newSamplePoints)
                    .map(point -> {
                            JsonObject newSample = new JsonObject();
                            newSample.addProperty("id", sampleIndexer.getAsInt());
                            newSample.addProperty("point", makeGeoJsonPoint(point[0], point[1]).toString());
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

    public static synchronized String createProject(Request req, Response res) {
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

            // Read in the existing project list
            JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();

            // Generate a new project id
            int newProjectId = getNextId(projects);
            newProject.addProperty("id", newProjectId);

            // Upload the plot-distribution-csv-file if one was provided
            if (newProject.get("plotDistribution").getAsString().equals("csv")) {
                String csvFileName = writeFilePart(req, "plot-distribution-csv-file", expandResourcePath("/csv"), "project-" + newProjectId);
                newProject.addProperty("csv", csvFileName);
            } else {
                newProject.add("csv", null);
            }

            // Add ids to the sampleValueGroups and sampleValues and clean up some of their unnecessary fields
            JsonArray sampleValueGroups = newProject.get("sampleValues").getAsJsonArray();
            IntSupplier sampleValueGroupIndexer = makeCounter();
            JsonArray updatedSampleValueGroups = mapJsonArray(sampleValueGroups,
                                                              sampleValueGroup -> {
                                                                  sampleValueGroup.addProperty("id", sampleValueGroupIndexer.getAsInt());
                                                                  sampleValueGroup.remove("$$hashKey");
                                                                  sampleValueGroup.remove("object");
                                                                  JsonArray sampleValues = sampleValueGroup.get("values").getAsJsonArray();
                                                                  IntSupplier sampleValueIndexer = makeCounter();
                                                                  JsonArray updatedSampleValues = mapJsonArray(sampleValues,
                                                                                                               sampleValue -> {
                                                                                                                   sampleValue.addProperty("id",
                                                                                                                                           sampleValueIndexer.getAsInt());
                                                                                                                   sampleValue.remove("$$hashKey");
                                                                                                                   sampleValue.remove("object");
                                                                                                                   if (sampleValue.get("image").getAsString().equals("")) {
                                                                                                                       sampleValue.add("image", null);
                                                                                                                   }
                                                                                                                   return sampleValue;
                                                                                                               });
                                                                  sampleValueGroup.add("values", updatedSampleValues);
                                                                  return sampleValueGroup;
                                                              });
            newProject.add("sampleValues", updatedSampleValueGroups);

            // Add some missing fields that don't come from the web UI
            newProject.addProperty("archived", false);
            newProject.addProperty("availability", "unpublished");

            // Create the requested plot set and write it to plot-data-<newProjectId>.json
            JsonObject newProjectUpdated = createProjectPlots(newProject);

            // Write the new entry to project-list.json
            projects.add(newProjectUpdated);
            writeJsonFile("project-list.json", projects);

            // Indicate that the project was created successfully
            return newProjectId + "";
        } catch (Exception e) {
            // Indicate that an error occurred with project creation
            throw new RuntimeException(e);
        }
    }

}
