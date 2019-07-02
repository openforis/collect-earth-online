package org.openforis.ceo;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Stream;
import java.util.stream.Collectors;
import org.openforis.ceo.env.CeoConfig;
import spark.ModelAndView;
import spark.Request;
import spark.Response;
import spark.Route;
import spark.template.freemarker.FreeMarkerEngine;

public class Views {

    private static String fromSession(Request req, String attr) {
        var value = (String) req.session().attribute(attr);
        return (value == null) ? "" : value;
    }

    private static Map<String, String> getBaseModel(Request req, String navlink) {
        var model = Map.of("root",          CeoConfig.documentRoot,
                           "navlink",       navlink,
                           "uri",           req.uri(),
                           "userid",        fromSession(req, "userid"),
                           "username",      fromSession(req, "username"),
                           "role",          fromSession(req, "role"),
                           "flash_message", fromSession(req, "flash_message"));

        if (req.session().attribute("flash_message") != null) {
            req.session().removeAttribute("flash_message");
        }

        return model;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> mergeParams(Map<String, String> model, Map<String, Object> extraParams, Request req) {
        return Stream.concat(model.entrySet().stream(),
                             extraParams.entrySet().stream())
            .collect(Collectors.toMap(e -> e.getKey(),
                                      e -> {
                                          var value = e.getValue();
                                          if (value instanceof Function) {
                                              var result = ((Function<Request, String>) value).apply(req);
                                              return (result == null) ? "" : result;
                                          } else {
                                              return value.toString();
                                          }}));
    }

    private static Route makeRoute(String navlink, FreeMarkerEngine freemarker) {
        var templateFileName = navlink.toLowerCase() + ".ftl";
        return (req, res) -> {
            var model = getBaseModel(req, navlink);
            return freemarker.render(new ModelAndView(model, templateFileName));
        };
    }

    private static Route makeRoute(String navlink, FreeMarkerEngine freemarker, Map<String, Object> extraParams) {
        var templateFileName = navlink.toLowerCase() + ".ftl";
        return (req, res) -> {
            var model = mergeParams(getBaseModel(req, navlink), extraParams, req);
            return freemarker.render(new ModelAndView(model, templateFileName));
        };
    }

    public static Route home(FreeMarkerEngine freemarker) {
        return makeRoute("Home", freemarker);
    }

    public static Route about(FreeMarkerEngine freemarker) {
        return makeRoute("About", freemarker);
    }

    public static Route support(FreeMarkerEngine freemarker) {
        return makeRoute("Support", freemarker);
    }

    public static Route account(FreeMarkerEngine freemarker) {
        Function<Request, String> getAccountId = (req) -> req.queryParams("userId");
        return makeRoute("Account",
                         freemarker,
                         Map.of("account_id", getAccountId));
    }

    public static Route createInstitution(FreeMarkerEngine freemarker) {
        return makeRoute("Create-Institution", freemarker);
    }

    public static Route reviewInstitution(FreeMarkerEngine freemarker, String storage) {
        Function<Request, String> getInstitutionId = (req) -> req.queryParams("institutionId");
        return makeRoute("Review-Institution",
                         freemarker,
                         Map.of("of_users_api_url", CeoConfig.ofUsersApiUrl,
                                "institution_id", getInstitutionId,
                                "storage", storage));
    }

    public static Route collection(FreeMarkerEngine freemarker) {
        Function<Request, String> getProjectId = (req) -> req.queryParams("projectId");
        return makeRoute("Collection",
                         freemarker,
                         Map.of("project_id", getProjectId));
    }

    public static Route createProject(FreeMarkerEngine freemarker) {
        Function<Request, String> getInstitutionId = (req) -> req.queryParams("institutionId");
        return makeRoute("Create-Project",
                         freemarker,
                         Map.of("institution_id", getInstitutionId));
    }

    public static Route reviewProject(FreeMarkerEngine freemarker) {
        Function<Request, String> getProjectId = (req) -> req.queryParams("projectId");
        return makeRoute("Review-Project",
                         freemarker,
                         Map.of("project_id", getProjectId));
    }

    public static Route projectDashboard(FreeMarkerEngine freemarker) {
        Function<Request, String> getProjectId = (req) -> req.queryParams("projectId");
        Function<Request, String> getInstitutionId = (req) -> req.queryParams("institutionId");
        return makeRoute("Project-Dashboard",
                         freemarker,
                         Map.of("project_id", getProjectId,
                                "institution_id", getInstitutionId));
    }

    public static Route institutionDashboard(FreeMarkerEngine freemarker) {
        Function<Request, String> getInstitutionId = (req) -> req.queryParams("institutionId");
        return makeRoute("Institution-Dashboard",
                         freemarker,
                         Map.of("institution_id", getInstitutionId));
    }

    public static Route login(FreeMarkerEngine freemarker) {
        Function<Request, String> getReturnUrl = (req) -> req.queryParams("returnurl");
        return makeRoute("Login",
                         freemarker,
                         Map.of("returnurl", getReturnUrl));
    }

    public static Route register(FreeMarkerEngine freemarker) {
        return makeRoute("Register", freemarker);
    }

    public static Route password(FreeMarkerEngine freemarker) {
        return makeRoute("Password", freemarker);
    }

    public static Route passwordReset(FreeMarkerEngine freemarker) {
        Function<Request, String> getEmail = (req) -> req.queryParams("email");
        Function<Request, String> getPasswordResetKey = (req) -> req.queryParams("password-reset-key");
        return makeRoute("Password-Reset",
                         freemarker,
                         Map.of("email", getEmail,
                                "password_reset_key", getPasswordResetKey));
    }

    public static Route geoDash(FreeMarkerEngine freemarker) {
        Function<Request, String> getEditable = (req) -> req.queryParams("editable");
        return makeRoute("Geo-Dash",
                         freemarker,
                         Map.of("editable", getEditable));
    }

    public static Route geoDashHelp(FreeMarkerEngine freemarker) {
        Function<Request, String> getBrowserLanguage = (req) -> req.raw().getLocale().getLanguage();
        return makeRoute("Geo-Dash-Help",
                         freemarker,
                         Map.of("browserLanguage", getBrowserLanguage));
    }

    public static Route editWidgetLayout(FreeMarkerEngine freemarker) {
        Function<Request, String> getPid = (req) -> req.queryParams("projectId");
        return makeRoute("Widget-Layout-Editor",
                         freemarker,
                         Map.of("project_id", getPid));
    }

    public static Route pageNotFound(FreeMarkerEngine freemarker) {
        return makeRoute("Page-Not-Found", freemarker);
    }

}
