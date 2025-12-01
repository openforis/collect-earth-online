/*****************************************************************************
 ***
 *** Mercator-OpenLayers.js
 ***
 *** Author: Gary W. Johnson
 *** Copyright: 2017-2023 Spatial Informatics Group, LLC
 *** License: LGPLv3
 ***
 *** Description: This library provides a set of functions for
 *** interacting with embedded web maps in an API agnostic manner. This
 *** file contains the OpenLayers 6 implementation.
 ***
 ******************************************************************************
 ***
 *** OpenLayers imports
 ***
 *****************************************************************************/

import "ol/ol.css";
import { Feature, Map, Overlay, View } from "ol";
import { Control, ScaleLine, Attribution, Zoom, Rotate } from "ol/control";
import { platformModifierKeyOnly } from "ol/events/condition";
import { Circle, LineString, Point, Polygon } from "ol/geom";
import { DragBox, Select, Draw, Modify, Snap } from "ol/interaction";
import { GeoJSON, KML } from "ol/format";
import { Tile as TileLayer, Vector as VectorLayer, Group as LayerGroup, Graticule } from "ol/layer";
import { BingMaps, Cluster, OSM, TileWMS, Vector as VectorSource, XYZ } from "ol/source";
import { Circle as CircleStyle, Fill, Stroke, Style, Text as StyleText } from "ol/style";
import { fromLonLat, transform, transformExtent, getPointResolution, get as getProjection } from "ol/proj";
import { fromExtent, fromCircle } from "ol/geom/Polygon";
import { getArea, getDistance } from "ol/sphere";
import { formatDateISO, isNumber } from "./generalUtils";
import { mapboxAttributionText } from "../imagery/mapbox-attribution";
import { getCenter } from 'ol/extent';
import WMTS, { optionsFromCapabilities } from "ol/source/WMTS";
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';

/** ****************************************************************************
 ***
 *** Top level namespace object
 ***
 *****************************************************************************/

const mercator = {};

/*****************************************************************************
 ***
 *** Lon/Lat Reprojection
 ***
 *** The default map projection for most web maps (e.g., OpenLayers,
 *** OpenStreetMap, Google Maps, MapQuest, and Bing Maps) is "Web
 *** Mercator" (EPSG:3857).
 ***
 *****************************************************************************/

// [Pure] Returns the passed in [longitude, latitude] values
// reprojected to Web Mercator as [x, y].
mercator.reprojectToMap = (longitude, latitude) =>
  transform([Number(longitude), Number(latitude)], "EPSG:4326", "EPSG:3857");

// [Pure] Returns the passed in [x, y] values reprojected to WGS84 as
// [longitude, latitude].
mercator.reprojectFromMap = (x, y) => transform([Number(x), Number(y)], "EPSG:3857", "EPSG:4326");

// [Pure] Returns a bounding box for the globe in Web Mercator as
// [llx, lly, urx, ury].
mercator.getFullExtent = () => {
  const [llx, lly] = mercator.reprojectToMap(-180.0, -89.999999);
  const [urx, ury] = mercator.reprojectToMap(180.0, 90.0);
  return [llx, lly, urx, ury];
};

// [Pure] Returns a bounding box for the current map view in WGS84
// lat/lon as [llx, lly, urx, ury].
mercator.getViewExtent = (mapConfig) => {
  const size = mapConfig.map.getSize();
  const extent = mapConfig.view.calculateExtent(size);
  return transformExtent(extent, "EPSG:3857", "EPSG:4326");
};

// [Pure] Returns the polygon from the current map view
mercator.getViewPolygon = (mapConfig) => fromExtent(mercator.getViewExtent(mapConfig));

// [Pure] Returns the minimum distance in meters from the view center
// to the view extent.
mercator.getViewRadius = (mapConfig) => {
  const size = mapConfig.map.getSize();
  const [llx, lly, urx, ury] = mapConfig.view.calculateExtent(size);
  const width = Math.abs(urx - llx);
  const height = Math.abs(ury - lly);
  return Math.min(width, height) / 2.0;
};

/*****************************************************************************
 ***
 *** Create map controls
 ***
 *****************************************************************************/

// Layer switcher for planet daily maps
class PlanetLayerSwitcher extends Control {
  constructor(options) {
    const { layers, target } = options;
    const element = document.createElement("div");
    super({
      element,
      target,
    });

    this.hiddenClassName = "ol-unselectable ol-control planet-layer-switcher";

    element.className = this.hiddenClassName;

    const panel = document.createElement("div");
    panel.className = "planet-layer-switcher-panel";
    element.appendChild(panel);

    const ul = document.createElement("ul");
    ul.className = "planet-layer-switcher-ul";
    panel.appendChild(ul);

    layers
      .map((layer) => this.createLayerList(layer))
      .reverse()
      .map((li) => ul.appendChild(li));
  }

  setMap = (map) => super.setMap(map);

  createLayerList = (layer) => {
    const li = document.createElement("li");
    li.className = "planet-layer-switcher-layer";

    const label = document.createElement("label");
    label.style.marginLeft = "0.5em";
    label.htmlFor = layer.get("title");
    label.innerHTML = layer.get("title");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = layer.get("title");
    input.checked = layer.getVisible();

    input.onchange = () => layer.setVisible(!layer.getVisible());

    li.appendChild(input);
    li.appendChild(label);
    return li;
  };
}

mercator.getTopVisiblePlanetLayerDate = (mapConfig, layerId) => {
  const layer = mercator.getLayerById(mapConfig, layerId);
  if (layer && layer instanceof LayerGroup) {
    const planetLayers = [...layer.getLayers().getArray()];
    const visibleLayer = planetLayers.reverse().find((planetLayer) => planetLayer.getVisible());
    // returns the string formatted date
    return visibleLayer ? visibleLayer.get("title") : "NA";
  } else {
    return "NA";
  }
};

/*****************************************************************************
 ***
 *** Create map source and layer objects
 ***
 *****************************************************************************/

// [Pure] If text is valid JSON, return the parsed value. Otherwise
// return the text unmodified.
mercator.maybeParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};

// [Side Effects] Makes an AJAX call to get the GEE mapid and token
// and then updates the temporary XYZ layer's source URL.
// TODO, wrap request in cache function
mercator.sendGEERequest = (theJson, sourceConfig, imageryId, attribution) => {
  const geeSource = new XYZ({
    url: "img/source-loading.png",
    id: imageryId,
    attributions: attribution,
  });
  fetch("/geo-dash/gateway-request", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(theJson),
  })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then((data) => {
      if (data && data.hasOwnProperty("url")) {
        geeSource.setUrl(data.url);
      } else {
        geeSource.setUrl("img/source-not-found.png");
        console.error(data.errMsg);
      }
    })
    .catch((response) => {
      console.error("Error loading " + sourceConfig.type + " imagery: ");
      console.error(response);
    });
  return geeSource;
};

