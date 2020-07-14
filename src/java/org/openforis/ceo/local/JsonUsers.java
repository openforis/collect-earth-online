package org.openforis.ceo.local;

import static org.openforis.ceo.utils.JsonUtils.elementToArray;
import static org.openforis.ceo.utils.JsonUtils.expandResourcePath;
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
import static org.openforis.ceo.utils.Mail.sendToMailingList;
import static org.openforis.ceo.utils.Mail.CONTENT_TYPE_HTML;
import static org.openforis.ceo.utils.ProjectUtils.getOrZero;
import static org.openforis.ceo.utils.ProjectUtils.getOrEmptyString;
import static org.openforis.ceo.utils.ProjectUtils.collectTimeIgnoreString;
import static org.openforis.ceo.utils.SessionUtils.getSessionUserId;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.openforis.ceo.db_api.Users;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;

public class JsonUsers implements Users {

    private static final String BASE_URL             = CeoConfig.baseUrl;
    private static final String SMTP_USER            = CeoConfig.smtpUser;
    private static final String SMTP_SERVER          = CeoConfig.smtpServer;
    private static final String SMTP_PORT            = CeoConfig.smtpPort;
    private static final String SMTP_PASSWORD        = CeoConfig.smtpPassword;
    private static final String SMTP_RECIPIENT_LIMIT = CeoConfig.smtpRecipientLimit;

    public String login(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");

        // Check if email exists
        var users = elementToArray(readJsonFile("user-list.json"));
        var matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
        if (!matchingUser.isPresent()) {
            return "No account with email " + inputEmail + " exists.";
        } else {
            // Check if password matches
            var user = matchingUser.get();
            var storedId = user.get("id").getAsString();
            var storedPassword = user.get("password").getAsString();
            var storedRole = user.get("role").getAsString();
            if (!inputPassword.equals(storedPassword)) {
                // Authentication failed
                return ("Invalid email/password combination.");
            } else {
                // Authentication successful
                req.session().attribute("userid", storedId);
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", storedRole);
                return "";
            }
        }
    }

    public synchronized String register(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("passwordConfirmation");

        if (!isEmail(inputEmail)) {
            return inputEmail + " is not a valid email address.";
        } else if (inputPassword.length() < 8) {
            return "Password must be at least 8 characters.";
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            return "Password and Password confirmation do not match.";
        } else {
            var users = elementToArray(readJsonFile("user-list.json"));
            var matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
            if (matchingUser.isPresent()) {
                return "An account with the email " + inputEmail + " already exists.";
            } else {
                // Add a new user to user-list.json
                var newUserId = getNextId(users);
                var newUserRole = "user";

                var newUser = new JsonObject();
                newUser.addProperty("id", newUserId);
                newUser.addProperty("email", inputEmail);
                newUser.addProperty("password", inputPassword);
                newUser.addProperty("role", newUserRole);
                newUser.add("resetKey", null);

                users.add(newUser);
                writeJsonFile("user-list.json", users);

                // Assign the username and role session attributes
                req.session().attribute("userid", newUserId + "");
                req.session().attribute("username", inputEmail);
                req.session().attribute("role", newUserRole);

                // Send confirmation email to the user
                var timestamp = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss").format(LocalDateTime.now());
                var body = "Dear " + inputEmail + ",\n\n"
                    + "Thank you for signing up for CEO!\n\n"
                    + "Your Account Summary Details:\n\n"
                    + "  Email: " + inputEmail + "\n"
                    + "  Created on: " + timestamp + "\n\n"
                    + "Kind Regards,\n"
                    + "  The CEO Team";
                sendMail(SMTP_USER, Arrays.asList(inputEmail), null, null, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "Welcome to CEO!", body, null);

                return "";
            }
        }
    }

    public String logout(Request req, Response res) {
        req.session().removeAttribute("userid");
        req.session().removeAttribute("username");
        req.session().removeAttribute("role");

        return "";
    }

