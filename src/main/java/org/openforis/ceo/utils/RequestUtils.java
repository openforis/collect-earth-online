package org.openforis.ceo.utils;

import spark.Request;

public class RequestUtils {

    public static String getParam(Request req, String param) {
        return getParam(req, param, null);
    }

    public static String getParam(Request req, String param, String defaultValue) {
        return req.params(":" + param) != null ? req.params(":" + param) :
               req.queryParams(param) != null ? req.queryParams(param) :
               defaultValue;
    }

    public static int getIntParam(Request req, String param) {
        return getIntParam(req, param, -1);
    }

    public static int getIntParam(Request req, String param, int defaultValue) {
        String val = getParam(req, param);
        return val == null || val.isEmpty() ? defaultValue : Integer.parseInt(val);
    }

}
