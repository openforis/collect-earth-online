package org.openforis.ceo.postgres;

import static javax.servlet.http.HttpServletResponse.SC_NO_CONTENT;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
import static org.openforis.ceo.utils.JsonUtils.filterJsonArray;
import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.flatMapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.intoJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonFile;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.toElementStream;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;
import static org.openforis.ceo.utils.PartUtils.partToString;
import static org.openforis.ceo.utils.PartUtils.partsToJsonObject;
import static org.openforis.ceo.utils.PartUtils.writeFilePart;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.Point;
import com.vividsolutions.jts.geom.PrecisionModel;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.Date;
import java.util.Map.Entry;
import java.util.function.Function;
import java.util.function.IntSupplier;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.MultipartConfigElement;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.opengis.referencing.operation.MathTransform;
import spark.Request;
import spark.Response;
import org.openforis.ceo.db_api.Projects;

public class PostgresProjects implements Projects {
    private final String url = "jdbc:postgresql://localhost";
    private final String user = "ceo";
    private final String password = "ceo";
    public  String getAllProjects(Request req, Response res) {
        String userId = req.queryParams("userId");
        String institutionId = req.queryParams("institutionId");
        if (userId == null || userId.isEmpty()) {
            JsonObject all_projects = new JsonObject();
            PreparedStatement pstmt=null;
            try {
                Connection conn = this.connect();
                if (institutionId == null || institutionId.isEmpty()) {
                    String SQL = "SELECT * FROM select_all_projects()";
                     pstmt = conn.prepareStatement(SQL) ;
                } else {
                    String SQL = "SELECT * FROM select_all_institution_projects(?)";
                     pstmt = conn.prepareStatement(SQL) ;
                    pstmt.setInt(1,Integer.parseInt(institutionId));
                }

                ResultSet rs = pstmt.executeQuery();
                all_projects.addProperty("id",rs.getInt("id"));
                all_projects.addProperty("institution_id",rs.getInt("institution_id"));
                all_projects.addProperty("availability",rs.getString("availability"));
                all_projects.addProperty("name",rs.getString("name"));
                all_projects.addProperty("description",rs.getString("description"));
                all_projects.addProperty("privacy_level",rs.getString("privacy_level"));
                all_projects.addProperty("boundary",rs.getString("boundary"));
                all_projects.addProperty("base_map_source",rs.getString("base_map_source"));
                all_projects.addProperty("plot_distribution",rs.getString("plot_distribution"));
                all_projects.addProperty("num_plots",rs.getInt("num_plots"));
                all_projects.addProperty("plot_spacing",rs.getFloat("plot_spacing"));
                all_projects.addProperty("plot_shape",rs.getString("plot_shape"));
                all_projects.addProperty("plot_size",rs.getFloat("plot_size"));
                all_projects.addProperty("sample_distribution",rs.getString("sample_distribution"));
                all_projects.addProperty("samples_per_plot",rs.getInt("samples_per_plot"));
                all_projects.addProperty("sample_resolution",rs.getFloat("sample_resolution"));
                JsonArray sample_survey = new JsonArray();
                String sample_surveyJson = rs.getString("sample_survey");
                sample_survey.add(sample_surveyJson);
                all_projects.add("sample_survey", sample_survey);
                Date classification_start_date = rs.getDate("classification_start_date");
                Date classification_end_date = rs.getDate("classification_end_date");

                all_projects.addProperty("classification_start_date",classification_start_date.toString());
                all_projects.addProperty("classification_end_date",classification_end_date.toString());
                all_projects.addProperty("classification_timestep",rs.getInt("classification_timestep"));
                all_projects.addProperty("editable",rs.getBoolean("editable"));
                return  all_projects.toString();
            }
            catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        }
        else{
            try {
                Connection conn = this.connect();

                PreparedStatement pstmt_users = null;
                if (institutionId == null || institutionId.isEmpty()) {
                    String SQL = "SELECT * FROM select_all_user_projects(?)";
                    pstmt_users = conn.prepareStatement(SQL) ;
                    pstmt_users.setInt(1, Integer.parseInt(userId));

                } else {
                    String SQL = "SELECT * FROM select_all_user_institution_projects(?,?)";
                    pstmt_users = conn.prepareStatement(SQL) ;
                    pstmt_users.setInt(1,Integer.parseInt(userId));
                    pstmt_users.setInt(2,Integer.parseInt(institutionId));

                }
                ResultSet rs = pstmt_users.executeQuery();

                JsonObject all_projects = new JsonObject();
                all_projects.addProperty("id",rs.getInt("id"));
                all_projects.addProperty("institution_id",rs.getInt("institution_id"));
                all_projects.addProperty("availability",rs.getString("availability"));
                all_projects.addProperty("name",rs.getString("name"));
                all_projects.addProperty("description",rs.getString("description"));
                all_projects.addProperty("privacy_level",rs.getString("privacy_level"));
                all_projects.addProperty("boundary",rs.getString("boundary"));
                all_projects.addProperty("base_map_source",rs.getString("base_map_source"));
                all_projects.addProperty("plot_distribution",rs.getString("plot_distribution"));
                all_projects.addProperty("num_plots",rs.getInt("num_plots"));
                all_projects.addProperty("plot_spacing",rs.getFloat("plot_spacing"));
                all_projects.addProperty("plot_shape",rs.getString("plot_shape"));
                all_projects.addProperty("plot_size",rs.getFloat("plot_size"));
                all_projects.addProperty("sample_distribution",rs.getString("sample_distribution"));
                all_projects.addProperty("samples_per_plot",rs.getInt("samples_per_plot"));
                all_projects.addProperty("sample_resolution",rs.getFloat("sample_resolution"));
                JsonArray sample_survey = new JsonArray();
                String sample_surveyJson = rs.getString("sample_survey");
                sample_survey.add(sample_surveyJson);
                all_projects.add("sample_survey", sample_survey);
                Date classification_start_date = rs.getDate("classification_start_date");
                Date classification_end_date = rs.getDate("classification_end_date");

                all_projects.addProperty("classification_start_date",classification_start_date.toString());
                all_projects.addProperty("classification_end_date",classification_end_date.toString());
                all_projects.addProperty("classification_timestep",rs.getInt("classification_timestep"));
                all_projects.addProperty("editable",rs.getBoolean("editable"));
                return  all_projects.toString();
            } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        }

        return "";
    }

