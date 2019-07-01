package org.openforis.ceo.db_api;

import java.io.IOException;
import spark.Request;
import spark.Response;

public interface Imagery {

    String getPublicImagery(Request req, Response res) throws IOException;
    String getInstitutionImagery(Request req, Response res) throws IOException;
    String addInstitutionImagery(Request req, Response res) throws IOException;
    String addGeoDashImagery(Request req, Response res) throws IOException;
    String deleteInstitutionImagery(Request req, Response res) throws IOException;

}
