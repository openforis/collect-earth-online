package org.openforis.ceo.local;

import org.openforis.ceo.db_api.TimeSync;
import spark.Request;
import spark.Response;

public class JsonTimeSync implements TimeSync {

    @Override
    public String getVersion(Request req, Response res) {
        return "Version 1.0";
    }

    @Override
    public String getAssignedProjects(Request req, Response res) {
        return null;
    }

    @Override
    public String getVerticesForPlot(Request req, Response res) {
        return null;
    }

    @Override
    public String getPlots(Request req, Response res) {
        return null;
    }

    @Override
    public String getVerticesForProject(Request req, Response res) {
        return null;
    }

    @Override
    public String saveVertex(Request req, Response res) {
        return null;
    }

    @Override
    public String saveComment(Request req, Response res) {
        return null;
    }

    @Override
    public String getComment(Request req, Response res) {
        return null;
    }
}