mercator.newestTFOLayer = () => {
  const latestDate = new Date(new Date().setDate(1));
  const month = latestDate.getMonth().toString().padStart(2, "0");
  const dateMonth = `${latestDate.getFullYear()}-${month}`;
  return `planet_medres_normalized_analytic_${dateMonth}_mosaic`;
}

// [Pure] Returns a new ol.source.* object or null if the sourceConfig is invalid.
mercator.createSource = (
  sourceConfig,
  imageryId,
  attribution,
  isProxied,
  extent = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ],
  show = false
) => {
  const { type } = sourceConfig;
  if (isProxied) {
    // TODO it might make sense to create a function for each type that takes isProxied as a param so the types are together.
    if (["SecureWatch", "GeoServer"].includes(type)) {
      return new TileWMS({
        url: "/get-tile",
        params: { imageryId },
        attributions: attribution,
      });
    } else if (sourceConfig.type === "Planet") {
      return new XYZ({
        url:
          `/get-tile?imageryId=${imageryId}` +
          `&z={z}&x={x}&y={y}&tile={0-3}&month=${sourceConfig.month}` +
          `&year=${sourceConfig.year}`,
        attributions: attribution,
      });
    } else {
      return new XYZ({ url: "img/source-not-found.png" });
    }
  } else if (type === "Planet") {
    return new XYZ({
      url:
        "https://tiles{0-3}.planet.com/basemaps/v1/global_monthly_" +
        `${sourceConfig.year}_${sourceConfig.month}` +
        "_mosaic/gmap/{z}/{x}/{y}.png" +
        `?api_key=${sourceConfig.accessToken}`,
      attributions: attribution,
    });
  } else if (type === "PlanetTFO") {
    const dataLayer = (sourceConfig.time === "newest") ? mercator.newestTFOLayer() : sourceConfig.time;
    return new XYZ({
      url:
       "get-tfo-tiles?z={z}&x={x}&y={y}" +
        `&dataLayer=${dataLayer}` +
        `&band=${sourceConfig.band}` +
        `&imageryId=${imageryId}`,
       attributions: attribution,
      });
  } else if (type === "PlanetDaily") {
    // make ajax call to get layerid then add xyz layer
    const theJson = {
      path: "getPlanetTile",
      apiKey: sourceConfig.accessToken,
      startDate: sourceConfig.startDate,
      endDate: sourceConfig.endDate,
      layerCount: 20, // FIXME: what should this optimally be?
      geometry: extent,
    };
    // loading message, to be replaced later
    const messageSource = new XYZ({
      url: "img/source-loading.png",
      attributions: attribution,
    });
    fetch("/geo-dash/gateway-request", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(theJson),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        // arrange in ascending order of dates
        const sortedData = data
          .filter(
            (d) => d.hasOwnProperty("layerID") && d.layerID !== "null" && d.hasOwnProperty("date")
          )
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            return 0;
          });
        if (sortedData.length === 0) {
          messageSource.setUrl("img/source-not-found.png");
          alert(
            "No usable results found for Planet Daily imagery. Check your access token and/or change the date."
          );
        } else {
          const planetLayers = sortedData.map(
            (d) =>
              new TileLayer({
                source: new XYZ({
                  url: "https://tiles0.planet.com/data/v1/layers/" + d.layerID + "/{z}/{x}/{y}.png",
                  attributions: attribution,
                }),
                title: d.date,
              })
          );
          // FIXME, dont use mercator.currentMap
          mercator.currentMap.removeLayer(messageSource);
          const layerGroup = new LayerGroup({
            id: imageryId,
            visible: show,
            layers: planetLayers,
            zIndex: 0,
          });
          mercator.currentMap.addLayer(layerGroup);
          // FIXME CEO-125, move to planet control so it is only shown when planet is selected
          mercator.currentMap.addControl(
            new PlanetLayerSwitcher({ layers: layerGroup.getLayers().getArray() })
          );
        }
      })
      .catch((response) => {
        console.error("Error loading Planet Daily imagery: ", response);
      });
    return messageSource;
  } else if (type === "BingMaps") {
    return new BingMaps({
      imagerySet: sourceConfig.imageryId,
      key: sourceConfig.accessToken,
      maxZoom: 19,
      attributions: attribution,
    });
  } else if (type === "GeoServer") {
    return new TileWMS({
      url: sourceConfig.geoserverUrl,
      params: sourceConfig.geoserverParams,
      attributions: attribution,
    });
  } else if (type === "xyz") {
    return new XYZ({ url: sourceConfig.url });
  } else if (type === "Sentinel2" || type === "Sentinel1") {
    const { bandCombination } = sourceConfig;
    const getBands = (bc) => {
      if (type === "Sentinel1") {
        return bc;
      } else if (bc === "FalseColorInfrared") {
        return "B8,B4,B3";
      } else if (bc === "FalseColorUrban") {
        return "B12,B11,B4";
      } else if (bc === "Agriculture") {
        return "B11,B8,B2";
      } else if (bc === "HealthyVegetation") {
        return "B8,B11,B2";
      } else if (bc === "ShortWaveInfrared") {
        return "B12,B8A,B4";
      } else {
        return "B4,B3,B2";
      }
    };
    const bands = getBands(bandCombination);
    const endDate = new Date(sourceConfig.year, sourceConfig.month, 0);
    const theJson = {
      path: type === "Sentinel2" ? "filteredSentinel2" : "filteredSentinelSAR",
      bands,
      ...sourceConfig,
      cloudLessThan: type === "Sentinel2" ? parseInt(sourceConfig.cloudScore) : null,
      startDate:
        sourceConfig.year +
        "-" +
        (sourceConfig.month.length === 1 ? "0" : "") +
        sourceConfig.month +
        "-01",
      endDate: formatDateISO(endDate),
    };
    return mercator.sendGEERequest(theJson, sourceConfig, imageryId, attribution);
  } else if (type === "GEEImage") {
    const theJson = {
      path: "image",
      ...sourceConfig,
    };
    return mercator.sendGEERequest(theJson, sourceConfig, imageryId, attribution);
  } else if (type === "WMTS") {
    const { geoserverUrl, geoserverParams = {} } = sourceConfig;
    const { LAYERS } = geoserverParams;

    const parser = new WMTSCapabilities();
    const placeholder = new XYZ({
      url: "img/source-loading.png",
      attributions: attribution,
    });
    placeholder.set("id", imageryId);

    const setSourceOnMap = (source) => {
      const layer = mercator.currentMap
            .getLayers()
            .getArray()
            .find((l) => l.get("id") === imageryId);
      if (!layer) return;
      layer.setSource(source);
    };

    const normalizeCapsNamespace = (text) =>
          text
          .replace('xmlns="https://www.opengis.net/wmts/1.0"', 'xmlns="http://www.opengis.net/wmts/1.0"')
          .replace('xmlns:ows="https://www.opengis.net/ows/1.1"', 'xmlns:ows="http://www.opengis.net/ows/1.1"');

    fetch(`${geoserverUrl}?SERVICE=WMTS&REQUEST=GetCapabilities&VERSION=1.0.0`)
      .then((r) => r.text())
      .then((text) => {
        text = normalizeCapsNamespace(text);
        const caps = parser.read(text);
        if (!caps?.Contents?.Layer)
          throw new Error("Invalid WMTS Capabilities: missing Contents.Layer");

        const layerCaps = caps.Contents.Layer.find((l) => l.Identifier === LAYERS);
        if (!layerCaps)
          throw new Error(`Layer not found in capabilities: ${LAYERS}`);

        const isWayback = caps?.ServiceIdentification?.Title?.includes("Wayback");

        if (isWayback) {
          const layerCaps = caps.Contents.Layer.find((l) => l.Identifier === LAYERS);
          const resourceUrl =
                layerCaps.ResourceURL.find((r) => r.resourceType === "tile").template
                .replace("{TileMatrixSet}", "default028mm")
                .replace("/MapServer/tile/20512", "/MapServer/tile/10")
                .replace("{TileMatrix}", "{z}")
                .replace("{TileRow}", "{y}")
                .replace("{TileCol}", "{x}");

          const source = new XYZ({
            url: resourceUrl,
            attributions: attribution,
          });

          setSourceOnMap(source);
          return;
        }
        const matrixSet = layerCaps.TileMatrixSetLink[0].TileMatrixSet;
        const options = optionsFromCapabilities(caps, {
          layer: LAYERS,
          matrixSet,
        });

        const source = new WMTS({
          ...options,
          attributions: attribution,
        });

        setSourceOnMap(source);
      })
      .catch((err) => {
        console.error("WMTS load error:", err);
        placeholder.setUrl("img/source-not-found.png");
      });

    return placeholder;
    
  } else if (type === "GEEImageCollection") {
    const theJson = {
      path: "imageCollection",
      ...sourceConfig,
    };
    return mercator.sendGEERequest(theJson, sourceConfig, imageryId, attribution);
  } else if (type === "MapBoxRaster") {
    return new XYZ({
      url:
        "https://api.mapbox.com/v4/" +
        sourceConfig.layerName +
        "/{z}/{x}/{y}.jpg90" +
        "?access_token=" +
        sourceConfig.accessToken,
      attributions: mapboxAttributionText,
      attributionsCollapsible: false,
    });
  } else if (type === "MapBoxStatic") {
    return new XYZ({
      url:
        "https://api.mapbox.com/styles/v1/" +
        sourceConfig.userName +
        "/" +
        sourceConfig.mapStyleId +
        "/tiles/256/{z}/{x}/{y}" +
        "?access_token=" +
        sourceConfig.accessToken,
      attributions: mapboxAttributionText,
      attributionsCollapsible: false,
    });
  } else if (type === "OSM") {
    return new OSM();
  } else {
    return new XYZ({ url: "img/source-not-found.png" });
  }
};

