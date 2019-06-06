package org.openforis.ceo.local;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.local.JsonImagery.getImageryTitle;
import static org.openforis.ceo.utils.JsonUtils.elementToArray;
import static org.openforis.ceo.utils.JsonUtils.elementToObject;
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
import static org.openforis.ceo.utils.PartUtils.writeFilePartBase64;
import static org.openforis.ceo.utils.ProjectUtils.createGriddedPointsInBounds;
import static org.openforis.ceo.utils.ProjectUtils.createGriddedSampleSet;
import static org.openforis.ceo.utils.ProjectUtils.createRandomPointsInBounds;
import static org.openforis.ceo.utils.ProjectUtils.createRandomSampleSet;
import static org.openforis.ceo.utils.ProjectUtils.deleteShapeFileDirectories;
import static org.openforis.ceo.utils.ProjectUtils.getOrEmptyString;
import static org.openforis.ceo.utils.ProjectUtils.getOrZero;
import static org.openforis.ceo.utils.ProjectUtils.getSampleValueTranslations;
import static org.openforis.ceo.utils.ProjectUtils.getValueDistribution;
import static org.openforis.ceo.utils.ProjectUtils.collectTimeIgnoreString;
import static org.openforis.ceo.utils.ProjectUtils.makeGeoJsonPoint;
import static org.openforis.ceo.utils.ProjectUtils.makeGeoJsonPolygon;
import static org.openforis.ceo.utils.ProjectUtils.outputAggregateCsv;
import static org.openforis.ceo.utils.ProjectUtils.outputRawCsv;
import static org.openforis.ceo.utils.ProjectUtils.padBounds;
import static org.openforis.ceo.utils.ProjectUtils.reprojectBounds;
import static org.openforis.ceo.utils.ProjectUtils.runBashScriptForProject;
import static org.openforis.ceo.Views.redirectAuth;

import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import java.time.LocalDate;
import java.io.File;
import java.io.StringWriter;
import java.io.PrintWriter;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.function.IntSupplier;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.UUID;
import javax.servlet.http.HttpServletResponse;
import org.openforis.ceo.db_api.Projects;
import spark.Request;
import spark.Response;

public class JsonProjects implements Projects {

    private Request redirectCommon(Request req, Response res, Boolean collect) {
        final var userId = Integer.parseInt(req.session().attributes().contains("userid") ? req.session().attribute("userid").toString() : "0");
        final var pProjectId = req.params(":id");
        final var qProjectId = req.queryParams("pid");

        final var projectId = pProjectId != null
            ? pProjectId
            : qProjectId != null
                ? qProjectId
                : "0";

        final var project = singleProjectJson(projectId);
        final var institutionRoles = (new JsonUsers()).getInstitutionRoles(userId);
        final var role = institutionRoles.getOrDefault(project.get("institution").getAsInt(), "");
        final var privacyLevel = project.get("privacyLevel").getAsString();
        final var availability = project.get("availability").getAsString();

        redirectAuth(req, res, canSeeProject(role, privacyLevel, availability) && (collect || role.equals("admin")), userId);

        return req;
    }
    public Request redirectNoCollect(Request req, Response res) {
        return redirectCommon(req, res, true);
    }

    public Request redirectNoEdit(Request req, Response res) {
        return redirectCommon(req, res, false);
    }

    private Boolean canSeeProject(String role, String privacyLevel, String availability) {
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
    }

    public String getAllProjects(Request req, Response res) {
        var userId = req.queryParamOrDefault("userId", "0");
        var institutionId = req.queryParamOrDefault("institutionId", "");
        var projects = elementToArray(readJsonFile("project-list.json"));

        var institutionRoles = (new JsonUsers()).getInstitutionRoles(userId.isEmpty() ? 0 : Integer.parseInt(userId));
        var filteredProjects = toStream(projects)
            .filter(project -> project.get("archived").getAsBoolean() == false)
            .filter(project -> {
                var role = institutionRoles.getOrDefault(project.get("institution").getAsInt(), "");
                var privacyLevel = project.get("privacyLevel").getAsString();
                var availability = project.get("availability").getAsString();
                return canSeeProject(role, privacyLevel, availability);
            })
            .map(project -> {
                var role = institutionRoles.getOrDefault(project.get("institution").getAsInt(), "");
                if (role.equals("admin")) {
                    project.addProperty("editable", true);
                } else {
                    project.addProperty("editable", false);
                }
                project.addProperty("validBoundary", true);
                return project;
            });
        if (institutionId.equals("")) {
            return filteredProjects.collect(intoJsonArray).toString();
        } else {
            return filteredProjects
                    .filter(project -> project.get("institution").getAsString().equals(institutionId))
                    .collect(intoJsonArray)
                    .toString();
        }
    }

