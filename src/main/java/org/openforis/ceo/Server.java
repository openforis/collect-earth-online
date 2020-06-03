package org.openforis.ceo;

import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static spark.Service.ignite;
import static spark.Spark.after;
import static spark.Spark.before;
import static spark.Spark.exception;
import static spark.Spark.get;
import static spark.Spark.halt;
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
import spark.Request;
import spark.Response;
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
    private static void declareRoutes(Projects projects, Imagery imagery, Users users,
                                      Institutions institutions, GeoDash geoDash, Plots plots) {
        // Create a configured FreeMarker renderer
        var freemarker = new FreeMarkerEngine(getConfiguration());

        // Enable HTTPS site-wide
        secure("deploy/keystore.jks", "collect", null, null);

        // Serve static files from src/main/resources/public/
        staticFileLocation("/public");
        staticFiles.expireTime(6000);

        // Take query param for flash message and add to session attributes
        before((request, response) -> {
            final var userId = Integer.parseInt(request.session().attributes().contains("userid") ? request.session().attribute("userid").toString() : "-1");

            /// Page Authentication ///

            // Check for logged in on pages and redirect
            if (((request.uri().equals("/create-institution") && request.requestMethod().equals("GET")) // create-institution can be a get (page) or post (api)
                  || request.uri().equals("/account"))
                && userId < 0) {
                redirectAuth(request, response, userId);
            }
            // Check for collect permission pages and redirect
            if (List.of("/collection").contains(request.uri()) && !projects.canCollect(request)) {
                redirectAuth(request, response, userId);
            }
            // Check for proj admin permission pages and redirect
            if (List.of("/project-dashboard", "/review-project").contains(request.uri()) && !projects.isProjAdmin(request)) {
                redirectAuth(request, response, userId);
            }
            // Check for inst admin permission pages and redirect
            if (((request.uri().equals("/create-project") && request.requestMethod().equals("GET")) // create-project can be a get (page) or post (api)
                  || request.uri().equals("/institution-dashboard"))
                && !institutions.isInstAdmin(request)) {
                redirectAuth(request, response, userId);
            }
            // Check for mailing list permission pages and redirect
            if (request.uri().equals("/mailing-list") && request.requestMethod().equals("GET") // mailing-list can be a get (page) or post (api)
                && userId != 1) {
                redirectAuth(request, response, userId);
            }

            /// API Authentication ///

            // Check for logged in on API routes and block
            if (List.of("/get-all-users",
                        "/get-institution-users",
                        "/update-project-user-stats",
                        "/get-user-stats",
                        "/request-institution-membership",
                        "/create-institution")
                    .contains(request.uri()) && userId < 0) {
                halt(403, "Forbidden!");
            }
            // Check for collect permission on API routes and block
            if (List.of("/get-project-by-id",
                        "/get-project-stats",
                        "/get-next-plot",
                        "/get-plot-by-id",
                        "/get-prev-plot",
                        "/get-project-plots",
                        "/get-proj-plot",
                        "/add-user-samples",
                        "/flag-plot",
                        "/release-plot-locks",
                        "/reset-plot-lock")
                    .contains(request.uri()) && !projects.canCollect(request)) {
                halt(403, "Forbidden!");
            }
            // Check for proj admin permission on API routes and block
            if (List.of("/dump-project-aggregate-data",
                        "/dump-project-raw-data",
                        "/archive-project",
                        "/close-project",
                        "/publish-project",
                        "/update-project")
                    .contains(request.uri()) && !projects.isProjAdmin(request)) {
                halt(403, "Forbidden!");
            }
            // Check for inst admin permission on API routes and block
            if (List.of("/update-user-institution-role",
                        "/archive-institution",
                        "/create-project",
                        "/update-institution",
                        "/add-institution-imagery",
                        "/delete-institution-imagery")
                    .contains(request.uri()) && !institutions.isInstAdmin(request)) {
                halt(403, "Forbidden!");
            }

            // Add flash message from queryParams (needed on redirects)
            var flashMessage = request.queryParams("flash_message");
            request.session().attribute("flash_message", flashMessage != null ? flashMessage : "");
        });

        // Block cross traffic for proxy route
        before("/get-tile", (request, response) -> {
            // "referer" is spelled wrong, but is the correct name for this header.
            if (request.headers("referer") == null || !request.headers("referer").contains(request.host())) {
                halt(403, "Forbidden!");
            }
        });

        // GZIP all responses to improve download speeds
        after((request, response) -> { response.header("Content-Encoding", "gzip"); });

        // Routing Table: HTML pages (with no side effects)
        get("/",                                      Views.home(freemarker));
        get("/about",                                 Views.about(freemarker));
        get("/account",                               Views.account(freemarker));
        get("/collection",                            Views.collection(freemarker));
        get("/create-institution",                    Views.createInstitution(freemarker));
        get("/create-project",                        Views.createProject(freemarker));
        get("/geo-dash",                              Views.geoDash(freemarker));
        get("/geo-dash/geo-dash-help",                Views.geoDashHelp(freemarker));
        get("/home",                                  Views.home(freemarker));
        get("/institution-dashboard",                 Views.institutionDashboard(freemarker));
        get("/login",                                 Views.login(freemarker));
        get("/password",                              Views.password(freemarker));
        get("/password-reset",                        Views.passwordReset(freemarker));
        get("/project-dashboard",                     Views.projectDashboard(freemarker));
        get("/register",                              Views.register(freemarker));
        get("/review-institution",                    Views.reviewInstitution(freemarker));
        get("/review-project",                        Views.reviewProject(freemarker));
        get("/support",                               Views.support(freemarker));
        get("/widget-layout-editor",                  Views.widgetLayoutEditor(freemarker));
        get("/get-tile",                              (req, res) -> Proxy.proxyImagery(req, res, imagery));
        get("/mailing-list",                          Views.mailingList(freemarker));

        // Routing Table: HTML pages (with side effects)
        get("/logout",                                (req, res) -> Views.home(freemarker).handle(users.logout(req, res), res));
        post("/account",                              (req, res) -> Views.account(freemarker).handle(users.updateAccount(req, res), res));
        post("/login",                                (req, res) -> Views.login(freemarker).handle(users.login(req, res), res));
        post("/register",                             (req, res) -> Views.register(freemarker).handle(users.register(req, res), res));
        post("/password",                             (req, res) -> Views.password(freemarker).handle(users.getPasswordResetKey(req, res), res));
        post("/password-reset",                       (req, res) -> Views.passwordReset(freemarker).handle(users.resetPassword(req, res), res));
        post("/mailing-list",                         (req, res) -> Views.mailingList(freemarker).handle(users.sendMailingList(req, res), res));

        // Routing Table: Projects API
        get("/dump-project-aggregate-data",           projects::dumpProjectAggregateData);
        get("/dump-project-raw-data",                 projects::dumpProjectRawData);
        get("/get-all-projects",                      projects::getAllProjects);
        get("/get-project-by-id",                     projects::getProjectById);
        get("/get-project-stats",                     projects::getProjectStats);
        post("/archive-project",                      projects::archiveProject);
        post("/close-project",                        projects::closeProject);
        post("/create-project",                       projects::createProject);
        post("/publish-project",                      projects::publishProject);
        post("/update-project",                       projects::updateProject);

        // Routing Table: Plots (projects)
        get("/get-next-plot",                         plots::getNextPlot);
        get("/get-plot-by-id",                        plots::getPlotById);
        get("/get-prev-plot",                         plots::getPrevPlot);
        get("/get-project-plots",                     plots::getProjectPlots);
        get("/get-proj-plot",                         plots::getProjectPlot);
        post("/add-user-samples",                     plots::addUserSamples);
        post("/flag-plot",                            plots::flagPlot);
        post("/release-plot-locks",                   plots::releasePlotLocks);
        post("/reset-plot-lock",                      plots::resetPlotLock);

        // Routing Table: Users API
        get("/get-all-users",                         users::getAllUsers);
        get("/get-institution-users",                 users::getInstitutionUsers);
        get("/get-user-details",                      users::getUserDetails);
        get("/get-user-stats",                        users::getUserStats);
        get("/update-project-user-stats",             users::updateProjectUserStats);
        post("/update-user-institution-role",         users::updateInstitutionRole);
        post("/request-institution-membership",       users::requestInstitutionMembership);

        // Routing Table: Institutions API
        get("/get-all-institutions",                  institutions::getAllInstitutions);
        get("/get-institution-details",               institutions::getInstitutionDetails);
        post("/archive-institution",                  institutions::archiveInstitution);
        post("/create-institution",                   institutions::createInstitution);
        post("/update-institution",                   institutions::updateInstitution);

        // Routing Table: Imagery API
        get("/get-all-imagery",                       imagery::getAllImagery);
        post("/add-geodash-imagery",                  imagery::addGeoDashImagery);
        post("/add-institution-imagery",              imagery::addInstitutionImagery);
        post("/delete-institution-imagery",           imagery::deleteInstitutionImagery);

        // Routing Table: GeoDash API
        get("/geo-dash/get-by-projid",                geoDash::geodashId);
        post("/geo-dash/create-widget",               geoDash::createDashBoardWidgetById);
        post("/geo-dash/delete-widget",               geoDash::deleteDashBoardWidgetById);
        post("/geo-dash/gateway-request",             geoDash::gatewayRequest);
        post("/geo-dash/update-widget",               geoDash::updateDashBoardWidgetById);

        // Routing Table: Page Not Found
        notFound(Views.pageNotFound(freemarker));

        // Handle Exceptions
        exception(Exception.class, (e, req, res) -> {
                // e.printStackTrace();
                System.out.println("Routing error: " + e.getMessage());
            });
    }

    private static void redirectAuth(Request req, Response res, Integer userId) {
        final var queryString = req.queryString() != null ? "?" + req.queryString() : "";
        final var fullUrl = req.uri() + queryString;
        if (userId > 0) {
            res.redirect(CeoConfig.documentRoot
                            + "/home?flash_message=You do not have permission to access "
                            + fullUrl
                            + ".");
        } else {
            res.redirect(CeoConfig.documentRoot
                            + "/login?returnurl="
                            + fullUrl
                            + "&flash_message=You must login to see "
                            + fullUrl
                            + ".");
        }
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
        } else {
            CeoConfig.databaseType = args[0];
        }

        // Load the SMTP settings for sending reset password emails
        var smtpSettings        = readJsonFile("mail-config.json").getAsJsonObject();
        CeoConfig.baseUrl       = smtpSettings.get("baseUrl").getAsString();
        CeoConfig.smtpUser      = smtpSettings.get("smtpUser").getAsString();
        CeoConfig.smtpServer    = smtpSettings.get("smtpServer").getAsString();
        CeoConfig.smtpPort      = smtpSettings.get("smtpPort").getAsString();
        CeoConfig.smtpPassword  = smtpSettings.get("smtpPassword").getAsString();
        CeoConfig.smtpRecipientLimit  = smtpSettings.get("smtpRecipientLimit").getAsString();

        // Start the HTTPS Jetty webserver on port 8080
        port(8080);

        // Start the HTTP Jetty webserver on port 4567 to redirect traffic to the HTTPS Jetty webserver
        redirectHttpToHttps();

        if (CeoConfig.databaseType.equals("JSON")) {
            // Set up the routing table to use the JSON backend
            declareRoutes(new JsonProjects(),
                          new JsonImagery(),
                          new JsonUsers(),
                          new JsonInstitutions(),
                          new JsonGeoDash(),
                          new JsonPlots());
        } else {
            // Set up the routing table to use the POSTGRES backend
            declareRoutes(new PostgresProjects(),
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

        if (CeoConfig.databaseType.equals("JSON")) {
            // Set up the routing table to use the JSON backend
            declareRoutes(new JsonProjects(),
                          new JsonImagery(),
                          new JsonUsers(),
                          new JsonInstitutions(),
                          new JsonGeoDash(),
                          new JsonPlots());
        } else {
            // Set up the routing table to use the POSTGRES backend
            declareRoutes(new PostgresProjects(),
                          new PostgresImagery(),
                          new PostgresUsers(),
                          new PostgresInstitutions(),
                          new PostgresGeoDash(),
                          new PostgresPlots());
        }
    }
}
