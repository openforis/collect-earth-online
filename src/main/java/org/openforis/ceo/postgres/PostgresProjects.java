package org.openforis.ceo.postgres;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.partsToJsonObject;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;
import static org.openforis.ceo.utils.ProjectUtils.padBounds;
import static org.openforis.ceo.utils.ProjectUtils.reprojectBounds;
import static org.openforis.ceo.utils.ProjectUtils.createGriddedPointsInBounds;
import static org.openforis.ceo.utils.ProjectUtils.createGriddedSampleSet;
import static org.openforis.ceo.utils.ProjectUtils.createRandomPointsInBounds;
import static org.openforis.ceo.utils.ProjectUtils.createRandomSampleSet;
import static org.openforis.ceo.utils.ProjectUtils.outputAggregateCsv;
import static org.openforis.ceo.utils.ProjectUtils.outputRawCsv;
import static org.openforis.ceo.utils.ProjectUtils.getOrEmptyString;
import static org.openforis.ceo.utils.ProjectUtils.getOrZero;
import static org.openforis.ceo.utils.ProjectUtils.getValueDistribution;
import static org.openforis.ceo.utils.ProjectUtils.makeGeoJsonPoint;
import static org.openforis.ceo.utils.ProjectUtils.makeGeoJsonPolygon;
import static org.openforis.ceo.utils.ProjectUtils.getSampleValueTranslations;
import static org.openforis.ceo.utils.ProjectUtils.deleteShapeFileDirectories;
import static org.openforis.ceo.utils.ProjectUtils.runBashScriptForProject;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.PreparedStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.HttpServletResponse;
import org.openforis.ceo.db_api.Projects;
import spark.Request;
import spark.Response;



public class PostgresProjects implements Projects {

