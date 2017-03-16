package org.openforis.ceo;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import spark.ModelAndView;
import spark.Request;
import spark.Response;
import spark.TemplateViewRoute;

public class Views {

    public static TemplateViewRoute home = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Home");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        return new ModelAndView(model, "home.ftl");
    };

    public static TemplateViewRoute about = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "About");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        return new ModelAndView(model, "about.ftl");
    };

    public static TemplateViewRoute login = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Login");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        return new ModelAndView(model, "login.ftl");
    };

    public static TemplateViewRoute register = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Register");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        return new ModelAndView(model, "register.ftl");
    };

    public static TemplateViewRoute password = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Password");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        return new ModelAndView(model, "password.ftl");
    };

    public static TemplateViewRoute passwordReset = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Password-Reset");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("email", "admin@sig-gis.com");
        model.put("password_reset_key", "1234567890ABCDEF");
        return new ModelAndView(model, "password-reset.ftl");
    };

    public static TemplateViewRoute logout = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Logout");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        return new ModelAndView(model, "logout.ftl");
    };

    public static TemplateViewRoute selectProject = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Select-Project");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        List<Map<String, Object>> projects =
            Stream.of("Mekong River Region", "Laos", "Vietnam", "Cambodia")
            .map(name -> {
                    Map<String, Object> project = new HashMap<String, Object>();
                    project.put("id", name.length());
                    project.put("name", name);
                    return project;
                })
            .collect(Collectors.toList());
        model.put("projects", projects);
        return new ModelAndView(model, "select-project.ftl");
    };

    public static TemplateViewRoute account = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Account");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        return new ModelAndView(model, "account.ftl");
    };

    public static TemplateViewRoute dashboard = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Dashboard");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("user_id", 1);
        model.put("project_id", 1);
        return new ModelAndView(model, "dashboard.ftl");
    };

    public static TemplateViewRoute admin = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Admin");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        return new ModelAndView(model, "admin.ftl");
    };

    public static TemplateViewRoute pageNotFound = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("navlink", "Page-Not-Found");
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Page Not Found"});
        return new ModelAndView(model, "page-not-found.ftl");
    };

}
