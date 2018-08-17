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
        if (value == null) {
            return "";
        } else {
            return value;
        }
    }

    private static Map<String, String> getBaseModel(Request req, String navlink) {
        var model = Map.of("root",          CeoConfig.documentRoot,
                           "navlink",       navlink,
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
                                              if (result == null) {
                                                  return "";
                                              } else {
                                                  return result;
                                              }
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

    private static void authenticateOrRedirect(Request req, Response res) {
        if (req.session().attribute("userid") == null) {
            res.redirect(CeoConfig.documentRoot + "/home");
        }
    }

    private static Route makeAuthenticatedRoute(String navlink, FreeMarkerEngine freemarker) {
        var baseRoute = makeRoute(navlink, freemarker);
        return (req, res) -> {
            authenticateOrRedirect(req, res);
            return baseRoute.handle(req, res);
        };
    }

    private static Route makeAuthenticatedRoute(String navlink, FreeMarkerEngine freemarker, Map<String, Object> extraParams) {
        var baseRoute = makeRoute(navlink, freemarker, extraParams);
        return (req, res) -> {
            authenticateOrRedirect(req, res);
            return baseRoute.handle(req, res);
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
        Function<Request, String> getAccountId = (req) -> req.params(":id");
        return makeAuthenticatedRoute("Account", freemarker,
                                      Map.of("account_id", getAccountId));
    }

    public static Route institution(FreeMarkerEngine freemarker, String storage) {
        Function<Request, String> getInstitutionId = (req) -> req.params(":id");
        var baseRoute = makeRoute("Institution", freemarker,
                                    Map.of("of_users_api_url", CeoConfig.ofUsersApiUrl,
                                           "institution_id", getInstitutionId,
                                           "storage", storage));
        return (req, res) -> {
            if (req.params(":id").equals("0")) {
                authenticateOrRedirect(req, res);
            }
            return baseRoute.handle(req, res);
        };
    }

    public static Route collection(FreeMarkerEngine freemarker) {
        Function<Request, String> getProjectId = (req) -> req.params(":id");
        return makeRoute("Collection", freemarker,
                         Map.of("project_id", getProjectId));
    }

    public static Route project(FreeMarkerEngine freemarker) {
        Function<Request, String> getProjectId = (req) -> req.params(":id");
        Function<Request, String> getInstitutionId = (req) -> req.queryParams("institution");
        return makeAuthenticatedRoute("Project", freemarker,
                                      Map.of("project_id", getProjectId,
                                             "institution_id", getInstitutionId));
    }

    public static Route login(FreeMarkerEngine freemarker) {
        Function<Request, String> getReturnUrl = (req) -> {
            var inputReturnURL = req.queryParams("returnurl");
            return (inputReturnURL == null || inputReturnURL.isEmpty()) ? "home" : inputReturnURL;
        };
        Function<Request, String> getQueryString = (req) -> {
            var psssQuery = req.queryString();
            return (psssQuery == null || psssQuery.isEmpty()) ? "empty" : psssQuery;
        };
        return makeRoute("Login", freemarker,
                         Map.of("returnurl", getReturnUrl,
                                "querystring", getQueryString));
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
        return makeRoute("Password-Reset", freemarker,
                         Map.of("email", getEmail,
                                "password_reset_key", getPasswordResetKey));
    }

    public static Route geodash(FreeMarkerEngine freemarker) {
        Function<Request, String> getEditable = (req) -> req.queryParams("editable");
        return makeRoute("Geo-Dash", freemarker,
                         Map.of("editable", getEditable));
    }

    public static Route editWidgetLayout(FreeMarkerEngine freemarker) {
        Function<Request, String> getPid = (req) -> req.queryParams("pid");
        return makeAuthenticatedRoute("Widget-Layout-Editor", freemarker,
                                      Map.of("project_id", getPid));
    }

    public static Route cardTest(FreeMarkerEngine freemarker) {
        return makeRoute("Card-Test", freemarker);
    }

    public static Route pageNotFound(FreeMarkerEngine freemarker) {
        return makeRoute("Page-Not-Found", freemarker);
    }

}
