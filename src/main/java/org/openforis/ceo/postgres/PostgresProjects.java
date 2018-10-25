package org.openforis.ceo.postgres;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.partsToJsonObject;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.PrecisionModel;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.time.LocalDate;
import java.util.Map;
import java.util.function.Function;
import java.util.function.IntSupplier;
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

    public String getAllProjects(Request req, Response res) {
        var userId = req.queryParams("userId");
        var institutionId = req.queryParams("institutionId");

        
        // var SQL = prepareGetAllProjectsQuery(userId, institutionId).toString();
        
        try (var conn = connect()) {
            var pstmt = conn.prepareStatement("");

            var editable = false;

            if (userId == null || userId.isEmpty()) {
                if (institutionId == null || institutionId.isEmpty()) {
                    pstmt = conn.prepareStatement("SELECT * FROM select_all_projects()");
                } else {
                    pstmt = conn.prepareStatement("SELECT * FROM select_all_institution_projects(?)");
                    pstmt.setInt(1, Integer.parseInt(institutionId));
                }
            } else {
                if (institutionId == null || institutionId.isEmpty()) {
                    pstmt = conn.prepareStatement("SELECT * FROM select_all_user_projects(?)");
                    pstmt.setInt(1, Integer.parseInt(userId));
                } else {
                    pstmt = conn.prepareStatement("SELECT * FROM select_institution_projects_with_roles(?,?)");
                    pstmt.setInt(1, Integer.parseInt(userId));
                    pstmt.setInt(2, Integer.parseInt(institutionId));
                }
            }

            var allProjects = new JsonArray();
            var rs = pstmt.executeQuery();
            while(rs.next()) {
                var newProject = new JsonObject();
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
                newProject.addProperty("csv", rs.getString("csv_file"));
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

                newProject.addProperty("editable", editable);

                allProjects.add(newProject);
            }
            return allProjects.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "[]";
        }
    }


    public String getProjectById(Request req, Response res) {
        var projectId = req.params(":id");
        var project = new JsonObject();

        try (var conn = connect()) {
            var SQL = "SELECT * FROM select_project(?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
            if(rs.next()) {
                project.addProperty("id", rs.getInt("id"));
                project.addProperty("institution", rs.getInt("institution_id"));
                project.addProperty("availability", rs.getString("availability"));
                project.addProperty("name", rs.getString("name"));
                project.addProperty("description", rs.getString("description"));
                project.addProperty("privacyLevel", rs.getString("privacy_level"));
                project.addProperty("boundary", rs.getString("boundary"));
                project.addProperty("baseMapSource", rs.getString("base_map_source"));
                project.addProperty("plotDistribution", rs.getString("plot_distribution"));
                project.addProperty("numPlots", rs.getInt("num_plots"));
                project.addProperty("plotSpacing", rs.getFloat("plot_spacing"));
                project.addProperty("plotShape", rs.getString("plot_shape"));
                project.addProperty("plotSize", rs.getFloat("plot_size"));
                project.addProperty("csv", rs.getString("csv_file"));
                project.addProperty("archived", false);
                project.addProperty("sampleDistribution", rs.getString("sample_distribution"));
                project.addProperty("samplesPerPlot", rs.getInt("samples_per_plot"));
                project.addProperty("sampleResolution", rs.getFloat("sample_resolution"));
                project.add("sampleValues", parseJson(rs.getString("sample_survey")).getAsJsonArray());

                var classificationStartDate = rs.getDate("classification_start_date");
                var classificationEndDate = rs.getDate("classification_end_date");
                project.addProperty("classification_start_date", safeDateToString(classificationStartDate));
                project.addProperty("classification_end_date", safeDateToString(classificationEndDate));
                project.addProperty("classification_timestep", rs.getInt("classification_timestep"));
                // FIXME: if editable is needed, add to table and function
                // project.addProperty("editable", rs.getBoolean("editable"));

                return project.toString();

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
                // // FIXME: if editable is needed, add to table and function
                // // project.addProperty("editable", rs.getBoolean("editable"));
                return project.toString();
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public  String getProjectPlots(Request req, Response res) {
        var projectId = req.params(":id");
        var maxPlots = Integer.parseInt(req.params(":max"));
        
        try (var conn = connect()) {
            var plots = new JsonArray();
            var SQL = "SELECT * FROM select_project_plots(?,?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(projectId));
            pstmt.setInt(2,maxPlots);
            var rs = pstmt.executeQuery();
            while (rs.next()) {
                var singlePlot = new JsonObject();
                singlePlot.addProperty("id",rs.getInt("id"));
                singlePlot.addProperty("projectId",Integer.parseInt(projectId));
                singlePlot.addProperty("center",rs.getString("center"));
                singlePlot.addProperty("flagged",rs.getInt("flagged") == 0 ? false : true);
                singlePlot.addProperty("analysis",rs.getInt("assigned"));
                singlePlot.addProperty("user",rs.getString("username"));
                // singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt()));
                // singlePlot.add("samples", new JsonArray());

                plots.add(singlePlot);
            }
            return  plots.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    private static JsonArray getSampleJsonArray(Integer plot_id) {

        var sampleSQL = "SELECT * FROM select_plot_samples(?)";
        try (var conn = connect()) {
            var samplePstmt = conn.prepareStatement(sampleSQL) ;
            samplePstmt.setInt(1, plot_id);
            var sampleRs = samplePstmt.executeQuery();
            var samples = new JsonArray();
            while (sampleRs.next()) {
                var sample = new JsonObject();
                sample.addProperty("id", sampleRs.getString("id"));
                sample.addProperty("point", sampleRs.getString("point"));
                if (sampleRs.getString("value").length() > 2) sample.add("value", parseJson(sampleRs.getString("value")).getAsJsonObject());
                samples.add(sample);
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
        try (var conn = connect()) {
            var SQL = "SELECT * FROM select_project_statistics(?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
            if (rs.next()){
                stats.addProperty("flaggedPlots",rs.getInt("flagged_plots"));
                stats.addProperty("assignedPlots",rs.getInt("assigned_plots"));
                stats.addProperty("unassignedPlots",rs.getInt("unassigned_plots"));
                stats.addProperty("members",rs.getInt("members"));
                stats.addProperty("contributors",rs.getInt("contributors"));
            }
            return  stats.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public  String getUnassignedPlot(Request req, Response res) {
        var projectId = req.params(":id");
        var currentPlotId = req.queryParamOrDefault("currentPlotId", "0");
         
        try (var conn = connect()) {
            var singlePlot = new JsonObject();
            var SQL = "SELECT * FROM select_unassigned_plot(?,?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(projectId));
            pstmt.setInt(2,Integer.parseInt(currentPlotId));
            var rs = pstmt.executeQuery();
            if (rs.next()) {     
                singlePlot.addProperty("id",rs.getInt("id"));
                singlePlot.addProperty("projectId",Integer.parseInt(projectId));
                singlePlot.addProperty("center",rs.getString("center"));
                singlePlot.addProperty("flagged",rs.getInt("flagged") == 0 ? false : true);
                singlePlot.addProperty("analysis",rs.getInt("assigned"));
                singlePlot.addProperty("user",rs.getString("username"));
                singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt()));
            }
            return  singlePlot.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public  String getUnassignedPlotById(Request req, Response res) {
        var projectId = req.params(":projid");
        var plotId = req.params(":id");

        try (var conn = connect()) {
            var singlePlot = new JsonObject();
            var SQL = "SELECT * FROM select_unassigned_plots_by_plot_id(?,?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(projectId));
            pstmt.setInt(2,Integer.parseInt(plotId));
            var rs = pstmt.executeQuery();
            if (rs.next()) {
                singlePlot.addProperty("id",rs.getInt("id"));
                singlePlot.addProperty("projectId",Integer.parseInt(projectId));
                singlePlot.addProperty("center",rs.getString("center"));
                singlePlot.addProperty("flagged",rs.getInt("flagged") == 0 ? false : true);
                singlePlot.addProperty("analysis",rs.getInt("assigned"));
                singlePlot.addProperty("user",rs.getString("username"));
                singlePlot.add("samples",getSampleJsonArray(singlePlot.get("id").getAsInt()));
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
        try (var conn = connect()) {
            var SQL = "SELECT * FROM select_project(?)";
            var pstmt = conn.prepareStatement(SQL);
            pstmt.setInt(1,Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
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

        try (var conn = connect()) {
            var csvContent = "";
            var SQL = "SELECT * FROM select_project(?)";
            var pstmt = conn.prepareStatement(SQL);
            pstmt.setInt(1,Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
            if (rs.next()){
                var SqlDump = "SELECT * FROM dump_project_sample_data(?)";
                var pstmtDump = conn.prepareStatement(SqlDump) ;
                pstmtDump.setInt(1,Integer.parseInt(projectId));
                var rsDump = pstmtDump.executeQuery();
                
                while (rsDump.next()) {
                    csvContent = csvContent + 
                            rsDump.getString("plot_id") +","+
                            rsDump.getString("sample_id") +","+
                            rsDump.getString("lon") +","+
                            rsDump.getString("lat") +","+
                            rsDump.getBoolean("flagged") +","+
                            rsDump.getBoolean("assigned") +","+
                            valueOrBlank(rsDump.getString("email")) +","+
                            valueOrBlank(rsDump.getString("collection_time")) +","+
                            JsonKeytoString(valueOrBlank(rsDump.getString("value")), "LULC") +","+
                            "\n";
                } 

            } else {
                res.raw().setStatus(SC_NO_CONTENT);
                return res.raw();
            }

            var fields = new String[]{"plot_id", "sample_id", "lon", "lat", "flagged", "analyses", "user_id", "timestamp", "LULC"};
            var csvHeader = Arrays.stream(fields).map(String::toUpperCase).collect(Collectors.joining(","));

            var projectName = rs.getString("name").replace(" ", "-").replace(",", "").toLowerCase();
            var currentDate = LocalDate.now().toString();
            var outputFileName = "ceo-" + projectName + "-sample-data-" + currentDate;
            
            return writeCsvFile(res.raw(), csvHeader, csvContent, outputFileName);

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return res.raw();
        }
    }

    public String publishProject(Request req, Response res) {
        var projectId = req.params(":id");
        try (var conn = connect()) {
            var SQL = "SELECT * FROM publish_project(?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
            var idReturn = "";
            if (rs.next()) {
                idReturn = Integer.toString(rs.getInt("publish_project"));
            }
            return "" + idReturn;
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String closeProject(Request req, Response res) {
        var projectId = req.params(":id");
        try (var conn = connect()) {
            var SQL = "SELECT * FROM close_project(?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
            var idReturn = "";
            if (rs.next()) {
                idReturn = Integer.toString(rs.getInt("close_project"));
            }
            return "" + idReturn;
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String archiveProject(Request req, Response res) {
        var projectId = req.params(":id");
        try (var conn = connect()) {
            var SQL = "SELECT * FROM archive_project(?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(projectId));
            var rs = pstmt.executeQuery();
            var idReturn = "";
            if (rs.next()) {
                idReturn = Integer.toString(rs.getInt("archive_project"));
            }
            return "" + idReturn;
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String addUserSamples(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var projectId = jsonInputs.get("projectId").getAsString();
        var plotId = jsonInputs.get("plotId").getAsString();
        var userName = jsonInputs.get("userId").getAsString();
        // var confidence = jsonInputs.get("confidence").getAsString();
        // var imageryId = jsonInputs.get("imagery_id").getAsString();
        // var imageryDate = new Date(jsonInputs.get("imagery_date").getAsLong());
        // var value = jsonInputs.get("value").getAsJsonObject();
        var userSamples = jsonInputs.get("userSamples").getAsJsonObject();

        try (var conn = connect()) {
            var userSQL = "SELECT * FROM get_user(?)";
            var userPstmt = conn.prepareStatement(userSQL);
            userPstmt.setString(1, userName);
            var userRs = userPstmt.executeQuery();
            if (userRs.next()){
                var userId = userRs.getInt("id");
                var SQL = "SELECT * FROM add_user_samples(?,?,?,?,?::jsonb,?,?)";
                var pstmt = conn.prepareStatement(SQL) ;
                pstmt.setInt(1, Integer.parseInt(projectId));
                pstmt.setInt(2, Integer.parseInt(plotId));
                pstmt.setInt(3, userId);
                pstmt.setInt(4, 100); //confidence
                pstmt.setString(5, userSamples.toString());
                pstmt.setObject(6, null); //imageryID
                pstmt.setDate(7, new java.sql.Date(System.currentTimeMillis()) );
                var rs = pstmt.executeQuery();
            }
            return "";
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String flagPlot(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var plotId = jsonInputs.get("plotId").getAsString();
        var collectionTime = new Timestamp(System.currentTimeMillis());
        var userName = jsonInputs.get("userId").getAsString();
        try (var conn = connect()) {
            var SQL = "SELECT * FROM flag_plot(?,?,?)";
            var pstmt = conn.prepareStatement(SQL) ;
            pstmt.setInt(1,Integer.parseInt(plotId));
            pstmt.setString(2,userName);
            pstmt.setTimestamp(3,collectionTime);
            var rs = pstmt.executeQuery();
            var idReturn = "";
            if (rs.next()) {
                idReturn = Integer.toString(rs.getInt("flag_plot"));
            }

            return "" + idReturn;

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

    // NOTE: The CSV file should contain a header row (which will be skipped) and these fields: lon, lat, ...
    private static Double[][] loadCsvPoints(String filename) {
        try (var lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            return lines.skip(1)
                .map(line -> {
                        var fields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                        return new Double[]{Double.parseDouble(fields[0]),
                                            Double.parseDouble(fields[1])};
                    })
                .toArray(Double[][]::new);
        } catch (Exception e) {
            throw new RuntimeException(e);
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

    private static void createProjectPlots(JsonObject newProject) {
        // Store the parameters needed for plot generation in local variables with nulls set to 0
        var lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
        var latMin =             getOrZero(newProject,"latMin").getAsDouble();
        var lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
        var latMax =             getOrZero(newProject,"latMax").getAsDouble();
        var plotDistribution =   newProject.get("plotDistribution").getAsString();
        var numPlots =              getOrZero(newProject,"numPlots").getAsInt();
        var plotSpacing =        getOrZero(newProject,"plotSpacing").getAsDouble();
        var plotShape =          newProject.get("plotShape").getAsString();
        var plotSize =           newProject.get("plotSize").getAsDouble();
        var sampleDistribution = newProject.get("sampleDistribution").getAsString();
        var samplesPerPlot =        getOrZero(newProject,"samplesPerPlot").getAsInt();
        var sampleResolution =   getOrZero(newProject,"sampleResolution").getAsDouble();

        // If plotDistribution is csv, calculate the lat/lon bounds from the csv contents
        var csvPoints = new Double[][]{};
        if (plotDistribution.equals("csv")) {
            csvPoints = loadCsvPoints(newProject.get("csv").getAsString());
            var csvBounds = calculateBounds(csvPoints, plotSize / 2.0);
            lonMin = csvBounds[0];
            latMin = csvBounds[1];
            lonMax = csvBounds[2];
            latMax = csvBounds[3];
            try (var conn = connect()) {
                var Sql = "SELECT * FROM update_project_csv(?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))";
                var pstmt = conn.prepareStatement(Sql) ;
                pstmt.setInt(1,Integer.parseInt(newProject.get("projId").getAsString()));     
                pstmt.setString(2, newProject.get("csv").getAsString());
                pstmt.setString(3, makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());
                pstmt.execute();
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }

        }

        // Convert the lat/lon boundary coordinates to Web Mercator (units: meters) and apply an interior buffer of plotSize / 2
        var bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
        var paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], plotSize / 2.0);
        var left = paddedBounds[0];
        var bottom = paddedBounds[1];
        var right = paddedBounds[2];
        var top = paddedBounds[3];

        // Generate the plot objects and their associated sample points
        var newPlotCenters = plotDistribution.equals("random") ? createRandomPointsInBounds(left, bottom, right, top, numPlots)
            : plotDistribution.equals("gridded") ? createGriddedPointsInBounds(left, bottom, right, top, plotSpacing)
            : csvPoints;

        try (var conn = connect()) {
            Arrays.stream(newPlotCenters)
            .forEach(plotCenter -> {
                    try {
                        var SqlPlots = "SELECT * FROM create_project_plots(?,?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))";
                        var pstmtPlots = conn.prepareStatement(SqlPlots) ;
                        pstmtPlots.setInt(1,Integer.parseInt(newProject.get("projId").getAsString()));
                        pstmtPlots.setInt(2, 0);            
                        pstmtPlots.setString(3, makeGeoJsonPoint(plotCenter[0], plotCenter[1] ).toString());
                        var rsPlots = pstmtPlots.executeQuery();
                        if (rsPlots.next()) {
                            var newPlotId = rsPlots.getInt("create_project_plots");
                            var newSamplePoints = sampleDistribution.equals("gridded")
                                ? createGriddedSampleSet(plotCenter, plotShape, plotSize, sampleResolution)
                                : createRandomSampleSet(plotCenter, plotShape, plotSize, samplesPerPlot);

                            Arrays.stream(newSamplePoints)
                                .forEach(point -> {
                                    try {
                                        var SqlSamples = "SELECT * FROM create_project_plot_samples(?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))";
                                        var pstmtSamples = conn.prepareStatement(SqlSamples) ;
                                        pstmtSamples.setInt(1,newPlotId);
                                        pstmtSamples.setString(2,makeGeoJsonPoint(point[0], point[1]).toString());
                                        pstmtSamples.execute();
                                    } catch (SQLException e) {
                                        System.out.println(e.getMessage());
                                    }
                            });
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

             // Store the lat/lon bounding box coordinates as GeoJSON
            var lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
            var latMin =             getOrZero(newProject,"latMin").getAsDouble();
            var lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
            var latMax =             getOrZero(newProject,"latMax").getAsDouble();
            newProject.addProperty("boundary", makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());

            try (var conn = connect()) {
                var SQL = "SELECT * FROM create_project(?,?,?,?,?,ST_SetSRID(ST_GeomFromGeoJSON(?), 4326),?,?,?,?,?,?,?,?,?,?::JSONB,?::Date,?::Date,?)";
                var pstmt = conn.prepareStatement(SQL);
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
                // pstmt.setDate(17,  new java.sql.Date(newProject.get("classification_start_date").getAsLong()));
                // pstmt.setDate(18, new java.sql.Date(newProject.get("classification_end_date").getAsLong()));
                // pstmt.setInt(19, newProject.get("classification_timestep").getAsInt());
                pstmt.setDate(17,  new java.sql.Date(System.currentTimeMillis()));
                pstmt.setDate(18, new java.sql.Date(System.currentTimeMillis()));
                pstmt.setInt(19, 0);

                var rs = pstmt.executeQuery();
                var newProjectId = "";
                if (rs.next()){
                    newProjectId = Integer.toString(rs.getInt("create_project"));
                    newProject.addProperty("projId", newProjectId);
                    
                    // Upload the plot-distribution-csv-file if one was provided
                    // not stored in database
                    if (newProject.get("plotDistribution").getAsString().equals("csv")) {
                        var csvFileName = writeFilePart(req,
                                "plot-distribution-csv-file",
                                expandResourcePath("/csv"),
                                "project-" + newProjectId);
                        newProject.addProperty("csv", csvFileName);

                    } else {
                        newProject.add("csv", null);
                    }
                    // Create the requested plot set and write it to plot-data-<newProjectId>.json
                    createProjectPlots(newProject);
                }
                // Indicate that the project was created successfully
                return newProjectId;

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
