/*****************************************************************************
***
*** Mercator-OpenLayers.js
***
*** Author: Gary W. Johnson
*** Copyright: 2017-2018 Spatial Informatics Group, LLC
*** License: LGPLv3
***
*** Description: This library provides a set of functions for
*** interacting with embedded web maps in an API agnostic manner. This
*** file contains the OpenLayers 3 implementation.
***
******************************************************************************
***
*** Toplevel namespace object
***
*****************************************************************************/

var mercator = {};

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
    return ol.proj.transform([Number(longitude), Number(latitude)],
                             "EPSG:4326",
                             "EPSG:3857");
};

// [Pure] Returns the passed in [x, y] values reprojected to WGS84 as
// [longitude, latitude].
mercator.reprojectFromMap = function (x, y) {
    return ol.proj.transform([Number(x), Number(y)],
                             "EPSG:3857",
                             "EPSG:4326");
};

// [Pure] Returns a bounding box for the globe in Web Mercator as
// [llx, lly, urx, ury].
mercator.getFullExtent = function () {
    var llxy = mercator.reprojectToMap(-180.0, -89.999999);
    var urxy = mercator.reprojectToMap(180.0, 90.0);
    return [llxy[0], llxy[1], urxy[0], urxy[1]];
};

// [Pure] Returns a bounding box for the current map view in Web
// Mercator as [llx, lly, urx, ury].
mercator.getViewExtent = function (mapConfig) {
    var size = mapConfig.map.getSize();
    var extent = mapConfig.view.calculateExtent(size);
    return ol.proj.transformExtent(extent, "EPSG:3857", "EPSG:4326");
};

/*****************************************************************************
***
*** Create map source and layer objects from JSON descriptions
***
*****************************************************************************/

// [Pure] Returns a new ol.source.* object or null if the sourceConfig
// is invalid.
mercator.createSource = function (sourceConfig) {
    if (sourceConfig.type == "DigitalGlobe") {
        return new ol.source.XYZ({url: "http://api.tiles.mapbox.com/v4/" + sourceConfig.imageryId
                                  + "/{z}/{x}/{y}.png?access_token=" + sourceConfig.accessToken,
                                  attribution: "© DigitalGlobe, Inc"});
    } else if (sourceConfig.type == "Planet") {
        return new ol.source.XYZ({url: "https://tiles{0-3}.planet.com/basemaps/v1/planet-tiles/global_monthly_"
                                  + sourceConfig.year + "_" + sourceConfig.month + "_mosaic/gmap/{z}/{x}/{y}.png?api_key="
                                  + sourceConfig.accessToken,
                                  attribution: "© Planet Labs, Inc"});
    } else if (sourceConfig.type == "BingMaps") {
        return new ol.source.BingMaps({imagerySet: sourceConfig.imageryId,
                                       key: sourceConfig.accessToken,
                                       maxZoom: 19});
    } else if (sourceConfig.type == "GeoServer") {
        return new ol.source.TileWMS({serverType: "geoserver",
                                      url: sourceConfig.geoserverUrl,
                                      params: sourceConfig.geoserverParams});
    } else {
        return null;
    }
};

// [Pure] Returns a new ol.layer.Tile object or null if the
// layerConfig is invalid.
mercator.createLayer = function (layerConfig) {
    var source = mercator.createSource(layerConfig.sourceConfig);
    if (source == null) {
        return null;
    } else if (layerConfig.extent != null) {
        return new ol.layer.Tile({title: layerConfig.title,
                                  visible: false,
                                  extent: layerConfig.extent,
                                  source: source});
    } else {
        return new ol.layer.Tile({title: layerConfig.title,
                                  visible: false,
                                  source: source});
    }
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
    var lon = centerCoords[0];
    var lat = centerCoords[1];
    return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
};

// [Pure] Predicate
mercator.verifyZoomLevel = function (zoomLevel) {
    return zoomLevel >= 0 && zoomLevel <= 20;
};

// [Pure] Predicate
mercator.verifyLayerConfig = function (layerConfig) {
    var layerKeys = Object.keys(layerConfig);
    return layerKeys.includes("title")
        && layerKeys.includes("extent")
        && layerKeys.includes("sourceConfig")
        && mercator.createSource(layerConfig.sourceConfig) != null;
};

// [Pure] Predicate
mercator.verifyLayerConfigs = function (layerConfigs) {
    return layerConfigs.every(mercator.verifyLayerConfig);
};