    private static JsonObject singleProjectJson(String projectId) {
        var projects = elementToArray(readJsonFile("project-list.json"));
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

    private static String[] getProjectUsers(String projectId) {
        var projects = elementToArray(readJsonFile("project-list.json"));
        var matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));
        if (matchingProject.isPresent()) {
            var project = matchingProject.get();
            var archived = project.get("archived").getAsBoolean();
            var privacyLevel = project.get("privacyLevel").getAsString();
            var availability = project.get("availability").getAsString();
            var institutionId = project.get("institution").getAsInt();
            if (archived == true) {
                // return no users
                return new String[]{};
            } else if (privacyLevel.equals("public")) {
                // return all users
                var users = elementToArray(readJsonFile("user-list.json"));
                return toStream(users).map(user -> user.get("id").getAsString()).toArray(String[]::new);
            } else {
                var institutions = elementToArray(readJsonFile("institution-list.json"));
                var matchingInstitution = findInJsonArray(institutions,
                        institution ->
                                institution.get("id").getAsInt() == institutionId);
                if (matchingInstitution.isPresent()) {
                    var institution = matchingInstitution.get();
                    var admins = institution.getAsJsonArray("admins");
                    var members = institution.getAsJsonArray("members");
                    if (privacyLevel.equals("private")) {
                        // return all institution admins
                        return toElementStream(admins).map(element ->
                            !element.isJsonNull() && element.isJsonPrimitive()
                                ? element.getAsString()
                                : ""
                        ).toArray(String[]::new);
                    } else if (privacyLevel.equals("institution")) {
                        if (availability.equals("published")) {
                            // return all institution members
                            return toElementStream(members).map(element ->
                                !element.isJsonNull() && element.isJsonPrimitive()
                                    ? element.getAsString()
                                    : ""
                            ).toArray(String[]::new);
                        } else {
                            // return all institution admins
                            return toElementStream(admins).map(element ->
                                !element.isJsonNull() && element.isJsonPrimitive()
                                    ? element.getAsString()
                                    : ""
                            ).toArray(String[]::new);
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
        var plots = elementToArray(readJsonFile("plot-data-" + projectId + ".json"));
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
        stats.add("createdDate", project.get("created_date"));
        stats.add("publishedDate", project.get("published_date"));
        stats.add("archivedDate", project.get("archived_date"));
        stats.add("closedDate", project.get("closed_date"));
        // postgres is in decimal seconds (timestamp) so add matching column
        var statsSecs = project.has("userStats")
                        ? toStream(project.get("userStats").getAsJsonArray())
                            .map(stat -> {
                                stat.addProperty("seconds", stat.get("milliSecs").getAsInt() / 1000.0);
                                return stat;
                            })
                            .collect(intoJsonArray)
                        : new JsonArray();
        stats.add("userStats", statsSecs);
        return stats.toString();
    }

    private static List<String> getCsvHeaders(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            return Arrays.stream(lines.findFirst().get().split(",")).filter(field -> !List.of("GID", "GEOM", "PLOT_GEOM", "LAT", "LON").contains(field.toUpperCase())
            ).collect(Collectors.toList());
        } catch (Exception e) {
            System.out.println("Error Reading CSV");
        }
        return new ArrayList<String>();
    }

    /*  The following functions load data to merge with JSON plot/sample information.
        Even though the new data uses a integer hasmap to ensure correct order for other functions
        we can leave the merge as a String HasMap for backwords compatability
        because we are not doing any sorting on merge.
    */

    // Old csv files do not include plotId or sampleId
    private static HashMap<String, HashMap<String, String>> loadCsvPlotAllColumnsOld(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            var plotPoints = new HashMap<String, HashMap<String, String>>();
            var linesArr = lines.toArray(String[]::new);
            final var fieldNames =  Arrays.stream(linesArr[0].split(",")).toArray(String[]::new);
            for (int r = 1; r != linesArr.length ; r++) {
                var plotField = new HashMap<String, String>();
                final var fieldData = Arrays.stream(linesArr[r].split(",")).toArray(String[]::new);
                for (int i = 0; i != fieldNames.length ; i++) {
                    plotField.put(fieldNames[i], fieldData[i]);
                }
                plotPoints.put(Integer.toString(r), plotField);
            }
            return plotPoints;
        } catch (Exception e) {
            System.out.println("Error Reading CSV");
        }
        return new HashMap<String, HashMap<String, String>>();
    }

    // Assumes plotId field is in third possition
    private static HashMap<String, HashMap<String, String>> loadCsvPlotAllColumnsNew(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            var plotPoints = new HashMap<String, HashMap<String, String>>();
            final var linesArr = lines.toArray(String[]::new);
            final var fieldNames =  Arrays.stream(linesArr[0].split(",")).toArray(String[]::new);
            for (int r = 1; r != linesArr.length ; r++) {
                var plotField = new HashMap<String, String>();
                final var fieldData = Arrays.stream(linesArr[r].split(",")).toArray(String[]::new);
                for (int i = 0; i != fieldNames.length ; i++) {
                    plotField.put(fieldNames[i], fieldData[i]);
                }
                plotPoints.put(fieldData[2], plotField);
            }
            return plotPoints;
        } catch (Exception e) {
            System.out.println("Error Reading CSV");
        }
        return new HashMap<String, HashMap<String, String>>();
    }

        // Assumes sampleId field is in third possition
    private static HashMap<String, HashMap<String, String>> loadCsvPlotAllSamplesNew(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            var plotPoints = new HashMap<String, HashMap<String, String>>();
            final var linesArr = lines.toArray(String[]::new);
            final var fieldNames =  Arrays.stream(linesArr[0].split(",")).toArray(String[]::new);
            for (int r = 1; r != linesArr.length ; r++) {
                var plotField = new HashMap<String, String>();
                final var fieldData = Arrays.stream(linesArr[r].split(",")).toArray(String[]::new);
                for (int i = 0; i != fieldNames.length ; i++) {
                    plotField.put(fieldNames[i], fieldData[i]);
                }
                plotPoints.put(fieldData[3], plotField);
            }
            return plotPoints;
        } catch (Exception e) {
            System.out.println("Error Reading CSV");
        }
        return new HashMap<String, HashMap<String, String>>();
    }

    private static List<String> getGeoJsonHeaders(int projectId, String plotOrSample) {
        var jsonKeys = new ArrayList<String>();
        try {
            final var geoJson = elementToObject(readJsonFile("../shp/project-" + projectId + "-" + plotOrSample
                                       + "/project-" + projectId + "-" + plotOrSample + ".json"));
            if (geoJson.get("type").getAsString().equals("FeatureCollection")) {
                final var properties = toStream(geoJson.get("features").getAsJsonArray())
                    .filter(feature -> {
                            final var geometry = feature.get("geometry").getAsJsonObject();
                            return geometry.get("type").getAsString().equals("Polygon");
                        })
                    .findFirst().get();
                jsonKeys.addAll(properties.get("properties").getAsJsonObject().keySet());
            }
        } catch (Exception e) {
            System.out.println("Error Reading SHP");
        }
        return jsonKeys;
    }

    private static HashMap<String, HashMap<String, String>>  getGeoJsonPlotData(int projectId) {
        var plotGeoms = new HashMap<String, HashMap<String, String>>();
        try {
            final var geoJson = elementToObject(readJsonFile("../shp/project-" + projectId + "-plots"
                                       + "/project-" + projectId + "-plots.json"));
            if (geoJson.get("type").getAsString().equals("FeatureCollection")) {
                toStream(geoJson.get("features").getAsJsonArray())
                    .filter(feature -> {
                            final var geometry = feature.get("geometry").getAsJsonObject();
                            return geometry.get("type").getAsString().equals("Polygon");
                        })
                    .forEach(feature -> {
                            final var properties = feature.get("properties").getAsJsonObject();
                            final var plotId = properties.get("PLOTID").getAsString();
                            var propertyMap = new HashMap<String, String>();
                            properties.keySet().forEach(key -> {
                                propertyMap.put(key, getOrEmptyString(properties, key).getAsString());
                            });
                            plotGeoms.put(plotId, propertyMap);
                        });
            }
        } catch (Exception e) {
            System.out.println("Error Reading SHP");
        }
        return plotGeoms;
    }

