package org.openforis.ceo.postgres;

import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.postgres.PostgresInstitutions.getInstitutionById;
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
        var inputEmail =        req.queryParams("email");
        var inputPassword =     req.queryParams("password");
        var inputReturnURL =    req.queryParams("returnurl");

        try (var conn = connect();
             var pstmt = conn.prepareStatement( "SELECT * FROM get_user(?)")) {

            pstmt.setString(1, inputEmail);
            try(var rs = pstmt.executeQuery()) {
                if(rs.next()) {
                    // Check if password matches
                    if (!inputPassword.equals(rs.getString("password"))) {
                        // Authentication failed
                        req.session().attribute("flash_message", "Invalid email/password combination.");
                    } else {
                        // Authentication successful
                        req.session().attribute("userid", Integer.toString(rs.getInt("id")));
                        req.session().attribute("username", inputEmail);
                        req.session().attribute("role", rs.getBoolean("administrator") ? "admin" : "user");
                        res.redirect((inputReturnURL == null || inputReturnURL.isEmpty())
                                        ? CeoConfig.documentRoot + "/home"
                                        : inputReturnURL);
                    }
                } else {
                    req.session().attribute("flash_message", "No account with email " + inputEmail + " exists.");
                }
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return req;
    }

    public Request register(Request req, Response res) {
        var inputEmail =                    req.queryParams("email");
        var inputPassword =                 req.queryParams("password");
        var inputPasswordConfirmation =     req.queryParams("password-confirmation");

        // Validate input params and assign flash_message if invalid
        if (!isEmail(inputEmail)) {
            req.session().attribute("flash_message", inputEmail + " is not a valid email address.");
        } else if (inputPassword.length() < 8) {
            req.session().attribute("flash_message", "Password must be at least 8 characters.");
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
        } else {
            try (var conn = connect();
                 var pstmt_user = conn.prepareStatement("SELECT * FROM get_user(?)")) {

                pstmt_user.setString(1, inputEmail);
                    try(var rs_user = pstmt_user.executeQuery()){
                    if (rs_user.next()) {
                        req.session().attribute("flash_message", "Account " + inputEmail + " already exists.");
                    } else {
                        try(var pstmt = conn.prepareStatement("SELECT * FROM add_user(?,?)")) {
                            pstmt.setString(1, inputEmail);
                            pstmt.setString(2, inputPassword);
                            try(var rs = pstmt.executeQuery()){
                                if (rs.next()) {
                                    // Assign the username and role session attributes
                                    req.session().attribute("userid", Integer.toString(rs.getInt("add_user")));
                                    req.session().attribute("username", inputEmail);
                                    req.session().attribute("role", "user");

                                    // Redirect to the Home page
                                    res.redirect(CeoConfig.documentRoot + "/home");
                                }
                            }
                        }
                    }
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                req.session().attribute("flash_message", "There was an issue registering a new account.  Please check the console.");
            }
        }
        return req;
    }

    public Request logout(Request req, Response res) {
        req.session().removeAttribute("userid");
        req.session().removeAttribute("username");
        req.session().removeAttribute("role");

        res.redirect(CeoConfig.documentRoot + "/home");
        return req;
    }

    public Request updateAccount(Request req, Response res) {
        var storedEmail =                   req.session().attribute("username").toString();
        var inputEmail =                    req.queryParams("email");
        var inputPassword =                 req.queryParams("password");
        var inputPasswordConfirmation =     req.queryParams("password-confirmation");
        var inputCurrentPassword =          req.queryParams("current-password");

        // Validate input params and assign flash_message if invalid
        if (inputCurrentPassword.length() == 0) {
            req.session().attribute("flash_message", "Current Password required");
        // let user change email without changing password
        } else if (inputEmail.length() > 0 && !isEmail(inputEmail)) {
            req.session().attribute("flash_message", inputEmail + " is not a valid email address.");
        // let user change email without changing password
        } else if (inputPassword.length() > 0 && inputPassword.length() < 8) {
            req.session().attribute("flash_message", "New Password must be at least 8 characters.");
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "New Password and Password confirmation do not match.");
        } else {
            try (var conn = connect();
                 var pstmt_user = conn.prepareStatement("SELECT * FROM get_user(?)")) {

                pstmt_user.setString(1, storedEmail);
                try(var rs_user = pstmt_user.executeQuery()){
                    if(rs_user.next()) {
                        var storedPassword = rs_user.getString("password");
                        if (storedPassword.equals(inputCurrentPassword)) {
                            try(var pstmt = conn.prepareStatement("SELECT * FROM set_user_email_and_password(?,?,?)")){
                                pstmt.setInt(1, rs_user.getInt("id"));
                                pstmt.setString(2, inputEmail.length() == 0 ? storedEmail : inputEmail);
                                pstmt.setString(3, inputPassword.length() == 0 ? storedPassword : inputPassword);
                                pstmt.execute();
                                req.session().attribute("username", inputEmail.length() == 0 ? storedEmail : inputEmail);
                                req.session().attribute("flash_message", "The user has been updated.");
                            }
                        } else {
                            req.session().attribute("flash_message", "Invalid password.");
                        }
                    } else {
                        req.session().attribute("flash_message", "The requested user account does not exist.");
                    }
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                req.session().attribute("flash_message", "There was an issue updating your account.  Please check the console.");
            }
        }
        return req;
    }

    public Request getPasswordResetKey(Request req, Response res) {
        var inputEmail = req.queryParams("email");

        try (var conn = connect();
             var pstmt_user = conn.prepareStatement("SELECT * FROM get_user(?)")) {

            pstmt_user.setString(1, inputEmail);
            var rs_user = pstmt_user.executeQuery();
            if (rs_user.next()) {
                var resetKey = UUID.randomUUID().toString();
                try (var pstmt = conn.prepareStatement("SELECT * FROM set_password_reset_key(?,?)")) {
                    pstmt.setString(1,inputEmail);
                    pstmt.setString(2, resetKey);
                    try(var rs = pstmt.executeQuery()) {
                        if (rs.next()) {
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
                        } else {
                            req.session().attribute("flash_message", "Failed to create a reset key.  Please try again later");
                        }
                    }
                } catch (Exception e) {
                    req.session().attribute("flash_message", "An error occurred. Please try again later.");
                }
            } else {
                req.session().attribute("flash_message", "There is no user with that email address.");
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
            req.session().attribute("flash_message", "There was an issue resetting your password.  Please check the console.");
        }
        return req;
    }

    public Request resetPassword(Request req, Response res) {
        var inputEmail =                    req.queryParams("email");
        var inputResetKey =                 req.queryParams("password-reset-key");
        var inputPassword =                 req.queryParams("password");
        var inputPasswordConfirmation =     req.queryParams("password-confirmation");

        // Validate input params and assign flash_message if invalid
        if (inputPassword.length() < 8) {
            req.session().attribute("flash_message", "Password must be at least 8 characters.");
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
        } else {
            try (var conn = connect();
                 var pstmt_user = conn.prepareStatement("SELECT * FROM get_user(?)")) {

                pstmt_user.setString(1, inputEmail);
                try(var rs_user = pstmt_user.executeQuery()){
                    if (rs_user.next()) {
                        if (rs_user.getString("reset_key").equals(inputResetKey)) {
                            if (rs_user.getString("identity").equals(inputEmail)) {
                                try(var pstmt = conn.prepareStatement("SELECT * FROM update_password(?,?)")){
                                    pstmt.setString(1, inputEmail);
                                    pstmt.setString(2, inputPassword);
                                    pstmt.execute();
                                    req.session().attribute("flash_message", "Your password has been changed.");
                                }
                            }
                        } else {
                            req.session().attribute("flash_message", "Invalid reset key for user " + inputEmail + ".");
                        }
                    } else {
                        req.session().attribute("flash_message", "There is no user with that email address.");
                    }
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
                req.session().attribute("flash_message", "There was an issue resetting your password.  Please check the console.");
            }
        }

        return req;
    }

    public String getAllUsers(Request req, Response res) {
        var institutionId = req.queryParams("institutionId");

        if (institutionId == null || institutionId.isEmpty()) {
            try (var conn = connect(); 
                 var pstmt = conn.prepareStatement("SELECT * FROM get_all_users()")) {

                var allUsers = new JsonArray();
                try(var rs = pstmt.executeQuery()){
                    while (rs.next()) {
                        var userJson = new JsonObject();
                        userJson.addProperty("id", rs.getInt("id"));
                        userJson.addProperty("email", rs.getString("email"));
                        userJson.addProperty("role", rs.getBoolean("administrator") ? "admin" : "user" );
                        // FIXME reset key should be removed from return values
                        userJson.addProperty("resetKey", rs.getString("reset_key"));
                        
                        allUsers.add(userJson);
                    }
                }
                return allUsers.toString();
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        } else {
            try (var conn = connect();
                 var pstmt = conn.prepareStatement("SELECT * FROM get_all_users_by_institution_id(?)")) {

                pstmt.setInt(1, Integer.parseInt(institutionId));
                var instAllUsers = new JsonArray();
                try(var rs = pstmt.executeQuery()){
                    while (rs.next()) {
                        var instUsers = new JsonObject();
                        instUsers.addProperty("id", rs.getInt("id"));
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
            }
        }
        return "";
    }

    // FIXME this appears to be unused.  Not tested
    public Map<Integer, String> getInstitutionRoles(int userId) {
        var inst = new HashMap<Integer,String>();
        try (var conn = connect();
             var pstmt = conn.prepareStatement("SELECT * FROM get_institution_user_roles(?)");) {
                 
            pstmt.setInt(1, userId);
            try(var rs = pstmt.executeQuery()){
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
        var userId =            jsonInputs.get("userId");
        var institutionId =     jsonInputs.get("institutionId").getAsString();
        var role =              jsonInputs.get("role").getAsString();

        try (var conn = connect()) {
            if (role.equals("not-member")) {
                try(var pstmt = conn.prepareStatement("SELECT * FROM remove_institution_user_role(?,?)")){
                    pstmt.setInt(1,Integer.parseInt(institutionId));
                    pstmt.setInt(2,Integer.parseInt(userId.toString()));
                    pstmt.execute();
                }
            } else {
                try(var pstmt = conn.prepareStatement("SELECT * FROM update_institution_user_role(?,?,?)")) {
                    pstmt.setInt(1,Integer.parseInt(institutionId));
                    pstmt.setInt(2,Integer.parseInt(userId.toString()));
                    pstmt.setString(3,role);
                    try(var rs = pstmt.executeQuery()){
                        if(rs.next() && rs.getInt("update_institution_user_role") == 0) {
                            var addPstmt = conn.prepareStatement("SELECT * FROM add_institution_user(?,?,?)");
                            addPstmt.setInt(1,Integer.parseInt(institutionId));
                            addPstmt.setInt(2,Integer.parseInt(userId.toString()));
                            addPstmt.setString(3,role);
                            addPstmt.execute();
                        } 
                    }
                }
            }
            return getInstitutionById(Integer.parseInt(institutionId));

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

    public String requestInstitutionMembership(Request req, Response res) {
        var jsonInputs =        parseJson(req.body()).getAsJsonObject();
        var userId =            jsonInputs.get("userId");
        var institutionId =     jsonInputs.get("institutionId").getAsString();

        try (var conn = connect(); 
             var pstmt = conn.prepareStatement("SELECT * FROM add_institution_user(?,?,?)")) {
                 
            pstmt.setInt(1,Integer.parseInt(institutionId));
            pstmt.setInt(2,Integer.parseInt(userId.toString()));
            pstmt.setInt(3,3);
            pstmt.execute();
            return getInstitutionById(Integer.parseInt(institutionId)); 
        }
        catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

}