// [Pure] Returns a new TileLayer object or null if the layerConfig is invalid.
mercator.createLayer = (layerConfig, projectAOI, show = false) => {
  const source = mercator.createSource(
    layerConfig.sourceConfig,
    layerConfig.id,
    layerConfig.attribution,
    layerConfig.isProxied,
    projectAOI,
    show
  );
  if (!source) {
    return null;
  } else if (layerConfig.extent != null) {
    return new TileLayer({
      id: layerConfig.id,
      visible: false,
      extent: layerConfig.extent,
      source,
      zIndex: 0,
    });
  } else {
    return new TileLayer({
      id: layerConfig.id,
      visible: false,
      source,
      zIndex: 0,
    });
  }
};

// [Side Effects] Adds a new vector layer to the mapConfig's map object.
mercator.addVectorLayer = (mapConfig, layerId, vectorSource, style, zIndex = 1) => {
  const vectorLayer = new VectorLayer({
    id: layerId,
    source: vectorSource || new VectorSource(),
    style,
    zIndex: zIndex,
  });
  mapConfig.map.addLayer(vectorLayer);
  return mapConfig;
};

mercator.addGridLayer = (mapConfig, showLayer) => {
  const gridIntervals = [90, 45, 30, 20, 10, 5, 2, 1, 30/60, 20/60,
                         10/60, 5/60, 2/60, 1/60, 30/3600, 20/3600,
                         10/3600, 5/3600, 2/3600, 1/3600, 0.8/3600,
                         0.5/3600, 0.3/3600, 0.2/3600, 0.1/3600];
  const grid = new Graticule({
    // the style to use for the lines, optional.
    strokeStyle: new Stroke({
      color: 'rgba(255,120,0,0.9)',
      width: 2,
      lineDash: [0.5, 4],
    }),
    id: 9999,
    showLabels: false,
    minResolution: 0.0001,
    intervals: gridIntervals,
    wrapX: false,
  });
  if(showLayer) {
    mapConfig.map.addLayer(grid);
  } else {
    const layerId = 9999;
    const layer = mercator.getLayerById(mapConfig, layerId);
    mapConfig.map.removeLayer(layer);
  }
  return mapConfig;
};

/*****************************************************************************
 ***
 *** Functions to verify map input arguments
 ***
 *****************************************************************************/

// [Pure] Predicate
mercator.verifyDivName = (divName) => document.getElementById(divName) != null;

// [Pure] Predicate
mercator.verifyCenterCoords = (centerCoords) => {
  const lon = centerCoords[0];
  const lat = centerCoords[1];
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
};

// [Pure] Predicate
mercator.verifyZoomLevel = (zoomLevel) => zoomLevel >= 0 && zoomLevel <= 20;

// [Pure] Predicate
// FIXME: Build out this function stub to check for all the relevant keys for each valid imagery type
mercator.verifySourceConfig = (sourceConfig) => sourceConfig;

// [Pure] Predicate
mercator.verifyLayerConfig = (layerConfig) => {
  if (layerConfig) {
    const layerKeys = Object.keys(layerConfig);
    return (
      layerKeys.includes("title") &&
      layerKeys.includes("extent") &&
      layerKeys.includes("sourceConfig") &&
      mercator.verifySourceConfig(layerConfig.sourceConfig)
    );
  } else {
    return false;
  }
};

// [Pure] Predicate
mercator.verifyLayerConfigs = (layerConfigs) =>
  layerConfigs.every((layerConfig) => mercator.verifyLayerConfig(layerConfig));

mercator.currentMap = null;