    public String getProjectById(Request req, Response res) {
        String projectId = req.params(":id");
        return "";

    }

    public  String getProjectPlots(Request req, Response res) {
        String projectId = req.params(":id");
        int maxPlots = Integer.parseInt(req.params(":max"));

        return "";
    }

    private  String[] getProjectUsers(String projectId) {


        return  new String[1];
    }

    public  String getProjectStats(Request req, Response res) {
        return  "";
    }

    public  String getUnanalyzedPlot(Request req, Response res) {
        return "";
    }

    public  String getUnanalyzedPlotById(Request req, Response res) {
        return "";
    }

    private static Collector<String, ?, Map<String, Long>> countDistinct =
            Collectors.groupingBy(Function.identity(), Collectors.counting());

    private static String[] getValueDistributionLabels(JsonObject project) {
        return new String[0];
    }

    private static Map<Integer, String> getSampleValueTranslations(JsonObject project) {
        return new Map<Integer, String>() {
            @Override
            public int size() {
                return 0;
            }

            @Override
            public boolean isEmpty() {
                return false;
            }

            @Override
            public boolean containsKey(Object key) {
                return false;
            }

            @Override
            public boolean containsValue(Object value) {
                return false;
            }

            @Override
            public String get(Object key) {
                return null;
            }

            @Override
            public String put(Integer key, String value) {
                return null;
            }

            @Override
            public String remove(Object key) {
                return null;
            }

            @Override
            public void putAll(Map<? extends Integer, ? extends String> m) {

            }

            @Override
            public void clear() {

            }

            @Override
            public Set<Integer> keySet() {
                return null;
            }

            @Override
            public Collection<String> values() {
                return null;
            }

            @Override
            public Set<Entry<Integer, String>> entrySet() {
                return null;
            }
        };
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

        try (OutputStream os = response.getOutputStream()) {
            os.write((header + "\n").getBytes());
            os.write(content.getBytes());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        return response;
    }

    public  HttpServletResponse dumpProjectAggregateData(Request req, Response res) {
        String projectId = req.params(":id");
      return new HttpServletResponse() {
          @Override
          public void addCookie(Cookie cookie) {

          }

          @Override
          public boolean containsHeader(String s) {
              return false;
          }

          @Override
          public String encodeURL(String s) {
              return null;
          }

          @Override
          public String encodeRedirectURL(String s) {
              return null;
          }

          @Override
          public String encodeUrl(String s) {
              return null;
          }

          @Override
          public String encodeRedirectUrl(String s) {
              return null;
          }

          @Override
          public void sendError(int i, String s) throws IOException {

          }

          @Override
          public void sendError(int i) throws IOException {

          }

          @Override
          public void sendRedirect(String s) throws IOException {

          }

          @Override
          public void setDateHeader(String s, long l) {

          }

          @Override
          public void addDateHeader(String s, long l) {

          }

          @Override
          public void setHeader(String s, String s1) {

          }

          @Override
          public void addHeader(String s, String s1) {

          }

          @Override
          public void setIntHeader(String s, int i) {

          }

          @Override
          public void addIntHeader(String s, int i) {

          }

          @Override
          public void setStatus(int i) {

          }

          @Override
          public void setStatus(int i, String s) {

          }

          @Override
          public int getStatus() {
              return 0;
          }

          @Override
          public String getHeader(String s) {
              return null;
          }

          @Override
          public Collection<String> getHeaders(String s) {
              return null;
          }

          @Override
          public Collection<String> getHeaderNames() {
              return null;
          }

          @Override
          public String getCharacterEncoding() {
              return null;
          }

          @Override
          public String getContentType() {
              return null;
          }

          @Override
          public ServletOutputStream getOutputStream() throws IOException {
              return null;
          }

          @Override
          public PrintWriter getWriter() throws IOException {
              return null;
          }

          @Override
          public void setCharacterEncoding(String s) {

          }

          @Override
          public void setContentLength(int i) {

          }

          @Override
          public void setContentLengthLong(long l) {

          }

          @Override
          public void setContentType(String s) {

          }

          @Override
          public void setBufferSize(int i) {

          }

          @Override
          public int getBufferSize() {
              return 0;
          }

          @Override
          public void flushBuffer() throws IOException {

          }

          @Override
          public void resetBuffer() {

          }

          @Override
          public boolean isCommitted() {
              return false;
          }

          @Override
          public void reset() {

          }

          @Override
          public void setLocale(Locale locale) {

          }

          @Override
          public Locale getLocale() {
              return null;
          }
      };
    }

    public HttpServletResponse dumpProjectRawData(Request req, Response res) {
        String projectId = req.params(":id");
       return new HttpServletResponse() {
           @Override
           public void addCookie(Cookie cookie) {

           }

           @Override
           public boolean containsHeader(String s) {
               return false;
           }

           @Override
           public String encodeURL(String s) {
               return null;
           }

           @Override
           public String encodeRedirectURL(String s) {
               return null;
           }

           @Override
           public String encodeUrl(String s) {
               return null;
           }

           @Override
           public String encodeRedirectUrl(String s) {
               return null;
           }

           @Override
           public void sendError(int i, String s) throws IOException {

           }

           @Override
           public void sendError(int i) throws IOException {

           }

           @Override
           public void sendRedirect(String s) throws IOException {

           }

           @Override
           public void setDateHeader(String s, long l) {

           }

           @Override
           public void addDateHeader(String s, long l) {

           }

           @Override
           public void setHeader(String s, String s1) {

           }

           @Override
           public void addHeader(String s, String s1) {

           }

           @Override
           public void setIntHeader(String s, int i) {

           }

           @Override
           public void addIntHeader(String s, int i) {

           }

           @Override
           public void setStatus(int i) {

           }

           @Override
           public void setStatus(int i, String s) {

           }

           @Override
           public int getStatus() {
               return 0;
           }

           @Override
           public String getHeader(String s) {
               return null;
           }

           @Override
           public Collection<String> getHeaders(String s) {
               return null;
           }

           @Override
           public Collection<String> getHeaderNames() {
               return null;
           }

           @Override
           public String getCharacterEncoding() {
               return null;
           }

           @Override
           public String getContentType() {
               return null;
           }

           @Override
           public ServletOutputStream getOutputStream() throws IOException {
               return null;
           }

           @Override
           public PrintWriter getWriter() throws IOException {
               return null;
           }

           @Override
           public void setCharacterEncoding(String s) {

           }

           @Override
           public void setContentLength(int i) {

           }

           @Override
           public void setContentLengthLong(long l) {

           }

           @Override
           public void setContentType(String s) {

           }

           @Override
           public void setBufferSize(int i) {

           }

           @Override
           public int getBufferSize() {
               return 0;
           }

           @Override
           public void flushBuffer() throws IOException {

           }

           @Override
           public void resetBuffer() {

           }

           @Override
           public boolean isCommitted() {
               return false;
           }

           @Override
           public void reset() {

           }

           @Override
           public void setLocale(Locale locale) {

           }

           @Override
           public Locale getLocale() {
               return null;
           }
       };
    }

    public String publishProject(Request req, Response res) {
        String projectId = req.params(":id");

        return "";
    }

    public String closeProject(Request req, Response res) {
        String projectId = req.params(":id");

        return "";
    }

    public String archiveProject(Request req, Response res) {
        String projectId = req.params(":id");

        return "";
    }

    public String addUserSamples(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();
        String userName = jsonInputs.get("userId").getAsString();
        JsonObject userSamples = jsonInputs.get("userSamples").getAsJsonObject();

        return "";
    }

    public synchronized String flagPlot(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String projectId = jsonInputs.get("projectId").getAsString();
        String plotId = jsonInputs.get("plotId").getAsString();
        String userName = jsonInputs.get("userId").getAsString();

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

    private static Double[] reprojectPoint(Double[] point, int fromEPSG, int toEPSG) {
        try {
            Point oldPoint = (new GeometryFactory(new PrecisionModel(), fromEPSG)).createPoint(new Coordinate(point[0], point[1]));
            CoordinateReferenceSystem sourceCRS = CRS.decode("EPSG:" + fromEPSG, true);
            CoordinateReferenceSystem targetCRS = CRS.decode("EPSG:" + toEPSG, true);
            MathTransform transform = CRS.findMathTransform(sourceCRS, targetCRS);
            Coordinate newPoint = JTS.transform(oldPoint, transform).getCoordinate();
            return new Double[]{newPoint.x, newPoint.y};
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Double[] reprojectBounds(double left, double bottom, double right, double top, int fromEPSG, int toEPSG) {
        Double[] lowerLeft = reprojectPoint(new Double[]{left, bottom}, fromEPSG, toEPSG);
        Double[] upperRight = reprojectPoint(new Double[]{right, top}, fromEPSG, toEPSG);
        return new Double[]{lowerLeft[0], lowerLeft[1], upperRight[0], upperRight[1]};
    }

    private static Double[] padBounds(double left, double bottom, double right, double top, double buffer) {
        return new Double[]{left + buffer, bottom + buffer, right - buffer, top - buffer};
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    private static Double[][] createRandomPointsInBounds(double left, double bottom, double right, double top, int numPoints) {
        double xRange = right - left;
        double yRange = top - bottom;
        return Stream.generate(() -> new Double[]{left + Math.random() * xRange,
                bottom + Math.random() * yRange})
                .limit(numPoints)
                .map(point -> reprojectPoint(point, 3857, 4326))
                .toArray(Double[][]::new);
    }

    // NOTE: Inputs are in Web Mercator and outputs are in WGS84 lat/lon
    private static Double[][] createGriddedPointsInBounds(double left, double bottom, double right, double top, double spacing) {
        double xRange = right - left;
        double yRange = top - bottom;
        long xSteps = (long) Math.floor(xRange / spacing);
        long ySteps = (long) Math.floor(yRange / spacing);
        double xPadding = (xRange - xSteps * spacing) / 2.0;
        double yPadding = (yRange - ySteps * spacing) / 2.0;
        return Stream.iterate(left + xPadding, x -> x + spacing)
                .limit(xSteps + 1)
                .flatMap(x -> Stream.iterate(bottom + yPadding, y -> y + spacing)
                        .limit(ySteps + 1)
                        .map(y -> reprojectPoint(new Double[]{x, y}, 3857, 4326)))
                .toArray(Double[][]::new);
    }

    private static Double[][] createRandomSampleSet(Double[] plotCenter, String plotShape, double plotSize, int samplesPerPlot) {
        Double[] plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        double plotX =  plotCenterWebMercator[0];
        double plotY =  plotCenterWebMercator[1];
        double radius = plotSize / 2.0;
        double left =   plotX - radius;
        double right =  plotX + radius;
        double top =    plotY + radius;
        double bottom = plotY - radius;
        if (plotShape.equals("circle")) {
            return Stream.generate(() -> 2.0 * Math.PI * Math.random())
                    .limit(samplesPerPlot)
                    .map(offsetAngle -> {
                        double offsetMagnitude = radius * Math.random();
                        double xOffset = offsetMagnitude * Math.cos(offsetAngle);
                        double yOffset = offsetMagnitude * Math.sin(offsetAngle);
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
        Double[] plotCenterWebMercator = reprojectPoint(plotCenter, 4326, 3857);
        double centerX = plotCenterWebMercator[0];
        double centerY = plotCenterWebMercator[1];
        double radius = plotSize / 2.0;
        double radiusSquared = radius * radius;
        double left = centerX - radius;
        double bottom = centerY - radius;
        double right = centerX + radius;
        double top = centerY + radius;
        long steps = (long) Math.floor(plotSize / sampleResolution);
        double padding = (plotSize - steps * sampleResolution) / 2.0;
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
        try (Stream<String> lines = Files.lines(Paths.get(expandResourcePath("/csv/" + filename)))) {
            return lines.skip(1)
                    .map(line -> {
                        String[] fields = Arrays.stream(line.split(",")).map(String::trim).toArray(String[]::new);
                        return new Double[]{Double.parseDouble(fields[0]),
                                Double.parseDouble(fields[1])};
                    })
                    .toArray(Double[][]::new);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Double[] calculateBounds(Double[][] points, double buffer) {
        Double[] lons = Arrays.stream(points).map(point -> point[0]).toArray(Double[]::new);
        Double[] lats = Arrays.stream(points).map(point -> point[1]).toArray(Double[]::new);
        double lonMin = Arrays.stream(lons).min(Comparator.naturalOrder()).get();
        double latMin = Arrays.stream(lats).min(Comparator.naturalOrder()).get();
        double lonMax = Arrays.stream(lons).max(Comparator.naturalOrder()).get();
        double latMax = Arrays.stream(lats).max(Comparator.naturalOrder()).get();
        Double[] bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
        Double[] paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], -buffer);
        return reprojectBounds(paddedBounds[0], paddedBounds[1], paddedBounds[2], paddedBounds[3], 3857, 4326);
    }

    private static JsonElement getOrZero(JsonObject obj, String field) {
        return obj.get(field).isJsonNull() ? new JsonPrimitive(0) : obj.get(field);
    }

    private static synchronized JsonObject createProjectPlots(JsonObject newProject) {
        // Store the parameters needed for plot generation in local variables with nulls set to 0
        double lonMin =             getOrZero(newProject,"lonMin").getAsDouble();
        double latMin =             getOrZero(newProject,"latMin").getAsDouble();
        double lonMax =             getOrZero(newProject,"lonMax").getAsDouble();
        double latMax =             getOrZero(newProject,"latMax").getAsDouble();
        String plotDistribution =   newProject.get("plotDistribution").getAsString();
        int numPlots =              getOrZero(newProject,"numPlots").getAsInt();
        double plotSpacing =        getOrZero(newProject,"plotSpacing").getAsDouble();
        String plotShape =          newProject.get("plotShape").getAsString();
        double plotSize =           newProject.get("plotSize").getAsDouble();
        String sampleDistribution = newProject.get("sampleDistribution").getAsString();
        int samplesPerPlot =        getOrZero(newProject,"samplesPerPlot").getAsInt();
        double sampleResolution =   getOrZero(newProject,"sampleResolution").getAsDouble();

        // If plotDistribution is csv, calculate the lat/lon bounds from the csv contents
        Double[][] csvPoints = new Double[][]{};
        if (plotDistribution.equals("csv")) {
            csvPoints = loadCsvPoints(newProject.get("csv").getAsString());
            Double[] csvBounds = calculateBounds(csvPoints, plotSize / 2.0);
            lonMin = csvBounds[0];
            latMin = csvBounds[1];
            lonMax = csvBounds[2];
            latMax = csvBounds[3];
        }

        // Store the lat/lon bounding box coordinates as GeoJSON and remove their original fields
        newProject.addProperty("boundary", makeGeoJsonPolygon(lonMin, latMin, lonMax, latMax).toString());
        newProject.remove("lonMin");
        newProject.remove("latMin");
        newProject.remove("lonMax");
        newProject.remove("latMax");

        // Convert the lat/lon boundary coordinates to Web Mercator (units: meters) and apply an interior buffer of plotSize / 2
        Double[] bounds = reprojectBounds(lonMin, latMin, lonMax, latMax, 4326, 3857);
        Double[] paddedBounds = padBounds(bounds[0], bounds[1], bounds[2], bounds[3], plotSize / 2.0);
        double left = paddedBounds[0];
        double bottom = paddedBounds[1];
        double right = paddedBounds[2];
        double top = paddedBounds[3];

        // Generate the plot objects and their associated sample points
        Double[][] newPlotCenters = plotDistribution.equals("random") ? createRandomPointsInBounds(left, bottom, right, top, numPlots)
                : plotDistribution.equals("gridded") ? createGriddedPointsInBounds(left, bottom, right, top, plotSpacing)
                : csvPoints;
        IntSupplier plotIndexer = makeCounter();
        JsonArray newPlots = Arrays.stream(newPlotCenters)
                .map(plotCenter -> {
                    JsonObject newPlot = new JsonObject();
                    newPlot.addProperty("id", plotIndexer.getAsInt());
                    newPlot.addProperty("center", makeGeoJsonPoint(plotCenter[0], plotCenter[1]).toString());
                    newPlot.addProperty("flagged", false);
                    newPlot.addProperty("analyses", 0);
                    newPlot.add("user", null);

                    Double[][] newSamplePoints = sampleDistribution.equals("gridded")
                            ? createGriddedSampleSet(plotCenter, plotShape, plotSize, sampleResolution)
                            : createRandomSampleSet(plotCenter, plotShape, plotSize, samplesPerPlot);
                    IntSupplier sampleIndexer = makeCounter();
                    JsonArray newSamples = Arrays.stream(newSamplePoints)
                            .map(point -> {
                                JsonObject newSample = new JsonObject();
                                newSample.addProperty("id", sampleIndexer.getAsInt());
                                newSample.addProperty("point", makeGeoJsonPoint(point[0], point[1]).toString());
                                return newSample;
                            })
                            .collect(intoJsonArray);

                    newPlot.add("samples", newSamples);
                    return newPlot;
                })
                .collect(intoJsonArray);

        // Write the plot data to a new plot-data-<id>.json file
        writeJsonFile("plot-data-" + newProject.get("id").getAsString() + ".json", newPlots);

        // Update numPlots and samplesPerPlot to match the numbers that were generated
        newProject.addProperty("numPlots", newPlots.size());
        newProject.addProperty("samplesPerPlot", newPlots.get(0).getAsJsonObject().getAsJsonArray("samples").size());

        // Return the updated project object
        return newProject;
    }

    public synchronized String createProject(Request req, Response res) {
        try {
            // Create a new multipart config for the servlet
            // NOTE: This is for Jetty. Under Tomcat, this is handled in the webapp/META-INF/context.xml file.
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", new MultipartConfigElement(""));

            // Read the input fields into a new JsonObject (NOTE: fields will be camelCased)
            JsonObject newProject = partsToJsonObject(req,
                    new String[]{"institution", "privacy-level", "lon-min", "lon-max", "lat-min",
                            "lat-max", "base-map-source", "plot-distribution", "num-plots",
                            "plot-spacing", "plot-shape", "plot-size", "sample-distribution",
                            "samples-per-plot", "sample-resolution", "sample-values"});

            // Manually add the name and description fields since they may be invalid JSON
            newProject.addProperty("name", partToString(req.raw().getPart("name")));
            newProject.addProperty("description", partToString(req.raw().getPart("description")));

            // Read in the existing project list
            JsonArray projects = readJsonFile("project-list.json").getAsJsonArray();

            // Generate a new project id
            int newProjectId = getNextId(projects);
            newProject.addProperty("id", newProjectId);

            // Upload the plot-distribution-csv-file if one was provided
            if (newProject.get("plotDistribution").getAsString().equals("csv")) {
                String csvFileName = writeFilePart(req, "plot-distribution-csv-file", expandResourcePath("/csv"), "project-" + newProjectId);
                newProject.addProperty("csv", csvFileName);
            } else {
                newProject.add("csv", null);
            }

            // Add ids to the sampleValueGroups and sampleValues and clean up some of their unnecessary fields
            JsonArray sampleValueGroups = newProject.get("sampleValues").getAsJsonArray();
            IntSupplier sampleValueGroupIndexer = makeCounter();
            JsonArray updatedSampleValueGroups = mapJsonArray(sampleValueGroups,
                    sampleValueGroup -> {
                        sampleValueGroup.addProperty("id", sampleValueGroupIndexer.getAsInt());
                        sampleValueGroup.remove("$$hashKey");
                        sampleValueGroup.remove("object");
                        JsonArray sampleValues = sampleValueGroup.get("values").getAsJsonArray();
                        IntSupplier sampleValueIndexer = makeCounter();
                        JsonArray updatedSampleValues = mapJsonArray(sampleValues,
                                sampleValue -> {
                                    sampleValue.addProperty("id",
                                            sampleValueIndexer.getAsInt());
                                    sampleValue.remove("$$hashKey");
                                    sampleValue.remove("object");
                                    if (sampleValue.get("image").getAsString().equals("")) {
                                        sampleValue.add("image", null);
                                    }
                                    return sampleValue;
                                });
                        sampleValueGroup.add("values", updatedSampleValues);
                        return sampleValueGroup;
                    });
            newProject.add("sampleValues", updatedSampleValueGroups);

            // Add some missing fields that don't come from the web UI
            newProject.addProperty("archived", false);
            newProject.addProperty("availability", "unpublished");

            // Create the requested plot set and write it to plot-data-<newProjectId>.json
            JsonObject newProjectUpdated = createProjectPlots(newProject);

            // Write the new entry to project-list.json
            projects.add(newProjectUpdated);
            writeJsonFile("project-list.json", projects);

            // Indicate that the project was created successfully
            return newProjectId + "";
        } catch (Exception e) {
            // Indicate that an error occurred with project creation
            throw new RuntimeException(e);
        }
    }
    //Returns a connection to the database
    private Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }
}
