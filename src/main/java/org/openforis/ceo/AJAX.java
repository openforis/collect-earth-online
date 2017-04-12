package org.openforis.ceo;

import java.io.FileReader;
import java.io.FileWriter;
import java.util.Optional;
import java.util.UUID;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import spark.Request;
import spark.Response;

public class AJAX {

    public static String clone(Request req, Response rsp) {
        return req.body();
    }

    public static String geodashId(Request req, Response res) {
        try (FileReader projectFileReader = new FileReader("proj.json")) {
            JSONParser parser = new JSONParser();
            JSONArray projects = (JSONArray) parser.parse(projectFileReader);

            Optional matchingProject = projects
                .stream()
                .filter(project -> req.params(":id").equals(((JSONObject) project).get("projectID")))
                .map(project -> {
                        try (FileReader dashboardFileReader = new FileReader("dash-" + ((JSONObject) project).get("dashboard") + ".json")) {
                            return (JSONObject) parser.parse(dashboardFileReader);
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

                    JSONObject newProject = new JSONObject();
                    newProject.put("projectID", req.params(":id"));
                    newProject.put("dashboard", newUUID);
                    projects.add(newProject);

                    try (FileWriter projectFileWriter = new FileWriter("proj.json")) {
                        projectFileWriter.write(projects.toString());
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }

                    JSONObject newDashboard = new JSONObject();
                    newDashboard.put("projectID", req.params(":id"));
                    newDashboard.put("projectTitle", req.queryParams("title"));
                    newDashboard.put("widgets", "[]");
                    newDashboard.put("dashboardID", newUUID);

                    try (FileWriter dashboardFileWriter = new FileWriter("dash-" + newUUID + ".json")) {
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

}