// [Pure] Returns the first error message generated while testing the
// input arguments or null if all tests pass.
mercator.verifyMapInputs = (divName, centerCoords, zoomLevel, layerConfigs) =>
  !mercator.verifyDivName(divName)
    ? "Invalid divName -> " + divName
    : !mercator.verifyCenterCoords(centerCoords)
    ? "Invalid centerCoords -> " + centerCoords
    : !mercator.verifyZoomLevel(zoomLevel)
    ? "Invalid zoomLevel -> " + zoomLevel
    : !mercator.verifyLayerConfigs(layerConfigs)
    ? "Invalid layerConfigs -> " + layerConfigs
    : null;

mercator.hasValidBounds = (latMin, latMax, lonMin, lonMax) =>
  isNumber(latMin) &&
  isNumber(latMax) &&
  isNumber(lonMin) &&
  isNumber(lonMax) &&
  lonMax <= 180 &&
  lonMin >= -180 &&
  latMax <= 90 &&
  latMin >= -90 &&
  lonMax > lonMin &&
  latMax > latMin;

/*****************************************************************************
 ***
 *** Create a new map instance
 ***
 *****************************************************************************/

// [Side Effects] Logs an error message to the console and returns
// null if the inputs are invalid. Otherwise, displays a map in the
// named div and returns its configuration object.
//
// Example call:
// const mapConfig = mercator.createMap("some-div-id", [102.0, 17.0], 5,
//                                    [{title: "DigitalGlobeRecentImagery",
//                                      extent: null,
//                                      sourceConfig: {type: "DigitalGlobe",
//                                                     imageryId: "digitalglobe.nal0g75k",
//                                                     accessToken: "your-digital-globe-access-token-here"}},
//                                     {title: "BingAerial",
//                                      extent: null,
//                                      sourceConfig: {type: "BingMaps",
//                                                     imageryId: "Aerial",
//                                                     accessToken: "your-bing-maps-access-token-here"}},
//                                     {title: "DigitalGlobeWMSImagery",
//                                      extent: null,
//                                      sourceConfig: {type: "GeoServer",
//                                                     geoserverUrl: "https://services.digitalglobe.com/mapservice/wmsaccess",
//                                                     geoserverParams: {VERSION: "1.1.1",
//                                                                       LAYERS: "DigitalGlobe:Imagery",
//                                                                       CONNECTID: "your-digital-globe-connect-id-here"}}}]);
mercator.createMap = (divName, centerCoords, zoomLevel, layerConfigs, projectBoundary = null) => {
  // This just verifies map inputs
  // if everything goes right, the layer are added later
  const projectAOI = projectBoundary ? JSON.parse(projectBoundary).coordinates[0] : null;
  const errorMsg = mercator.verifyMapInputs(divName, centerCoords, zoomLevel, layerConfigs);
  if (errorMsg) {
    console.error(errorMsg);
    return null;
  } else {
    // Create each of the layers that will be shown in the map from layerConfigs
    const layers = layerConfigs.map((layerConfig) => mercator.createLayer(layerConfig, projectAOI));

    // Add a scale line to the default map controls
    const controls = [
      new ScaleLine(),
      new Attribution({ collapsed: false }),
      new Rotate(),
    ];

    // Create the map view using the passed in centerCoords and zoomLevel
    const view = new View({
      projection: "EPSG:3857",
      center: fromLonLat(centerCoords),
      extent: mercator.getFullExtent(),
      zoom: zoomLevel,
    });

    // Create the new map object
    const map = new Map({
      target: divName,
      layers,
      controls,
      view,
    });

    // Add goToPlot layer
    map.addLayer(
      new TileLayer({
        id: "goToPlot",
        visible: false,
        source: new XYZ({
          url: "/img/go-to-plot.png",
        }),
        zIndex: 100,
      })
    );

    // FIXME: Remove mercator.currentMap once Billy's GEE layers are updated from geo-dash.js
    mercator.currentMap = map;
    // Return the map configuration object
    return {
      init: {
        divName,
        centerCoords,
        zoomLevel,
        layerConfigs,
      },
      controls,
      layers: map.getLayers(),
      map,
      view,
    };
  }
};

/*****************************************************************************
 ***
 *** Destroy a map instance
 ***
 *****************************************************************************/

// [Side Effects] Removes the mapConfig's map from its container div.
// Returns null.
mercator.destroyMap = (mapConfig) => {
  document.getElementById(mapConfig.init.divName).innerHTML = "";
  return null;
};

/*****************************************************************************
 ***
 *** Reset a map instance to its initial state
 ***
 *****************************************************************************/

// [Side Effects] Returns a new mapConfig object created with the
// initialization-time values of the passed-in mapConfig. Removes the
// original mapConfig's map from its container div and renders the new
// mapConfig's map into it instead.
//
// Example call:
// const newMapConfig = mercator.resetMap(mapConfig);
mercator.resetMap = (mapConfig) => {
  mercator.destroyMap(mapConfig);
  return mercator.createMap(
    mapConfig.init.divName,
    mapConfig.init.centerCoords,
    mapConfig.init.zoomLevel,
    mapConfig.init.layerConfigs
  );
};

/*****************************************************************************
 ***
 *** Functions to switch the visible basemap imagery and zoom to a layer
 ***
 *****************************************************************************/

// [Side Effects] Hides all layers in mapConfig except those with id === layerId.
mercator.setVisibleLayer = (mapConfig, layerId) => {
  mapConfig.layers.forEach((layer) => {
    if (
      layer.getVisible() === true &&
      (layer instanceof TileLayer || layer instanceof LayerGroup)
    ) {
      layer.setVisible(false);
    }
    if (layer.get("id") === layerId) {
      layer.setVisible(true);
    }
  });
  return mapConfig;
};

// [Pure] Returns the map layer with id === layerId or null if no such layer exists.
mercator.getLayerById = (mapConfig, layerId) => {
  if (!mapConfig) return null;
  const layerArray =
    mapConfig.layers?.getArray?.() ||
    mapConfig.map?.getLayers?.()?.getArray?.() ||
    [];
  return layerArray.find((layer) => layer.get("id") === layerId);
};

// [Pure] Returns the initial layerConfig for the map layer with id === layerId or null if no such layer exists.
mercator.getLayerConfigById = (mapConfig, layerConfigId) =>
  mapConfig.init.layerConfigs.find((layerConfig) => layerConfig.id === layerConfigId);

