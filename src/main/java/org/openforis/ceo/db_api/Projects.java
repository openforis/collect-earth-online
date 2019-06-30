package org.openforis.ceo.db_api;

import javax.servlet.http.HttpServletResponse;
import spark.Request;
import spark.Response;

public interface Projects {

    Boolean canCollect(Request req);
    Boolean isProjAdmin(Request req);
    Request redirectNoCollect(Request req, Response res);
    Request redirectNonProjAdmin(Request req, Response res);
    String getAllProjects(Request req, Response res);
    String getProjectById(Request req, Response res);
    String getProjectStats(Request req, Response res);
    HttpServletResponse dumpProjectAggregateData(Request req, Response res);
    HttpServletResponse dumpProjectRawData(Request req, Response res);
    String publishProject(Request req, Response res);
    String closeProject(Request req, Response res);
    String archiveProject(Request req, Response res);
    String updateProject(Request req, Response res);
    String createProject(Request req, Response res);

}
