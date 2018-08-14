package org.openforis.ceo.collect;

import static org.openforis.ceo.utils.RequestUtils.createRequestFactory;
import static org.openforis.ceo.utils.RequestUtils.getResponseAsJson;
import static org.openforis.ceo.utils.RequestUtils.prepareGetRequest;
import static org.openforis.ceo.utils.RequestUtils.toRequestContent;

import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpContent;
import com.google.api.client.http.HttpMethods;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.gson.JsonElement;
import java.io.IOException;
import java.util.Map;
import org.openforis.ceo.env.CeoConfig;

public class CollectClient {

    private static final String COLLECT_API_URL = CeoConfig.collectApiUrl;
    private static final int CONNECTION_TIMEOUT = 60000;

    public static JsonElement getFromCollect(String url) {
        return getFromCollect(url, null);
    }

    public static JsonElement getFromCollect(String url, Map<String, Object> params) {
        try {
            var request = prepareGetRequest(COLLECT_API_URL + url);
            if (!(params == null || params.isEmpty())) {
                request.getUrl().putAll(params);
            }
            return getResponseAsJson(request.execute());
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
            var requestFactory = createRequestFactory();
            var content = toRequestContent(params);
            var request = requestFactory.buildRequest(method, new GenericUrl(COLLECT_API_URL + url), content);
            request.setConnectTimeout(CONNECTION_TIMEOUT);
            return getResponseAsJson(request.execute());
        } catch (IOException e) {
            throw new RuntimeException("Error communicating with Collect", e);
        }
    }

}
