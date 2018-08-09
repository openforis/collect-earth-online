package org.openforis.ceo.db_api;

import spark.Request;
import spark.Response;

public interface Imagery {

    String getAllImagery(Request req, Response res);
    String addInstitutionImagery(Request req, Response res);
    String deleteInstitutionImagery(Request req, Response res);

}
