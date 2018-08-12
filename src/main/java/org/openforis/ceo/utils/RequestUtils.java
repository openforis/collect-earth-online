package org.openforis.ceo.utils;

import static org.openforis.ceo.utils.JsonUtils.parseJson;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpContent;
import com.google.api.client.http.HttpHeaders;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.MultipartContent;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.http.json.JsonHttpContent;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.GenericData;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.util.Map;
import spark.Request;

public class RequestUtils {

    public static String getParam(Request req, String param) {
        return getParam(req, param, null);
    }

    public static String getParam(Request req, String param, String defaultValue) {
        return req.params(":" + param) != null ? req.params(":" + param) :
               req.queryParams(param) != null ? req.queryParams(param) :
               defaultValue;
    }

    public static int getIntParam(Request req, String param) {
        return getIntParam(req, param, -1);
    }

    public static int getIntParam(Request req, String param, int defaultValue) {
        var val = getParam(req, param);
        return val == null || val.isEmpty() ? defaultValue : Integer.parseInt(val);
    }

    private static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    private static final JsonFactory JSON_FACTORY = new JacksonFactory();

    public static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
                request.setParser(new JsonObjectParser(JSON_FACTORY));
            });
    }

    public static HttpRequestFactory createPatchRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
                request.setHeaders(new HttpHeaders().set("X-HTTP-Method-Override", "PATCH"));
                request.setParser(new JsonObjectParser(JSON_FACTORY));
            });
    }

    public static HttpRequest prepareGetRequest(String url) throws IOException {
        return createRequestFactory().buildGetRequest(new GenericUrl(url));
    }

    public static HttpRequest preparePostRequest(String url) throws IOException {
        return preparePostRequest(url, (GenericData) null);
    }

    public static HttpRequest preparePostRequest(String url, GenericData data) throws IOException {
        return createRequestFactory()
            .buildPostRequest(new GenericUrl(url),
                              data == null ? null : new JsonHttpContent(new JacksonFactory(), data));
    }

    public static HttpRequest preparePostRequest(String url, MultipartContent content) throws IOException {
        return createRequestFactory().buildPostRequest(new GenericUrl(url), content);
    }

    public static HttpRequest preparePatchRequest(String url, GenericData data) throws IOException {
        return createPatchRequestFactory()
            .buildPostRequest(new GenericUrl(url),
                              new JsonHttpContent(new JacksonFactory(), data));
    }

    public static HttpRequest preparePatchRequest(String url, MultipartContent content) throws IOException {
        return createPatchRequestFactory().buildPostRequest(new GenericUrl(url), content);
    }

    public static HttpRequest prepareDeleteRequest(String url) throws IOException {
        return createRequestFactory().buildDeleteRequest(new GenericUrl(url));
    }

    public static JsonElement getResponseAsJson(HttpResponse response) throws IOException {
        return parseJson(response.parseAsString());
    }

    public static HttpContent toRequestContent(Object params) {
        if (params == null) {
            return null;
        } else if (params instanceof JsonObject) {
            var mapData = (new Gson()).fromJson((JsonObject) params, Map.class);
            return new JsonHttpContent(JSON_FACTORY, mapData);
        } else {
            return new JsonHttpContent(JSON_FACTORY, params);
        }
    }

}
