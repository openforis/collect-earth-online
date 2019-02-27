package org.openforis.ceo.local;

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
import static org.openforis.ceo.utils.ProjectUtils.getOrZero;
import static org.openforis.ceo.utils.ProjectUtils.getOrEmptyString;
import static org.openforis.ceo.utils.ProjectUtils.collectTimeIgnoreString;


import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.openforis.ceo.db_api.Users;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;

public class JsonUsers implements Users {

    private static final String BASE_URL      = CeoConfig.baseUrl;
    private static final String SMTP_USER     = CeoConfig.smtpUser;
    private static final String SMTP_SERVER   = CeoConfig.smtpServer;
    private static final String SMTP_PORT     = CeoConfig.smtpPort;
    private static final String SMTP_PASSWORD = CeoConfig.smtpPassword;

    public Request login(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        var inputReturnURL = req.queryParams("returnurl");
        var returnURL = (inputReturnURL == null || inputReturnURL.isEmpty())
            ? CeoConfig.documentRoot + "/home"
            : inputReturnURL;

        // Check if email exists
        var users = readJsonFile("user-list.json").getAsJsonArray();
        var matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
        if (!matchingUser.isPresent()) {
            req.session().attribute("flash_message", "No account with email " + inputEmail + " exists.");
            return req;
        } else {
            // Check if password matches
            var user = matchingUser.get();
            var storedId = user.get("id").getAsString();
            var storedPassword = user.get("password").getAsString();
            var storedRole = user.get("role").getAsString();
            if (!inputPassword.equals(storedPassword)) {
                // Authentication failed
                req.session().attribute("flash_message", "Invalid email/password combination.");
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

    public synchronized Request register(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("password-confirmation");

        // Validate input params and assign flash_message if invalid
        if (!isEmail(inputEmail)) {
            req.session().attribute("flash_message", inputEmail + " is not a valid email address.");
            return req;
        } else if (inputPassword.length() < 8) {
            req.session().attribute("flash_message", "Password must be at least 8 characters.");
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
            return req;
        } else {
            var users = readJsonFile("user-list.json").getAsJsonArray();
            var matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
            if (matchingUser.isPresent()) {
                req.session().attribute("flash_message", "Account " + inputEmail + " already exists.");
                return req;
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

                // Redirect to the Home page
                res.redirect(CeoConfig.documentRoot + "/home");
                return req;
            }
        }
    }

    public Request logout(Request req, Response res) {
        req.session().removeAttribute("userid");
        req.session().removeAttribute("username");
        req.session().removeAttribute("role");
        
        res.redirect(CeoConfig.documentRoot + "/home");
        return req;
    }

    // FIXME back port postgres checks that allow user to change only one part
    public synchronized Request updateAccount(Request req, Response res) {
        var userId = (String) req.session().attribute("userid");
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("password-confirmation");
        var inputCurrentPassword = req.queryParams("current-password");

        // Validate input params and assign flash_message if invalid
        if (!isEmail(inputEmail)) {
            req.session().attribute("flash_message", inputEmail + " is not a valid email address.");
            return req;
        } else if (inputPassword.length() < 8) {
            req.session().attribute("flash_message", "Password must be at least 8 characters.");
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
            return req;
        } else {
            var users = readJsonFile("user-list.json").getAsJsonArray();
            var matchingUser = findInJsonArray(users, user -> user.get("id").getAsString().equals(userId));
            if (!matchingUser.isPresent()) {
                req.session().attribute("flash_message", "The requested user account does not exist.");
                return req;
            } else {
                var foundUser = matchingUser.get();
                if (!foundUser.get("password").getAsString().equals(inputCurrentPassword)) {
                    req.session().attribute("flash_message", "Invalid password.");
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
                    req.session().attribute("flash_message", "The user has been updated.");
                    return req;
                }
            }
        }
    }

    public synchronized Request getPasswordResetKey(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var users = readJsonFile("user-list.json").getAsJsonArray();
        var matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
        if (!matchingUser.isPresent()) {
            req.session().attribute("flash_message", "There is no user with that email address.");
            return req;
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
                sendMail(SMTP_USER, inputEmail, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "Password reset on CEO", body);
                req.session().attribute("flash_message", "The reset key has been sent to your email.");
                return req;
            } catch (Exception e) {
                req.session().attribute("flash_message", "An error occurred. Please try again later.");
                return req;
            }
        }
    }

    public synchronized Request resetPassword(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var inputResetKey = req.queryParams("password-reset-key");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("password-confirmation");

        // Validate input params and assign flash_message if invalid
        if (inputPassword.length() < 8) {
            req.session().attribute("flash_message", "Password must be at least 8 characters.");
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
            return req;
        } else {
            var users = readJsonFile("user-list.json").getAsJsonArray();
            var matchingUser = findInJsonArray(users, user -> user.get("email").getAsString().equals(inputEmail));
            if (!matchingUser.isPresent()) {
                req.session().attribute("flash_message", "There is no user with that email address.");
                return req;
            } else {
                var foundUser = matchingUser.get();
                if (!foundUser.get("resetKey").getAsString().equals(inputResetKey)) {
                    req.session().attribute("flash_message", "Invalid reset key for user " + inputEmail + ".");
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
                    req.session().attribute("flash_message", "Your password has been changed.");
                    return req;
                }
            }
        }
    }

    public String getAllUsers(Request req, Response res) {
        var users = readJsonFile("user-list.json").getAsJsonArray();
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
        var institutionId = req.params(":id");

        var users = readJsonFile("user-list.json").getAsJsonArray();
        var institutions = readJsonFile("institution-list.json").getAsJsonArray();

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

    public String getUserStats(Request req, Response res) {
        final var userName =     req.params(":userid");
        final var projects = readJsonFile("project-list.json").getAsJsonArray();
               
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
                        var plots = readJsonFile("plot-data-" + project.get("id").getAsString() + ".json").getAsJsonArray();
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
        var institutions = readJsonFile("institution-list.json").getAsJsonArray();
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

    public synchronized String updateInstitutionRole(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var userId = jsonInputs.get("userId");
        var institutionId = jsonInputs.get("institutionId").getAsInt();
        var role = jsonInputs.get("role").getAsString();

        mapJsonFile("institution-list.json",
                    institution -> {
                        if (institution.get("id").getAsInt() == institutionId) {
                            var members = institution.getAsJsonArray("members");
                            var admins = institution.getAsJsonArray("admins");
                            var pending = institution.getAsJsonArray("pending");
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

    public synchronized String requestInstitutionMembership(Request req, Response res) {
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

}