    private static HashMap<String, HashMap<String, String>>  getGeoJsonSampleData(int projectId) {
        var plotGeoms = new HashMap<String, HashMap<String, String>>();
        try {
            final var geoJson = elementToObject(readJsonFile("../shp/project-" + projectId + "-samples"
                                       + "/project-" + projectId + "-samples.json"));
            if (geoJson.get("type").getAsString().equals("FeatureCollection")) {
                toStream(geoJson.get("features").getAsJsonArray())
                    .filter(feature -> {
                            final var geometry = feature.get("geometry").getAsJsonObject();
                            return geometry.get("type").getAsString().equals("Polygon");
                        })
                    .forEach(feature -> {
                            final var properties = feature.get("properties").getAsJsonObject();
                            final var sampleId = properties.get("SAMPLEID").getAsString();
                            var propertyMap = new HashMap<String, String>();
                            properties.keySet().forEach(key -> {
                                propertyMap.put(key, getOrEmptyString(properties, key).getAsString());
                            });
                            plotGeoms.put(sampleId, propertyMap);
                        });
            }
        } catch (Exception e) {
            System.out.println("Error Reading SHP");
        }
        return plotGeoms;
    }

    private static HashMap<String, HashMap<String, String>>  getDataHashMap(JsonObject project, String plotOrSample) {
        if (plotOrSample.equals("plots")) {
            if (project.has("csv") && project.get("plotDistribution").getAsString().equals("csv")) {
                return loadCsvPlotAllColumnsOld(project.get("csv").getAsString());
            } else if (project.has("plots-csv") && project.get("plotDistribution").getAsString().equals("csv")) {
                return loadCsvPlotAllColumnsNew(project.get("plots-csv").getAsString());
            } else if (project.has("plots-shp") && project.get("plotDistribution").getAsString().equals("shp")) {
                return getGeoJsonPlotData(project.get("id").getAsInt());
            } else {
                return new HashMap<String, HashMap<String, String>>();
            }
        } else if (plotOrSample.equals("samples")) {
            if (project.has("samples-csv") && project.get("sampleDistribution").getAsString().equals("csv")) {
                return loadCsvPlotAllSamplesNew(project.get("samples-csv").getAsString());
            } else if (project.has("samples-csv") && project.get("sampleDistribution").getAsString().equals("shp")) {
                return getGeoJsonSampleData(project.get("id").getAsInt());
            } else {
                return new HashMap<String, HashMap<String, String>>();
            }
        } else {
            return new HashMap<String, HashMap<String, String>>();
        }

    }

    private static List<String> getHeadersList(JsonObject project, String plotOrSample) {
        if (plotOrSample.equals("plots")) {
            if (project.has("csv") && project.get("plotDistribution").getAsString().equals("csv")) {
                return getCsvHeaders(project.get("csv").getAsString());
            } else if (project.has("plots-csv") && project.get("plotDistribution").getAsString().equals("csv")) {
                return getCsvHeaders(project.get("plots-csv").getAsString());
            } else if (project.has("plots-shp") && project.get("plotDistribution").getAsString().equals("shp")) {
                return getGeoJsonHeaders(project.get("id").getAsInt(), "plots");
            } else {
                return new ArrayList<String>();
            }
        } else if (plotOrSample.equals("samples")) {
            if (project.has("samples-csv") && project.get("sampleDistribution").getAsString().equals("csv")) {
                return getCsvHeaders(project.get("samples-csv").getAsString());
            } else if (project.has("samples-csv") && project.get("sampleDistribution").getAsString().equals("shp")) {
                return getGeoJsonHeaders(project.get("id").getAsInt(), "samples");
            } else {
                return new ArrayList<String>();
            }
        } else {
            return new ArrayList<String>();
        }
    }

