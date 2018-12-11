package org.openforis.ceo.utils;

import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.toStream;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.PrecisionModel;
import java.io.IOException;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.time.LocalDate;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.http.HttpServletResponse;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import spark.Response;


public class ProjectUtils {

    //
    // Functions related to dumping csv data
    //

    private static Collector<String, ?, Map<String, Long>> countDistinct =
        Collectors.groupingBy(Function.identity(), Collectors.counting());

    private static String[] getSampleKeys(JsonArray sampleValueGroups) {
        var firstGroup = sampleValueGroups.get(0).getAsJsonObject();
        if (firstGroup.has("name")) {
            return new String[]{"name", "values", "name"};
        } else if (firstGroup.has("question")) {
            return new String[]{"question", "answers", "answer"};
        } else {
            return new String[]{};
        }
    }

    private static String[] getValueDistributionLabels(JsonArray sampleValueGroups, String[] keys) {
        return toStream(sampleValueGroups)
                .flatMap(group -> {
                    var sampleValues = group.get(keys[1]).getAsJsonArray();
                    return toStream(sampleValues)
                            .map(sampleValue -> group.get(keys[0]).getAsString() + ":" + sampleValue.get(keys[2]).getAsString());
                })
                .toArray(String[]::new);
    }

    public static Map<Integer, String> getSampleValueTranslations(JsonArray sampleValueGroups) {
        var keys = getSampleKeys(sampleValueGroups);
        var firstGroup = sampleValueGroups.get(0).getAsJsonObject();
        var firstGroupName =  firstGroup.get(keys[0]).getAsString();
        return toStream(firstGroup.get(keys[1]).getAsJsonArray())
                .collect(Collectors.toMap(sampleValue -> sampleValue.get("id").getAsInt(),
                        sampleValue -> firstGroupName + ":" + sampleValue.get(keys[2]).getAsString(),
                        (a, b) -> b));
    }

    // Returns a JsonObject like this:
    // {"Land Use:Timber" 10.0,
    //  "Land Use:Agriculture": 20.0,
    //  "Land Use:Urban": 70.0,
    //  "Land Cover:Forest": 10.0,
    //  "Land Cover:Grassland": 40.0,
    //  "Land Cover:Impervious": 50.0}
    public static JsonObject getValueDistribution(JsonArray samples, Map<Integer, String> sampleValueTranslations) {
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
                            Collectors.mapping(entry -> entry.getValue().isJsonPrimitive()
                                    ? entry.getValue().getAsString()
                                    : entry.getValue().getAsJsonObject().get("answer").getAsString(),
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

    public static HttpServletResponse outputAggregateCsv(Response res, JsonArray sampleValueGroups, JsonArray plotSummaries, String projectName, String[] externalHeaders){
        var sampleValueKeys = getSampleKeys(sampleValueGroups);
        // fileds are straight forward json values
        var fields = Stream.concat(
                        Arrays.stream(new String[]{"plot_id", "center_lon", "center_lat", "size_m", "shape", "flagged", "analyses", "sample_points", "user_id", "analysis_duration", "collection_time"}), 
                        Arrays.stream(externalHeaders))
                        .toArray(String[]::new);
        // labels require interpretation of the next json object
        var labels = getValueDistributionLabels(sampleValueGroups, sampleValueKeys);

        var csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase).collect(Collectors.joining(","));
        var csvContent = toStream(plotSummaries)
                .map(plotSummary -> {
                    var fieldStream = Arrays.stream(fields);
                    var labelStream = Arrays.stream(labels);
                    var distribution = plotSummary.get("distribution").getAsJsonObject();
                    return Stream.concat(
                            fieldStream.map(field -> plotSummary.has(field) ?
                                    plotSummary.get(field).isJsonNull()
                                        ? ""
                                        : plotSummary.get(field).getAsString()
                                    : ""),
                            labelStream.map(label -> distribution.has(label)
                                    ? distribution.getAsJsonObject().get(label).isJsonPrimitive() 
                                        ? distribution.get(label).getAsString()
                                        : distribution.getAsJsonObject().get(label).getAsJsonObject().get("answer").getAsString()
                                    : "0.0")
                            ).collect(Collectors.joining(","));
                    }).collect(Collectors.joining("\n"));

        var currentDate = LocalDate.now().toString();
        var outputFileName = "ceo-" + projectName + "-plot-data-" + currentDate;

        return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
        
    }

    public static HttpServletResponse outputRawCsv(Response res, JsonArray sampleValueGroups, JsonArray sampleSummaries, String projectName, String[] externalHeaders) {
        var sampleValueKeys = getSampleKeys(sampleValueGroups);
        var sampleValueGroupNames = toStream(sampleValueGroups)
        .collect(Collectors.toMap(sampleValueGroup -> sampleValueGroup.get("id").getAsInt(),
                sampleValueGroup -> sampleValueGroup.get(sampleValueKeys[0]).getAsString(),
                (a, b) -> b));

        // fileds are straight forward json values
        var fields = Stream.concat(
                        Arrays.stream(new String[]{"plot_id", "sample_id", "lon", "lat", "flagged", "analyses", "user_id", "analysis_duration", "collection_time"}), 
                        Arrays.stream(externalHeaders))
                        .toArray(String[]::new);
        // labels require interpretation of the next json object
        var labels = sampleValueGroupNames.entrySet().stream()
                        .sorted(Map.Entry.comparingByKey()).map(Map.Entry::getValue)
                        .toArray(String[]::new);

        var csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase)
                        .collect(Collectors.joining(","));

        var csvContent = toStream(sampleSummaries)
                .map(sampleSummary -> {
                    var fieldStream = Arrays.stream(fields);
                    var labelStream = Arrays.stream(labels);
                    return Stream.concat(fieldStream.map(field -> !sampleSummary.has(field) || sampleSummary.get(field).isJsonNull() 
                        ? "" : sampleSummary.get(field).getAsString()),
                            labelStream.map(label -> {
                                var value = sampleSummary.get("value");
                                if (value.isJsonNull()) {
                                    return "";
                                // original format is single integer index
                                } else if (value.isJsonPrimitive()) {
                                    var sampleValueTranslations = getSampleValueTranslations(sampleValueGroups);
                                    return sampleValueTranslations
                                            .getOrDefault(value.getAsInt(), "LULC:NoValue")
                                            .split(":")[1];
                                } else if (value.getAsJsonObject().has(label)) {
                                    if (value.getAsJsonObject().get(label).isJsonPrimitive()){
                                        return value.getAsJsonObject().get(label).getAsString();
                                    }
                                    // newest format nests the answer in another json object
                                    return value.getAsJsonObject().get(label).getAsJsonObject().get("answer").getAsString();
                                } else {
                                    return "";
                                }
                            })).collect(Collectors.joining(","));         
                }).collect(Collectors.joining("\n"));

        var currentDate = LocalDate.now().toString();
        var outputFileName = "ceo-" + projectName + "-sample-data-" + currentDate;

        return writeCsvFile(res.raw(), csvHeader.toString(), csvContent.toString(), outputFileName);
    }


