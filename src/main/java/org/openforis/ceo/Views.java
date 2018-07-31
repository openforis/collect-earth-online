package org.openforis.ceo;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import org.openforis.ceo.env.CeoConfig;
import spark.ModelAndView;
import spark.Request;
import spark.Response;
import spark.Route;
import spark.template.freemarker.FreeMarkerEngine;

public class Views {

    private static final String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;

    private static Map<String, Object> getBaseModel(Request req, String navlink) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("root", CeoConfig.documentRoot);
        model.put("navlink", navlink);
        model.put("userid", req.session().attribute("userid"));
        model.put("username", req.session().attribute("username"));
        model.put("role", req.session().attribute("role"));
        if (req.session().attribute("flash_messages") != null) {
            model.put("flash_messages", req.session().attribute("flash_messages"));
            req.session().removeAttribute("flash_messages");
        } else {
            model.put("flash_messages", new String[]{});
        }
        return model;
    }

    private static void authenticateOrRedirect(Request req, Response res) {
        if (req.session().attribute("userid") == null) {
            res.redirect(CeoConfig.documentRoot + "/home");
        }
    }

    // FIXME: Replace loop with a more elegant construct
    @SuppressWarnings("unchecked")
    private static Map<String, Object> mergeParams(Map<String, Object> model, Object[] extraParams, Request req) {
        for (int i=0; i<extraParams.length; i+=2) {
            String key = extraParams[i].toString();
            Object value = extraParams[i+1];
            if (value instanceof Function) {
                model.put(key, ((Function<Request, String>) value).apply(req));
            } else {
                model.put(key, value);
            }
        }
        return model;
    }

    private static Route makeRoute(String navlink, FreeMarkerEngine freemarker, Object... extraParams) {
        String templateFileName = navlink.toLowerCase() + ".ftl";
        if (extraParams.length == 0) {
            return (req, res) -> {
                Map<String, Object> model = getBaseModel(req, navlink);
                return freemarker.render(new ModelAndView(model, templateFileName));
            };
        } else {
            return (req, res) -> {
                Map<String, Object> model = mergeParams(getBaseModel(req, navlink), extraParams, req);
                return freemarker.render(new ModelAndView(model, templateFileName));
            };
        }
    }

    private static Route makeAuthenticatedRoute(String navlink, FreeMarkerEngine freemarker, Object... extraParams) {
        Route baseRoute = makeRoute(navlink, freemarker, extraParams);
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
                                      "account_id", getAccountId);
    }

    public static Route institution(FreeMarkerEngine freemarker, String storage) {
        Function<Request, String> getInstitutionId = (req) -> req.params(":id");
        Route baseRoute = makeRoute("Institution", freemarker,
                                    "of_users_api_url", OF_USERS_API_URL,
                                    "institution_id", getInstitutionId,
                                    "storage", storage);
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
                         "project_id", getProjectId);
    }

    public static Route project(FreeMarkerEngine freemarker) {
        Function<Request, String> getProjectId = (req) -> req.params(":id");
        Function<Request, String> getInstitutionId = (req) -> req.queryParams("institution");
        return makeAuthenticatedRoute("Project", freemarker,
                                      "project_id", getProjectId,
                                      "institution_id", getInstitutionId);
    }

    public static Route login(FreeMarkerEngine freemarker) {
        Function<Request, String> getReturnUrl = (req) -> {
            String inputReturnURL = req.queryParams("returnurl");
            return (inputReturnURL == null || inputReturnURL.isEmpty()) ? "home" : inputReturnURL;
        };
        Function<Request, String> getQueryString = (req) -> {
            String psssQuery = req.queryString();
            return (psssQuery == null || psssQuery.isEmpty()) ? "empty" : psssQuery;
        };
        return makeRoute("Login", freemarker,
                         "returnurl", getReturnUrl,
                         "querystring", getQueryString);
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
                         "email", getEmail,
                         "password_reset_key", getPasswordResetKey);
    }

    public static Route geodash(FreeMarkerEngine freemarker) {
        Function<Request, String> getEditable = (req) -> req.queryParams("editable");
        return makeRoute("Geo-Dash", freemarker,
                         "editable", getEditable);
    }

    public static Route editWidgetLayout(FreeMarkerEngine freemarker) {
        Function<Request, String> getPid = (req) -> req.queryParams("pid");
        return makeAuthenticatedRoute("Widget-Layout-Editor", freemarker,
                                      "project_id", getPid);
    }

    public static Route cardTest(FreeMarkerEngine freemarker) {
        return makeRoute("Card-Test", freemarker);
    }

    public static Route pageNotFound(FreeMarkerEngine freemarker) {
        return makeRoute("Page-Not-Found", freemarker);
    }

}
