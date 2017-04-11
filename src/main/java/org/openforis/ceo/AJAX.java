package org.openforis.ceo;

import java.io.FileReader;
import java.io.FileWriter;
import java.util.UUID;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;
import org.json.simple.parser.JSONParser;
import spark.Request;
import spark.Response;

public class AJAX {

    public static String clone(Request req, Response rsp) {
        return req.body();
    }

    public static String geodashId(Request req, Response res) {
        JSONArray jsonProjArray;
        try {
            jsonProjArraynew JSONParser().parse(new FileReader("proj.json"));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        String returnString = "";
        if (req.queryParams("callback") != null) {
            returnString = req.queryParams("callback").toString() + "(" + returnString + ")";
        }
        return returnString;
    }

    public static String geodashId(Request req, Response res) {
        boolean isAdmin = true; //Need to link to user and check
        String returnString = "";
        JSONParser projectParser = new JSONParser();
        Object projObj = projectParser.parse(new FileReader("proj.json"));
        JSONArray jsonProjArray = (JSONArray)projObj;
        boolean found = false;

        for (int i = 0; i < jsonProjArray.size(); i++) {
            JSONParser parser2 = new JSONParser();
            Object obj = parser2.parse(jsonProjArray.get(i).toString());
            JSONObject jsonObject = (JSONObject)obj;
            String theID = req.params(":id").toString();
            String jsonPID = jsonObject.get("projectID").toString();
            if (theID.equals(jsonPID)) {
                Object dashboardObj = parser2.parse(new FileReader("dash-" + jsonObject.get("dashboard").toString() +".json"));
                JSONObject jsonObject2 = (JSONObject)dashboardObj;
                returnString = jsonObject2.toJSONString();  //jsonObject.get("dashboard").toString()
                found = true;
                break;
            }
        }

        if (!found) {
            if (isAdmin) {
                //add new proj to json file and create json file of that name
                String newUUIDString = UUID.randomUUID().toString();
                JSONObject newitem = new JSONObject();
                newitem.put("projectID", req.params("id").toString());
                newitem.put("dashboard", newUUIDString);
                jsonProjArray.add(newitem);

                try (FileWriter file = new FileWriter("proj.json")) {
                    file.write(jsonProjArray.toJSONString());
                }

                //need to create dash-UUID.json file with all info passed
                // porjectID, projectTitle, widgets: [], dashboardID
                String pTitle = req.queryParams("title").toString();

                String newDashboard = "{\"projectID\":" + req.params("id").toString() + ",\"projectTitle\":\"" + req.queryParams("title").toString() + "\",\"widgets\":[], \"dashboardID\":\"" + newUUIDString + "\"}";
                // JSONValue.parse("{\"projectID\":" + req.params("id").toString() + ",\"projectTitle\":" + req.queryParams("title").toString() + ",\"widgets\":null, \"dashboardID\":"+ newUUIDString +"}")
                //var jsonObject2 = newDashboard as JSONObject
                returnString = newDashboard; //jsonObject2.toJSONString()
                new FileWriter("dash-" + newUUIDString + ".json").write(returnString);
                try (FileWriter file = new FileWriter("dash-" + newUUIDString + ".json")) {
                    file.write(returnString);
                }
            }

            //returnString = newUUIDString
        }

        if (req.queryParams("callback") != null) {
            returnString = req.queryParams("callback").toString() + "(" + returnString + ")";
        }

        return returnString;
    }

}
