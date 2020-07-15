package org.openforis.ceo.utils;

import spark.Request;

public class SessionUtils {

    public static Integer getSessionUserId(Request req) {
        return req.session().attributes().contains("userid")
            ? Integer.parseInt(req.session().attribute("userid"))
            : -1;
    }

}