// [Pure] Returns the first error message generated while testing the
// input arguments or null if all tests pass.
mercator.verifyMapInputs = function (divName, centerCoords, zoomLevel, layerConfigs) {
    if (! mercator.verifyDivName(divName)) {
        return "Invalid divName -> " + divName;
    } else if (! mercator.verifyCenterCoords(centerCoords)) {
        return "Invalid centerCoords -> " + centerCoords;
    } else if (! mercator.verifyZoomLevel(zoomLevel)) {
        return "Invalid zoomLevel -> " + zoomLevel;
    } else if (! mercator.verifyLayerConfigs(layerConfigs)) {
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
// var mapConfig = mercator.createMap("some-div-id", [102.0, 17.0], 5,
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
mercator.createMap = function (divName, centerCoords, zoomLevel, layerConfigs) {
    var errorMsg = mercator.verifyMapInputs(divName, centerCoords, zoomLevel, layerConfigs);
    if (errorMsg) {
        console.error(errorMsg);
        return null;
    } else {
        // Create each of the layers that will be shown in the map from layerConfigs
        var layers = layerConfigs.map(mercator.createLayer);

        // Add a scale line to the default map controls
        var controls = ol.control.defaults().extend([new ol.control.ScaleLine()]);

        // Create the map view using the passed in centerCoords and zoomLevel
        var view = new ol.View({projection: "EPSG:3857",
                                center: ol.proj.fromLonLat(centerCoords),
                                extent: mercator.getFullExtent(),
                                zoom: zoomLevel});

        // Create the new map object
        var map = new ol.Map({target: divName,
                              layers: layers,
                              controls: controls,
                              view: view});

        // Return the map configuration object
        return {init: {divName: divName,
                       centerCoords: centerCoords,
                       zoomLevel: zoomLevel,
                       layerConfigs: layerConfigs},
                layers: map.getLayers(),
                controls: controls,
                view: view,
                map: map};
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
// var newMapConfig = mercator.resetMap(mapConfig);
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

// [Side Effects] Hides all raster layers in mapConfig except those
// with title == layerTitle.
mercator.setVisibleLayer = function (mapConfig, layerTitle) {
    mapConfig.layers.forEach(
        function (layer) {
            if (layer.getVisible() == true && layer instanceof ol.layer.Tile) {
                layer.setVisible(false);
            }
            if (layer.get("title") == layerTitle) {
                layer.setVisible(true);
            }
        }
    );
    return mapConfig;
};

// [Pure] Returns the map layer with title == layerTitle or null if no
// such layer exists.
mercator.getLayerByTitle = function (mapConfig, layerTitle) {
    return mapConfig.layers.getArray().find(
        function (layer) {
            return layer.get("title") == layerTitle;
        }
    );
};

// [Pure] Returns the initial layerConfig for the map layer with title
// == layerTitle or null if no such layer exists.
mercator.getLayerConfigByTitle = function (mapConfig, layerTitle) {
    return mapConfig.init.layerConfigs.find(
        function (layerConfig) {
            return layerConfig.title == layerTitle;
        }
    );
};

// [Side Effects] Finds the map layer with title == layerTitle and
// applies transformer to its initial sourceConfig to create a new
// source for the layer.
mercator.updateLayerSource = function (mapConfig, layerTitle, transformer, caller) {
    var layer = mercator.getLayerByTitle(mapConfig, layerTitle);
    var layerConfig = mercator.getLayerConfigByTitle(mapConfig, layerTitle);
    if (layer && layerConfig) {
        layer.setSource(mercator.createSource(transformer.call(caller, layerConfig.sourceConfig)));
    }
};

// [Side Effects] Finds the map layer with title == layerTitle and
// appends newParams to its source's WMS params object.
//
// Example call:
// var mapConfig2 = mercator.updateLayerWmsParams(mapConfig,
//                                                "DigitalGlobeWMSImagery",
//                                                {COVERAGE_CQL_FILTER: "(acquisition_date>='" + imageryYear + "-01-01')"
//                                                                 + "AND(acquisition_date<='" + imageryYear + "-12-31')",
//                                                 FEATUREPROFILE: stackingProfile});
mercator.updateLayerWmsParams = function (mapConfig, layerTitle, newParams) {
    var layer = mercator.getLayerByTitle(mapConfig, layerTitle);
    if (layer) {
        var mergedParams = Object.assign({}, layer.getSource().getParams(), newParams);
        layer.getSource().updateParams(mergedParams);
    }
    return mapConfig;
};

// [Side Effects] Zooms the map view to contain the passed in extent.
mercator.zoomMapToExtent = function (mapConfig, extent, maxZoom) {
    mapConfig.view.fit(extent,
                       mapConfig.map.getSize(),
                       {maxZoom: maxZoom || 19});
    return mapConfig;
};

// [Side Effects] Zooms the map view to contain the layer with
// title == layerTitle.
mercator.zoomMapToLayer = function (mapConfig, layerTitle, maxZoom) {
    var layer = mercator.getLayerByTitle(mapConfig, layerTitle);
    if (layer) {
        mercator.zoomMapToExtent(mapConfig, layer.getSource().getExtent(), maxZoom);
    }
    return mapConfig;
};

/*****************************************************************************
***
*** Functions to create map styles
***
*****************************************************************************/

// [Pure] Returns a style object that displays the image at imageSrc.
mercator.getIconStyle = function (imageSrc) {
    return new ol.style.Style({image: new ol.style.Icon({src: imageSrc})});
};

// [Pure] Returns a style object that displays a circle with the
// specified radius, fillColor, borderColor, and borderWidth. If text
// and textFillColor are also passed, they will be used to overlay
// text on the circle.
mercator.getCircleStyle = function (radius, fillColor, borderColor, borderWidth, text, textFillColor) {
    if (text == null || textFillColor == null) {
        return new ol.style.Style({image: new ol.style.Circle({radius: radius,
                                                               fill: fillColor ? new ol.style.Fill({color: fillColor}) : null,
                                                               stroke: new ol.style.Stroke({color: borderColor,
                                                                                            width: borderWidth})})});
    } else {
        return new ol.style.Style({image: new ol.style.Circle({radius: radius,
                                                               fill: fillColor ? new ol.style.Fill({color: fillColor}) : null,
                                                               stroke: new ol.style.Stroke({color: borderColor,
                                                                                            width: borderWidth})}),
                                   text: new ol.style.Text({text: text.toString(),
                                                            fill: new ol.style.Fill({color: textFillColor})})});
    }
};

// [Pure] Returns a style object that displays a shape with the
// specified number of points, radius, rotation, fillColor,
// borderColor, and borderWidth. A triangle has 3 points. A square has
// 4 points with rotation pi/4. A star has 5 points.
mercator.getRegularShapeStyle = function (radius, points, rotation, fillColor, borderColor, borderWidth) {
    return new ol.style.Style({image: new ol.style.RegularShape({radius: radius,
                                                                 points: points,
                                                                 rotation: rotation || 0,
                                                                 fill: fillColor ? new ol.style.Fill({color: fillColor}) : null,
                                                                 stroke: new ol.style.Stroke({color: borderColor,
                                                                                              width: borderWidth})})});
};

// [Pure] Returns a style object that displays any shape to which it
// is applied wth the specified fillColor, borderColor, and
// borderWidth.
mercator.getPolygonStyle = function (fillColor, borderColor, borderWidth) {
    return new ol.style.Style({fill: fillColor ? new ol.style.Fill({color: fillColor}) : null,
                               stroke: new ol.style.Stroke({color: borderColor,
                                                            width: borderWidth})});
};

var ceoMapStyles = {icon:         mercator.getIconStyle("favicon.ico"),
                    ceoIcon:      mercator.getIconStyle("ceoicon.png"),
                    redPoint:     mercator.getCircleStyle(5, null, "#8b2323", 2),
                    bluePoint:    mercator.getCircleStyle(5, null, "#23238b", 2),
                    redCircle:    mercator.getCircleStyle(5, null, "red", 2),
                    yellowCircle: mercator.getCircleStyle(5, null, "yellow", 2),
                    greenCircle:  mercator.getCircleStyle(5, null, "green", 2),
                    redSquare:    mercator.getRegularShapeStyle(5, 4, Math.PI/4, null, "red", 2),
                    yellowSquare: mercator.getRegularShapeStyle(5, 4, Math.PI/4, null, "yellow", 2),
                    greenSquare:  mercator.getRegularShapeStyle(5, 4, Math.PI/4, null, "green", 2),
                    cluster:      mercator.getCircleStyle(5, "#8b2323", "#ffffff", 1),
                    polygon:      mercator.getPolygonStyle(null, "#8b2323", 3)};

/*****************************************************************************
***
*** Functions to draw project boundaries and plot buffers
***
*****************************************************************************/

// [Side Effects] Adds a new vector layer to the mapConfig's map object.
mercator.addVectorLayer = function (mapConfig, layerTitle, vectorSource, style) {
    var vectorLayer = new ol.layer.Vector({title: layerTitle,
                                           source: vectorSource,
                                           style: style});
    mapConfig.map.addLayer(vectorLayer);
    return mapConfig;
};

// [Side Effects] Removes the layer with title == layerTitle from
// mapConfig's map object.
mercator.removeLayerByTitle = function (mapConfig, layerTitle) {
    var layer = mercator.getLayerByTitle(mapConfig, layerTitle);
    if (layer) {
        mapConfig.map.removeLayer(layer);
    }
    return mapConfig;
};

// [Pure] Returns a geometry object representing the shape described
// in the passed in GeoJSON string. If reprojectToMap is true,
// reproject the created geometry from WGS84 to Web Mercator before
// returning.
mercator.parseGeoJson = function (geoJson, reprojectToMap) {
    var format = new ol.format.GeoJSON();
    var geometry = format.readGeometry(geoJson);
    if (reprojectToMap) {
        return geometry.transform("EPSG:4326", "EPSG:3857");
    } else {
        return geometry;
    }
};

// [Pure] Returns a new vector source containing the passed in geometry.
mercator.geometryToVectorSource = function (geometry) {
    return new ol.source.Vector({features: [
        new ol.Feature({geometry: geometry})
    ]});
};

// [Pure] Returns a polygon geometry matching the passed in
// parameters.
mercator.getPlotPolygon = function (center, size, shape) {
    var coords = mercator.parseGeoJson(center, true).getCoordinates();
    var centerX = coords[0];
    var centerY = coords[1];
    var radius = size / 2;
    if (shape == "circle") {
        return new ol.geom.Circle([centerX, centerY], radius);
    } else {
        return ol.geom.Polygon.fromExtent([centerX - radius,
                                           centerY - radius,
                                           centerX + radius,
                                           centerY + radius]);
    }
};

// [Pure] Returns a bounding box for the plot in Web Mercator as [llx,
// lly, urx, ury].
mercator.getPlotExtent = function (center, size, shape) {
    var geometry = mercator.getPlotPolygon(center, size, shape);
    return ol.proj.transformExtent(geometry.getExtent(), "EPSG:3857", "EPSG:4326");
};

// [Pure] Returns a new vector source containing the passed in plots.
// Features are constructed from each plot using its id and center
// fields.
mercator.plotsToVectorSource = function (plots) {
    var features = plots.map(
        function (plot) {
            var geometry = mercator.parseGeoJson(plot.center, true);
            return new ol.Feature({plotId: plot.id, geometry: geometry});
        }
    );
    return new ol.source.Vector({features: features});
};

// [Side Effects] Adds three vector layers to the mapConfig's map
// object: "flaggedPlots" in red, "analyzedPlots" in green, and
// "unanalyzedPlots" in yellow.
mercator.addPlotOverviewLayers = function (mapConfig, plots, shape) {
    mercator.addVectorLayer(mapConfig,
                            "flaggedPlots",
                            mercator.plotsToVectorSource(plots.filter(function (plot) { return plot.flagged == true; })),
                            shape == "circle" ? ceoMapStyles.redCircle : ceoMapStyles.redSquare);
    mercator.addVectorLayer(mapConfig,
                            "analyzedPlots",
                            mercator.plotsToVectorSource(plots.filter(function (plot) { return plot.analyses > 0 && plot.flagged == false; })),
                            shape == "circle" ? ceoMapStyles.greenCircle : ceoMapStyles.greenSquare);
    mercator.addVectorLayer(mapConfig,
                            "unanalyzedPlots",
                            mercator.plotsToVectorSource(plots.filter(function (plot) { return plot.analyses == 0 && plot.flagged == false; })),
                            shape == "circle" ? ceoMapStyles.yellowCircle : ceoMapStyles.yellowSquare);
    return mapConfig;
};

/*****************************************************************************
***
*** Functions to setup select interactions for click and click-and-drag events
***
*****************************************************************************/

// [Pure] Returns the map interaction with title == interactionTitle
// or null if no such interaction exists.
mercator.getInteractionByTitle = function (mapConfig, interactionTitle) {
    return mapConfig.map.getInteractions().getArray().find(
        function (interaction) {
            return interaction.get("title") == interactionTitle;
        }
    );
};

// [Side Effects] Removes the interaction with title == interactionTitle from
// mapConfig's map object.
mercator.removeInteractionByTitle = function (mapConfig, interactionTitle) {
    var interaction = mercator.getInteractionByTitle(mapConfig, interactionTitle);
    if (interaction) {
        mapConfig.map.removeInteraction(interaction);
    }
    return mapConfig;
};

// [Pure] Returns a new click select interaction with title =
// interactionTitle that is associated with the passed in layer. When
// a feature is selected, its style is stored in featureStyles and
// then cleared on the map. When a feature is deselected, its saved
// style is restored on the map.
mercator.makeClickSelect = function (interactionTitle, layer, featureStyles) {
    var select = new ol.interaction.Select({layers: [layer]});
    select.set("title", interactionTitle);
    var action = function (event) {
        event.selected.forEach(function (feature) {
            featureStyles[feature] = feature.getStyle();
            feature.setStyle(null);
        });
        event.deselected.forEach(function (feature) {
            var savedStyle = featureStyles[feature];
            if (savedStyle != null) {
                feature.setStyle(savedStyle);
            }
        });
    };
    select.on("select", action);
    return select;
};

// [Pure] Returns a new dragBox select interaction with title =
// interactionTitle that is associated with the passed in layer. When
// a feature is selected, its style is stored in featureStyles and
// then cleared on the map. When a feature is deselected, its saved
// style is restored on the map.
mercator.makeDragBoxSelect = function (interactionTitle, layer, featureStyles, selectedFeatures) {
    var dragBox = new ol.interaction.DragBox({condition: ol.events.condition.platformModifierKeyOnly});
    dragBox.set("title", interactionTitle);
    var boxstartAction = function () {
        selectedFeatures.clear();
    };
    var boxendAction = function () {
        var extent = dragBox.getGeometry().getExtent();
        var saveStyle = function (feature) {
            selectedFeatures.push(feature);
            featureStyles[feature] = feature.getStyle();
            feature.setStyle(null);
            return false;
        };
        layer.getSource().forEachFeatureIntersectingExtent(extent, saveStyle);
    };
    dragBox.on("boxstart", boxstartAction);
    dragBox.on("boxend", boxendAction);
    return dragBox;
};

// [Side Effects] Adds a click select interaction and a dragBox select
// interaction to mapConfig's map object associated with the layer
// with title == layerTitle.
mercator.enableSelection = function (mapConfig, layerTitle) {
    var layer = mercator.getLayerByTitle(mapConfig, layerTitle);
    var featureStyles = {}; // holds saved styles for features selected by either interaction
    var clickSelect = mercator.makeClickSelect("clickSelect", layer, featureStyles);
    var selectedFeatures = clickSelect.getFeatures();
    var dragBoxSelect = mercator.makeDragBoxSelect("dragBoxSelect", layer, featureStyles, selectedFeatures);
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
*** Functions to draw sample points inside a plot
***
*****************************************************************************/

// [Side Effects] Adds a new vector layer called
// point:<longitude>:<latitude> to mapConfig's map object containing a
// single point geometry feature at the passed in coordinates.
mercator.addPointLayer = function (mapConfig, longitude, latitude) {
    mercator.addVectorLayer(mapConfig,
                            "point:" + longitude + ":" + latitude,
                            mercator.geometryToVectorSource(new ol.geom.Point(mercator.reprojectToMap(longitude, latitude))),
                            ceoMapStyles.redPoint);
    return mapConfig;
};

// [Pure] Returns a new vector source containing the passed in
// samples. Features are constructed from each sample using its id and
// point fields.
mercator.samplesToVectorSource = function (samples) {
    var features = samples.map(
        function (sample) {
            return new ol.Feature({sampleId: sample.id,
                                   geometry: mercator.parseGeoJson(sample.point, true)});
        }
    );
    return new ol.source.Vector({features: features});
};

// [Pure] Returns an ol.Collection containing the features selected by
// the currently enabled click select and dragBox select interactions.
mercator.getSelectedSamples = function (mapConfig) {
    var clickSelect = mercator.getInteractionByTitle(mapConfig, "clickSelect");
    if (clickSelect) {
        return clickSelect.getFeatures();
    } else {
        return null;
    }
};

// [Side Effects] Sets the sample's style to be a circle with a black
// border and filled with the passed in color. If color is null, the
// circle will be filled with gray.
mercator.highlightSamplePoint = function (sample, color) {
    sample.setStyle(mercator.getCircleStyle(5, color || "#999999", "#000000", 2));
    return sample;
};

/*****************************************************************************
***
*** Bounding Box Selector for Admin Page
***
*****************************************************************************/

// [Pure] Returns a new dragBox draw interaction with title =
// interactionTitle that is associated with the passed in layer. When
// a new box is dragged on the map, any previous dragBox polygons are
// removed, and the current box is added to the map layer as a new
// feature. If a callBack function is provided, it will be called
// after the new box is added to the map layer.
mercator.makeDragBoxDraw = function (interactionTitle, layer, callBack) {
    var dragBox = new ol.interaction.DragBox({title: interactionTitle,
                                              condition: ol.events.condition.platformModifierKeyOnly});
    var boxendAction = function () {
        layer.getSource().clear();
        layer.getSource().addFeature(new ol.Feature({geometry: dragBox.getGeometry()}));
        if (callBack != null) {
            callBack.call(null, dragBox);
        }
    };
    dragBox.on("boxend", boxendAction);
    return dragBox;
};

// [Side Effects] Adds a dragBox draw interaction to mapConfig's map
// object associated with a newly created empty vector layer called
// "dragBoxLayer".
mercator.enableDragBoxDraw = function (mapConfig, callBack) {
    var drawLayer = new ol.layer.Vector({title: "dragBoxLayer",
                                         source: new ol.source.Vector({features: []}),
                                         style: ceoMapStyles.polygon});
    var dragBox = mercator.makeDragBoxDraw("dragBoxDraw", drawLayer, callBack);
    mapConfig.map.addLayer(drawLayer);
    mapConfig.map.addInteraction(dragBox);
    return mapConfig;
};

// [Side Effects] Removes the dragBox draw interaction and its
// associated layer from mapConfig's map object.
mercator.disableDragBoxDraw = function (mapConfig) {
    mercator.removeInteractionByTitle(mapConfig, "dragBoxDraw");
    mercator.removeLayerByTitle(mapConfig, "dragBoxLayer");
    return mapConfig;
};

// [Pure] Returns the extent of the rectangle drawn by the passed-in
// dragBox in lat/lon coords (EPSG:4326).
mercator.getDragBoxExtent = function (dragBox) {
    return dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
};

/*****************************************************************************
***
*** Functions to draw project markers on an overview map
***
*****************************************************************************/

// [Side Effects] Adds a new empty overlay to mapConfig's map object
// with id set to overlayTitle.
mercator.addOverlay = function (mapConfig, overlayTitle) {
    var overlay = new ol.Overlay({id: overlayTitle,
                                  element: document.createElement("div")});
    mapConfig.map.addOverlay(overlay);
    return mapConfig;
};

// [Pure] Returns the map overlay with id == overlayTitle or null if
// no such overlay exists.
mercator.getOverlayByTitle = function (mapConfig, overlayTitle) {
    return mapConfig.map.getOverlayById(overlayTitle);
};

// [Pure] Returns true if the feature is a cluster, false otherwise.
mercator.isCluster = function (feature) {
    return feature && feature.get("features") && feature.get("features").length > 0;
};

// [Pure] Returns a string of HTML representing several table rows
// that describe the passed in project.
mercator.makeRows = function (documentRoot, project) {
    var rowStart = "<tr class=\"d-flex\">";
    var rowEnd = "</tr>";
    var leftColStart = "<td class=\"small col-6 px-0 my-auto\">";
    var rightColStart = "<td class=\"small col-6 pr-0\">";
    var colEnd = "</td>";
    var linkStart = "<a href=\"" + documentRoot + "/collection/" + project.get("projectId") + "\" "
                  + "class=\"btn btn-sm btn-block btn-outline-lightgreen\" "
                  + "style=\"white-space:nowrap; overflow:hidden; text-overflow:ellipsis\">";
    var linkEnd = "</a>";
    return rowStart
        + leftColStart + "<h3 class=\"my-auto\">Name</h3>" + colEnd
        + rightColStart + linkStart + project.get("name") + linkEnd + colEnd
        + rowEnd
        + rowStart
        + leftColStart + "Description" + colEnd
        + rightColStart + (project.get("description") == "" ? "N/A" : project.get("description")) + colEnd
        + rowEnd
        + rowStart
        + leftColStart + "Number of plots" + colEnd
        + rightColStart + project.get("numPlots") + colEnd
        + rowEnd;
};

// [Pure] Returns the minimum extent that bounds all of the
// subfeatures in the passed in clusterFeature.
mercator.getClusterExtent = function (clusterFeature) {
    var clusterPoints = clusterFeature.get("features").map(
        function (subFeature) {
            return subFeature.getGeometry().getCoordinates();
        }
    );
    return (new ol.geom.LineString(clusterPoints)).getExtent();
};

// [Pure] Returns a string of HTML to display in a popup box on the map.
mercator.getPopupContent = function (documentRoot, feature) {
    var title = "<div class=\"cTitle\"><h1>"
              + (mercator.isCluster(feature) ? "Cluster info" : "Project info")
              + "</h1></div>";
    var contentStart = "<div class=\"cContent\">";
    var tableStart = "<table class=\"table table-sm\"><tbody>";
    var tableRows = mercator.isCluster(feature)
        ? feature.get("features").map(mercator.makeRows.bind(null, documentRoot)).join("\n")
        : mercator.makeRows(documentRoot, feature);
    var tableEnd = "</tbody></table>";
    var contentEnd = "</div>";

    if (mercator.isCluster(feature) && feature.get("features").length > 1) {
        var zoomLink = "<button onclick=\"mercator.zoomMapToExtent(angular.element('#home').scope().home.mapConfig, ["
            + mercator.getClusterExtent(feature) + "])\" "
            + "class=\"mt-0 mb-3 btn btn-sm btn-block btn-outline-yellow\" style=\"cursor:pointer; min-width:350px;\">"
            + "<i class=\"fa fa-search-plus\"></i> Zoom to cluster</button>";
        return title + contentStart + tableStart + tableRows + tableEnd + zoomLink + contentEnd;
    } else {
        return title + contentStart + tableStart + tableRows + tableEnd + contentEnd;
    }
};

// [Side Effects] Updates the overlay element's innerHTML with fields
// containing the feature's name, description, and numPlots fields as
// well as a link to its data collection page and then displays the
// overlay on the map at the feature's coordinates.
mercator.showProjectPopup = function (overlay, documentRoot, feature) {
    overlay.getElement().innerHTML = mercator.getPopupContent(documentRoot, feature);
    overlay.setPosition(mercator.isCluster(feature)
                        ? feature.get("features")[0].getGeometry().getCoordinates()
                        : feature.getGeometry().getCoordinates());
};

// [Pure] Returns a new vector source containing points for each of
// the centers of the passed in projects. Features are constructed
// from each project using its id, name, description, and numPlots
// fields.
mercator.projectsToVectorSource = function (projects) {
    var features = projects.map(
        function (project) {
            var bounds = mercator.parseGeoJson(project.boundary, false).getExtent();
            var minX = bounds[0];
            var minY = bounds[1];
            var maxX = bounds[2];
            var maxY = bounds[3];
            var centerX = (minX + maxX) / 2;
            var centerY = (minY + maxY) / 2;
            var geometry = new ol.geom.Point([centerX, centerY]).transform("EPSG:4326", "EPSG:3857");
            return new ol.Feature({geometry:    geometry,
                                   projectId:   project.id,
                                   name:        project.name,
                                   description: project.description,
                                   numPlots:    project.numPlots});
        }
    );
    return new ol.source.Vector({features: features});
};

// [Side Effects] Adds a new vector layer called "projectMarkers" to
// mapConfig's map object containing icons at each of the project's
// AOI centers. Also adds a dynamic overlay popup to the map which
// shows a brief project description whenever a project icon is
// clicked. If clusterDistance is not null, the new vector source will
// cluster the projects. Finally, zooms the map view to the new
// layer's extent.
mercator.addProjectMarkersAndZoom = function (mapConfig, projects, documentRoot, clusterDistance) {
    var projectSource = mercator.projectsToVectorSource(projects);

    if (clusterDistance == null) {
        mercator.addVectorLayer(mapConfig,
                                "projectMarkers",
                                projectSource,
                                ceoMapStyles.ceoIcon);
    } else {
        var clusterSource = new ol.source.Cluster({source:   projectSource,
                                                   distance: clusterDistance});
        mercator.addVectorLayer(mapConfig,
                                "projectMarkers",
                                clusterSource,
                                function (feature) {
                                    var numProjects = feature.get("features").length;
                                    return mercator.getCircleStyle(10, "#3399cc", "#ffffff", 1, numProjects, "#ffffff");
                                });
    }

    mercator.addOverlay(mapConfig, "projectPopup");
    var overlay = mercator.getOverlayByTitle(mapConfig, "projectPopup");
    mapConfig.map.on("click",
                     function (event) {
                         if (mapConfig.map.hasFeatureAtPixel(event.pixel)) {
                             mapConfig.map.forEachFeatureAtPixel(event.pixel,
                                                                 mercator.showProjectPopup.bind(null, overlay, documentRoot));
                         } else {
                             overlay.setPosition(undefined);
                         }
                     });

    mercator.zoomMapToExtent(mapConfig, projectSource.getExtent());
    return mapConfig;
};

// [Side Effects] Adds a new vector layer called "currentPlots" to
// mapConfig's map object that clusters the passed in plots. Clicking
// on clusters with more than one plot zooms the map view to the
// extent covered by these plots. If a cluster only contains one plot,
// the callBack function will be called on the cluster feature.
mercator.addPlotLayer = function (mapConfig, plots, callBack) {
    var plotSource = mercator.plotsToVectorSource(plots);
    var clusterSource = new ol.source.Cluster({source:   plotSource,
                                               distance: 40});

    mercator.addVectorLayer(mapConfig,
                            "currentPlots",
                            clusterSource,
                            function (feature) {
                                var numPlots = feature.get("features").length;
                                return mercator.getCircleStyle(10, "#3399cc", "#ffffff", 1, numPlots, "#ffffff");
                            });

    var clickHandler = function (event) {
        mapConfig.map.forEachFeatureAtPixel(event.pixel,
                                            function (feature) {
                                                if (mercator.isCluster(feature)) {
                                                    if (feature.get("features").length > 1) {
                                                        mercator.zoomMapToExtent(mapConfig,
                                                                                 mercator.getClusterExtent(feature));
                                                    } else {
                                                        mercator.removeLayerByTitle(mapConfig, "currentPlots");
                                                        mapConfig.map.un("click", clickHandler);
                                                        callBack.call(null, feature);
                                                    }
                                                }
                                            });
    };
    mapConfig.map.on("click", clickHandler);

    return mapConfig;
};

/*****************************************************************************
***
*** FIXMEs
***
*****************************************************************************/
//
// FIXME: Move ceoMapStyles out of Mercator.js
// FIXME: Move mercator.getPopupContent() out of Mercator.js (it is hard-coded to CEO's home page)
// FIXME: change calls from remove_plot_layer to mercator.removeLayerByTitle(mapConfig, layerTitle)
// FIXME: change calls from draw_polygon to:
//        mercator.removeLayerByTitle(mapConfig, "currentAOI");
//        mercator.addVectorLayer(mapConfig,
//                                "currentAOI",
//                                mercator.geometryToVectorSource(mercator.parseGeoJson(polygon, true)),
//                                ceoMapStyles.polygon);
//        mercator.zoomMapToLayer(mapConfig, "currentAOI");
// FIXME: change calls from polygon_extent to mercator.parseGeoJson(polygon, false).getExtent()
// FIXME: change calls from get_plot_extent to mercator.getPlotExtent
// FIXME: change calls from draw_plot to:
//        mercator.removeLayerByTitle(mapConfig, "currentPlot");
//        mercator.addVectorLayer(mapConfig,
//                                "currentPlot",
//                                mercator.geometryToVectorSource(mercator.getPlotPolygon(center, size, shape)),
//                                ceoMapStyles.polygon);
//        mercator.zoomMapToLayer(mapConfig, "currentPlot");
// FIXME: change calls from draw_plots to mercator.addPlotOverviewLayers
// FIXME: for plots shown with draw_plots, change references to their plot_id field to plotId
// FIXME: change calls from enable_selection to mercator.enableSelection
// FIXME: change calls from disable_selection to mercator.disableSelection
// FIXME: change calls from remove_sample_layer to mercator.removeLayerByTitle(mapConfig, "currentSamples");
// FIXME: change calls from remove_plots_layer to mercator.removeLayerByTitle(mapConfig, "currentPlots");
// FIXME: change calls from draw_points to:
//        mercator.disableSelection(mapConfig);
//        mercator.removeLayerByTitle(mapConfig, "currentSamples");
//        mercator.addVectorLayer(mapConfig,
//                                "currentSamples",
//                                mercator.samplesToVectorSource(samples),
//                                ceoMapStyles.redPoint);
//        mercator.enableSelection(mapConfig, "currentSamples");
//        mercator.zoomMapToLayer(mapConfig, "currentSamples");
// FIXME: change references for points created with draw_points from sample_id to sampleId
// FIXME: change calls from get_selected_samples to mercator.getSelectedSamples
// FIXME: change calls from highlight_sample to mercator.highlightSamplePoint
// FIXME: change calls from enable_dragbox_draw to enableDragBoxDraw(mapConfig, displayDragBoxBounds)
// FIXME: change calls from disable_dragbox_draw to disableDragBoxDraw
// FIXME: change calls from draw_project_markers to:
//        mercator.addProjectMarkersAndZoom(mapConfig, projects, documentRoot, clusterDistance);
//        mercator.zoomMapToLayer(mapConfig, "projectMarkers");
// FIXME: change references to pID in home.js to projectId
// FIXME: change calls from draw_project_points to:
//        mercator.removeLayerByTitle(mapConfig, "currentPlots");
//        mercator.addPlotLayer(mapConfig, plots);
