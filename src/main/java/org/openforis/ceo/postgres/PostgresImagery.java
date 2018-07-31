package org.openforis.ceo.postgres;

import spark.Request;
import spark.Response;

/**
 * Created by gtondapu on 7/31/2018.
 */
public class PostgresImagery {
    public static String getAllImagery(Request req, Response res) {
        String institutionId = req.queryParams("institutionId");
        return "";
    }

    public String addInstitutionImagery(Request req, Response res) {
        try {
            return "";
        } catch (Exception e) {
            // Indicate that an error occurred with imagery creation
            throw new RuntimeException(e);
        }
    }

    public synchronized String deleteInstitutionImagery(Request req, Response res) {


        return "";
    }

}