    public String updateAccount(Request req, Response res) {
        var userId = getSessionUserId(req);
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("passwordConfirmation");
        var mailingListSubscription = req.queryParams("onMailingList");
        var inputCurrentPassword = req.queryParams("currentPassword");

        if (inputCurrentPassword.length() == 0) {
            return "Current Password required";
        // let user change email without changing password
        } else if (inputEmail.length() > 0 && !isEmail(inputEmail)) {
            return inputEmail + " is not a valid email address.";
        // let user change email without changing password
        } else if (inputPassword.length() > 0 && inputPassword.length() < 8) {
            return "New Password must be at least 8 characters.";
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            return "New Password and Password confirmation do not match.";
        } else {
            var users = elementToArray(readJsonFile("user-list.json"));
            var matchingUser = findInJsonArray(users, user -> user.get("id").getAsString().equals(userId));
            if (!matchingUser.isPresent()) {
                return "The requested user account does not exist.";
            } else {
                var foundUser = matchingUser.get();
                if (!foundUser.get("password").getAsString().equals(inputCurrentPassword)) {
                    return "Invalid password.";
                } else {
                    mapJsonFile("user-list.json",
                                user -> {
                                    if (user.get("id").getAsString().equals(userId)) {
                                        user.addProperty("email", inputEmail.isEmpty() ? foundUser.get("email").getAsString() : inputEmail);
                                        user.addProperty("password", inputPassword.isEmpty() ? foundUser.get("password").getAsString() : inputPassword);
                                        user.addProperty("on-mailing-list", mailingListSubscription != null);
                                        return user;
                                    } else {
                                        return user;
                                    }
                                });
                    req.session().attribute("username", inputEmail);
                    return "";
                }
            }
        }
    }

    public String getPasswordResetKey(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var users = elementToArray(readJsonFile("user-list.json"));
        var matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
        if (!matchingUser.isPresent()) {
            return "There is no user with that email address.";
        } else {
            try {
                var resetKey = UUID.randomUUID().toString();
                mapJsonFile("user-list.json",
                        user -> {
                            if (user.get("email").getAsString().equals(inputEmail)) {
                                user.addProperty("resetKey", resetKey);
                                return user;
                            } else {
                                return user;
                            }
                        });
                var body = "Hi "
                    + inputEmail
                    + ",\n\n"
                    + "  To reset your password, simply click the following link:\n\n"
                    + "  " + BASE_URL + "password-reset?email="
                    + inputEmail
                    + "&password-reset-key="
                    + resetKey;
                sendMail(SMTP_USER, Arrays.asList(inputEmail), null, null, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "Password reset on CEO", body, null);
                return "";
            } catch (Exception e) {
                return "An error occurred. Please try again later.";
            }
        }
    }

    public String resetPassword(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputResetKey = req.queryParams("password-reset-key");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("password-confirmation");

        if (inputPassword.length() < 8) {
            return "Password must be at least 8 characters.";
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            return "Password and Password confirmation do not match.";
        } else {
            var users = elementToArray(readJsonFile("user-list.json"));
            var matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
            if (!matchingUser.isPresent()) {
                return "There is no user with that email address.";
            } else {
                var foundUser = matchingUser.get();
                if (!foundUser.get("resetKey").getAsString().equals(inputResetKey)) {
                    return "Invalid reset key for user " + inputEmail + ".";
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
                    return "";
                }
            }
        }
    }

    public String getAllUsers(Request req, Response res) {
        var users = elementToArray(readJsonFile("user-list.json"));
        return toStream(users)
            .filter(user -> !user.get("email").getAsString().equals("admin@openforis.org"))
            .map(user -> {
                    user.remove("password");
                    user.remove("resetKey");
                    return user;
                })
            .collect(intoJsonArray)
            .toString();
    }

