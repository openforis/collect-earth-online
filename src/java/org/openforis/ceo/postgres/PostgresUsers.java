import static org.openforis.ceo.utils.DatabaseUtils.connect;
import static org.openforis.ceo.postgres.PostgresInstitutions.getInstitutionById;
import static org.openforis.ceo.utils.JsonUtils.parseJson;
import static org.openforis.ceo.utils.Mail.sendToMailingList;
import static org.openforis.ceo.utils.Mail.CONTENT_TYPE_HTML;
import static org.openforis.ceo.utils.SessionUtils.getSessionUserId;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import java.sql.SQLException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.openforis.ceo.db_api.Users;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;

    private static final String BASE_URL               = CeoConfig.baseUrl;
    private static final Integer MAILING_LIST_INTERVAL = Integer.parseInt(CeoConfig.mailingListInterv
                                                                          al);
    private static LocalDateTime mailingListLastSent   = LocalDateTime.now().minusSeconds(MAILING_LIST_INTERVAL);

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
        var remainingTime = MAILING_LIST_INTERVAL
                            - Duration.between(mailingListLastSent, LocalDateTime.now()).toSeconds();
        var jsonInputs = parseJson(req.body()).getAsJsonObject();
        var inputSubject = jsonInputs.get("subject").getAsString();
        var inputBody = jsonInputs.get("body").getAsString();

        if (remainingTime > 0) {
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
