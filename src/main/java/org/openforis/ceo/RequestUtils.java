package org.openforis.ceo;

import spark.Request;

public class RequestUtils {

	public static String getParam(Request req, String param) {
		return getParam(req, param, null);
	}
	
	public static String getParam(Request req, String param, String defaultValue) {
		String val = req.params(":" + param);
		return val == null ? defaultValue : val;
	}
	
	public static int getIntParam(Request req, String param) {
		return getIntParam(req, param, -1);
	}
	
	public static int getIntParam(Request req, String param, int defaultValue) {
		String val = getParam(req, param);
		return val == null ? defaultValue : Integer.parseInt(val);
	}
}
