package org.openforis.ceo.postgres;

import org.openforis.ceo.db_api.TimeSync;
import spark.Request;
import spark.Response;

public class PostgresTimeSync implements TimeSync {

    public String getVersion(Request req, Response res) {
        return "{\"Version\": 1.0}";
    }

}
