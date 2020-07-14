package org.openforis.ceo;

import static org.openforis.ceo.utils.RequestUtils.prepareGetRequest;

import com.google.api.client.http.HttpResponseException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.servlet.http.HttpServletResponse;
import org.openforis.ceo.db_api.Imagery;
import spark.Request;
import spark.Response;

public class Proxy {

    private static Integer getQParamNoNull(Request req, String name) {
        var param = req.queryParamOrDefault(name, "");
        return param == null || param.equals("null") ? 0 : Integer.parseInt(param);
    }

    private static String buildUrl(Request req, Imagery imagery) {
        var x = req.queryParamOrDefault("x", "");
        var y = req.queryParamOrDefault("y", "");
        var z = req.queryParamOrDefault("z", "");

        var sourceConfig = imagery.getImagerySourceConfig(getQParamNoNull(req, "imageryId"));
        var sourceType = sourceConfig.get("type").getAsString();

        if (sourceType.equals("Planet")) {
            var apiKey  = sourceConfig.get("accessToken").getAsString();
            var year    = req.queryParamOrDefault("year", "");
            var month   = req.queryParamOrDefault("month", "");
            var tile    = req.queryParamOrDefault("tile", "");
            var baseUrl = "https://tiles" + tile
                          + ".planet.com/basemaps/v1/planet-tiles/global_monthly_"
                          + year + "_" + month
                          + "_mosaic/gmap/{z}/{x}/{y}.png?api_key=";
            return baseUrl.replace("{z}", z).replace("{x}", x).replace("{y}", y) + apiKey;
        } else if (List.of("GeoServer", "SecureWatch").contains(sourceType)) {
            final var queryParams     = req.queryString().split("&"); // includes STYLES=
            final var geoserverParams = sourceConfig.get("geoserverParams").getAsJsonObject(); // includes manually input STYLES
            final var geoserverLayers = geoserverParams.get("LAYERS").getAsString();
            final var sourceUrl       = sourceConfig.get("geoserverUrl").getAsString();
            final var sourceUrlBase   = sourceUrl.contains("?") ? sourceUrl : sourceUrl + "?";

            return sourceUrlBase
                + Stream.concat(Arrays.stream(queryParams)
                                .filter(q -> {
                                        // Remove imageryId, LAYERS, and any params from the GeoServer Params field
                                        // also remove the empty featureprofile
                                        final var param = q.split("=")[0];
                                        return !param.equals("imageryId") && !geoserverParams.keySet().contains(param)
                                                && !q.toUpperCase().equals("FEATUREPROFILE=");
                                    })
                                .map(q -> {
                                        // If STYLES="", set STYLES="default". If LAYERS has multiple entries, match those in STYLES.
                                        if (q.toUpperCase().equals("STYLES=")) {
                                            if (geoserverLayers.contains(",")) {
                                                return "STYLES=" +
                                                    Arrays.stream(geoserverLayers.split(","))
                                                    .map(layer -> sourceType == "SecureWatch" ? "default" : "")
                                                    .collect(Collectors.joining(","));
                                            } else if (sourceType == "SecureWatch") {
                                                return "STYLES=default";
                                            } else {
                                                return "STYLES=";
                                            }
                                        } else {
                                            return q;
                                        }
                                    }),
                                geoserverParams.entrySet().stream()
                                .map(ent -> ent.getKey() + "=" + ent.getValue().getAsString()))
                .collect(Collectors.joining("&"));
        } else {
            return "";
        }
    }

    public static HttpServletResponse executeRequestUrl(Request req, Response res, String url) {
        try {
            var request     = prepareGetRequest(url);
            var response    = request.execute();
            var status      = response.getStatusCode();
            var contentType = response.getMediaType().toString();
            res.status(status);
            res.type(contentType);
            if (status == 200) {
                // Copy binary data between the two response bodies
                var rawResponse = res.raw();
                try (var inputStream  = response.getContent(); // transferTo -> close
                     var outputStream = rawResponse.getOutputStream();) { // transferTo -> flush -> close
                    inputStream.transferTo(outputStream);
                    outputStream.flush();
                }
                return rawResponse;
            } else {
                res.body(response.getContent().toString());
                return res.raw();
            }
        } catch (HttpResponseException e) {
            System.out.println("Failed to load " + url);
            res.status(e.getStatusCode());
            res.body(e.getStatusMessage());
            return res.raw();
        } catch (Exception e) {
            System.out.println("Failed to load " + url);
            res.status(500);
            res.body(e.getMessage());
            return res.raw();
        }
    }

    public static HttpServletResponse proxyImagery(Request req, Response res, Imagery imagery) {
        var url = buildUrl(req, imagery);
        return executeRequestUrl(req, res, url);
    }

    public static HttpServletResponse getSecureWatchDates(Request req, Response res, Imagery imagery) {
        return executeRequestUrl(req, res,
                imagery.getImagerySourceConfig(getQParamNoNull(req, "imageryId"))
                        .get("geoserverUrl").getAsString()
                + "?"
                + Arrays.stream(req.queryString().split("&"))
                    .filter(q -> !q.split("=")[0].equals("imageryId"))
                    .collect(Collectors.joining("&"))
                + "&CONNECTID="
                + imagery.getImagerySourceConfig(getQParamNoNull(req, "imageryId"))
                    .get("geoserverParams").getAsJsonObject()
                    .get("CONNECTID").getAsString());
    }
}
