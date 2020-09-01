package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.getBodyParam;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.PartUtils.writeFilePartBase64;
import static org.openforis.ceo.utils.ProjectUtils.padBounds;
import static org.openforis.ceo.utils.ProjectUtils.reprojectBounds;
import static org.openforis.ceo.utils.ProjectUtils.checkPlotLimits;
import static org.openforis.ceo.utils.ProjectUtils.createGriddedPointsInBounds;
import static org.openforis.ceo.utils.ProjectUtils.createGriddedSampleSet;
import static org.openforis.ceo.utils.ProjectUtils.createRandomPointsInBounds;
import static org.openforis.ceo.utils.ProjectUtils.createRandomSampleSet;
import static org.openforis.ceo.utils.ProjectUtils.countGriddedSampleSet;
import static org.openforis.ceo.utils.ProjectUtils.countGriddedPoints;
import static org.openforis.ceo.utils.ProjectUtils.outputAggregateCsv;
import static org.openforis.ceo.utils.ProjectUtils.outputRawCsv;
import static org.openforis.ceo.utils.ProjectUtils.getOrEmptyString;
import static org.openforis.ceo.utils.ProjectUtils.getOrFalse;
import static org.openforis.ceo.utils.ProjectUtils.getOrZero;
import static org.openforis.ceo.utils.ProjectUtils.getValueDistribution;
import static org.openforis.ceo.utils.ProjectUtils.makeGeoJsonPoint;
import static org.openforis.ceo.utils.ProjectUtils.makeGeoJsonPolygon;
import static org.openforis.ceo.utils.ProjectUtils.getSampleValueTranslations;
import static org.openforis.ceo.utils.ProjectUtils.deleteShapeFileDirectories;
import static org.openforis.ceo.utils.ProjectUtils.runBashScriptForProject;
import static org.openforis.ceo.utils.SessionUtils.getSessionUserId;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.PreparedStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.UUID;

public class PostgresProjects implements Projects {

    private static String valueOrBlank(String input) {
        return input == null || input.equals("null") ? "" : input;
    }

    public Integer getFirstPublicImageryId() {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_first_public_imagery()") ;) {

            try (var rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("select_first_public_imagery");
                } else {
                    return 0;
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return 0;
        }
    }

    private void insertProjectImagery(Integer projectId, JsonObject jsonInputs) {
        try (var conn = connect()) {
            jsonInputs.get("projectImageryList").getAsJsonArray()
                    .forEach(projectImageryId -> {
                        try (var pstmt = conn.prepareStatement("SELECT * FROM insert_project_imagery(?,?)")) {
                            pstmt.setInt(1, projectId);
                            pstmt.setInt(2, projectImageryId.getAsInt());
                            pstmt.execute();
                        } catch (SQLException e) {
                            System.out.println(e.getMessage());
                        }
                    });
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
    }

    public String updateProject(Request req, Response res) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM update_project(?,?,?,?,?,?::JSONB)")) {

            final var jsonInputs = parseJson(req.body()).getAsJsonObject();
            final var projectId = Integer.parseInt(getOrEmptyString(jsonInputs, "projectId").getAsString());
            pstmt.setInt(1,    projectId);
            pstmt.setString(2, getOrEmptyString(jsonInputs, "name").getAsString());
            pstmt.setString(3, getOrEmptyString(jsonInputs, "description").getAsString());
            pstmt.setString(4, getOrEmptyString(jsonInputs, "privacyLevel").getAsString());
            pstmt.setInt(5,    jsonInputs.has("imageryId")
                                    ? jsonInputs.get("imageryId").getAsInt()
                                    : getFirstPublicImageryId());
            pstmt.setString(6, jsonInputs.has("projectOptions")
                                    ? jsonInputs.get("projectOptions").getAsJsonObject().toString()
                                    : "{\"showGEEScript\":false, \"showPlotInformation\":false, \"autoLaunchGeoDash\":true}");
            pstmt.execute();

            if (jsonInputs.has("projectImageryList")) {
                // deletes and insert project images
                var pstmt2 = conn.prepareStatement("SELECT * FROM delete_project_imagery(?)");
                pstmt2.setInt(1, projectId);
                pstmt2.execute();
                insertProjectImagery(projectId, jsonInputs);
            }
            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    private static String loadCsvHeaders(String filename, List<String> mustInclude) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {

            final var colList = Arrays.stream(
                lines.findFirst().orElse("").split(","))
                    .map(col -> {
                        return col.toUpperCase();
                    })
                    .collect(Collectors.toList());

            // check if all required fields are in csv
            mustInclude.forEach(field -> {
                if (!colList.contains(field.toUpperCase())) {
                    throw new RuntimeException("Malformed plot CSV. Fields must be " + String.join(",", mustInclude));
                }
            });

            final var fields = colList.stream()
                    .map(col -> {
                        if (List.of("LON", "LAT", "LATITUDE", "LONGITUDE", "LONG", "CENTER_X", "CENTER_Y").contains(col.toUpperCase())) {
                            return col.toUpperCase() + " float";
                        } else if (List.of("PLOTID", "SAMPLEID").contains(col.toUpperCase())) {
                            return col.toUpperCase() + " integer";
                        }
                        return col.toUpperCase() + " text";
                    })
                    .collect(Collectors.joining(","));

            return fields;
        } catch (Exception e) {
            throw new RuntimeException("Error reading csv file", e);
        }
    }

