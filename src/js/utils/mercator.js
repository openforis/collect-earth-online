/*****************************************************************************
***
*** Mercator-OpenLayers.js
***
*** Author: Gary W. Johnson
*** Copyright: 2017-2020 Spatial Informatics Group, LLC
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
import {Feature, Map, Overlay, View} from "ol";
import {Control, ScaleLine, Attribution, Zoom, Rotate} from "ol/control";
import {platformModifierKeyOnly} from "ol/events/condition";
import {Circle, LineString, Point} from "ol/geom";
import {DragBox, Select, Draw, Modify, Snap} from "ol/interaction";
import {GeoJSON, KML} from "ol/format";
import {Tile as TileLayer, Vector as VectorLayer, Group as LayerGroup} from "ol/layer";
import {BingMaps, Cluster, TileWMS, Vector as VectorSource, XYZ} from "ol/source";
import {Circle as CircleStyle, Fill, Stroke, Style, Text as StyleText} from "ol/style";
import {fromLonLat, transform, transformExtent} from "ol/proj";
import {fromExtent, fromCircle} from "ol/geom/Polygon";
import {formatDateISO} from "./generalUtils";
import {mapboxAttributionText} from "../imagery/mapbox-attribution";

/******************************************************************************
***
*** Toplevel namespace object
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
mercator.reprojectToMap = function (longitude, latitude) {
    return transform([Number(longitude), Number(latitude)],
                     "EPSG:4326",
                     "EPSG:3857");
};

// [Pure] Returns the passed in [x, y] values reprojected to WGS84 as
// [longitude, latitude].
mercator.reprojectFromMap = function (x, y) {
    return transform([Number(x), Number(y)],
                     "EPSG:3857",
                     "EPSG:4326");
};

// [Pure] Returns a bounding box for the globe in Web Mercator as
// [llx, lly, urx, ury].
mercator.getFullExtent = function () {
    const llxy = mercator.reprojectToMap(-180.0, -89.999999);
    const urxy = mercator.reprojectToMap(180.0, 90.0);
    return [llxy[0], llxy[1], urxy[0], urxy[1]];
};

// [Pure] Returns a bounding box for the current map view in WGS84
// lat/lon as [llx, lly, urx, ury].
mercator.getViewExtent = function (mapConfig) {
    const size = mapConfig.map.getSize();
    const extent = mapConfig.view.calculateExtent(size);
    return transformExtent(extent, "EPSG:3857", "EPSG:4326");
};

// [Pure] Returns the polygon from the current map view
mercator.getViewPolygon = function (mapConfig) {
    return fromExtent(mercator.getViewExtent(mapConfig));
};

// [Pure] Returns the minimum distance in meters from the view center
// to the view extent.
mercator.getViewRadius = function (mapConfig) {
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

        const {layers, target} = options;
        const element = document.createElement("div");
        super({
            element: element,
            target: target,
        });

        this.hiddenClassName = "ol-unselectable ol-control planet-layer-switcher";

        element.className = this.hiddenClassName;

        const panel = document.createElement("div");
        panel.className = "planet-layer-switcher-panel";
        element.appendChild(panel);

        const ul = document.createElement("ul");
        ul.className = "planet-layer-switcher-ul";
        panel.appendChild(ul);

        layers.map(layer => this.createLayerList(layer)).reverse().map(li => ul.appendChild(li));
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
        const visibleLayer = planetLayers.reverse().find(planetLayer => planetLayer.getVisible());
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
// Helper function
mercator.__sendGEERequest = function (theJson, sourceConfig, imageryId, attribution) {
    const geeLayer = new XYZ({
        url: "https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/temp/tiles/{z}/{x}/{y}",
        id: imageryId,
        attributions: attribution,
    });
    geeLayer.setProperties({id: imageryId});
    fetch("/geo-dash/gateway-request", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(theJson),
    })
        .then(res => {
            if (res.ok) {
                return res.json();
            } else {
                Promise.reject();
            }
        })
        .then(data => {
            if (data && data.hasOwnProperty("url")) {
                const geeLayer = new XYZ({
                    url: data.url,
                    attributions: attribution,
                });
                mercator.currentMap.getLayers().forEach(function (lyr) {
                    if (imageryId === lyr.getSource().get("id")) {
                        lyr.setSource(geeLayer);
                    }
                });
            } else {
                console.warn("Wrong Data Returned");
            }
        }).catch(response => {
            console.log("Error loading " + sourceConfig.type + " imagery: ");
            console.log(response);
        });
    return geeLayer;
};

// [Pure] Returns a new ol.source.* object or null if the sourceConfig is invalid.
mercator.createSource = function (sourceConfig, imageryId, attribution,
                                  extent = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
                                  show = false) {
    if (sourceConfig.type === "Planet") {
        return new XYZ({
            url: `/get-tile?imageryId=${imageryId}` +
                 `&z={z}&x={x}&y={y}&tile={0-3}&month=${sourceConfig.month}` +
                 `&year=${sourceConfig.year}`,
            attributions: attribution,
        });
    } else if (sourceConfig.type === "PlanetDaily") {
        // make ajax call to get layerid then add xyz layer
        const theJson = {
            path: "getPlanetTile",
            apiKey: sourceConfig.accessToken,
            dateFrom: sourceConfig.startDate,
            dateTo: sourceConfig.endDate,
            layerCount: 20, // FIXME: what should this optimally be?
            geometry: extent,
        };
        const planetLayer = new XYZ({
            // some random tiles to be replaced later
            url: "https://tiles0.planet.com/data/v1/layers/DkTnYnMW_G7i-E6Nj6lb9s7PaG8PG-Hy23Iyug/{z}/{x}/{y}.png",
            attributions: attribution,
        });
        planetLayer.setProperties({id: imageryId});
        console.log("Calling out to /geo-dash/gateway-request with this JSON:\n\n" + JSON.stringify(theJson));
        fetch("/geo-dash/gateway-request", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(theJson),
        })
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else {
                    return Promise.reject();
                }
            })
            .then(data => {
                console.log("Here's the response data:\n\n" + JSON.stringify(data));
                // arrange in ascending order of dates
                const sortedData = data
                    .filter(d => d.hasOwnProperty("layerID") && d["layerID"] !== "null" && d.hasOwnProperty("date"))
                    .sort((a, b) => {
                        const dateA = new Date(a.date),
                            dateB = new Date(b.date);
                        if (dateA < dateB) return -1;
                        if (dateA > dateB) return 1;
                        return 0;
                    });
                if (sortedData.length === 0) alert("No usable results found for Planet Daily imagery. Check your access token and/or change the date.");
                const planetLayers = sortedData.map(d => new TileLayer({
                    source: new XYZ({
                        url: "https://tiles0.planet.com/data/v1/layers/" + d["layerID"] + "/{z}/{x}/{y}.png",
                        attributions: attribution,
                    }),
                    title: d["date"],
                }));
                const dummyPlanetLayer = mercator.currentMap.getLayers().getArray()
                    .find(lyr => imageryId === lyr.getSource().get("id"));
                mercator.currentMap.removeLayer(dummyPlanetLayer);
                const layerGroup = new LayerGroup({
                    id: imageryId,
                    visible: show,
                    layers: planetLayers,
                    zIndex: 0,
                });
                mercator.currentMap.addLayer(layerGroup);
                const layerGroupArrays = layerGroup.getLayers().getArray();
                if (layerGroupArrays.length > 0) {
                    mercator.currentMap.addControl(
                        new PlanetLayerSwitcher({layers: layerGroupArrays})
                    );
                }
            }).catch(response => {
                console.log("Error loading Planet Daily imagery: ");
                console.log(response);
                alert("Error loading Planet Daily imagery. Check console for details.");
            });
        return planetLayer;
    } else if (sourceConfig.type === "BingMaps") {
        return new BingMaps({
            imagerySet: sourceConfig.imageryId,
            key: sourceConfig.accessToken,
            maxZoom: 19,
            attributions: attribution,
        });
    } else if (sourceConfig.type === "GeoServer") {
        return new TileWMS({
            url: "/get-tile",
            params: {imageryId: imageryId},
            attributions: attribution,
        });
    } else if (sourceConfig.type === "SecureWatch") {
        return new TileWMS({
            serverType: "geoserver",
            url: "/get-tile",
            params: {imageryId: imageryId},
            attributions: attribution,
        });
    } else if (sourceConfig.type === "Sentinel2" || sourceConfig.type === "Sentinel1") {
        const bandCombination = sourceConfig.bandCombination;
        const bands = sourceConfig.type === "Sentinel1" ? bandCombination
            : bandCombination === "FalseColorInfrared" ? "B8,B4,B3"
                : bandCombination === "FalseColorUrban" ? "B12,B11,B4"
                    : bandCombination === "Agriculture" ? "B11,B8,B2"
                        : bandCombination === "HealthyVegetation" ? "B8,B11,B2"
                            : bandCombination === "ShortWaveInfrared" ? "B12,B8A,B4"
                                : "B4,B3,B2";

        const endDate = new Date(sourceConfig.year, sourceConfig.month, 0);
        const theJson = {
            path: sourceConfig.type === "Sentinel2" ? "FilteredSentinel" : "FilteredSentinelSAR",
            bands: bands,
            min: sourceConfig.min,
            max: sourceConfig.max,
            cloudLessThan: sourceConfig.type === "Sentinel2" ? parseInt(sourceConfig.cloudScore) : null,
            dateFrom: sourceConfig.year + "-" + (sourceConfig.month.length === 1 ? "0" : "") + sourceConfig.month + "-01",
            dateTo : formatDateISO(endDate),
        };
        return mercator.__sendGEERequest(theJson, sourceConfig, imageryId, attribution);
    } else if (sourceConfig.type === "GEEImage") {
        const theJson = {
            path: "image",
            imageName: sourceConfig.imageId,
            visParams: JSON.parse(sourceConfig.imageVisParams),
        };
        return mercator.__sendGEERequest(theJson, sourceConfig, imageryId, attribution);
    } else if (sourceConfig.type === "GEEImageCollection") {
        const theJson = {
            path: "meanImageByMosaicCollection",
            collectionName: sourceConfig.collectionId,
            visParams: JSON.parse(sourceConfig.collectionVisParams),
            dateFrom: sourceConfig.startDate,
            dateTo: sourceConfig.endDate,
        };
        return mercator.__sendGEERequest(theJson, sourceConfig, imageryId, attribution);
    } else if (sourceConfig.type === "GeeGateway") {
        // get variables and make ajax call to get mapid and token
        // then add xyz layer
        // const fts = {'LANDSAT5': 'Landsat5Filtered', 'LANDSAT7': 'Landsat7Filtered', 'LANDSAT8':'Landsat8Filtered',
        //              'Sentinel2': 'FilteredSentinel'};
        // const url = "http://collect.earth:8888/" + fts[sourceConfig.geeParams.filterType];
        const url = (sourceConfig.path) ? "thegateway" : sourceConfig.geeUrl;
        const cloudVar = sourceConfig.geeParams.visParams.cloudLessThan ? parseInt(sourceConfig.geeParams.visParams.cloudLessThan) : "";
        let visParams;
        try {
            visParams = JSON.parse(sourceConfig.geeParams.visParams);
        } catch (e) {
            visParams = sourceConfig.geeParams.visParams;
        }
        const theJson = {
            dateFrom: sourceConfig.geeParams.startDate,
            dateTo: sourceConfig.geeParams.endDate,
            bands: sourceConfig.geeParams.visParams.bands,
            min: sourceConfig.geeParams.visParams.min,
            max: sourceConfig.geeParams.visParams.max,
            cloudLessThan: cloudVar,
            visParams: visParams,
            path: sourceConfig.geeParams.path,
        };
        if (sourceConfig.geeParams.ImageAsset) {
            theJson.imageName = sourceConfig.geeParams.ImageAsset;
        } else if (sourceConfig.geeParams.ImageCollectionAsset) {
            theJson.imageName = sourceConfig.geeParams.ImageCollectionAsset;
        }
        const theID = Math.random().toString(36).substr(2, 16) + "_" + Math.random().toString(36).substr(2, 9);
        const geeLayer = new XYZ({
            url: "https://earthengine.googleapis.com/map/temp/{z}/{x}/{y}?token=",
            id: theID,
            attributions: attribution,
        });
        geeLayer.setProperties({id: theID});
        if (sourceConfig.create) {
            fetch(url, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    mapConfig: sourceConfig,
                    LayerId: theID,
                },
                body: JSON.stringify(theJson),
            })
                .then(res => {
                    if (res.ok) {
                        return res.json();
                    } else {
                        Promise.reject();
                    }
                })
                .then(data => {
                    if (data.hasOwnProperty("mapid")) {
                        const geeLayer = new XYZ({
                            url: "https://earthengine.googleapis.com/map/" + data.mapid + "/{z}/{x}/{y}?token=" + data.token,
                            attributions: attribution,
                        });
                        mercator.currentMap.getLayers().forEach(function (lyr) {
                            if (theID && theID === lyr.getSource().get("id")) {
                                lyr.setSource(geeLayer);
                            }
                        });
                    } else {
                        console.warn("Wrong Data Returned");
                    }
                }).catch(response => {
                    console.log("Error loading EE imagery: ");
                    console.log(response);
                });
        }
        return geeLayer;
    } else if (sourceConfig.type === "MapBoxRaster") {
        return new XYZ({
            url: "https://api.mapbox.com/v4/"
                 + sourceConfig.layerName
                 + "/{z}/{x}/{y}.jpg90"
                 + "?access_token=" + sourceConfig.accessToken,
            attributions: mapboxAttributionText,
            attributionsCollapsible: false,
        });
    } else if (sourceConfig.type === "MapBoxStatic") {
        return new XYZ({
            url: "https://api.mapbox.com/styles/v1/"
                 + sourceConfig.userName + "/"
                 + sourceConfig.mapStyleId
                 + "/tiles/256/{z}/{x}/{y}"
                 + "?access_token=" + sourceConfig.accessToken,
            attributions:  mapboxAttributionText,
            attributionsCollapsible: false,
        });
    } else {
        return new XYZ({url: "img/source-not-found.png"});
    }
};

// [Pure] Returns a new TileLayer object or null if the layerConfig is invalid.
mercator.createLayer = function (layerConfig, projectAOI, show = false) {
    layerConfig.sourceConfig.create = true;
    const source = mercator.createSource(
        layerConfig.sourceConfig,
        layerConfig.id,
        layerConfig.attribution,
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
            source: source,
            zIndex: 0,
        });
    } else {
        return new TileLayer({
            id: layerConfig.id,
            visible: false,
            source: source,
            zIndex: 0,
        });
    }
};

// [Side Effects] Adds a new vector layer to the mapConfig's map object.
mercator.addVectorLayer = function (mapConfig, layerId, vectorSource, style) {
    const vectorLayer = new VectorLayer({
        id: layerId,
        source: vectorSource || new VectorSource(),
        style: style,
        zIndex: 1,
    });
    mapConfig.map.addLayer(vectorLayer);
    return mapConfig;
};

/*****************************************************************************
***
*** Functions to verify map input arguments
***
*****************************************************************************/

