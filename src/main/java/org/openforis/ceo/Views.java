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
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Home Page"});
        return new ModelAndView(model, "home.ftl");
    };

    public static TemplateViewRoute about = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"About Page"});
        return new ModelAndView(model, "about.ftl");
    };

    public static TemplateViewRoute login = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Login Page"});
        return new ModelAndView(model, "login.ftl");
    };

    public static TemplateViewRoute register = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Register Page"});
        return new ModelAndView(model, "register.ftl");
    };

    public static TemplateViewRoute password = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Password Page"});
        return new ModelAndView(model, "password.ftl");
    };

    public static TemplateViewRoute passwordReset = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Password Reset Page"});
        model.put("email", "admin@sig-gis.com");
        model.put("password_reset_key", "1234567890ABCDEF");
        return new ModelAndView(model, "password-reset.ftl");
    };

    public static TemplateViewRoute logout = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Logout Page"});
        return new ModelAndView(model, "logout.ftl");
    };

    public static TemplateViewRoute selectProject = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Select Project Page"});
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
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Account Page"});
        return new ModelAndView(model, "account.ftl");
    };

    public static TemplateViewRoute dashboard = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Dashboard Page"});
        model.put("user_id", 1);
        model.put("project_id", 1);
        return new ModelAndView(model, "dashboard.ftl");
    };

    public static TemplateViewRoute admin = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Admin Page"});
        return new ModelAndView(model, "admin.ftl");
    };

    public static TemplateViewRoute pageNotFound = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("role", "admin");
        model.put("username", "admin@sig-gis.com");
        model.put("flash_messages", new String[] {"Page Not Found Page"});
        return new ModelAndView(model, "page-not-found.ftl");
    };

}