    private static JsonObject buildProjectJson(ResultSet rs) {
        var newProject = new JsonObject();
        try {
            newProject.addProperty("id",rs.getInt("id"));
            newProject.addProperty("institution",rs.getInt("institution_id"));
            newProject.addProperty("availability",rs.getString("availability"));
            newProject.addProperty("name",rs.getString("name"));
            newProject.addProperty("description",rs.getString("description"));
            newProject.addProperty("privacyLevel",rs.getString("privacy_level"));
            newProject.addProperty("boundary",rs.getString("boundary"));
            newProject.addProperty("baseMapSource",rs.getString("base_map_source"));
            newProject.addProperty("plotDistribution",rs.getString("plot_distribution"));
            newProject.addProperty("numPlots",rs.getInt("num_plots"));
            newProject.addProperty("plotSpacing",rs.getDouble("plot_spacing"));
            newProject.addProperty("plotShape",rs.getString("plot_shape"));
            newProject.addProperty("plotSize",rs.getDouble("plot_size"));
            newProject.addProperty("archived", rs.getString("availability").equals("archived"));
            newProject.addProperty("sampleDistribution",rs.getString("sample_distribution"));
            newProject.addProperty("samplesPerPlot",rs.getInt("samples_per_plot"));
            newProject.addProperty("sampleResolution",rs.getDouble("sample_resolution"));
            newProject.addProperty("classification_times","");
            newProject.add("sampleValues", parseJson(rs.getString("sample_survey")).getAsJsonArray());

            newProject.addProperty("editable", false);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return newProject;
    }

    private static String queryProjectGet(PreparedStatement pstmt) {
        var allProjects = new JsonArray();
            try(var rs = pstmt.executeQuery()){
                while(rs.next()) {

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
                    try(var pstmt = conn.prepareStatement("SELECT * FROM select_all_projects()")) {
                        return queryProjectGet(pstmt);
                    }
                } else {
                    try(var pstmt = conn.prepareStatement("SELECT * FROM select_all_institution_projects(?)")) {
                        pstmt.setInt(1, Integer.parseInt(institutionId));
                        return queryProjectGet(pstmt);
                    }
                }
            } else {
                if (institutionId == null || institutionId.isEmpty()) {
                    try(var pstmt = conn.prepareStatement("SELECT * FROM select_all_user_projects(?)")) {
                        pstmt.setInt(1, Integer.parseInt(userId));
                        return queryProjectGet(pstmt);
                    }
                } else {
                    try(var pstmt = conn.prepareStatement("SELECT * FROM select_institution_projects_with_roles(?,?)")) {
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
        var project = new JsonObject();
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project(?)")) {

            pstmt.setInt(1, projectId);
            try(var rs = pstmt.executeQuery()){
                if(rs.next()) {
                    return buildProjectJson(rs).toString();
                } else {
                    project.addProperty("id", 0);
                    project.addProperty("institution",0);
                    project.addProperty("availability", "nonexistent");
                    project.addProperty("name", "");
                    project.addProperty("description", "");
                    project.addProperty("privacyLevel", "public");
                    project.add("boundary", null);
                    project.add("baseMapSource", null);
                    project.addProperty("plotDistribution", "random");
                    project.add("numPlots", null);
                    project.add("plotSpacing", null);
                    project.addProperty("plotShape", "circle");
                    project.add("plotSize", null);
                    project.addProperty("sampleDistribution", "random");
                    project.add("samplesPerPlot", null);
                    project.add("sampleResolution", null);
                    project.addProperty("archived", false);
                    project.add("sampleValues", parseJson("[]").getAsJsonArray());

                    return project.toString();
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

    private static JsonObject buildPlotJson(ResultSet rs) {
        var singlePlot = new JsonObject();
        try {
            singlePlot.addProperty("id",rs.getInt("id"));
            singlePlot.addProperty("projectId",rs.getInt("project_id"));
            singlePlot.addProperty("center",rs.getString("center"));
            singlePlot.addProperty("flagged",rs.getInt("flagged") == 0 ? false : true);
            singlePlot.addProperty("analyses",rs.getInt("assigned"));
            singlePlot.addProperty("user",rs.getString("username"));
            singlePlot.addProperty("confidence",rs.getInt("confidence"));
            singlePlot.addProperty("collectionTime", rs.getString("collection_time"));
            singlePlot.addProperty("analysisDuration", rs.getString("analysis_duration"));
            singlePlot.addProperty("plotId",rs.getString("plotId"));
            singlePlot.addProperty("geom",rs.getString("geom"));
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return singlePlot;
    }

    public  String getProjectPlots(Request req, Response res) {
        var projectId =     req.params(":id");
        var maxPlots =      Integer.parseInt(req.params(":max"));
        
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project_plots(?,?)")) {

            var plots = new JsonArray();
            pstmt.setInt(1,Integer.parseInt(projectId));
            pstmt.setInt(2,maxPlots);
            try(var rs = pstmt.executeQuery()){
                while (rs.next()) {
                    // singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt()));
                    plots.add(buildPlotJson(rs));
                }
            }
            return  plots.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getProjectPlot(Request req, Response res) {
        var projectId = req.params(":project-id");
        var plotId = req.params(":plot-id");

        return "";
    }

    private static JsonArray getSampleJsonArray(Integer plot_id, Integer proj_id) {
        try (var conn = connect();
             var samplePstmt = conn.prepareStatement("SELECT * FROM select_plot_samples(?,?)")) {
            
            samplePstmt.setInt(1, plot_id);
            samplePstmt.setInt(2, proj_id);
            var samples = new JsonArray();
            try(var sampleRs = samplePstmt.executeQuery()){
                while (sampleRs.next()) {
                    var sample = new JsonObject();
                    sample.addProperty("id", sampleRs.getString("id"));
                    sample.addProperty("point", sampleRs.getString("point"));
                    sample.addProperty("sampleId",sampleRs.getString("sampleId"));
                    sample.addProperty("geom",sampleRs.getString("geom"));
                    if (sampleRs.getString("value").length() > 2) sample.add("value", parseJson(sampleRs.getString("value")).getAsJsonObject());
                    samples.add(sample);
                }
            }
            return samples;
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return new JsonArray();
        }
    }

    public String getProjectStats(Request req, Response res) {
        var projectId = req.params(":id");
        var stats = new JsonObject();
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project_statistics(?)")) {
            
            pstmt.setInt(1,Integer.parseInt(projectId));
            try(var rs = pstmt.executeQuery()){
                if (rs.next()){
                    stats.addProperty("flaggedPlots",rs.getInt("flagged_plots"));
                    stats.addProperty("analyzedPlots",rs.getInt("assigned_plots"));
                    stats.addProperty("unanalyzedPlots",rs.getInt("unassigned_plots"));
                    stats.addProperty("members",rs.getInt("members"));
                    stats.addProperty("contributors",rs.getInt("contributors"));
                    stats.addProperty("createdDate",rs.getString("created_date"));
                    stats.addProperty("publishedDate",rs.getString("published_date"));
                    stats.addProperty("closedDate",rs.getString("closed_date"));
                    stats.addProperty("archivedDate",rs.getString("archived_date"));
                }
            }
            return  stats.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public  String getUnassignedPlot(Request req, Response res) {
        var projectId =         Integer.parseInt(req.params(":id"));
        var currentPlotId =     Integer.parseInt(req.queryParamOrDefault("currentPlotId", "0"));
         
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_unassigned_plot(?,?)")) {

            var singlePlot = new JsonObject();
            pstmt.setInt(1,projectId);
            pstmt.setInt(2,currentPlotId);
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {     
                    singlePlot = buildPlotJson(rs);
                    singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt(), projectId));
                }
            }
            return  singlePlot.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public  String getUnassignedPlotById(Request req, Response res) {
        var projectId =     Integer.parseInt(req.params(":projid"));
        var plotId =        Integer.parseInt(req.params(":id"));

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_unassigned_plots_by_plot_id(?,?)")) {
            
            var singlePlot = new JsonObject();
            pstmt.setInt(1,projectId);
            pstmt.setInt(2,plotId);
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {
                    singlePlot = buildPlotJson(rs);
                    singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt(), projectId));
                }
            }
            return  singlePlot.toString();
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
        try (var pstmt = conn.prepareStatement("SELECT * FROM get_plot_headers(?)")){
            pstmt.setInt(1, projectId);
            try (var rs = pstmt.executeQuery()){
                while (rs.next()) {
                    if (!List.of("GID", "GEOM", "PLOT_GEOM", "LAT", "LON").contains(rs.getString("column_names").toUpperCase())){
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
        var sampleHeaders  = new ArrayList<String>();
        try (var pstmt = conn.prepareStatement("SELECT * FROM get_sample_headers(?)")){
            pstmt.setInt(1, projectId);
            try (var rs = pstmt.executeQuery()){
                while (rs.next()) {
                    if (!List.of("GID", "GEOM", "LAT", "LON", "SAMPLE_GEOM").contains(rs.getString("column_names").toUpperCase())){
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
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {
                    var plotSummaries = new JsonArray();
                    var sampleValueGroups = parseJson(rs.getString("sample_survey")).getAsJsonArray();
                    var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();
                    var plotHeaders = getPlotHeaders(conn, projectId);

                    try(var pstmtDump = conn.prepareStatement("SELECT * FROM dump_project_plot_data(?)")){
                        pstmtDump.setInt(1, projectId);
                        
                        try(var rsDump = pstmtDump.executeQuery()){
                        
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
                                
                                if (valueOrBlank(rsDump.getString("ext_plot_data")) != ""){
                                    var ext_plot_data = parseJson(rsDump.getString("ext_plot_data")).getAsJsonObject();

                                    plotHeaders.forEach(head ->
                                        plotSummary.addProperty("plot_" + head, getOrEmptyString(ext_plot_data, head).getAsString())
                                    );
                                }

                                plotSummaries.add(plotSummary);
                            } 
                        }
                        var extraHeaders = Arrays.stream(plotHeaders.toArray())
                                                .map(head -> !head.toString().contains("plot_") ? "plot_" + head : head)
                                                .toArray(String[]::new);

                        return outputAggregateCsv(res, sampleValueGroups, plotSummaries, projectName, extraHeaders);
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
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {
                    var sampleSummaries = new JsonArray();
                    var sampleValueGroups = parseJson(rs.getString("sample_survey")).getAsJsonArray();
                    var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();
                    var plotHeaders = getPlotHeaders(conn, projectId);
                    var sampleHeaders = getSampleHeaders(conn, projectId);
                    var imageryHeaders = new ArrayList<String>();

                    try(var pstmtDump = conn.prepareStatement("SELECT * FROM dump_project_sample_data(?)")){
                        pstmtDump.setInt(1, projectId);

                        try(var rsDump = pstmtDump.executeQuery()){
                            while (rsDump.next()) {
                                var plotSummary = new JsonObject();
                                plotSummary.addProperty("plot_id", rsDump.getString("plot_id"));
                                plotSummary.addProperty("sample_id", rsDump.getString("sample_id"));
                                plotSummary.addProperty("lon", rsDump.getString("lon"));
                                plotSummary.addProperty("lat", rsDump.getString("lat"));
                                plotSummary.addProperty("flagged", rsDump.getInt("flagged") > 0);
                                plotSummary.addProperty("analyses", rsDump.getInt("assigned"));
                                plotSummary.addProperty("user_id", valueOrBlank(rsDump.getString("email")));
                                plotSummary.addProperty("analysis_duration", valueOrBlank(rsDump.getString("analysis_duration")));
                                plotSummary.addProperty("collection_time", valueOrBlank(rsDump.getString("collection_time")));
                                if (rsDump.getString("value") != null && parseJson(rsDump.getString("value")).isJsonPrimitive()) {
                                    plotSummary.addProperty("value", rsDump.getString("value"));
                                } else {
                                    plotSummary.add("value", rsDump.getString("value") == null ? null : parseJson(rsDump.getString("value")).getAsJsonObject());
                                }
                                if (valueOrBlank(rsDump.getString("imagery_title")) != "") {
                                    plotSummary.addProperty("imagery_title", rsDump.getString("imagery_title"));
                                    if (!imageryHeaders.contains("imagery_title")) imageryHeaders.add("imagery_title");
                                    
                                    if (valueOrBlank(rsDump.getString("imagery_attributes")).length() > 2) {
                                        var attributes = parseJson(rsDump.getString("imagery_attributes")).getAsJsonObject();
                                        attributes.keySet().forEach(key -> {
                                            plotSummary.addProperty(key, attributes.get(key).getAsString());
                                            if (!imageryHeaders.contains(key)) imageryHeaders.add(key);
                                        });
                                    }
                                }

                                if (valueOrBlank(rsDump.getString("ext_plot_data")) != ""){
                                    var ext_plot_data = parseJson(rsDump.getString("ext_plot_data")).getAsJsonObject();                              
                                    plotHeaders.forEach(head ->
                                        plotSummary.addProperty("plot_" + head, getOrEmptyString(ext_plot_data, head).getAsString())
                                    );
                                }
                                
                                if (valueOrBlank(rsDump.getString("ext_sample_data")) != ""){
                                    var ext_sample_data = parseJson(rsDump.getString("ext_sample_data")).getAsJsonObject();
                                    sampleHeaders.forEach(head ->
                                        plotSummary.addProperty("sample_" + head, getOrEmptyString(ext_sample_data, head).getAsString())
                                    );
                                }
                                sampleSummaries.add(plotSummary);
                            } 
                        }
                        var compbinedHeaders = 
                        Stream.concat(
                            Arrays.stream(imageryHeaders.toArray()),
                            Stream.concat(
                                Arrays.stream(plotHeaders.toArray())
                                    .map(head -> !head.toString().contains("plot_") ? "plot_" + head : head),
                                Arrays.stream(sampleHeaders.toArray())
                                    .map(head -> !head.toString().contains("sample_") ? "sample_" + head : head)
                                )
                        ).toArray(String[]::new);
                        return outputRawCsv(res, sampleValueGroups, sampleSummaries, projectName, compbinedHeaders);
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
            try(var rs = pstmt.executeQuery()){
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
            try(var rs = pstmt.executeQuery()){
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
            try(var rs = pstmt.executeQuery()){
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

    public String addUserSamples(Request req, Response res) {
        var jsonInputs =            parseJson(req.body()).getAsJsonObject();
        var projectId =             jsonInputs.get("projectId").getAsString();
        var plotId =                jsonInputs.get("plotId").getAsString();
        var userName =              jsonInputs.get("userId").getAsString();
        var confidence =            jsonInputs.get("confidence").getAsInt();
        var collectionStart =       jsonInputs.get("collectionStart").getAsString();
        var userSamples =           jsonInputs.get("userSamples").getAsJsonObject();
        var userImages =            jsonInputs.get("userImages").getAsJsonObject();

        
        try (var conn = connect();
            var userPstmt = conn.prepareStatement("SELECT * FROM get_user(?)")) {
            
            userPstmt.setString(1, userName);
            try(var userRs = userPstmt.executeQuery()){
                if (userRs.next()){
                    var userId = userRs.getInt("id");
                    var SQL = "SELECT * FROM add_user_samples(?,?,?,?::int,?::timestamp,?::jsonb,?::jsonb)";
                    var pstmt = conn.prepareStatement(SQL) ;
                    pstmt.setInt(1, Integer.parseInt(projectId));
                    pstmt.setInt(2, Integer.parseInt(plotId));
                    pstmt.setInt(3, userId);
                    pstmt.setString(4, confidence == -1 ? null : Integer.toString(confidence));
                    pstmt.setTimestamp(5, new Timestamp(Long.parseLong(collectionStart)));
                    pstmt.setString(6, userSamples.toString());
                    pstmt.setString(7, userImages.toString());
                    pstmt.execute();
                    return plotId;
                }
                return "";
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String flagPlot(Request req, Response res) {
        var jsonInputs =        parseJson(req.body()).getAsJsonObject();
        var plotId =            jsonInputs.get("plotId").getAsString();
        var userName =          jsonInputs.get("userId").getAsString();
        
        try (var conn = connect();
            var pstmt = conn.prepareStatement("SELECT * FROM flag_plot(?,?,?::int)")) {
            
            pstmt.setInt(1,Integer.parseInt(plotId));
            pstmt.setString(2,userName);
            pstmt.setString(3,null); //confidence
            try(var rs = pstmt.executeQuery()){
                var idReturn = 0;
                if (rs.next()) {
                    idReturn = rs.getInt("flag_plot");
                }
                return Integer.toString(idReturn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    private static String loadCsvHeaders(String filename, List<String> mustInclude) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            
            List<String> colList = Arrays.stream(
                lines.findFirst().orElse("").split(","))
                    .map(col -> {
                        return col.toUpperCase();
                    })
                    .collect(Collectors.toList());

            // check if all required fields are in csv
            mustInclude.forEach(field -> {
                if (!colList.contains(field.toUpperCase())) {
                    throw new RuntimeException("Malformed plot CSV. Fields must be " + String.join("," , mustInclude));
                }   
            });

            var fields = Arrays.stream(
                colList.toArray(String[]::new))
                    .map(col -> {
                        if (List.of("LON", "LAT").contains(col.toUpperCase())) {
                            return col.toUpperCase() + " float";
                        }
                        return col.toUpperCase() + " text";
                    })
                    .collect(Collectors.joining(","));
            
            return String.join(",", fields);
        } catch (Exception e) {
            throw new RuntimeException("Error reading csv file");
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

    private static String loadPlots(Connection conn, String plotDistribution, Integer projectId, String plotsFile) {
        try {
            if (plotDistribution.equals("csv")) {
                var plots_table = "project_" +  projectId + "_plots_csv";
                // add emptye table to the database
                try(var pstmt = conn.prepareStatement("SELECT * FROM create_new_table(?,?)")){
                    pstmt.setString(1, plots_table);
                    pstmt.setString(2, loadCsvHeaders(plotsFile, List.of("lon","lat","plotId")));
                    pstmt.execute();
                } 
                // import csv file
                runBashScriptForProject(projectId, "plots", "csv2postgres.sh", "/csv");
                // add index for reference
                try(var pstmt = conn.prepareStatement("SELECT * FROM add_index_col(?)")){
                    pstmt.setString(1,plots_table);
                    pstmt.execute();
                } 
                return plots_table;
            } else if (plotDistribution.equals("shp")) {
                runBashScriptForProject(projectId, "plots", "shp2postgres.sh", "/shp");
                var plots_table = "project_" +  projectId + "_plots_shp";
                // run query to make sure all requred fields exist
                try(var pstmt = conn.prepareStatement("SELECT * FROM select_partial_table_by_name(?)")){
                    pstmt.setString(1,plots_table);
                    pstmt.execute();
                } catch (SQLException s) {
                    throw new RuntimeException("Missing sql columns");
                }
                return plots_table;
            }  else {
                return null;
            }
        } catch (Exception e) {
            if (plotDistribution.equals("csv")) {
                throw new RuntimeException("Malformed plot CSV. Fields must be LON,LAT,PLOTID.");
            } else {
                throw new RuntimeException("Malformed plot Shapefile. All features must be of type polygon and include a PLOTID field.");
            }
        } 
    }

    private static String loadSamples(Connection conn, String sampleDistribution, Integer projectId, String samplesFile) {
        try {
            if (sampleDistribution.equals("csv")) {
                var samples_table = "project_" +  projectId + "_samples_csv";
                // create new table
                try(var pstmt = conn.prepareStatement("SELECT * FROM create_new_table(?,?)")){
                    pstmt.setString(1,samples_table);
                    pstmt.setString(2, loadCsvHeaders(samplesFile, List.of("lon","lat","plotId", "sampleId")));
                    pstmt.execute();
                }
                // fill table
                runBashScriptForProject(projectId, "samples", "csv2postgres.sh", "/csv");
                // add index for reference
                try(var pstmt = conn.prepareStatement("SELECT * FROM add_index_col(?)")){
                    pstmt.setString(1,"project_" +  projectId + "_samples_csv");
                    pstmt.execute();
                }
                return samples_table;
            } else if (sampleDistribution.equals("shp")) {
                runBashScriptForProject(projectId, "samples", "shp2postgres.sh", "/shp");
                var samples_table = "project_" +  projectId + "_samples_shp";
                // run query to make sure all requred fields exist
                try(var pstmt = conn.prepareStatement("SELECT * FROM select_partial_sample_table_by_name(?)")){
                    pstmt.setString(1,samples_table);
                    pstmt.execute();
                } catch (SQLException s) {
                    throw new RuntimeException("Missing sql columns");
                }
                return samples_table;
            } else {
                return null;
            }
        } catch (Exception e) {
            if (sampleDistribution.equals("csv")) {
                throw new RuntimeException("Malformed sample CSV. Fields must be LON,LAT,PLOTID,SAMPLEID.");
            } else {
                throw new RuntimeException("Malformed sample Shapefile. All features must be of type polygon and include PLOTID and SAMPLEID fields.");
            }
        }
    }

    private static void createProjectPlots(JsonObject newProject) {
        // Store the parameters needed for plot generation in local variables with nulls set to 0
        var projectId =          newProject.get("id").getAsInt();
        var lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
        var latMin =             getOrZero(newProject,"latMin").getAsDouble();
        var lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
        var latMax =             getOrZero(newProject,"latMax").getAsDouble();
        var plotDistribution =   getOrEmptyString(newProject, "plotDistribution").getAsString();
        var numPlots =           getOrZero(newProject,"numPlots").getAsInt();
        var plotSpacing =        getOrZero(newProject,"plotSpacing").getAsDouble();
        var plotShape =          getOrEmptyString(newProject,"plotShape").getAsString();
        var plotSize =           getOrZero(newProject,"plotSize").getAsDouble();
        var sampleDistribution = getOrEmptyString(newProject, "sampleDistribution").getAsString();
        var samplesPerPlot =     getOrZero(newProject,"samplesPerPlot").getAsInt();
        var sampleResolution =   getOrZero(newProject,"sampleResolution").getAsDouble();
        var plotsFile =          newProject.has("plots_file") ? newProject.get("plots_file").getAsString() : "";
        var samplesFile =        newProject.has("samples_file") ? newProject.get("samples_file").getAsString() : "";
        try (var conn = connect()) {
            // load files into the database (loadPlot, loadSamples) and update projects
            try (var pstmt = 
                conn.prepareStatement("SELECT * FROM update_project_tables(?,?::text,?::text)")) {
                pstmt.setInt(1, projectId);     
                pstmt.setString(2, loadPlots(conn, plotDistribution, projectId, plotsFile));
                pstmt.setString(3, loadSamples(conn, sampleDistribution, projectId, samplesFile));
                pstmt.execute();
            } catch (SQLException e) {
                System.out.println("catch update");
                throw new  RuntimeException(e);
            } 
            try (var pstmt = 
                conn.prepareStatement("SELECT * FROM cleanup_project_tables(?,?)")) {
                pstmt.setInt(1, projectId);     
                pstmt.setDouble(2, plotSize);
                pstmt.execute();
            } catch (SQLException e) {
                System.out.println("catch clean");
                throw new  RuntimeException(e);
            }
            
            // if both are files, adding plots and samples is done inside PG
            if (List.of("csv", "shp").contains(plotDistribution) && List.of("csv", "shp").contains(sampleDistribution)) {
                try (var pstmt = 
                    conn.prepareStatement("SELECT * FROM samples_from_plots_with_files(?)")) {
                    pstmt.setInt(1, projectId);     
                    pstmt.execute();
                } catch (SQLException e) {
                    System.out.println("catch adding 2");
                    throw new  RuntimeException(e);
                }
            // Add plots from file and use returned plot ID to create samples
            } else if (List.of("csv", "shp").contains(plotDistribution)) {
                try (var pstmt = 
                    conn.prepareStatement("SELECT * FROM add_file_plots(?)")) {
                    pstmt.setInt(1,projectId); 
                    try (var rs = pstmt.executeQuery()) {
                        while (rs.next()){
                            var plotCenter = new Double[] {rs.getDouble("lon"), rs.getDouble("lat")};
                            createProjectSamples(conn, rs.getInt("id"), sampleDistribution, 
                                plotCenter, plotShape, plotSize, samplesPerPlot, sampleResolution, plotDistribution.equals("shp"));
                        }
                    }
                } catch (SQLException e) {
                    System.out.println("catch adding 1");
                    throw new  RuntimeException(e);
                } 
            } else {
                // Convert the lat/lon boundary coordinates to Web Mercator (units: meters) and apply an interior buffer of plotSize / 2
                var bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
                var paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], plotSize / 2.0);
                var left = paddedBounds[0];
                var bottom = paddedBounds[1];
                var right = paddedBounds[2];
                var top = paddedBounds[3];

                // Generate the plot objects and their associated sample points
                var newPlotCenters =
                plotDistribution.equals("random") 
                ? createRandomPointsInBounds(left, bottom, right, top, numPlots)
                : createGriddedPointsInBounds(left, bottom, right, top, plotSpacing);

                Arrays.stream(newPlotCenters)
                .forEach(plotEntry -> {
                    var plotCenter = (Double[]) plotEntry;    
                        var SqlPlots = "SELECT * FROM create_project_plot(?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))";
                        try(var pstmtPlots = conn.prepareStatement(SqlPlots)) {
                        pstmtPlots.setInt(1, projectId);    
                        pstmtPlots.setString(2, makeGeoJsonPoint(plotCenter[0], plotCenter[1]).toString());       
                        try(var rsPlots = pstmtPlots.executeQuery()){
                            if (rsPlots.next()) {
                                var newPlotId = rsPlots.getInt("create_project_plot");
                                createProjectSamples(conn, newPlotId, sampleDistribution, 
                                    plotCenter, plotShape, plotSize, samplesPerPlot, sampleResolution, false);
                            }
                        }
                    } catch (SQLException e) {
                        System.out.println(e.getMessage());
                    }
                });
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

    private static void createProjectSamples(Connection conn, Integer newPlotId, String sampleDistribution, Double[] plotCenter, String plotShape, Double plotSize, Integer samplesPerPlot, Double sampleResolution, Boolean isShpPlot) {
        
        var newSamplePoints =
        isShpPlot || !List.of("random", "gridded").contains(sampleDistribution)
        ? new Double[][]{plotCenter}
        : sampleDistribution.equals("random")
            ? createRandomSampleSet(plotCenter, plotShape, plotSize, samplesPerPlot)
            : createGriddedSampleSet(plotCenter, plotShape, plotSize, sampleResolution);              

        Arrays.stream(newSamplePoints)
            .forEach(sampleEntry -> {
                var SqlSamples = "SELECT * FROM create_project_plot_sample(?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))";

                var sampleCenter = (Double[]) sampleEntry;

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
        var newProjectId = "";
        try {
            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));
            // Read the input fields into a new JsonObject (NOTE: fields will be camelCased)
            var newProject = partsToJsonObject(req,
                                               new String[]{"institution", "privacy-level", "lon-min", "lon-max", "lat-min",
                                                            "lat-max", "base-map-source", "plot-distribution", "num-plots",
                                                            "plot-spacing", "plot-shape", "plot-size", "sample-distribution",
                                                            "samples-per-plot", "sample-resolution", "sample-values",
                                                            "classification_times", "project-template", "use-template-plots"});

            // Manually add the name and description fields since they may be invalid JSON
            newProject.addProperty("name", partToString(req.raw().getPart("name")));
            newProject.addProperty("description", partToString(req.raw().getPart("description")));
            newProject.addProperty("availability", "unpublished");

            var lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
            var latMin =             getOrZero(newProject,"latMin").getAsDouble();
            var lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
            var latMax =             getOrZero(newProject,"latMax").getAsDouble();
            newProject.addProperty("boundary", makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());

            var SQL = "SELECT * FROM create_project(?,?,?,?,?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),?,?,?,?,?,?,?,?,?,?::JSONB,?::jsonb)";
            try (var conn = connect();
                 var pstmt = conn.prepareStatement(SQL)) {
                
                pstmt.setInt(1,newProject.get("institution").getAsInt());
                pstmt.setString(2 ,newProject.get("availability").getAsString());
                pstmt.setString(3,newProject.get("name").getAsString());
                pstmt.setString(4, newProject.get("description").getAsString());
                pstmt.setString(5, newProject.get("privacyLevel").getAsString());
                pstmt.setString(6, newProject.get("boundary").getAsString());
                pstmt.setString(7, getOrEmptyString(newProject, "baseMapSource").getAsString());
                pstmt.setString(8, getOrEmptyString(newProject, "plotDistribution").getAsString());
                pstmt.setInt(9, getOrZero(newProject, "numPlots").getAsInt());
                pstmt.setDouble(10, getOrZero(newProject, "plotSpacing").getAsDouble());
                pstmt.setString(11, getOrEmptyString(newProject, "plotShape").getAsString());
                pstmt.setDouble(12,  getOrZero(newProject, "plotSize").getAsDouble());
                pstmt.setString(13, getOrEmptyString(newProject, "sampleDistribution").getAsString());
                pstmt.setInt(14, getOrZero(newProject, "samplesPerPlot").getAsInt());
                pstmt.setDouble(15, getOrZero(newProject, "sampleResolution").getAsDouble());
                pstmt.setString(16, newProject.get("sampleValues").getAsJsonArray().toString());
                pstmt.setString(17,  null);  //classification times


                try(var rs = pstmt.executeQuery()){
                    if (rs.next()){
                        newProjectId = Integer.toString(rs.getInt("create_project"));
                        newProject.addProperty("id", newProjectId);
                        if (getOrZero(newProject, "useTemplatePlots").getAsBoolean()) {
                            try(var copyPstmt = conn.prepareStatement("SELECT * FROM copy_template_plots(?,?)")){
                                copyPstmt.setInt(1, newProject.get("projectTemplate").getAsInt());
                                copyPstmt.setInt(2, Integer.parseInt(newProjectId));
                                copyPstmt.execute();
                            }
                        } else {
                            // Upload the plot-distribution-csv-file if one was provided
                            // not stored in database
                            if (newProject.get("plotDistribution").getAsString().equals("csv")) {
                                var csvFileName = writeFilePart(req,
                                        "plot-distribution-csv-file",
                                        expandResourcePath("/csv"),
                                        "project-" + newProjectId + "-plots");
                                newProject.addProperty("plots_file", csvFileName);
                            } 

                            // Upload the sample-distribution-csv-file if one was provided
                            if (newProject.get("sampleDistribution").getAsString().equals("csv")) {
                                var csvFileName = writeFilePart(req,
                                        "sample-distribution-csv-file",
                                        expandResourcePath("/csv"),
                                        "project-" + newProjectId + "-samples");
                                newProject.addProperty("samples_file", csvFileName);
                            } 

                            // Upload the plot-distribution-shp-file if one was provided (this should be a ZIP file)
                            if (newProject.get("plotDistribution").getAsString().equals("shp")) {
                                var shpFileName = writeFilePart(req,
                                                                "plot-distribution-shp-file",
                                                                expandResourcePath("/shp"),
                                                                "project-" + newProjectId + "-plots");
                                newProject.addProperty("plots_file", shpFileName);
                            }

                            // Upload the sample-distribution-shp-file if one was provided (this should be a ZIP file)
                            if (newProject.get("sampleDistribution").getAsString().equals("shp")) {
                                var shpFileName = writeFilePart(req,
                                                                "sample-distribution-shp-file",
                                                                expandResourcePath("/shp"),
                                                                "project-" + newProjectId + "-samples");
                                newProject.addProperty("samples_file", shpFileName);
                            } 
                            // Create the requested plot set and write it to plot-data-<newProjectId>.json
                            createProjectPlots(newProject);

                            deleteFiles(Integer.parseInt(newProjectId));
                            deleteShapeFileDirectories(Integer.parseInt(newProjectId));
                        }
                    }
                    // Indicate that the project was created successfully
                    return newProjectId;
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                // Indicate that an error occurred with project creation
                throw new RuntimeException(e);
            }
        }
        catch (Exception e) {
            // Indicate that an error occurred with project creation
            deleteFiles(Integer.parseInt(newProjectId));
            deleteShapeFileDirectories(Integer.parseInt(newProjectId));
            try (var conn = connect()) {
                try (var pstmt = conn.prepareStatement("DELETE FROM projects WHERE id = ?")) {
                    pstmt.setInt(1, Integer.parseInt(newProjectId));
                    pstmt.execute();
                } catch (SQLException sql) {
                }
                try (var pstmt = conn.prepareStatement("DROP TABLE project_" + newProjectId + "_plots_csv")) {
                    pstmt.execute();
                } catch (SQLException sql) {
                }
                try (var pstmt = conn.prepareStatement("DROP TABLE project_" + newProjectId + "_samples_csv")) {
                    pstmt.execute();
                } catch (SQLException sql) {
                }
                try (var pstmt = conn.prepareStatement("DROP TABLE project_" + newProjectId + "_plots_shp")) {
                    pstmt.execute();
                } catch (SQLException sql) {
                }
                try (var pstmt = conn.prepareStatement("DROP TABLE project_" + newProjectId + "_samples_shp")) {
                    pstmt.execute();
                } catch (SQLException sql) {
                }
            } catch (SQLException sql) {
            }
            return e.getMessage();
        }
    }

}
