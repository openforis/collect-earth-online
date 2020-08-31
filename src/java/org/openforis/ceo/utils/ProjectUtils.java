package org.openforis.ceo.utils;

import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.toStream;

import java.io.IOException;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.NumberFormat;
import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.time.LocalDate;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class ProjectUtils {

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
        var buffer = xRange / 50;
        return Stream.generate(() -> new Double[]{left + Math.floor(Math.random() * xRange / buffer) * buffer + (buffer / 2),
                                     bottom + Math.floor(Math.random() * yRange / buffer) * buffer + (buffer / 2)})
                .limit(numPoints)
                .map(point -> reprojectPoint(point, 3857, 4326))
                .toArray(Double[][]::new);
    }

    public static Integer countGriddedPoints(double left, double bottom, double right, double top, double spacing) {
        var xRange = right - left;
        var yRange = top - bottom;
        var xSteps = (int) Math.floor(xRange / spacing) + 1;
        var ySteps = (int) Math.floor(yRange / spacing) + 1;
        return xSteps * ySteps;
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
        var buffer = radius / 50;
        if (plotShape.equals("circle")) {
            return Stream.generate(() -> new Double[]{left + Math.floor(Math.random() * plotSize / buffer) * buffer,
                                         bottom + Math.floor(Math.random() * plotSize / buffer) * buffer})
                    .filter(point -> Math.sqrt(Math.pow(point[0] - plotX, 2) + Math.pow(point[1] - plotY, 2)) < (radius - (buffer / 2)))
                    .limit(samplesPerPlot)
                    .map(point -> reprojectPoint(point, 3857, 4326))
                    .toArray(Double[][]::new);
        } else {
            return createRandomPointsInBounds(left, bottom, right, top, samplesPerPlot);
        }
    }

    private static double squareDistance(double x1, double y1, double x2, double y2) {
        return Math.pow(x2 - x1, 2.0) + Math.pow(y2 - y1, 2.0);
    }

    public static Integer countGriddedSampleSet(double plotSize, double sampleResolution) {
        var steps = (int) Math.floor(plotSize / sampleResolution) + 1;
        return steps * steps;
    }

    public static Double[][] createGriddedSampleSet(Double[] plotCenter, String plotShape, double plotSize, double sampleResolution) {
        if (plotSize == sampleResolution) {
            return new Double[][]{plotCenter};
        }
        var plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        var centerX = plotCenterWebMercator[0];
        var centerY = plotCenterWebMercator[1];
        var radius = plotSize / 2.0;
        var radiusSquared = radius * radius;
        var left = centerX - radius;
        var bottom = centerY - radius;
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
        return !obj.has(field)
                || obj.get(field).isJsonNull()
                || obj.get(field) == null
                || obj.get(field).getAsString().equals("")
                ? new JsonPrimitive(0) : obj.get(field);
    }

    public static JsonElement getOrFalse(JsonObject obj, String field) {
        return !obj.has(field)
                || obj.get(field).isJsonNull()
                || obj.get(field) == null
                || obj.get(field).getAsString().equals("")
                ? new JsonPrimitive(false) : obj.get(field);
    }

    public static JsonElement getOrEmptyString(JsonObject obj, String field) {
        return !obj.has(field)
               || obj.get(field).isJsonNull()
               || obj.get(field) == null
               ? new JsonPrimitive("") : obj.get(field);
    }

    public static void runBashScriptForProject(int projectId, String plotsOrSamples, String script, String rpath) {
        try {
            System.out.println("Running " + script);
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
                System.out.println("Running " + script + " with git bash.");
                var pb = new ProcessBuilder("C:\\Program Files\\Git\\bin\\bash.exe", script, "project-" + projectId + "-" + plotsOrSamples);
                pb.directory(new File(expandResourcePath(rpath)));
                // For some reason shp2pgsql needs this to work
                pb.redirectOutput(new File("out-win.txt"));
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

    // Some older data contains a useless string format for collection time.
    public static Long collectTimeIgnoreString (JsonObject plot){
        try {
            return getOrZero(plot, "collectionTime").getAsLong();
        } catch (Exception e) {
            return 0L;
        }
    }

    private static String numFormat(Integer num) {return NumberFormat.getInstance().format(num);}

    public static void checkPlotLimits(Integer plots, Integer plotLimit, Integer perPlot, Integer perPlotLimit, Integer sampleLimit) {
        if (plots > plotLimit) {
            throw new RuntimeException("This action will create "
                                       + numFormat(plots)
                                       + " plots. The maximum allowed for the selected plot distribution is "
                                       + numFormat(plotLimit) + ".");
        }

        if (perPlot > perPlotLimit) {
            throw new RuntimeException("This action will create "
                                       + numFormat(perPlot)
                                       + " samples per plot. The maximum allowed for the selected sample distribution is "
                                       + numFormat(perPlotLimit) + ".");
        }

        if (plots * perPlot > sampleLimit) {
            throw new RuntimeException("This action will create "
                                       + numFormat(plots * perPlot)
                                       + " total samples. The maximum allowed for the selected distribution types is "
                                       + numFormat(sampleLimit) + ".");
        }
    }

}
