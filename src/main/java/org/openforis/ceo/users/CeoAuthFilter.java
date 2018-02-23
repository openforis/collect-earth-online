package org.openforis.ceo.users;

import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.RequestUtils.getResponseAsJson;
import static org.openforis.ceo.utils.RequestUtils.prepareGetRequest;

import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.util.GenericData;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.util.Optional;
import org.openforis.ceo.env.CeoConfig;
import spark.Filter;
import spark.Request;
import spark.Response;

public class CeoAuthFilter implements Filter {

    private static final String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;

    public void handle(Request req, Response res) {
        String userIdStr = req.session().attribute("userid");
        if (userIdStr == null) {
            String tokenStr = req.cookie("token");
            if (tokenStr != null) {
                GenericData data = new GenericData();
                data.put("token", tokenStr);
                try {
                    HttpResponse response = prepareGetRequest(OF_USERS_API_URL + "user/" + tokenStr).execute();
                    if (response.isSuccessStatusCode()) {
                        JsonObject user = getResponseAsJson(response).getAsJsonObject();
                        String userId = user.get("id").getAsString();
                        String userEmail = user.get("username").getAsString();
                        HttpRequest roleRequest = prepareGetRequest(OF_USERS_API_URL + "user/" + userId + "/groups");
                        JsonArray jsonRoles = getResponseAsJson(roleRequest.execute()).getAsJsonArray();
                        Optional<JsonObject> matchingRole = findInJsonArray(jsonRoles,
                                jsonRole -> jsonRole.get("groupId").getAsString().equals("1"));
                        String role = matchingRole.isPresent() ? "admin" : "user";
                        req.session().attribute("userid", userId);
                        req.session().attribute("username", userEmail);
                        req.session().attribute("role", role);
                        req.session().attribute("token", tokenStr);
                    }
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }

}
