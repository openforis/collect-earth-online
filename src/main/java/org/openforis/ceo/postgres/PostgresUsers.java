package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.postgres.PostgresInstitutions.getInstitutionById;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.Mail.isEmail;
import static org.openforis.ceo.utils.Mail.sendMail;
import static org.openforis.ceo.utils.Mail.sendToMailingList;
import static org.openforis.ceo.utils.Mail.CONTENT_TYPE_HTML;
import static org.openforis.ceo.utils.SessionUtils.getSessionUserId;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.SQLException;
import java.time.format.DateTimeFormatter;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.openforis.ceo.db_api.Users;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;

public class PostgresUsers implements Users {

    private static final String BASE_URL              = CeoConfig.baseUrl;
    private static final String SMTP_USER             = CeoConfig.smtpUser;
    private static final String SMTP_SERVER           = CeoConfig.smtpServer;
    private static final String SMTP_PORT             = CeoConfig.smtpPort;
    private static final String SMTP_PASSWORD         = CeoConfig.smtpPassword;
    private static final String SMTP_RECIPIENT_LIMIT  = CeoConfig.smtpRecipientLimit;
    private static final String MAILING_LIST_INTERVAL = CeoConfig.mailingListInterval;
    private static LocalDateTime mailingListLastSent  = LocalDateTime.now();

    public String login(Request req, Response res) {
        var inputEmail =        req.queryParams("email");
        var inputPassword =     req.queryParams("password");

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM check_login(?,?)")) {

            pstmt.setString(1, inputEmail);
            pstmt.setString(2, inputPassword);
            try (var rs = pstmt.executeQuery()) {
                if(rs.next()) {
                    // Authentication successful
                    req.session().attribute("userid", rs.getString("user_id"));
                    req.session().attribute("username", inputEmail);
                    req.session().attribute("role", rs.getBoolean("administrator") ? "admin" : "user");
                    return "";
                } else {
                    return "Invalid email/password combination.";
                }
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "There was an server side issue logging in.";
        }
    }

