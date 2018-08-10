package org.openforis.ceo.postgres;

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

import java.sql.*;
import java.util.*;
import java.util.stream.Collectors;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;
import org.openforis.ceo.db_api.Users;

public class PostgresUsers implements Users {
    private final String url = "jdbc:postgresql://localhost";
    private final String user = "ceo";
    private final String password = "ceo";
    private static final String BASE_URL      = CeoConfig.baseUrl;
    private static final String SMTP_USER     = CeoConfig.smtpUser;
    private static final String SMTP_SERVER   = CeoConfig.smtpServer;
    private static final String SMTP_PORT     = CeoConfig.smtpPort;
    private static final String SMTP_PASSWORD = CeoConfig.smtpPassword;

    public Request login(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputReturnURL = req.queryParams("returnurl");
        String returnURL = (inputReturnURL != null && !inputReturnURL.isEmpty()) ?
                CeoConfig.documentRoot + "/" + inputReturnURL + "?" + req.queryString() :
                CeoConfig.documentRoot + "/home";
        String SQL = "SELECT * FROM get_user(?)";
        try (Connection conn = this.connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setString(1, inputEmail);
            ResultSet rs = pstmt.executeQuery();
            if(rs.next()) {
                // Check if password matches

                int storedId = rs.getInt("id");
                String storedPassword = rs.getString("password");
                boolean administrator = rs.getBoolean("administrator");
                if (!inputPassword.equals(storedPassword)) {
                    // Authentication failed
                    req.session().attribute("flash_message", "Invalid email/password combination.");
                    return req;
                } else {
                    // Authentication successful
                    req.session().attribute("userid", storedId);
                    req.session().attribute("username", inputEmail);
                    req.session().attribute("administrator", administrator);
                    res.redirect(returnURL);
                    return req;
                }
                } else{
                    req.session().attribute("flash_message", "No account with email " + inputEmail + " exists.");
                    return req;
                }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return req;
    }

    public Request register(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");

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
        }
        else{
            String SQL_user = "SELECT * FROM get_user(?)";
            try (Connection conn = this.connect();
                 PreparedStatement pstmt_user = conn.prepareStatement(SQL_user)) {
                pstmt_user.setString(1, inputEmail);
                ResultSet rs_user = pstmt_user.executeQuery();
                if(rs_user.next()) {

                    req.session().attribute("flash_message", "Account " + inputEmail + " already exists.");
                    return req;

                 }
                else {

                    String SQL = "SELECT * FROM add_user(?,?)";
                    PreparedStatement pstmt = conn.prepareStatement(SQL);
                    pstmt.setString(1, inputEmail);
                    pstmt.setString(2, inputPassword);

                    ResultSet rs = pstmt.executeQuery();
                    if (rs.next()) {
                        // Assign the username and role session attributes
                        req.session().attribute("userid", rs.getInt("id"));
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
        req.session().removeAttribute("role");
        return req;
    }

    public Request updateAccount(Request req, Response res) {
        String userId = req.session().attribute("userid");
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");
        String inputCurrentPassword = req.queryParams("current-password");

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
        }
        else{
            String SQL_user = "SELECT * FROM get_user(?)";
            try (Connection conn = this.connect();
                 PreparedStatement pstmt_user = conn.prepareStatement(SQL_user)) {
                pstmt_user.setString(1, inputEmail);
                ResultSet rs_user = pstmt_user.executeQuery();
                if(rs_user.next()) {

                    String storedPassword = rs_user.getString("password");
                        if (storedPassword.equals(inputPassword)) {

                            String SQL = "SELECT * FROM set_user_email_and_password(?,?,?)";
                            PreparedStatement pstmt = conn.prepareStatement(SQL);
                            pstmt.setInt(1, rs_user.getInt("id"));
                            pstmt.setString(2, inputEmail);
                            pstmt.setString(3, inputPassword);
                            ResultSet rs = pstmt.executeQuery();
                            req.session().attribute("username", inputEmail);
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
        String inputEmail = req.queryParams("email");
        String SQL_user = "SELECT * FROM get_user(?)";
        try (Connection conn = this.connect();
             PreparedStatement pstmt_user = conn.prepareStatement(SQL_user)) {
            pstmt_user.setString(1, inputEmail);
            ResultSet rs_user = pstmt_user.executeQuery();
            if (rs_user.next()) {
                try {
                    String resetKey = UUID.randomUUID().toString();
                    String SQL = "SELECT * FROM set_password_reset_key(?,?)";
                    PreparedStatement pstmt = conn.prepareStatement(SQL);
                    pstmt.setString(1,inputEmail);
                    pstmt.setString(2, resetKey);
                    ResultSet rs = pstmt.executeQuery();
                    String body = "Hi "
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
        }
        catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return req;
    }

    public Request resetPassword(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputResetKey = req.queryParams("password-reset-key");
        String inputPassword = req.queryParams("password");
        String inputPasswordConfirmation = req.queryParams("password-confirmation");

        // Validate input params and assign flash_message if invalid
        if (inputPassword.length() < 8) {
            req.session().attribute("flash_message", "Password must be at least 8 characters.");
            return req;
        } else if (!inputPassword.equals(inputPasswordConfirmation)) {
            req.session().attribute("flash_message", "Password and Password confirmation do not match.");
            return req;
        }
        else{
            String SQL_user = "SELECT * FROM get_user(?)";
            try (Connection conn = this.connect();
                 PreparedStatement pstmt_user = conn.prepareStatement(SQL_user)) {
                pstmt_user.setString(1, inputEmail);
                ResultSet rs_user = pstmt_user.executeQuery();
                if (rs_user.next()) {
                    String storedEmail = rs_user.getString("email");
                    String storedResetKey = rs_user.getString("reset_key");
                    if (storedResetKey.equals(inputResetKey)) {
                        if (storedEmail.equals(inputEmail)) {
                            String SQL = "SELECT * FROM set_password_reset_key(?,?)";
                            PreparedStatement pstmt = conn.prepareStatement(SQL);
                            pstmt.setString(1, inputEmail);
                            pstmt.setString(2, inputPassword);
                            ResultSet rs = pstmt.executeQuery();
                            req.session().attribute("flash_message", "Your password has been changed.");
                            return req;
                        }
                    }
                    else{
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
        String institutionId = req.queryParams("institutionId");
        if (institutionId == null || institutionId.isEmpty()) {
            String SQL_users = "SELECT * FROM get_all_users()";
            try (Connection conn = this.connect();
                 PreparedStatement pstmt_users = conn.prepareStatement(SQL_users)) {
                ResultSet rs_users = pstmt_users.executeQuery();
                JsonObject all_users = new JsonObject();
                all_users.addProperty("id", rs_users.getInt("id"));
                all_users.addProperty("email", rs_users.getString("email"));
                all_users.addProperty("administrator", rs_users.getBoolean("administrator"));
                all_users.addProperty("resetKey", rs_users.getString("reset_key"));

                return all_users.toString();
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        } else {

            String SQL = "SELECT * FROM get_all_users_by_institution_id(?)";
            try (Connection conn = this.connect();
                 PreparedStatement pstmt = conn.prepareStatement(SQL)) {
                pstmt.setString(1, institutionId);
                ResultSet rs = pstmt.executeQuery();
                if (rs.next()) {
                    JsonObject inst_users = new JsonObject();
                    inst_users.addProperty("id", rs.getInt("id"));
                    inst_users.addProperty("email", rs.getString("email"));
                    inst_users.addProperty("administrator", rs.getBoolean("administrator"));
                    inst_users.addProperty("resetKey", rs.getString("reset_key"));
                    inst_users.addProperty("institutionRole", rs.getString("institution_role"));
                    return inst_users.toString();
                } else {
                    return (new JsonArray()).toString();
                }
            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
        }

            return "";

    }

    public Map<Integer, String> getInstitutionRoles(int userId){
            Map<Integer, String> inst =new HashMap<Integer,String>() ;
            String SQL = "SELECT * FROM get_institution_user_roles(?)";
            try (Connection conn = this.connect();
                 PreparedStatement pstmt = conn.prepareStatement(SQL)) {
                pstmt.setInt(1, userId);
                ResultSet rs = pstmt.executeQuery();
                while (rs.next()) {
                    inst.put(rs.getInt("institution_id"), rs.getString("role").toString());
                }

            } catch (SQLException e) {
                System.out.println(e.getMessage());
            }
            return inst;
        }

        public String updateInstitutionRole(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        JsonElement userId = jsonInputs.get("userId");
        String institutionId = jsonInputs.get("institutionId").getAsString();
        String role = jsonInputs.get("role").getAsString();
        String SQL = "SELECT * FROM update_institution_user_role(?,?,?)";

        try (Connection conn = this.connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1,Integer.parseInt(institutionId));
            pstmt.setInt(2,Integer.parseInt(userId.toString()));
            pstmt.setString(3,role);
            ResultSet rs = pstmt.executeQuery();
        }
        catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }

    public String requestInstitutionMembership(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        JsonElement userId = jsonInputs.get("userId");
        String institutionId = jsonInputs.get("institutionId").getAsString();
        String SQL = "SELECT * FROM update_institution_user_role(?,?,?)";

        try (Connection conn = this.connect();
             PreparedStatement pstmt = conn.prepareStatement(SQL)) {
            pstmt.setInt(1,Integer.parseInt(institutionId));
            pstmt.setInt(2,Integer.parseInt(userId.toString()));
            pstmt.setString(3,"pending");
            ResultSet rs = pstmt.executeQuery();
        }
        catch (SQLException e) {
            System.out.println(e.getMessage());
        }
        return "";
    }
    //Returns a connection to the database
    private Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

}
