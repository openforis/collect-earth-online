package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.net.URLDecoder;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.StreamSupport;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import spark.Request;
import spark.Response;

public class AJAX {

    public static String clone(Request req, Response rsp) {
        return req.body();
    }

    public static String expandResourcePath(String filename) {
        return AJAX.class.getResource(filename).getFile();
    }

    public static String geodashId(Request req, Response res) {
        String geodashDataDir = expandResourcePath("/public/json/");

        try (FileReader projectFileReader = new FileReader(new File(geodashDataDir, "proj.json"))) {
            JsonParser parser = new JsonParser();
            JsonArray projects = parser.parse(projectFileReader).getAsJsonArray();

            Optional matchingProject = StreamSupport.stream(projects.spliterator(), false)
                    .map(project -> project.getAsJsonObject())
                    .filter(project -> req.params(":id").equals(project.get("projectID").getAsString()))
                    .map(project -> {
                        try (FileReader dashboardFileReader = new FileReader(new File(geodashDataDir, "dash-" + project.get("dashboard").getAsString() + ".json"))) {
                            return parser.parse(dashboardFileReader).getAsJsonObject();
                        } catch (Exception e) {
                            throw new RuntimeException(e);
                        }
                    })
                    .findFirst();

            if (matchingProject.isPresent()) {
                if (req.queryParams("callback") != null) {
                    return req.queryParams("callback") + "(" + matchingProject.get().toString() + ")";
                } else {
                    return matchingProject.get().toString();
                }
            } else {
                if (true) { // FIXME: Make sure this is true if the user has role admin
                    String newUUID = UUID.randomUUID().toString();

                    JsonObject newProject = new JsonObject();
                    newProject.addProperty("projectID", req.params(":id"));
                    newProject.addProperty("dashboard", newUUID);
                    projects.add(newProject);

                    try (FileWriter projectFileWriter = new FileWriter(new File(geodashDataDir, "proj.json"))) {
                        projectFileWriter.write(projects.toString());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

                    JsonObject newDashboard = new JsonObject();
                    newDashboard.addProperty("projectID", req.params(":id"));
                    newDashboard.addProperty("projectTitle", req.queryParams("title"));
                    newDashboard.addProperty("widgets", "[]");
                    newDashboard.addProperty("dashboardID", newUUID);

                    try (FileWriter dashboardFileWriter = new FileWriter(new File(geodashDataDir, "dash-" + newUUID + ".json"))) {
                        dashboardFileWriter.write(newDashboard.toString());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

                    if (req.queryParams("callback") != null) {
                        return req.queryParams("callback") + "(" + newDashboard.toString() + ")";
                    } else {
                        return newDashboard.toString();
                    }
                } else {
                    return "No project exists with ID: " + req.params(":id") + ".";
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
    public static String UpdateDashBoardByID(Request req, Response res)
    {
        String returnString = "";

/* Code will go here to update dashboard*/


        return  returnString;
    }
    public static String UpdateDashBoardWidgetByID(Request req, Response res) {
        String geodashDataDir = expandResourcePath("/public/json/");
        String returnString = "Update Success";
        try {
            String widgetID = req.params(":id");
            String dashID = req.queryParams("dashID");
            String widgetJSON = URLDecoder.decode(req.queryParams("widgetJSON"), "UTF-8");
            JSONParser parser2 = new JSONParser();
            JSONObject dashboardObj = (JSONObject)parser2.parse(new FileReader(geodashDataDir + "dash-" + dashID + ".json"));
            JSONArray jsonMainArr = (JSONArray)dashboardObj.get("widgets");
            JSONArray finalArr = new JSONArray();
            for (int i = 0; i < jsonMainArr.size(); i++) {  // **line 2**
                JSONObject childJSONObject = (JSONObject)jsonMainArr.get(i);
                String wID = (String)childJSONObject.get("id").toString();
                if(wID.equals(widgetID))
                {
                    JSONParser parser = new JSONParser();
                    childJSONObject =  (JSONObject) parser.parse(widgetJSON);;
                }
                finalArr.add(childJSONObject);
            }
            dashboardObj.remove("widgets");
            dashboardObj.put("widgets", finalArr);
            new FileWriter(geodashDataDir +"dash-" + dashID + ".json").write(returnString);
            try (FileWriter file = new FileWriter(geodashDataDir +"dash-" + dashID + ".json")) {
                file.write(dashboardObj.toString());
            }

        } catch (Exception e) {

            returnString = e.getMessage();
        }
        if (req.queryParams("callback") != null) {
            returnString = req.queryParams("callback").toString() + "()";
        }
        return returnString;
    }

}