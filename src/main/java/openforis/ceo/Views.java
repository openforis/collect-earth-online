package openforis.ceo;

import java.util.HashMap;
import java.util.Map;
import spark.ModelAndView;
import spark.Request;
import spark.Response;
import spark.TemplateViewRoute;

public class Views {

    public static TemplateViewRoute homePage =
        (Request request, Response response) -> {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("message", "Hello World!");
        return new ModelAndView(attributes, "hello.ftl");
    };

}