    private static String[] loadCsvHeadersToRename(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {

            final var colList = lines.findFirst().orElse("").split(",");
            return new String[] {colList[0],colList[1]};

        } catch (Exception e) {
            throw new RuntimeException("Invalid headers");
        }
    }

    private static void deleteFile(String csvFile) {
        var csvFilePath = Paths.get(expandResourcePath("/csv"), csvFile);
        try {
            if (csvFilePath.toFile().exists()) {
                // System.out.println("Deleting file: " + csvFilePath);
                Files.delete(csvFilePath);
            } else {
                // System.out.println("No file found: " + csvFilePath);
            }
        } catch (Exception e) {
            System.out.println("Error deleting directory at: " + csvFilePath);
        }
    }

    private static void deleteFiles(int projectId) {
        deleteFile("project-" + projectId + "-plots.csv");
        deleteFile("project-" + projectId + "-samples.csv");
        deleteFile("project-" + projectId + "-plots.zip");
        deleteFile("project-" + projectId + "-samples.zip");
    }

    private static String loadExternalData(Connection conn, String distribution, Integer projectId, String extFile, String plotsOrSamples, List<String> mustInclude) {
        try {
            if (distribution.equals("csv")) {
                final var table_name = "project_" +  projectId + "_" + plotsOrSamples + "_csv";
                // add empty table to the database
                try (var pstmt = conn.prepareStatement("SELECT * FROM create_new_table(?,?)")) {
                    pstmt.setString(1, table_name);
                    pstmt.setString(2, loadCsvHeaders(extFile, mustInclude));
                    pstmt.execute();
                }
                // import csv file
                runBashScriptForProject(projectId, plotsOrSamples, "csv2postgres.sh", "/csv");
                var renameFrom = loadCsvHeadersToRename(extFile);
                // rename columns
                try (var pstmt = conn.prepareStatement("SELECT * FROM rename_col(?,?,?)")) {
                    pstmt.setString(1,table_name);
                    pstmt.setString(2,renameFrom[0]);
                    pstmt.setString(3,"lon");
                    pstmt.execute();
                }
                try (var pstmt = conn.prepareStatement("SELECT * FROM rename_col(?,?,?)")) {
                    pstmt.setString(1,table_name);
                    pstmt.setString(2,renameFrom[1]);
                    pstmt.setString(3,"lat");
                    pstmt.execute();
                }
                // add index for reference
                try (var pstmt = conn.prepareStatement("SELECT * FROM add_index_col(?)")) {
                    pstmt.setString(1,table_name);
                    pstmt.execute();
                }

                return table_name;

            } else if (distribution.equals("shp")) {
                runBashScriptForProject(projectId, plotsOrSamples, "shp2postgres.sh", "/shp");
                return "project_" +  projectId + "_" + plotsOrSamples + "_shp";
            } else {
                return "";
            }
        } catch (SQLException s) {
            System.out.println(s.getMessage());
            throw new RuntimeException("Error importing file into SQL");
        }
    }

