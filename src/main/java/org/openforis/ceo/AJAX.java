package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.net.URLDecoder;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map.Entry;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.IntSupplier;
import java.util.function.Predicate;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import spark.Request;
import spark.Response;

public class AJAX {

    private static String expandResourcePath(String filename) {
        return AJAX.class.getResource(filename).getFile();
    }

    private static JsonElement readJsonFile(String filename) {
        String jsonDataDir = expandResourcePath("/public/json/");
        try (FileReader fileReader = new FileReader(new File(jsonDataDir, filename))) {
            return (new JsonParser()).parse(fileReader);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static void writeJsonFile(String filename, JsonElement data) {
        String jsonDataDir = expandResourcePath("/public/json/");
        try (FileWriter fileWriter = new FileWriter(new File(jsonDataDir, filename))) {
            fileWriter.write(data.toString());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static void writeCsvFile(String filename, String header, String[] rows) {
        String csvDataDir = expandResourcePath("/public/downloads/");
        try (FileWriter fileWriter = new FileWriter(new File(csvDataDir, filename))) {
            fileWriter.write(header + "\n");
            fileWriter.write(Arrays.stream(rows).collect(Collectors.joining("\n")));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Collector<JsonElement, ?, JsonArray> intoJsonArray =
        Collector.of(JsonArray::new, JsonArray::add,
                     (left, right) -> { left.addAll(right); return left; });

    private static JsonArray mapJsonArray(JsonArray array, Function<JsonObject, JsonObject> mapper) {
        return StreamSupport.stream(array.spliterator(), false)
            .map(element -> element.getAsJsonObject())
            .map(mapper)
            .collect(intoJsonArray);
    }

    private static JsonArray filterJsonArray(JsonArray array, Predicate<JsonObject> predicate) {
        return StreamSupport.stream(array.spliterator(), false)
            .map(element -> element.getAsJsonObject())
            .filter(predicate)
            .collect(intoJsonArray);
    }

    private static Optional<JsonObject> findInJsonArray(JsonArray array, Predicate<JsonObject> predicate) {
        return StreamSupport.stream(array.spliterator(), false)
            .map(element -> element.getAsJsonObject())
            .filter(predicate)
            .findFirst();
    }

    private static void forEachInJsonArray(JsonArray array, Consumer<JsonObject> action) {
        StreamSupport.stream(array.spliterator(), false)
            .map(element -> element.getAsJsonObject())
            .forEach(action);
    }

    // Note: The JSON file must contain an array of objects.
    private static void updateJsonFile(String filename, Function<JsonObject, JsonObject> mapper) {
        JsonArray array = readJsonFile(filename).getAsJsonArray();
        JsonArray updatedArray = mapJsonArray(array, mapper);
        writeJsonFile(filename, updatedArray);
    }

    public static String getAllProjects(Request req, Response res) {
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
        JsonArray visibleProjects = filterJsonArray(projects, project -> project.get("archived").getAsBoolean() == false);
        return visibleProjects.toString();
    }

    public static String getProjectPlots(Request req, Response res) {
        String projectId = req.body();
        return readJsonFile("plot-data-" + projectId + ".json").toString();
    }

    private static JsonObject getValueDistribution(JsonArray samples, Map<Integer, String> sampleValueNames) {
        Map<String, Long> valueCounts = StreamSupport.stream(samples.spliterator(), false)
            .map(sample -> sample.getAsJsonObject())
            .map(sample -> sample.has("value") ? sample.get("value").getAsInt() : -1)
            .map(value -> sampleValueNames.getOrDefault(value, "NoValue"))
            .collect(Collectors.groupingBy(Function.identity(),
                                           Collectors.counting()));
        JsonObject valueDistribution = new JsonObject();
        valueCounts.forEach((name, count) -> valueDistribution.addProperty(name, 100.0 * count / samples.size()));
        return valueDistribution;
    }

    public static String dumpProjectAggregateData(Request req, Response res) {
        String projectId = req.body();
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects, project -> project.get("id").getAsString().equals(projectId));

        if (matchingProject.isPresent()) {
            JsonObject project = matchingProject.get();
            JsonArray sampleValues = project.get("sample_values").getAsJsonArray();

            Map<Integer, String> sampleValueNames = StreamSupport.stream(sampleValues.spliterator(), false)
                .map(sampleValue -> sampleValue.getAsJsonObject())
                .collect(Collectors.toMap(sampleValue -> sampleValue.get("id").getAsInt(),
                                          sampleValue -> sampleValue.get("name").getAsString(),
                                          (a, b) -> b));

            JsonArray plots = readJsonFile("plot-data-" + projectId + ".json").getAsJsonArray();
            JsonArray plotSummaries = mapJsonArray(plots,
                                                   plot -> {
                                                       JsonObject plotAttributes = plot.get("plot").getAsJsonObject();
                                                       JsonArray samples = plot.get("samples").getAsJsonArray();
                                                       JsonObject plotCenter = (new JsonParser()).parse(plotAttributes.get("center").getAsString()).getAsJsonObject();
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

            String[] csvRows = StreamSupport.stream(plotSummaries.spliterator(), false)
                .map(plotSummary -> plotSummary.getAsJsonObject())
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

            return "/downloads/" + outputFileName;
        } else {
            return "/project-not-found";
        }
    }

    public static String archiveProject(Request req, Response res) {
        String projectId = req.body();

        updateJsonFile("project-list.json",
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

    public static String addUserSamples(Request req, Response res) {
        JsonObject jsonInputs = (new JsonParser()).parse(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();
        int userId = jsonInputs.get("userId").getAsInt();
        JsonObject userSamples = jsonInputs.get("userSamples").getAsJsonObject();

        updateJsonFile("plot-data-" + projectId + ".json",
                       plot -> {
                           JsonObject plotAttributes = plot.get("plot").getAsJsonObject();
                           JsonArray samples = plot.get("samples").getAsJsonArray();
                           if (plotAttributes.get("id").getAsString().equals(plotId)) {
                               int currentAnalyses = plotAttributes.get("analyses").getAsInt();
                               plotAttributes.addProperty("analyses", currentAnalyses + 1);
                               plotAttributes.addProperty("user", userId);
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

    public static String flagPlot(Request req, Response res) {
        JsonObject jsonInputs = (new JsonParser()).parse(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();

        updateJsonFile("plot-data-" + projectId + ".json",
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

    private static double squareDistance(double x1, double y1, double x2, double y2) {
        return Math.pow(x2 - x1, 2.0) + Math.pow(y2 - y1, 2.0);
    }

    private static Double[][] createGriddedSampleSet(Double[] plotCenter, double bufferRadius, double sampleResolution) {
        double plotX =  plotCenter[0]; // FIXME: convert plotCenter[0] to web mercator (4326 -> 3857)
        double plotY =  plotCenter[1]; // FIXME: convert plotCenter[1] to web mercator (4326 -> 3857)
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
                        .map(y -> { return new Double[]{x, y}; }); // FIXME: convert sample points back to lon/lat (3857 -> 4326)
                })
            .toArray(Double[][]::new);
    }

    private static Double[][] createRandomSampleSet(Double[] plotCenter, double bufferRadius, int samplesPerPlot) {
        double plotX =  plotCenter[0]; // FIXME: convert plotCenter[0] to web mercator (4326 -> 3857)
        double plotY =  plotCenter[1]; // FIXME: convert plotCenter[1] to web mercator (4326 -> 3857)
        return Stream.generate(() -> { return 2.0 * Math.PI * Math.random(); })
            .limit(samplesPerPlot)
            .map(offsetAngle -> {
                    double offsetMagnitude = bufferRadius * Math.random();
                    double xOffset = offsetMagnitude * Math.cos(offsetAngle);
                    double yOffset = offsetMagnitude * Math.sin(offsetAngle);
                    return new Double[]{plotX + xOffset, plotY + yOffset}; // FIXME: convert sample points back to lon/lat (3857 -> 4326)
                })
            .toArray(Double[][]::new);
    }

    // FIXME: Don't create a new project unless all inputs have been provided
    public static void createNewProject(Request req, Response res) {
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
        JsonArray sampleValues = (new JsonParser()).parse(req.queryParams("sample-values")).getAsJsonArray();

        // BEGIN: Add a new entry to project-list.json
        JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();

        int newProjectId = StreamSupport.stream(projects.spliterator(), false)
            .map(project -> project.getAsJsonObject())
            .map(project -> project.get("id").getAsInt())
            .max(Comparator.naturalOrder())
            .get() + 1;

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

                    Double[][] newSamplePoints = (sampleType == "gridded")
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
    }

    public static String geodashId(Request req, Response res) {
        String geodashDataDir = expandResourcePath("/public/json/");

        try (FileReader projectFileReader = new FileReader(new File(geodashDataDir, "proj.json"))) {
            JsonParser parser = new JsonParser();
            JsonArray projects = parser.parse(projectFileReader).getAsJsonArray();

            Optional matchingProject = StreamSupport.stream(projects.spliterator(), false)
                .map(project -> project.getAsJsonObject())
                .filter(project -> project.get("projectID").getAsString().equals(req.params(":id")))
                .map(project -> {
                        try (FileReader dashboardFileReader = new FileReader(new File(geodashDataDir, "dash-" + project.get("dashboard").getAsString() + ".json"))) {
                            return parser.parse(dashboardFileReader).getAsJsonObject();
                        } catch (Exception e) {
                            throw new RuntimeException(e);
                        }
                    })
                .findFirst();

            if (matchingProject.isPresent()) {
                if (req.queryParams("callback") != null) {
                    return req.queryParams("callback") + "(" + matchingProject.get().toString() + ")";
                } else {
                    return matchingProject.get().toString();
                }
            } else {
                if (true) { // FIXME: Make sure this is true if the user has role admin
                    String newUUID = UUID.randomUUID().toString();

                    JsonObject newProject = new JsonObject();
                    newProject.addProperty("projectID", req.params(":id"));
                    newProject.addProperty("dashboard", newUUID);
                    projects.add(newProject);

                    try (FileWriter projectFileWriter = new FileWriter(new File(geodashDataDir, "proj.json"))) {
                        projectFileWriter.write(projects.toString());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

                    JsonObject newDashboard = new JsonObject();
                    newDashboard.addProperty("projectID", req.params(":id"));
                    newDashboard.addProperty("projectTitle", req.queryParams("title"));
                    newDashboard.addProperty("widgets", "[]");
                    newDashboard.addProperty("dashboardID", newUUID);

                    try (FileWriter dashboardFileWriter = new FileWriter(new File(geodashDataDir, "dash-" + newUUID + ".json"))) {
                        dashboardFileWriter.write(newDashboard.toString());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

                    if (req.queryParams("callback") != null) {
                        return req.queryParams("callback") + "(" + newDashboard.toString() + ")";
                    } else {
                        return newDashboard.toString();
                    }
                } else {
                    return "No project exists with ID: " + req.params(":id") + ".";
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static String updateDashBoardByID(Request req, Response res) {
        String returnString = "";

        /* Code will go here to update dashboard*/

        return  returnString;
    }

    public static String createDashBoardWidgetByID(Request req, Response res) {
        String geodashDataDir = expandResourcePath("/public/json/");
        JsonParser parser = new JsonParser();
        JsonObject dashboardObj = new JsonObject();

        try (FileReader dashboardFileReader = new FileReader(new File(geodashDataDir, "dash-" + req.queryParams("dashID") + ".json"))) {
            dashboardObj = parser.parse(dashboardFileReader).getAsJsonObject();
            dashboardObj.getAsJsonArray("widgets").add(parser.parse(URLDecoder.decode(req.queryParams("widgetJSON"), "UTF-8")).getAsJsonObject());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        try (FileWriter dashboardFileWriter = new FileWriter(new File(geodashDataDir, "dash-" + req.queryParams("dashID") + ".json"))) {
            dashboardFileWriter.write(dashboardObj.toString());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        if (req.queryParams("callback") != null) {
            return req.queryParams("callback").toString() + "()";
        } else {
            return "";
        }
    }

    public static String updateDashBoardWidgetByID(Request req, Response res) {
        try {
            deleteOrUpdate(req.queryParams("dashID"), req.params(":id"), req.queryParams("widgetJSON"), false);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        if (req.queryParams("callback") != null) {
            return req.queryParams("callback").toString() + "()";
        } else {
            return "";
        }
    }

    public static String deleteDashBoardWidgetByID(Request req, Response res) {

        deleteOrUpdate(req.queryParams("dashID"), req.params(":id"), "", true);

        if (req.queryParams("callback") != null) {
            return req.queryParams("callback").toString() + "()";
        } else {
            return "";
        }
    }

    private static void deleteOrUpdate(String dashID, String ID, String widgetJSON, boolean delete) {
        try {
            String geodashDataDir = expandResourcePath("/public/json/");
            if (geodashDataDir.indexOf("/") == 0) {
                geodashDataDir = geodashDataDir.substring(1);
            }
            JsonParser parser = new JsonParser();
            JsonObject dashboardObj = new JsonObject();
            JsonArray finalArr = new JsonArray();
            FileSystem fs = FileSystems.getDefault();
            Path path = fs.getPath(geodashDataDir + "dash-" + dashID + ".json");
            int retries = 0;
            while (retries < 200) {
                try (FileChannel fileChannel = FileChannel.open(path, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
                    FileLock lock = fileChannel.tryLock();
                    ByteBuffer buffer = ByteBuffer.allocate(2000);
                    int noOfBytesRead = fileChannel.read(buffer);
                    String jsonString = "";
                    while (noOfBytesRead != -1) {
                        buffer.flip();
                        while (buffer.hasRemaining()) {
                            jsonString += (char) buffer.get();
                        }
                        buffer.clear();
                        noOfBytesRead = fileChannel.read(buffer);
                    }
                    dashboardObj = parser.parse(jsonString).getAsJsonObject();
                    JsonArray widgets = dashboardObj.getAsJsonArray("widgets");
                    for (int i = 0; i < widgets.size(); i++) {  // **line 2**
                        JsonObject childJSONObject = widgets.get(i).getAsJsonObject();
                        String wID = childJSONObject.get("id").getAsString();
                        if (wID.equals(ID)) {
                            if (!delete) {
                                JsonParser widgetParser = new JsonParser();
                                childJSONObject = widgetParser.parse(URLDecoder.decode(widgetJSON, "UTF-8")).getAsJsonObject();
                                finalArr.add(childJSONObject);
                            }
                        } else {
                            finalArr.add(childJSONObject);
                        }
                    }
                    dashboardObj.remove("widgets");
                    dashboardObj.add("widgets", finalArr);
                    byte[] inputBytes = dashboardObj.toString().getBytes();
                    ByteBuffer buffer2 = ByteBuffer.wrap(inputBytes);
                    fileChannel.truncate(0);
                    fileChannel.write(buffer2);
                    fileChannel.close();
                    retries = 201;
                } catch (Exception e) {
                    retries++;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}
