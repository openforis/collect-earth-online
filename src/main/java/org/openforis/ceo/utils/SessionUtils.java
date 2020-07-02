package org.openforis.ceo.utils;

import spark.Request;

public class SessionUtils {

    public static String getSessionUserId(Request req) {
        return req.session().attributes().contains("userid") ? req.session().attribute("userid").toString() : "-1";
    }

}
