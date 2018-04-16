package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.findInJsonArray;
import static org.openforis.ceo.utils.JsonUtils.getNextId;
import static org.openforis.ceo.utils.JsonUtils.intoJsonArray;
import static org.openforis.ceo.utils.JsonUtils.mapJsonFile;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.JsonUtils.readJsonFile;
import static org.openforis.ceo.utils.JsonUtils.toStream;
import static org.openforis.ceo.utils.JsonUtils.writeJsonFile;
import static org.openforis.ceo.utils.Mail.isEmail;
import static org.openforis.ceo.utils.Mail.sendMail;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;

public class Users {

    private static final String SMTP_USER     = CeoConfig.smtpUser;
    private static final String SMTP_SERVER   = CeoConfig.smtpServer;
    private static final String SMTP_PORT     = CeoConfig.smtpPort;
    private static final String SMTP_PASSWORD = CeoConfig.smtpPassword;

    public static Request login(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputReturnURL = req.queryParams("returnurl");
        String returnURL = (inputReturnURL != null && !inputReturnURL.isEmpty()) ?
            CeoConfig.documentRoot + "/" + inputReturnURL + "?" + req.queryString() :
            CeoConfig.documentRoot + "/home";

        // Check if email exists
        JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
        Optional<JsonObject> matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
        if (!matchingUser.isPresent()) {
            req.session().attribute("flash_messages", new String[]{"No account with email " + inputEmail + " exists."});
            return req;
        } else {
            // Check if password matches
            JsonObject user = matchingUser.get();
            String storedId = user.get("id").getAsString();
            String storedPassword = user.get("password").getAsString();
            String storedRole = user.get("role").getAsString();
            if (!inputPassword.equals(storedPassword)) {
                // Authentication failed
                req.session().attribute("flash_messages", new String[]{"Invalid email/password combination."});
                return req;
            } else {
                // Authentication successful
                req.session().attribute("userid", storedId);
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", storedRole);
                res.redirect(returnURL);
                return req;
            }
        }
    }

    public static synchronized Request register(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");

        // Validate input params and assign flash_messages if invalid
        if (!isEmail(inputEmail)) {
            req.session().attribute("flash_messages", new String[]{inputEmail + " is not a valid email address."});
            return req;
        } else if (inputPassword.length() < 8) {
            req.session().attribute("flash_messages", new String[]{"Password must be at least 8 characters."});
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_messages", new String[]{"Password and Password confirmation do not match."});
            return req;
        } else {
            JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
            Optional<JsonObject> matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
            if (matchingUser.isPresent()) {
                req.session().attribute("flash_messages", new String[]{"Account " + inputEmail + " already exists."});
                return req;
            } else {
                // Add a new user to user-list.json
                int newUserId = getNextId(users);
                String newUserRole = "user";

                JsonObject newUser = new JsonObject();
                newUser.addProperty("id", newUserId);
                newUser.addProperty("email", inputEmail);
                newUser.addProperty("password", inputPassword);
                newUser.addProperty("role", newUserRole);
                newUser.add("resetKey", null);

                users.add(newUser);
                writeJsonFile("user-list.json", users);

                // Assign the username and role session attributes
                req.session().attribute("userid", newUserId);
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", newUserRole);

                // Redirect to the Home page
                res.redirect(CeoConfig.documentRoot + "/home");
                return req;
            }
        }
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
        if (!isEmail(inputEmail)) {
            req.session().attribute("flash_messages", new String[]{inputEmail + " is not a valid email address."});
            return req;
        } else if (inputPassword.length() < 8) {
            req.session().attribute("flash_messages", new String[]{"Password must be at least 8 characters."});
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_messages", new String[]{"Password and Password confirmation do not match."});
            return req;
        } else {
            JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
            Optional<JsonObject> matchingUser = findInJsonArray(users, user -> user.get("id").getAsString().equals(userId));
            if (!matchingUser.isPresent()) {
                req.session().attribute("flash_messages", new String[]{"The requested user account does not exist."});
                return req;
            } else {
                JsonObject foundUser = matchingUser.get();
                if (!foundUser.get("password").getAsString().equals(inputCurrentPassword)) {
                    req.session().attribute("flash_messages", new String[]{"Invalid password."});
                    return req;
                } else {
                    mapJsonFile("user-list.json",
                                user -> {
                                    if (user.get("id").getAsString().equals(userId)) {
                                        user.addProperty("email", inputEmail);
                                        user.addProperty("password", inputPassword);
                                        return user;
                                    } else {
                                        return user;
                                    }
                                });
                    req.session().attribute("username", inputEmail);
                    req.session().attribute("flash_messages", new String[]{"The user has been updated."});
                    return req;
                }
            }
        }
    }

    public static Request getPasswordResetKey(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
        Optional<JsonObject> matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
        if (!matchingUser.isPresent()) {
            req.session().attribute("flash_messages", new String[]{"There is no user with that email address."});
            return req;
        } else {
            try {
                String resetKey = UUID.randomUUID().toString();
                mapJsonFile("user-list.json",
                            user -> {
                                if (user.get("email").getAsString().equals(inputEmail)) {
                                    user.addProperty("resetKey", resetKey);
                                    return user;
                                } else {
                                    return user;
                                }
                            });
                String body = "Hi "
                    + inputEmail
                    + ",\n\n"
                    + "  To reset your password, simply click the following link:\n\n"
                    + "  http://ceo.sig-gis.com/password-reset?email="
                    + inputEmail
                    + "&password-reset-key="
                    + resetKey;
                sendMail(SMTP_USER, inputEmail, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "Password reset on CEO", body);
                req.session().attribute("flash_messages", new String[]{"The reset key has been sent to your email."});
                return req;
            } catch (Exception e) {
                req.session().attribute("flash_messages", new String[]{"An error occurred. Please try again later."});
                return req;
            }
        }
    }

