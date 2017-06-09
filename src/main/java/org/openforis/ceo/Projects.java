package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.Point;
import com.vividsolutions.jts.geom.PrecisionModel;
import java.io.File;
import java.io.FileWriter;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map.Entry;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.IntSupplier;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.opengis.referencing.operation.MathTransform;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.expandResourcePath;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.getNextId;
import static org.openforis.ceo.JsonUtils.intoJsonArray;
import static org.openforis.ceo.JsonUtils.mapJsonArray;
import static org.openforis.ceo.JsonUtils.mapJsonFile;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.readJsonFile;
import static org.openforis.ceo.JsonUtils.toStream;
import static org.openforis.ceo.JsonUtils.writeJsonFile;

public class Projects {

    public static String getAllProjects(Request req, Response res) {
        String institutionId = req.params(":id");
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
        if (institutionId.equals("ALL")) {
            return filterJsonArray(projects, project -> project.get("archived").getAsBoolean() == false
                                                        && project.get("privacy").getAsString().equals("public")).toString();
        } else {
            return filterJsonArray(projects, project -> project.get("archived").getAsBoolean() == false
                                                        && project.get("institution").getAsString().equals(institutionId)).toString();
        }
    }

    public static String getProjectPlots(Request req, Response res) {
        String projectId = req.params(":id");
        return readJsonFile("plot-data-" + projectId + ".json").toString();
    }

    private static Collector<String, ?, Map<String, Long>> countDistinct =
        Collectors.groupingBy(Function.identity(), Collectors.counting());

    private static JsonObject getValueDistribution(JsonArray samples, Map<Integer, String> sampleValueNames) {
        Map<String, Long> valueCounts = toStream(samples)
            .map(sample -> sample.has("value") ? sample.get("value").getAsInt() : -1)
            .map(value -> sampleValueNames.getOrDefault(value, "NoValue"))
            .collect(countDistinct);
        JsonObject valueDistribution = new JsonObject();
        valueCounts.forEach((name, count) -> valueDistribution.addProperty(name, 100.0 * count / samples.size()));
        return valueDistribution;
    }

