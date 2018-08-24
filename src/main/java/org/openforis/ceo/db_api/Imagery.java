package org.openforis.ceo.db_api;

import java.io.IOException;
import spark.Request;
import spark.Response;

public interface Imagery {

    String getAllImagery(Request req, Response res) throws IOException;
    String addInstitutionImagery(Request req, Response res) throws IOException;
    String deleteInstitutionImagery(Request req, Response res) throws IOException;

}
