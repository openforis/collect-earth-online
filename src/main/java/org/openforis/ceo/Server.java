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
import org.openforis.ceo.env.CeoConfig;
import org.openforis.ceo.ext.GeoDash;
import org.openforis.ceo.local.Imagery;
import org.openforis.ceo.local.Institutions;
import org.openforis.ceo.local.Projects;
import org.openforis.ceo.local.Users;
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

    // Sets up Spark's routing table and exception handling rules
    private static void declareRoutes(String databaseType) {
        // Create a configured FreeMarker renderer
        FreeMarkerEngine freemarker = new FreeMarkerEngine(getConfiguration());

        // FIXME: Get deploy/clientkeystore signed by a certificate authority.
        // https://docs.oracle.com/cd/E19509-01/820-3503/ggfen/index.html
        // https://spark.apache.org/docs/latest/security.html
        // secure("deploy/clientkeystore", "ceocert", null, null);

        // Serve static files from src/main/resources/public/
        staticFileLocation("/public");

        // Routing Table: HTML pages (with no side effects)
        get("/",                                      Views.home(freemarker));
        get("/home",                                  Views.home(freemarker));
        get("/about",                                 Views.about(freemarker));
        get("/support",                               Views.support(freemarker));
        get("/account/:id",                           Views.account(freemarker));
        get("/institution/:id",                       Views.institution(freemarker, "local"));
        get("/collection/:id",                        Views.collection(freemarker));
        get("/geo-dash",                              Views.geodash(freemarker));
        get("/widget-layout-editor",                  Views.editWidgetLayout(freemarker));
        get("/project/:id",                           Views.project(freemarker));
        get("/login",                                 Views.login(freemarker));
        get("/register",                              Views.register(freemarker));
        get("/password",                              Views.password(freemarker));
        get("/password-reset",                        Views.passwordReset(freemarker));

        // Routing Table: HTML pages (with side effects)
        post("/account/:id",                          (req, res) -> Views.account(freemarker).handle(Users.updateAccount(req, res), res));
        post("/login",                                (req, res) -> Views.login(freemarker).handle(Users.login(req, res), res));
        post("/register",                             (req, res) -> Views.register(freemarker).handle(Users.register(req, res), res));
        post("/password",                             (req, res) -> Views.password(freemarker).handle(Users.getPasswordResetKey(req, res), res));
        post("/password-reset",                       (req, res) -> Views.passwordReset(freemarker).handle(Users.resetPassword(req, res), res));
        get("/logout",                                (req, res) -> Views.home(freemarker).handle(Users.logout(req), res));

        // Routing Table: Projects API
        get("/get-all-projects",                      Projects::getAllProjects);
        get("/get-project-by-id/:id",                 Projects::getProjectById);
        get("/get-project-plots/:id/:max",            Projects::getProjectPlots);
        get("/get-project-stats/:id",                 Projects::getProjectStats);
        get("/get-unanalyzed-plot/:id",               Projects::getUnanalyzedPlot);
        get("/get-unanalyzed-plot-by-id/:projid/:id", Projects::getUnanalyzedPlotById);
        get("/dump-project-aggregate-data/:id",       Projects::dumpProjectAggregateData);
        get("/dump-project-raw-data/:id",             Projects::dumpProjectRawData);
        post("/create-project",                       Projects::createProject);
        post("/publish-project/:id",                  Projects::publishProject);
        post("/close-project/:id",                    Projects::closeProject);
        post("/archive-project/:id",                  Projects::archiveProject);
        post("/add-user-samples",                     Projects::addUserSamples);
        post("/flag-plot",                            Projects::flagPlot);

        // Routing Table: Users API
        get("/get-all-users",                         Users::getAllUsers);
        post("/update-user-institution-role",         Users::updateInstitutionRole);
        post("/request-institution-membership",       Users::requestInstitutionMembership);

        // Routing Table: Institutions API
        get("/get-all-institutions",                  Institutions::getAllInstitutions);
        get("/get-institution-details/:id",           Institutions::getInstitutionDetails);
        post("/update-institution/:id",               Institutions::updateInstitution);
        post("/archive-institution/:id",              Institutions::archiveInstitution);

        // Routing Table: Imagery API
        get("/get-all-imagery",                       Imagery::getAllImagery);
        post("/add-institution-imagery",              Imagery::addInstitutionImagery);
        post("/delete-institution-imagery",           Imagery::deleteInstitutionImagery);

        // Routing Table: GeoDash API
        get("/geo-dash/id/:id",                       GeoDash::geodashId);
        get("/geo-dash/update/id/:id",                GeoDash::updateDashBoardByID);
        get("/geo-dash/createwidget/widget",          GeoDash::createDashBoardWidgetByID);
        get("/geo-dash/updatewidget/widget/:id",      GeoDash::updateDashBoardWidgetByID);
        get("/geo-dash/deletewidget/widget/:id",      GeoDash::deleteDashBoardWidgetByID);

        // Routing Table: Page Not Found
        get("*",                                      Views.pageNotFound(freemarker));

        // Handle Exceptions
        exception(Exception.class, (e, req, res) -> e.printStackTrace());
    }

    // Sets up Spark's routing table and exception handling rules for use with Collect and Of-Users
    // private static void declareRemoteStorageRoutes() {
    //     // Create a configured FreeMarker renderer
    //     FreeMarkerEngine freemarker = new FreeMarkerEngine(getConfiguration());

    //     // FIXME: Get deploy/clientkeystore signed by a certificate authority.
    //     // https://docs.oracle.com/cd/E19509-01/820-3503/ggfen/index.html
    //     // https://spark.apache.org/docs/latest/security.html
    //     // secure("deploy/clientkeystore", "ceocert", null, null);

    //     // Serve static files from src/main/resources/public/
    //     staticFileLocation("/public");

    //     // Allow token-based authentication if users are not logged in
    //     before("/*", new CeoAuthFilter());

    //     // Routing Table: HTML pages
    //     get("/",                (req, res) -> { return freemarker.render(Views.home(req, res)); });
    //     get("/home",            (req, res) -> { return freemarker.render(Views.home(req, res)); });
    //     get("/about",           (req, res) -> { return freemarker.render(Views.about(req, res)); });
    //     get("/support",         (req, res) -> { return freemarker.render(Views.support(req, res)); });
    //     get("/account/:id",     (req, res) -> { return freemarker.render(Views.account(req, res)); });
    //     post("/account/:id",    (req, res) -> { return freemarker.render(Views.account(OfUsers.updateAccount(req, res), res)); });
    //     get("/institution/:id", (req, res) -> { return freemarker.render(Views.institution(req, res, "remote")); });
    //     get("/collection/:id",  (req, res) -> { return freemarker.render(Views.collection(req, res)); });
    //     get("/geo-dash",        (req, res) -> { return freemarker.render(Views.geodash(req, res)); });
    //     get("/widget-layout-editor", (req, res) -> { return freemarker.render(Views.editWidgetLayout(req, res)); });
    //     get("/project/:id",     (req, res) -> { return freemarker.render(Views.project(req, res)); });
    //     get("/login",           (req, res) -> { return freemarker.render(Views.login(req, res)); });
    //     post("/login",          (req, res) -> { return freemarker.render(Views.login(OfUsers.login(req, res), res)); });
    //     get("/register",        (req, res) -> { return freemarker.render(Views.register(req, res)); });
    //     post("/register",       (req, res) -> { return freemarker.render(Views.register(OfUsers.register(req, res), res)); });
    //     get("/password",        (req, res) -> { return freemarker.render(Views.password(req, res)); });
    //     post("/password",       (req, res) -> { return freemarker.render(Views.password(OfUsers.getPasswordResetKey(req, res), res)); });
    //     get("/password-reset",  (req, res) -> { return freemarker.render(Views.passwordReset(req, res)); });
    //     post("/password-reset", (req, res) -> { return freemarker.render(Views.passwordReset(OfUsers.resetPassword(req, res), res)); });
    //     get("/card-test",       (req, res) -> { return freemarker.render(Views.cardTest(req, res)); });
    //     get("/logout",          (req, res) -> { return freemarker.render(Views.home(OfUsers.logout(req, res), res)); });

    //     // Routing Table: Projects API
    //     get("/get-all-projects",                (req, res) -> { return CollectProjects.getAllProjects(req, res); });
    //     get("/get-project-by-id/:id",           (req, res) -> { return CollectProjects.getProjectById(req, res); });
    //     get("/get-project-plots/:id/:max",      (req, res) -> { return CollectProjects.getProjectPlots(req, res); });
    //     get("/get-project-stats/:id",           (req, res) -> { return CollectProjects.getProjectStats(req, res); });
    //     get("/get-unanalyzed-plot/:id",         (req, res) -> { return CollectProjects.getUnanalyzedPlot(req, res); });
    //     get("/get-unanalyzed-plot-by-id/:projid/:id", (req, res) -> { return CollectProjects.getUnanalyzedPlotById(req, res); });
    //     get("/dump-project-aggregate-data/:id", (req, res) -> { return CollectProjects.dumpProjectAggregateData(req, res); });
    //     get("/dump-project-raw-data/:id",       (req, res) -> { return CollectProjects.dumpProjectRawData(req, res); });
    //     post("/create-project",                 (req, res) -> { return CollectProjects.createProject(req, res); });
    //     post("/publish-project/:id",            (req, res) -> { return CollectProjects.publishProject(req, res); });
    //     post("/close-project/:id",              (req, res) -> { return CollectProjects.closeProject(req, res); });
    //     post("/archive-project/:id",            (req, res) -> { return CollectProjects.archiveProject(req, res); });
    //     post("/add-user-samples",               (req, res) -> { return CollectProjects.addUserSamples(req, res); });
    //     post("/flag-plot",                      (req, res) -> { return CollectProjects.flagPlot(req, res); });

    //     // Routing Table: Users API
    //     get("/get-all-users",                   (req, res) -> { return OfUsers.getAllUsers(req, res); });
    //     post("/update-user-institution-role",   (req, res) -> { return OfUsers.updateInstitutionRole(req, res); });
    //     post("/request-institution-membership", (req, res) -> { return OfUsers.requestInstitutionMembership(req, res); });

    //     // Routing Table: Institutions API
    //     get("/get-all-institutions",        (req, res) -> { return OfGroups.getAllInstitutions(req, res); });
    //     get("/get-institution-details/:id", (req, res) -> { return OfGroups.getInstitutionDetails(req, res); });
    //     post("/update-institution/:id",     (req, res) -> { return OfGroups.updateInstitution(req, res); });
    //     post("/archive-institution/:id",    (req, res) -> { return OfGroups.archiveInstitution(req, res); });

    //     // Routing Table: Imagery API
    //     get("/get-all-imagery",             (req, res) -> { return CollectImagery.getAllImagery(req, res); });
    //     post("/add-institution-imagery",    (req, res) -> { return CollectImagery.addInstitutionImagery(req, res); });
    //     post("/delete-institution-imagery", (req, res) -> { return CollectImagery.deleteInstitutionImagery(req, res); });

    //     // Routing Table: GeoDash API
    //     get("/geo-dash/id/:id",                  (req, res) -> { return GeoDash.geodashId(req, res); });
    //     get("/geo-dash/update/id/:id",           (req, res) -> { return GeoDash.updateDashBoardByID(req, res); });
    //     get("/geo-dash/createwidget/widget",     (req, res) -> { return GeoDash.createDashBoardWidgetByID(req, res); });
    //     get("/geo-dash/updatewidget/widget/:id", (req, res) -> { return GeoDash.updateDashBoardWidgetByID(req, res); });
    //     get("/geo-dash/deletewidget/widget/:id", (req, res) -> { return GeoDash.deleteDashBoardWidgetByID(req, res); });

    //     // Routing Table: Page Not Found
    //     get("*", (req, res) -> { return freemarker.render(Views.pageNotFound(req, res)); });

    //     // Handle Exceptions
    //     exception(Exception.class, (e, req, res) -> e.printStackTrace());
    // }

    // Maven/Gradle entry point for running with embedded Jetty webserver
    public static void main(String[] args) {
        // Load the SMTP settings for sending reset password emails
        JsonObject smtpSettings = readJsonFile("mail-config.json").getAsJsonObject();
        CeoConfig.baseUrl       = smtpSettings.get("baseUrl").getAsString();
        CeoConfig.smtpUser      = smtpSettings.get("smtpUser").getAsString();
        CeoConfig.smtpServer    = smtpSettings.get("smtpServer").getAsString();
        CeoConfig.smtpPort      = smtpSettings.get("smtpPort").getAsString();
        CeoConfig.smtpPassword  = smtpSettings.get("smtpPassword").getAsString();

        // Start the Jetty webserver on port 8080
        port(8080);

        // Set up the routing table
        declareRoutes("FILE");
    }

    // Tomcat entry point
    public void init() {
        // Set up the routing table
        declareRoutes("COLLECT");
    }

}
