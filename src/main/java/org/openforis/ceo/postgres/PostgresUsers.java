package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.Mail.isEmail;
import static org.openforis.ceo.utils.Mail.sendMail;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.openforis.ceo.db_api.Users;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;

public class PostgresUsers implements Users {

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

        var SQL = "SELECT * FROM get_user(?)";
        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setString(1, inputEmail);
            var rs = pstmt.executeQuery();
            if(rs.next()) {
                // Check if password matches

                var storedId = rs.getInt("id");
                var storedPassword = rs.getString("password");
                var administrator = rs.getBoolean("administrator");
                if (!inputPassword.equals(storedPassword)) {
                    // Authentication failed
                    req.session().attribute("flash_message", "Invalid email/password combination.");
                    return req;
                } else {
                    // Authentication successful
                    req.session().attribute("userid", Integer.toString(storedId));
                    req.session().attribute("username", inputEmail);
                    req.session().attribute("role", administrator ? "admin" : "user");
                    res.redirect(returnURL);
                    return req;
                }
            } else {
                req.session().attribute("flash_message", "No account with email " + inputEmail + " exists.");
                return req;
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return req;
    }

    public Request register(Request req, Response res) {
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
            var SQL_user = "SELECT * FROM get_user(?)";
            try (var conn = connect();
                 var pstmt_user = conn.prepareStatement(SQL_user)) {
                pstmt_user.setString(1, inputEmail);
                var rs_user = pstmt_user.executeQuery();
                if (rs_user.next()) {
                    req.session().attribute("flash_message", "Account " + inputEmail + " already exists.");
                    return req;
                } else {
                    var SQL = "SELECT * FROM add_user(?,?)";
                    var pstmt = conn.prepareStatement(SQL);
                    pstmt.setString(1, inputEmail);
                    pstmt.setString(2, inputPassword);

                    var rs = pstmt.executeQuery();
                    if (rs.next()) {
                        // Assign the username and role session attributes
                        req.session().attribute("userid", Integer.toString(rs.getInt("add_user")));
                        req.session().attribute("username", inputEmail);
                        req.session().attribute("administrator", false);

                        // Redirect to the Home page
                        res.redirect(CeoConfig.documentRoot + "/home");
                        return req;
                    }
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        }
        return req;
    }

    public Request logout(Request req, Response res) {
        req.session().removeAttribute("userid");
        req.session().removeAttribute("username");
        req.session().removeAttribute("administrator");
        return req;
    }

    public Request updateAccount(Request req, Response res) {
        var storedEmail = req.session().attribute("username").toString();
        var inputEmail = req.queryParams("email");
        var inputPassword = req.queryParams("password");
        var inputPasswordConfirmation = req.queryParams("password-confirmation");
        var inputCurrentPassword = req.queryParams("current-password");

        // Validate input params and assign flash_message if invalid
        if (inputCurrentPassword.length() == 0) {
            req.session().attribute("flash_message", "Current Password required");
            return req;
        // let user change email without changing password
        } else if (inputEmail.length() > 0 && !isEmail(inputEmail)) {
            req.session().attribute("flash_message", inputEmail + " is not a valid email address.");
            return req;
        // let user change email without changing password
        } else if (inputPassword.length() > 0 && inputPassword.length() < 8) {
            req.session().attribute("flash_message", "New Password must be at least 8 characters.");
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "New Password and Password confirmation do not match.");
            return req;
        } else {
            var SQL_user = "SELECT * FROM get_user(?)";
            try (var conn = connect();
                 var pstmt_user = conn.prepareStatement(SQL_user)) {
                pstmt_user.setString(1, storedEmail);
                var rs_user = pstmt_user.executeQuery();
                if(rs_user.next()) {
                    var storedPassword = rs_user.getString("password");
                    if (storedPassword.equals(inputCurrentPassword)) {
                        var SQL = "SELECT * FROM set_user_email_and_password(?,?,?)";
                        var pstmt = conn.prepareStatement(SQL);
                        pstmt.setInt(1, rs_user.getInt("id"));
                        pstmt.setString(2, inputEmail.length() == 0 ? storedEmail : inputEmail);
                        pstmt.setString(3, inputPassword.length() == 0 ? storedPassword : inputPassword);
                        var rs = pstmt.executeQuery();
                        req.session().attribute("username", inputEmail.length() == 0 ? storedEmail : inputEmail);
                        req.session().attribute("flash_message", "The user has been updated.");
                        return req;
                    } else {
                        req.session().attribute("flash_message", "Invalid password.");
                        return req;
                    }
                } else {
                    req.session().attribute("flash_message", "The requested user account does not exist.");
                    return req;
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        }
        return req;
    }

    public Request getPasswordResetKey(Request req, Response res) {
        var inputEmail = req.queryParams("email");
        var SQL_user = "SELECT * FROM get_user(?)";
        try (var conn = connect();
             var pstmt_user = conn.prepareStatement(SQL_user)) {
            pstmt_user.setString(1, inputEmail);
            var rs_user = pstmt_user.executeQuery();
            if (rs_user.next()) {
                try {
                    var resetKey = UUID.randomUUID().toString();
                    var SQL = "SELECT * FROM set_password_reset_key(?,?)";
                    var pstmt = conn.prepareStatement(SQL);
                    pstmt.setString(1,inputEmail);
                    pstmt.setString(2, resetKey);
                    var rs = pstmt.executeQuery();
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
            } else {
                req.session().attribute("flash_message", "There is no user with that email address.");
                return req;
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
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
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
            return req;
        } else {
            var SQL_user = "SELECT * FROM get_user(?)";
            try (var conn = connect();
                 var pstmt_user = conn.prepareStatement(SQL_user)) {
                pstmt_user.setString(1, inputEmail);
                var rs_user = pstmt_user.executeQuery();
                if (rs_user.next()) {
                    var storedEmail = rs_user.getString("identity");
                    var storedResetKey = rs_user.getString("reset_key");
                    if (storedResetKey.equals(inputResetKey)) {
                        if (storedEmail.equals(inputEmail)) {
                            var SQL = "SELECT * FROM update_password(?,?)";
                            var pstmt = conn.prepareStatement(SQL);
                            pstmt.setString(1, inputEmail);
                            pstmt.setString(2, inputPassword);
                            var rs = pstmt.executeQuery();
                            req.session().attribute("flash_message", "Your password has been changed.");
                            return req;
                        }
                    } else {
                        req.session().attribute("flash_message", "Invalid reset key for user " + inputEmail + ".");
                        return req;
                    }
                } else {
                    req.session().attribute("flash_message", "There is no user with that email address.");
                    return req;
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        }

        return req;
    }

    public String getAllUsers(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");
        if (institutionId == null || institutionId.isEmpty()) {
            var SQL_users = "SELECT * FROM get_all_users()";
            try (var conn = connect();
                 var pstmt = conn.prepareStatement(SQL_users)) {
                var rs = pstmt.executeQuery();
                var allUsers = new JsonArray();
                while (rs.next()) {
                    var userJson = new JsonObject();
                    userJson.addProperty("id", rs.getInt("id"));
                    userJson.addProperty("email", rs.getString("email"));
                    userJson.addProperty("administrator", rs.getBoolean("administrator"));
                    userJson.addProperty("resetKey", rs.getString("reset_key"));
                    
                    allUsers.add(userJson);
                }
                return allUsers.toString();
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        } else {
            var SQL = "SELECT * FROM get_all_users_by_institution_id(?)";
            
            try (var conn = connect();
                 var pstmt = conn.prepareStatement(SQL)) {
                pstmt.setInt(1, Integer.parseInt(institutionId));
                var rs = pstmt.executeQuery();
                var instAllUsers = new JsonArray();
                while (rs.next()) {
                    var instUsers = new JsonObject();
                    instUsers.addProperty("id", rs.getInt("id"));
                    instUsers.addProperty("email", rs.getString("email"));
                    instUsers.addProperty("administrator", rs.getBoolean("administrator"));
                    instUsers.addProperty("resetKey", rs.getString("reset_key"));
                    instUsers.addProperty("institutionRole", rs.getString("institution_role"));
                    instAllUsers.add(instUsers);
                }
                return instAllUsers.toString();
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        }

        return "";
    }

    public Map<Integer, String> getInstitutionRoles(int userId) {
        var inst = new HashMap<Integer,String>();
        var SQL = "SELECT * FROM get_institution_user_roles(?)";
        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1, userId);
            var rs = pstmt.executeQuery();
            while (rs.next()) {
                inst.put(rs.getInt("institution_id"), rs.getString("role").toString());
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return inst;
    }

    public String updateInstitutionRole(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var userId = jsonInputs.get("userId");
        var institutionId = jsonInputs.get("institutionId").getAsString();
        var role = jsonInputs.get("role").getAsString();
        var SQL = "SELECT * FROM update_institution_user_role(?,?,?)";
        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1,Integer.parseInt(institutionId));
            pstmt.setInt(2,Integer.parseInt(userId.toString()));
            pstmt.setString(3,role);
            var rs = pstmt.executeQuery();

            if(rs.next() && rs.getInt("update_institution_user_role") == 0) {
                SQL = "SELECT * FROM add_institution_user(?,?,?)";
                var addPstmt = conn.prepareStatement(SQL);
                addPstmt.setInt(1,Integer.parseInt(institutionId));
                addPstmt.setInt(2,Integer.parseInt(userId.toString()));
                addPstmt.setString(3,role);
                var addrs = addPstmt.executeQuery();
            } 
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

    public String requestInstitutionMembership(Request req, Response res) {
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var userId = jsonInputs.get("userId");
        var institutionId = jsonInputs.get("institutionId").getAsString();
        var SQL = "SELECT * FROM add_institution_user(?,?,?)";

        try (var conn = connect();
             var pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1,Integer.parseInt(institutionId));
            pstmt.setInt(2,Integer.parseInt(userId.toString()));
            pstmt.setInt(3,3);
            var rs = pstmt.executeQuery();
        }
        catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

}
