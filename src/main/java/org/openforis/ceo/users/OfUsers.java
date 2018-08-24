package org.openforis.ceo.users;

import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.intoJsonArray;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.Mail.isEmail;
import static org.openforis.ceo.utils.Mail.sendMail;
import static org.openforis.ceo.utils.RequestUtils.getResponseAsJson;
import static org.openforis.ceo.utils.RequestUtils.prepareDeleteRequest;
import static org.openforis.ceo.utils.RequestUtils.prepareGetRequest;
import static org.openforis.ceo.utils.RequestUtils.preparePatchRequest;
import static org.openforis.ceo.utils.RequestUtils.preparePostRequest;

import com.google.api.client.http.HttpResponseException;
import com.google.api.client.util.GenericData;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.openforis.ceo.db_api.Users;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;

public class OfUsers implements Users {

    private static final String BASE_URL = CeoConfig.baseUrl;
    private static final String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;
    private static final String SMTP_USER = CeoConfig.smtpUser;
    private static final String SMTP_SERVER = CeoConfig.smtpServer;
    private static final String SMTP_PORT = CeoConfig.smtpPort;
    private static final String SMTP_PASSWORD = CeoConfig.smtpPassword;
	private static final String AUTHENTICATION_TOKEN_NAME = "of-token";

    /**
     * Call Of-Users' REST API to QUERY the database.
     * @param req
     * @param res
     * @return
     */
    public Request login(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        try {
            var data = new GenericData();
            data.put("username", inputEmail);
            data.put("rawPassword", inputPassword);
            var response = preparePostRequest(OF_USERS_API_URL + "login", data).execute(); // login
            if (response.isSuccessStatusCode()) {
                // Authentication successful
                var token = getResponseAsJson(response).getAsJsonObject().get("token").getAsString();
                setAuthenticationToken(req, res, token);
                var userRequest = prepareGetRequest(OF_USERS_API_URL + "user"); // get user
                userRequest.getUrl().put("username", inputEmail);
                var userId = getResponseAsJson(userRequest.execute()).getAsJsonArray().get(0).getAsJsonObject().get("id").getAsString();
                var roleRequest = prepareGetRequest(OF_USERS_API_URL + "user/" + userId + "/groups"); // get roles
                var jsonRoles = getResponseAsJson(roleRequest.execute()).getAsJsonArray();
                var matchingRole = findInJsonArray(jsonRoles, jsonRole -> jsonRole.get("groupId").getAsString().equals("1"));
                var role = matchingRole.isPresent() ? "admin" : "user";
                req.session().attribute("token", token);
                req.session().attribute("userid", userId);
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", role);
                res.redirect(CeoConfig.documentRoot + "/home");
            } else {
                // Authentication failed
                req.session().attribute("flash_message", "Invalid email/password combination.");
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_message", "An error occurred. Please try again later.");
        }
        return req;
    }

    public Request register(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("password-confirmation");
        try {
            // Validate input params and assign flash_message if invalid
            if (!isEmail(inputEmail)) {
                req.session().attribute("flash_message", inputEmail + " is not a valid email address.");
            } else if (inputPassword.length() < 8) {
                req.session().attribute("flash_message", "Password must be at least 8 characters.");
            } else if (!inputPassword.equals(inputPasswordConfirmation)) {
                req.session().attribute("flash_message", "Password and Password confirmation do not match.");
            } else {
                var userRequest = prepareGetRequest(OF_USERS_API_URL + "user"); // get user
                userRequest.getUrl().put("username", inputEmail);
                var response = userRequest.execute();
                if (response.isSuccessStatusCode()) {
                    var users = getResponseAsJson(response).getAsJsonArray();
                    if (users.size() > 0) {
                        req.session().attribute("flash_message", "Account " + inputEmail + " already exists.");
                    } else {
                        // Add a new user to the database
                        var data = new GenericData();
                        data.put("username", inputEmail);
                        data.put("rawPassword", inputPassword);
                        response = preparePostRequest(OF_USERS_API_URL + "user", data).execute(); // register
                        if (response.isSuccessStatusCode()) {
                            var newUserId = getResponseAsJson(response).getAsJsonObject().get("id").getAsString();
                            // Assign the username and role session attributes
                            req.session().attribute("userid", newUserId);
                            req.session().attribute("username", inputEmail);
                            req.session().attribute("role", "user");
                            response = preparePostRequest(OF_USERS_API_URL + "login", data).execute(); // login
                            if (response.isSuccessStatusCode()) {
                                // Authentication successful
                                var token = getResponseAsJson(response).getAsJsonObject().get("token").getAsString();
                                setAuthenticationToken(req, res, token);
                            }
                            // Redirect to the Home page
                            res.redirect(CeoConfig.documentRoot + "/home");
                        }
                    }
                } else {
                    throw new IOException();
                }
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_message", "An error occurred. Please try again later.");
        }
        return req;
    }

    public Request logout(Request req, Response res) {
        var data = new GenericData();
        data.put("username", req.session().attribute("username"));
        data.put("token", req.session().attribute("token"));
        try {
            preparePostRequest(OF_USERS_API_URL + "logout", data).execute();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            req.session().removeAttribute("userid");
            req.session().removeAttribute("username");
            req.session().removeAttribute("role");
            req.session().removeAttribute("token");
            res.removeCookie("/", AUTHENTICATION_TOKEN_NAME);
        }
        return req;
    }

    public Request updateAccount(Request req, Response res) {
        var userId = (String) req.session().attribute("userid");
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("password-confirmation");
        var inputCurrentPassword = req.queryParams("current-password");
        // Validate input params and assign flash_message if invalid
        if (!isEmail(inputEmail)) {
            req.session().attribute("flash_message", inputEmail + " is not a valid email address.");
        } else if (inputPassword.length() < 8) {
            req.session().attribute("flash_message", "Password must be at least 8 characters.");
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
        } else {
            try {
                var data = new GenericData();
                data.put("username", inputEmail);
                data.put("rawPassword", inputCurrentPassword);
                var response = preparePostRequest(OF_USERS_API_URL + "login", data).execute();
                if (response.isSuccessStatusCode()) {
                    data = new GenericData();
                    data.put("username", inputEmail);
                    var url = String.format(OF_USERS_API_URL + "user/%s", userId);
                    preparePatchRequest(url, data).execute();
                    data = new GenericData();
                    data.put("username", inputEmail);
                    data.put("newPassword", inputPassword);
                    preparePostRequest(OF_USERS_API_URL + "change-password", data).execute();
                    req.session().attribute("username", inputEmail);
                    req.session().attribute("flash_message", "The user has been updated.");
                } else {
                    req.session().attribute("flash_message", "Invalid password.");
                }
            } catch (IOException e) {
                e.printStackTrace(); //TODO
                req.session().attribute("flash_message", "An error occurred. Please try again later.");
            }
        }
        return req;
    }

    public Request getPasswordResetKey(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        try {
            var data = new GenericData();
            data.put("username", inputEmail);
            var response = preparePostRequest(OF_USERS_API_URL + "reset-password", data).execute(); // reset password key request
            if (response.isSuccessStatusCode()) {
                var user = getResponseAsJson(response).getAsJsonObject();
                var body = "Hi "
                    + inputEmail
                    + ",\n\n"
                    + "  To reset your password, simply click the following link:\n\n"
                    + "  " + BASE_URL + "password-reset?email="
                    + inputEmail
                    + "&password-reset-key="
                    + user.get("resetKey").getAsString();
                sendMail(SMTP_USER, inputEmail, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "Password reset on CEO", body);
                req.session().attribute("flash_message", "The reset key has been sent to your email.");
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_message", "An error occurred. Please try again later.");
        }
        return req;
    }

    public Request resetPassword(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputResetKey = req.queryParams("password-reset-key");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("password-confirmation");

        // Validate input params and assign flash_message if invalid
        if (inputPassword.length() < 8) {
            req.session().attribute("flash_message", "Password must be at least 8 characters.");
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
        } else {
            try {
                var userRequest = prepareGetRequest(OF_USERS_API_URL + "user");
                userRequest.getUrl().put("username", inputEmail);
                var response = userRequest.execute();
                if (response.isSuccessStatusCode()) {
                    var foundUsers = getResponseAsJson(response).getAsJsonArray();
                    if (foundUsers.size() != 1) {
                        req.session().attribute("flash_message", "There is no user with that email address.");
                    } else {
                        var foundUser = foundUsers.get(0).getAsJsonObject();
                        if (!foundUser.get("resetKey").getAsString().equals(inputResetKey)) {
                            req.session().attribute("flash_message", "Invalid reset key for user " + inputEmail + ".");
                        } else {
                            var data = new GenericData();
                            data.put("username", inputEmail);
                            data.put("resetKey", inputResetKey);
                            data.put("newPassword", inputPassword);
                            response = preparePostRequest(OF_USERS_API_URL + "reset-password", data).execute(); // reset password request
                            if (response.isSuccessStatusCode()) {
                                req.session().attribute("flash_message", "The password has been changed.");
                            } else {
                                throw new IOException();
                            }
                        }
                    }
                } else {
                    throw new IOException();
                }
            } catch (IOException e) {
                e.printStackTrace(); //TODO
                req.session().attribute("flash_message", "An error occurred. Please try again later.");
            }
        }
        return req;
    }

    public String getAllUsers(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");
        try {
        	return getAllUsers(institutionId).toString();
        } catch (Exception e) {
        	req.session().attribute("flash_message", e.getMessage());
        	return new JsonArray().toString();
        }
    }
    
    public static JsonArray getAllUsers(String institutionId) {
        try {
            if (institutionId != null) {
                var url = String.format(OF_USERS_API_URL + "group/%s/users", institutionId);
                var response = prepareGetRequest(url).execute(); // get group's users
                if (response.isSuccessStatusCode()) {
                    var groupUsers = getResponseAsJson(response).getAsJsonArray();
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
                        .filter(user -> !user.get("email").getAsString().equals("admin@openforis.org"))
                        .collect(intoJsonArray);
                } else {
                    throw new RuntimeException("An error occurred. Please try again later.");
                }
            } else {
                var response = prepareGetRequest(OF_USERS_API_URL + "user").execute(); // get all the users
                if (response.isSuccessStatusCode()) {
                    var users = getResponseAsJson(response).getAsJsonArray();
                    return toStream(users)
                            .map(user -> {
                                    user.addProperty("email", user.get("username").getAsString());
                                    return user;
                            })
                            .filter(user -> !user.get("email").getAsString().equals("admin@openforis.org"))
                            .collect(intoJsonArray);
                } else {
                	throw new RuntimeException("An error occurred. Please try again later.");
                }
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            // FIXME: Raise a red flag that an error just occurred in communicating with the database
            return new JsonArray();
        }
    }

    public Map<Integer, String> getInstitutionRoles(int userId) {
        try {
            var url = String.format(OF_USERS_API_URL + "user/%d/groups", userId);
            var response = prepareGetRequest(url).execute(); // get user's groups
            if (response.isSuccessStatusCode()) {
                var userGroups = getResponseAsJson(response).getAsJsonArray();
                return toStream(userGroups)
                    .collect(Collectors.toMap(userGroup -> userGroup.get("groupId").getAsInt(),
                                              userGroup -> {
                                            	  var roleCode = userGroup.get("roleCode").getAsString();
                                            	  return roleCode.equals("ADM") || roleCode.equals("OWN") ? "admin" 
                                            		  : roleCode.equals("OPR") || roleCode.equals("VWR") ? "member"
                                        			  : "not-member";},
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

    private static JsonObject groupToInstitution(String groupId) {
        var group = new JsonObject();
        var url = String.format(OF_USERS_API_URL + "group/%s", groupId);
        try {
            var response = prepareGetRequest(url).execute();
            if (response.isSuccessStatusCode()) {
                group = getResponseAsJson(response).getAsJsonObject();
                url = String.format(OF_USERS_API_URL + "group/%s/users", groupId);
                response = prepareGetRequest(url).execute();
                var groupUsers = getResponseAsJson(response).getAsJsonArray();
                var members = new JsonArray();
                var admins = new JsonArray();
                var pending = new JsonArray();
                toStream(groupUsers).forEach(groupUser -> {
                    if (groupUser.get("statusCode").getAsString().equals("P")) pending.add(groupUser.get("userId"));
                    else if (groupUser.get("roleCode").getAsString().equals("ADM")) admins.add(groupUser.get("userId"));
                    else if (groupUser.get("roleCode").getAsString().equals("OWN")) admins.add(groupUser.get("userId"));
                    else if (groupUser.get("roleCode").getAsString().equals("OPR")) members.add(groupUser.get("userId"));
                    else if (groupUser.get("roleCode").getAsString().equals("VWR")) members.add(groupUser.get("userId"));
                });
                group.add("admins", admins);
                group.add("members", members);
                group.add("pending", pending);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return group;
    }

    public String updateInstitutionRole(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var userId = jsonInputs.get("userId").getAsString();
        var groupId = jsonInputs.get("institutionId").getAsString();
        var role = jsonInputs.get("role").getAsString();
        try {
            var url = String.format(OF_USERS_API_URL + "group/%s/user/%s", groupId, userId);
            try {
                var response = prepareGetRequest(url).execute();
                if (response.isSuccessStatusCode()) {
                    var newRoleCode = "";
                    if (role.equals("member")) {
                        newRoleCode = "OPR";
                    } else if (role.equals("admin")) {
                        newRoleCode = "ADM";
                    }
                    if (!newRoleCode.isEmpty()) {
                        var data = new GenericData();
                        data.put("roleCode", newRoleCode);
                        data.put("statusCode", "A");
                        preparePatchRequest(url, data).execute();
                    } else {
                        prepareDeleteRequest(url).execute();
                    }
                }
            } catch (HttpResponseException e) {
                if (e.getStatusCode() == 404) {
                    var data = new GenericData();
                    data.put("roleCode", "OPR");
                    data.put("statusCode", "A");
                    preparePostRequest(url, data).execute(); // add user to a group (as accepted)
                } else {
                    e.printStackTrace(); //TODO
                    req.session().attribute("flash_message", "An error occurred. Please try again later.");
                }
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_message", "An error occurred. Please try again later.");
        }

        return "";
    }

    public String requestInstitutionMembership(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var userId = jsonInputs.get("userId").getAsString();
        var groupId = jsonInputs.get("institutionId").getAsString();
        try {
            var url = String.format(OF_USERS_API_URL + "group/%s/user/%s", groupId, userId);
            var data = new GenericData();
            data.put("roleCode", "OPR");
            data.put("statusCode", "P");
            preparePostRequest(url, data).execute(); // add user to a group (as pending)
            return "";
        } catch (IOException e) {
            e.printStackTrace(); //TODO
            req.session().attribute("flash_message", "An error occurred. Please try again later.");
            return "";
        }
    }

    private static void setAuthenticationToken(Request req, Response res, String token) {
        var host = req.host();
        if (host.indexOf(':') > -1) {
            host = host.substring(0, host.lastIndexOf(':')); //remove port from host
        }
        res.cookie(host, "/", AUTHENTICATION_TOKEN_NAME, token, -1, false, false);
    }

}