// FIXME: This function exposes several leaky abstractions. I need to rethink the createLayer->createSource workflow.
//
// [Side Effects] Finds the map layer with id === layerId and
// applies transformer to its initial sourceConfig to create a new
// source for the layer.
mercator.updateLayerSource = (mapConfig, imageryId, projectBoundary, transformer) => {
  const layer = mercator.getLayerById(mapConfig, imageryId);
  const layerConfig = mercator.getLayerConfigById(mapConfig, imageryId);
  if (layer && layerConfig) {
    const projectAOI = projectBoundary ? JSON.parse(projectBoundary).coordinates[0] : null;
    const newSourceConfig = transformer(layerConfig.sourceConfig);
    if (layer instanceof LayerGroup) {
      // This is a LayerGroup
      mapConfig.map.removeLayer(layer);
      mapConfig.map.addLayer(
        mercator.createLayer({ ...layerConfig, sourceConfig: newSourceConfig }, projectAOI, true)
      );
    } else {
      // This is a Layer
      layer.setSource(
        mercator.createSource(
          newSourceConfig,
          layerConfig.id,
          layerConfig.attribution,
          layerConfig.isProxied,
          projectAOI
        )
      );
    }
  }
};

// [Side Effects] Finds the map layer with id === layerId and
// appends newParams to its source's WMS params object.
//
// Example call:
// const mapConfig2 = mercator.updateLayerWmsParams(mapConfig,
//                                                  "DigitalGlobeWMSImagery",
//                                                  {COVERAGE_CQL_FILTER: "(acquisitionDate>='" + imageryYear + "-01-01')"
//                                                                   + "AND(acquisitionDate<='" + imageryYear + "-12-31')",
//                                                  FEATUREPROFILE: stackingProfile});
mercator.updateLayerWmsParams = (mapConfig, layerId, newParams, url = null) => {
  const layer = mercator.getLayerById(mapConfig, layerId);
  if (layer) {
    if (url) layer.getSource().urls[0] = url;
    const mergedParams = { ...layer.getSource().getParams(), ...newParams };
    layer.getSource().updateParams(mergedParams);
  }
  return mapConfig;
};

mercator.setMapZoom = (mapConfig, zoom) => {
  const view = mapConfig.map.getView();
  const _zoom = view.getZoom();
  view.animate({zoom: zoom + _zoom})
  return mapConfig;
};

// [Side Effects] Zooms the map view to contain the passed in extent.
mercator.zoomMapToExtent = (mapConfig, extent, padding) => {
  try {
    mapConfig.view.fit(extent, {
      size: mapConfig.map.getSize(),
      padding: padding
        ? Array.isArray(padding)
          ? padding
          : [padding, padding, padding, padding]
        : [16, 16, 16, 16],
    });
  } catch {
    mapConfig.view.fit(
      [-13630599.62775418, -291567.89923496445, 20060974.510472793, 10122013.145404479],
      {
        size: mapConfig.map.getSize(),
        padding: padding
          ? Array.isArray(padding)
            ? padding
            : [padding, padding, padding, padding]
          : [16, 16, 16, 16],
      }
    );
  }

  return mapConfig;
};
// [Side Effects] Zooms the map view to contain the layer with id === layerId.
mercator.zoomMapToLayer = (mapConfig, layerId, padding) => {
  const layer = mercator.getLayerById(mapConfig, layerId);
  if (layer) {
    mercator.zoomMapToExtent(mapConfig, layer.getSource().getExtent(), padding);
  }
  return mapConfig;
};

// [Side Effects] Resizes the map
mercator.resize = (mapConfig) => {
  if (mapConfig) mapConfig.map.updateSize();
  return mapConfig;
};

/*****************************************************************************
 ***
 *** Functions to create map styles
 ***
 *****************************************************************************/

// [Pure] Returns a style object that displays a circle with the
// specified radius, fillColor, borderColor, and borderWidth. text
// is used to overlay text on the circle.
mercator.getClusterStyle = (radius, fillColor, borderColor, borderWidth, text) =>
  new Style({
    image: new CircleStyle({
      radius,
      fill: fillColor ? new Fill({ color: fillColor }) : null,
      stroke: new Stroke({
        color: borderColor,
        width: borderWidth,
      }),
    }),
    text: new StyleText({
      text: (text || "").toString(),
      fill: new Fill({ color: borderColor }),
    }),
  });

// [Pure] Returns a style object that displays a solid point with
// the specified radius and fillColor.
mercator.getCircleStyle = (radius, fillColor, border) =>
  new Style({
    image: new CircleStyle({
      radius,
      fill: new Fill({ color: fillColor || "tansparent" }),
      stroke: new Stroke({
        color: border || "black",
        width: border ? 3 : 2,
      }),
    }),
  });

mercator.outlineStyle = new Style({
  fill: new Fill({
    color: 'rgba(255, 255, 255, 0)'}),
  stroke: new Stroke({
    color: 'white',
    width: 2})
});

// [Pure] Returns a style object that displays all geometry types to which it
// is applied wth the specified lineColor, lineWidth, pointColor, pointRadius, pointFillColor, fillColor.
mercator.getGeomStyle = (
  lineColor,
  lineWidth,
  pointColor,
  pointRadius,
  pointFillColor = null,
  fillColor = null
) =>
  new Style({
    fill: new Fill({
      color: fillColor || "rgba(255, 255, 255, 0)",
    }),
    stroke: new Stroke({
      color: lineColor,
      width: lineWidth,
    }),
    image: new CircleStyle({
      radius: pointRadius,
      fill: new Fill({ color: pointFillColor || "rgba(255, 255, 255, 0)" }),
      stroke: new Stroke({
        color: pointColor,
        width: lineWidth,
      }),
    }),
  });

const ceoMapPresets = {
  black: "#000000",
  blue: "#2c7fb8",
  green: "green",
  lightBlue: "#7fcdbb",
  orange: "#ffcc33",
  red: "#8b2323",
  white: "#ffffff",
  yellow: "yellow",
  transparent: "transparent"
};

const ceoMapStyleFunctions = {
  geom: (color) => mercator.getGeomStyle(color, 4, color, 6),
  answered: (color) => mercator.getGeomStyle(color, 6, color, 6, color),
  draw: (color) => mercator.getGeomStyle(color, 4, color, 6, null, "rgba(255, 255, 255, 0)"),
  overview: ({ color, border }) => mercator.getCircleStyle(6, color, border),
  cluster: (numPlots) => mercator.getClusterStyle(10, "#3399cc", "#ffffff", 1, numPlots),
};

mercator.ceoMapStyles = (type, option) => {
  const styleFunction = ceoMapStyleFunctions[type.toLowerCase()];
  if (!styleFunction) console.error("Style not found for type ", type);
  return styleFunction ? styleFunction.call(null, ceoMapPresets[option] || option) : new Style();
};

/*****************************************************************************
 ***
 *** Functions to show project boundaries and plot buffers
 ***
 *****************************************************************************/

// [Side Effects] Removes the layer with id === layerId from mapConfig's map object.
mercator.removeLayerById = (mapConfig, layerId) => {
  const layer = mercator.getLayerById(mapConfig, layerId);
  if (layer) {
    mapConfig.map.removeLayer(layer);
  }
  return mapConfig;
};

