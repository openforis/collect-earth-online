package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.intoJsonArray;
import static org.openforis.ceo.JsonUtils.parseJson;
import static org.openforis.ceo.JsonUtils.toStream;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpHeaders;
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
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import spark.Request;
import spark.Response;

public class OfUsers {

    static String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;
    static final String SMTP_USER = CeoConfig.smtpUser;
    static final String SMTP_SERVER = CeoConfig.smtpServer;
    static final String SMTP_PORT = CeoConfig.smtpPort;
    static final String SMTP_PASSWORD = CeoConfig.smtpPassword;
    static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    static final JsonFactory JSON_FACTORY = new JacksonFactory();

    private static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
                request.setParser(new JsonObjectParser(JSON_FACTORY));
            });
    }

    private static HttpRequestFactory createPatchRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
                request.setHeaders(new HttpHeaders().set("X-HTTP-Method-Override", "PATCH"));
                request.setParser(new JsonObjectParser(JSON_FACTORY));
            });
    }

    private static HttpRequest prepareGetRequest(String url) throws IOException {
        return createRequestFactory().buildGetRequest(new GenericUrl(url));
    }

    private static HttpRequest preparePatchRequest(String url, GenericData data) throws IOException {
        return createPatchRequestFactory()
            .buildPostRequest(new GenericUrl(url),
                              new JsonHttpContent(new JacksonFactory(), data));
    }

    private static HttpRequest preparePostRequest(String url, GenericData data) throws IOException {
        return createRequestFactory()
            .buildPostRequest(new GenericUrl(url),
                              new JsonHttpContent(new JacksonFactory(), data));
    }

    private static JsonElement getResponseAsJson(HttpResponse response) throws IOException {
        return parseJson(response.parseAsString());
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
            HttpResponse response = preparePostRequest(OF_USERS_API_URL + "login", data).execute(); // login request
            if (response.isSuccessStatusCode()) {
                // Authentication successful
                HttpRequest userRequest = prepareGetRequest(OF_USERS_API_URL + "user"); // get user request
                userRequest.getUrl().put("username", inputEmail);
                String userId = getResponseAsJson(userRequest.execute()).getAsJsonArray().get(0).getAsJsonObject().get("id").getAsString();
                HttpRequest roleRequest = prepareGetRequest(OF_USERS_API_URL + "user/" + userId + "/groups"); // get roles
                JsonArray jsonRoles = getResponseAsJson(roleRequest.execute()).getAsJsonArray();
                Optional<JsonObject> matchingRole = findInJsonArray(jsonRoles, jsonRole -> jsonRole.get("groupId").getAsString().equals("1"));
                String role = matchingRole.isPresent() ? "admin" : "user";
                req.session().attribute("userid", userId);
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", role);
                res.redirect(Server.documentRoot + "/home");
            } else {
                // Authentication failed
                req.session().attribute("flash_messages", new String[]{"Invalid email/password combination."});
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_messages", new String[]{"An error occurred. Please try again later."});
        }
        return req;
    }

    public static Request register(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");
        try {
            // Validate input params and assign flash_messages if invalid
            if (!Users.isEmail(inputEmail)) {
                req.session().attribute("flash_messages", new String[]{inputEmail + " is not a valid email address."});
            } else if (inputPassword.length() < 8) {
                req.session().attribute("flash_messages", new String[]{"Password must be at least 8 characters."});
            } else if (!inputPassword.equals(inputPasswordConfirmation)) {
                req.session().attribute("flash_messages", new String[]{"Password and Password confirmation do not match."});
            } else {
                HttpRequest userRequest = prepareGetRequest(OF_USERS_API_URL + "user"); // get user
                userRequest.getUrl().put("username", inputEmail);
                HttpResponse response = userRequest.execute();
                if (response.isSuccessStatusCode()) {
                    JsonArray users = getResponseAsJson(response).getAsJsonArray();
                    if (users.size() > 0) {
                        req.session().attribute("flash_messages", new String[]{"Account " + inputEmail + " already exists."});
                    } else {
                        // Add a new user to the database
                        GenericData data = new GenericData();
                        data.put("username", inputEmail);
                        data.put("rawPassword", inputPassword);
                        response = preparePostRequest(OF_USERS_API_URL + "user", data).execute(); // register
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
                } else {
                    throw new IOException();
                }
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_messages", new String[]{"An error occurred. Please try again later."});
        }
        return req;
    }

    public static Request logout(Request req) {
        req.session().removeAttribute("userid");
        req.session().removeAttribute("username");
        req.session().removeAttribute("role");
        return req;
    }

    public static Request updateAccount(Request req, Response res) {
        String userId = req.session().attribute("userid");
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");
        String inputCurrentPassword = req.queryParams("current-password");
        // Validate input params and assign flash_messages if invalid
        if (!Users.isEmail(inputEmail)) {
            req.session().attribute("flash_messages", new String[]{inputEmail + " is not a valid email address."});
        } else if (inputPassword.length() < 8) {
            req.session().attribute("flash_messages", new String[]{"Password must be at least 8 characters."});
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_messages", new String[]{"Password and Password confirmation do not match."});
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_messages", new String[]{"The passwords don't match."});
        } else {
            try {
                GenericData data = new GenericData();
                data.put("username", inputEmail);
                data.put("rawPassword", inputCurrentPassword);
                HttpResponse response = preparePostRequest(OF_USERS_API_URL + "login", data).execute();
                if (response.isSuccessStatusCode()) {
                    data = new GenericData();
                    data.put("username", inputEmail);
                    String url = String.format(OF_USERS_API_URL + "user/%s", userId);
                    preparePatchRequest(url, data).execute();
                    data = new GenericData();
                    data.put("username", inputEmail);
                    data.put("newPassword", inputPassword);
                    preparePostRequest(OF_USERS_API_URL + "change-password", data).execute();
                    req.session().attribute("username", inputEmail);
                    req.session().attribute("flash_messages", new String[]{"The user has been updated."});
                } else {
                    req.session().attribute("flash_messages", new String[]{"Invalid password."});
                }
            } catch (IOException e) {
                e.printStackTrace(); //TODO
                req.session().attribute("flash_messages", new String[]{"An error occurred. Please try again later."});
            }
        }
        return req;
    }

    public static Request getPasswordResetKey(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        try {
            GenericData data = new GenericData();
            data.put("username", inputEmail);
            HttpResponse response = preparePostRequest(OF_USERS_API_URL + "reset-password", data).execute(); // reset password key request
            if (response.isSuccessStatusCode()) {
                JsonObject user = getResponseAsJson(response).getAsJsonObject();
                String body = "Hi "
                    + inputEmail
                    + ",\n\n"
                    + "  To reset your password, simply click the following link:\n\n"
                    + "  http://ceo.sig-gis.com/password-reset?email="
                    + inputEmail
                    + "&password-reset-key="
                    + user.get("resetKey").getAsString();
                Mail.sendMail(SMTP_USER, inputEmail, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "Password reset on CEO", body);
                req.session().attribute("flash_messages", new String[]{"The reset key has been sent to your email."});
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_messages", new String[]{"An error occurred. Please try again later."});
        }
        return req;
    }

    public static Request resetPassword(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputResetKey = req.queryParams("password-reset-key");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");
        // Validate input params and assign flash_messages if invalid
        if (inputPassword.length() < 8) {
            req.session().attribute("flash_messages", new String[]{"Password must be at least 8 characters."});
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_messages", new String[]{"Password and Password confirmation do not match."});
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_messages", new String[]{"The passwords don't match."});
        } else {
            try {
                GenericData data = new GenericData();
                data.put("username", inputEmail);
                data.put("resetKey", inputResetKey);
                data.put("newPassword", inputPassword);
                HttpResponse response = preparePostRequest(OF_USERS_API_URL + "reset-password", data).execute(); // reset password request
                if (response.isSuccessStatusCode()) {
                    req.session().attribute("flash_messages", new String[]{"The password has been changed."});
                }
            } catch (IOException e) {
                e.printStackTrace(); //TODO
                req.session().attribute("flash_messages", new String[]{"An error occurred. Please try again later."});
            }
        }
        return req;
    }

    public static String getAllUsers(Request req, Response res) {
        String institutionId = req.queryParams("institutionId");
        try {
            if (institutionId != null) {
                String url = String.format(OF_USERS_API_URL + "group/%s/users", institutionId);
                HttpResponse response = prepareGetRequest(url).execute(); // get group's users
                if (response.isSuccessStatusCode()) {
                    JsonArray groupUsers = getResponseAsJson(response).getAsJsonArray();
                    // FIXME: Exclude the superuser account (admin@sig-gis.com) from the returned list of users
                    return toStream(groupUsers)
                        .map(groupUser -> {
                                groupUser.getAsJsonObject("user").addProperty("institutionRole",
                                                                              groupUser.get("roleCode").getAsString().equals("ADM") ? "admin"
                                                                              : groupUser.get("roleCode").getAsString().equals("OWN") ? "admin"
                                                                              : groupUser.get("roleCode").getAsString().equals("OPR") ? "member"
                                                                              : groupUser.get("roleCode").getAsString().equals("VWR") ? "member"
                                                                              : groupUser.get("statusCode").getAsString().equals("P") ? "pending"
                                                                              : "not-member");
                                return groupUser.getAsJsonObject("user");
                            })
                        .map(user -> {
                                user.addProperty("email", user.get("username").getAsString());
                                return user;
                            })
                        .collect(intoJsonArray)
                        .toString();
                } else {
                    // FIXME: Raise a red flag that an error just occurred in communicating with the database
                    return (new JsonArray()).toString();
                }
            } else {
                HttpResponse response = prepareGetRequest(OF_USERS_API_URL + "user").execute(); // get all the users
                if (response.isSuccessStatusCode()) {
                    JsonArray users = getResponseAsJson(response).getAsJsonArray();
                    // FIXME: Exclude the superuser account (admin@sig-gis.com) from the returned list of users
                    // return filterJsonArray(users, user -> !user.get("email").getAsString().equals("admin@sig-gis.com")).toString();
                    return users.toString();
                } else {
                    // FIXME: Raise a red flag that an error just occurred in communicating with the database
                    return (new JsonArray()).toString();
                }
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            // FIXME: Raise a red flag that an error just occurred in communicating with the database
            return (new JsonArray()).toString();
        }
    }

    public static Map<Integer, String> getInstitutionRoles(int userId) {
        try {
            String url = String.format(OF_USERS_API_URL + "user/%d/groups", userId);
            HttpResponse response = prepareGetRequest(url).execute(); // get user's groups
            if (response.isSuccessStatusCode()) {
                JsonArray userGroups = getResponseAsJson(response).getAsJsonArray();
                return toStream(userGroups)
                    .collect(Collectors.toMap(userGroup -> userGroup.get("groupId").getAsInt(),
                                              userGroup -> userGroup.get("roleCode").getAsString().equals("ADM") ? "admin"
                                              : userGroup.get("roleCode").getAsString().equals("OWN") ? "admin"
                                              : userGroup.get("roleCode").getAsString().equals("OPR") ? "member"
                                              : userGroup.get("roleCode").getAsString().equals("VWR") ? "member"
                                              : "not-member",
                                              (a, b) -> b));
            } else {
                // FIXME: Raise a red flag that an error just occurred in communicating with the database
                return new HashMap<Integer, String>();
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            // FIXME: Raise a red flag that an error just occurred in communicating with the database
            return new HashMap<Integer, String>();
        }
    }

    // FIXME: stub
    public static String updateInstitutionRole(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        JsonElement userId = jsonInputs.get("userId");
        String institutionId = jsonInputs.get("institutionId").getAsString();
        String role = jsonInputs.get("role").getAsString();

        return "";
    }

    public static String requestInstitutionMembership(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        String userId = jsonInputs.get("userId").getAsString();
        String institutionId = jsonInputs.get("institutionId").getAsString();
        try {
            String postUrl = String.format(OF_USERS_API_URL + "group/%s/user/%s", institutionId, userId);
            // FIXME: Does this add the user to the pending queue for this userGroup?
            HttpResponse postResponse = preparePostRequest(postUrl, new GenericData()).execute(); // add user in a group
            if (postResponse.isSuccessStatusCode()) {
                // FIXME: This branch doesn't do anything useful. Remove it.
                String getUrl = String.format(OF_USERS_API_URL + "group/%d/users", institutionId);
                HttpResponse getResponse = prepareGetRequest(getUrl).execute(); // get group's users
                JsonArray groupUsers = getResponseAsJson(getResponse).getAsJsonArray();
                JsonArray members = new JsonArray();
                JsonArray admins = new JsonArray();
                JsonArray pending = new JsonArray();
                toStream(groupUsers).forEach(groupUser -> {
                        if (groupUser.get("statusCode").getAsString().equals("P")) pending.add(groupUser.get("userId"));
                        else if (groupUser.get("roleCode").getAsString().equals("ADM")) admins.add(groupUser.get("userId"));
                        else if (groupUser.get("roleCode").getAsString().equals("OWN")) admins.add(groupUser.get("userId"));
                        else if (groupUser.get("roleCode").getAsString().equals("OPR")) members.add(groupUser.get("userId"));
                        else if (groupUser.get("roleCode").getAsString().equals("VWR")) members.add(groupUser.get("userId"));
                    });
                JsonObject group = groupUsers.get(0).getAsJsonObject();
                group.add("admins", admins);
                group.add("members", members);
                group.add("pending", pending);
                return group.toString();
            } else {
                // FIXME: Raise a red flag that an error just occurred in communicating with the database
                return "";
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            // FIXME: Raise a red flag that an error just occurred in communicating with the database
            return "";
        }
    }

}
