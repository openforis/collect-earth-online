package org.openforis.ceo.db_api;

import spark.Request;
import spark.Response;

public interface Institutions {

    Boolean isInstAdmin(Request req);
    String getAllInstitutions(Request req, Response res);
    String getInstitutionDetails(Request req, Response res);
    String createInstitution(Request req, Response res);
    String updateInstitution(Request req, Response res);
    String archiveInstitution(Request req, Response res);

}
