package org.openforis.ceo.db_api;

import java.util.Map;
import spark.Request;
import spark.Response;

public interface Users {

    String login(Request req, Response res);
    String register(Request req, Response res);
    String logout(Request req, Response res);
    Request updateAccount(Request req, Response res);
    String getPasswordResetKey(Request req, Response res);
    String resetPassword(Request req, Response res);
    String getAllUsers(Request req, Response res);
    String getInstitutionUsers(Request req, Response res);
    String getUserDetails(Request req, Response res);
    String getUserStats(Request req, Response res);
    String updateProjectUserStats(Request req, Response res);
    Map<Integer, String> getInstitutionRoles(int userId);
    String updateInstitutionRole(Request req, Response res);
    String requestInstitutionMembership(Request req, Response res);
    String submitEmailForMailingList(Request req, Response res);
    String unsubscribeFromMailingList(Request req, Response res);

}
