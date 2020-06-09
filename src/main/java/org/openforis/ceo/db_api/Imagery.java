package org.openforis.ceo.db_api;

import com.google.gson.JsonObject;
import java.io.IOException;
import spark.Request;
import spark.Response;

public interface Imagery {

    String getAllImagery(Request req, Response res) throws IOException;
    JsonObject getImagerySourceConfig(Integer imageryId);
    String addInstitutionImagery(Request req, Response res) throws IOException;
    String addGeoDashImagery(Request req, Response res) throws IOException;
    String archiveInstitutionImagery(Request req, Response res) throws IOException;

}
