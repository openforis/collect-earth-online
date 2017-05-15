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
        // model.put("background_image", "url(img/mountain-field-scenery-small.jpg)");
        model.put("background_image", "linear-gradient(to bottom right, rgba(63,171,198,0.35), rgba(63,171,198,0.05), rgba(63,171,198,0.35))");
        model.put("branding_image_file", "ceo-logo1.png");
        model.put("navlink", navlink);
        model.put("content_size", contentSize);
        model.put("role", req.session().attribute("role"));
        model.put("username", req.session().attribute("username"));
        if (req.session().attribute("flash_messages") != null) {
            model.put("flash_messages", req.session().attribute("flash_messages"));
            req.session().removeAttribute("flash_messages");
        } else {
            model.put("flash_messages", new String[]{});
        }
        return model;
    }

    private static void authenticateOrRedirect(Request req, Response res, String[] requiredRoles) {
        String currentRole = req.session().attribute("role");
        if (! Arrays.asList(requiredRoles).contains(currentRole)) {
            res.redirect("/home");
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
        return new ModelAndView(getBaseModel(req, "Account", "large"), "account.ftl");
    }

    public static ModelAndView dashboard(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Dashboard", "large");
        model.put("project_id", req.queryParams("project"));
        return new ModelAndView(model, "dashboard.ftl");
    }

    public static ModelAndView admin(Request req, Response res) {
        authenticateOrRedirect(req, res, new String[]{"admin"});
        return new ModelAndView(getBaseModel(req, "Admin", "large"), "admin.ftl");
    }

    public static ModelAndView login(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Login", "large"), "login.ftl");
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
        return new ModelAndView(getBaseModel(req, "Geo-Dash", "full"), "geo-dash.ftl");
    }

    public static ModelAndView pageNotFound(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Page-Not-Found", "large"), "page-not-found.ftl");
    }

}
