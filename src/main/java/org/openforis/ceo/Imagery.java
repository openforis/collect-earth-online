package org.openforis.ceo;

import com.google.gson.JsonArray;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.readJsonFile;

public class Imagery {

    public static String getAllImagery(Request req, Response res) {
        String institutionId = req.queryParams("institutionId");
        JsonArray imagery = readJsonFile("imagery-list.json").getAsJsonArray();
        return imagery.toString();
    }

}
