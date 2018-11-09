package org.openforis.ceo.postgres;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.partsToJsonObject;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.toElementStream;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;


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
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
import javax.servlet.http.HttpServletResponse;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.openforis.ceo.db_api.Projects;
import spark.Request;
import spark.Response;

public class PostgresProjects implements Projects {

    private static String safeDateToString(java.sql.Date date) {
        try {
            return date.toString();
        } catch (Exception e) {
            return "";
        }

    }


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
            newProject.add("sampleValues", parseJson(rs.getString("sample_survey")).getAsJsonArray());

            // FIXME: this is not in JSON
            var classificationStartDate = rs.getDate("classification_start_date");
            var classificationEndDate = rs.getDate("classification_end_date");
            newProject.addProperty("classification_start_date",safeDateToString(classificationStartDate));
            newProject.addProperty("classification_end_date",safeDateToString(classificationEndDate));
            newProject.addProperty("classification_timestep",rs.getInt("classification_timestep"));

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

                    // project.addProperty("classification_start_date", "");
                    // project.addProperty("classification_end_date", "");
                    // project.addProperty("classification_timestep", 0);
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
            singlePlot.addProperty("analysis",rs.getInt("assigned"));
            singlePlot.addProperty("user",rs.getString("username"));
            singlePlot.addProperty("confidence",rs.getInt("confidence"));
            singlePlot.addProperty("collectionTime", rs.getString("collection_time"));
            singlePlot.addProperty("plotId",rs.getString("plot_id"));
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
                    sample.addProperty("sampleId",sampleRs.getString("sample_id"));
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
                    stats.addProperty("createdDate",rs.getInt("created_date"));
                    stats.addProperty("publishDate",rs.getInt("publish_date"));
                    stats.addProperty("closeDate",rs.getInt("close_date"));
                    stats.addProperty("archiveDate",rs.getInt("archive_date"));
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

    private static Collector<String, ?, Map<String, Long>> countDistinct =
        Collectors.groupingBy(Function.identity(), Collectors.counting());

    private static String[] getValueDistributionLabels(JsonObject project) {
        return new String[]{};
    }

    private static Map<Integer, String> getSampleValueTranslations(JsonObject project) {
        return new HashMap<Integer, String>();
    }

