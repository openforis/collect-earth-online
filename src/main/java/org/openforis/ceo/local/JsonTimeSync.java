package org.openforis.ceo.local;

import org.openforis.ceo.db_api.TimeSync;
import spark.Request;
import spark.Response;

public class JsonTimeSync implements TimeSync {

    public String getVersion(Request req, Response res) {
        return "Version 1.0";
    }
}
