package org.openforis.ceo;

import freemarker.template.Configuration;
import freemarker.template.TemplateExceptionHandler;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.net.URL;
import java.util.UUID;

import spark.Request;
import spark.Response;
import spark.Route;
import spark.servlet.SparkApplication;
import static spark.Spark.get;
import static spark.Spark.exception;
import static spark.Spark.port;
import static spark.Spark.staticFileLocation;
import spark.template.freemarker.FreeMarkerEngine;
import org.json.simple.JSONObject;
import org.json.simple.JSONArray;
import org.json.simple.JSONValue;
import org.json.simple.parser.JSONParser;

public class Server implements SparkApplication {

    // Returns a FreeMarkerEngine object configured to read *.ftl
    // files from src/main/resources/template/freemarker/
    private static FreeMarkerEngine getTemplateRenderer() {
        try {
            Configuration cfg = new Configuration(Configuration.VERSION_2_3_23);
            URL templateDirectory = Server.class.getResource("/template/freemarker");
            cfg.setDirectoryForTemplateLoading(new File(templateDirectory.toURI()));
            cfg.setDefaultEncoding("UTF-8");
            cfg.setTemplateExceptionHandler(TemplateExceptionHandler.HTML_DEBUG_HANDLER);
            // cfg.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
            cfg.setLogTemplateExceptions(false);
            return new FreeMarkerEngine(cfg);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // Sets up Spark's routing table and exception handling rules
    private static void declareRoutes() {
        // Configure FreeMarker
        FreeMarkerEngine renderer = getTemplateRenderer();

        // Serve static files from src/main/resources/public/
        staticFileLocation("/public");

        // Setup Routes
        get("/",               Views.home,          renderer);
        get("/home",           Views.home,          renderer);
        get("/about",          Views.about,         renderer);
        get("/login",          Views.login,         renderer);
        get("/register",       Views.register,      renderer);
        get("/password",       Views.password,      renderer);
        get("/password-reset", Views.passwordReset, renderer);
        get("/logout",         Views.logout,        renderer);
        get("/select-project", Views.selectProject, renderer);
        get("/account",        Views.account,       renderer);
        get("/dashboard",      Views.dashboard,     renderer);
        get("/admin",          Views.admin,         renderer);
        get("/geo-dash",          Views.geodash,         renderer);
        get("/geo-dash/id/:id", (req, res) -> {
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

        });
        get("*",               Views.pageNotFound,  renderer);

        // Handle Exceptions
        exception(Exception.class, (e, req, rsp) -> e.printStackTrace());
    }

    // Maven/Gradle entry point for running with embedded Jetty webserver
    public static void main(String[] args) {
        // Set the webserver port
        port(8081);

        // Set up the routing table
        declareRoutes();
    }

    // Tomcat entry point
    public void init() {
        // Set up the routing table
        declareRoutes();
    }

}

/*
  get("/hello", (request, response) -> "Hello World");

  get("/hello/:name", (request, response) -> {
  return "Hello: " + request.params(":name");
  });
*/
// get("/say/*/to/*", (request, response) -> {
//         return "Number of splat parameters: " + request.splat().length;
//     });
/*
  before("/protected/*", (request, response) -> {
  boolean authenticated = false;
  // ... check if authenticated
  if (!authenticated) {
  halt(401, "Go Away!");
  }
  });

  after((request, response) -> {
  response.header("foo", "set by after filter");
  });

  // TODO: Get deploy/clientkeystore signed by a certificate authority.
  // https://docs.oracle.com/cd/E19509-01/820-3503/ggfen/index.html
  secure("deploy/clientkeystore", "ceocert", null, null);
*/

/*
  request.attributes();             // the attributes list
  request.attribute("foo");         // value of foo attribute
  request.attribute("A", "V");      // sets value of attribute A to V
  request.body();                   // request body sent by the client
  request.bodyAsBytes();            // request body as bytes
  request.contentLength();          // length of request body
  request.contentType();            // content type of request.body
  request.contextPath();            // the context path, e.g. "/hello"
  request.cookies();                // request cookies sent by the client
  request.headers();                // the HTTP header list
  request.headers("BAR");           // value of BAR header
  request.host();                   // the host, e.g. "example.com"
  request.ip();                     // client IP address
  request.params("foo");            // value of foo path parameter
  request.params();                 // map with all parameters
  request.pathInfo();               // the path info
  request.port();                   // the server port
  request.protocol();               // the protocol, e.g. HTTP/1.1
  request.queryMap();               // the query map
  request.queryMap("foo");          // query map for a certain parameter
  request.queryParams();            // the query param list
  request.queryParams("FOO");       // value of FOO query param
  request.queryParamsValues("FOO")  // all values of FOO query param
  request.raw();                    // raw request handed in by Jetty
  request.requestMethod();          // The HTTP method (GET, ..etc)
  request.scheme();                 // "http"
  request.servletPath();            // the servlet path, e.g. /result.jsp
  request.session();                // session management
  request.splat();                  // splat (*) parameters
  request.uri();                    // the uri, e.g. "http://example.com/foo"
  request.url();                    // the url. e.g. "http://example.com/foo"
  request.userAgent();              // user agent

  response.body();               // get response content
  response.body("Hello");        // sets content to Hello
  response.header("FOO", "bar"); // sets header FOO with value bar
  response.raw();                // raw response handed in by Jetty
  response.redirect("/example"); // browser redirect to /example
  response.status();             // get the response status
  response.status(401);          // set status code to 401
  response.type();               // get the content type
  response.type("text/xml");     // set content type to text/xml

  request.cookies();                         // get map of all request cookies
  request.cookie("foo");                     // access request cookie by name
  response.cookie("foo", "bar");             // set cookie with a value
  response.cookie("foo", "bar", 3600);       // set cookie with a max-age
  response.cookie("foo", "bar", 3600, true); // secure cookie
  response.removeCookie("foo");              // remove cookie

  request.session(true)                      // create and return session
  request.session().attribute("user")        // Get session attribute 'user'
  request.session().attribute("user", "foo") // Set session attribute 'user'
  request.session().removeAttribute("user")  // Remove session attribute 'user'
  request.session().attributes()             // Get all session attributes
  request.session().id()                     // Get session id
  request.session().isNew()                  // Check if session is new
  request.session().raw()                    // Return servlet object

  response.redirect("/bar");
*/