// [Side Effects] Hides/Shows the layer with id === layerId from mapConfig's map object.
mercator.setLayerVisibilityByLayerId = (mapConfig, layerId, visibility, zindex = null) => {
  const layer = mercator.getLayerById(mapConfig, layerId);
  if (layer) {
    layer.setVisible(visibility);
    if(zindex) {
      layer.setZIndex(zindex);
    }
  }
  return mapConfig;
};

mercator.getFeatureCenter = (feature) => {
  try {
    const extent = feature.getGeometry().getExtent();
    const x = extent[0] + (extent[2] - extent[0]) / 2;
    const y = extent[1] + (extent[3] - extent[1]) / 2;
    return [x, y];
  } catch {
    return [0, 0];
  }
};

// [Pure] Returns a geometry object representing the shape described
// in the passed in GeoJSON string. If reprojectToMap is true,
// reproject the created geometry from WGS84 to Web Mercator before returning.
mercator.parseGeoJson = (geoJson, reprojectToMap) => {
  if (geoJson) {
    try {
      const format = new GeoJSON();
      const geometry = format.readGeometry(geoJson);
      if (reprojectToMap) {
        return geometry.transform("EPSG:4326", "EPSG:3857");
      } else {
        return geometry;
      }
    } catch (e) {
      return new Point([0, 0]);
    }
  } else {
    return new Point([0, 0]);
  }
};

mercator.generateGeoJSON = (latMin, latMax, lonMin, lonMax) =>
  mercator.hasValidBounds(latMin, latMax, lonMin, lonMax)
    ? {
        type: "Polygon",
        coordinates: [
          [
            [lonMin, latMin],
            [lonMin, latMax],
            [lonMax, latMax],
            [lonMax, latMin],
            [lonMin, latMin],
          ],
        ],
      }
    : null;

// [Pure] Returns a new vector source containing the passed in geometry.
mercator.geometryToVectorSource = (geometry) =>
  new VectorSource({
    features: [new Feature({ geometry })],
  });

// [Pure] Returns a new vector source containing the passed in geoms.
mercator.geomArrayToVectorSource = (geoms) =>
  new VectorSource({
    features: geoms.map(
      (geom) =>
        new Feature({
          geometry: mercator.parseGeoJson(geom, true),
        })
    ),
  });

mercator.geometryToGeoJSON = (geometry, toProjection, fromProjection = null, decimals = 10) => {
  const format = new GeoJSON();
  return format.writeGeometry(geometry, {
    dataProjection: toProjection,
    featureProjection: fromProjection || toProjection,
    decimals,
  });
};


// [Pure] Returns a polygon geometry matching the passed in parameters.
mercator.getPlotPolygon = (center, size, shape) => {
  const [centerX, centerY] = mercator.parseGeoJson(center, true).getCoordinates();
  const radius = (size / 2) / (getPointResolution('EPSG:3857', 1, [centerX, centerY]));
  
  return shape === "circle"
    ? new Circle([centerX, centerY], radius)
    : fromExtent([centerX - radius, centerY - radius, centerX + radius, centerY + radius])
};

// [Pure] Returns a new vector source containing the passed in plots.
// Features are constructed from each plot using its id and center fields.
mercator.plotsToVectorSource = (plots) =>
  new VectorSource({
    features: plots.map(
      (plot) =>
        new Feature({
          plotId: plot.id,
          geometry: mercator.parseGeoJson(plot.center, true)
        })
    ),
  });

// [Side Effects] Adds vector layers to the mapConfig's map based on plot
// status and gives the flagged plots a red border.
mercator.addPlotOverviewLayers = (mapConfig, plots) => {
  const notFlagged = plots.filter((p) => !p.flagged);
  const flagged = plots.filter((p) => p.flagged);

  const layers = [
    {
      id: "analyzed",
      layerPlots: notFlagged.filter((plot) => plot.status === "analyzed"),
      color: "blue",
    },
    {
      id: "partial",
      layerPlots: notFlagged.filter((plot) => plot.status === "partial"),
      color: "lightBlue",
    },
    {
      id: "unanalyzed",
      layerPlots: notFlagged.filter((plot) => plot.status === "unanalyzed"),
      color: "yellow",
    },
    {
      id: "flaggedAnalyzed",
      layerPlots: flagged.filter((plot) => plot.status === "analyzed"),
      color: "blue",
      border: "red",
    },
    {
      id: "flaggedPartial",
      layerPlots: flagged.filter((plot) => plot.status === "partial"),
      color: "lightBlue",
      border: "red",
    },
    {
      id: "highDisagreement",
      layerPlots: notFlagged.filter((plot) => plot.status === "highDisagreement"),
      color: "red",
      border: "blue",
    },
    {
      id: "flaggedHighDisagreement",
      layerPlots: flagged.filter((plot) => plot.status === "highDisagreement"),
      color: "red",
      border: "blue",
    }

  ];

  layers.forEach(({ id, layerPlots, color, border }) =>
    mercator.addVectorLayer(
      mapConfig,
      id,
      mercator.plotsToVectorSource(layerPlots),
      mercator.ceoMapStyles("overview", { color, border })
    )
  );

  return mapConfig;
};

/*****************************************************************************
 ***
 *** Functions for interactions
 ***
 *****************************************************************************/

// [Pure] Returns the map interaction with title === interactionTitle
// or null if no such interaction exists.
mercator.getInteractionByTitle = (mapConfig, interactionTitle) =>
  mapConfig.map
    .getInteractions()
    .getArray()
    .find((interaction) => interaction.get("title") === interactionTitle);

// [Side Effects] Removes the interaction with title === interactionTitle from
// mapConfig's map object.
mercator.removeInteractionByTitle = (mapConfig, interactionTitle) => {
  const interaction = mercator.getInteractionByTitle(mapConfig, interactionTitle);
  if (interaction) {
    mapConfig.map.removeInteraction(interaction);
  }
  return mapConfig;
};

/*****************************************************************************
 ***
 *** Functions to setup select interactions for click and click-and-drag events
 ***
 *****************************************************************************/

// [Pure] Returns a new click select interaction with title =
// interactionTitle that is associated with the passed in layer.
mercator.makeClickSelect = (interactionTitle, layer) => {
  const select = new Select({ layers: [layer] });
  select.set("title", interactionTitle);
  return select;
};

// [Pure] Returns a new dragBox select interaction with title =
// interactionTitle that is associated with the passed in layer.
mercator.makeDragBoxSelect = (interactionTitle, layer, selectedFeatures) => {
  const dragBox = new DragBox({ condition: platformModifierKeyOnly });
  dragBox.set("title", interactionTitle);
  const boxstartAction = () => {
    selectedFeatures.clear();
  };
  const boxendAction = () => {
    const extent = dragBox.getGeometry().getExtent();
    const selectFeatures = (feature) => {
      selectedFeatures.push(feature);
      return false;
    };
    layer.getSource().forEachFeatureIntersectingExtent(extent, selectFeatures);
  };
  dragBox.on("boxstart", boxstartAction);
  dragBox.on("boxend", boxendAction);
  return dragBox;
};

