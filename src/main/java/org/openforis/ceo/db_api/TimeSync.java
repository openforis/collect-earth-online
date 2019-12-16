package org.openforis.ceo.db_api;

import spark.Request;
import spark.Response;

public interface TimeSync {

    String getVersion(Request req, Response res);

    String getAssignedProjects(Request req, Response res);

    String getPlots(Request req, Response res);

    String getVerticesForPlot(Request req, Response res);

    String getVerticesForProject(Request req, Response res);

    String saveVertex(Request req, Response res);

    String saveComment(Request req, Response res);

    String getComment(Request req, Response res);

    String getImagePreference(Request req, Response res);

    String updateImagePreference(Request req, Response res);
}
