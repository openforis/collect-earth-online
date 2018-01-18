package org.openforis.ceo;

import static org.openforis.ceo.JsonUtils.parseJson;

import java.io.IOException;
import java.util.Map;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpContent;
import com.google.api.client.http.HttpMethods;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.http.json.JsonHttpContent;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.JsonObjectParser;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

public class Collect {

	static final String COLLECT_API_URL = CeoConfig.collectApiUrl;
    static final HttpTransport HTTP_TRANSPORT = new NetHttpTransport();
    static final JsonFactory JSON_FACTORY = new JacksonFactory();
    static final int CONNECTION_TIMEOUT = 60000;

    public static HttpRequestFactory createRequestFactory() {
        return HTTP_TRANSPORT.createRequestFactory((HttpRequest request) -> {
            request.setParser(new JsonObjectParser(JSON_FACTORY));
        });
    }

	public static JsonElement getFromCollect(String url) {
        return getFromCollect(url, null);
    }

    public static JsonElement getFromCollect(String url, Map<String, Object> params) {
        try {
            HttpRequestFactory requestFactory = createRequestFactory();
            HttpRequest request = requestFactory.buildGetRequest(new GenericUrl(COLLECT_API_URL + url));
            if (!(params == null || params.isEmpty())) {
                request.getUrl().putAll(params);
            }
            String str = request.execute().parseAsString();
            return parseJson(str);
        } catch (IOException e) {
            throw new RuntimeException("Error communicating with Collect", e);
        }
    }

    public static JsonElement postToCollect(String url) {
        return postToCollect(url, null);
    }
    
    public static JsonElement postToCollect(String url, Object data) {
        return sendToCollect(HttpMethods.POST, url, data);
    }

    public static JsonElement patchToCollect(String url) {
        return patchToCollect(url, null);
    }
    
    public static JsonElement patchToCollect(String url, Object data) {
        return sendToCollect(HttpMethods.PATCH, url, data);
    }
    
    public static JsonElement deleteFromCollect(String url) {
        return deleteFromCollect(url, null);
    }

    public static JsonElement deleteFromCollect(String url, Object data) {
        return sendToCollect(HttpMethods.DELETE, url, data);
    }
    
    public static JsonElement sendToCollect(String method, String url, Object params) {
        try {
            HttpRequestFactory requestFactory = createRequestFactory();
            HttpContent content = toRequestContent(params);
            HttpRequest request = requestFactory.buildRequest(method, new GenericUrl(COLLECT_API_URL + url), content);
            request.setConnectTimeout(CONNECTION_TIMEOUT);
            String result = request.execute().parseAsString();
            return parseJson(result);
        } catch (IOException e) {
            throw new RuntimeException("Error communicating with Collect", e);
        }
    }

	private static HttpContent toRequestContent(Object params) {
		if (params == null) {
			return null;
		} else if (params instanceof JsonObject) {
		    Map<?,?> mapData = new Gson().fromJson((JsonObject) params, Map.class);
		    return new JsonHttpContent(JSON_FACTORY, mapData);
		} else {
			return new JsonHttpContent(JSON_FACTORY, params);
		}
	}
}