    public HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
        final var projectId = req.params(":id");
        final var projects = elementToArray(readJsonFile("project-list.json"));
        final var matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));
        DateFormat simple = new SimpleDateFormat("dd MMM yyyy HH:mm:ss");

        if (matchingProject.isPresent()) {
            final var project = matchingProject.get();
            final var sampleValueGroups = project.get("sampleValues").getAsJsonArray();
            final var projectName = project.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            var optionalHeaders = new ArrayList<String>();

            final var plotHeaders = getHeadersList(project, "plots");
            final var plotData = getDataHashMap(project, "plots");

            final var plots = elementToArray(readJsonFile("plot-data-" + projectId + ".json"));
            var plotSummaries = mapJsonArray(plots,
                    plot -> {
                        final var samples = plot.get("samples").getAsJsonArray();
                        final var center = parseJson(plot.get("center").getAsString()).getAsJsonObject();
                        final var coords = center.get("coordinates").getAsJsonArray();
                        final var collectionTime = collectTimeIgnoreString(plot);
                        final var collectionStart = getOrZero(plot, "collectionStart").getAsLong();
                        final var confidence = getOrZero(plot, "confidence").getAsInt();
                        var analysisDuration = 0.0;
                        // Wait until these fields is found to add the column header
                        if (collectionTime > 0L) {
                            if (!optionalHeaders.contains("collection_time")) optionalHeaders.add("collection_time");
                                if (collectionStart > 0L) {
                                    analysisDuration = Math.round((collectionTime - collectionStart) / 100.0) / 10.0;
                                    if (!optionalHeaders.contains("analysis_duration")) optionalHeaders.add("analysis_duration");
                                }
                        }
                        final var finalAnalysisDuration = analysisDuration;
                        if (confidence > 0) {
                            if (!optionalHeaders.contains("confidence")) optionalHeaders.add("confidence");
                        }

                        var plotSummary = new JsonObject();
                        plotSummary.addProperty("plot_id", plot.get("id").getAsInt());
                        plotSummary.addProperty("center_lon", coords.get(0).getAsDouble());
                        plotSummary.addProperty("center_lat", coords.get(1).getAsDouble());
                        plotSummary.addProperty("size_m", getOrZero(project, "plotSize").getAsDouble());
                        plotSummary.addProperty("shape", getOrEmptyString(project, "plotShape").getAsString());
                        plotSummary.addProperty("flagged", plot.get("flagged").getAsBoolean());
                        plotSummary.addProperty("analyses", getOrZero(project, "analyses").getAsInt());
                        plotSummary.addProperty("sample_points", samples.size());
                        plotSummary.add("user_id", plot.get("user"));
                        plotSummary.addProperty("collection_time", collectionTime > 0 ? simple.format(new Date(collectionTime)) : "");
                        plotSummary.addProperty("analysis_duration", finalAnalysisDuration > 0 ? finalAnalysisDuration : 0);
                        plotSummary.addProperty("confidence", confidence);
                        plotSummary.add("distribution",
                                getValueDistribution(samples, getSampleValueTranslations(sampleValueGroups)));

                        if (plotHeaders.size() > 0 && plotData.containsKey(plot.has("plotId")
                                ? plot.get("plotId").getAsString()
                                : plot.get("id").getAsString()))
                        {
                            plotHeaders.forEach(head ->
                                plotSummary.addProperty("pl_" + head, plotData.get(plot.has("plotId")
                                    ? plot.get("plotId").getAsString()
                                    : plot.get("id").getAsString())
                                .get(head) )
                            );
                        }
                        return plotSummary;
                    });

            final var combinedHeaders = Stream.concat(
                    optionalHeaders.stream(),
                    plotHeaders.stream()
                        .map(head -> !head.toString().contains("pl_") ? "pl_" + head : head)
                    ).toArray(String[]::new);

            return outputAggregateCsv(res, sampleValueGroups, plotSummaries, projectName,combinedHeaders);

        } else {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        }
    }

    public HttpServletResponse dumpProjectRawData(Request req, Response res) {
        final var projectId = req.params(":id");
        final var projects = elementToArray(readJsonFile("project-list.json"));
        final var matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));
        DateFormat simple = new SimpleDateFormat("dd MMM yyyy HH:mm:ss");

        if (matchingProject.isPresent()) {
            final var project = matchingProject.get();
            final var sampleValueGroups = project.get("sampleValues").getAsJsonArray();

            var optionalHeaders = new ArrayList<String>();

            final var plotHeaders = getHeadersList(project, "plots");
            final var plotData = getDataHashMap(project, "plots");

            final var sampleHeaders = getHeadersList(project, "samples");
            final var sampleData = getDataHashMap(project, "samples");

            var plots = elementToArray(readJsonFile("plot-data-" + projectId + ".json"));
            var sampleSummaries = flatMapJsonArray(plots,
                    plot -> {
                        final var plotId = plot.get("id").getAsInt();
                        final var flagged = plot.get("flagged").getAsBoolean();
                        final var analyses = plot.get("analyses").getAsInt();
                        final var userId = plot.get("user");
                        final var collectionTime = collectTimeIgnoreString(plot);
                        final var collectionStart = getOrZero(plot, "collectionStart").getAsLong();
                        final var confidence = getOrZero(plot, "confidence").getAsInt();
                        var analysisDuration = 0.0;
                        // Wait until these fields is found to add the column header
                        if (collectionTime > 0L) {
                            if (!optionalHeaders.contains("collection_time")) optionalHeaders.add("collection_time");
                                if (collectionStart > 0L) {
                                    analysisDuration = Math.round((collectionTime - collectionStart) / 100.0) / 10.0;
                                    if (!optionalHeaders.contains("analysis_duration")) optionalHeaders.add("analysis_duration");
                                }
                        }
                        final var finalAnalysisDuration = analysisDuration;
                        if (confidence > 0) {
                            if (!optionalHeaders.contains("confidence")) optionalHeaders.add("confidence");
                        }

                        final var samples = plot.get("samples").getAsJsonArray();
                        return toStream(samples).map(sample -> {
                            final var center = parseJson(sample.get("point").getAsString())
                                    .getAsJsonObject();
                            final var coords = center.get("coordinates").getAsJsonArray();
                            var sampleSummary = new JsonObject();
                            sampleSummary.addProperty("plot_id", plotId);
                            sampleSummary.addProperty("sample_id", sample.get("id").getAsInt());
                            sampleSummary.addProperty("lon", coords.get(0).getAsDouble());
                            sampleSummary.addProperty("lat", coords.get(1).getAsDouble());
                            sampleSummary.addProperty("flagged", flagged);
                            sampleSummary.addProperty("analyses", analyses);
                            sampleSummary.add("user_id", userId);
                            sampleSummary.add("value", sample.get("value"));

                            sampleSummary.addProperty("collection_time", collectionTime > 0 ? simple.format(new Date(collectionTime)) : "");
                            sampleSummary.addProperty("analysis_duration", finalAnalysisDuration);
                            sampleSummary.addProperty("confidence", confidence);

                            // Add imagery data to output if it exists
                            if (sample.has("userImage")) {
                                final var imageData = sample.get("userImage").getAsJsonObject();

                                sampleSummary.addProperty("imagery_title", getImageryTitle(imageData.get("id").getAsString()));
                                if (!optionalHeaders.contains("imagery_title")) optionalHeaders.add("imagery_title");

                                if (imageData.has("attributes")) {
                                    final var attributes = imageData.get("attributes").getAsJsonObject();
                                    attributes.keySet().forEach(key -> {
                                        sampleSummary.addProperty(key, attributes.get(key).getAsString());
                                        if (!optionalHeaders.contains(key)) optionalHeaders.add(key);
                                    });
                                }
                            }

                            if (plotHeaders.size() > 0 && plotData.containsKey(
                                    plot.has("plotId")
                                    ? plot.get("plotId").getAsString()
                                    : plot.get("id").getAsString())
                                ) {
                                plotHeaders.forEach(head ->
                                    sampleSummary.addProperty("pl_" + head, plotData.get(
                                        plot.has("plotId")
                                        ? plot.get("plotId").getAsString()
                                        : plot.get("id").getAsString())
                                    .get(head) )
                                );
                            }

                            if (sampleHeaders.size() > 0 && sampleData.containsKey(
                                    sample.has("sampleId")
                                    ? sample.get("sampleId").getAsString()
                                    : "")
                                ) {
                                sampleHeaders.forEach(head ->
                                    sampleSummary.addProperty("smpl_" + head, sampleData.get(
                                                        sample.get("sampleId").getAsString() )
                                    .get(head))
                                );
                            }

                            return sampleSummary;
                        });
                    });

            final var projectName = project.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();

            final var combinedHeaders =
                        Stream.concat(
                            optionalHeaders.stream(),
                            Stream.concat(
                                    plotHeaders.stream()
                                    .map(head -> !head.toString().contains("pl_") ? "pl_" + head : head),
                                    sampleHeaders.stream()
                                    .map(head -> !head.toString().contains("smpl_") ? "smpl_" + head : head)
                                )
                        ).toArray(String[]::new);

            return outputRawCsv(res, sampleValueGroups, sampleSummaries, projectName, combinedHeaders);

        } else {
            res.raw().setStatus(SC_NO_CONTENT);
            return res.raw();
        }
    }

    public String publishProject(Request req, Response res) {
        var projectId = req.params(":id");
        mapJsonFile("project-list.json",
                project -> {
                    if (project.get("id").getAsString().equals(projectId)) {
                        project.addProperty("availability", "published");
                        project.addProperty("published_date", LocalDate.now().toString());
                        return project;
                    } else {
                        return project;
                    }
                });
        return "";
    }

    public String closeProject(Request req, Response res) {
        var projectId = req.params(":id");
        mapJsonFile("project-list.json",
                project -> {
                    if (project.get("id").getAsString().equals(projectId)) {
                        project.addProperty("availability", "closed");
                        project.addProperty("closed_date", LocalDate.now().toString());
                        return project;
                    } else {
                        return project;
                    }
                });
        return "";
    }

    public String archiveProject(Request req, Response res) {
        var projectId = req.params(":id");
        mapJsonFile("project-list.json",
                project -> {
                    if (project.get("id").getAsString().equals(projectId)) {
                        project.addProperty("availability", "archived");
                        project.addProperty("archived_date", LocalDate.now().toString());
                        project.addProperty("archived", true);
                        return project;
                    } else {
                        return project;
                    }
                });
        return "";
    }

    public String updateProject(Request req, Response res) {
        final var jsonInputs = parseJson(req.body()).getAsJsonObject();
        mapJsonFile("project-list.json",
                project -> {
                    if (project.get("id").getAsString().equals(req.params(":id"))) {
                        project.addProperty("name",          getOrEmptyString(jsonInputs, "name").getAsString());
                        project.addProperty("description",   getOrEmptyString(jsonInputs, "description").getAsString());
                        project.addProperty("privacyLevel",  getOrEmptyString(jsonInputs, "privacyLevel").getAsString());
                        project.addProperty("baseMapSource", getOrEmptyString(jsonInputs, "baseMapSource").getAsString());
                        return project;
                    } else {
                        return project;
                    }
                });
        return "";
    }

    private static IntSupplier makeCounter() {
        var counter = new int[]{0}; // Have to use an array to move the value onto the heap
        return () -> { counter[0] += 1; return counter[0]; };
    }

     // NOTE: The CSV file should contain a header row (which will be skipped) and these fields: LON,LAT,PLOTID
    private static HashMap<Integer, Double[]> loadCsvPlotPoints(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            var plotPoints = new HashMap<Integer, Double[]>();
            lines
                .skip(1)
                .forEach(line -> {
                        final var fields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                        final var plotId = Integer.parseInt(fields[2]);
                        final var plotCenter = new Double[]{Double.parseDouble(fields[0]),
                                                      Double.parseDouble(fields[1])};
                        plotPoints.put(plotId, plotCenter);
                    });
            return plotPoints;
        } catch (Exception e) {
            throw new RuntimeException("Malformed plot CSV. Fields must be LON,LAT,PLOTID.", e);
        }
    }

    // NOTE: The CSV file should contain a header row (which will be skipped) and these fields: LON,LAT,PLOTID,SAMPLEID
    private static HashMap<Integer, HashMap<Integer, Double[]>> loadCsvSamplePoints(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            var samplesByPlot = new HashMap<Integer, HashMap<Integer, Double[]>>();
            lines
                .skip(1)
                .forEach(line -> {
                        final var fields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                        final var plotId = Integer.parseInt(fields[2]);
                        final var sampleId = Integer.parseInt(fields[3]);
                        final var sampleCenter = new Double[]{Double.parseDouble(fields[0]),
                                                        Double.parseDouble(fields[1])};
                        if (samplesByPlot.containsKey(plotId)) {
                            var samplePoints = samplesByPlot.get(plotId);
                            samplePoints.put(sampleId, sampleCenter);
                        } else {
                            var samplePoints = new HashMap<Integer, Double[]>();
                            samplePoints.put(sampleId, sampleCenter);
                            samplesByPlot.put(plotId, samplePoints);
                        }
                    });
            return samplesByPlot;
        } catch (Exception e) {
            throw new RuntimeException("Malformed sample CSV. Fields must be LON,LAT,PLOTID,SAMPLEID.", e);
        }
    }

    // The uploaded GeoJson must contain Polygon geometries with PLOTID properties
    private static HashMap<Integer, JsonObject> getGeoJsonPlotGeometries(int projectId) {
        try {
            final var geoJson = elementToObject(readJsonFile("../shp/project-" + projectId + "-plots"
                                       + "/project-" + projectId + "-plots.json"));
            if (geoJson.get("type").getAsString().equals("FeatureCollection")) {
                final var plotGeoms = new HashMap<Integer, JsonObject>();
                toStream(geoJson.get("features").getAsJsonArray())
                    .filter(feature -> {
                            final var geometry = feature.get("geometry").getAsJsonObject();
                            return geometry.get("type").getAsString().equals("Polygon");
                        })
                    .forEach(feature -> {
                            final var geometry = feature.get("geometry").getAsJsonObject();
                            final var properties = feature.get("properties").getAsJsonObject();
                            final var plotId = properties.get("PLOTID").getAsInt();
                            plotGeoms.put(plotId, geometry);
                        });
                return plotGeoms;
            } else {
                throw new RuntimeException("SHP file missing FeatureCollection");
            }
        } catch (Exception e) {
            deleteShapeFileDirectories(projectId);
            throw new RuntimeException("Malformed plot Shapefile. All features must be of type polygon and include a PLOTID field.", e);
        }
    }

    // The uploaded GeoJson must contain Polygon geometries with PLOTID and SAMPLEID properties
    private static HashMap<Integer, HashMap<Integer, JsonObject>> getGeoJsonSampleGeometries(int projectId) {
        try {
            final var geoJson = elementToObject(readJsonFile("../shp/project-" + projectId + "-samples"
                                       + "/project-" + projectId + "-samples.json"));
            if (geoJson.get("type").getAsString().equals("FeatureCollection")) {
                var sampleGeomsByPlot = new HashMap<Integer, HashMap<Integer, JsonObject>>();
                toStream(geoJson.get("features").getAsJsonArray())
                    .filter(feature -> {
                            final var geometry = feature.get("geometry").getAsJsonObject();
                            return geometry.get("type").getAsString().equals("Polygon");
                        })
                    .forEach(feature -> {
                            final var geometry = feature.get("geometry").getAsJsonObject();
                            final var properties = feature.get("properties").getAsJsonObject();
                            final var plotId = properties.get("PLOTID").getAsInt();
                            final var sampleId = properties.get("SAMPLEID").getAsInt();
                            if (sampleGeomsByPlot.containsKey(plotId)) {
                                final var sampleGeoms = sampleGeomsByPlot.get(plotId);
                                sampleGeoms.put(sampleId, geometry);
                            } else {
                                var sampleGeoms = new HashMap<Integer, JsonObject>();
                                sampleGeoms.put(sampleId, geometry);
                                sampleGeomsByPlot.put(plotId, sampleGeoms);
                            }
                        });
                return sampleGeomsByPlot;
            } else {
                throw new RuntimeException("SHP file missing FeatureCollection");
            }
        } catch (Exception e) {
            deleteShapeFileDirectories(projectId);
            throw new RuntimeException("Malformed sample Shapefile. All features must be of type polygon and include PLOTID and SAMPLEID fields.", e);
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
    private static HashMap<Integer, Double[]> getPlotGeometryCenters(HashMap<Integer, JsonObject> plotGeoms) {
        var plotCenters = new HashMap<Integer, Double[]>();
        plotGeoms.entrySet().forEach(plot -> {
                var plotId = plot.getKey();
                var plotGeom = plot.getValue();
                var centroid = getGeometryCentroid(plotGeom);
                plotCenters.put(plotId, centroid);
            });
        return plotCenters;
    }

    // FIXME: Can you re-implement this using the Collectors functions?
    private static HashMap<Integer, HashMap<Integer, Double[]>> getSampleGeometryCenters(HashMap<Integer, HashMap<Integer, JsonObject>> sampleGeomsByPlot) {
        var sampleCentersByPlot = new HashMap<Integer, HashMap<Integer, Double[]>>();
        sampleGeomsByPlot.entrySet().forEach(plot -> {
                var plotId = plot.getKey();
                var sampleGeoms = plot.getValue();
                var sampleCenters = new HashMap<Integer, Double[]>();
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

    public static void copyFile(String fileDirectory,String inputFileName, String outputFileName) {
        try {
            // Write the file to outputDirectory and return the filename
            var dest = new File(fileDirectory, outputFileName);
            var origin = new File(fileDirectory, inputFileName);
            // make directory for SHP json files
            dest.mkdirs();
            Files.copy(origin.toPath(), dest.toPath(), StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static JsonObject newProjectObject(JsonObject newProjectData, JsonObject fileData, Request req) {
        final var newProjectId = newProjectData.get("id").getAsString();
        if (getOrZero(newProjectData, "projectTemplate").getAsInt() > 0
            && newProjectData.get("useTemplatePlots").getAsBoolean()) {

            var templateID = newProjectData.get("projectTemplate").getAsString();
            var templateProject = singleProjectJson(templateID);
            // Strip plots and samples of user data
            var plots = elementToArray(readJsonFile("plot-data-" + templateID + ".json"));
            var newPlots = toStream(plots)
                    .map(plot -> {
                        var newSamples = toStream(plot.get("samples").getAsJsonArray())
                            .map(sample -> {
                                sample.remove("value");
                                sample.remove("userImage");
                                return sample;
                            })
                            .collect(intoJsonArray);

                        plot.remove("collectionTime");
                        plot.remove("confidence");
                        plot.remove("collectionStart");
                        plot.add("user", null);
                        plot.addProperty("flagged", false);
                        plot.addProperty("analyses", 0);
                        plot.add("samples", newSamples);
                        return plot;
                    })
                    .collect(intoJsonArray);
            // write new plot data to file
            writeJsonFile("plot-data-" + newProjectId + ".json", newPlots);

            // Update numPlots and samplesPerPlot to match the numbers that were generated
            newProjectData.remove("lonMin");
            newProjectData.remove("latMin");
            newProjectData.remove("lonMax");
            newProjectData.remove("latMax");
            newProjectData.add("plotDistribution", templateProject.get("plotDistribution"));
            newProjectData.add("numPlots",templateProject.get("numPlots"));
            newProjectData.add("plotSpacing", templateProject.get("plotSpacing"));
            newProjectData.add("plotShape", templateProject.get("plotShape"));
            newProjectData.add("plotSize", templateProject.get("plotSize"));
            newProjectData.add("sampleDistribution", templateProject.get("sampleDistribution"));
            newProjectData.add("samplesPerPlot", getOrZero(templateProject, "samplesPerPlot"));
            newProjectData.add("sampleResolution", templateProject.get("sampleResolution"));
            newProjectData.add("boundary", templateProject.get("boundary"));
            newProjectData.addProperty("numPlots", newPlots.size());
            newProjectData.addProperty("samplesPerPlot", newPlots.get(0).getAsJsonObject().getAsJsonArray("samples").size());

            newProjectData.add("plots-csv", templateProject.has("csv")
                                            ? templateProject.get("csv")
                                            : templateProject.get("plots-csv"));
            newProjectData.add("samples-csv", templateProject.get("samples-csv"));
            newProjectData.add("plots-shp", templateProject.get("plots-shp"));
            newProjectData.add("samples-shp", templateProject.get("samples-shp"));

            // Copy uploaded files
            if (newProjectData.get("plotDistribution").getAsString().equals("csv")) {
                final var csvFile = templateProject.has("csv")
                        ? templateProject.get("csv").getAsString()
                        : templateProject.get("plots-csv").getAsString();
                copyFile(expandResourcePath("/csv"),
                        csvFile,
                        "project-" + newProjectId + "-plots.csv");
            } else if (newProjectData.get("plotDistribution").getAsString().equals("shp")) {
                // Only the json file is used once uploaded
                copyFile(expandResourcePath("/shp"),
                        "project-" + templateID + "-plots/project-" + templateID + "-plots.json",
                        "project-" + newProjectId + "-plots/project-" + newProjectId + "-plots.json");
            }

            if (newProjectData.get("sampleDistribution").getAsString().equals("csv")) {
                copyFile(expandResourcePath("/csv"),
                        templateProject.get("samples-csv").getAsString(),
                        "project-" + newProjectId + "-samples.csv");
            } else if (newProjectData.get("sampleDistribution").getAsString().equals("shp")) {
                copyFile(expandResourcePath("/shp"),
                        "project-" + templateID + "-samples/project-" + templateID + "-samples.json",
                        "project-" + newProjectId + "-samples/project-" + newProjectId + "-samples.json");
            }

            return newProjectData;
        } else {
            // Upload the plot-distribution-csv-file if one was provided
            if (newProjectData.get("plotDistribution").getAsString().equals("csv")) {
                newProjectData.addProperty(
                    "plots-csv",
                    writeFilePartBase64(
                        fileData.get("plotFileName").getAsString(),
                        fileData.get("plotFileBase64").getAsString(),
                        expandResourcePath("/csv"),
                        "project-" + newProjectId + "-plots"
                    )
                );
            } else {
                newProjectData.add("plots-csv", null);
            }

            // Upload the sample-distribution-csv-file if one was provided
            if (newProjectData.get("sampleDistribution").getAsString().equals("csv")) {
                newProjectData.addProperty(
                    "samples-csv",
                    writeFilePartBase64(
                        fileData.get("sampleFileName").getAsString(),
                        fileData.get("sampleFileBase64").getAsString(),
                        expandResourcePath("/csv"),
                        "project-" + newProjectId + "-samples"
                    )
                );
            } else {
                newProjectData.add("samples-csv", null);
            }

            // Upload the plot-distribution-shp-file if one was provided (this should be a ZIP file)
            if (newProjectData.get("plotDistribution").getAsString().equals("shp")) {
                newProjectData.addProperty(
                    "plots-shp",
                    writeFilePartBase64(
                        fileData.get("plotFileName").getAsString(),
                        fileData.get("plotFileBase64").getAsString(),
                        expandResourcePath("/shp"),
                        "project-" + newProjectId + "-plots"
                    )
                );
            } else {
                newProjectData.add("plots-shp", null);
            }

            // Upload the sample-distribution-shp-file if one was provided (this should be a ZIP file)
            if (newProjectData.get("sampleDistribution").getAsString().equals("shp")) {
                newProjectData.addProperty(
                    "samples-shp",
                    writeFilePartBase64(
                        fileData.get("sampleFileName").getAsString(),
                        fileData.get("sampleFileBase64").getAsString(),
                        expandResourcePath("/shp"),
                        "project-" + newProjectId + "-samples"
                    )
                );
            } else {
                newProjectData.add("samples-shp", null);
            }

            // Create the requested plot set and write it to plot-data-<newProject>.json
            return createProjectPlots(newProjectData);

        }
    }

    private static JsonObject createProjectPlots(JsonObject newProject) {
        // Store the parameters needed for plot generation in local variables with nulls set to 0
        var projectId =          newProject.get("id").getAsInt();
        var lonMin =             newProject.get("lonMin").getAsDouble();
        var latMin =             newProject.get("latMin").getAsDouble();
        var lonMax =             newProject.get("lonMax").getAsDouble();
        var latMax =             newProject.get("latMax").getAsDouble();
        var plotDistribution =   newProject.get("plotDistribution").getAsString();
        var numPlots =           newProject.get("numPlots").getAsInt();
        var plotSpacing =        newProject.get("plotSpacing").getAsDouble();
        var plotShape =          newProject.get("plotShape").getAsString();
        var plotSize =           newProject.get("plotSize").getAsDouble();
        var sampleDistribution = newProject.get("sampleDistribution").getAsString();
        var samplesPerPlot =     newProject.get("samplesPerPlot").getAsInt();
        var sampleResolution =   newProject.get("sampleResolution").getAsDouble();

        // If plotDistribution is csv, calculate the lat/lon bounds from the csv contents
        var csvPlotPoints = new HashMap<Integer, Double[]>();
        if (plotDistribution.equals("csv")) {
            csvPlotPoints = loadCsvPlotPoints(newProject.get("plots-csv").getAsString());
            var csvPlotBounds = calculateBounds(csvPlotPoints.values().toArray(new Double[][]{}), plotSize / 2.0);
            lonMin = csvPlotBounds[0];
            latMin = csvPlotBounds[1];
            lonMax = csvPlotBounds[2];
            latMax = csvPlotBounds[3];
        }

        // If sampleDistribution is csv, calculate the lat/lon bounds from the csv contents
        var csvSamplePoints = new HashMap<Integer, HashMap<Integer, Double[]>>();
        if (sampleDistribution.equals("csv")) {
            csvSamplePoints = loadCsvSamplePoints(newProject.get("samples-csv").getAsString());
        }
        final var csvSamplePointsFinal = csvSamplePoints;

        // If plotDistribution is shp, calculate the lat/lon bounds from the shp contents
        var shpPlotGeoms = new HashMap<Integer, JsonObject>();
        var shpPlotCenters = new HashMap<Integer, Double[]>();
        if (plotDistribution.equals("shp")) {
            runBashScriptForProject(projectId, "plots", "shp2geojson.sh", "/shp");
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
        var shpSampleGeoms = new HashMap<Integer, HashMap<Integer, JsonObject>>();
        var shpSampleCenters = new HashMap<Integer, HashMap<Integer, Double[]>>();
        if (sampleDistribution.equals("shp")) {
            runBashScriptForProject(projectId, "samples", "shp2geojson.sh", "/shp");
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
                        ? (Integer) ((Map.Entry) plotEntry).getKey()
                        : 0;

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
                              ? csvSamplePointsFinal.getOrDefault(plotId,  new HashMap<Integer, Double[]>()).entrySet().toArray()
                              : shpSampleCentersFinal.getOrDefault(plotId, new HashMap<Integer, Double[]>()).entrySet().toArray()));

                    var sampleIndexer = makeCounter();

                    var newSamples = Arrays.stream(newSamplePoints)
                        .map(sampleEntry -> {
                                var newSample = new JsonObject();
                                var newSampleId = sampleIndexer.getAsInt();
                                newSample.addProperty("id", newSampleId);

                                var sampleId =
                                    List.of("csv", "shp").contains(sampleDistribution)
                                    ? (Integer) ((Map.Entry) sampleEntry).getKey()
                                    : 0;

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

        var noSamplesCnt = filterJsonArray(newPlots, p -> p.get("samples").getAsJsonArray().size() == 0).size();
        if (noSamplesCnt > 0) {
            throw new RuntimeException("The uploaded plot and sample files do not have correctly overlapping data. "
                                       + noSamplesCnt
                                       + " plots have no samples.");
        }

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
            final var jsonInputs = parseJson(req.body()).getAsJsonObject();

            var newProject = new JsonObject();

            newProject.addProperty("baseMapSource", jsonInputs.get("baseMapSource").getAsString());
            newProject.addProperty("description", jsonInputs.get("description").getAsString());
            newProject.addProperty("institution", jsonInputs.get("institution").getAsInt());
            newProject.addProperty("lonMin", getOrZero(jsonInputs,"lonMin").getAsDouble());
            newProject.addProperty("latMin", getOrZero(jsonInputs,"latMin").getAsDouble());
            newProject.addProperty("lonMax", getOrZero(jsonInputs,"lonMax").getAsDouble());
            newProject.addProperty("latMax", getOrZero(jsonInputs,"latMax").getAsDouble());
            newProject.addProperty("name", jsonInputs.get("name").getAsString());
            newProject.addProperty("numPlots", getOrZero(jsonInputs,"numPlots").getAsInt());
            newProject.addProperty("plotDistribution", jsonInputs.get("plotDistribution").getAsString());
            newProject.addProperty("plotShape", getOrEmptyString(jsonInputs,"plotShape").getAsString());
            newProject.addProperty("plotSize", getOrZero(jsonInputs,"plotSize").getAsDouble());
            newProject.addProperty("plotSpacing", getOrZero(jsonInputs,"plotSpacing").getAsDouble());
            newProject.addProperty("privacyLevel", jsonInputs.get("privacyLevel").getAsString());
            newProject.addProperty("projectTemplate", getOrZero(jsonInputs,"projectTemplate").getAsInt());
            newProject.addProperty("sampleDistribution", jsonInputs.get("sampleDistribution").getAsString());
            newProject.addProperty("samplesPerPlot", getOrZero(jsonInputs,"samplesPerPlot").getAsInt());
            newProject.addProperty("sampleResolution", getOrZero(jsonInputs,"sampleResolution").getAsDouble());
            newProject.add("sampleValues", jsonInputs.get("sampleValues").getAsJsonArray());
            newProject.add("surveyRules", jsonInputs.get("surveyRules").getAsJsonArray());
            newProject.addProperty("useTemplatePlots", jsonInputs.get("useTemplatePlots").getAsBoolean());
            newProject.addProperty("useTemplateWidgets", jsonInputs.get("useTemplateWidgets").getAsBoolean());

            // Add constant values
            newProject.addProperty("availability", "unpublished");
            newProject.addProperty("archived", false);
            newProject.addProperty("created_date", LocalDate.now().toString());

            // Track file data
            var fileData = new JsonObject();
            fileData.addProperty("plotFileName", getOrEmptyString(jsonInputs, "plotFileName").getAsString());
            fileData.addProperty("plotFileBase64", getOrEmptyString(jsonInputs, "plotFileBase64").getAsString());
            fileData.addProperty("sampleFileName", getOrEmptyString(jsonInputs, "sampleFileName").getAsString());
            fileData.addProperty("sampleFileBase64", getOrEmptyString(jsonInputs, "sampleFileBase64").getAsString());

            // Read in the existing project list
            var projects = elementToArray(readJsonFile("project-list.json"));

            // Generate a new project id
            var newProjectId = getNextId(projects);
            newProject.addProperty("id", newProjectId);

            if (getOrZero(jsonInputs, "projectTemplate").getAsInt() > 0
                && newProject.get("useTemplateWidgets").getAsBoolean()) {
                var currProjId = getOrZero(jsonInputs, "projectTemplate").getAsString();
                var newDashboardId = UUID.randomUUID().toString();
                var projectFile = elementToArray(readJsonFile("proj.json"));
                var matchingProject = findInJsonArray(projectFile,
                        project -> project.get("projectID").getAsString().equals(currProjId));
                if (matchingProject.isPresent()) {
                    var project = matchingProject.get();
                    var dashboardId = project.get("dashboard").getAsString();
                    var dashboard = elementToObject(readJsonFile("dash-" + dashboardId + ".json"));
                    dashboard.remove("projectID");
                    dashboard.remove("dashboardID");
                    dashboard.addProperty("projectID", newProjectId);
                    dashboard.addProperty("dashboardID", newDashboardId);
                    writeJsonFile("dash-" + newDashboardId + ".json", dashboard);
                    var projectJSON = new JsonObject();
                    projectJSON.addProperty("projectID", newProjectId);
                    projectJSON.addProperty("dashboard", newDashboardId);
                    projectFile.add(projectJSON);
                    writeJsonFile("proj.json", projectFile);
                }
            }

            // Write the new entry to project-list.json
            projects.add(newProjectObject(newProject, fileData, req));
            writeJsonFile("project-list.json", projects);

            // Indicate that the project was created successfully
            return newProjectId + "";
        } catch (Exception e) {
            // Still output stack trace for debugging
            StringWriter outError = new StringWriter();
            e.printStackTrace(new PrintWriter(outError));
            System.out.println(outError.toString());
            // Indicate that an error occurred with project creation
            return e.getMessage();
        }
    }

}
