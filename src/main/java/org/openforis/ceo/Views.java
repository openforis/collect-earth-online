package org.openforis.ceo;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import spark.ModelAndView;
import spark.Request;
import spark.Response;

public class Views {

    private static Map<String, Object> getBaseModel(Request req, String navlink, String contentSize) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("root", Server.documentRoot);
        model.put("background_image", "linear-gradient(to bottom right, rgba(63,171,198,0.35), rgba(63,171,198,0.05), rgba(63,171,198,0.35))");
        model.put("navlink", navlink);
        model.put("content_size", contentSize);
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

    // FIXME: Make this test more robust
    private static void authenticateOrRedirect(Request req, Response res, String[] requiredRoles) {
        String currentRole = req.session().attribute("role");
        if (! Arrays.asList(requiredRoles).contains(currentRole)) {
            res.redirect(Server.documentRoot + "/home");
        }
    }

    public static ModelAndView home(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Home", "large"), "home.ftl");
    }

    public static ModelAndView about(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "About", "small"), "about.ftl");
    }

    public static ModelAndView support(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Support", "large"), "support.ftl");
    }

    public static ModelAndView account(Request req, Response res) {
        authenticateOrRedirect(req, res, new String[]{"user", "admin"});
        Map<String, Object> model = getBaseModel(req, "Account", "large");
        model.put("account_id", req.params(":id"));
        return new ModelAndView(model, "account.ftl");
    }

    public static ModelAndView institution(Request req, Response res) {
        if (req.params(":id").equals("0")) {
            authenticateOrRedirect(req, res, new String[]{"user", "admin"});
        }
        Map<String, Object> model = getBaseModel(req, "Institution", "large");
        model.put("institution_id", req.params(":id"));
        return new ModelAndView(model, "institution.ftl");
    }

    public static ModelAndView collection(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Collection", "large");
        model.put("project_id", req.params(":id"));
        return new ModelAndView(model, "collection.ftl");
    }

    public static ModelAndView project(Request req, Response res) {
        authenticateOrRedirect(req, res, new String[]{"user", "admin"});
        Map<String, Object> model = getBaseModel(req, "Project", "large");
        model.put("project_id", req.params(":id"));
        if (req.params(":id").equals("0")) {
            model.put("institution_id", req.queryParams("institution"));
        }
        return new ModelAndView(model, "project.ftl");
    }

    public static ModelAndView login(Request req, Response res) {
        //String inputReturnURL = req.queryParams("returnurl");
        Map<String, Object> model = getBaseModel(req, "Project", "large");
        String inputReturnURL = req.queryParams("returnurl");
        String returnURL = "home";
        if(inputReturnURL != null && !inputReturnURL.isEmpty()) {
            returnURL = inputReturnURL;
        }
        String psssQuery = req.queryString();
        if(psssQuery == null || psssQuery.isEmpty()) {
            psssQuery = "empty";
        }
        model.put("returnurl", returnURL );
        model.put("querystring", psssQuery );
        return new ModelAndView(model, "login.ftl");
    }

    public static ModelAndView register(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Register", "large"), "register.ftl");
    }

    public static ModelAndView password(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Password", "large"), "password.ftl");
    }

    public static ModelAndView passwordReset(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Password-Reset", "large");
        model.put("email", req.queryParams("email"));
        model.put("password_reset_key", req.queryParams("password-reset-key"));
        return new ModelAndView(model, "password-reset.ftl");
    }

    public static ModelAndView geodash(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Geo-Dash", "full");
        model.put("editable", req.queryParams("editable"));
        return new ModelAndView(model, "geo-dash.ftl");
    }

    public static ModelAndView cardTest(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Card-Test", "large"), "card-test.ftl");
    }

    public static ModelAndView pageNotFound(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Page-Not-Found", "large"), "page-not-found.ftl");
    }

}