    public String register(Request req, Response res) {
        var inputEmail =                    req.queryParams("email");
        var inputPassword =                 req.queryParams("password");
        var inputPasswordConfirmation =     req.queryParams("passwordConfirmation");
        var onMailingList =                 req.queryParams("onMailingList");

        if (!isEmail(inputEmail)) {
            return inputEmail + " is not a valid email address.";
        } else if (inputPassword.length() < 8) {
            return "Password must be at least 8 characters.";
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            return "Password and Password confirmation do not match.";
        } else {
            try (var conn = connect();
                 var pstmt_user = conn.prepareStatement("SELECT * FROM email_taken(?,-1)");
                 var pstmt_add = conn.prepareStatement("SELECT * FROM add_user(?,?,?)")) {

                pstmt_user.setString(1, inputEmail);
                try (var rs_user = pstmt_user.executeQuery()) {
                    if (rs_user.next() && rs_user.getBoolean("email_taken")) {
                        return "Account " + inputEmail + " already exists.";
                    } else {
                        pstmt_add.setString(1, inputEmail);
                        pstmt_add.setString(2, inputPassword);
                        pstmt_add.setBoolean(3, onMailingList != null && Boolean.parseBoolean(onMailingList));
                        try (var rs = pstmt_add.executeQuery()) {
                            if (rs.next()) {
                                // Assign the username and role session attributes
                                req.session().attribute("userid", rs.getString("add_user"));
                                req.session().attribute("username", inputEmail);
                                req.session().attribute("role", "user");

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
                            }
                        }
                    }
                }
                return "";
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                return "There was an server side issue registering a new account.";
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
        final var userId                    = getSessionUserId(req);
        final var storedEmail               = (String) req.session().attribute("username");
        final var inputEmail                = req.queryParams("email");
        final var inputPassword             = req.queryParams("password");
        final var inputPasswordConfirmation = req.queryParams("passwordConfirmation");
        final var onMailingList             = req.queryParams("onMailingList");
        final var inputCurrentPassword      = req.queryParams("currentPassword");

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
            try (var conn = connect();
                 var pstmt_login = conn.prepareStatement("SELECT * FROM check_login(?,?)");
                 var pstmt_user  = conn.prepareStatement("SELECT * FROM email_taken(?,?)");
                 var pstmt_email = conn.prepareStatement("SELECT * FROM set_user_email(?,?)");
                 var pstmt_pass  = conn.prepareStatement("SELECT * FROM update_password(?,?)");
                 var pstmt_ml    = conn.prepareStatement("SELECT * FROM set_mailing_list(?,?)")) {
                pstmt_login.setString(1, storedEmail);
                pstmt_login.setString(2, inputCurrentPassword);
                try (var rs_login = pstmt_login.executeQuery()) {
                    if(rs_login.next()) {
                        if (inputEmail.length() > 0 && !storedEmail.equals(inputEmail)) {
                            pstmt_user.setString(1, inputEmail);
                            pstmt_user.setInt(2, userId);
                            try (var rs_user = pstmt_user.executeQuery()) {
                                if(rs_user.next() && !rs_user.getBoolean("email_taken")) {
                                    pstmt_email.setString(1, storedEmail);
                                    pstmt_email.setString(2, inputEmail);
                                    pstmt_email.execute();
                                    req.session().attribute("username", inputEmail);
                                } else {
                                    return "An account with the email " + inputEmail + " already exists.";
                                }
                            }
                        }
                        if (inputPassword.length() > 0) {
                            pstmt_pass.setString(1, storedEmail);
                            pstmt_pass.setString(2, inputPassword);
                            pstmt_pass.execute();
                        }
                        pstmt_ml.setInt(1, userId);
                        pstmt_ml.setBoolean(2, onMailingList != null && Boolean.parseBoolean(onMailingList));
                        pstmt_ml.execute();
                        return "";
                    } else {
                        return "Invalid current password.";
                    }
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                return "There was an issue updating your account.  Please check the console.";
            }
        }
    }

    public String getPasswordResetKey(Request req, Response res) {
        var inputEmail = req.queryParams("email");

        try (var conn = connect();
             var pstmt_user = conn.prepareStatement("SELECT * FROM get_user(?)")) {

            pstmt_user.setString(1, inputEmail);
            var rs_user = pstmt_user.executeQuery();
            if (rs_user.next()) {
                var resetKey = UUID.randomUUID().toString();
                try (var pstmt = conn.prepareStatement("SELECT * FROM set_password_reset_key(?,?)")) {
                    pstmt.setString(1, inputEmail);
                    pstmt.setString(2, resetKey);
                    try (var rs = pstmt.executeQuery()) {
                        if (rs.next()) {
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
                        } else {
                            return "Failed to create a reset key. Please try again later";
                        }
                    }
                } catch (Exception e) {
                    return "An error occurred. Please try again later.";
                }
            } else {
                return "There is no user with that email address.";
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "There was an issue resetting your password. Please check the console.";
        }
    }

    public String resetPassword(Request req, Response res) {
        var inputEmail =                    req.queryParams("email");
        var inputResetKey =                 req.queryParams("passwordResetKey");
        var inputPassword =                 req.queryParams("password");
        var inputPasswordConfirmation =     req.queryParams("passwordConfirmation");

        if (inputPassword.length() < 8) {
            return "Password must be at least 8 characters.";
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            return "Password and Password confirmation do not match.";
        } else {
            try (var conn = connect();
                 var pstmt_user = conn.prepareStatement("SELECT * FROM get_user(?)");
                 var pstmt_pass = conn.prepareStatement("SELECT * FROM update_password(?,?)")) {

                pstmt_user.setString(1, inputEmail);
                try (var rs_user = pstmt_user.executeQuery()) {
                    if (rs_user.next()) {
                        if (rs_user.getString("reset_key") != null && rs_user.getString("reset_key").equals(inputResetKey)) {
                            pstmt_pass.setString(1, inputEmail);
                            pstmt_pass.setString(2, inputPassword);
                            pstmt_pass.execute();
                            return "";
                        } else {
                            return "Invalid reset key for user " + inputEmail + ".";
                        }
                    } else {
                        return "There is no user with that email address.";
                    }
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                return "There was an issue resetting your password. Please check the console.";
            }
        }
    }

    public String getAllUsers(Request req, Response res) {
        try (var conn = connect();
                var pstmt = conn.prepareStatement("SELECT * FROM get_all_users()")) {

            var allUsers = new JsonArray();
            try (var rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    var userJson = new JsonObject();
                    userJson.addProperty("id", rs.getInt("user_id"));
                    userJson.addProperty("email", rs.getString("email"));
                    userJson.addProperty("role", rs.getBoolean("administrator") ? "admin" : "user");
                    allUsers.add(userJson);
                }
            }
            return allUsers.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getInstitutionUsers(Request req, Response res) {
        final var institutionId = req.queryParams("institutionId");

        try (var conn = connect();
                var pstmt = conn.prepareStatement("SELECT * FROM get_all_users_by_institution_id(?)")) {

            pstmt.setInt(1, Integer.parseInt(institutionId));
            var instAllUsers = new JsonArray();
            try (var rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    var instUsers = new JsonObject();
                    instUsers.addProperty("id", rs.getInt("user_id"));
                    instUsers.addProperty("email", rs.getString("email"));
                    instUsers.addProperty("role", rs.getBoolean("administrator") ? "admin" : "user");
                    instUsers.addProperty("resetKey", rs.getString("reset_key"));
                    instUsers.addProperty("institutionRole", rs.getString("institution_role"));
                    instAllUsers.add(instUsers);
                }
            }
            return instAllUsers.toString();
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getUserDetails(Request req, Response res) {
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM get_user_details(?)");) {

            pstmt.setInt(1, getSessionUserId(req));
            try (var rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    var userJson = new JsonObject();
                    userJson.addProperty("onMailingList", rs.getBoolean("on_mailing_list"));
                    return userJson.toString();
                } else {
                    return "";
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String getUserStats(Request req, Response res) {
        final var accountId = Integer.parseInt(req.queryParams("userId"));
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM get_user_stats(?)");) {

            pstmt.setInt(1, accountId);
            try (var rs = pstmt.executeQuery()) {
                var userJson = new JsonObject();
                if (rs.next()) {
                    userJson.addProperty("totalProjects", rs.getInt("total_projects"));
                    userJson.addProperty("totalPlots", rs.getInt("total_plots"));
                    userJson.addProperty("averageTime", rs.getInt("average_time"));
                    userJson.add("perProject", parseJson(rs.getString("per_project")).getAsJsonArray());
                }
                return userJson.toString();
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String updateProjectUserStats(Request req, Response res) { return "";}

    // FIXME this appears to be unused.  Not tested
    public Map<Integer, String> getInstitutionRoles(int userId) {
        var inst = new HashMap<Integer,String>();
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM get_institution_user_roles(?)");) {

            pstmt.setInt(1, userId);
            try (var rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    inst.put(rs.getInt("institution_id"), rs.getString("role").toString());
                }
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return inst;
    }

    public String updateInstitutionRole(Request req, Response res) {
        var jsonInputs =        parseJson(req.body()).getAsJsonObject();
        var userId =            jsonInputs.get("userId").getAsInt();
        var institutionId =     jsonInputs.get("institutionId").getAsInt();
        var role =              jsonInputs.get("role").getAsString();

        try (var conn = connect()) {
            if (role.equals("not-member")) {
                try (var pstmt = conn.prepareStatement("SELECT * FROM remove_institution_user_role(?,?)")) {
                    pstmt.setInt(1,institutionId);
                    pstmt.setInt(2,userId);
                    pstmt.execute();
                }
            } else {
                try (var pstmt = conn.prepareStatement("SELECT * FROM update_institution_user_role(?,?,?)")) {
                    pstmt.setInt(1,institutionId);
                    pstmt.setInt(2,userId);
                    pstmt.setString(3,role);
                    try (var rs = pstmt.executeQuery()) {
                        if(rs.next()) {
                            String email, timestamp, institutionName;
                            email = timestamp = institutionName = "";
                            // Get info for sending email
                            try(var pstmt1 = conn.prepareStatement("SELECT * FROM get_user_by_id(?)")) {
                                pstmt1.setInt(1,userId);
                                try(var rs1 = pstmt1.executeQuery()) {
                                    if (rs1.next()) {
                                        try(var pstmt2 = conn.prepareStatement("SELECT * FROM select_institution_by_id(?)")) {
                                            pstmt2.setInt(1, institutionId);
                                            try(var rs2 = pstmt2.executeQuery()) {
                                                if (rs2.next()) {
                                                    email = rs1.getString("email").toString();
                                                    timestamp = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss").format(LocalDateTime.now());
                                                    institutionName = rs2.getString("name").toString();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            if (rs.getInt("update_institution_user_role") == 0) {
                                // new user added
                                var addPstmt = conn.prepareStatement("SELECT * FROM add_institution_user(?,?,?)");
                                addPstmt.setInt(1,institutionId);
                                addPstmt.setInt(2,userId);
                                addPstmt.setString(3,role);
                                addPstmt.execute();

                                // Send notification to the user
                                var body = "Dear " + email + ",\n\n"
                                        + "You have been assigned the role of " + role + " for " + institutionName + " on " + timestamp + "!\n\n"
                                        + "Kind Regards,\n"
                                        + "  The CEO Team";
                                sendMail(SMTP_USER, Arrays.asList(email), null, null, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "User Role Added!", body, null);
                            } else {
                                // roles updated
                                // Send notification to the user
                                var body = "Dear " + email + ",\n\n"
                                        + "Your role has been changed to " + role + " for " + institutionName + " on " + timestamp + "!\n\n"
                                        + "Kind Regards,\n"
                                        + "  The CEO Team";
                                sendMail(SMTP_USER, Arrays.asList(email), null, null, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "User Role Changed!", body, null);
                            }
                        }
                    }
                }
            }
            return getInstitutionById(institutionId);

        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String requestInstitutionMembership(Request req, Response res) {
        var jsonInputs =        parseJson(req.body()).getAsJsonObject();
        var userId =            jsonInputs.get("userId").getAsInt();
        var institutionId =     jsonInputs.get("institutionId").getAsInt();

        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM add_institution_user(?,?,?)")) {

            pstmt.setInt(1,institutionId);
            pstmt.setInt(2,userId);
            pstmt.setInt(3,3);
            pstmt.execute();
            return getInstitutionById(institutionId);
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "";
        }
    }

    public String submitEmailForMailingList(Request req, Response res) {
        var remainingTime = Duration.between(mailingListLastSent, LocalDateTime.now()).toSeconds()
                            - Integer.parseInt(MAILING_LIST_INTERVAL);
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var inputSubject = jsonInputs.get("subject").getAsString();
        var inputBody = jsonInputs.get("body").getAsString();

        if (remainingTime < 0) {
            return "You must wait " + remainingTime + " more seconds before sending another message.";
        } else if (inputSubject == null || inputSubject.isEmpty() || inputBody == null || inputBody.isEmpty()) {
            return "Subject and Body are mandatory fields.";
        } else {
            mailingListLastSent = LocalDateTime.now();
            try (var conn = connect();
                 var pstmt = conn.prepareStatement("SELECT * FROM get_all_mailing_list_users()")) {

                try (var rs = pstmt.executeQuery()) {
                    var emails = new ArrayList<String>();
                    while (rs.next()) {
                       emails.add(rs.getString("email"));
                    }
                    sendToMailingList(SMTP_USER, emails, SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, inputSubject, inputBody, CONTENT_TYPE_HTML, Integer.parseInt(SMTP_RECIPIENT_LIMIT));
                    return "";
                } catch (Exception e) {
                    System.out.println(e.getMessage());
                    return "There was an issue sending to the mailing list. Please check the server logs.";
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                return "There was an issue sending to the mailing list. Please check the server logs.";
            }
        }
    }

    public String unsubscribeFromMailingList(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var inputEmail = jsonInputs.get("email").getAsString();

        try (var conn = connect();
             var pstmt_user = conn.prepareStatement("SELECT * FROM get_user(?)")) {
             var pstmt_mailing_list = conn.prepareStatement("SELECT * FROM set_mailing_list(?,?)");

           pstmt_user.setString(1, inputEmail);
           try (var rs_user = pstmt_user.executeQuery()) {
               if (rs_user.next()) {
                   pstmt_mailing_list.setInt(1, rs_user.getInt("user_id"));
                   pstmt_mailing_list.setBoolean(2, false);
                   pstmt_mailing_list.execute();

                   // Send confirmation email to the user
                   var body = "Dear " + inputEmail + ",\n\n"
                       + "We've just received your request to unsubscribe from our mailing list.\n\n"
                       + "You have been unsubscribed from our mailing list and will no longer receive a newsletter.\n\n"
                       + "You can resubscribe to our newsletter by going to your account page.\n\n"
                       + "Kind Regards,\n"
                       + "  The CEO Team";
                   sendMail(SMTP_USER, Arrays.asList(inputEmail), null, null,
                            SMTP_SERVER, SMTP_PORT, SMTP_PASSWORD, "Successfully unsubscribed from CEO mailing list", body, null);
                   return "";
                }
                return "There was a SQL error unsubscribing.";
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            return "There was an unknown error unsubscribing.";
        }
    }

}
