package org.openforis.ceo;

import freemarker.template.Configuration;
import freemarker.template.TemplateExceptionHandler;
import java.io.File;
import java.net.URL;
import spark.servlet.SparkApplication;
import spark.template.freemarker.FreeMarkerEngine;
import static spark.Spark.exception;
import static spark.Spark.get;
import static spark.Spark.port;
import static spark.Spark.post;
import static spark.Spark.staticFileLocation;

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
        // Create a configured FreeMarker renderer
        FreeMarkerEngine freemarker = getTemplateRenderer();

        // FIXME: Get deploy/clientkeystore signed by a certificate authority.
        // https://docs.oracle.com/cd/E19509-01/820-3503/ggfen/index.html
        // https://spark.apache.org/docs/latest/security.html
        // secure("deploy/clientkeystore", "ceocert", null, null);

        // Serve static files from src/main/resources/public/
        staticFileLocation("/public");

        // Routing Table: HTML pages
        get("/",                (req, res) -> { return freemarker.render(Views.home(req, res)); });
        get("/home",            (req, res) -> { return freemarker.render(Views.home(req, res)); });
        get("/about",           (req, res) -> { return freemarker.render(Views.about(req, res)); });
        get("/support",         (req, res) -> { return freemarker.render(Views.support(req, res)); });
        get("/account/:id",     (req, res) -> { return freemarker.render(Views.account(req, res)); });
        post("/account/:id",    (req, res) -> { return freemarker.render(Views.account(Users.updateAccount(req, res), res)); });
        get("/institution/:id", (req, res) -> { return freemarker.render(Views.institution(req, res)); });
        get("/collection/:id",  (req, res) -> { return freemarker.render(Views.collection(req, res)); });
        get("/geo-dash",        (req, res) -> { return freemarker.render(Views.geodash(req, res)); });
        get("/project/:id",     (req, res) -> { return freemarker.render(Views.project(req, res)); });
        get("/login",           (req, res) -> { return freemarker.render(Views.login(req, res)); });
        post("/login",          (req, res) -> { return freemarker.render(Views.login(Users.login(req, res), res)); });
        get("/register",        (req, res) -> { return freemarker.render(Views.register(req, res)); });
        post("/register",       (req, res) -> { return freemarker.render(Views.register(Users.register(req, res), res)); });
        get("/password",        (req, res) -> { return freemarker.render(Views.password(req, res)); });
        post("/password",       (req, res) -> { return freemarker.render(Views.password(Users.getPasswordResetKey(req, res), res)); });
        get("/password-reset",  (req, res) -> { return freemarker.render(Views.passwordReset(req, res)); });
        post("/password-reset", (req, res) -> { return freemarker.render(Views.passwordReset(Users.resetPassword(req, res), res)); });
        get("/logout",          (req, res) -> { return freemarker.render(Views.home(Users.logout(req), res)); });

        // Routing Table: Projects API
        get("/get-all-projects",                (req, res) -> { return Projects.getAllProjects(req, res); });
        get("/get-project-by-id/:id",           (req, res) -> { return Projects.getProjectById(req, res); });
        get("/get-project-plots/:id/:max",      (req, res) -> { return Projects.getProjectPlots(req, res); });
        get("/get-project-stats/:id",           (req, res) -> { return Projects.getProjectStats(req, res); });
        get("/get-unanalyzed-plot/:id",         (req, res) -> { return Projects.getUnanalyzedPlot(req, res); });
        get("/dump-project-aggregate-data/:id", (req, res) -> { return Projects.dumpProjectAggregateData(req, res); });
        post("/create-project",                 (req, res) -> { return Projects.createProject(req, res); });
        post("/publish-project/:id",            (req, res) -> { return Projects.publishProject(req, res); });
        post("/close-project/:id",              (req, res) -> { return Projects.closeProject(req, res); });
        post("/archive-project/:id",            (req, res) -> { return Projects.archiveProject(req, res); });
        post("/add-user-samples",               (req, res) -> { return Projects.addUserSamples(req, res); });
        post("/flag-plot",                      (req, res) -> { return Projects.flagPlot(req, res); });

        // Routing Table: Users API
        get("/get-all-users",                   (req, res) -> { return Users.getAllUsers(req, res); });
        post("/update-user-institution-role",   (req, res) -> { return Users.updateInstitutionRole(req, res); });
        post("/request-institution-membership", (req, res) -> { return Users.requestInstitutionMembership(req, res); });

        // Routing Table: Institutions API
        get("/get-all-institutions",        (req, res) -> { return Institutions.getAllInstitutions(req, res); });
        get("/get-institution-details/:id", (req, res) -> { return Institutions.getInstitutionDetails(req, res); });
        post("/update-institution/:id",     (req, res) -> { return Institutions.updateInstitution(req, res); });
        post("/archive-institution/:id",    (req, res) -> { return Institutions.archiveInstitution(req, res); });

        // Routing Table: Imagery API
        get("/get-all-imagery", (req, res) -> { return Imagery.getAllImagery(req, res); });

        // Routing Table: GeoDash API
        get("/geo-dash/id/:id",                  (req, res) -> { return GeoDash.geodashId(req, res); });
        get("/geo-dash/update/id/:id",           (req, res) -> { return GeoDash.updateDashBoardByID(req, res); });
        get("/geo-dash/createwidget/widget",     (req, res) -> { return GeoDash.createDashBoardWidgetByID(req, res); });
        get("/geo-dash/updatewidget/widget/:id", (req, res) -> { return GeoDash.updateDashBoardWidgetByID(req, res); });
        get("/geo-dash/deletewidget/widget/:id", (req, res) -> { return GeoDash.deleteDashBoardWidgetByID(req, res); });

        // Routing Table: Page Not Found
        get("*", (req, res) -> { return freemarker.render(Views.pageNotFound(req, res)); });

        // Handle Exceptions
        exception(Exception.class, (e, req, rsp) -> e.printStackTrace());
    }

    public static String documentRoot;

    // Maven/Gradle entry point for running with embedded Jetty webserver
    public static void main(String[] args) {
        // Store the current document root for dynamic link resolution
        documentRoot = "";

        // Set the webserver port
        port(8080);

        // Set up the routing table
        declareRoutes();
    }

    // Tomcat entry point
    public void init() {
        // Store the current document root for dynamic link resolution
        // documentRoot = "/ceo";
        documentRoot = "";

        // Set up the routing table
        declareRoutes();
    }

}