// [Pure] Predicate
mercator.verifyDivName = function (divName) {
    return document.getElementById(divName) != null;
};

// [Pure] Predicate
mercator.verifyCenterCoords = function (centerCoords) {
    const lon = centerCoords[0];
    const lat = centerCoords[1];
    return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
};

// [Pure] Predicate
mercator.verifyZoomLevel = function (zoomLevel) {
    return zoomLevel >= 0 && zoomLevel <= 20;
};

// [Pure] Predicate
// FIXME: Build out this function stub to check for all the relevant keys for each valid imagery type
mercator.verifySourceConfig = function (sourceConfig) {
    return sourceConfig;
};

// [Pure] Predicate
mercator.verifyLayerConfig = function (layerConfig) {
    if (layerConfig) {
        const layerKeys = Object.keys(layerConfig);
        return layerKeys.includes("title")
            && layerKeys.includes("extent")
            && layerKeys.includes("sourceConfig")
            && mercator.verifySourceConfig(layerConfig.sourceConfig);
    } else {
        return false;
    }
};

// [Pure] Predicate
mercator.verifyLayerConfigs = function (layerConfigs) {
    return layerConfigs.every(layerConfig => mercator.verifyLayerConfig(layerConfig));
};

mercator.currentMap = null;

// [Pure] Returns the first error message generated while testing the
// input arguments or null if all tests pass.
mercator.verifyMapInputs = function (divName, centerCoords, zoomLevel, layerConfigs) {
    if (!mercator.verifyDivName(divName)) {
        return "Invalid divName -> " + divName;
    } else if (!mercator.verifyCenterCoords(centerCoords)) {
        return "Invalid centerCoords -> " + centerCoords;
    } else if (!mercator.verifyZoomLevel(zoomLevel)) {
        return "Invalid zoomLevel -> " + zoomLevel;
    } else if (!mercator.verifyLayerConfigs(layerConfigs)) {
        return "Invalid layerConfigs -> " + layerConfigs;
    } else {
        return null;
    }
};

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
mercator.createMap = function (divName, centerCoords, zoomLevel, layerConfigs, projectBoundary = null) {
    // This just verifies map inputs
    // if everything goes right, the layer are added later
    const projectAOI = projectBoundary ? JSON.parse(projectBoundary).coordinates[0] : null;
    const errorMsg = mercator.verifyMapInputs(divName, centerCoords, zoomLevel, layerConfigs);
    if (errorMsg) {
        console.error(errorMsg);
        return null;
    } else {
        // Create each of the layers that will be shown in the map from layerConfigs
        // Don't create PlanetDaily layer while loading collection page
        const layers = layerConfigs.filter(layerConfig => layerConfig.sourceConfig.type !== "PlanetDaily")
            .map(layerConfig => mercator.createLayer(layerConfig, projectAOI));

        // Add a scale line to the default map controls
        const controls = [new ScaleLine(), new Attribution({collapsed: false}), new Zoom(), new Rotate()];

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
            layers: layers,
            controls: controls,
            view: view,
        });
        mercator.currentMap = map;
        // Return the map configuration object
        return {
            init: {
                divName: divName,
                centerCoords: centerCoords,
                zoomLevel: zoomLevel,
                layerConfigs: layerConfigs,
            },
            controls: controls,
            layers: map.getLayers(),
            map: map,
            view: view,
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
mercator.destroyMap = function (mapConfig) {
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
mercator.resetMap = function (mapConfig) {
    mercator.destroyMap(mapConfig);
    return mercator.createMap(mapConfig.init.divName,
                              mapConfig.init.centerCoords,
                              mapConfig.init.zoomLevel,
                              mapConfig.init.layerConfigs);
};

/*****************************************************************************
***
*** Functions to switch the visible basemap imagery and zoom to a layer
***
*****************************************************************************/

// [Side Effects] Hides all layers in mapConfig except those with id === layerId.
mercator.setVisibleLayer = function (mapConfig, layerId) {
    mapConfig.layers.forEach(
        function (layer) {
            if (layer.getVisible() === true && (layer instanceof TileLayer || layer instanceof LayerGroup)) {
                layer.setVisible(false);
            }
            if (layer.get("id") === layerId) {
                layer.setVisible(true);
            }
        }
    );
    return mapConfig;
};

// [Pure] Returns the map layer with id === layerId or null if no such layer exists.
mercator.getLayerById = function (mapConfig, layerId) {
    return mapConfig.layers.getArray().find(
        function (layer) {
            return layer.get("id") === layerId;
        }
    );
};

// [Pure] Returns the initial layerConfig for the map layer with id === layerId or null if no such layer exists.
mercator.getLayerConfigById = function (mapConfig, layerConfigId) {
    return mapConfig.init.layerConfigs.find(
        function (layerConfig) {
            return layerConfig.id === layerConfigId;
        }
    );
};

// FIXME: This function exposes several leaky abstractions. I need to rethink the createLayer->createSource workflow.
//
// [Side Effects] Finds the map layer with id === layerId and
// applies transformer to its initial sourceConfig to create a new
// source for the layer.
mercator.updateLayerSource = function (mapConfig, imageryId, projectBoundary, transformer, caller) {
    const layer = mercator.getLayerById(mapConfig, imageryId);
    const layerConfig = mercator.getLayerConfigById(mapConfig, imageryId);
    const projectAOI = projectBoundary ? JSON.parse(projectBoundary).coordinates[0] : null;
    const newSourceConfig = transformer.call(caller, layerConfig.sourceConfig);
    if (layer && layerConfig) {
        if (layer instanceof LayerGroup) {
            // This is a LayerGroup
            console.log("LayerGroup detected.");
            mapConfig.map.removeLayer(layer);
            mapConfig.map.addLayer(mercator.createLayer({...layerConfig, sourceConfig: newSourceConfig},
                                                        projectAOI,
                                                        true));
        } else {
            // This is a Layer
            console.log("Layer detected.");
            layer.setSource(mercator.createSource(newSourceConfig,
                                                  layerConfig.id,
                                                  layerConfig.attribution,
                                                  projectAOI));
        }
    } else if (layerConfig.sourceConfig.type === "PlanetDaily") {
        // since PlanetDaily layer is not created when collection page is loaded
        mapConfig.map.addLayer(mercator.createLayer({...layerConfig, sourceConfig: newSourceConfig},
                                                    projectAOI,
                                                    true));
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
mercator.updateLayerWmsParams = function (mapConfig, layerId, newParams, url = null) {
    const layer = mercator.getLayerById(mapConfig, layerId);
    if (layer) {
        if (url) layer.getSource().urls[0] = url;
        const mergedParams = Object.assign({}, layer.getSource().getParams(), newParams);
        layer.getSource().updateParams(mergedParams);
    }
    return mapConfig;
};

// [Side Effects] Zooms the map view to contain the passed in extent.
mercator.zoomMapToExtent = function (mapConfig, extent, padding) {
    if (extent) {
        if (extent[0] <= -13630599.62775418
                && extent[1] <= -291567.89923496445
                && extent[2] >= 20060974.510472793
                && extent[3] >= 10122013.145404479) {
            extent = [-13630599.62775418, -291567.89923496445, 20060974.510472793, 10122013.145404479];
        }
    }
    mapConfig.view.fit(extent,
                       {
                           size: mapConfig.map.getSize(),
                           padding: padding ? [padding, padding, padding, padding] : [16, 16, 16, 16],
                       });
    return mapConfig;
};

// [Side Effects] Zooms the map view to contain the layer with id === layerId.
mercator.zoomMapToLayer = function (mapConfig, layerId, padding) {
    const layer = mercator.getLayerById(mapConfig, layerId);
    if (layer) {
        mercator.zoomMapToExtent(mapConfig, layer.getSource().getExtent(), padding);
    }
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
mercator.getClusterStyle = function (radius, fillColor, borderColor, borderWidth, text) {
    return new Style({
        image: new CircleStyle({
            radius: radius,
            fill: fillColor ? new Fill({color: fillColor}) : null,
            stroke: new Stroke({
                color: borderColor,
                width: borderWidth,
            }),
        }),
        text: new StyleText({
            text: (text || "").toString(),
            fill: new Fill({color: borderColor}),
        }),
    });
};

// [Pure] Returns a style object that displays a solid point with
// the specified radius and fillColor.
mercator.getCircleStyle = function (radius, fillColor) {
    return new Style({
        image: new CircleStyle({
            radius: radius,
            fill: new Fill({color: fillColor || "rgba(255, 255, 255, 0)"}),
            stroke: new Stroke({
                color: "black",
                width: 1,
            }),
        }),
    });
};

// [Pure] Returns a style object that displays all geometry types to which it
// is applied wth the specified lineColor, lineWidth, pointColor, pointRadius, pointFillColor, fillColor.
mercator.getGeomStyle = function (lineColor, lineWidth, pointColor, pointRadius, pointFillColor = null, fillColor = null) {
    return new Style({
        fill: new Fill({
            color: fillColor || "rgba(255, 255, 255, 0)",
        }),
        stroke: new Stroke({
            color: lineColor,
            width: lineWidth,
        }),
        image: new CircleStyle({
            radius: pointRadius,
            fill: new Fill({color: pointFillColor || "rgba(255, 255, 255, 0)"}),
            stroke: new Stroke({
                color: pointColor,
                width: lineWidth,
            }),
        }),
    });
};

const ceoMapPresets = {
    black: "#000000",
    blue: "#23238b",
    green: "green",
    orange: "#ffcc33",
    red: "#8b2323",
    white: "#ffffff",
    yellow: "yellow",
};

const ceoMapStyleFunctions = {
    geom: color => mercator.getGeomStyle(color, 4, color, 6),
    answered: color => mercator.getGeomStyle(color, 6, color, 6, color),
    draw: color => mercator.getGeomStyle(color, 4, color, 6, null, "rgba(255, 255, 255, 0.2)"),
    overview: color => mercator.getCircleStyle(5, color),
    cluster: numPlots => mercator.getClusterStyle(10, "#3399cc", "#ffffff", 1, numPlots),
};

mercator.ceoMapStyles = function (type, option) {
    const styleFunction = ceoMapStyleFunctions[type.toLowerCase()];
    if (!styleFunction) console.log(type);
    return styleFunction
        ? styleFunction.call(null, ceoMapPresets[option] || option)
        : new Style();
};

/*****************************************************************************
***
*** Functions to show project boundaries and plot buffers
***
*****************************************************************************/

// [Side Effects] Removes the layer with id === layerId from mapConfig's map object.
mercator.removeLayerById = function (mapConfig, layerId) {
    const layer = mercator.getLayerById(mapConfig, layerId);
    if (layer) {
        mapConfig.map.removeLayer(layer);
    }
    return mapConfig;
};

// [Side Effects] Hides/Shows the layer with id === layerId from mapConfig's map object.
mercator.setLayerVisibilityByLayerId = function (mapConfig, layerId, visibility) {
    const layer = mercator.getLayerById(mapConfig, layerId);
    if (layer) {
        layer.setVisible(visibility);
    }
    return mapConfig;
};

// [Pure] Returns a geometry object representing the shape described
// in the passed in GeoJSON string. If reprojectToMap is true,
// reproject the created geometry from WGS84 to Web Mercator before returning.
mercator.parseGeoJson = function (geoJson, reprojectToMap) {
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

// [Pure] Returns a new vector source containing the passed in geometry.
mercator.geometryToVectorSource = function (geometry) {
    return new VectorSource({
        features: [
            new Feature({geometry: geometry}),
        ],
    });
};

mercator.geometryToGeoJSON = function (geometry, toProjection, fromProjection = null, decimals = 10) {
    const format = new GeoJSON;
    return format.writeGeometry(
        geometry,
        {
            dataProjection: toProjection,
            featureProjection: fromProjection || toProjection,
            decimals: decimals,
        });
};

// [Pure] Returns a polygon geometry matching the passed in parameters.
mercator.getPlotPolygon = function (center, size, shape) {
    const coords = mercator.parseGeoJson(center, true).getCoordinates();
    const centerX = coords[0];
    const centerY = coords[1];
    const radius = size / 2;
    return shape === "circle"
        ? new Circle([centerX, centerY], radius)
        : fromExtent([centerX - radius, centerY - radius, centerX + radius, centerY + radius]);
};

// [Pure] Returns a new vector source containing the passed in plots.
// Features are constructed from each plot using its id and center fields.
mercator.plotsToVectorSource = function (plots) {
    const features = plots.map(
        function (plot) {
            const geometry = mercator.parseGeoJson(plot.center, true);
            return new Feature({plotId: plot.id, geometry: geometry});
        }
    );
    return new VectorSource({features: features});
};

// [Side Effects] Adds three vector layers to the mapConfig's map object:
// "flaggedPlots" in red, "analyzedPlots" in green, and "unanalyzedPlots" in yellow.
mercator.addPlotOverviewLayers = function (mapConfig, plots) {
    mercator.addVectorLayer(mapConfig,
                            "flaggedPlots",
                            mercator.plotsToVectorSource(plots.filter(function (plot) {
                                return plot.flagged === true;
                            })),
                            mercator.ceoMapStyles("overview", "red"));
    mercator.addVectorLayer(mapConfig,
                            "analyzedPlots",
                            mercator.plotsToVectorSource(plots.filter(function (plot) {
                                return plot.analyses > 0 && plot.flagged === false;
                            })),
                            mercator.ceoMapStyles("overview", "green"));
    mercator.addVectorLayer(mapConfig,
                            "unanalyzedPlots",
                            mercator.plotsToVectorSource(plots.filter(function (plot) {
                                return plot.analyses === 0 && plot.flagged === false;
                            })),
                            mercator.ceoMapStyles("overview", "yellow"));
    return mapConfig;
};

/*****************************************************************************
***
*** Functions for interactions
***
*****************************************************************************/

// [Pure] Returns the map interaction with title === interactionTitle
// or null if no such interaction exists.
mercator.getInteractionByTitle = function (mapConfig, interactionTitle) {
    return mapConfig.map.getInteractions().getArray().find(
        function (interaction) {
            return interaction.get("title") === interactionTitle;
        }
    );
};

// [Side Effects] Removes the interaction with title === interactionTitle from
// mapConfig's map object.
mercator.removeInteractionByTitle = function (mapConfig, interactionTitle) {
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
mercator.makeClickSelect = function (interactionTitle, layer) {
    const select = new Select({layers: [layer]});
    select.set("title", interactionTitle);
    return select;
};

// [Pure] Returns a new dragBox select interaction with title =
// interactionTitle that is associated with the passed in layer.
mercator.makeDragBoxSelect = function (interactionTitle, layer, selectedFeatures) {
    const dragBox = new DragBox({condition: platformModifierKeyOnly});
    dragBox.set("title", interactionTitle);
    const boxstartAction = function () {
        selectedFeatures.clear();
    };

    const boxendAction = function () {
        const extent = dragBox.getGeometry().getExtent();
        const selectFeatures = function (feature) {
            selectedFeatures.push(feature);
            return false;
        };
        layer.getSource().forEachFeatureIntersectingExtent(extent, selectFeatures);
    };
    dragBox.on("boxstart", boxstartAction);
    dragBox.on("boxend", boxendAction);
    return dragBox;
};

mercator.addAfterSelectionChange = function (selectedFeatures, setSampleId) {
    const afterSelectionChange = function () {
        setSampleId(selectedFeatures.getLength() === 1 ? selectedFeatures.getArray()[0].get("sampleId") : -1);
    };
    selectedFeatures.on(["add", "remove"], afterSelectionChange);
};

// [Side Effects] Adds a click select interaction and a dragBox select interaction
// to mapConfig's map object associated with the layer with id === layerId.
mercator.enableSelection = function (mapConfig, layerId, setSampleId) {
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
mercator.disableSelection = function (mapConfig) {
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
mercator.makeDraw = function (layer, source, drawTool) {
    const removeFeature = function (e) {
        layer.getFeatures(e.pixel)
            .then((features) => {
                if (features.length) layer.getSource().removeFeature(features[0]);
            });
    };
    const draw = new Draw({
        source: source,
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
mercator.makeSnap = function (source) {
    const snap = new Snap({source: source});
    snap.set("title", "snap");
    return snap;
};

// [Pure] Returns a new Modify interaction for source.
mercator.makeModify = function (source) {
    const modify = new Modify({
        source: source,
        condition: (e) => e.originalEvent.buttons === 1 && e.originalEvent.ctrlKey,
    });
    modify.set("title", "modify");
    return modify;
};

// [Side Effects] Adds a Draw, Snap, and Modify interaction
// to mapConfig's map object associated with the layer with id === layerId.
mercator.enableDrawing = function (mapConfig, layerId, drawTool) {
    const layer = mercator.getLayerById(mapConfig, layerId);
    const source = layer.getSource();
    mapConfig.map.addInteraction(mercator.makeDraw(layer, source, drawTool));
    mapConfig.map.addInteraction(mercator.makeSnap(source));
    mapConfig.map.addInteraction(mercator.makeModify(source));
    return mapConfig;
};

// [Side Effects] Removes the Draw, Snap, and Modify
// interactions from mapConfig's map object.
mercator.disableDrawing = function (mapConfig) {
    mercator.removeInteractionByTitle(mapConfig, "draw");
    mercator.removeInteractionByTitle(mapConfig, "snap");
    mercator.removeInteractionByTitle(mapConfig, "modify");
    return mapConfig;
};

// [Side Effects] Changes the draw type to drawTool.
mercator.changeDrawTool = function (mapConfig, layerId, drawTool) {
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
mercator.samplesToVectorSource = function (samples) {
    const features = samples.map(
        function (sample) {
            return new Feature({
                sampleId: sample.id,
                geometry: mercator.parseGeoJson(sample.geom || sample.sampleGeom, true),
            });
        }
    );
    return new VectorSource({features: features});
};

// [Pure] Returns an ol.Collection containing the features selected by
// the currently enabled click select and dragBox select interactions.
mercator.getSelectedSamples = function (mapConfig) {
    const clickSelect = mercator.getInteractionByTitle(mapConfig, "clickSelect");
    if (clickSelect) {
        return clickSelect.getFeatures();
    } else {
        return null;
    }
};

mercator.getAllFeatures = function (mapConfig, layerId) {
    const layer = mercator.getLayerById(mapConfig, layerId);
    if (layer) {
        return layer.getSource().getFeatures();
    } else {
        return null;
    }
};

// [Side Effects] Sets the sample's style to be a circle with a black
// border and filled with the passed in color. If color is null, the
// circle will be filled with gray.
mercator.highlightSampleGeometry = function (sample, color) {
    sample.setStyle(mercator.ceoMapStyles("answered", color));
    return sample;
};

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
mercator.makeDragBoxDraw = function (interactionTitle, layer, callBack) {
    const dragBox = new DragBox({
        title: interactionTitle,
        condition: platformModifierKeyOnly,
    });
    const boxendAction = function () {
        layer.getSource().clear();
        layer.getSource().addFeature(new Feature({geometry: dragBox.getGeometry()}));
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
mercator.enableDragBoxDraw = function (mapConfig, callBack) {
    const drawLayer = new VectorLayer({
        id: "dragBoxLayer",
        source: new VectorSource({features: []}),
        style: mercator.ceoMapStyles("geom", "yellow"),
    });
    const dragBox = mercator.makeDragBoxDraw("dragBoxDraw", drawLayer, callBack);
    mapConfig.map.addLayer(drawLayer);
    mapConfig.map.addInteraction(dragBox);
    return mapConfig;
};

// [Side Effects] Removes the dragBox interaction and its
// associated layer from mapConfig's map object.
mercator.disableDragBoxDraw = function (mapConfig) {
    mercator.removeInteractionByTitle(mapConfig, "dragBoxDraw");
    mercator.removeLayerById(mapConfig, "dragBoxLayer");
    return mapConfig;
};

// [Pure] Returns the extent of the rectangle drawn by the passed-in
// dragBox in lat/lon coords (EPSG:4326).
mercator.getDragBoxExtent = function (dragBox) {
    return dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
};

/*****************************************************************************
***
*** Functions to show cluster markers on an overview map
***
*****************************************************************************/

// [Side Effects] Adds a new empty overlay to mapConfig's map object
// with id set to overlayTitle.
mercator.addOverlay = function (mapConfig, overlayTitle, element) {
    const overlay = new Overlay({
        id: overlayTitle,
        element: element,
    });//?element:document.createElement("div")});
    mapConfig.map.addOverlay(overlay);
    return mapConfig;
};

// [Pure] Returns the map overlay with id === overlayTitle or null if
// no such overlay exists.
mercator.getOverlayByTitle = function (mapConfig, overlayTitle) {
    return mapConfig.map.getOverlayById(overlayTitle);
};

// [Pure] Returns a new ol.source.Cluster given the unclusteredSource and clusterDistance.
mercator.makeClusterSource = function (unclusteredSource, clusterDistance) {
    return new Cluster({
        source: unclusteredSource,
        distance: clusterDistance,
    });
};

// [Pure] Returns true if the feature is a cluster, false otherwise.
mercator.isCluster = function (feature) {
    return feature && feature.get("features") && feature.get("features").length > 0;
};

// [Pure] Returns the minimum extent that bounds all of the
// subfeatures in the passed in clusterFeature.
mercator.getClusterExtent = function (clusterFeature) {
    const clusterPoints = clusterFeature.get("features").map(
        function (subFeature) {
            return subFeature.getGeometry().getCoordinates();
        }
    );
    return (new LineString(clusterPoints)).getExtent();
};

// [Pure] Construct a point from x and y and perform transformation
mercator.transformPoint = function (x, y, fromEPSG, toEPSG) {
    return new Point([x, y]).transform(fromEPSG, toEPSG);
};

// [Pure] Returns a new vector source containing points for each of
// the centers of the passed in projects. Features are constructed
// from each project using its id, name, description, and numPlots fields.
mercator.projectsToVectorSource = function (projects) {
    const features = projects.map(
        function (project) {
            const bounds = mercator.parseGeoJson(project.boundary, false).getExtent();
            const minX = bounds[0];
            const minY = bounds[1];
            const maxX = bounds[2];
            const maxY = bounds[3];
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const geometry = mercator.transformPoint(centerX, centerY, "EPSG:4326", "EPSG:3857");
            return new Feature({
                geometry:    geometry,
                projectId:   project.id,
                name:        project.name,
                description: project.description,
                numPlots:    project.numPlots,
            });
        }
    );
    return new VectorSource({features: features});
};

// [Side Effects] Adds a new vector layer called "currentPlots" to
// mapConfig's map object that clusters the passed in plots. Clicking
// on clusters with more than one plot zooms the map view to the
// extent covered by these plots. If a cluster only contains one plot,
// the callBack function will be called on the cluster feature.
mercator.addPlotLayer = function (mapConfig, plots, callBack) {
    const plotSource = mercator.plotsToVectorSource(plots);
    const clusterSource = new Cluster({
        source:   plotSource,
        distance: 40,
    });

    mercator.addVectorLayer(mapConfig,
                            "currentPlots",
                            clusterSource,
                            function (feature) {
                                return mercator.ceoMapStyles("cluster", feature.get("features").length);
                            });

    const clickHandler = function (event) {
        mapConfig.map.forEachFeatureAtPixel(event.pixel,
                                            function (feature) {
                                                if (mercator.isCluster(feature)) {
                                                    if (feature.get("features").length > 1) {
                                                        mercator.zoomMapToExtent(mapConfig,
                                                                                 mercator.getClusterExtent(feature));
                                                    } else {
                                                        mercator.removeLayerById(mapConfig, "currentPlots");
                                                        mapConfig.map.un("click", clickHandler);
                                                        callBack.call(null, feature);
                                                    }
                                                }
                                            }, {hitTolerance:10});
    };
    // TODO: It looks like the clickHandler is only removed when the user clicks
    //       a cluster of size 1. It is not removed if the user clicks "Go to first plot"
    mapConfig.map.on("click", clickHandler);

    return mapConfig;
};

/*****************************************************************************
***
*** Functions to export plot and sample features as KML
***
*****************************************************************************/

mercator.asPolygonFeature = function (feature) {
    return feature.getGeometry().getType() === "Circle"
        ? new Feature({geometry: fromCircle(feature.getGeometry())})
        : feature;
};

mercator.getKMLFromFeatures = function (features) {
    return (new KML()).writeFeatures(features, {featureProjection: "EPSG:3857"});
};

export {
    mercator,
};
