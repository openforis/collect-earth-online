package org.openforis.ceo.postgres;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
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
import static org.openforis.ceo.Views.redirectAuth;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import java.io.StringWriter;
import java.io.PrintWriter;
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
import javax.servlet.http.HttpServletResponse;
import org.openforis.ceo.db_api.Projects;
import spark.Request;
import spark.Response;



public class PostgresProjects implements Projects {

    private Request redirectCommon(Request req, Response res, String queryFn) {
        final var userId = Integer.parseInt(req.session().attributes().contains("userid") ? req.session().attribute("userid").toString() : "0");
        final var pProjectId = req.params(":id");
        final var qProjectId = req.queryParams("pid");

        final var projectId = pProjectId != null
            ? Integer.parseInt(pProjectId)
            : qProjectId != null
                ? Integer.parseInt(qProjectId)
                : 0;

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM " + queryFn + "(?, ?)")) {

            pstmt.setInt(1, userId);
            pstmt.setInt(2, projectId);

            try(var rs = pstmt.executeQuery()) {
                redirectAuth(req, res, rs.next() && rs.getBoolean(queryFn), userId);
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return req;
    }

    public Request redirectNoCollect(Request req, Response res) {
        return redirectCommon(req, res, "can_user_collect");
    }

    public Request redirectNoEdit(Request req, Response res) {
        return redirectCommon(req, res, "can_user_edit");
    }

    private static JsonObject buildProjectJson(ResultSet rs) {
        var newProject = new JsonObject();
        try {
            newProject.addProperty("id",                   rs.getInt("project_id"));
            newProject.addProperty("institution",          rs.getInt("institution_id"));
            newProject.addProperty("availability",         rs.getString("availability"));
            newProject.addProperty("name",                 rs.getString("name"));
            newProject.addProperty("description",          rs.getString("description"));
            newProject.addProperty("privacyLevel",         rs.getString("privacy_level"));
            newProject.addProperty("boundary",             rs.getString("boundary"));
            newProject.addProperty("baseMapSource",        rs.getString("base_map_source"));
            newProject.addProperty("plotDistribution",     rs.getString("plot_distribution"));
            newProject.addProperty("numPlots",             rs.getInt("num_plots"));
            newProject.addProperty("plotSpacing",          rs.getDouble("plot_spacing"));
            newProject.addProperty("plotShape",            rs.getString("plot_shape"));
            newProject.addProperty("plotSize",             rs.getDouble("plot_size"));
            newProject.addProperty("archived",             rs.getString("availability").equals("archived"));
            newProject.addProperty("sampleDistribution",   rs.getString("sample_distribution"));
            newProject.addProperty("samplesPerPlot",       rs.getInt("samples_per_plot"));
            newProject.addProperty("sampleResolution",     rs.getDouble("sample_resolution"));
            newProject.addProperty("classification_times", "");
            newProject.addProperty("editable",             rs.getBoolean("editable"));
            newProject.addProperty("validBoundary",        rs.getBoolean("valid_boundary"));
            newProject.add("sampleValues", parseJson(rs.getString("survey_questions")).getAsJsonArray());
            newProject.add("surveyRules",  parseJson(rs.getString("survey_rules")).getAsJsonArray());
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return newProject;
    }

    private static String queryProjectGet(PreparedStatement pstmt) {
        var allProjects = new JsonArray();
            try (var rs = pstmt.executeQuery()) {
                while (rs.next()) {

                    allProjects.add(buildProjectJson(rs));
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                return "[]";
            }
            return allProjects.toString();
    }

    public String getAllProjects(Request req, Response res) {
        var userId =            req.queryParams("userId");
        var institutionId =     req.queryParams("institutionId");

        try (var conn = connect()) {

            if (userId == null || userId.isEmpty()) {
                if (institutionId == null || institutionId.isEmpty()) {
                    try (var pstmt = conn.prepareStatement("SELECT * FROM select_all_projects()")) {
                        return queryProjectGet(pstmt);
                    }
                } else {
                    try (var pstmt = conn.prepareStatement("SELECT * FROM select_all_institution_projects(?)")) {
                        pstmt.setInt(1, Integer.parseInt(institutionId));
                        return queryProjectGet(pstmt);
                    }
                }
            } else {
                if (institutionId == null || institutionId.isEmpty()) {
                    try (var pstmt = conn.prepareStatement("SELECT * FROM select_all_user_projects(?)")) {
                        pstmt.setInt(1, Integer.parseInt(userId));
                        return queryProjectGet(pstmt);
                    }
                } else {
                    try (var pstmt = conn.prepareStatement("SELECT * FROM select_institution_projects_with_roles(?,?)")) {
                        pstmt.setInt(1, Integer.parseInt(userId));
                        pstmt.setInt(2, Integer.parseInt(institutionId));
                        return queryProjectGet(pstmt);
                    }
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "[]";
        }
    }

    private static String projectById(Integer projectId) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project(?)")) {

            pstmt.setInt(1, projectId);
            try (var rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return buildProjectJson(rs).toString();
                } else {
                    return "";
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getProjectById(Request req, Response res) {
        var projectId = req.params(":id");

        return projectById(Integer.parseInt(projectId));

    }

    public String getProjectStats(Request req, Response res) {
        var projectId = req.params(":id");
        var stats = new JsonObject();
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project_statistics(?)")) {

            pstmt.setInt(1,Integer.parseInt(projectId));
            try (var rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    stats.addProperty("flaggedPlots",rs.getInt("flagged_plots"));
                    stats.addProperty("analyzedPlots",rs.getInt("assigned_plots"));
                    stats.addProperty("unanalyzedPlots",rs.getInt("unassigned_plots"));
                    stats.addProperty("members",rs.getInt("members"));
                    stats.addProperty("contributors",rs.getInt("contributors"));
                    stats.addProperty("createdDate",rs.getString("created_date"));
                    stats.addProperty("publishedDate",rs.getString("published_date"));
                    stats.addProperty("closedDate",rs.getString("closed_date"));
                    stats.addProperty("archivedDate",rs.getString("archived_date"));
                    stats.add("userStats",parseJson(rs.getString("user_stats")).getAsJsonArray());
                }
            }
            return  stats.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    private static String valueOrBlank(String input) {
        return input == null || input.equals("null") ? "" : input;
    }

    private static ArrayList<String> getPlotHeaders(Connection conn, Integer projectId) {
        var plotHeaders  = new ArrayList<String>();
        try (var pstmt = conn.prepareStatement("SELECT * FROM get_plot_headers(?)")) {
            pstmt.setInt(1, projectId);
            try (var rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    if (!List.of("GID", "GEOM", "PLOT_GEOM", "LAT", "LON").contains(rs.getString("column_names").toUpperCase())) {
                        plotHeaders.add(rs.getString("column_names"));
                    }
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return plotHeaders;
    }

    private static ArrayList<String> getSampleHeaders(Connection conn, Integer projectId) {
        var sampleHeaders = new ArrayList<String>();
        try (var pstmt = conn.prepareStatement("SELECT * FROM get_sample_headers(?)")) {
            pstmt.setInt(1, projectId);
            try (var rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    if (!List.of("GID", "GEOM", "LAT", "LON", "SAMPLE_GEOM").contains(rs.getString("column_names").toUpperCase())) {
                        sampleHeaders.add(rs.getString("column_names"));
                    }
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return sampleHeaders;
    }

    public HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
        var projectId = Integer.parseInt(req.params(":id"));

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project(?)")) {
            // check if project exists
            pstmt.setInt(1,projectId);
            try (var rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    var plotSummaries = new JsonArray();
                    final var sampleValueGroups = parseJson(rs.getString("survey_questions")).getAsJsonArray();
                    final var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();
                    var plotHeaders = getPlotHeaders(conn, projectId);

                    try (var pstmtDump = conn.prepareStatement("SELECT * FROM dump_project_plot_data(?)")) {
                        pstmtDump.setInt(1, projectId);

                        try (var rsDump = pstmtDump.executeQuery()) {

                            while (rsDump.next()) {
                                var plotSummary = new JsonObject();
                                plotSummary.addProperty("plot_id", rsDump.getString("plot_id"));
                                plotSummary.addProperty("center_lon", rsDump.getString("lon"));
                                plotSummary.addProperty("center_lat", rsDump.getString("lat"));
                                plotSummary.addProperty("size_m", rsDump.getDouble("plot_size"));
                                plotSummary.addProperty("shape", rsDump.getString("plot_shape"));
                                plotSummary.addProperty("flagged", rsDump.getInt("flagged") > 0);
                                plotSummary.addProperty("analyses", rsDump.getInt("assigned"));
                                var samples = parseJson(rsDump.getString("samples")).getAsJsonArray();
                                plotSummary.addProperty("sample_points", samples.size());
                                plotSummary.addProperty("user_id", valueOrBlank(rsDump.getString("email")));
                                plotSummary.addProperty("analysis_duration", valueOrBlank(rsDump.getString("analysis_duration")));
                                plotSummary.addProperty("collection_time", valueOrBlank(rsDump.getString("collection_time")));
                                plotSummary.add("distribution",
                                        getValueDistribution(samples, getSampleValueTranslations(sampleValueGroups)));

                                if (valueOrBlank(rsDump.getString("ext_plot_data")) != "") {
                                    var ext_plot_data = parseJson(rsDump.getString("ext_plot_data")).getAsJsonObject();

                                    plotHeaders.forEach(head ->
                                        plotSummary.addProperty("pl_" + head, getOrEmptyString(ext_plot_data, head).getAsString())
                                    );
                                }

                                plotSummaries.add(plotSummary);
                            }
                        }
                        var combinedHeaders = plotHeaders.stream()
                            .map(head -> !head.toString().contains("pl_") ? "pl_" + head : head)
                            .toArray(String[]::new);

                        return outputAggregateCsv(res, sampleValueGroups, plotSummaries, projectName, combinedHeaders);
                    }
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return res.raw();
        }
        res.raw().setStatus(SC_NO_CONTENT);
        return res.raw();
    }

    public HttpServletResponse dumpProjectRawData(Request req, Response res) {
        var projectId =Integer.parseInt( req.params(":id"));

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project(?)")) {
            // check if project exists
            pstmt.setInt(1,projectId);
            try (var rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    var sampleSummaries = new JsonArray();
                    final var sampleValueGroups = parseJson(rs.getString("survey_questions")).getAsJsonArray();
                    final var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();
                    final var plotHeaders = getPlotHeaders(conn, projectId);
                    final var sampleHeaders = getSampleHeaders(conn, projectId);
                    var optionalHeaders = new ArrayList<String>();

                    try (var pstmtDump = conn.prepareStatement("SELECT * FROM dump_project_sample_data(?)")) {
                        pstmtDump.setInt(1, projectId);

                        try (var rsDump = pstmtDump.executeQuery()) {
                            while (rsDump.next()) {
                                var plotSummary = new JsonObject();
                                plotSummary.addProperty("plot_id", rsDump.getString("plot_id"));
                                plotSummary.addProperty("sample_id", rsDump.getString("sample_id"));
                                plotSummary.addProperty("lon", rsDump.getString("lon"));
                                plotSummary.addProperty("lat", rsDump.getString("lat"));
                                plotSummary.addProperty("flagged", rsDump.getInt("flagged") > 0);
                                plotSummary.addProperty("analyses", rsDump.getInt("assigned"));
                                plotSummary.addProperty("user_id", valueOrBlank(rsDump.getString("email")));
                                if (rsDump.getString("value") != null && parseJson(rsDump.getString("value")).isJsonPrimitive()) {
                                    plotSummary.addProperty("value", rsDump.getString("value"));
                                } else {
                                    plotSummary.add("value", rsDump.getString("value") == null ? null : parseJson(rsDump.getString("value")).getAsJsonObject());
                                }
                                if (!valueOrBlank(rsDump.getString("collection_time")).equals("")) {
                                    plotSummary.addProperty("collection_time", valueOrBlank(rsDump.getString("collection_time")));
                                    if (!optionalHeaders.contains("collection_time")) optionalHeaders.add("collection_time");
                                }
                                if (!valueOrBlank(rsDump.getString("analysis_duration")).equals("")) {
                                    plotSummary.addProperty("analysis_duration", valueOrBlank(rsDump.getString("analysis_duration")));
                                    if (!optionalHeaders.contains("analysis_duration")) optionalHeaders.add("analysis_duration");
                                }

                                if (valueOrBlank(rsDump.getString("imagery_title")) != "") {
                                    plotSummary.addProperty("imagery_title", rsDump.getString("imagery_title"));
                                    if (!optionalHeaders.contains("imagery_title")) optionalHeaders.add("imagery_title");

                                    if (valueOrBlank(rsDump.getString("imagery_attributes")).length() > 2) {
                                        var attributes = parseJson(rsDump.getString("imagery_attributes")).getAsJsonObject();
                                        attributes.keySet().forEach(key -> {
                                            plotSummary.addProperty(key, attributes.get(key).getAsString());
                                            if (!optionalHeaders.contains(key)) optionalHeaders.add(key);
                                        });
                                    }
                                }

                                if (valueOrBlank(rsDump.getString("ext_plot_data")) != "") {
                                    var ext_plot_data = parseJson(rsDump.getString("ext_plot_data")).getAsJsonObject();
                                    plotHeaders.forEach(head ->
                                        plotSummary.addProperty("pl_" + head, getOrEmptyString(ext_plot_data, head).getAsString())
                                    );
                                }

                                if (valueOrBlank(rsDump.getString("ext_sample_data")) != "") {
                                    var ext_sample_data = parseJson(rsDump.getString("ext_sample_data")).getAsJsonObject();
                                    sampleHeaders.forEach(head ->
                                        plotSummary.addProperty("smpl_" + head, getOrEmptyString(ext_sample_data, head).getAsString())
                                    );
                                }
                                sampleSummaries.add(plotSummary);
                            }
                        }
                        var combinedHeaders =
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
                    }
            }
        }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return res.raw();
        }
        res.raw().setStatus(SC_NO_CONTENT);
        return res.raw();
    }

    public String publishProject(Request req, Response res) {
        var projectId = req.params(":id");
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM publish_project(?)")) {

            pstmt.setInt(1,Integer.parseInt(projectId));
            try (var rs = pstmt.executeQuery()) {
                var idReturn = 0;
                if (rs.next()) {
                    idReturn = rs.getInt("publish_project");
                }
                return projectById(idReturn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String closeProject(Request req, Response res) {
        var projectId = req.params(":id");
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM close_project(?)")) {

            pstmt.setInt(1,Integer.parseInt(projectId));
            try (var rs = pstmt.executeQuery()) {
                var idReturn = 0;
                if (rs.next()) {
                    idReturn = rs.getInt("close_project");
                }
                return projectById(idReturn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String archiveProject(Request req, Response res) {
        var projectId = req.params(":id");
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM archive_project(?)") ;) {

            pstmt.setInt(1,Integer.parseInt(projectId));
            try (var rs = pstmt.executeQuery()) {
                var idReturn = 0;
                if (rs.next()) {
                    idReturn = rs.getInt("archive_project");
                }
                return projectById(idReturn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String updateProject(Request req, Response res) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM update_project(?,?,?,?,?)")) {

            final var jsonInputs = parseJson(req.body()).getAsJsonObject();
            pstmt.setInt(1,    Integer.parseInt(req.params(":id")));
            pstmt.setString(2, getOrEmptyString(jsonInputs, "name").getAsString());
            pstmt.setString(3, getOrEmptyString(jsonInputs, "description").getAsString());
            pstmt.setString(4, getOrEmptyString(jsonInputs, "privacyLevel").getAsString());
            pstmt.setString(5, getOrEmptyString(jsonInputs, "baseMapSource").getAsString());
            pstmt.execute();
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
                throw new RuntimeException("Plot file failed to load.");
            }
            return plots_table;
        } catch (Exception e) {
            if (plotDistribution.equals("csv")) {
                throw new RuntimeException("Malformed plot CSV. Fields must be LON,LAT,PLOTID.", e);
            } else {
                throw new RuntimeException("Malformed plot Shapefile. All features must be of type polygon and include a PLOTID field.", e);
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
                    : (extSampleCount / extPlotCount);

                checkPlotLimits(extPlotCount, 50000, computedSamplesPerPlot, 200, 350000);

                // if both are files, adding plots and samples is done inside PG
                if (List.of("csv", "shp").contains(sampleDistribution)) {
                    try (var pstmt =
                        conn.prepareStatement("SELECT * FROM samples_from_plots_with_files(?)")) {
                        pstmt.setInt(1, projectId);
                        pstmt.execute();
                    } catch (SQLException e) {
                        throw new RuntimeException("Error merging both files.", e);
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
                    sampleDistribution.equals("gridded")
                        ? countGriddedSampleSet(plotSize, sampleResolution)
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
        isShp || !List.of("random", "gridded").contains(sampleDistribution)
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
                    pstmtSamples.setString(2,makeGeoJsonPoint(sampleCenter[0], sampleCenter[1]).toString());
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

            newProject.addProperty("baseMapSource",      getOrEmptyString(jsonInputs, "baseMapSource").getAsString());
            newProject.addProperty("description",        getOrEmptyString(jsonInputs, "description").getAsString());
            newProject.addProperty("institution",        getOrZero(jsonInputs, "institution").getAsInt());
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

            // file part properties
            newProject.addProperty("plotFileName",     getOrEmptyString(jsonInputs, "plotFileName").getAsString());
            newProject.addProperty("plotFileBase64",   getOrEmptyString(jsonInputs, "plotFileBase64").getAsString());
            newProject.addProperty("sampleFileName",   getOrEmptyString(jsonInputs, "sampleFileName").getAsString());
            newProject.addProperty("sampleFileBase64", getOrEmptyString(jsonInputs, "sampleFileBase64").getAsString());

            // Add constant values
            newProject.addProperty("availability", "unpublished");
            newProject.addProperty("createdDate", LocalDate.now().toString());

            final var lonMin = getOrZero(newProject, "lonMin").getAsDouble();
            final var latMin = getOrZero(newProject, "latMin").getAsDouble();
            final var lonMax = getOrZero(newProject, "lonMax").getAsDouble();
            final var latMax = getOrZero(newProject, "latMax").getAsDouble();
            newProject.addProperty("boundary", makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());

            var SQL = "SELECT * FROM create_project(?,?,?,?,?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),?,?,?,?,?,?,?,?,?,?::JSONB,?::JSONB,?::date,?::JSONB)";
            try (var conn = connect();
                 var pstmt = conn.prepareStatement(SQL)) {

                pstmt.setInt(1,     newProject.get("institution").getAsInt());
                pstmt.setString(2,  newProject.get("availability").getAsString());
                pstmt.setString(3,  newProject.get("name").getAsString());
                pstmt.setString(4,  newProject.get("description").getAsString());
                pstmt.setString(5,  newProject.get("privacyLevel").getAsString());
                pstmt.setString(6,  newProject.get("boundary").getAsString());
                pstmt.setString(7,  newProject.get("baseMapSource").getAsString());
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
                pstmt.setString(19, null);  //classification times

                try (var rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        newProjectId = rs.getInt("create_project");
                        newProject.addProperty("id", newProjectId);

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
                    return Integer.toString(newProjectId);
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
                try (var pstmt = conn.prepareStatement("SELECT delete_project(?,?)")) {
                    pstmt.setInt(1, newProjectId);
                    pstmt.setBoolean(2, true);
                    pstmt.execute();
                }
            } catch (SQLException sql) {
            }
            StringWriter outError = new StringWriter();
            e.printStackTrace(new PrintWriter(outError));
            System.out.println(outError.toString());
            return e.getMessage();
        }
    }

}
