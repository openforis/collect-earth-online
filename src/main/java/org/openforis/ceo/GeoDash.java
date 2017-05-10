package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
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
        /* Code will go here to update dashboard*/
        return  "";
    }

    public static String createDashBoardWidgetByID(Request req, Response res) {
        JsonObject dashboard = readJsonFile("dash-" + req.queryParams("dashID") + ".json").getAsJsonObject();
        JsonArray widgets = dashboard.getAsJsonArray("widgets");
        try {
            JsonObject newWidget = parseJson(URLDecoder.decode(req.queryParams("widgetJSON"), "UTF-8")).getAsJsonObject();
            widgets.add(newWidget);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        dashboard.add("widgets", widgets);
        writeJsonFile("dash-" + req.queryParams("dashID") + ".json", dashboard);
        if (req.queryParams("callback") != null) {
            return req.queryParams("callback") + "()";
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
                    dashboardObj = parseJson(jsonString).getAsJsonObject();
                    JsonArray widgets = dashboardObj.getAsJsonArray("widgets");
                    for (int i = 0; i < widgets.size(); i++) {  // **line 2**
                        JsonObject childJSONObject = widgets.get(i).getAsJsonObject();
                        String wID = childJSONObject.get("id").getAsString();
                        if (wID.equals(ID)) {
                            if (!delete) {
                                childJSONObject = parseJson(URLDecoder.decode(widgetJSON, "UTF-8")).getAsJsonObject();
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

    public static String updateDashBoardWidgetByID(Request req, Response res) {
        deleteOrUpdate(req.queryParams("dashID"), req.params(":id"), req.queryParams("widgetJSON"), false);
        if (req.queryParams("callback") != null) {
            return req.queryParams("callback") + "()";
        } else {
            return "";
        }
    }

    public static String deleteDashBoardWidgetByID(Request req, Response res) {
        deleteOrUpdate(req.queryParams("dashID"), req.params(":id"), "", true);
        if (req.queryParams("callback") != null) {
            return req.queryParams("callback") + "()";
        } else {
            return "";
        }
    }

}
