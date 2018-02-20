package org.openforis.ceo;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import spark.ModelAndView;
import spark.Request;
import spark.Response;

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

    public static ModelAndView home(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Home"), "home.ftl");
    }

    public static ModelAndView about(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "About"), "about.ftl");
    }

    public static ModelAndView support(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Support"), "support.ftl");
    }

    public static ModelAndView account(Request req, Response res) {
        authenticateOrRedirect(req, res);
        Map<String, Object> model = getBaseModel(req, "Account");
        model.put("account_id", req.params(":id"));
        return new ModelAndView(model, "account.ftl");
    }

    public static ModelAndView institution(Request req, Response res) {
        if (req.params(":id").equals("0")) {
            authenticateOrRedirect(req, res);
        }
        Map<String, Object> model = getBaseModel(req, "Institution");
        model.put("of_users_api_url", OF_USERS_API_URL);
        model.put("institution_id", req.params(":id"));
        return new ModelAndView(model, "institution.ftl");
    }

    public static ModelAndView collection(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Collection");
        model.put("project_id", req.params(":id"));
        return new ModelAndView(model, "collection.ftl");
    }

    public static ModelAndView project(Request req, Response res) {
        authenticateOrRedirect(req, res);
        Map<String, Object> model = getBaseModel(req, "Project");
        model.put("project_id", req.params(":id"));
        if (req.params(":id").equals("0")) {
            model.put("institution_id", req.queryParams("institution"));
        }
        return new ModelAndView(model, "project.ftl");
    }

    public static ModelAndView login(Request req, Response res) {
        String inputReturnURL = req.queryParams("returnurl");
        String psssQuery = req.queryString();
        Map<String, Object> model = getBaseModel(req, "Login");
        model.put("returnurl", (inputReturnURL == null || inputReturnURL.isEmpty()) ? "home" : inputReturnURL);
        model.put("querystring", (psssQuery == null || psssQuery.isEmpty()) ? "empty" : psssQuery);
        return new ModelAndView(model, "login.ftl");
    }

    public static ModelAndView register(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Register"), "register.ftl");
    }

    public static ModelAndView password(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Password"), "password.ftl");
    }

    public static ModelAndView passwordReset(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Password-Reset");
        model.put("email", req.queryParams("email"));
        model.put("password_reset_key", req.queryParams("password-reset-key"));
        return new ModelAndView(model, "password-reset.ftl");
    }

    public static ModelAndView geodash(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Geo-Dash");
        model.put("editable", req.queryParams("editable"));
        return new ModelAndView(model, "geo-dash.ftl");
    }

    public static ModelAndView cardTest(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Card-Test"), "card-test.ftl");
    }

    public static ModelAndView pageNotFound(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Page-Not-Found"), "page-not-found.ftl");
    }

}