    // Returns a JsonObject like this:
    // {"Land Use:Timber" 10.0,
    //  "Land Use:Agriculture": 20.0,
    //  "Land Use:Urban": 70.0,
    //  "Land Cover:Forest": 10.0,
    //  "Land Cover:Grassland": 40.0,
    //  "Land Cover:Impervious": 50.0}
    private static JsonObject getValueDistribution(JsonArray samples, Map<Integer, String> sampleValueTranslations) {
        return new JsonObject();
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

    public HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
        var projectId = req.params(":id");
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM select_project(?)")) {
            
            pstmt.setInt(1,Integer.parseInt(projectId));
            try(var rs = pstmt.executeQuery()){
                if (rs.next()) {
                    var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();
                    var currentDate = LocalDate.now().toString();
                    var outputFileName = "ceo-" + projectName + "-plot-data-" + currentDate;
                    System.out.println(projectName);

                    var SqlDump = "SELECT * FROM dump_project_plot_data(?)";
                    var pstmtDump = conn.prepareStatement(SqlDump) ;
                    pstmtDump.setInt(1,Integer.parseInt(projectId));
                    var rsDump = pstmtDump.executeQuery();

                    while (rsDump.next()){
                        System.out.println(rsDump.toString());
                    }
                    return writeCsvFile(res.raw(), "header", "body", outputFileName);
                } else {
                    res.raw().setStatus(SC_NO_CONTENT);
                    return res.raw();
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return res.raw();
        }
    }

    private static String JsonKeytoString(String jsonStr, String key) {
        if (jsonStr.contains(key)) {
            return parseJson(jsonStr).getAsJsonObject().get(key).toString();
        } else {
            return jsonStr;
        }
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
            
            var sampleSummaries = new JsonArray();
            var sampleValueGroups = new JsonArray();
            var csvContent = "";
            try(var rs = pstmt.executeQuery()){
                if (rs.next()){
                    sampleValueGroups = parseJson(rs.getString("sample_survey")).getAsJsonArray();

                    var SqlDump = "SELECT * FROM dump_project_sample_data_test(?)";
                    var pstmtDump = conn.prepareStatement(SqlDump) ;
                    pstmtDump.setInt(1,Integer.parseInt(projectId));
                    var rsDump = pstmtDump.executeQuery();
                    
                    if (rsDump.next()) {
                        csvContent = rsDump.getString("entire_string");
                    } 
                    // while (rsDump.next()) {
                    //     var csvRow = new JsonObject();
                    //     csvRow.addProperty("plot_id", rsDump.getString("plot_id"));
                    //     csvRow.addProperty("sample_id", rsDump.getString("sample_id"));
                    //     csvRow.addProperty("lon", rsDump.getString("lon"));
                    //     csvRow.addProperty("lat", rsDump.getString("lat"));
                    //     csvRow.addProperty("flagged", rsDump.getBoolean("flagged"));
                    //     csvRow.addProperty("assigned", rsDump.getBoolean("assigned"));
                    //     csvRow.addProperty("email", valueOrBlank(rsDump.getString("email")));
                    //     csvRow.addProperty("collection_time", valueOrBlank(rsDump.getString("collection_time")));
                    //     sampleSummaries.add(csvRow);
                    // } 

                } else {
                    res.raw().setStatus(SC_NO_CONTENT);
                    return res.raw();
                }
            
            
                var sampleValueGroupNames = toStream(sampleValueGroups)
                        .collect(Collectors.toMap(sampleValueGroup -> sampleValueGroup.get("id").getAsInt(),
                                sampleValueGroup -> sampleValueGroup.get("name").getAsString(),
                                (a, b) -> b));

                var fields = new String[]{"plot_id", "sample_id", "lon", "lat", "flagged", "analyses", "user_id", "timestamp"};
                var labels = sampleValueGroupNames.entrySet().stream().sorted(Map.Entry.comparingByKey()).map(Map.Entry::getValue).toArray(String[]::new);
                
                var csvHeader = Stream.concat(Arrays.stream(fields), Arrays.stream(labels)).map(String::toUpperCase).collect(Collectors.joining(","));

                // var csvContent = toStream(sampleSummaries)
                //         .map(sampleSummary -> {
                //             var fieldStream = Arrays.stream(fields);
                //             var labelStream = Arrays.stream(labels);
                //             return Stream.concat(fieldStream.map(field -> sampleSummary.get(field).isJsonNull() ? "" : sampleSummary.get(field).getAsString()),
                //                     labelStream.map(label -> {
                //                         var value = sampleSummary.get("value");
                //                         if (value.isJsonNull()) {
                //                             return "";
                //                         } else if (value.isJsonPrimitive()) {
                //                             return sampleValueTranslations
                //                                     .getOrDefault(value.getAsInt(), "LULC:NoValue")
                //                                     .split(":")[1];
                //                         } else {
                //                             return value.getAsJsonObject().get(label).getAsString();
                //                         }}))
                //                     .collect(Collectors.joining(","));
                //         })
                //         .collect(Collectors.joining("\n"));


                var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();
                var currentDate = LocalDate.now().toString();
                var outputFileName = "ceo-" + projectName + "-sample-data-" + currentDate;
                
                return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return res.raw();
        }
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
                    return getSinglePlot(Integer.parseInt(plotId));
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
                return getSinglePlot(idReturn);
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    private static JsonObject makeGeoJsonPoint(double lon, double lat) {
        var coordinates = new JsonArray();
        coordinates.add(lon);
        coordinates.add(lat);

        var geoJsonPoint = new JsonObject();
        geoJsonPoint.addProperty("type", "Point");
        geoJsonPoint.add("coordinates", coordinates);

        return geoJsonPoint;
    }

    private static JsonObject makeGeoJsonPolygon(double lonMin, double latMin, double lonMax, double latMax) {
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

    private static Double[] reprojectBounds(double left, double bottom, double right, double top, int fromEPSG, int toEPSG) {
        var lowerLeft = reprojectPoint(new Double[]{left, bottom}, fromEPSG, toEPSG);
        var upperRight = reprojectPoint(new Double[]{right, top}, fromEPSG, toEPSG);
        return new Double[]{lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]};
    }

    private static Double[] padBounds(double left, double bottom, double right, double top, double buffer) {
        return new Double[]{left + buffer, bottom + buffer, right - buffer, top - buffer};
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    private static Double[][] createRandomPointsInBounds(double left, double bottom, double right, double top, int numPoints) {
        var xRange = right - left;
        var yRange = top - bottom;
        return Stream.generate(() -> new Double[]{left + Math.random() * xRange,
                bottom + Math.random() * yRange})
                .limit(numPoints)
                .map(point -> reprojectPoint(point, 3857, 4326))
                .toArray(Double[][]::new);
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    private static Double[][] createGriddedPointsInBounds(double left, double bottom, double right, double top, double spacing) {
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

    private static Double[][] createRandomSampleSet(Double[] plotCenter, String plotShape, double plotSize, int samplesPerPlot) {
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

    private static Double[][] createGriddedSampleSet(Double[] plotCenter, String plotShape, double plotSize, double sampleResolution) {
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
    private static HashMap<String, Double[]> loadCsvPlotPoints(String filename) {
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
    private static HashMap<String, HashMap<String, Double[]>> loadCsvSamplePoints(String filename) {
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

    private static JsonElement getOrZero(JsonObject obj, String field) {
        return obj.get(field).isJsonNull() ? new JsonPrimitive(0) : obj.get(field);
    }

    private static JsonElement getOrEmptyString(JsonObject obj, String field) {
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

    private static void extractZipFileToGeoJson(int projectId, String plotsOrSamples) {
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
    private static HashMap<String, JsonObject> getGeoJsonPlotGeometries(int projectId) {
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
    private static HashMap<String, HashMap<String, JsonObject>> getGeoJsonSampleGeometries(int projectId) {
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
    private static HashMap<String, Double[]> getPlotGeometryCenters(HashMap<String, JsonObject> plotGeoms) {
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
    private static HashMap<String, HashMap<String, Double[]>> getSampleGeometryCenters(HashMap<String, HashMap<String, JsonObject>> sampleGeomsByPlot) {
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
                conn.prepareStatement("SELECT * FROM update_project_csv(?,?,?,?,?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))")) {
                
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
                                                            "classification_start_date", "classification_end_date",
                                                            "classification_timestep"});

            // Manually add the name and description fields since they may be invalid JSON
            newProject.addProperty("name", partToString(req.raw().getPart("name")));
            newProject.addProperty("description", partToString(req.raw().getPart("description")));
            newProject.addProperty("availability", "unpublished");

            var lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
            var latMin =             getOrZero(newProject,"latMin").getAsDouble();
            var lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
            var latMax =             getOrZero(newProject,"latMax").getAsDouble();
            newProject.addProperty("boundary", makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());

            var SQL = "SELECT * FROM create_project(?,?,?,?,?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),?,?,?,?,?,?,?,?,?,?::JSONB,?,?,?)";
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
                
                // FIXME not implimented in JS or JSON
                // pstmt.setDate(16,  new java.sql.Date(newProject.get("classification_start_date").getAsLong()));
                // pstmt.setDate(17, new java.sql.Date(newProject.get("classification_end_date").getAsLong()));
                // pstmt.setInt(18, newProject.get("classification_timestep").getAsInt());
                pstmt.setDate(17,  null);
                pstmt.setDate(18, null);
                pstmt.setInt(19, 0);

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