    public static Request resetPassword(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputResetKey = req.queryParams("password-reset-key");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");

        // Validate input params and assign flash_messages if invalid
        if (inputPassword.length() < 8) {
            req.session().attribute("flash_messages", new String[]{"Password must be at least 8 characters."});
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_messages", new String[]{"Password and Password confirmation do not match."});
            return req;
        } else {
            JsonArray users = readJsonFile("user-list.json").getAsJsonArray();
            Optional<JsonObject> matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
            if (!matchingUser.isPresent()) {
                req.session().attribute("flash_messages", new String[]{"There is no user with that email address."});
                return req;
            } else {
                JsonObject foundUser = matchingUser.get();
                if (!foundUser.get("resetKey").getAsString().equals(inputResetKey)) {
                    req.session().attribute("flash_messages", new String[]{"Invalid reset key for user " + inputEmail + "."});
                    return req;
                } else {
                    mapJsonFile("user-list.json",
                                user -> {
                                    if (user.get("email").getAsString().equals(inputEmail)) {
                                        user.addProperty("password", inputPassword);
                                        user.add("resetKey", null);
                                        return user;
                                    } else {
                                        return user;
                                    }
                                });
                    req.session().attribute("flash_messages", new String[]{"Your password has been changed."});
                    return req;
                }
            }
        }
    }

    public static String getAllUsers(Request req, Response res) {
        String institutionId = req.queryParams("institutionId");
        JsonArray users = readJsonFile("user-list.json").getAsJsonArray();

        if (institutionId == null || institutionId.isEmpty()) {
            return toStream(users)
                .filter(user -> !user.get("email").getAsString().equals("admin@openforis.org"))
                .map(user -> {
                        user.remove("password");
                        return user;
                    })
                .collect(intoJsonArray)
                .toString();
        } else {
            JsonArray institutions = readJsonFile("institution-list.json").getAsJsonArray();
            Optional<JsonObject> matchingInstitution = findInJsonArray(institutions,
                institution -> institution.get("id").getAsString().equals(institutionId));
            if (matchingInstitution.isPresent()) {
                JsonObject institution = matchingInstitution.get();
                JsonArray members = institution.getAsJsonArray("members");
                JsonArray admins = institution.getAsJsonArray("admins");
                JsonArray pending = institution.getAsJsonArray("pending");
                return toStream(users)
                    .filter(user -> !user.get("email").getAsString().equals("admin@openforis.org"))
                    .filter(user -> members.contains(user.get("id")) || pending.contains(user.get("id")))
                    .map(user -> {
                            user.remove("password");
                            return user;
                        })
                    .map(user -> {
                            user.addProperty("institutionRole",
                                             admins.contains(user.get("id")) ? "admin"
                                             : members.contains(user.get("id")) ? "member"
                                             : pending.contains(user.get("id")) ? "pending"
                                             : "not-member");
                            return user;
                        })
                    .collect(intoJsonArray)
                    .toString();
            } else {
                return (new JsonArray()).toString();
            }
        }
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
                                              return "not-member";
                                          }
                                      },
                                      (a, b) -> b));
    }

    public static synchronized String updateInstitutionRole(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        JsonElement userId = jsonInputs.get("userId");
        String institutionId = jsonInputs.get("institutionId").getAsString();
        String role = jsonInputs.get("role").getAsString();

        mapJsonFile("institution-list.json",
                    institution -> {
                        if (institution.get("id").getAsString().equals(institutionId)) {
                            JsonArray members = institution.getAsJsonArray("members");
                            JsonArray admins = institution.getAsJsonArray("admins");
                            JsonArray pending = institution.getAsJsonArray("pending");
                            if (role.equals("member")) {
                                if (!members.contains(userId)) {
                                    members.add(userId);
                                }
                                if (admins.contains(userId)) {
                                    admins.remove(userId);
                                }
                                if (pending.contains(userId)) {
                                    pending.remove(userId);
                                }
                            } else if (role.equals("admin")) {
                                if (!members.contains(userId)) {
                                    members.add(userId);
                                }
                                if (!admins.contains(userId)) {
                                    admins.add(userId);
                                }
                                if (pending.contains(userId)) {
                                    pending.remove(userId);
                                }
                            } else {
                                members.remove(userId);
                                admins.remove(userId);
                                pending.remove(userId);
                            }
                            institution.add("members", members);
                            institution.add("admins", admins);
                            institution.add("pending", pending);
                            return institution;
                        } else {
                            return institution;
                        }
                    });

        return "";
    }

    public static synchronized String requestInstitutionMembership(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        JsonElement userId = jsonInputs.get("userId");
        String institutionId = jsonInputs.get("institutionId").getAsString();

        mapJsonFile("institution-list.json",
                    institution -> {
                        if (institution.get("id").getAsString().equals(institutionId)) {
                            JsonArray members = institution.getAsJsonArray("members");
                            JsonArray pending = institution.getAsJsonArray("pending");
                            if (!members.contains(userId) && !pending.contains(userId)) {
                                pending.add(userId);
                            }
                            institution.add("pending", pending);
                            return institution;
                        } else {
                            return institution;
                        }
                    });

        return "";
    }

}