    private static String checkLoadPlots(Connection conn, String plotDistribution, Integer projectId, String plotsFile) {
        try {
            // check if data is also correct after being loaded
            final var plots_table = loadExternalData(conn, plotDistribution, projectId, plotsFile, "plots", List.of("plotId"));
            try (var pstmt = conn.prepareStatement("SELECT * FROM select_partial_table_by_name(?)")) {
                pstmt.setString(1, plots_table);
                pstmt.execute();
            } catch (SQLException s) {
                System.out.println(s.getMessage());
                throw new RuntimeException("Plot file failed to load.\n" + s);
            }
            return plots_table;
        } catch (Exception e) {
            if (plotDistribution.equals("csv")) {
                throw new RuntimeException("Malformed plot CSV. Fields must be LON,LAT,PLOTID.\n" + e);
            } else {
                throw new RuntimeException("Malformed plot Shapefile. All features must be of type polygon and include a PLOTID field.\n" + e);
            }
        }
    }

    private static String checkLoadSamples(Connection conn, String sampleDistribution, Integer projectId, String samplesFile) {
        try {
            final var samples_table = loadExternalData(conn, sampleDistribution, projectId, samplesFile, "samples", List.of("plotId", "sampleId"));
            if (List.of("csv", "shp").contains(sampleDistribution)) {
                // check if data is also correct after being loaded
                try (var pstmt = conn.prepareStatement("SELECT * FROM select_partial_sample_table_by_name(?)")) {
                    pstmt.setString(1,samples_table);
                    pstmt.execute();
                } catch (SQLException s) {
                    throw new RuntimeException("Sample file failed to load.");
                }
                return samples_table;
            } else {
                return null;
            }
        } catch (Exception e) {
            if (sampleDistribution.equals("csv")) {
                throw new RuntimeException("Malformed sample CSV. Fields must be LON,LAT,PLOTID,SAMPLEID.", e);
            } else {
                throw new RuntimeException("Malformed sample Shapefile. All features must be of type polygon and include PLOTID and SAMPLEID fields.", e);
            }
        }
    }

