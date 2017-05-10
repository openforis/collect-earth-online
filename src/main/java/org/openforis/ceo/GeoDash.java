package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.net.URLDecoder;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.StreamSupport;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.*;

public class GeoDash {

    public static String geodashId(Request req, Response res) {
        JsonArray projects = readJsonFile("proj.json").getAsJsonArray();
        Optional<JsonObject> matchingProject = findInJsonArray(projects, project -> project.get("projectID").getAsString().equals(req.params(":id")));
        if (matchingProject.isPresent()) {
            JsonObject project = matchingProject.get();
            String dashboardJson = readJsonFile("dash-" + project.get("dashboard").getAsString() + ".json").toString();
            if (req.queryParams("callback") != null) {
                return req.queryParams("callback") + "(" + dashboardJson + ")";
            } else {
                return dashboardJson;
            }
        } else if (req.session().attribute("role") != null && req.session().attribute("role").equals("admin")) {
            String newUUID = UUID.randomUUID().toString();

            JsonObject newProject = new JsonObject();
            newProject.addProperty("projectID", req.params(":id"));
            newProject.addProperty("dashboard", newUUID);
            projects.add(newProject);

            writeJsonFile("proj.json", projects);

            JsonObject newDashboard = new JsonObject();
            newDashboard.addProperty("projectID", req.params(":id"));
            newDashboard.addProperty("projectTitle", req.queryParams("title"));
            newDashboard.addProperty("widgets", "[]");
            newDashboard.addProperty("dashboardID", newUUID);

            writeJsonFile("dash-" + newUUID + ".json", newDashboard);

            if (req.queryParams("callback") != null) {
                return req.queryParams("callback") + "(" + newDashboard.toString() + ")";
            } else {
                return newDashboard.toString();
            }
        } else {
            return "No project exists with ID: " + req.params(":id") + ".";
        }
    }

    public static String updateDashBoardByID(Request req, Response res) {
        String returnString = "";

        /* Code will go here to update dashboard*/

        return  returnString;
    }

    public static String createDashBoardWidgetByID(Request req, Response res) {
        String geodashDataDir = expandResourcePath("/public/json/");
        JsonParser parser = new JsonParser();
        JsonObject dashboardObj = new JsonObject();

        try (FileReader dashboardFileReader = new FileReader(new File(geodashDataDir, "dash-" + req.queryParams("dashID") + ".json"))) {
            dashboardObj = parser.parse(dashboardFileReader).getAsJsonObject();
            dashboardObj.getAsJsonArray("widgets").add(parser.parse(URLDecoder.decode(req.queryParams("widgetJSON"), "UTF-8")).getAsJsonObject());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        try (FileWriter dashboardFileWriter = new FileWriter(new File(geodashDataDir, "dash-" + req.queryParams("dashID") + ".json"))) {
            dashboardFileWriter.write(dashboardObj.toString());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        if (req.queryParams("callback") != null) {
            return req.queryParams("callback").toString() + "()";
        } else {
            return "";
        }
    }

    public static String updateDashBoardWidgetByID(Request req, Response res) {
        try {
            deleteOrUpdate(req.queryParams("dashID"), req.params(":id"), req.queryParams("widgetJSON"), false);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        if (req.queryParams("callback") != null) {
            return req.queryParams("callback").toString() + "()";
        } else {
            return "";
        }
    }

    public static String deleteDashBoardWidgetByID(Request req, Response res) {

        deleteOrUpdate(req.queryParams("dashID"), req.params(":id"), "", true);

        if (req.queryParams("callback") != null) {
            return req.queryParams("callback").toString() + "()";
        } else {
            return "";
        }
    }

    private static void deleteOrUpdate(String dashID, String ID, String widgetJSON, boolean delete) {
        try {
            String geodashDataDir = expandResourcePath("/public/json/");
            if (geodashDataDir.indexOf("/") == 0) {
                geodashDataDir = geodashDataDir.substring(1);
            }
            JsonParser parser = new JsonParser();
            JsonObject dashboardObj = new JsonObject();
            JsonArray finalArr = new JsonArray();
            FileSystem fs = FileSystems.getDefault();
            Path path = fs.getPath(geodashDataDir + "dash-" + dashID + ".json");
            int retries = 0;
            while (retries < 200) {
                try (FileChannel fileChannel = FileChannel.open(path, StandardOpenOption.READ, StandardOpenOption.WRITE)) {
                    FileLock lock = fileChannel.tryLock();
                    ByteBuffer buffer = ByteBuffer.allocate(2000);
                    int noOfBytesRead = fileChannel.read(buffer);
                    String jsonString = "";
                    while (noOfBytesRead != -1) {
                        buffer.flip();
                        while (buffer.hasRemaining()) {
                            jsonString += (char) buffer.get();
                        }
                        buffer.clear();
                        noOfBytesRead = fileChannel.read(buffer);
                    }
                    dashboardObj = parser.parse(jsonString).getAsJsonObject();
                    JsonArray widgets = dashboardObj.getAsJsonArray("widgets");
                    for (int i = 0; i < widgets.size(); i++) {  // **line 2**
                        JsonObject childJSONObject = widgets.get(i).getAsJsonObject();
                        String wID = childJSONObject.get("id").getAsString();
                        if (wID.equals(ID)) {
                            if (!delete) {
                                JsonParser widgetParser = new JsonParser();
                                childJSONObject = widgetParser.parse(URLDecoder.decode(widgetJSON, "UTF-8")).getAsJsonObject();
                                finalArr.add(childJSONObject);
                            }
                        } else {
                            finalArr.add(childJSONObject);
                        }
                    }
                    dashboardObj.remove("widgets");
                    dashboardObj.add("widgets", finalArr);
                    byte[] inputBytes = dashboardObj.toString().getBytes();
                    ByteBuffer buffer2 = ByteBuffer.wrap(inputBytes);
                    fileChannel.truncate(0);
                    fileChannel.write(buffer2);
                    fileChannel.close();
                    retries = 201;
                } catch (Exception e) {
                    retries++;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}
