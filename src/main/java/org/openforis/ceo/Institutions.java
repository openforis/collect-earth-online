package org.openforis.ceo;

import com.google.gson.JsonArray;
import java.util.Arrays;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.*;

public class Institutions {

    public static String getAllInstitutions(Request req, Response res) {
        JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
        String[] hiddenInstitutions = new String[]{"All Users", "Administrators"};
        JsonArray visibleInstitutions = filterJsonArray(institutions, institution -> !Arrays.asList(hiddenInstitutions).contains(institution.get("name").getAsString()));
        return visibleInstitutions.toString();
    }

}
