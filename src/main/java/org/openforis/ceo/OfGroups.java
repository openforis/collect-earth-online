package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.filterJsonArray;
import static org.openforis.ceo.JsonUtils.toStream;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpHeaders;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.http.json.JsonHttpContent;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.GenericData;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import spark.Request;
import spark.Response;

public class OfGroups {

    static String OF_USERS_API_URL = CeoConfig.ofUsersApiUrl;
    static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    static final JsonFactory JSON_FACTORY = new JacksonFactory();

    private static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
            request.setParser(new JsonObjectParser(JSON_FACTORY));
        });
    }

    private static HttpRequestFactory createPatchRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
            request.setHeaders(new HttpHeaders().set("X-HTTP-Method-Override", "PATCH"));
            request.setParser(new JsonObjectParser(JSON_FACTORY));
        });
    }

    private static HttpRequest prepareGetRequest(String url) throws IOException {
        return createRequestFactory().buildGetRequest(new GenericUrl(url));
    }

    private static HttpRequest preparePatchRequest(String url, GenericData data) throws IOException {
        return createPatchRequestFactory()
             .buildPostRequest(new GenericUrl(url),
                        new JsonHttpContent(new JacksonFactory(), data));
    }

    private static HttpRequest preparePostRequest(String url, GenericData data) throws IOException {
        return createRequestFactory()
            .buildPostRequest(new GenericUrl(url),
                              new JsonHttpContent(new JacksonFactory(), data));
    }

    private static JsonElement getResponseAsJson(HttpResponse response) throws IOException {
        return JsonUtils.parseJson(response.parseAsString());
    }

    public static String getAllInstitutions(Request req, Response res) {
        try {
            HttpResponse response = prepareGetRequest(OF_USERS_API_URL + "group").execute(); // get all groups
            if (response.isSuccessStatusCode()) {
                JsonArray groups = getResponseAsJson(response).getAsJsonArray();
                String[] hiddenInstitutions = new String[]{"All Users", "Administrators"};
                JsonArray visibleGroups = filterJsonArray(groups, group ->
                                                          group.get("enabled").getAsBoolean() == true
                                                          && !Arrays.asList(hiddenInstitutions).contains(group.get("name").getAsString()));
                return visibleGroups.toString();
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
        }
        return "[]";
    }

    private static Optional<JsonObject> getInstitutionById(int institutionId) {
        try {
            String url = String.format(OF_USERS_API_URL + "group/%d", institutionId);
            HttpResponse response = prepareGetRequest(url).execute(); // get group
            if (response.isSuccessStatusCode()) {
                JsonObject group = getResponseAsJson(response).getAsJsonObject();
                //
                url = String.format(OF_USERS_API_URL + "group/%d/users", institutionId);
                response = prepareGetRequest(url).execute(); // get group's users
                JsonArray groupUsers = getResponseAsJson(response).getAsJsonArray();
                JsonArray members = new JsonArray();
                JsonArray admins = new JsonArray();
                JsonArray pending = new JsonArray();
                toStream(groupUsers).forEach(groupUser -> {
                                                if (groupUser.get("statusCode").getAsString().equals("P")) pending.add(groupUser.get("userId"));
                                                else if (groupUser.get("roleCode").getAsString().equals("ADM")) admins.add(groupUser.get("userId"));
                                                else if (groupUser.get("roleCode").getAsString().equals("OWN")) admins.add(groupUser.get("userId"));
                                                else if (groupUser.get("roleCode").getAsString().equals("OPR")) members.add(groupUser.get("userId"));
                                                else if (groupUser.get("roleCode").getAsString().equals("VWR")) members.add(groupUser.get("userId"));
                });
                group.add("admins", admins);
                group.add("members", members);
                group.add("pending", pending);
                //
                return Optional.ofNullable(group);
            }
        } catch (IOException e) {
            e.printStackTrace(); //TODO
        }
        return Optional.empty();
    }

    public static String getInstitutionDetails(Request req, Response res) {
        int institutionId = Integer.parseInt(req.params(":id"));
        Optional<JsonObject> matchingInstitution = getInstitutionById(institutionId);
        if (matchingInstitution.isPresent()) {
            return matchingInstitution.get().toString();
        } else {
            JsonObject noInstitutionFound = new JsonObject();
            noInstitutionFound.addProperty("id", "-1");
            noInstitutionFound.addProperty("name", "No institution with ID=" + institutionId);
            noInstitutionFound.addProperty("logo", "");
            noInstitutionFound.addProperty("url", "");
            noInstitutionFound.addProperty("description", "");
            return noInstitutionFound.toString();
        }
    }

    public static synchronized String archiveInstitution(Request req, Response res) {
        String institutionId = req.params(":id");
        GenericData data = new GenericData();
        data.put("enabled", false);
        String url = String.format(OF_USERS_API_URL + "group/%s", institutionId);
        try {
            preparePatchRequest(url, data).execute(); // change group
        } catch (IOException e) {
            e.printStackTrace(); // TODO
        }
        return "";
    }

}