    public String getInstitutionUsers(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");

        var users = elementToArray(readJsonFile("user-list.json"));
        var institutions = elementToArray(readJsonFile("institution-list.json"));

        var matchingInstitution = findInJsonArray(institutions,
            institution -> institution.get("id").getAsString().equals(institutionId));
        if (matchingInstitution.isPresent()) {
            var institution = matchingInstitution.get();
            var members = institution.getAsJsonArray("members");
            var admins = institution.getAsJsonArray("admins");
            var pending = institution.getAsJsonArray("pending");
            return toStream(users)
                .filter(user -> !user.get("email").getAsString().equals("admin@openforis.org"))
                .filter(user -> members.contains(user.get("id")) || pending.contains(user.get("id")))
                .map(user -> {
                        user.remove("password");
                        user.remove("resetKey");
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

    public String getUserDetails(Request req, Response res) {
        final var userId = req.queryParams("userId");
        var users = elementToArray(readJsonFile("user-list.json"));
        var matchingUser = findInJsonArray(users, user -> user.get("id").getAsString().equals(userId));
        if (!matchingUser.isPresent()) {
            return "";
        } else {
            var foundUser = matchingUser.get();
            var userDetailsObject = new JsonObject();
            userDetailsObject.addProperty("mailingListSubscription", foundUser.get("on-mailing-list").getAsBoolean());
            return userDetailsObject.toString();
        }
    }

    public String getUserStats(Request req, Response res) {
        final var userName =        req.queryParams("userId");
        final var projects =        elementToArray(readJsonFile("project-list.json"));

        // Pull out usefull data
        final var projectData = toStream(projects)
            .filter(project -> Paths.get(expandResourcePath("/json"), "plot-data-" + project.get("id").getAsString() + ".json").toFile().exists()
                                && project.has("userStats")
                                && toStream(project.get("userStats").getAsJsonArray())
                                .filter(user -> user.get("user").getAsString().equals(userName))
                                .collect(intoJsonArray)
                                .size() > 0
                    )
            .map(project -> {
                var projectObject = new JsonObject();
                projectObject.addProperty("id", project.get("id").getAsInt());
                projectObject.addProperty("name", project.get("name").getAsString());
                projectObject.addProperty("description", project.get("name").getAsString());
                projectObject.addProperty("availability", project.get("availability").getAsString());
                projectObject.addProperty("numPlots", project.get("numPlots").getAsString());

                var userData = toStream(project.get("userStats").getAsJsonArray())
                                .filter(user -> user.get("user").getAsString().equals(userName))
                                .findFirst().get();

                projectObject.addProperty("plotCount", userData.get("plots").getAsInt());

                final var getMiliSec = userData.get("milliSecs").getAsInt();
                final var curMiliSec = getMiliSec > 0 && getMiliSec < 10000000
                                       ? getMiliSec
                                       : 0;
                final var timedPlots = userData.get("timedPlots").getAsInt();
                projectObject.addProperty("analysisAverage", timedPlots > 0
                            ? Math.round(curMiliSec / 1.0 / timedPlots / 100.0) / 10.0
                            : 0);

                projectObject.addProperty("totalMilliSecond", timedPlots > 0 ? curMiliSec : 0);
                projectObject.addProperty("timedUserPlots", timedPlots);


                return projectObject;
                }
            )
            .sorted((p1, p2)-> p2.get("id").getAsInt() - p1.get("id").getAsInt())
            .collect(intoJsonArray);

        final int totalPlots = toStream(projectData)
            .map(project -> getOrZero(project, "plotCount").getAsInt())
            .mapToInt(Integer::intValue).sum();

        final int totalTimedPlots = toStream(projectData)
            .map(project -> getOrZero(project, "timedUserPlots").getAsInt())
            .mapToInt(Integer::intValue).sum();

        final int totalMilliseconds = toStream(projectData)
            .map(project -> getOrZero(project, "totalMilliSecond").getAsInt())
            .mapToInt(Integer::intValue).sum();

        var userStats = new JsonObject();
        userStats.addProperty("totalProjects", projectData.size());
        userStats.addProperty("totalPlots", totalPlots);
        userStats.addProperty("averageTime", Math.round(totalMilliseconds / 100.0 / totalTimedPlots) / 10.0);
        userStats.add("perProject", projectData);
        return userStats.toString();
    }

    public static JsonArray sumUserInfo(JsonArray sumArr, JsonObject newData) {
        if (toStream(sumArr)
                .filter(user -> user.get("user").getAsString().equals(newData.get("user").getAsString()))
                .collect(intoJsonArray)
                .size() > 0)
        {
            return toStream(sumArr)
                .map(user -> {
                    if (user.get("user").getAsString().equals(newData.get("user").getAsString())) {
                        user.addProperty("milliSecs", user.get("milliSecs").getAsInt() + newData.get("milliSecs").getAsInt());
                        user.addProperty("plots", user.get("plots").getAsInt() + newData.get("plots").getAsInt());
                        user.addProperty("timedPlots", user.get("timedPlots").getAsInt() + newData.get("timedPlots").getAsInt());
                        return user;
                    } else {
                        return user;
                    }
                }).collect(intoJsonArray);
        } else {
            sumArr.add(newData);
            return sumArr;
        }
    }

    public String updateProjectUserStats(Request req, Response res) {

        mapJsonFile("project-list.json",
                project -> {
                    if (Paths.get(expandResourcePath("/json"), "plot-data-" + project.get("id").getAsString() + ".json").toFile().exists()) {
                        var plots = elementToArray(readJsonFile("plot-data-" + project.get("id").getAsString() + ".json"));
                        var dataByUsers = toStream(plots)
                            .filter(plot -> getOrEmptyString(plot, "user").getAsString().length() > 0)
                            .map(plot -> {
                                var plotObject = new JsonObject();

                                plotObject.addProperty("milliSecs", collectTimeIgnoreString(plot) > getOrZero(plot, "collectionStart").getAsLong()
                                                                    ? collectTimeIgnoreString(plot) - getOrZero(plot, "collectionStart").getAsLong()
                                                                    : 0);
                                plotObject.addProperty("plots", 1);
                                plotObject.addProperty("timedPlots", getOrZero(plot, "collectionStart").getAsLong() > 0 ? 1 : 0);

                                plotObject.addProperty("user", plot.get("user").getAsString());
                                return plotObject;
                                }
                            )
                            .collect(JsonArray::new,
                                (responce, element) -> sumUserInfo(responce, element),
                                (a, b) -> System.out.println(a)
                            );

                        project.add("userStats", dataByUsers);
                        project.remove("userMilliSeconds");
                        project.remove("userPlots");
                        project.remove("timedUserPlots");

                        return project;
                    } else {
                        return project;
                    }
                }
            );

            return "";
    }

    public Map<Integer, String> getInstitutionRoles(int userId) {
        var institutions = elementToArray(readJsonFile("institution-list.json"));
        var userIdJson = new JsonPrimitive(userId);
        return toStream(institutions)
            .collect(Collectors.toMap(institution -> institution.get("id").getAsInt(),
                                      institution -> {
                                          var members = institution.getAsJsonArray("members");
                                          var admins = institution.getAsJsonArray("admins");
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

    public String updateInstitutionRole(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var userId = jsonInputs.get("userId");
        var institutionId = jsonInputs.get("institutionId").getAsInt();
        var role = jsonInputs.get("role").getAsString();

        // get user email
        var userEmail = findInJsonArray(elementToArray(readJsonFile("user-list.json")),
                                        user -> user.get("id") == userId)
                            .get().get("email").getAsString();

        mapJsonFile("institution-list.json",
                    institution -> {
                        if (institution.get("id").getAsInt() == institutionId) {
                            var members = institution.getAsJsonArray("members");
                            var admins = institution.getAsJsonArray("admins");
                            var pending = institution.getAsJsonArray("pending");
                            var institutionName = institution.get("name").getAsString();
                            var timestamp = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss").format(LocalDateTime.now());
                            var body = "Dear " + userEmail + ",\n\n"
                                    + "You have been assigned the role of " + role + " for " + institutionName + " on " + timestamp + "!\n\n"
                                    + "Kind Regards,\n"
                                    + "  The CEO Team";
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
                                // Send confirmation email to the user
                                sendMail(SMTP_USER, Collections.singleton(userEmail), null, null, userEmail, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "User Role Added!", body);
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
                                // Send confirmation email to the user
                                sendMail(SMTP_USER, Collections.singleton(userEmail), null, null, userEmail, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "User Role Added!", body);
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

    public String requestInstitutionMembership(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var userId = jsonInputs.get("userId");
        var institutionId = jsonInputs.get("institutionId").getAsInt();

        mapJsonFile("institution-list.json",
                    institution -> {
                        if (institution.get("id").getAsInt() == institutionId) {
                            var members = institution.getAsJsonArray("members");
                            var pending = institution.getAsJsonArray("pending");
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

    public String submitEmailForMailingList(Request req, Response res) {
        var inputSubject = req.queryParams("subject");
        var inputBody = req.queryParams("body");

        if (inputSubject == null || inputSubject.isEmpty() || inputBody == null || inputBody.isEmpty()) {
            throw new RuntimeException("Subject and Body are mandatory fields.");
        } else {
            try {
                var users = elementToArray(readJsonFile("user-list.json"));
                var emails = toStream(users)
                        .filter(user -> user.get("mailing-list").getAsBoolean())
                        .map(user -> user.get("email").getAsString())
                        .collect(Collectors.toList());
                sendToMailingList(SMTP_USER, emails, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, inputSubject, inputBody, CONTENT_TYPE_HTML, Integer.parseInt(SMTP_RECIPIENT_LIMIT));
            } catch (Exception e) {
                System.out.println(e.getMessage());
                throw new RuntimeException("There was an issue sending to the mailing list. Please check the server logs.");
            }
        }
        return "";
    }

    public String unsubscribeFromMailingList(Request req, Response res) {
        // TODO Auto-generated method stub
        return "";
    }

}
