/*****************************************************************************
***
*** Mercator-OpenLayers.js
***
*** Author: Gary W. Johnson
*** Copyright: 2017 Spatial Informatics Group, LLC
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

// [Pure] Returns a new ol.layer.* object or null if the layerConfig
// is invalid.
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
                layers: layers,
                controls: controls,
                view: view,
                map: map};
    }
};

/*****************************************************************************
***
*** Reset a map instance to its initial state
***
*****************************************************************************/

// [Side Effects] Resets all of the map parameters to their
// initialization-time values. Returns a new mapConfig object, and
// does not modify its inputs.
//
// Example call:
// var newMapConfig = mercator.resetMap(mapConfig);
mercator.resetMap = function (mapConfig) {
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

// [Side Effects] Hides all map layers in mapConfig except that with
// title == layerTitle.
mercator.setVisibleLayer = function (mapConfig, layerTitle) {
    mapConfig.layers.forEach(
        function (layer) {
            if (layer.getVisible() == true) {
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

// [Side Effects] Finds the map layer with title == layerTitle and
// appends newParams to its source's WMS params object.
//
// Example call:
// var mapConfig2 = mercator.updateLayerWmsParams(mapConfig,
//                                                "DigitalGlobeWMSImagery",
//                                                {COVERAGE_CQL_FILTER: "(acquisition_date<'" + imageryYear + "-12-31')",
//                                              // COVERAGE_CQL_FILTER: "(acquisition_date>'" + imageryYear + "-01-01')AND(acquisition_date<'" + imageryYear + "-12-31')",
//                                                 FEATUREPROFILE: stackingProfile});
mercator.updateLayerWmsParams = function (mapConfig, layerTitle, newParams) {
    var layer = mercator.getLayerByTitle(mapConfig, layerTitle);
    if (layer) {
        var mergedParams = Object.assign({}, layer.getSource().getParams(), newParams);
        layer.getSource().updateParams(mergedParams);
    }
    return mapConfig;
};

// [Side Effects] Zooms the map view to contain the layer with
// title == layerTitle.
mercator.zoomMapToLayer = function (mapConfig, layerTitle) {
    var layer = mercator.getLayerByTitle(mapConfig, layerTitle);
    if (layer) {
        mapConfig.view.fit(layer.getSource().getExtent(),
                           mapConfig.map.getSize());
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
// specified radius, color, and borderWidth.
mercator.getCircleStyle = function (radius, color, borderWidth) {
    return new ol.style.Style({image: new ol.style.Circle({radius: radius,
                                                           fill: null,
                                                           stroke: new ol.style.Stroke({color: color,
                                                                                        width: borderWidth})})});
};

// [Pure] Returns a style object that displays a shape with the
// specified number of points, radius, color, and borderWidth. A
// triangle has 3 points. A square has 4 points. A star has 5 points.
mercator.getRegularShapeStyle = function (radius, points, color, borderWidth) {
    return new ol.style.Style({image: new ol.style.RegularShape({radius: radius,
                                                                 points: points,
                                                                 fill: null,
                                                                 stroke: new ol.style.Stroke({color: color,
                                                                                              width: borderWidth})})});
};

// [Pure] Returns a style object that displays the outline of any
// shape to which it is applied in the specified color and
// borderWidth.
mercator.getPolygonStyle = function (color, borderWidth) {
    return new ol.style.Style({fill: null,
                               stroke: new ol.style.Stroke({color: color,
                                                            width: borderWidth})});
};

var ceoMapStyles = {icon:         mercator.getIconStyle("favicon.ico"),
                    ceoIcon:      mercator.getIconStyle("ceoicon.png"),
                    redPoint:     mercator.getCircleStyle(5, "#8b2323", 2),
                    bluePoint:    mercator.getCircleStyle(5, "#23238b", 2),
                    redCircle:    mercator.getCircleStyle(5, "red", 2),
                    yellowCircle: mercator.getCircleStyle(5, "yellow", 2),
                    greenCircle:  mercator.getCircleStyle(5, "green", 2),
                    redSquare:    mercator.getRegularShapeStyle(5, 4, "red", 2),
                    yellowSquare: mercator.getRegularShapeStyle(5, 4, "yellow", 2),
                    greenSquare:  mercator.getRegularShapeStyle(5, 4, "green", 2),
                    polygon:      mercator.getPolygonStyle("#8b2323", 3)};

/*****************************************************************************
***
*** Functions to draw project boundaries and plot buffers
***
*****************************************************************************/
// RESUME HERE
mercator.current_boundary = null;

mercator.draw_polygon = function (mapConfig, polygon) {
    var format = new ol.format.GeoJSON();
    var geometry = format.readGeometry(polygon).transform("EPSG:4326", "EPSG:3857");
    var feature = new ol.Feature({"geometry": geometry});
    var vector_source = new ol.source.Vector({"features": [feature]});
    var style = mercator.styles["polygon"];
    var vector_layer = new ol.layer.Vector({source: vector_source,
                                            "style": style});
    if (mercator.current_boundary != null) {
        mercator.map_ref.removeLayer(mercator.current_boundary);
    }
    mercator.current_boundary = vector_layer;
    mercator.map_ref.addLayer(vector_layer);
    mercator.zoomMapToLayer(mapConfig, vector_layer);
    return mercator.map_ref;
};

mercator.polygon_extent = function (polygon) {
    var format = new ol.format.GeoJSON();
    var geometry = format.readGeometry(polygon);
    return geometry.getExtent();
};

mercator.current_buffer = null;

mercator.remove_plot_layer = function () {
    if (mercator.current_buffer != null) {
        mercator.map_ref.removeLayer(mercator.current_buffer);
        mercator.current_buffer = null;
    }
    return null;
};

mercator.get_plot_extent = function (center, size) {
    var format = new ol.format.GeoJSON();
    var geometry = format.readGeometry(center).transform("EPSG:4326", "EPSG:3857");
    var coords = geometry.getCoordinates();
    var centerX = coords[0];
    var centerY = coords[1];
    var radius = size / 2;
    var extent = [centerX - radius,
                  centerY - radius,
                  centerX + radius,
                  centerY + radius];
    return ol.proj.transformExtent(extent, "EPSG:3857", "EPSG:4326");
};

mercator.draw_plot = function (mapConfig, center, size, shape) {
    var format = new ol.format.GeoJSON();
    var geometry = format.readGeometry(center).transform("EPSG:4326", "EPSG:3857");
    var coords = geometry.getCoordinates();
    var centerX = coords[0];
    var centerY = coords[1];
    var radius = size / 2;
    var buffer = shape == "circle"
        ? new ol.geom.Circle([centerX, centerY], radius)
        : ol.geom.Polygon.fromExtent([centerX - radius,
                                      centerY - radius,
                                      centerX + radius,
                                      centerY + radius]);
    var feature = new ol.Feature({"geometry": buffer});
    var vector_source = new ol.source.Vector({"features": [feature]});
    var style = mercator.styles["polygon"];
    var vector_layer = new ol.layer.Vector({source: vector_source,
                                            "style": style});
    mercator.remove_plot_layer();
    mercator.current_buffer = vector_layer;
    mercator.map_ref.addLayer(vector_layer);
    mercator.zoomMapToLayer(mapConfig, vector_layer);
    return mercator.map_ref;
};

mercator.draw_plots = function (plots, shape) {
    var flagged_plots = [];
    var analyzed_plots = [];
    var unanalyzed_plots = [];
    var format = new ol.format.GeoJSON();
    plots.forEach(
        function (plot) {
            var geometry = format.readGeometry(plot.center).transform("EPSG:4326", "EPSG:3857");
            var feature = new ol.Feature({plot_id: plot.id, geometry: geometry});
            if (plot.flagged == true) {
                flagged_plots.push(feature);
            } else if (plot.analyses > 0) {
                analyzed_plots.push(feature);
            } else {
                unanalyzed_plots.push(feature);
            }
        }
    );
    var flagged_source = new ol.source.Vector({features: flagged_plots});
    var analyzed_source = new ol.source.Vector({features: analyzed_plots});
    var unanalyzed_source = new ol.source.Vector({features: unanalyzed_plots});
    var flagged_style = shape == "circle" ? mercator.styles["red_circle"] : mercator.styles["red_square"];
    var analyzed_style = shape == "circle" ? mercator.styles["green_circle"] : mercator.styles["green_square"];
    var unanalyzed_style = shape == "circle" ? mercator.styles["yellow_circle"] : mercator.styles["yellow_square"];
    var flagged_layer = new ol.layer.Vector({source: flagged_source, style: flagged_style});
    var analyzed_layer = new ol.layer.Vector({source: analyzed_source, style: analyzed_style});
    var unanalyzed_layer = new ol.layer.Vector({source: unanalyzed_source, style: unanalyzed_style});
    mercator.map_ref.addLayer(flagged_layer);
    mercator.map_ref.addLayer(analyzed_layer);
    mercator.map_ref.addLayer(unanalyzed_layer);
    return mercator.map_ref;
};

/*****************************************************************************
***
*** Functions to setup select interactions for click and click-and-drag events
***
*****************************************************************************/

mercator.feature_styles = {};

mercator.select_interaction = null;

mercator.make_click_select = function (layer) {
    var select = new ol.interaction.Select({layers: [layer]});
    var action = function (event) {
        event.selected.forEach(function (feature) {
            mercator.feature_styles[feature] = feature.getStyle();
            feature.setStyle(null);
        });
        event.deselected.forEach(function (feature) {
            var saved_style = mercator.feature_styles[feature];
            if (saved_style != null) {
                feature.setStyle(saved_style);
            }
        });
    };
    select.on("select", action);
    return select;
};

mercator.dragbox_interaction = null;

mercator.make_dragbox_select = function (layer, selected_features) {
    var condition = ol.events.condition.platformModifierKeyOnly;
    var dragbox = new ol.interaction.DragBox({"condition": condition});
    var source = layer.getSource();
    var boxstart_action = function (event) {
        selected_features.clear();
    };
    var boxend_action = function (event) {
        var extent = dragbox.getGeometry().getExtent();
        var save_style = function (feature) {
            selected_features.push(feature);
            mercator.feature_styles[feature] = feature.getStyle();
            feature.setStyle(null);
            return false;
        };
        source.forEachFeatureIntersectingExtent(extent, save_style);
    };
    dragbox.on("boxstart", boxstart_action);
    dragbox.on("boxend", boxend_action);
    return dragbox;
};

mercator.enable_selection = function (layer) {
    var click_select = mercator.make_click_select(layer);
    var selected_features = click_select.getFeatures();
    var dragbox_select = mercator.make_dragbox_select(layer, selected_features);
    mercator.map_ref.addInteraction(click_select);
    mercator.map_ref.addInteraction(dragbox_select);
    mercator.select_interaction = click_select;
    mercator.dragbox_interaction = dragbox_select;
    return null;
};

mercator.disable_selection = function () {
    if (mercator.select_interaction != null) {
        mercator.map_ref.removeInteraction(mercator.select_interaction);
        mercator.select_interaction = null;
    }
    if (mercator.dragbox_interaction != null) {
        mercator.map_ref.removeInteraction(mercator.dragbox_interaction);
        mercator.dragbox_interaction = null;
    }
    return null;
};

/*****************************************************************************
***
*** Functions to draw sample points inside a plot
***
*****************************************************************************/

mercator.current_samples = null;

mercator.remove_sample_layer = function () {
    if (mercator.current_samples != null) {
        mercator.map_ref.removeLayer(mercator.current_samples);
        mercator.current_samples = null;
    }
    return null;
};
var pList;
mercator.draw_project_markers = function (project_list, dRoot) {
    pList = project_list;
    gPopup = new ol.Overlay.Popup();
    mercator.map_ref.addOverlay(gPopup);
    var format = new ol.format.GeoJSON();
    var features = project_list.map(
        function (project) {
            var coords = format.readGeometry(project.boundary).getCoordinates();
            // [[x,y],[x,y],...,[x,y]] -> {minX: ?, minY: ?, maxX: ?, maxY: ?}
            var bounds = coords[0].reduce(
                function (acc, coord) {
                    var x = coord[0];
                    var y = coord[1];
                    acc.minX = Math.min(acc.minX, x);
                    acc.maxX = Math.max(acc.maxX, x);
                    acc.minY = Math.min(acc.minY, y);
                    acc.maxY = Math.max(acc.maxY, y);
                    return acc;
                },
                {minX: 181.0, maxX: -181.0, minY: 91.0, maxY: -91.0}
            );
            var centerX = (bounds.minX + bounds.maxX) / 2;
            var centerY = (bounds.minY + bounds.maxY) / 2;
            var geometry = new ol.geom.Point([centerX, centerY]).transform("EPSG:4326", "EPSG:3857");
            return new ol.Feature({"geometry":    geometry,
                                   "name":        project.name,
                                   "description": project.description,
                                   "numPlots":    project.numPlots,
                                   "pID": project.id});
        }
    );
    var vector_source = new ol.source.Vector({"features": features});
    var vector_style = mercator.styles["ceoicon"];
    var vector_layer = new ol.layer.Vector({"title": "Project Markers",
                                            "source": vector_source,
                                            "style":  vector_style});
    layerRef = vector_layer;
    mercator.map_ref.addLayer(vector_layer);
    var extent = vector_layer.getSource().getExtent();
    mercator.map_ref.getView().fit(extent, mercator.map_ref.getSize());

    mercator.map_ref.getViewport().addEventListener("click", function(e) {
        mercator.map_ref.forEachFeatureAtPixel(mercator.map_ref.getEventPixel(e), function (feature, layer) {
            var description = feature.get("description") == "" ? "N/A" : feature.get("description");
            var html = '<div class="cTitle" >';
            html += '<h1 >' + feature.get("name") +'</h1> </div>';
            html += '<div class="cContent" ><p><span class="pField">Description: </span>' + description + '</p>';
            html += '<p><span class="pField">Number of plots: </span>' + feature.get("numPlots")  + '</p>';
            html += '<a href="'+ dRoot+'/collection/'+ feature.get("pID") +'" class="lnkStart">Get Started</a>  </div>';
            gPopup.show(feature.getGeometry().getCoordinates(),html);
            //gPopup.show(feature.getGeometry().getCoordinates(), '<div>' + feature.get("name") + '</br><a href="'+ dRoot+'/collection/'+ feature.get("pID") +'">Get Started</a> </div>');


        });
    });

    return mercator.map_ref;
};
var layerRef;
var gPopup;
mercator.draw_point = function (lon, lat) {
    var coords = mercator.reproject_to_map(lon, lat);
    var geometry = new ol.geom.Point(coords);
    var feature = new ol.Feature({geometry: geometry});
    var vector_source = new ol.source.Vector({features: [feature]});
    var style = mercator.styles["red_point"];
    var vector_layer = new ol.layer.Vector({source: vector_source,
                                            style: style});
    mercator.map_ref.addLayer(vector_layer);
    return mercator.map_ref;
};

mercator.draw_points = function (mapConfig, samples) {
    var features = [];
    for (i=0; i<samples.length; i++) {
        var sample = samples[i];
        var format = new ol.format.GeoJSON();
        var latlon = format.readGeometry(sample.point);
        var geometry = latlon.transform("EPSG:4326", "EPSG:3857");
        var feature = new ol.Feature({geometry: geometry,
                                      sample_id: sample["id"]});
        features.push(feature);
    }
    var vector_source = new ol.source.Vector({features: features});
    var style = mercator.styles["red_point"];
    var vector_layer = new ol.layer.Vector({source: vector_source,
                                            style: style});
    mercator.remove_sample_layer();
    mercator.current_samples = vector_layer;
    mercator.disable_selection();
    mercator.map_ref.addLayer(vector_layer);
    mercator.enable_selection(vector_layer);
    mercator.zoomMapToLayer(mapConfig, vector_layer);
    return mercator.map_ref;
};

mercator.get_selected_samples = function () {
    if (mercator.select_interaction != null) {
        return mercator.select_interaction.getFeatures();
    } else {
        return null;
    }
};

mercator.highlight_sample = function (sample, color) {
    var fill = new ol.style.Fill({"color": color || "#999999"});
    var stroke = new ol.style.Stroke({"color": "#000000",
                                      "width": 2});
    var circle = new ol.style.Circle({"radius": 5,
                                      "fill": fill,
                                      "stroke": stroke});
    var style = new ol.style.Style({"image": circle});
    sample.setStyle(style);
    return null;
};

/*****************************************************************************
***
*** Bounding Box Selector for Admin Page
***
*****************************************************************************/

mercator.dragbox_draw_layer = null;

mercator.dragbox_draw_interaction = null;

mercator.current_bbox = null;

mercator.set_bbox_coords = null;

mercator.enable_dragbox_draw = function () {
    var source = new ol.source.Vector({"features": []});
    var style = mercator.styles["polygon"];
    var draw_layer = new ol.layer.Vector({title: "ProjectBoundingBox",
                                          source: source,
                                          "style": style});
    var condition = ol.events.condition.platformModifierKeyOnly;
    var dragbox = new ol.interaction.DragBox({"condition": condition});
    var boxend_action = function (event) {
        var geom = dragbox.getGeometry();
        var feature = new ol.Feature({"geometry": geom});
        var extent = geom.clone().transform("EPSG:3857", "EPSG:4326").getExtent();
        source.clear();
        source.addFeature(feature);
        mercator.current_bbox = {minlon: extent[0],
                                 minlat: extent[1],
                                 maxlon: extent[2],
                                 maxlat: extent[3]};

        /* If Angular code defines this function, then write values of extent to max-min lat-lon inputs. */
        if (mercator.set_bbox_coords) {
            mercator.set_bbox_coords();
        }

    };

    dragbox.on("boxend", boxend_action);
    mercator.map_ref.addLayer(draw_layer);
    mercator.map_ref.addInteraction(dragbox);
    mercator.dragbox_draw_layer = draw_layer;
    mercator.dragbox_draw_interaction = dragbox;
    return null;
};

mercator.disable_dragbox_draw = function () {
    if (mercator.dragbox_draw_layer != null) {
        mercator.map_ref.removeLayer(mercator.dragbox_draw_layer);
        mercator.dragbox_draw_layer = null;
    }
    if (mercator.dragbox_draw_interaction != null) {
        mercator.map_ref.removeInteraction(mercator.dragbox_draw_interaction);
        mercator.dragbox_draw_interaction = null;
    }
    return null;
};

/*****************************************************************************
***
*** FIXMEs
***
*****************************************************************************/
//
// FIXME: Move ceoMapStyles out of Mercator.js
// FIXME: change calls from remove_plot_layer to removeLayerByTitle(mapConfig, layerTitle)
// FIXME: change calls from draw_polygon to:
//        mercator.removeLayerByTitle(mapConfig, "currentAOI");
//        mercator.addVectorLayer(mapConfig,
//                                "currentAOI",
//                                mercator.parseGeoJson(polygon, true),
//                                ceoMapStyles.polygon);
//        mercator.zoomMapToLayer(mapConfig, "currentAOI");
// FIXME: change calls from polygon_extent to mercator.parseGeoJson(polygon, false).getExtent()
// FIXME: change calls from get_plot_extent to getPlotExtent
// FIXME: change calls from draw_plot to:
//        mercator.removeLayerByTitle(mapConfig, "currentPlot");
//        mercator.addVectorLayer(mapConfig,
//                                "currentPlot",
//                                mercator.getPlotPolygon(center, size, shape),
//                                ceoMapStyles.polygon);
//        mercator.zoomMapToLayer(mapConfig, "currentPlot");
