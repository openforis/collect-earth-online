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
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import spark.Request;
import spark.Response;

public class OfUsers {

    static String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;
    static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    static final JsonFactory JSON_FACTORY = new JacksonFactory();

    private static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
            request.setParser(new JsonObjectParser(JSON_FACTORY));
        });
    }

    private static HttpRequest prepareGetRequest(String url) throws IOException {
        return createRequestFactory().buildGetRequest(new GenericUrl(url));
    }

    private static HttpRequest preparePostRequest(String url, GenericData data) throws IOException {
        return createRequestFactory()
            .buildPostRequest(new GenericUrl(url),
                              new JsonHttpContent(new JacksonFactory(), data));
    }

    private static JsonElement getResponseAsJson(HttpResponse response) throws IOException {
        return JsonUtils.parseJson(response.parseAsString());
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
            HttpResponse response = preparePostRequest(OF_USERS_API_URL + "login", data).execute(); // login request;
            if (response.isSuccessStatusCode()) {
                HttpRequest userRequest = prepareGetRequest(OF_USERS_API_URL + "user"); // get user request
                userRequest.getUrl().put("username", inputEmail);
                String userId = getResponseAsJson(userRequest.execute()).getAsJsonArray().get(0).getAsJsonObject().get("id").getAsString();
                HttpRequest roleRequest = prepareGetRequest(OF_USERS_API_URL + "user/" + userId + "/groups"); // get roles
                JsonArray jsonRoles = getResponseAsJson(roleRequest.execute()).getAsJsonArray();
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

    public static Request register(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");
        try {
            if (! Users.isEmail(inputEmail)) {
                req.session().attribute("flash_messages", new String[]{inputEmail + " is not a valid email address."});
            } else if (inputPassword.length() < 8) {
                req.session().attribute("flash_messages", new String[]{"Password must be at least 8 characters."});
            } else if (! inputPassword.equals(inputPasswordConfirmation)) {
                req.session().attribute("flash_messages", new String[]{"Password and Password confirmation do not match."});
            } else {
                HttpRequest userRequest = prepareGetRequest(OF_USERS_API_URL + "user"); // get user request
                userRequest.getUrl().put("username", inputEmail);
                JsonArray users = getResponseAsJson(userRequest.execute()).getAsJsonArray();
                Optional<JsonObject> matchingUser = findInJsonArray(users, user -> user.get("username").getAsString().equals(inputEmail));
                if (matchingUser.isPresent()) {
                    req.session().attribute("flash_messages", new String[]{"Account " + inputEmail + " already exists."});
                } else {
                    // Add a new user to the database
                    GenericData data = new GenericData();
                    data.put("username", inputEmail);
                    data.put("rawPassword", inputPassword);
                    HttpResponse response = preparePostRequest(OF_USERS_API_URL + "user", data).execute(); // login request;
                    if (response.isSuccessStatusCode()) {
                        String newUserId = getResponseAsJson(response).getAsJsonObject().get("id").getAsString();
                        // Assign the username and role session attributes
                        req.session().attribute("userid", newUserId);
                        req.session().attribute("username", inputEmail);
                        req.session().attribute("role", "user");
                        // Redirect to the Home page
                        res.redirect(Server.documentRoot + "/home");
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_messages", new String[]{"Invalid email/password combination."});
        }
        return req;
    }

}
