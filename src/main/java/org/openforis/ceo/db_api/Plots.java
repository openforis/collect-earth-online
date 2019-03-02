package org.openforis.ceo.db_api;

import spark.Request;
import spark.Response;

public interface Plots {

    String getProjectPlots(Request req, Response res);
    String getProjectPlot(Request req, Response res);
    String getPlotById(Request req, Response res);
    String getNextPlot(Request req, Response res);
    String getPrevPlot(Request req, Response res);
    String addUserSamples(Request req, Response res);
    String flagPlot(Request req, Response res);
    String resetPlotLock(Request req, Response res);
    String releasePlotLocks(Request req, Response res);

}