    //
    // Functions related to creating a new project
    //

    public static JsonObject makeGeoJsonPoint(double lon, double lat) {
        var coordinates = new JsonArray();
        coordinates.add(lon);
        coordinates.add(lat);

        var geoJsonPoint = new JsonObject();
        geoJsonPoint.addProperty("type", "Point");
        geoJsonPoint.add("coordinates", coordinates);

        return geoJsonPoint;
    }

    public static JsonObject makeGeoJsonPolygon(double lonMin, double latMin, double lonMax, double latMax) {
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

    public static Double[] reprojectBounds(double left, double bottom, double right, double top, int fromEPSG, int toEPSG) {
        var lowerLeft = reprojectPoint(new Double[]{left, bottom}, fromEPSG, toEPSG);
        var upperRight = reprojectPoint(new Double[]{right, top}, fromEPSG, toEPSG);
        return new Double[]{lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]};
    }

    // add internal padding before calculating centers so the exterior of the plot is within the bounds
    public static Double[] padBounds(double left, double bottom, double right, double top, double buffer) {
        return new Double[]{left + buffer, bottom + buffer, right - buffer, top - buffer};
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    public static Double[][] createRandomPointsInBounds(double left, double bottom, double right, double top, int numPoints) {
        var xRange = right - left;
        var yRange = top - bottom;
        return Stream.generate(() -> new Double[]{left + Math.random() * xRange,
                bottom + Math.random() * yRange})
                .limit(numPoints)
                .map(point -> reprojectPoint(point, 3857, 4326))
                .toArray(Double[][]::new);
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    public static Double[][] createGriddedPointsInBounds(double left, double bottom, double right, double top, double spacing) {
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

    public static Double[][] createRandomSampleSet(Double[] plotCenter, String plotShape, double plotSize, int samplesPerPlot) {
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

    public static Double[][] createGriddedSampleSet(Double[] plotCenter, String plotShape, double plotSize, double sampleResolution) {
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

    public static JsonElement getOrZero(JsonObject obj, String field) {
        return !obj.has(field) || obj.get(field).isJsonNull() || obj.get(field) == null ? new JsonPrimitive(0) : obj.get(field);
    }

    public static JsonElement getOrEmptyString(JsonObject obj, String field) {
        return !obj.has(field) || obj.get(field).isJsonNull() ? new JsonPrimitive("") : obj.get(field);
    }

    public static void runBashScriptForProject(int projectId, String plotsOrSamples, String script, String rpath) {
        try {
            System.out.println("Runnin " + script);
            var pb = new ProcessBuilder("/bin/sh", script, "project-" + projectId + "-" + plotsOrSamples);
            pb.directory(new File(expandResourcePath(rpath)));
            pb.redirectOutput(new File("out.txt"));
            var p = pb.start();
            if (p.waitFor(10L, TimeUnit.SECONDS)) {
                System.out.println("Linux Conversion complete.");
            } else {
                p.destroy();
                throw new RuntimeException("");
            }
        } catch (Exception e) {
            // for windows
            try {
                System.out.println("Runnin " + script + " with git bash.");
                var pb = new ProcessBuilder("C:\\Program Files\\Git\\bin\\bash.exe", script, "project-" + projectId + "-" + plotsOrSamples);
                pb.directory(new File(expandResourcePath(rpath)));
                // For some reason shp2pgsql needs this to work
                pb.redirectOutput(new File("out.txt"));
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

    private static void deleteShapeFileDirectory(String shapeFileDirectory) {
        var shapeFileDirectoryPath = Paths.get(expandResourcePath("/shp"), shapeFileDirectory);
        try {
            if (shapeFileDirectoryPath.toFile().exists()) {
                // System.out.println("Deleting directory at: " + shapeFileDirectoryPath);
                Files.walk(shapeFileDirectoryPath)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            } else {
                // System.out.println("No directory found at: " + shapeFileDirectoryPath);
            }
        } catch (Exception e) {
            System.out.println("Error deleting directory at: " + shapeFileDirectoryPath);
        }
    }

    public static void deleteShapeFileDirectories(int projectId) {
        deleteShapeFileDirectory("project-" + projectId + "-plots");
        deleteShapeFileDirectory("project-" + projectId + "-samples");
    }

    
}