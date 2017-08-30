package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.findInJsonArray;

import java.io.IOException;
import java.util.Optional;

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
import com.google.gson.JsonObject;

import spark.Request;
import spark.Response;

public class OfUsers {

    static String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;
    static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    static final JsonFactory JSON_FACTORY = new JacksonFactory();

    public static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
            request.setParser(new JsonObjectParser(JSON_FACTORY));
        });
    }

    /**
     * Call Of-Users' REST API to QUERY the database.
     * @param req
     * @param res
     * @return
     */
    public static Request login(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        try {
            GenericData data = new GenericData();
            data.put("username", inputEmail);
            data.put("rawPassword", inputPassword);
            JsonHttpContent content = new JsonHttpContent(new JacksonFactory(), data);
            HttpRequestFactory requestFactory = createRequestFactory();
            HttpRequest request = requestFactory.buildPostRequest(new GenericUrl(OF_USERS_API_URL + "login"), content); // login request
            HttpResponse response = request.execute();
            if (response.isSuccessStatusCode()) {
                request = requestFactory.buildGetRequest(new GenericUrl(OF_USERS_API_URL + "user")); // get user request
                request.getUrl().put("username", inputEmail);
                String user = request.execute().parseAsString();
                JsonObject jsonUser = JsonUtils.parseJson(user).getAsJsonArray().get(0).getAsJsonObject();
                String userId = jsonUser.get("id").getAsString();
                request = requestFactory.buildGetRequest(new GenericUrl(OF_USERS_API_URL + "user/" + userId + "/groups")); // get roles
                String roles = request.execute().parseAsString();
                JsonArray jsonRoles = JsonUtils.parseJson(roles).getAsJsonArray();
                Optional<JsonObject> matchingUser = findInJsonArray(jsonRoles, jsonRole -> jsonRole.get("groupId").getAsString().equals("1"));
                String role = matchingUser.isPresent() ? "admin" : "user";
                // Authentication successful
                req.session().attribute("userid", userId);
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", role);
                res.redirect(Server.documentRoot + "/home");
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_messages", new String[]{"Invalid email/password combination."});
        }
        return req;
    }

}
