package org.openforis.ceo;

import java.io.FileReader;
import java.io.FileWriter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.JSONValue;
import org.json.simple.parser.JSONParser;
import spark.ModelAndView;
import spark.Request;
import spark.Response;
import spark.TemplateViewRoute;

public class Views {

    public static TemplateViewRoute home = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Home");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "home.ftl");
    };

    public static TemplateViewRoute about = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "About");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "about.ftl");
    };

    public static TemplateViewRoute login = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Login");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "login.ftl");
    };

    public static TemplateViewRoute register = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Register");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "register.ftl");
    };

    public static TemplateViewRoute password = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Password");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "password.ftl");
    };

    public static TemplateViewRoute passwordReset = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Password-Reset");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        model.put("email", "admin@sig-gis.com");
        model.put("password_reset_key", "1234567890ABCDEF");
        return new ModelAndView(model, "password-reset.ftl");
    };

    public static TemplateViewRoute logout = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Logout");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "logout.ftl");
    };

    public static TemplateViewRoute selectProject = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Select-Project");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        List<Map<String, Object>> projects =
            Stream.of("Mekong River Region", "Laos", "Vietnam", "Cambodia")
            .map(name -> {
                    Map<String, Object> project = new HashMap<String, Object>();
                    project.put("id", name.length());
                    project.put("name", name);
                    return project;
                })
            .collect(Collectors.toList());
        model.put("projects", projects);
        return new ModelAndView(model, "select-project.ftl");
    };

    public static TemplateViewRoute account = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Account");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "account.ftl");
    };

    public static TemplateViewRoute dashboard = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Dashboard");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        model.put("user_id", 1);
        model.put("project_id", 1);
        return new ModelAndView(model, "dashboard.ftl");
    };

    public static TemplateViewRoute admin = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Admin");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "admin.ftl");
    };

    public static TemplateViewRoute clone = (Request req, Response rsp) -> {
        return req.body();
    };

    public static TemplateViewRoute geodash = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Admin");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "geo-dash.ftl");
    };

    public static TemplateViewRoute pageNotFound = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Page-Not-Found");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Page Not Found"});
        return new ModelAndView(model, "page-not-found.ftl");
    };

    public static TemplateViewRoute geodashId = (Request req, Response res) -> {
        boolean isAdmin = true; //Need to link to user and check
        String returnString = "";
        JSONParser projectParser = new JSONParser();
        Object projObj = projectParser.parse(new FileReader("proj.json"));
        JSONArray jsonProjArray = (JSONArray)projObj;
        boolean found = false;
        for (int i = 0; i< jsonProjArray.size(); i++) {
            JSONParser parser2 = new JSONParser();

            Object obj = parser2.parse(jsonProjArray.get(i).toString());
            JSONObject jsonObject = (JSONObject)obj;
            String theID = req.params(":id").toString();
            String jsonPID = jsonObject.get("projectID").toString();
            if(theID.equals(jsonPID))
                {
                    Object dashboardObj = parser2.parse(new FileReader("dash-" + jsonObject.get("dashboard").toString() +".json"));
                    JSONObject jsonObject2 = (JSONObject)dashboardObj;
                    returnString = jsonObject2.toJSONString();  //jsonObject.get("dashboard").toString()
                    found = true;
                    break;
                }
        }

        if(!found)
            {
                if(isAdmin) {
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


        if(req.queryParams("callback") != null){
            returnString = req.queryParams("callback").toString() + "(" + returnString + ")";
        }


        return returnString ;

    }

}
