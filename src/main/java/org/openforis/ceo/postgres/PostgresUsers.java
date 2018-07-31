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

import java.util.*;
import java.util.stream.Collectors;
import org.openforis.ceo.env.CeoConfig;
import spark.Request;
import spark.Response;

public class PostgresUsers {

    private static final String BASE_URL      = CeoConfig.baseUrl;
    private static final String SMTP_USER     = CeoConfig.smtpUser;
    private static final String SMTP_SERVER   = CeoConfig.smtpServer;
    private static final String SMTP_PORT     = CeoConfig.smtpPort;
    private static final String SMTP_PASSWORD = CeoConfig.smtpPassword;

    public Request login(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        String inputPassword = req.queryParams("password");
        String inputReturnURL = req.queryParams("returnurl");
        return req;
    }

    public Request register(Request req, Response res) {
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
        }
        return req;
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
        }
        return req;
    }

    public Request getPasswordResetKey(Request req, Response res) {
        String inputEmail = req.queryParams("email");
        return req;
    }

    public Request resetPassword(Request req, Response res) {
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
        }
        return req;
    }

    public String getAllUsers(Request req, Response res) {
        String institutionId = req.queryParams("institutionId");
        return "";
    }

    public Map<Integer, String> getInstitutionRoles(int userId) {
       return new Map<Integer, String>() {
           @Override
           public int size() {
               return 0;
           }

           @Override
           public boolean isEmpty() {
               return false;
           }

           @Override
           public boolean containsKey(Object key) {
               return false;
           }

           @Override
           public boolean containsValue(Object value) {
               return false;
           }

           @Override
           public String get(Object key) {
               return null;
           }

           @Override
           public String put(Integer key, String value) {
               return null;
           }

           @Override
           public String remove(Object key) {
               return null;
           }

           @Override
           public void putAll(Map<? extends Integer, ? extends String> m) {

           }

           @Override
           public void clear() {

           }

           @Override
           public Set<Integer> keySet() {
               return null;
           }

           @Override
           public Collection<String> values() {
               return null;
           }

           @Override
           public Set<Entry<Integer, String>> entrySet() {
               return null;
           }
       };
    }

    public String updateInstitutionRole(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        JsonElement userId = jsonInputs.get("userId");
        String institutionId = jsonInputs.get("institutionId").getAsString();
        String role = jsonInputs.get("role").getAsString();

        return "";
    }

    public String requestInstitutionMembership(Request req, Response res) {
        JsonObject jsonInputs = parseJson(req.body()).getAsJsonObject();
        JsonElement userId = jsonInputs.get("userId");
        String institutionId = jsonInputs.get("institutionId").getAsString();

        return "";
    }

}
