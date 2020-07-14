package org.openforis.ceo.db_api;

import com.google.gson.JsonObject;
import java.io.IOException;
import spark.Request;
import spark.Response;

public interface Imagery {

    String getInstitutionImagery(Request req, Response res) throws IOException;
    String getProjectImagery(Request req, Response res) throws IOException;
    String getPublicImagery(Request req, Response res) throws IOException;
    JsonObject getImagerySourceConfig(Integer imageryId);
    String addInstitutionImagery(Request req, Response res) throws IOException;
    String archiveInstitutionImagery(Request req, Response res) throws IOException;
    String updateInstitutionImagery(Request req, Response res) throws IOException;

}
