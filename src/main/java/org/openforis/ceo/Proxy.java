package org.openforis.ceo;

import static org.openforis.ceo.utils.RequestUtils.prepareGetRequest;

import com.google.api.client.http.HttpResponseException;
import java.io.IOException;
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

        if (List.of("EarthWatch", "DigitalGlobe").contains(sourceType)) {
            var connectId = sourceConfig.get("connectId").getAsString();
            var baseUrl   = "https://earthwatch.digitalglobe.com/earthservice/tmsaccess/tms/1.0.0/DigitalGlobe:ImageryTileService@EPSG:3857@jpg/{z}/{x}/{y}.jpg?connectId=";
            return baseUrl.replace("{z}", z).replace("{x}", x).replace("{y}", y) + connectId;
        } else if (sourceType.equals("Planet")) {
            var apiKey  = sourceConfig.get("accessToken").getAsString();
            var year    = req.queryParamOrDefault("year", "");
            var month   = req.queryParamOrDefault("month", "");
            var tile    = req.queryParamOrDefault("tile", "");
            var baseUrl = "https://tiles" + tile
                          + ".planet.com/basemaps/v1/planet-tiles/global_monthly_"
                          + year + "_" + month
                          + "_mosaic/gmap/{z}/{x}/{y}.png?api_key=";
            return baseUrl.replace("{z}", z).replace("{x}", x).replace("{y}", y) + apiKey;
        } else if (sourceType.equals("GeoServer")) {
            final var queryParams = req.queryString().split("[&]");
            final var geoserverParams = sourceConfig.get("geoserverParams").getAsJsonObject();
            return sourceConfig.get("geoserverUrl").getAsString()
                   + "?"
                   + Stream.concat(Arrays.stream(queryParams)
                                        .filter(q -> !q.split("[=]")[0].equals("imagerId")
                                                     && !geoserverParams.keySet().contains(q.split("[=]")[0])),
                                   geoserverParams.keySet().stream()
                                        .map(key -> key + "=" + geoserverParams.get(key).getAsString()))
                            .collect(Collectors.joining("&"));
        } else {
            return "";
        }
    }

    public static HttpServletResponse proxyImagery(Request req, Response res, Imagery imagery) {
        try {
            var url      = buildUrl(req, imagery);
            var request  = prepareGetRequest(url);
            var response = request.execute();
            res.type(response.getMediaType().toString());
            res.status(response.getStatusCode());
            if (res.status() == 200) {
                var rawResponse = res.raw();
                rawResponse.getOutputStream().write(response.getContent().readAllBytes());
                rawResponse.getOutputStream().flush();
                rawResponse.getOutputStream().close();
                return rawResponse;
            } else {
                res.body(response.getContent().toString());
                return res.raw();
            }
        } catch (HttpResponseException e) {
            res.body(e.getStatusMessage());
            res.status(e.getStatusCode());
            return res.raw();
        } catch (IOException e) {
            System.out.println(e.getMessage());
            throw new RuntimeException("Failed to write response to output stream.", e);
        }
    }
}
