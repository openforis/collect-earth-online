package org.openforis.ceo.db_api;

import spark.Request;
import spark.Response;

public interface TimeSync {

    String getVersion(Request req, Response res);
    String getAssignedProjects(Request req, Response res);

    // String updateDashBoardById(Request req, Response res);
    // String createDashBoardWidgetById(Request req, Response res);
    // String updateDashBoardWidgetById(Request req, Response res);
    // String deleteDashBoardWidgetById(Request req, Response res);
}