// [Side Effects]
mercator.addAfterSelectionChange = (selectedFeatures, setSampleId) => {
  const afterSelectionChange = () => {
    setSampleId(
      selectedFeatures.getLength() === 1 ? selectedFeatures.getArray()[0].get("sampleId") : -1
    );
  };
  selectedFeatures.on(["add", "remove"], afterSelectionChange);
};

// [Side Effects] Adds a click select interaction and a dragBox select interaction
// to mapConfig's map object associated with the layer with id === layerId.
mercator.enableSelection = (mapConfig, layerId, setSampleId) => {
  const layer = mercator.getLayerById(mapConfig, layerId);
  const clickSelect = mercator.makeClickSelect("clickSelect", layer);
  const selectedFeatures = clickSelect.getFeatures();
  const dragBoxSelect = mercator.makeDragBoxSelect("dragBoxSelect", layer, selectedFeatures);
  mercator.addAfterSelectionChange(selectedFeatures, setSampleId);
  mapConfig.map.addInteraction(clickSelect);
  mapConfig.map.addInteraction(dragBoxSelect);
  return mapConfig;
};

// [Side Effects] Removes the click select and dragBox select
// interactions from mapConfig's map object.
mercator.disableSelection = (mapConfig) => {
  mercator.removeInteractionByTitle(mapConfig, "clickSelect");
  mercator.removeInteractionByTitle(mapConfig, "dragBoxSelect");
  return mapConfig;
};

/*****************************************************************************
 ***
 *** Functions to setup select interactions for drawing samples
 ***
 *****************************************************************************/

// [Pure] Returns a new Draw interaction with a type of drawTool
// for the source. A function to remove features on right click is
// added for layer.
mercator.makeDraw = (layer, source, drawTool) => {
  const removeFeature = (e) => {
    layer.getFeatures(e.pixel).then((features) => {
      if (features.length) layer.getSource().removeFeature(features[0]);
    });
  };
  const draw = new Draw({
    source,
    type: drawTool,
    condition: (e) => {
      if (e.originalEvent.buttons === 2 && e.originalEvent.ctrlKey) removeFeature(e);
      if (e.originalEvent.buttons === 2) draw.finishDrawing();
      return e.originalEvent.buttons === 1;
    },
  });
  draw.set("title", "draw");
  return draw;
};

// [Pure] Returns a new Snap interaction for source.
mercator.makeSnap = (source) => {
  const snap = new Snap({ source });
  snap.set("title", "snap");
  return snap;
};

// [Pure] Returns a new Modify interaction for source.
mercator.makeModify = (source) => {
  const modify = new Modify({
    source,
    condition: (e) => e.originalEvent.buttons === 1 && e.originalEvent.ctrlKey,
  });
  modify.set("title", "modify");
  return modify;
};

// [Side Effects] Adds a Draw, Snap, and Modify interaction
// to mapConfig's map object associated with the layer with id === layerId.
mercator.enableDrawing = (mapConfig, layerId, drawTool) => {
  const layer = mercator.getLayerById(mapConfig, layerId);
  const source = layer.getSource();
  mapConfig.map.addInteraction(mercator.makeDraw(layer, source, drawTool));
  mapConfig.map.addInteraction(mercator.makeSnap(source));
  mapConfig.map.addInteraction(mercator.makeModify(source));
  return mapConfig;
};

// [Side Effects] Removes the Draw, Snap, and Modify
// interactions from mapConfig's map object.
mercator.disableDrawing = (mapConfig) => {
  mercator.removeInteractionByTitle(mapConfig, "draw");
  mercator.removeInteractionByTitle(mapConfig, "snap");
  mercator.removeInteractionByTitle(mapConfig, "modify");
  return mapConfig;
};

// [Side Effects] Changes the draw type to drawTool.
mercator.changeDrawTool = (mapConfig, layerId, drawTool) => {
  mercator.disableDrawing(mapConfig);
  mercator.enableDrawing(mapConfig, layerId, drawTool);
  return mapConfig;
};

/*****************************************************************************
 ***
 *** Functions to show sample points inside a plot
 ***
 *****************************************************************************/

// [Pure] Returns a new vector source containing the passed in
// samples. Features are constructed from each sample using its id,
// point, and geom fields.
mercator.samplesToVectorSource = (samples) =>
  new VectorSource({
    features: samples.map(
      (sample) =>
        new Feature({
          sampleId: sample.id,
          visibleId: sample.visibleId,
          geometry: mercator.parseGeoJson(sample.sampleGeom, true),
        })
    ),
  });

// [Pure] Returns an ol.Collection containing the features selected by
// the currently enabled click select and dragBox select interactions.
mercator.getSelectedSamples = (mapConfig) => {
  const clickSelect = mercator.getInteractionByTitle(mapConfig, "clickSelect");
  return clickSelect ? clickSelect.getFeatures() : null;
};

mercator.getAllFeatures = (mapConfig, layerId) => {
  const layer = mercator.getLayerById(mapConfig, layerId);
  return layer ? layer.getSource().getFeatures() : null;
};

// [Side Effects] Sets the sample's style to be a circle with a black
// border and filled with the passed in color. If color is null, the
// circle will be filled with gray.
mercator.highlightSampleGeometry = (sample, color) => {
  sample.setStyle(mercator.ceoMapStyles("answered", color));
  return sample;
};

mercator.setFeatureStyle = (mapConfig,featureId, color) => {
  const feature = mercator.getLayerById(mapConfig, featureId);
  feature.setStyle(mercator.ceoMapStyles)
}

/*****************************************************************************
 ***
 *** Bounding Box Selector for create-project.js
 ***
 *****************************************************************************/

// [Pure] Returns a new dragBox interaction with title =
// interactionTitle that is associated with the passed in layer. When
// a new box is dragged on the map, any previous dragBox polygons are
// removed, and the current box is added to the map layer as a new
// feature. If a callBack function is provided, it will be called
// after the new box is added to the map layer.
mercator.makeDragBoxDraw = (interactionTitle, layer, callBack) => {
  const dragBox = new DragBox({
    title: interactionTitle,
    condition: platformModifierKeyOnly,
  });
  const boxendAction = () => {
    layer.getSource().clear();
    layer.getSource().addFeature(new Feature({ geometry: dragBox.getGeometry() }));
    if (callBack != null) {
      callBack.call(null, dragBox);
    }
  };
  dragBox.set("title", interactionTitle);
  dragBox.on("boxend", boxendAction);
  return dragBox;
};