    private static void createProjectPlots(JsonObject newProject) {
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
        var plotsFile =          getOrEmptyString(newProject, "plotsFile").getAsString();
        var samplesFile =        getOrEmptyString(newProject, "samplesFile").getAsString();

        try (var conn = connect()) {
            if (List.of("csv", "shp").contains(plotDistribution)) {
                // load files into the database (loadPlot, loadSamples) and update projects
                try (var pstmt =
                    conn.prepareStatement("SELECT * FROM update_project_tables(?,?::text,?::text)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setString(2, checkLoadPlots(conn, plotDistribution, projectId, plotsFile));
                    pstmt.setString(3, checkLoadSamples(conn, sampleDistribution, projectId, samplesFile));
                    pstmt.execute();
                } catch (SQLException e) {
                    throw new RuntimeException("Error updating project table.", e);
                }
                try (var pstmt =
                    conn.prepareStatement("SELECT * FROM cleanup_project_tables(?,?)")) {
                    pstmt.setInt(1, projectId);
                    pstmt.setDouble(2, plotSize);
                    pstmt.execute();
                } catch (SQLException e) {
                    throw new RuntimeException("Error cleaning external tables.", e);
                }

                var extPlotCount = 0;
                var extSampleCount = 0;
                try (var pstmt =
                    conn.prepareStatement("SELECT * FROM ext_table_count(?)")) {
                    pstmt.setInt(1, projectId);
                    try(var rs = pstmt.executeQuery()) {
                        if (rs.next()) {
                            extPlotCount = rs.getInt("plot_count");
                            extSampleCount = rs.getInt("sample_count");
                        }
                    }
                } catch (SQLException e) {
                    throw new RuntimeException("Error counting data.", e);
                }

                if (extPlotCount == 0) {throw new RuntimeException("Plot file is empty.");}

                var computedSamplesPerPlot =
                    sampleDistribution.equals("gridded") ? countGriddedSampleSet(plotSize, sampleResolution)
                    : sampleDistribution.equals("random") ? samplesPerPlot
                    : sampleDistribution.equals("center") ? 1
                    : (extSampleCount / extPlotCount);

                checkPlotLimits(extPlotCount, 50000, computedSamplesPerPlot, 200, 350000);

                // if both are files, adding plots and samples is done inside PG
                if (List.of("csv", "shp").contains(sampleDistribution)) {
                    try (var pstmt =
                        conn.prepareStatement("SELECT * FROM samples_from_plots_with_files(?)")) {
                        pstmt.setInt(1, projectId);
                        pstmt.execute();
                    } catch (SQLException e) {
                        throw new RuntimeException("Error merging both files.\n" + e);
                    }
                // Add plots from file and use returned plot ID to create samples
                } else {
                    try (var pstmt =
                        conn.prepareStatement("SELECT * FROM add_file_plots(?)")) {
                        pstmt.setInt(1,projectId);
                        try (var rs = pstmt.executeQuery()) {
                            while (rs.next()) {
                                var plotCenter = new Double[] {rs.getDouble("lon"), rs.getDouble("lat")};
                                createProjectSamples(conn, rs.getInt("plot_uid"), sampleDistribution,
                                    plotCenter, plotShape, plotSize, samplesPerPlot, sampleResolution, plotDistribution.equals("shp"));
                            }
                        }
                    } catch (SQLException e) {
                        throw new RuntimeException("Error adding plot file.", e);
                    }
                }
            } else {
                // Convert the lat/lon boundary coordinates to Web Mercator (units: meters) and apply an interior buffer of plotSize / 2
                final var bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
                final var paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], plotSize / 2.0);
                final var left = paddedBounds[0];
                final var bottom = paddedBounds[1];
                final var right = paddedBounds[2];
                final var top = paddedBounds[3];

                var totalPlots =
                    plotDistribution.equals("gridded")
                        ? countGriddedPoints(left, bottom, right, top, plotSpacing)
                        : numPlots;

                if (totalPlots == 0) {throw new RuntimeException("You cannot create a project with 0 plots.");}

                var plotsPerSample =
                    sampleDistribution.equals("gridded") ? countGriddedSampleSet(plotSize, sampleResolution)
                        : sampleDistribution.equals("center") ? 1
                        : samplesPerPlot;

                checkPlotLimits(totalPlots, 5000, plotsPerSample, 200, 50000);

                // Generate the plot objects and their associated sample points
                final var newPlotCenters =
                    plotDistribution.equals("random")
                    ? createRandomPointsInBounds(left, bottom, right, top, numPlots)
                    : createGriddedPointsInBounds(left, bottom, right, top, plotSpacing);

                Arrays.stream(newPlotCenters)
                .forEach(plotCenter -> {
                        final var SqlPlots = "SELECT * FROM create_project_plot(?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))";
                        try (var pstmtPlots = conn.prepareStatement(SqlPlots)) {
                        pstmtPlots.setInt(1, projectId);
                        pstmtPlots.setString(2, makeGeoJsonPoint(plotCenter[0], plotCenter[1]).toString());
                        try (var rsPlots = pstmtPlots.executeQuery()) {
                            if (rsPlots.next()) {
                                final var newPlotId = rsPlots.getInt("create_project_plot");
                                createProjectSamples(conn, newPlotId, sampleDistribution,
                                    plotCenter, plotShape, plotSize, samplesPerPlot, sampleResolution, false);
                            }
                        }
                    } catch (SQLException e) {
                        System.out.println(e.getMessage());
                    }
                });
            }

            // Check if project boundary is valid.
            try (var pstmt = conn.prepareStatement("SELECT * FROM valid_boundary((SELECT boundary FROM projects WHERE project_uid = ?))")) {
                pstmt.setInt(1, projectId);
                try (var rs = pstmt.executeQuery()) {
                    if (rs.next() && !rs.getBoolean("valid_boundary")) {
                        throw new RuntimeException("The project boundary is invalid. This can come from improper coordinates or projection when uploading shape or csv data.");
                    }
                }
            }

            //Check if all plots have a sample
            try (var pstmt = conn.prepareStatement("SELECT * FROM plots_missing_samples(?)")) {
                pstmt.setInt(1, projectId);
                try (var rs = pstmt.executeQuery()) {
                    var idList = new ArrayList<String>();
                    while (rs.next()) {
                        idList.add(rs.getString("plot_id"));
                    }
                    if (idList.size() > 0) {
                        var topTen = "[" + String.join(",", idList.subList(0, Math.min(idList.size(), 10))) + "]";
                        throw new RuntimeException("The uploaded plot and sample files do not have correctly overlapping data. "
                                                   + idList.size()
                                                   + " plots have no samples. The first 10 are: "
                                                   + topTen);
                    }
                }
            }

            // Update numPlots and samplesPerPlot to match the numbers that were generated
            try (var pstmt = conn.prepareStatement("SELECT * FROM update_project_counts(?)")) {
                pstmt.setInt(1, projectId);
                pstmt.execute();
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
    }

    private static void createProjectSamples(Connection conn, Integer newPlotId, String sampleDistribution, Double[] plotCenter, String plotShape, Double plotSize, Integer samplesPerPlot, Double sampleResolution, Boolean isShp) {

        var newSamplePoints =
        isShp || !List.of("random", "gridded", "center").contains(sampleDistribution)
        ? new Double[][]{plotCenter}
        : sampleDistribution.equals("random")
            ? createRandomSampleSet(plotCenter, plotShape, plotSize, samplesPerPlot)
            : createGriddedSampleSet(plotCenter, plotShape, plotSize, sampleResolution);

        Arrays.stream(newSamplePoints)
            .forEach(sampleEntry -> {
                var SqlSamples = "SELECT * FROM create_project_plot_sample(?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))";

                var sampleCenter = sampleEntry;

                try (var pstmtSamples = conn.prepareStatement(SqlSamples)) {
                    pstmtSamples.setInt(1, newPlotId);
                    pstmtSamples.setString(2, makeGeoJsonPoint(sampleCenter[0], sampleCenter[1]).toString());
                    pstmtSamples.execute();
                } catch (SQLException e) {
                    System.out.println(e.getMessage());
                }
            });
    }

    public String createProject(Request req, Response res) {
        var newProjectId = 0;
        try {
            final var jsonInputs = parseJson(req.body()).getAsJsonObject();

            var newProject = new JsonObject();

            newProject.addProperty("description",        getOrEmptyString(jsonInputs, "description").getAsString());
            newProject.addProperty("institution",        getOrZero(jsonInputs, "institutionId").getAsInt());
            newProject.addProperty("imageryId",          jsonInputs.has("imageryId")
                                                                    ? jsonInputs.get("imageryId").getAsInt()
                                                                    : getFirstPublicImageryId());
            newProject.addProperty("lonMin",             getOrZero(jsonInputs, "lonMin").getAsDouble());
            newProject.addProperty("latMin",             getOrZero(jsonInputs, "latMin").getAsDouble());
            newProject.addProperty("lonMax",             getOrZero(jsonInputs, "lonMax").getAsDouble());
            newProject.addProperty("latMax",             getOrZero(jsonInputs, "latMax").getAsDouble());
            newProject.addProperty("name",               getOrEmptyString(jsonInputs, "name").getAsString());
            newProject.addProperty("numPlots",           getOrZero(jsonInputs, "numPlots").getAsInt());
            newProject.addProperty("plotDistribution",   getOrEmptyString(jsonInputs, "plotDistribution").getAsString());
            newProject.addProperty("plotShape",          getOrEmptyString(jsonInputs, "plotShape").getAsString());
            newProject.addProperty("plotSize",           getOrZero(jsonInputs, "plotSize").getAsDouble());
            newProject.addProperty("plotSpacing",        getOrZero(jsonInputs, "plotSpacing").getAsDouble());
            newProject.addProperty("privacyLevel",       getOrEmptyString(jsonInputs, "privacyLevel").getAsString());
            newProject.addProperty("projectTemplate",    getOrZero(jsonInputs, "projectTemplate").getAsInt());
            newProject.addProperty("sampleDistribution", getOrEmptyString(jsonInputs, "sampleDistribution").getAsString());
            newProject.addProperty("samplesPerPlot",     getOrZero(jsonInputs, "samplesPerPlot").getAsInt());
            newProject.addProperty("sampleResolution",   getOrZero(jsonInputs, "sampleResolution").getAsDouble());
            newProject.add("sampleValues",               jsonInputs.get("sampleValues").getAsJsonArray());
            newProject.add("surveyRules",                jsonInputs.get("surveyRules").getAsJsonArray());
            newProject.addProperty("useTemplatePlots",   getOrFalse(jsonInputs, "useTemplatePlots").getAsBoolean());
            newProject.addProperty("useTemplateWidgets", getOrFalse(jsonInputs, "useTemplateWidgets").getAsBoolean());
            newProject.add("projectOptions",             jsonInputs.has("projectOptions")
                    ? jsonInputs.get("projectOptions").getAsJsonObject()
                    : parseJson("{\"showGEEScript\":false, \"showPlotInformation\":false, \"autoLaunchGeoDash\":true}").getAsJsonObject());

            // file part properties
            newProject.addProperty("plotFileName",       getOrEmptyString(jsonInputs, "plotFileName").getAsString());
            newProject.addProperty("plotFileBase64",     getOrEmptyString(jsonInputs, "plotFileBase64").getAsString());
            newProject.addProperty("sampleFileName",     getOrEmptyString(jsonInputs, "sampleFileName").getAsString());
            newProject.addProperty("sampleFileBase64",   getOrEmptyString(jsonInputs, "sampleFileBase64").getAsString());

            // Add constant values
            newProject.addProperty("availability", "unpublished");
            newProject.addProperty("createdDate",         LocalDate.now().toString());

            final var lonMin = getOrZero(newProject,      "lonMin").getAsDouble();
            final var latMin = getOrZero(newProject,      "latMin").getAsDouble();
            final var lonMax = getOrZero(newProject,      "lonMax").getAsDouble();
            final var latMax = getOrZero(newProject,      "latMax").getAsDouble();
            newProject.addProperty("boundary",            makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());

            final var tokenKey = UUID.randomUUID().toString();

            var SQL = "SELECT * FROM create_project(?,?,?,?,?,?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),?,?,?,?,?,?,?,?,?::JSONB,?::JSONB,?::date,?::JSONB,?,?::JSONB)";
            try (var conn = connect();
                 var pstmt = conn.prepareStatement(SQL)) {

                pstmt.setInt(1,     newProject.get("institution").getAsInt());
                pstmt.setInt(2,     newProject.get("imageryId").getAsInt());
                pstmt.setString(3,  newProject.get("availability").getAsString());
                pstmt.setString(4,  newProject.get("name").getAsString());
                pstmt.setString(5,  newProject.get("description").getAsString());
                pstmt.setString(6,  newProject.get("privacyLevel").getAsString());
                pstmt.setString(7,  newProject.get("boundary").getAsString());
                pstmt.setString(8,  newProject.get("plotDistribution").getAsString());
                pstmt.setInt(9,     newProject.get("numPlots").getAsInt());
                pstmt.setDouble(10, newProject.get("plotSpacing").getAsDouble());
                pstmt.setString(11, newProject.get("plotShape").getAsString());
                pstmt.setDouble(12, newProject.get("plotSize").getAsDouble());
                pstmt.setString(13, newProject.get("sampleDistribution").getAsString());
                pstmt.setInt(14,    newProject.get("samplesPerPlot").getAsInt());
                pstmt.setDouble(15, newProject.get("sampleResolution").getAsDouble());
                pstmt.setString(16, newProject.get("sampleValues").getAsJsonArray().toString());
                pstmt.setString(17, newProject.get("surveyRules").getAsJsonArray().toString());
                pstmt.setString(18, newProject.get("createdDate").getAsString());
                pstmt.setString(19, null);  // classification times
                pstmt.setString(20, tokenKey);  // token key
                pstmt.setString(21, newProject.get("projectOptions").getAsJsonObject().toString());
                try (var rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        newProjectId = rs.getInt("create_project");
                        newProject.addProperty("id", newProjectId);

                        if (jsonInputs.has("projectImageryList")) {
                            // insert project images
                            insertProjectImagery(newProject.get("id").getAsInt(), jsonInputs);
                        } else {
                            try (var pstmt_imagery = conn.prepareStatement("SELECT * FROM add_all_institution_imagery(?)")) {

                                pstmt_imagery.setInt(1, newProjectId);
                                pstmt_imagery.execute();
                            }
                        }

                        if (newProject.get("projectTemplate").getAsInt() > 0
                                && newProject.get("useTemplateWidgets").getAsBoolean()) {
                            // Copy existing widgets
                            try (var pstmt1 = conn.prepareStatement("SELECT * FROM get_project_widgets_by_project_id(?)")) {
                                pstmt1.setInt(1, newProject.get("projectTemplate").getAsInt());
                                try (var rs1 = pstmt1.executeQuery()) {
                                    var newUUID = UUID.randomUUID();
                                    while (rs1.next()) {
                                        try (var preparedStatement = conn.prepareStatement("SELECT * FROM add_project_widget(?, ?, ?::JSONB)")) {
                                            preparedStatement.setInt(1, newProjectId);
                                            preparedStatement.setObject(2, newUUID);
                                            preparedStatement.setString(3, rs1.getString("widget"));
                                            preparedStatement.execute();
                                        }
                                    }
                                }
                            }
                        }

                        if (newProject.get("projectTemplate").getAsInt() > 0
                            && newProject.get("useTemplatePlots").getAsBoolean()) {
                                // Copy existing plots
                            try (var copyPstmt = conn.prepareStatement("SELECT * FROM copy_template_plots(?,?)")) {
                                copyPstmt.setInt(1, newProject.get("projectTemplate").getAsInt());
                                copyPstmt.setInt(2, newProjectId);
                                copyPstmt.execute();
                            }
                        } else {

                            if (List.of("csv", "shp").contains(newProject.get("plotDistribution").getAsString())) {
                                newProject.addProperty("plotsFile", writeFilePartBase64(
                                    newProject.get("plotFileName").getAsString(),
                                    newProject.get("plotFileBase64").getAsString(),
                                    expandResourcePath("/" + newProject.get("plotDistribution").getAsString()),
                                    "project-" + newProjectId + "-plots"
                                ));
                            }

                            if (List.of("csv", "shp").contains(newProject.get("sampleDistribution").getAsString())) {
                                newProject.addProperty("samplesFile", writeFilePartBase64(
                                    newProject.get("sampleFileName").getAsString(),
                                    newProject.get("sampleFileBase64").getAsString(),
                                    expandResourcePath("/" + newProject.get("sampleDistribution").getAsString()),
                                    "project-" + newProjectId + "-samples"
                                ));
                            }

                            createProjectPlots(newProject);

                            deleteFiles(newProjectId);
                            deleteShapeFileDirectories(newProjectId);
                        }
                    }
                    // Indicate that the project was created successfully
                    var jo = new JsonObject();
                    jo.addProperty("projectId", Integer.toString(newProjectId));
                    jo.addProperty("tokenKey", tokenKey);
                    return jo.toString();
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                // Indicate that an error occurred with project creation
                throw new RuntimeException(e);
            }
        }
        catch (Exception e) {
            // Indicate that an error occurred with project creation
            deleteFiles(newProjectId);
            deleteShapeFileDirectories(newProjectId);
            try (var conn = connect()) {
                try (var pstmt = conn.prepareStatement("SELECT delete_project(?)")) {
                    pstmt.setInt(1, newProjectId);
                    pstmt.execute();
                }
            } catch (SQLException sql) {
            }
            // StringWriter outError = new StringWriter();
            // e.printStackTrace(new PrintWriter(outError));
            // System.out.println(outError.toString());
            System.out.println("Error creating project: " + e.getMessage());
            var jo = new JsonObject();
            jo.addProperty("errorMessage", e.getMessage());
            return jo.toString();
        }
    }

}
