package org.openforis.ceo.utils;

import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.toElementStream;
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
import java.util.concurrent.TimeUnit;
import java.util.Comparator;
import java.util.HashMap;
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
        }
        if (firstGroup.has("question")) {
            return new String[]{"question", "answers", "answer"};
        }
        return new String[]{};
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

    public static HttpServletResponse outputAggregateCsv(Response res, JsonArray sampleValueGroups, JsonArray plotSummaries, String projectName){
        var sampleValueKeys = getSampleKeys(sampleValueGroups);
        var fields = new String[]{"plot_id", "center_lon", "center_lat", "size_m", "shape", "flagged", "analyses", "sample_points", "user_id", "collection_time"};
        var labels = getValueDistributionLabels(sampleValueGroups, sampleValueKeys);

        var csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase).collect(Collectors.joining(","));
        var csvContent = toStream(plotSummaries)
                .map(plotSummary -> {
                    var fieldStream = Arrays.stream(fields);
                    var labelStream = Arrays.stream(labels);
                    var distribution = plotSummary.get("distribution").getAsJsonObject();
                    return Stream.concat(
                            fieldStream.map(field -> plotSummary.get(field).isJsonNull()
                                    ? ""
                                    : plotSummary.get(field).getAsString()),
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

    public static HttpServletResponse outputRawCsv(Response res, JsonArray sampleValueGroups, JsonArray sampleSummaries, String projectName) {
        var sampleValueKeys = getSampleKeys(sampleValueGroups);
        var sampleValueGroupNames = toStream(sampleValueGroups)
        .collect(Collectors.toMap(sampleValueGroup -> sampleValueGroup.get("id").getAsInt(),
                sampleValueGroup -> sampleValueGroup.get(sampleValueKeys[0]).getAsString(),
                (a, b) -> b));

        var fields = new String[]{"plot_id", "sample_id", "lon", "lat", "flagged", "analyses", "user_id", "collection_time"};
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

    // NOTE: The CSV file should contain a header row (which will be skipped) and these fields: LON,LAT,PLOTID
    public static HashMap<String, Double[]> loadCsvPlotPoints(String filename) {
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
    public static HashMap<String, HashMap<String, Double[]>> loadCsvSamplePoints(String filename) {
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

    public static Double[] calculateBounds(Double[][] points, double buffer) {
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

    public static JsonElement getOrZero(JsonObject obj, String field) {
        return obj.get(field).isJsonNull() ? new JsonPrimitive(0) : obj.get(field);
    }

    public static JsonElement getOrEmptyString(JsonObject obj, String field) {
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

    public static void extractZipFileToGeoJson(int projectId, String plotsOrSamples) {
        try {
            System.out.println("Converting the uploaded ZIP file into GeoJSON.");
            var pb = new ProcessBuilder("/bin/sh", "shp2geojson.sh", "project-" + projectId + "-" + plotsOrSamples);
            pb.directory(new File(expandResourcePath("/shp")));
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
    public static HashMap<String, JsonObject> getGeoJsonPlotGeometries(int projectId) {
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
    public static HashMap<String, HashMap<String, JsonObject>> getGeoJsonSampleGeometries(int projectId) {
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
    public static HashMap<String, Double[]> getPlotGeometryCenters(HashMap<String, JsonObject> plotGeoms) {
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
    public static HashMap<String, HashMap<String, Double[]>> getSampleGeometryCenters(HashMap<String, HashMap<String, JsonObject>> sampleGeomsByPlot) {
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
}