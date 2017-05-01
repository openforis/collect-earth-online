package org.openforis.ceo;

import java.util.HashMap;
import java.util.Map;
import spark.ModelAndView;
import spark.Request;
import spark.Response;

public class Views {

    public static ModelAndView home(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Home");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "home.ftl");
    }

    public static ModelAndView about(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "About");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "about.ftl");
    }

    public static ModelAndView login(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Login");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "login.ftl");
    }

    public static ModelAndView register(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Register");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "register.ftl");
    }

    public static ModelAndView password(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Password");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "password.ftl");
    }

    public static ModelAndView passwordReset(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Password-Reset");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        model.put("email", "admin@sig-gis.com");
        model.put("password_reset_key", "1234567890ABCDEF");
        return new ModelAndView(model, "password-reset.ftl");
    }

    public static ModelAndView logout(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Logout");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "logout.ftl");
    }

    public static ModelAndView selectProject(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Select-Project");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "select-project.ftl");
    }

    public static ModelAndView account(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Account");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "account.ftl");
    }

    public static ModelAndView dashboard(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Dashboard");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        model.put("user_id", 1);
        model.put("project_id", req.queryParams("project") != null ? req.queryParams("project") : "-1");
        return new ModelAndView(model, "dashboard.ftl");
    }

    // FIXME: Implement project creation when request method = POST.
    public static ModelAndView admin(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Admin");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "admin.ftl");
    }

    public static ModelAndView geodash(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Geo-Dash");
        model.put("nav_visibility", "hidden");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {});
        return new ModelAndView(model, "geo-dash.ftl");
    }

    public static ModelAndView pageNotFound(Request req, Response rsp) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Page-Not-Found");
        model.put("nav_visibility", "visible");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Page Not Found"});
        return new ModelAndView(model, "page-not-found.ftl");
    }

}