// [Side Effects] Adds a dragBox interaction to mapConfig's map
// object associated with a newly created empty vector layer called
// "dragBoxLayer".
mercator.enableDragBoxDraw = (mapConfig, callBack) => {
  const drawLayer = new VectorLayer({
    id: "dragBoxLayer",
    source: new VectorSource({ features: [] }),
    style: mercator.ceoMapStyles("geom", "yellow"),
    visible: false,
  });
  const dragBox = mercator.makeDragBoxDraw("dragBoxDraw", drawLayer, callBack);
  mapConfig.map.addLayer(drawLayer);
  mapConfig.map.addInteraction(dragBox);
  return mapConfig;
};

// [Side Effects] Removes the dragBox interaction and its
// associated layer from mapConfig's map object.
mercator.disableDragBoxDraw = (mapConfig) => {
  mercator.removeInteractionByTitle(mapConfig, "dragBoxDraw");
  mercator.removeLayerById(mapConfig, "dragBoxLayer");
  return mapConfig;
};

// [Pure] Returns the extent of the rectangle drawn by the passed-in
// dragBox in lat/lon coords (EPSG:4326).
mercator.getDragBoxExtent = (dragBox) =>
  dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();

/*****************************************************************************
 ***
 *** Functions to show cluster markers on an overview map
 ***
 *****************************************************************************/

// [Side Effects] Adds a new empty overlay to mapConfig's map object
// with id set to overlayTitle.
mercator.addOverlay = (mapConfig, overlayTitle, element) => {
  const overlay = new Overlay({
    id: overlayTitle,
    element,
    autoPan: true,
  });
  mapConfig.map.addOverlay(overlay);
  return mapConfig;
};

// [Pure] Returns the map overlay with id === overlayTitle or null if
// no such overlay exists.
mercator.getOverlayByTitle = (mapConfig, overlayTitle) =>
  mapConfig.map.getOverlayById(overlayTitle);

// [Pure] Returns a new ol.source.Cluster given the unclusteredSource and clusterDistance.
mercator.makeClusterSource = (unclusteredSource, clusterDistance) =>
  new Cluster({
    source: unclusteredSource,
    distance: clusterDistance,
  });

// [Pure] Returns true if the feature is a cluster, false otherwise.
mercator.isCluster = (feature) =>
  feature && feature.get("features") && feature.get("features").length > 0;

// [Pure] Returns the minimum extent that bounds all of the
// subfeatures in the passed in clusterFeature.
mercator.getClusterExtent = (clusterFeature) => {
  const clusterPoints = clusterFeature
    .get("features")
    .map((subFeature) => subFeature.getGeometry().getCoordinates());
  return new LineString(clusterPoints).getExtent();
};

// [Pure] Construct a point from x and y and perform transformation
mercator.transformPoint = (x, y, fromEPSG, toEPSG) => new Point([x, y]).transform(fromEPSG, toEPSG);

// [Pure] Returns a new vector source containing points for each of
// the centers of the passed in projects. Features are constructed
// from each project using its id, name, description, and numPlots fields.
mercator.projectsToVectorSource = (projects) => {
  const features = projects.map((project) => {
    const [minX, minY, maxX, maxY] = mercator.parseGeoJson(project.centroid, false).getExtent();
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const geometry = mercator.transformPoint(centerX, centerY, "EPSG:4326", "EPSG:3857");
    return new Feature({
      geometry,
      projectId: project.id,
      name: project.name,
      description: project.description,
      numPlots: project.numPlots,
    });
  });
  return new VectorSource({ features });
};

// [Side Effects] Adds a new vector layer called "currentPlots" to
// mapConfig's map object that clusters the passed in plots. Clicking
// on clusters with more than one plot zooms the map view to the
// extent covered by these plots. If a cluster only contains one plot,
// the callBack function will be called on the cluster feature.
mercator.addPlotLayer = (mapConfig, plots, callback) => {
  mercator.addVectorLayer(
    mapConfig,
    "currentPlots",
    new Cluster({
      source: mercator.plotsToVectorSource(plots),
      distance: 40,
    }),
    (feature) => mercator.ceoMapStyles("cluster", feature.get("features").length),
    9999
  );
  const clickHandler = (event) => {
    try {
    mapConfig.map.forEachFeatureAtPixel(
      event.pixel,
      (feature) => {
        if (mercator.isCluster(feature)) {
          if (feature.get("features").length > 1) {
            mercator.zoomMapToExtent(mapConfig, mercator.getClusterExtent(feature));
          }
          // / Disable due to miss coordinated plot_id vs plotId
          else {
              mercator.removeLayerById(mapConfig, "currentPlots");
              mapConfig.map.un("click", clickHandler);
              callback.call(null, feature);
          }
        }
      },
      { hitTolerance: 10 }
    );
    }
    catch (error) {
      console.err(error);
    }
  };
  // TODO: It looks like the clickHandler is only removed when the user clicks
  //       a cluster of size 1. It is not removed if the user clicks "Go to first plot"
  mapConfig.map.on("click", clickHandler);

  return mapConfig;
};

/*****************************************************************************
 ***
 *** Geodash Functions
 ***
 *****************************************************************************/

mercator.calculateArea = (obj) => {
  try {
    return getArea(obj, { projection: "EPSG:4326" }) / 10000;
  } catch (e) {
    return "N/A";
  }
};

mercator.calculatePlotWidth = (latMin, lonMin, lonMax) => {
  const point1 = transform([lonMin, latMin], 'EPSG:4326', 'EPSG:3857');
  const point2 = transform([lonMax, latMin], 'EPSG:4326', 'EPSG:3857');

  return getDistance(point1, point2).toFixed(2);
};

mercator.getCentroid = (geoJson, reprojectToMap) => {
  if (!geoJson) return [0, 0];

  try {
    const format = new GeoJSON();
    const geometry = format.readGeometry(geoJson, {
      dataProjection: 'EPSG:4326',
      featureProjection: reprojectToMap ? 'EPSG:3857' : 'EPSG:4326',
    });

    const center = getCenter(geometry.getExtent());

    return reprojectToMap
      ? transform(center, 'EPSG:3857', 'EPSG:4326')
      : center;

  } catch (e) {
    console.error("Error computing centroid:", e);
    return [0, 0];
  }
};


/*****************************************************************************
 ***
 *** Functions to export plot and sample features as KML
 ***
 *****************************************************************************/

mercator.asPolygonFeature = (feature) =>
  feature.getGeometry().getType() === "Circle"
  ? new Feature({ geometry: fromCircle(feature.getGeometry())})
  : feature;

mercator.calculateGeoJsonArea = (geoJson) =>
  mercator.calculateArea(mercator.parseGeoJson(geoJson, false));

mercator.getKMLFromFeatures = (features) => 
  new KML().writeFeatures(features, { featureProjection: "EPSG:3857" });

/*****************************************************************************
 ***
 *** Export mercator
 ***
 *****************************************************************************/

export { mercator };
