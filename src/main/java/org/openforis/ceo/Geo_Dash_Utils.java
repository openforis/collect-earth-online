package org.openforis.ceo;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import spark.Request;
import spark.Response;
import spark.resource.Resource;

import java.io.FileReader;
import java.io.FileWriter;
import java.net.URLDecoder;
import java.util.UUID;

/**
 * Created by washmall on 4/10/2017.
 */
public class Geo_Dash_Utils {
    public static boolean isAdmin = true; //Need to link to user and check
    public static String GetDashBoardByID(Request req, Response res)
    {

        String returnString = "";
        try {

            JSONParser projectParser = new JSONParser();
            Object projObj = projectParser.parse(new FileReader("proj.json"));
            JSONArray jsonProjArray = (JSONArray) projObj;
            boolean found = false;
            for (int i = 0; i < jsonProjArray.size(); i++) {
                JSONParser parser2 = new JSONParser();

                Object obj = parser2.parse(jsonProjArray.get(i).toString());
                JSONObject jsonObject = (JSONObject) obj;
                String theID = req.params(":id").toString();
                String jsonPID = jsonObject.get("projectID").toString();
                if (theID.equals(jsonPID)) {
                    Object dashboardObj = parser2.parse(new FileReader("dash-" + jsonObject.get("dashboard").toString() + ".json"));
                    JSONObject jsonObject2 = (JSONObject) dashboardObj;
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


                    String newDashboard = "{\"projectID\":" + req.params("id").toString() + ",\"projectTitle\":\"" + req.queryParams("title").toString() + "\",\"widgets\":[], \"dashboardID\":\"" + newUUIDString + "\"}";//JSONValue.parse("{\"projectID\":" + req.params("id").toString() + ",\"projectTitle\":" + req.queryParams("title").toString() + ",\"widgets\":null, \"dashboardID\":"+ newUUIDString +"}")
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

        }
        catch(Exception e)
        {

        }
        return returnString ;
    }

    public static String UpdateDashBoardByID(Request req, Response res)
    {
        String returnString = "";




        return  returnString;
    }
    public static String UpdateDashBoardWidgetByID(Request req, Response res) {
        String returnString = "Update Success";
        try {
            String widgetID = req.params(":id");
            String dashID = req.queryParams("dashID");
            String widgetJSON = URLDecoder.decode(req.queryParams("widgetJSON"), "UTF-8");
            JSONParser parser2 = new JSONParser();
            JSONObject dashboardObj = (JSONObject)parser2.parse(new FileReader("dash-" + dashID + ".json"));
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
            new FileWriter("dash-" + dashID + ".json").write(returnString);
            try (FileWriter file = new FileWriter("dash-" + dashID + ".json")) {
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
