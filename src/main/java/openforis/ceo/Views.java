package openforis.ceo;

import java.util.HashMap;
import java.util.Map;
import spark.ModelAndView;
import spark.Request;
import spark.Response;
import spark.TemplateViewRoute;

public class Views {

    public static TemplateViewRoute home = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "home.ftl");
    };

    public static TemplateViewRoute about = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "about.ftl");
    };

    public static TemplateViewRoute login = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "login.ftl");
    };

    public static TemplateViewRoute register = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "register.ftl");
    };

    public static TemplateViewRoute password = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "password.ftl");
    };

    public static TemplateViewRoute passwordReset = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "password-reset.ftl");
    };

    public static TemplateViewRoute logout = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "logout.ftl");
    };

    public static TemplateViewRoute selectProject = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "select-project.ftl");
    };

    public static TemplateViewRoute account = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "account.ftl");
    };

    public static TemplateViewRoute dashboard = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "dashboard.ftl");
    };

    public static TemplateViewRoute admin = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "admin.ftl");
    };

    public static TemplateViewRoute pageNotFound = (Request req, Response rsp) -> {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("message", "Hello World!");
        return new ModelAndView(model, "page-not-found.ftl");
    };

}