    private static synchronized void writeCsvFile(String filename, String header, String[] rows) {
        String csvDataDir = expandResourcePath("/public/downloads/");
        try (FileWriter fileWriter = new FileWriter(new File(csvDataDir, filename))) {
            fileWriter.write(header + "\n");
            fileWriter.write(Arrays.stream(rows).collect(Collectors.joining("\n")));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static String dumpProjectAggregateData(Request req, Response res) {
        String projectId = req.params(":id");
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));

        if (matchingProject.isPresent()) {
            JsonObject project = matchingProject.get();
            JsonArray sampleValues = project.get("sample_values").getAsJsonArray();

            Map<Integer, String> sampleValueNames = toStream(sampleValues)
                .collect(Collectors.toMap(sampleValue -> sampleValue.get("id").getAsInt(),
                                          sampleValue -> sampleValue.get("name").getAsString(),
                                          (a, b) -> b));

            JsonArray plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
            JsonArray plotSummaries = mapJsonArray(plots,
                                                   plot -> {
                                                       JsonObject plotAttributes = plot.get("plot").getAsJsonObject();
                                                       JsonArray samples = plot.get("samples").getAsJsonArray();
                                                       JsonObject plotCenter = parseJson(plotAttributes.get("center").getAsString()).getAsJsonObject();
                                                       JsonObject plotSummary = new JsonObject();
                                                       plotSummary.addProperty("plot_id", plotAttributes.get("id").getAsInt());
                                                       plotSummary.addProperty("center_lon", plotCenter.get("coordinates").getAsJsonArray().get(0).getAsDouble());
                                                       plotSummary.addProperty("center_lat", plotCenter.get("coordinates").getAsJsonArray().get(1).getAsDouble());
                                                       plotSummary.addProperty("radius_m", plotAttributes.get("radius").getAsInt());
                                                       plotSummary.addProperty("flagged", plotAttributes.get("flagged").getAsBoolean());
                                                       plotSummary.addProperty("analyses", plotAttributes.get("analyses").getAsInt());
                                                       plotSummary.addProperty("sample_points", samples.size());
                                                       plotSummary.add("user_id", plotAttributes.get("user"));
                                                       plotSummary.add("distribution", getValueDistribution(samples, sampleValueNames));
                                                       return plotSummary;
                                                   });

            String[] fields = {"plot_id", "center_lon", "center_lat", "radius_m", "flagged", "analyses", "sample_points", "user_id"};
            String[] labels = sampleValueNames.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(Map.Entry::getValue).toArray(String[]::new);

            String csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase).collect(Collectors.joining(","));

            String[] csvRows = toStream(plotSummaries)
                .map(plotSummary -> {
                        Stream<String> fieldStream = Arrays.stream(fields);
                        Stream<String> labelStream = Arrays.stream(labels);
                        JsonObject distribution = plotSummary.get("distribution").getAsJsonObject();
                        return Stream.concat(fieldStream.map(field -> plotSummary.get(field).isJsonNull() ? "" : plotSummary.get(field).getAsString()),
                                             labelStream.map(label -> distribution.has(label) ? distribution.get(label).getAsString() : "0.0"))
                                     .collect(Collectors.joining(","));
                    })
                .toArray(String[]::new);

            String projectName = project.get("name").getAsString().replace(" ", "-").replace(",", "").toLowerCase();
            String currentDate = LocalDate.now().toString();
            String outputFileName = "ceo-" + projectName + "-" + currentDate + ".csv";

            writeCsvFile(outputFileName, csvHeader, csvRows);

            return Server.documentRoot + "/downloads/" + outputFileName;
        } else {
            return Server.documentRoot + "/project-not-found";
        }
    }

    public static synchronized String archiveProject(Request req, Response res) {
        String projectId = req.params(":id");

        mapJsonFile("project-list.json",
                    project -> {
                        if (project.get("id").getAsString().equals(projectId)) {
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
                        JsonObject plotAttributes = plot.get("plot").getAsJsonObject();
                        JsonArray samples = plot.get("samples").getAsJsonArray();
                        if (plotAttributes.get("id").getAsString().equals(plotId)) {
                            int currentAnalyses = plotAttributes.get("analyses").getAsInt();
                            plotAttributes.addProperty("analyses", currentAnalyses + 1);
                            plotAttributes.addProperty("user", userName);
                            plot.add("plot", plotAttributes);
                            JsonArray updatedSamples = mapJsonArray(samples,
                                                                    sample -> {
                                                                        String sampleId = sample.get("id").getAsString();
                                                                        sample.addProperty("value", userSamples.get(sampleId).getAsInt());
                                                                        return sample;
                                                                    });
                            plot.add("samples", updatedSamples);
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

        mapJsonFile("plot-data-" + projectId + ".json",
                    plot -> {
                        JsonObject plotAttributes = plot.get("plot").getAsJsonObject();
                        if (plotAttributes.get("id").getAsString().equals(plotId)) {
                            plotAttributes.addProperty("flagged", true);
                            plot.add("plot", plotAttributes);
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

    private static String getImageryAttribution(String imagerySelector) {
        Map<String, String> imageryAttribution = new HashMap<String, String>();
        imageryAttribution.put("DigitalGlobeRecentImagery+Streets", "DigitalGlobe Maps API: Recent Imagery+Streets | June 2015 | © DigitalGlobe, Inc");
        imageryAttribution.put("DigitalGlobeRecentImagery",         "DigitalGlobe Maps API: Recent Imagery | June 2015 | © DigitalGlobe, Inc");
        imageryAttribution.put("BingAerial",                        "Bing Maps API: Aerial | © Microsoft Corporation");
        imageryAttribution.put("BingAerialWithLabels",              "Bing Maps API: Aerial with Labels | © Microsoft Corporation");
        imageryAttribution.put("NASASERVIRChipset2002",             "June 2002 Imagery Data Courtesy of DigitalGlobe");
        return imageryAttribution.get(imagerySelector);
    }

    private static Double[][] createRandomPointsInBounds(double lonMin, double latMin, double lonMax, double latMax, int numPoints) {
        double lonRange = lonMax - lonMin;
        double latRange = latMax - latMin;
        return Stream.generate(() -> {
                return new Double[]{lonMin + Math.random() * lonRange,
                                    latMin + Math.random() * latRange};
            })
            .limit(numPoints)
            .toArray(Double[][]::new);
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

    private static double squareDistance(double x1, double y1, double x2, double y2) {
        return Math.pow(x2 - x1, 2.0) + Math.pow(y2 - y1, 2.0);
    }

    private static Double[][] createGriddedSampleSet(Double[] plotCenter, double bufferRadius, double sampleResolution) {
        Double[] plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        double plotX =  plotCenterWebMercator[0];
        double plotY =  plotCenterWebMercator[1];
        double left =   plotX - bufferRadius;
        double right =  plotX + bufferRadius;
        double top =    plotY - bufferRadius;
        double bottom = plotY + bufferRadius;
        double radiusSquared = bufferRadius * bufferRadius;
        long steps = (long) Math.floor(2 * bufferRadius / sampleResolution);
        return Stream.iterate(left, x -> x + sampleResolution)
            .limit(steps)
            .flatMap(x -> {
                    return Stream.iterate(top, y -> y + sampleResolution)
                        .limit(steps)
                        .filter(y -> squareDistance(x, y, plotX, plotY) < radiusSquared)
                        .map(y -> { return reprojectPoint(new Double[]{x, y}, 3857, 4326); });
                })
            .toArray(Double[][]::new);
    }

    private static Double[][] createRandomSampleSet(Double[] plotCenter, double bufferRadius, int samplesPerPlot) {
        Double[] plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        double plotX =  plotCenterWebMercator[0];
        double plotY =  plotCenterWebMercator[1];
        return Stream.generate(() -> { return 2.0 * Math.PI * Math.random(); })
            .limit(samplesPerPlot)
            .map(offsetAngle -> {
                    double offsetMagnitude = bufferRadius * Math.random();
                    double xOffset = offsetMagnitude * Math.cos(offsetAngle);
                    double yOffset = offsetMagnitude * Math.sin(offsetAngle);
                    return reprojectPoint(new Double[]{plotX + xOffset, plotY + yOffset}, 3857, 4326);
                })
            .toArray(Double[][]::new);
    }

    public static synchronized Request createNewProject(Request req, Response res) {
        try {
            String projectName = req.queryParams("project-name");
            String projectDescription = req.queryParams("project-description");
            double lonMin = Double.parseDouble(req.queryParams("boundary-lon-min"));
            double latMin = Double.parseDouble(req.queryParams("boundary-lat-min"));
            double lonMax = Double.parseDouble(req.queryParams("boundary-lon-max"));
            double latMax = Double.parseDouble(req.queryParams("boundary-lat-max"));
            int numPlots = Integer.parseInt(req.queryParams("plots"));
            double bufferRadius = Double.parseDouble(req.queryParams("buffer-radius"));
            String sampleType = req.queryParams("sample-type");
            int samplesPerPlot = req.queryParams("samples-per-plot") != null ? Integer.parseInt(req.queryParams("samples-per-plot")) : 0;
            double sampleResolution = req.queryParams("sample-resolution") != null ? Double.parseDouble(req.queryParams("sample-resolution")) : 0.0;
            String imagerySelector = req.queryParams("imagery-selector");
            JsonArray sampleValues = parseJson(req.queryParams("sample-values")).getAsJsonArray();

            // BEGIN: Add a new entry to project-list.json
            JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
            int newProjectId = getNextId(projects);
            JsonObject boundary = makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax);
            IntSupplier sampleValueIndexer = makeCounter();
            JsonArray updatedSampleValues = mapJsonArray(sampleValues,
                                                         sampleValue -> {
                                                             sampleValue.addProperty("id", sampleValueIndexer.getAsInt());
                                                             sampleValue.remove("$$hashKey");
                                                             sampleValue.remove("object");
                                                             if (sampleValue.get("image").getAsString().equals("")) {
                                                                 sampleValue.add("image", null);
                                                             }
                                                             return sampleValue;
                                                         });

            JsonObject newProject = new JsonObject();
            newProject.addProperty("id", newProjectId);
            newProject.addProperty("name", projectName);
            newProject.addProperty("description", projectDescription);
            newProject.addProperty("boundary", boundary.toString());
            newProject.addProperty("sample_resolution", sampleResolution > 0.0 ? sampleResolution : null);
            newProject.addProperty("imagery", imagerySelector);
            newProject.addProperty("attribution", getImageryAttribution(imagerySelector));
            newProject.add("sample_values", updatedSampleValues);
            newProject.addProperty("archived", false);

            projects.add(newProject);
            writeJsonFile("project-list.json", projects);
            // END: Add a new entry to project-list.json

            // BEGIN: Create a new plot-data-<newProjectId>.json file
            Double[][] newPlotCenters = createRandomPointsInBounds(lonMin, latMin, lonMax, latMax, numPlots);

            IntSupplier plotIndexer = makeCounter();
            JsonArray newPlots = Arrays.stream(newPlotCenters)
                .map(plotCenter -> {
                        JsonObject newPlotAttributes = new JsonObject();
                        newPlotAttributes.addProperty("id", plotIndexer.getAsInt());
                        newPlotAttributes.addProperty("center", makeGeoJsonPoint(plotCenter[0], plotCenter[1]).toString());
                        newPlotAttributes.addProperty("radius", bufferRadius);
                        newPlotAttributes.addProperty("flagged", false);
                        newPlotAttributes.addProperty("analyses", 0);
                        newPlotAttributes.add("user", null);

                        Double[][] newSamplePoints = sampleType.equals("gridded")
                        ? createGriddedSampleSet(plotCenter, bufferRadius, sampleResolution)
                        : createRandomSampleSet(plotCenter, bufferRadius, samplesPerPlot);

                        IntSupplier sampleIndexer = makeCounter();
                        JsonArray newSamples = Arrays.stream(newSamplePoints)
                        .map(point -> {
                                JsonObject sample = new JsonObject();
                                sample.addProperty("id", sampleIndexer.getAsInt());
                                sample.addProperty("point", makeGeoJsonPoint(point[0], point[1]).toString());
                                return sample;
                            })
                        .collect(intoJsonArray);

                        JsonObject newPlot = new JsonObject();
                        newPlot.add("plot", newPlotAttributes);
                        newPlot.add("samples", newSamples);

                        return newPlot;
                    })
                .collect(intoJsonArray);

            writeJsonFile("plot-data-" + newProjectId + ".json", newPlots);
            // END: Create a new plot-data-<newProjectId>.json file

            // Indicate that the project was created successfully
            req.session().attribute("flash_messages", new String[]{"New project " + req.queryParams("project-name") + " created and launched!"});
            return req;
        } catch (Exception e) {
            // Indicate that an error occurred with project creation
            req.session().attribute("flash_messages", new String[]{"Error with project creation!"});
            return req;
        }
    }

}
