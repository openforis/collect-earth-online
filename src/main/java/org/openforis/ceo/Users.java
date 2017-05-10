package org.openforis.ceo;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.util.Comparator;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.StreamSupport;
import spark.Request;
import spark.Response;
import static org.openforis.ceo.JsonUtils.*;

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
            String savedPassword = user.get("password").getAsString();
            String savedRole = user.get("role").getAsString();
            if (inputPassword.equals(savedPassword)) {
                // Authentication successful
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", savedRole);
                res.redirect("home");
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

    public static Request register(Request req, Response res) {
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
                        int newUserId = StreamSupport.stream(users.spliterator(), false)
                            .map(user -> user.getAsJsonObject())
                            .map(user -> user.get("id").getAsInt())
                            .max(Comparator.naturalOrder())
                            .get() + 1;

                        JsonObject newUser = new JsonObject();
                        newUser.addProperty("id", newUserId);
                        newUser.addProperty("email", inputEmail);
                        newUser.addProperty("password", inputPassword);
                        newUser.addProperty("role", "user");
                        newUser.add("reset_key", null);
                        newUser.add("ip_addr", null);

                        users.add(newUser);
                        writeJsonFile("user-list.json", users);

                        // Update user-group-list.json
                        updateJsonFile("user-group-list.json",
                                       userGroup -> {
                                           if (userGroup.get("name").getAsString().equals("All Users")) {
                                               JsonArray members = userGroup.get("members").getAsJsonArray();
                                               members.add(newUserId);
                                               userGroup.add("members", members);
                                               return userGroup;
                                           } else {
                                               return userGroup;
                                           }
                                       });

                        // Assign the username and role session attributes
                        req.session().attribute("username", inputEmail);
                        req.session().attribute("role", "user");

                        // Redirect to /home
                        res.redirect("home");
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
        req.session().removeAttribute("username");
        req.session().removeAttribute("role");
        return req;
    }

    // FIXME: stub
    public static Request updateAccount(Request req, Response res) {
        req.session().attribute("flash_messages", new String[]{"This functionality has not yet been implemented."});
        return req;
    }

    // FIXME: stub
    public static Request requestPasswordResetKey(Request req, Response res) {
        req.session().attribute("flash_messages", new String[]{"This functionality has not yet been implemented."});
        return req;
    }

    // FIXME: stub
    public static Request resetPassword(Request req, Response res) {
        req.session().attribute("flash_messages", new String[]{"This functionality has not yet been implemented."});
        return req;
    }

}
