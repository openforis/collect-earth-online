package org.openforis.ceo.db_api;

import javax.servlet.http.HttpServletResponse;
import spark.Request;
import spark.Response;

public interface Projects {

    String getAllProjects(Request req, Response res);
    String getProjectById(Request req, Response res);
    String getProjectPlots(Request req, Response res);
    String getProjectPlot(Request req, Response res);
    String getProjectStats(Request req, Response res);
    String getUnassignedPlot(Request req, Response res);
    String getUnassignedPlotById(Request req, Response res);
    HttpServletResponse dumpProjectAggregateData(Request req, Response res);
    HttpServletResponse dumpProjectRawData(Request req, Response res);
    String publishProject(Request req, Response res);
    String closeProject(Request req, Response res);
    String archiveProject(Request req, Response res);
    String addUserSamples(Request req, Response res);
    String flagPlot(Request req, Response res);
    String createProject(Request req, Response res);

}
