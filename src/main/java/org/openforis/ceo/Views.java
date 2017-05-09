package org.openforis.ceo;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import spark.ModelAndView;
import spark.Request;
import spark.Response;

public class Views {

    private static Map<String, Object> getBaseModel(Request req, String navlink) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("background_image_file", "mountain-field-scenery-small.jpg");
        model.put("branding_banner_position", "bottom");
        model.put("branding_image_file", "ceo_logo1.png");
        model.put("navlink", navlink);
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
            res.redirect("/home"); // FIXME: Create an Access Denied Page
        }
    }

    public static ModelAndView home(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Home");
        model.put("branding_banner_position", "top");
        return new ModelAndView(model, "home.ftl");
    }

    public static ModelAndView about(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "About"), "about.ftl");
    }

    public static ModelAndView tutorials(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Tutorials"), "tutorials.ftl");
    }

    public static ModelAndView demo(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Demo"), "demo.ftl");
    }

    public static ModelAndView account(Request req, Response res) {
        authenticateOrRedirect(req, res, new String[]{"user", "admin"});
        return new ModelAndView(getBaseModel(req, "Account"), "account.ftl");
    }

    public static ModelAndView selectProject(Request req, Response res) {
        authenticateOrRedirect(req, res, new String[]{"user", "admin"});
        return new ModelAndView(getBaseModel(req, "Select-Project"), "select-project.ftl");
    }

    public static ModelAndView dashboard(Request req, Response res) {
        authenticateOrRedirect(req, res, new String[]{"user", "admin"});
        Map<String, Object> model = getBaseModel(req, "Dashboard");
        model.put("project_id", req.queryParams("project") != null ? req.queryParams("project") : "-1");
        return new ModelAndView(model, "dashboard.ftl");
    }

    public static ModelAndView admin(Request req, Response res) {
        authenticateOrRedirect(req, res, new String[]{"admin"});
        return new ModelAndView(getBaseModel(req, "Admin"), "admin.ftl");
    }

    public static ModelAndView login(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Login"), "login.ftl");
    }

    public static ModelAndView register(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Register"), "register.ftl");
    }

    public static ModelAndView password(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Password"), "password.ftl");
    }

    public static ModelAndView passwordReset(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Password-Reset");
        model.put("email", "admin@sig-gis.com");
        model.put("password_reset_key", "1234567890ABCDEF");
        return new ModelAndView(model, "password-reset.ftl");
    }

    public static ModelAndView logout(Request req, Response res) {
        return new ModelAndView(getBaseModel(req, "Logout"), "logout.ftl");
    }

    public static ModelAndView geodash(Request req, Response res) {
        authenticateOrRedirect(req, res, new String[]{"user", "admin"});
        return new ModelAndView(getBaseModel(req, "Geo-Dash"), "geo-dash.ftl");
    }

    public static ModelAndView pageNotFound(Request req, Response res) {
        Map<String, Object> model = getBaseModel(req, "Page-Not-Found");
        model.put("flash_messages", new String[]{"Page Not Found"});
        return new ModelAndView(model, "page-not-found.ftl");
    }

}
