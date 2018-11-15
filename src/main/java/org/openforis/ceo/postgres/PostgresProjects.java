package org.openforis.ceo.postgres;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.partsToJsonObject;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;
import static org.openforis.ceo.utils.ProjectUtils.*;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
            newProject.addProperty("plotSpacing",rs.getFloat("plot_spacing"));
            newProject.addProperty("plotShape",rs.getString("plot_shape"));
            newProject.addProperty("plotSize",rs.getFloat("plot_size"));
            newProject.addProperty("plotsCsvFile", rs.getString("plots_csv_file"));
            newProject.addProperty("plotsShpFile", rs.getString("plots_shp_file"));
            newProject.addProperty("samplesCsvFile", rs.getString("samples_csv_file"));
            newProject.addProperty("samplesShpFile", rs.getString("samples_shp_file"));
            newProject.addProperty("archived", rs.getString("availability").equals("archived"));
            newProject.addProperty("sampleDistribution",rs.getString("sample_distribution"));
            newProject.addProperty("samplesPerPlot",rs.getInt("samples_per_plot"));
            newProject.addProperty("sampleResolution",rs.getFloat("sample_resolution"));
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
            singlePlot.addProperty("collection_time", rs.getString("collection_time"));
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

    private static JsonArray getSampleJsonArray(Integer plot_id) {
        try (var conn = connect();
             var samplePstmt = conn.prepareStatement("SELECT * FROM select_plot_samples(?)")) {
            
            samplePstmt.setInt(1, plot_id);
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
                    stats.addProperty("publishDate",rs.getString("published_date"));
                    stats.addProperty("closeDate",rs.getString("closed_date"));
                    stats.addProperty("archiveDate",rs.getString("archived_date"));
                }
            }
            return  stats.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public  String getUnassignedPlot(Request req, Response res) {
        var projectId =         req.params(":id");
        var currentPlotId =     req.queryParamOrDefault("currentPlotId", "0");
         
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_unassigned_plot(?,?)")) {

            var singlePlot = new JsonObject();
            pstmt.setInt(1,Integer.parseInt(projectId));
            pstmt.setInt(2,Integer.parseInt(currentPlotId));
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {     
                    singlePlot = buildPlotJson(rs);
                    singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt()));
                }
            }
            return  singlePlot.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public  String getUnassignedPlotById(Request req, Response res) {
        var projectId =     req.params(":projid");
        var plotId =        req.params(":id");

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_unassigned_plots_by_plot_id(?,?)")) {
            
            var singlePlot = new JsonObject();
            pstmt.setInt(1,Integer.parseInt(projectId));
            pstmt.setInt(2,Integer.parseInt(plotId));
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {
                    singlePlot = buildPlotJson(rs);
                    singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt()));
                }
            }
            return  singlePlot.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
        var projectId = req.params(":id");

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project(?)")) {
            // check if project exists
            pstmt.setInt(1,Integer.parseInt(projectId));      
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {
                    var plotSummaries = new JsonArray();
                    var sampleValueGroups = parseJson(rs.getString("sample_survey")).getAsJsonArray();
                    var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();

                    try(var pstmtDump = conn.prepareStatement("SELECT * FROM dump_project_plot_data(?)")){
                        pstmtDump.setInt(1, Integer.parseInt(projectId));
                        
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
                                plotSummary.addProperty("collection_time", valueOrBlank(rsDump.getString("collection_time")));
                                plotSummary.add("distribution",
                                        getValueDistribution(samples, getSampleValueTranslations(sampleValueGroups)));
                                
                                plotSummaries.add(plotSummary);
                            } 
                        }
                        return outputAggregateCsv(res, sampleValueGroups, plotSummaries, projectName);
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
    
    private static String valueOrBlank(String input) {

        return input == null || input.equals("null") ? "" : input;
    }

    public HttpServletResponse dumpProjectRawData(Request req, Response res) {
        var projectId = req.params(":id");

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project(?)")) {
            // check if project exists
            pstmt.setInt(1,Integer.parseInt(projectId));      
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {
                    var sampleSummaries = new JsonArray();
                    var sampleValueGroups = parseJson(rs.getString("sample_survey")).getAsJsonArray();
                    var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();

                    try(var pstmtDump = conn.prepareStatement("SELECT * FROM dump_project_sample_data(?)")){
                        pstmtDump.setInt(1, Integer.parseInt(projectId));

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
                                plotSummary.addProperty("collection_time", valueOrBlank(rsDump.getString("collection_time")));
                                if (rsDump.getString("value") != null && parseJson(rsDump.getString("value")).isJsonPrimitive()) {
                                    plotSummary.addProperty("value", rsDump.getString("value"));
                                } else {
                                    plotSummary.add("value", rsDump.getString("value") == null ? null : parseJson(rsDump.getString("value")).getAsJsonObject());
                                }
                                sampleSummaries.add(plotSummary);
                            } 
                        }

                        return outputRawCsv(res, sampleValueGroups, sampleSummaries, projectName);

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

    // used to get a single plot for a return value
    public  String getSinglePlot(Integer plotId) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_single_plot(?)")) {
            
            pstmt.setInt(1, plotId);
            try(var rs = pstmt.executeQuery()){
                var singlePlot = new JsonObject();
                if (rs.next()) {     
                    singlePlot = buildPlotJson(rs);
                    singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt()));
                }
                return singlePlot.toString();
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String addUserSamples(Request req, Response res) {
        var jsonInputs =    parseJson(req.body()).getAsJsonObject();
        var projectId =     jsonInputs.get("projectId").getAsString();
        var plotId =        jsonInputs.get("plotId").getAsString();
        var userName =      jsonInputs.get("userId").getAsString();
        // var confidence =     jsonInputs.get("confidence").getAsString();
        // var imageryId =      jsonInputs.get("imagery_id").getAsString();
        // var imageryDate =    new Date(jsonInputs.get("imagery_date").getAsLong());
        // var value =          jsonInputs.get("value").getAsJsonObject();
        var userSamples =   jsonInputs.get("userSamples").getAsJsonObject();

        try (var conn = connect();
            var userPstmt = conn.prepareStatement("SELECT * FROM get_user(?)")) {
            
            userPstmt.setString(1, userName);
            try(var userRs = userPstmt.executeQuery()){
                if (userRs.next()){
                    var userId = userRs.getInt("id");
                    // fixme add collection time, null imagery date
                    var SQL = "SELECT * FROM add_user_samples(?,?,?,?::int,?::jsonb,?::int,?::date)";
                    var pstmt = conn.prepareStatement(SQL) ;
                    pstmt.setInt(1, Integer.parseInt(projectId));
                    pstmt.setInt(2, Integer.parseInt(plotId));
                    pstmt.setInt(3, userId);
                    pstmt.setString(4, null); //confidence
                    pstmt.setString(5, userSamples.toString());
                    pstmt.setString(6, null); //imageryID
                    pstmt.setDate(7, null ); //imagery date
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

    private static void createProjectPlots(JsonObject newProject) {
        // Store the parameters needed for plot generation in local variables with nulls set to 0
        var projectId =          newProject.get("id").getAsInt();
        var lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
        var latMin =             getOrZero(newProject,"latMin").getAsDouble();
        var lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
        var latMax =             getOrZero(newProject,"latMax").getAsDouble();
        var plotDistribution =   newProject.get("plotDistribution").getAsString();
        var numPlots =           getOrZero(newProject,"numPlots").getAsInt();
        var plotSpacing =        getOrZero(newProject,"plotSpacing").getAsDouble();
        var plotShape =          getOrEmptyString(newProject,"plotShape").getAsString();
        var plotSize =           getOrZero(newProject,"plotSize").getAsDouble();
        var sampleDistribution = newProject.get("sampleDistribution").getAsString();
        var samplesPerPlot =     getOrZero(newProject,"samplesPerPlot").getAsInt();
        var sampleResolution =   getOrZero(newProject,"sampleResolution").getAsDouble();

        // If plotDistribution is csv, calculate the lat/lon bounds from the csv contents
        var plotCenters = new HashMap<String, Double[]>();
        if (plotDistribution.equals("csv")) {
            plotCenters = loadCsvPlotPoints(newProject.get("plots-csv").getAsString());
            var csvPlotBounds = calculateBounds(plotCenters.values().toArray(new Double[][]{}), plotSize / 2.0);
            lonMin = csvPlotBounds[0];
            latMin = csvPlotBounds[1];
            lonMax = csvPlotBounds[2];
            latMax = csvPlotBounds[3];
        } 
        
        var shpPlotGeoms = new HashMap<String, JsonObject>();
        if (plotDistribution.equals("shp")) {
            extractZipFileToGeoJson(projectId, "plots");
            shpPlotGeoms = getGeoJsonPlotGeometries(projectId);
            plotCenters = getPlotGeometryCenters(shpPlotGeoms);
            var shpPlotBounds = calculateBounds(plotCenters.values().toArray(new Double[][]{}), 500.0); // FIXME: replace hard-coded padding with a calculated value
            lonMin = shpPlotBounds[0];
            latMin = shpPlotBounds[1];
            lonMax = shpPlotBounds[2];
            latMax = shpPlotBounds[3];
        }
        final var shpPlotGeomsFinal = shpPlotGeoms;

        // If sampleDistribution is csv, calculate the lat/lon bounds from the csv contents
        var csvSamplePoints = new HashMap<String, HashMap<String, Double[]>>();
        if (sampleDistribution.equals("csv")) {
            csvSamplePoints = loadCsvSamplePoints(newProject.get("samples-csv").getAsString());
        }
        final var csvSamplePointsFinal = csvSamplePoints;

        // If sampleDistribution is shp, calculate the lat/lon bounds from the shp contents
        var shpSampleGeoms = new HashMap<String, HashMap<String, JsonObject>>();
        var shpSampleCenters = new HashMap<String, HashMap<String, Double[]>>();
        if (sampleDistribution.equals("shp")) {
            extractZipFileToGeoJson(projectId, "samples");
            shpSampleGeoms = getGeoJsonSampleGeometries(projectId);
            shpSampleCenters = getSampleGeometryCenters(shpSampleGeoms);
        }
        final var shpSampleGeomsFinal = shpSampleGeoms;
        final var shpSampleCentersFinal = shpSampleCenters;
        
        try (var conn = connect();
             var pstmt = 
                conn.prepareStatement("SELECT * FROM update_project_files(?,?::text,?::text,?::text,?::text,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))")) {
                
                pstmt.setInt(1,Integer.parseInt(newProject.get("id").getAsString()));     
                pstmt.setString(2, newProject.get("plots-csv").getAsString());
                pstmt.setString(3, newProject.get("plots-shp").getAsString());
                pstmt.setString(4, newProject.get("samples-csv").getAsString());
                pstmt.setString(5, newProject.get("samples-shp").getAsString());
                pstmt.setString(6, makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());
                pstmt.execute();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

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
        : plotCenters.entrySet().toArray();

        
        try (var conn = connect()) {
            Arrays.stream(newPlotCenters)
            .forEach(plotEntry -> {
                var plotCenter =
                    List.of("csv", "shp").contains(plotDistribution)
                    ? (Double[]) ((Map.Entry) plotEntry).getValue()
                    : (Double[]) plotEntry;    
                var plotId =
                    List.of("csv", "shp").contains(plotDistribution)
                    ? (String) ((Map.Entry) plotEntry).getKey()
                    : "";

                    var SqlPlots = "SELECT * FROM create_project_plot(?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),?,ST_Force2d(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)))";
                    try(var pstmtPlots = conn.prepareStatement(SqlPlots)) {
                    pstmtPlots.setInt(1,Integer.parseInt(newProject.get("id").getAsString()));    
                    pstmtPlots.setString(2, makeGeoJsonPoint(plotCenter[0], plotCenter[1]).toString());    
                    pstmtPlots.setString(3, plotId);    
                    pstmtPlots.setString(4, plotDistribution.equals("shp") 
                        ? shpPlotGeomsFinal.get(plotId).toString() 
                        : null);
                    try(var rsPlots = pstmtPlots.executeQuery()){
                        if (rsPlots.next()) {
                            var newPlotId = rsPlots.getInt("create_project_plot");
                            var newSamplePoints =
                                sampleDistribution.equals("random")
                                ? (List.of("random", "gridded").contains(plotDistribution)
                                ? createRandomSampleSet(plotCenter, plotShape, plotSize, samplesPerPlot)
                                : new Double[][]{plotCenter})
                                : (sampleDistribution.equals("gridded")
                                ? (List.of("random", "gridded").contains(plotDistribution)
                                    ? createGriddedSampleSet(plotCenter, plotShape, plotSize, sampleResolution)
                                    : new Double[][]{plotCenter})
                                : (sampleDistribution.equals("csv")
                                    ? csvSamplePointsFinal.getOrDefault(plotId,  new HashMap<String, Double[]>()).entrySet().toArray()
                                    : shpSampleCentersFinal.getOrDefault(plotId, new HashMap<String, Double[]>()).entrySet().toArray()));

                            Arrays.stream(newSamplePoints)
                                .forEach(sampleEntry -> {
                                    var SqlSamples = "SELECT * FROM create_project_plot_sample(?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),?,ST_Force2d(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)))";
                                    var sampleId =
                                        List.of("csv", "shp").contains(sampleDistribution)
                                        ? (String) ((Map.Entry) sampleEntry).getKey()
                                        : "";

                                    var sampleCenter =
                                        List.of("csv", "shp").contains(sampleDistribution)
                                        ? (Double[]) ((Map.Entry) sampleEntry).getValue()
                                        : (Double[]) sampleEntry;

                                    try (var pstmtSamples = conn.prepareStatement(SqlSamples)) {
                                        pstmtSamples.setInt(1,newPlotId);
                                        pstmtSamples.setString(2,makeGeoJsonPoint(sampleCenter[0], sampleCenter[1]).toString());
                                        pstmtSamples.setString(3, sampleId);
                                        pstmtSamples.setString(4, sampleDistribution.equals("shp") 
                                            ? shpSampleGeomsFinal.get(plotId).get(sampleId).toString() 
                                            : null);
                                        pstmtSamples.execute();
                                    } catch (SQLException e) {
                                        System.out.println(e.getMessage());
                                    }
                                });
                        }
                    }
                } catch (SQLException e) {
                    System.out.println(e.getMessage());
                }
            });
        }
        catch (SQLException e) {
            System.out.println(e.getMessage());
        }
    }


    public String createProject(Request req, Response res) {
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
                                                            "classification_times"});

            // Manually add the name and description fields since they may be invalid JSON
            newProject.addProperty("name", partToString(req.raw().getPart("name")));
            newProject.addProperty("description", partToString(req.raw().getPart("description")));
            newProject.addProperty("availability", "unpublished");

            var lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
            var latMin =             getOrZero(newProject,"latMin").getAsDouble();
            var lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
            var latMax =             getOrZero(newProject,"latMax").getAsDouble();
            newProject.addProperty("boundary", makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());

            var SQL = "SELECT * FROM create_project(?,?,?,?,?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),?,?,?,?,?,?,?,?,?,?::JSONB,?,?,?,?,?::jsonb)";
            try (var conn = connect();
                 var pstmt = conn.prepareStatement(SQL)) {
                
                pstmt.setInt(1,newProject.get("institution").getAsInt());
                pstmt.setString(2 ,newProject.get("availability").getAsString());
                pstmt.setString(3,newProject.get("name").getAsString());
                pstmt.setString(4, newProject.get("description").getAsString());
                pstmt.setString(5, newProject.get("privacyLevel").getAsString());
                pstmt.setString(6, newProject.get("boundary").getAsString());
                pstmt.setString(7, newProject.get("baseMapSource").getAsString());
                pstmt.setString(8, newProject.get("plotDistribution").getAsString());
                pstmt.setInt(9, getOrZero(newProject, "numPlots").getAsInt());
                pstmt.setFloat(10, getOrZero(newProject, "plotSpacing").getAsFloat());
                pstmt.setString(11, newProject.get("plotShape").getAsString());
                pstmt.setFloat(12,  getOrZero(newProject, "plotSize").getAsFloat());
                pstmt.setString(13, newProject.get("sampleDistribution").getAsString());
                pstmt.setInt(14, getOrZero(newProject, "samplesPerPlot").getAsInt());
                pstmt.setFloat(15, getOrZero(newProject, "sampleResolution").getAsFloat());
                pstmt.setString(16, newProject.get("sampleValues").getAsJsonArray().toString());
                pstmt.setString(17,  null); // file values
                pstmt.setString(18,  null);
                pstmt.setString(19,  null);
                pstmt.setString(20,  null);
                pstmt.setString(21,  null);  //classification times


                try(var rs = pstmt.executeQuery()){
                    var newProjectId = "";
                    if (rs.next()){
                        newProjectId = Integer.toString(rs.getInt("create_project"));
                        newProject.addProperty("id", newProjectId);
                        
                        // Upload the plot-distribution-csv-file if one was provided
                        // not stored in database
                        if (newProject.get("plotDistribution").getAsString().equals("csv")) {
                            var csvFileName = writeFilePart(req,
                                    "plot-distribution-csv-file",
                                    expandResourcePath("/csv"),
                                    "project-" + newProjectId + "-plots");
                            newProject.addProperty("plots-csv", csvFileName);
                        } else {
                            newProject.addProperty("plots-csv", "");
                        }

                        // Upload the sample-distribution-csv-file if one was provided
                        if (newProject.get("sampleDistribution").getAsString().equals("csv")) {
                            var csvFileName = writeFilePart(req,
                                    "sample-distribution-csv-file",
                                    expandResourcePath("/csv"),
                                    "project-" + newProjectId + "-samples");
                            newProject.addProperty("samples-csv", csvFileName);
                        } else {
                            newProject.addProperty("samples-csv", "");
                        }

                        // Upload the plot-distribution-shp-file if one was provided (this should be a ZIP file)
                        if (newProject.get("plotDistribution").getAsString().equals("shp")) {
                            var shpFileName = writeFilePart(req,
                                                            "plot-distribution-shp-file",
                                                            expandResourcePath("/shp"),
                                                            "project-" + newProjectId + "-plots");
                            newProject.addProperty("plots-shp", shpFileName);
                        } else {
                            newProject.addProperty("plots-shp", "");
                        }

                        // Upload the sample-distribution-shp-file if one was provided (this should be a ZIP file)
                        if (newProject.get("sampleDistribution").getAsString().equals("shp")) {
                            var shpFileName = writeFilePart(req,
                                                            "sample-distribution-shp-file",
                                                            expandResourcePath("/shp"),
                                                            "project-" + newProjectId + "-samples");
                            newProject.addProperty("samples-shp", shpFileName);
                        } else {
                            newProject.addProperty("samples-shp", "");
                        }
                        // Create the requested plot set and write it to plot-data-<newProjectId>.json
                        createProjectPlots(newProject);
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
            throw new RuntimeException(e);
        }
    }

}
