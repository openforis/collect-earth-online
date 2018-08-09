package org.openforis.ceo;

import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static spark.Spark.before;
import static spark.Spark.exception;
import static spark.Spark.get;
import static spark.Spark.port;
import static spark.Spark.post;
import static spark.Spark.staticFileLocation;

import com.google.gson.JsonObject;
import freemarker.template.Configuration;
import freemarker.template.TemplateExceptionHandler;
import java.io.File;
import org.openforis.ceo.collect.CollectImagery;
import org.openforis.ceo.collect.CollectProjects;
import org.openforis.ceo.db_api.GeoDash;
import org.openforis.ceo.db_api.Imagery;
import org.openforis.ceo.db_api.Institutions;
import org.openforis.ceo.db_api.Projects;
import org.openforis.ceo.db_api.Users;
import org.openforis.ceo.env.CeoConfig;
import org.openforis.ceo.local.JsonGeoDash;
import org.openforis.ceo.local.JsonImagery;
import org.openforis.ceo.local.JsonInstitutions;
import org.openforis.ceo.local.JsonProjects;
import org.openforis.ceo.local.JsonUsers;
import org.openforis.ceo.postgres.PostgresGeoDash;
import org.openforis.ceo.postgres.PostgresImagery;
import org.openforis.ceo.postgres.PostgresInstitutions;
import org.openforis.ceo.postgres.PostgresProjects;
import org.openforis.ceo.postgres.PostgresUsers;
import org.openforis.ceo.users.CeoAuthFilter;
import org.openforis.ceo.users.OfGroups;
import org.openforis.ceo.users.OfUsers;
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

    // FIXME: Make all API method references non-static
    // Sets up Spark's routing table and exception handling rules
    private static void declareRoutes(String databaseType, Projects projects, Imagery imagery, Users users, Institutions institutions, GeoDash geoDash) {
        // Create a configured FreeMarker renderer
        FreeMarkerEngine freemarker = new FreeMarkerEngine(getConfiguration());

        // FIXME: Get deploy/clientkeystore signed by a certificate authority.
        // https://docs.oracle.com/cd/E19509-01/820-3503/ggfen/index.html
        // https://spark.apache.org/docs/latest/security.html
        // secure("deploy/clientkeystore", "ceocert", null, null);

        // Serve static files from src/main/resources/public/
        staticFileLocation("/public");

        // Allow token-based authentication if users are not logged in and we are using the COLLECT database
        if (databaseType.equals("COLLECT")) {
            before("/*", new CeoAuthFilter());
        }

        // Routing Table: HTML pages (with no side effects)
        get("/",                                      Views.home(freemarker));
        get("/home",                                  Views.home(freemarker));
        get("/about",                                 Views.about(freemarker));
        get("/support",                               Views.support(freemarker));
        get("/account/:id",                           Views.account(freemarker));
        get("/institution/:id",                       Views.institution(freemarker, databaseType.equals("COLLECT") ? "remote" : "local"));
        get("/collection/:id",                        Views.collection(freemarker));
        get("/geo-dash",                              Views.geodash(freemarker));
        get("/widget-layout-editor",                  Views.editWidgetLayout(freemarker));
        get("/project/:id",                           Views.project(freemarker));
        get("/login",                                 Views.login(freemarker));
        get("/register",                              Views.register(freemarker));
        get("/password",                              Views.password(freemarker));
        get("/password-reset",                        Views.passwordReset(freemarker));
        get("/card-test",                             Views.cardTest(freemarker));

        // Routing Table: HTML pages (with side effects)
        post("/account/:id",                          (req, res) -> Views.account(freemarker).handle(users.updateAccount(req, res), res));
        post("/login",                                (req, res) -> Views.login(freemarker).handle(users.login(req, res), res));
        post("/register",                             (req, res) -> Views.register(freemarker).handle(users.register(req, res), res));
        post("/password",                             (req, res) -> Views.password(freemarker).handle(users.getPasswordResetKey(req, res), res));
        post("/password-reset",                       (req, res) -> Views.passwordReset(freemarker).handle(users.resetPassword(req, res), res));
        get("/logout",                                (req, res) -> Views.home(freemarker).handle(users.logout(req), res));

        // Routing Table: Projects API
        get("/get-all-projects",                      projects::getAllProjects);
        get("/get-project-by-id/:id",                 projects::getProjectById);
        get("/get-project-plots/:id/:max",            projects::getProjectPlots);
        get("/get-project-stats/:id",                 projects::getProjectStats);
        get("/get-unanalyzed-plot/:id",               projects::getUnanalyzedPlot);
        get("/get-unanalyzed-plot-by-id/:projid/:id", projects::getUnanalyzedPlotById);
        get("/dump-project-aggregate-data/:id",       projects::dumpProjectAggregateData);
        get("/dump-project-raw-data/:id",             projects::dumpProjectRawData);
        post("/create-project",                       projects::createProject);
        post("/publish-project/:id",                  projects::publishProject);
        post("/close-project/:id",                    projects::closeProject);
        post("/archive-project/:id",                  projects::archiveProject);
        post("/add-user-samples",                     projects::addUserSamples);
        post("/flag-plot",                            projects::flagPlot);

        // Routing Table: Users API
        get("/get-all-users",                         users::getAllUsers);
        post("/update-user-institution-role",         users::updateInstitutionRole);
        post("/request-institution-membership",       users::requestInstitutionMembership);

        // Routing Table: Institutions API
        get("/get-all-institutions",                  institutions::getAllInstitutions);
        get("/get-institution-details/:id",           institutions::getInstitutionDetails);
        post("/update-institution/:id",               institutions::updateInstitution);
        post("/archive-institution/:id",              institutions::archiveInstitution);

        // Routing Table: Imagery API
        get("/get-all-imagery",                       imagery::getAllImagery);
        post("/add-institution-imagery",              imagery::addInstitutionImagery);
        post("/delete-institution-imagery",           imagery::deleteInstitutionImagery);

        // Routing Table: GeoDash API
        get("/geo-dash/id/:id",                       geoDash::geodashId);
        get("/geo-dash/update/id/:id",                geoDash::updateDashBoardByID);
        get("/geo-dash/createwidget/widget",          geoDash::createDashBoardWidgetByID);
        get("/geo-dash/updatewidget/widget/:id",      geoDash::updateDashBoardWidgetByID);
        get("/geo-dash/deletewidget/widget/:id",      geoDash::deleteDashBoardWidgetByID);

        // Routing Table: Page Not Found
        get("*",                                      Views.pageNotFound(freemarker));

        // Handle Exceptions
        exception(Exception.class, (e, req, res) -> e.printStackTrace());
    }

    // Maven/Gradle entry point for running with embedded Jetty webserver
    public static void main(String[] args) {
        // Load the SMTP settings for sending reset password emails
        JsonObject smtpSettings = readJsonFile("mail-config.json").getAsJsonObject();
        CeoConfig.baseUrl       = smtpSettings.get("baseUrl").getAsString();
        CeoConfig.smtpUser      = smtpSettings.get("smtpUser").getAsString();
        CeoConfig.smtpServer    = smtpSettings.get("smtpServer").getAsString();
        CeoConfig.smtpPort      = smtpSettings.get("smtpPort").getAsString();
        CeoConfig.smtpPassword  = smtpSettings.get("smtpPassword").getAsString();

        // Set up the routing table
        String databaseType = args[0]; // Should be either "JSON" or "POSTGRES"

        if (databaseType.equals("JSON")) {
            declareRoutes(databaseType,
                          new JsonProjects(),
                          new JsonImagery(),
                          new JsonUsers(),
                          new JsonInstitutions(),
                          new JsonGeoDash());
        } else if (databaseType.equals("POSTGRES")) {
            declareRoutes(databaseType,
                          new PostgresProjects(),
                          new PostgresImagery(),
                          new PostgresUsers(),
                          new PostgresInstitutions(),
                          new PostgresGeoDash());
        } else {
            System.out.println("Usage: gradle run <JSON|POSTGRES>");
            System.exit(1);
        }

        // Start the Jetty webserver on port 8080
        port(8080);
    }

    // Tomcat entry point
    public void init() {
        // FIXME: Create and import these interfaces
        // FIXME: deadgrep for all uses of Projects., Imagery., Users., Groups., and GeoDash. and replace them with Json*.
        Projects projects = new CollectProjects();
        Imagery imagery = new CollectImagery();
        Users users = new OfUsers();
        Institutions institutions = new OfGroups();
        GeoDash geoDash = new JsonGeoDash();

        // Set up the routing table
        declareRoutes("COLLECT",
                      new CollectProjects(),
                      new CollectImagery(),
                      new OfUsers(),
                      new OfGroups(),
                      new JsonGeoDash());
    }

}
