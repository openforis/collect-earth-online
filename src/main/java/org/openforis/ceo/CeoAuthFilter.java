package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.parseJson;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.http.json.JsonHttpContent;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.GenericData;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.util.Optional;
import spark.Filter;
import spark.Request;
import spark.Response;

public class CeoAuthFilter implements Filter {

    private static final String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;
    private static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    private static final JsonFactory JSON_FACTORY = new JacksonFactory();

    private static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
            request.setParser(new JsonObjectParser(JSON_FACTORY));
        });
    }

    private static HttpRequest prepareGetRequest(String url) throws IOException {
        return createRequestFactory().buildGetRequest(new GenericUrl(url));
    }

    private static HttpRequest preparePostRequest(String url, GenericData data) throws IOException {
        return createRequestFactory().buildPostRequest(new GenericUrl(url),
                new JsonHttpContent(new JacksonFactory(), data));
    }

    private static JsonElement getResponseAsJson(HttpResponse response) throws IOException {
        return parseJson(response.parseAsString());
    }

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
