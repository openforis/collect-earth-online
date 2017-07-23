package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.findInJsonArray;
import static org.openforis.ceo.JsonUtils.getNextId;
import static org.openforis.ceo.JsonUtils.mapJsonFile;
import static org.openforis.ceo.JsonUtils.readJsonFile;
import static org.openforis.ceo.JsonUtils.toStream;
import static org.openforis.ceo.JsonUtils.writeJsonFile;

public class Users {

    public static Request login(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        // Check if email exists
        JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
        Optional<JsonObject> matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
        if (matchingUser.isPresent()) {
            // Check if password matches
            JsonObject user = matchingUser.get();
            String userId = user.get("id").getAsString();
            String userPassword = user.get("password").getAsString();
            String userRole = user.get("role").getAsString();
            if (inputPassword.equals(userPassword)) {
                // Authentication successful
                req.session().attribute("userid", userId);
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", userRole);
                res.redirect(Server.documentRoot + "/home");
            } else {
                // Authentication failed
                req.session().attribute("flash_messages", new String[]{"Invalid email/password combination."});
            }
        } else {
            req.session().attribute("flash_messages", new String[]{"No account with email " + inputEmail + " exists."});
        }
        return req;
    }

    private static boolean isEmail(String email) {
        String emailPattern = "(?i)[a-z0-9!#$%&'*+/=?^_`{|}~-]+" +
            "(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*" +
            "@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+" +
            "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
        return Pattern.matches(emailPattern, email);
    }

    public static synchronized Request register(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");
        // Validate input params and assign flash_messages if invalid
        if (isEmail(inputEmail)) {
            if (inputPassword.length() >= 8) {
                if (inputPassword.equals(inputPasswordConfirmation)) {
                    JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
                    Optional<JsonObject> matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));

                    if (matchingUser.isPresent()) {
                        req.session().attribute("flash_messages", new String[]{"Account " + inputEmail + " already exists."});
                    } else {
                        // Add a new user to user-list.json
                        int newUserId = getNextId(users);
                        String newUserRole = "user";

                        JsonObject newUser = new JsonObject();
                        newUser.addProperty("id", newUserId);
                        newUser.addProperty("email", inputEmail);
                        newUser.addProperty("password", inputPassword);
                        newUser.addProperty("role", newUserRole);
                        newUser.add("reset_key", null);
                        newUser.add("ip_addr", null);

                        users.add(newUser);
                        writeJsonFile("user-list.json", users);

                        // Update institution-list.json
                        mapJsonFile("institution-list.json",
                                    institution -> {
                                        if (institution.get("name").getAsString().equals("All Users")) {
                                            JsonArray members = institution.get("members").getAsJsonArray();
                                            members.add(newUserId);
                                            institution.add("members", members);
                                            return institution;
                                        } else {
                                            return institution;
                                        }
                                    });

                        // Assign the username and role session attributes
                        req.session().attribute("userid", newUserId);
                        req.session().attribute("username", inputEmail);
                        req.session().attribute("role", newUserRole);

                        // Redirect to the Home page
                        res.redirect(Server.documentRoot + "/home");
                    }
                } else {
                    req.session().attribute("flash_messages", new String[]{"Password and Password confirmation do not match."});
                }
            } else {
                req.session().attribute("flash_messages", new String[]{"Password must be at least 8 characters."});
            }
        } else {
            req.session().attribute("flash_messages", new String[]{inputEmail + " is not a valid email address."});
        }
        return req;
    }

    public static Request logout(Request req) {
        req.session().removeAttribute("userid");
        req.session().removeAttribute("username");
        req.session().removeAttribute("role");
        return req;
    }

    // FIXME: stub
    public static Request updateAccount(Request req, Response res) {
        String accountId = req.params(":id"); // FIXME: Use this
        req.session().attribute("flash_messages", new String[]{"This functionality has not yet been implemented."});
        return req;
    }

    // FIXME: stub
    public static Request getPasswordResetKey(Request req, Response res) {
        req.session().attribute("flash_messages", new String[]{"This functionality has not yet been implemented."});
        return req;
    }

    // FIXME: stub
    public static Request resetPassword(Request req, Response res) {
        req.session().attribute("flash_messages", new String[]{"This functionality has not yet been implemented."});
        return req;
    }

    public static String getAllUsers(Request req, Response res) {
        JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
        JsonArray visibleUsers = filterJsonArray(users, user -> !user.get("email").getAsString().equals("admin@sig-gis.com"));
        return visibleUsers.toString();
    }

    public static Map<Integer, String> getInstitutionRoles(int userId) {
        JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
        JsonPrimitive userIdJson = new JsonPrimitive(userId);
        return toStream(institutions)
            .collect(Collectors.toMap(institution -> institution.get("id").getAsInt(),
                                      institution -> {
                                          JsonArray members = institution.getAsJsonArray("members");
                                          JsonArray admins = institution.getAsJsonArray("admins");
                                          if (admins.contains(userIdJson)) {
                                              return "admin";
                                          } else if (members.contains(userIdJson)) {
                                              return "member";
                                          } else {
                                              return "";
                                          }
                                      },
                                      (a, b) -> b));
    }

}
