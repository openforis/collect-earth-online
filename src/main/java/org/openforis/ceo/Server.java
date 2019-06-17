package org.openforis.ceo;

import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static spark.Service.ignite;
import static spark.Spark.after;
import static spark.Spark.before;
import static spark.Spark.exception;
import static spark.Spark.get;
import static spark.Spark.notFound;
import static spark.Spark.port;
import static spark.Spark.post;
import static spark.Spark.secure;
import static spark.Spark.staticFileLocation;
import static spark.Spark.staticFiles;

import freemarker.template.Configuration;
import freemarker.template.TemplateExceptionHandler;
import java.io.File;
import java.util.List;
import org.openforis.ceo.collect.CollectImagery;
import org.openforis.ceo.collect.CollectPlots;
import org.openforis.ceo.collect.CollectProjects;
import org.openforis.ceo.db_api.GeoDash;
import org.openforis.ceo.db_api.Imagery;
import org.openforis.ceo.db_api.Institutions;
import org.openforis.ceo.db_api.Plots;
import org.openforis.ceo.db_api.Projects;
import org.openforis.ceo.db_api.Users;
import org.openforis.ceo.env.CeoConfig;
import org.openforis.ceo.local.JsonGeoDash;
import org.openforis.ceo.local.JsonImagery;
import org.openforis.ceo.local.JsonInstitutions;
import org.openforis.ceo.local.JsonPlots;
import org.openforis.ceo.local.JsonProjects;
import org.openforis.ceo.local.JsonUsers;
import org.openforis.ceo.postgres.PostgresGeoDash;
import org.openforis.ceo.postgres.PostgresImagery;
import org.openforis.ceo.postgres.PostgresInstitutions;
import org.openforis.ceo.postgres.PostgresPlots;
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
            var cfg = new Configuration(Configuration.VERSION_2_3_23);
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
    private static void declareRoutes(String databaseType, Projects projects, Imagery imagery,
                                      Users users, Institutions institutions, GeoDash geoDash,
                                      Plots plots) {
        // Create a configured FreeMarker renderer
        var freemarker = new FreeMarkerEngine(getConfiguration());

        // Enable HTTPS site-wide
        secure("deploy/keystore.jks", "collect", null, null);

        // Serve static files from src/main/resources/public/
        staticFileLocation("/public");
        staticFiles.expireTime(6000);

        // Allow token-based authentication if users are not logged in and we are using the COLLECT database
        if (databaseType.equals("COLLECT")) {
            before("/*", new CeoAuthFilter());
        }

        // Take query param for flash message and add to session attributes
        before((request, response) -> {
            var flashMessage = request.queryParams("flash_message");
            request.session().attribute("flash_message", flashMessage != null ? flashMessage : "");
        });

        // GZIP all responses to improve download speeds
        after((request, response) -> { response.header("Content-Encoding", "gzip"); });

        // Routing Table: HTML pages (with no side effects)
        get("/",                                      Views.home(freemarker));
        get("/about",                                 Views.about(freemarker));
        get("/account/:id",                           Views.account(freemarker));
        get("/create-institution",                    Views.createInstitution(freemarker));
        get("/create-project",                        (req, res) -> Views.createProject(freemarker).handle(institutions.redirectNonAdmin(req, res), res));
        get("/collection/:id",                        (req, res) -> Views.collection(freemarker).handle(projects.redirectNoCollect(req, res), res));
        get("/geo-dash",                              Views.geodash(freemarker));
        get("/geo-dash/geodash-help",                 Views.geodashHelp(freemarker));
        get("/home",                                  Views.home(freemarker));
        get("/login",                                 Views.login(freemarker));
        get("/password",                              Views.password(freemarker));
        get("/password-reset",                        Views.passwordReset(freemarker));
        get("/project-dashboard/:id",                 (req, res) -> Views.projectDashboard(freemarker).handle(projects.redirectNoEdit(req, res), res));
        get("/institution-dashboard/:id",             (req, res) -> Views.institutionDashboard(freemarker).handle(institutions.redirectNonAdmin(req, res), res));
        get("/register",                              Views.register(freemarker));
        get("/review-institution/:id",                Views.reviewInstitution(freemarker, databaseType.equals("COLLECT") ? "remote" : "local"));
        get("/review-project/:id",                    (req, res) -> Views.reviewProject(freemarker).handle(projects.redirectNoEdit(req, res), res));
        get("/support",                               Views.support(freemarker));
        get("/widget-layout-editor",                  Views.editWidgetLayout(freemarker));

        // Routing Table: HTML pages (with side effects)
        get("/logout",                                (req, res) -> Views.home(freemarker).handle(users.logout(req, res), res));
        post("/account/:id",                          (req, res) -> Views.account(freemarker).handle(users.updateAccount(req, res), res));
        post("/login",                                (req, res) -> Views.login(freemarker).handle(users.login(req, res), res));
        post("/register",                             (req, res) -> Views.register(freemarker).handle(users.register(req, res), res));
        post("/password",                             (req, res) -> Views.password(freemarker).handle(users.getPasswordResetKey(req, res), res));
        post("/password-reset",                       (req, res) -> Views.passwordReset(freemarker).handle(users.resetPassword(req, res), res));

        // Routing Table: Projects API
        get("/dump-project-aggregate-data/:id",       projects::dumpProjectAggregateData);
        get("/dump-project-raw-data/:id",             projects::dumpProjectRawData);
        get("/get-all-projects",                      projects::getAllProjects);
        get("/get-project-by-id/:id",                 projects::getProjectById);
        get("/get-project-stats/:id",                 projects::getProjectStats);
        post("/archive-project/:id",                  projects::archiveProject);
        post("/close-project/:id",                    projects::closeProject);
        post("/create-project",                       projects::createProject);
        post("/publish-project/:id",                  projects::publishProject);
        post("/update-project/:id",                   projects::updateProject);

        // Routing Table: Plots (projects)
        get("/get-next-plot",                         plots::getNextPlot);
        get("/get-plot-by-id",                        plots::getPlotById);
        get("/get-prev-plot",                         plots::getPrevPlot);
        get("/get-project-plots/:id/:max",            plots::getProjectPlots);
        get("/get-proj-plot/:projid/:plotid",         plots::getProjectPlot);
        post("/add-user-samples",                     plots::addUserSamples);
        post("/flag-plot",                            plots::flagPlot);
        post("/release-plot-locks/:userid/:projid",   plots::releasePlotLocks);
        post("/reset-plot-lock",                      plots::resetPlotLock);

        // Routing Table: Users API
        get("/get-all-users",                         users::getAllUsers);
        get("/get-institution-users/:id",             users::getInstitutionUsers);
        get("/get-user-stats/:userid",                users::getUserStats);
        get("/update-project-user-stats",             users::updateProjectUserStats);
        post("/update-user-institution-role",         users::updateInstitutionRole);
        post("/request-institution-membership",       users::requestInstitutionMembership);

        // Routing Table: Institutions API
        get("/get-all-institutions",                  institutions::getAllInstitutions);
        get("/get-institution-details/:id",           institutions::getInstitutionDetails);
        post("/archive-institution/:id",              institutions::archiveInstitution);
        post("/create-institution",                   institutions::createInstitution);
        post("/update-institution/:id",               institutions::updateInstitution);

        // Routing Table: Imagery API
        get("/get-all-imagery",                       imagery::getAllImagery);
        post("/add-geodash-imagery",                  imagery::addGeoDashImagery);
        post("/add-institution-imagery",              imagery::addInstitutionImagery);
        post("/delete-institution-imagery",           imagery::deleteInstitutionImagery);

        // Routing Table: GeoDash API
        get("/geo-dash/id/:id",                       geoDash::geodashId);
        get("/geo-dash/update/id/:id",                geoDash::updateDashBoardById);
        post("/geo-dash/createwidget/widget",         geoDash::createDashBoardWidgetById);
        post("/geo-dash/deletewidget/widget/:id",     geoDash::deleteDashBoardWidgetById);
        post("/geo-dash/gateway-request",             geoDash::gatewayRequest);
        post("/geo-dash/updatewidget/widget/:id",     geoDash::updateDashBoardWidgetById);

        // Routing Table: Page Not Found
        notFound(Views.pageNotFound(freemarker));

        // Handle Exceptions
        exception(Exception.class, (e, req, res) -> e.printStackTrace());
    }

    // Setup a proxy server on port 4567 to redirect incoming http traffic to port 8080 as https
    private static void redirectHttpToHttps() {
        var http = ignite().port(4567);
        http.get("*", (req, res) -> {
                var httpsUrl = req.url().replaceFirst("^http:", "https:").replace(":4567", ":8080");
                System.out.println("Redirecting from " + req.url() + " to " + httpsUrl);
                res.redirect(httpsUrl);
                return res;
            });
    }

    // Maven/Gradle entry point for running with embedded Jetty webserver
    public static void main(String[] args) {
        var usageMessage = "Usage (option 1): mvn compile exec:java -Dexec.args=<JSON|POSTGRES>\n" +
                           "Usage (option 2): gradle run -PrunArgs=<JSON|POSTGRES>";

        if (args.length != 1 || !List.of("JSON", "POSTGRES").contains(args[0])) {
            System.out.println(usageMessage);
            System.exit(0);
        }

        // Load the SMTP settings for sending reset password emails
        var smtpSettings        = readJsonFile("mail-config.json").getAsJsonObject();
        CeoConfig.baseUrl       = smtpSettings.get("baseUrl").getAsString();
        CeoConfig.smtpUser      = smtpSettings.get("smtpUser").getAsString();
        CeoConfig.smtpServer    = smtpSettings.get("smtpServer").getAsString();
        CeoConfig.smtpPort      = smtpSettings.get("smtpPort").getAsString();
        CeoConfig.smtpPassword  = smtpSettings.get("smtpPassword").getAsString();

        // Start the HTTPS Jetty webserver on port 8080
        port(8080);

        // Start the HTTP Jetty webserver on port 4567 to redirect traffic to the HTTPS Jetty webserver
        redirectHttpToHttps();

        if (args[0].equals("JSON")) {
            // Set up the routing table to use the JSON backend
            declareRoutes("JSON",
                          new JsonProjects(),
                          new JsonImagery(),
                          new JsonUsers(),
                          new JsonInstitutions(),
                          new JsonGeoDash(),
                          new JsonPlots());
        } else {
            // Set up the routing table to use the POSTGRES backend
            declareRoutes("POSTGRES",
                          new PostgresProjects(),
                          new PostgresImagery(),
                          new PostgresUsers(),
                          new PostgresInstitutions(),
                          new PostgresGeoDash(),
                          new PostgresPlots());
        }
    }

    // Tomcat entry point
    public void init() {
        // FIXME: I'm not entirely sure this will work with Tomcat. This should be tested.
        // Start the HTTP Jetty webserver on port 4567 to redirect traffic to the HTTPS Tomcat webserver
        redirectHttpToHttps();

        // Set up the routing table
        declareRoutes("COLLECT",
                      new CollectProjects(),
                      new CollectImagery(),
                      new OfUsers(),
                      new OfGroups(),
                      new JsonGeoDash(),
                      new CollectPlots());
    }

}
