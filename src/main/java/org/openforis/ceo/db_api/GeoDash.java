package org.openforis.ceo.db_api;

import spark.Request;
import spark.Response;

public interface GeoDash {

    String geodashId(Request req, Response res);
    String updateDashBoardByID(Request req, Response res);
    String createDashBoardWidgetByID(Request req, Response res);
    String updateDashBoardWidgetByID(Request req, Response res);
    String deleteDashBoardWidgetByID(Request req, Response res);

}
