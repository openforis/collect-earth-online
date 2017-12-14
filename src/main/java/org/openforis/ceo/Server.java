package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.readJsonFile;
import static spark.Spark.exception;
import static spark.Spark.get;
import static spark.Spark.port;
import static spark.Spark.post;
import static spark.Spark.staticFileLocation;

import java.io.File;

import com.google.gson.JsonObject;

import freemarker.template.Configuration;
import freemarker.template.TemplateExceptionHandler;
import spark.servlet.SparkApplication;
import spark.template.freemarker.FreeMarkerEngine;

public class Server implements SparkApplication {

    // Returns a FreeMarker Configuration object configured to read
    // *.ftl files from src/main/resources/template/freemarker/
    private static Configuration getConfiguration() {
        try {
            Configuration cfg = new Configuration(Configuration.VERSION_2_3_23);
            cfg.setDirectoryForTemplateLoading(new File(Server.class.getResource("/template/freemarker").toURI()));
            cfg.setDefaultEncoding("UTF-8");
            cfg.setTemplateExceptionHandler(TemplateExceptionHandler.HTML_DEBUG_HANDLER); // or RETHROW_HANDLER
            cfg.setLogTemplateExceptions(false);
            return cfg;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // Sets up Spark's routing table and exception handling rules
    private static void declareRoutes() {
        // Create a configured FreeMarker renderer
        FreeMarkerEngine freemarker = new FreeMarkerEngine(getConfiguration());

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
        get("/get-unanalyzed-plot-byid/:projid/:id",         (req, res) -> { return Projects.getUnanalyzedPlotByID(req, res); });
        get("/dump-project-aggregate-data/:id", (req, res) -> { return Projects.dumpProjectAggregateData(req, res); });
        get("/dump-project-raw-data/:id",       (req, res) -> { return Projects.dumpProjectRawData(req, res); });
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
        get("/get-all-imagery",             (req, res) -> { return Imagery.getAllImagery(req, res); });
        post("/add-institution-imagery",    (req, res) -> { return Imagery.addInstitutionImagery(req, res); });
        post("/delete-institution-imagery", (req, res) -> { return Imagery.deleteInstitutionImagery(req, res); });

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

    // Sets up Spark's routing table and exception handling rules for use with Collect and Of-Users
    private static void declareRoutesForCollect() {
        // Create a configured FreeMarker renderer
        FreeMarkerEngine freemarker = new FreeMarkerEngine(getConfiguration());

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
        post("/account/:id",    (req, res) -> { return freemarker.render(Views.account(OfUsers.updateAccount(req, res), res)); });
        get("/institution/:id", (req, res) -> { return freemarker.render(Views.institution(req, res)); });
        get("/collection/:id",  (req, res) -> { return freemarker.render(Views.collection(req, res)); });
        get("/geo-dash",        (req, res) -> { return freemarker.render(Views.geodash(req, res)); });
        get("/project/:id",     (req, res) -> { return freemarker.render(Views.project(req, res)); });
        get("/login",           (req, res) -> { return freemarker.render(Views.login(req, res)); });
        post("/login",          (req, res) -> { return freemarker.render(Views.login(OfUsers.login(req, res), res)); });
        get("/register",        (req, res) -> { return freemarker.render(Views.register(req, res)); });
        post("/register",       (req, res) -> { return freemarker.render(Views.register(OfUsers.register(req, res), res)); });
        get("/password",        (req, res) -> { return freemarker.render(Views.password(req, res)); });
        post("/password",       (req, res) -> { return freemarker.render(Views.password(OfUsers.getPasswordResetKey(req, res), res)); });
        get("/password-reset",  (req, res) -> { return freemarker.render(Views.passwordReset(req, res)); });
        post("/password-reset", (req, res) -> { return freemarker.render(Views.passwordReset(OfUsers.resetPassword(req, res), res)); });
        get("/logout",          (req, res) -> { return freemarker.render(Views.home(OfUsers.logout(req), res)); });

        // Routing Table: Projects API
        get("/get-all-projects",                (req, res) -> { return CollectProjects.getAllProjects(req, res); });
        get("/get-project-by-id/:id",           (req, res) -> { return CollectProjects.getProjectById(req, res); });
        get("/get-project-plots/:id/:max",      (req, res) -> { return CollectProjects.getProjectPlots(req, res); });
        get("/get-project-stats/:id",           (req, res) -> { return CollectProjects.getProjectStats(req, res); });
        get("/get-unanalyzed-plot/:id",         (req, res) -> { return CollectProjects.getUnanalyzedPlot(req, res); });
        get("/get-unanalyzed-plot-byid/:projid/:id",         (req, res) -> { return CollectProjects.getUnanalyzedPlotByID(req, res); });
        get("/dump-project-aggregate-data/:id", (req, res) -> { return CollectProjects.dumpProjectAggregateData(req, res); });
        get("/dump-project-raw-data/:id",       (req, res) -> { return CollectProjects.dumpProjectRawData(req, res); });
        post("/create-project",                 (req, res) -> { return CollectProjects.createProject(req, res); });
        post("/publish-project/:id",            (req, res) -> { return CollectProjects.publishProject(req, res); });
        post("/close-project/:id",              (req, res) -> { return CollectProjects.closeProject(req, res); });
        post("/archive-project/:id",            (req, res) -> { return CollectProjects.archiveProject(req, res); });
        post("/add-user-samples",               (req, res) -> { return CollectProjects.addUserSamples(req, res); });
        post("/flag-plot",                      (req, res) -> { return CollectProjects.flagPlot(req, res); });

        // Routing Table: Users API
        get("/get-all-users",                   (req, res) -> { return OfUsers.getAllUsers(req, res); });
        post("/update-user-institution-role",   (req, res) -> { return OfUsers.updateInstitutionRole(req, res); });
        post("/request-institution-membership", (req, res) -> { return OfUsers.requestInstitutionMembership(req, res); });

        // Routing Table: Institutions API
        get("/get-all-institutions",        (req, res) -> { return OfGroups.getAllInstitutions(req, res); });
        get("/get-institution-details/:id", (req, res) -> { return OfGroups.getInstitutionDetails(req, res); });
        post("/update-institution/:id",     (req, res) -> { return OfGroups.updateInstitution(req, res); });
        post("/archive-institution/:id",    (req, res) -> { return OfGroups.archiveInstitution(req, res); });

        // Routing Table: Imagery API
        get("/get-all-imagery",             (req, res) -> { return CollectImagery.getAllImagery(req, res); });
        post("/add-institution-imagery",    (req, res) -> { return CollectImagery.addInstitutionImagery(req, res); });
        post("/delete-institution-imagery", (req, res) -> { return CollectImagery.deleteInstitutionImagery(req, res); });

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

        // Load the SMTP settings for sending reset password emails
        JsonObject smtpSettings = readJsonFile("mail-config.json").getAsJsonObject();
        CeoConfig.smtpUser = smtpSettings.get("smtpUser").getAsString();
        CeoConfig.smtpServer = smtpSettings.get("smtpServer").getAsString();
        CeoConfig.smtpPort = smtpSettings.get("smtpPort").getAsString();
        CeoConfig.smtpPassword = smtpSettings.get("smtpPassword").getAsString();

        // Start the Jetty webserver on port 8080
        port(8080);

        // Set up the routing table
        declareRoutes();
    }

    // Tomcat entry point
    public void init() {
        // Store the current document root for dynamic link resolution
        documentRoot = "/ceo";

        // Set up the routing table
        declareRoutesForCollect();
    }

}
