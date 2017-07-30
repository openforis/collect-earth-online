/*****************************************************************************
***
*** Create the map_utils object to act as a namespace for this file
***
*****************************************************************************/

var map_utils = {};

/*****************************************************************************
***
*** Lon/Lat Reprojection
***
*** Default map projection for OpenLayers is "Web Mercator"
*** (EPSG:3857), which is also the default for OpenStreetMap, Google
*** Maps, MapQuest, and Bing Maps.
***
*****************************************************************************/

map_utils.reproject_to_map = function (longitude, latitude) {
    return ol.proj.transform([Number(longitude), Number(latitude)],
                             "EPSG:4326",
                             "EPSG:3857");
};

map_utils.reproject_from_map = function (x, y) {
    return ol.proj.transform([Number(x), Number(y)],
                             "EPSG:3857",
                             "EPSG:4326");
};

map_utils.get_full_extent = function () {
    var llxy = map_utils.reproject_to_map(-180.0, -89.999999);
    var urxy = map_utils.reproject_to_map(180.0, 90.0);
    return [llxy[0], llxy[1], urxy[0], urxy[1]];
};

map_utils.get_view_extent = function () {
    var view = map_utils.map_ref.getView();
    var size = map_utils.map_ref.getSize();
    var extent = view.calculateExtent(size);
    return ol.proj.transformExtent(extent, "EPSG:3857", "EPSG:4326");
};

/*****************************************************************************
***
*** Create the default OpenLayers Map Object used on all pages
***
*****************************************************************************/

// This reference will hold the current page's OpenLayers map object
map_utils.map_ref = null;

map_utils.create_source = function (source_config) {
    if (source_config.type == "DigitalGlobe") {
        return new ol.source.XYZ({url: "http://api.tiles.mapbox.com/v4/" + source_config.imagery_id
                                       + "/{z}/{x}/{y}.png?access_token=" + source_config.access_token,
                                  attribution: "© DigitalGlobe, Inc"});
    } else if (source_config.type == "BingMaps") {
        return new ol.source.BingMaps({imagerySet: source_config.imagery_id,
                                       key: source_config.access_token,
                                       maxZoom: 19});
    } else if (source_config.type == "GeoServer") {
        return new ol.source.TileWMS({serverType: "geoserver",
                                      url: source_config.geoserver_url,
                                      params: source_config.geoserver_params});
    } else {
        alert("Cannot create layer with source type " + source_config.type + ".");
        return null;
    }
};

map_utils.create_layer = function (layer_config, visible) {
    var source = map_utils.create_source(layer_config.source_config);
    if (source) {
        if (layer_config.extent != null) {
            return new ol.layer.Tile({title: layer_config.title,
                                      visible: visible,
                                      extent: layer_config.extent,
                                      source: source});
        } else {
            return new ol.layer.Tile({title: layer_config.title,
                                      visible: visible,
                                      source: source});
        }
    } else {
        return null;
    }
};

// Example call:
// map_utils.digital_globe_base_map({"div_name":      "image-analysis-pane",
//                                   "center_coords": [102.0, 17.0],
//                                   "zoom_level":    5},
//                                  {see imagery-list.json});
map_utils.digital_globe_base_map = function (map_config, layer_configs) {
    // Create each of the layers that will be shown in the map from layer_configs
    var layers = layer_configs.map(
        function (layer_config) {
            if (layer_config.title == "DigitalGlobeWMSImagery") {
                return map_utils.create_layer(layer_config, true);
            } else {
                return map_utils.create_layer(layer_config, false);
            }
        }
    ).filter(
        function (layer) {
            return layer != null;
        }
    );

    // Add a scale line to the default map controls
    var controls = ol.control.defaults().extend([new ol.control.ScaleLine()]);

    // Create the map view using the passed in center_coords and zoom_level
    var view = new ol.View({projection: "EPSG:3857",
                            center: ol.proj.fromLonLat(map_config.center_coords),
                            extent: map_utils.get_full_extent(),
                            zoom: map_config.zoom_level});

    // Create the new OpenLayers map object
    var openlayers_map = new ol.Map({target: map_config.div_name,
                                     layers: layers,
                                     controls: controls,
                                     view: view});

    // Store the new OpenLayers map object in map_utils.map_ref and return it
    map_utils.map_ref = openlayers_map;
    return openlayers_map;
};

/*****************************************************************************
***
*** Functions to switch the visible basemap imagery and zoom to a layer
***
*****************************************************************************/

map_utils.current_imagery = "DigitalGlobeWMSImagery";

map_utils.set_current_imagery = function (new_imagery) {
    map_utils.map_ref.getLayers().forEach(
        function (layer) {
            var title = layer.get("title");
            if (title == map_utils.current_imagery) {
                layer.set("visible", false);
            }
            if (title == new_imagery) {
                layer.set("visible", true);
            }
        }
    );
    map_utils.current_imagery = new_imagery;
    return new_imagery;
};

map_utils.get_layer_by_name = function (name) {
    return map_utils.map_ref.getLayers().getArray().find(
        function (layer) {
            return layer.get("title") == name;
        }
    );
};

map_utils.set_dg_wms_layer_params = function (imagery_year, stacking_profile) {
    var dg_layer = map_utils.get_layer_by_name("DigitalGlobeWMSImagery");
    if (dg_layer) {
        dg_layer.setSource(new ol.source.TileWMS({serverType: "geoserver",
                                                  url: "https://services.digitalglobe.com/mapservice/wmsaccess",
                                                  params: {"VERSION": "1.1.1",
                                                           "LAYERS": "DigitalGlobe:Imagery",
                                                           "CONNECTID": "a797f723-f91f-40d7-8458-3669a830b6de",
                                                           "FEATUREPROFILE": stacking_profile,
                                                           // "COVERAGE_CQL_FILTER": "(acquisition_date>'" + imagery_year + "-01-01')"
                                                           //                      + "AND(acquisition_date<'" + imagery_year + "-12-31')"}
                                                           "COVERAGE_CQL_FILTER": "(acquisition_date<'" + imagery_year + "-12-31')"}
                                                 }));
    }
};

map_utils.zoom_map_to_layer = function (layer) {
    var view = map_utils.map_ref.getView();
    var size = map_utils.map_ref.getSize();
    var extent = layer.getSource().getExtent();
    return view.fit(extent, size);
};

map_utils.zoom_and_recenter_map = function (longitude, latitude, zoom_level) {
    var view = map_utils.map_ref.getView();
    view.setCenter(map_utils.reproject_to_map(longitude, latitude));
    view.setZoom(zoom_level);
    return view;
};

/*****************************************************************************
***
*** Functions to draw project boundaries and plot buffers
***
*****************************************************************************/

map_utils.styles =
    {"icon": new ol.style.Style(
        {"image": new ol.style.Icon({"src": "favicon.ico"})}),

     "red_point": new ol.style.Style(
         {"image": new ol.style.Circle({"radius": 5,
                                        "fill": null,
                                        "stroke": new ol.style.Stroke(
                                            {"color": "#8b2323",
                                             "width": 2})})}),

     "blue_point": new ol.style.Style(
         {"image": new ol.style.Circle({"radius": 5,
                                        "fill": null,
                                        "stroke": new ol.style.Stroke(
                                            {"color": "#23238b",
                                             "width": 2})})}),

     "red_circle": new ol.style.Style(
         {"image": new ol.style.Circle({"radius": 5,
                                        "fill": null,
                                        "stroke": new ol.style.Stroke(
                                            {"color": "red",
                                             "width": 2})})}),

     "red_square": new ol.style.Style(
         {"image": new ol.style.RegularShape({"radius": 5,
                                              "points": 4,
                                              "fill": null,
                                              "stroke": new ol.style.Stroke(
                                                  {"color": "red",
                                                   "width": 2})})}),

     "green_circle": new ol.style.Style(
         {"image": new ol.style.Circle({"radius": 5,
                                        "fill": null,
                                        "stroke": new ol.style.Stroke(
                                            {"color": "green",
                                             "width": 2})})}),

     "green_square": new ol.style.Style(
         {"image": new ol.style.RegularShape({"radius": 5,
                                              "points": 4,
                                              "fill": null,
                                              "stroke": new ol.style.Stroke(
                                                  {"color": "green",
                                                   "width": 2})})}),

     "yellow_circle": new ol.style.Style(
         {"image": new ol.style.Circle({"radius": 5,
                                        "fill": null,
                                        "stroke": new ol.style.Stroke(
                                            {"color": "yellow",
                                             "width": 2})})}),

     "yellow_square": new ol.style.Style(
         {"image": new ol.style.RegularShape({"radius": 5,
                                              "points": 4,
                                              "fill": null,
                                              "stroke": new ol.style.Stroke(
                                                  {"color": "yellow",
                                                   "width": 2})})}),

     "polygon": new ol.style.Style(
         {"fill": null,
          "stroke": new ol.style.Stroke(
              {"color": "#8b2323",
               "width": 3})})};

map_utils.current_boundary = null;

map_utils.draw_polygon = function (polygon) {
    var format = new ol.format.GeoJSON();
    var geometry = format.readGeometry(polygon).transform("EPSG:4326", "EPSG:3857");
    var feature = new ol.Feature({"geometry": geometry});
    var vector_source = new ol.source.Vector({"features": [feature]});
    var style = map_utils.styles["polygon"];
    var vector_layer = new ol.layer.Vector({source: vector_source,
                                            "style": style});
    if (map_utils.current_boundary != null) {
        map_utils.map_ref.removeLayer(map_utils.current_boundary);
    }
    map_utils.current_boundary = vector_layer;
    map_utils.map_ref.addLayer(vector_layer);
    map_utils.zoom_map_to_layer(vector_layer);
    return map_utils.map_ref;
};

map_utils.polygon_extent = function (polygon) {
    var format = new ol.format.GeoJSON();
    var geometry = format.readGeometry(polygon);
    return geometry.getExtent();
};

map_utils.current_buffer = null;

map_utils.remove_plot_layer = function () {
    if (map_utils.current_buffer != null) {
        map_utils.map_ref.removeLayer(map_utils.current_buffer);
        map_utils.current_buffer = null;
    }
    return null;
};

map_utils.get_plot_extent = function (center, size) {
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

map_utils.draw_plot = function (center, size, shape) {
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
    var style = map_utils.styles["polygon"];
    var vector_layer = new ol.layer.Vector({source: vector_source,
                                            "style": style});
    map_utils.remove_plot_layer();
    map_utils.current_buffer = vector_layer;
    map_utils.map_ref.addLayer(vector_layer);
    map_utils.zoom_map_to_layer(vector_layer);
    return map_utils.map_ref;
};

map_utils.draw_plots = function (plots, shape) {
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
    var flagged_style = shape == "circle" ? map_utils.styles["red_circle"] : map_utils.styles["red_square"];
    var analyzed_style = shape == "circle" ? map_utils.styles["green_circle"] : map_utils.styles["green_square"];
    var unanalyzed_style = shape == "circle" ? map_utils.styles["yellow_circle"] : map_utils.styles["yellow_square"];
    var flagged_layer = new ol.layer.Vector({source: flagged_source, style: flagged_style});
    var analyzed_layer = new ol.layer.Vector({source: analyzed_source, style: analyzed_style});
    var unanalyzed_layer = new ol.layer.Vector({source: unanalyzed_source, style: unanalyzed_style});
    map_utils.map_ref.addLayer(flagged_layer);
    map_utils.map_ref.addLayer(analyzed_layer);
    map_utils.map_ref.addLayer(unanalyzed_layer);
    return map_utils.map_ref;
};

/*****************************************************************************
***
*** Functions to setup select interactions for click and click-and-drag events
***
*****************************************************************************/

map_utils.feature_styles = {};

map_utils.select_interaction = null;

map_utils.make_click_select = function (layer) {
    var select = new ol.interaction.Select({layers: [layer]});
    var action = function (event) {
        event.selected.forEach(function (feature) {
            map_utils.feature_styles[feature] = feature.getStyle();
            feature.setStyle(null);
        });
        event.deselected.forEach(function (feature) {
            var saved_style = map_utils.feature_styles[feature];
            if (saved_style != null) {
                feature.setStyle(saved_style);
            }
        });
    };
    select.on("select", action);
    return select;
};

map_utils.dragbox_interaction = null;

map_utils.make_dragbox_select = function (layer, selected_features) {
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
            map_utils.feature_styles[feature] = feature.getStyle();
            feature.setStyle(null);
            return false;
        };
        source.forEachFeatureIntersectingExtent(extent, save_style);
    };
    dragbox.on("boxstart", boxstart_action);
    dragbox.on("boxend", boxend_action);
    return dragbox;
};

map_utils.enable_selection = function (layer) {
    var click_select = map_utils.make_click_select(layer);
    var selected_features = click_select.getFeatures();
    var dragbox_select = map_utils.make_dragbox_select(layer, selected_features);
    map_utils.map_ref.addInteraction(click_select);
    map_utils.map_ref.addInteraction(dragbox_select);
    map_utils.select_interaction = click_select;
    map_utils.dragbox_interaction = dragbox_select;
    return null;
};

map_utils.disable_selection = function () {
    if (map_utils.select_interaction != null) {
        map_utils.map_ref.removeInteraction(map_utils.select_interaction);
        map_utils.select_interaction = null;
    }
    if (map_utils.dragbox_interaction != null) {
        map_utils.map_ref.removeInteraction(map_utils.dragbox_interaction);
        map_utils.dragbox_interaction = null;
    }
    return null;
};

/*****************************************************************************
***
*** Functions to draw sample points inside a plot
***
*****************************************************************************/

map_utils.current_samples = null;

map_utils.remove_sample_layer = function () {
    if (map_utils.current_samples != null) {
        map_utils.map_ref.removeLayer(map_utils.current_samples);
        map_utils.current_samples = null;
    }
    return null;
};

map_utils.draw_point = function (lon, lat) {
    var coords = map_utils.reproject_to_map(lon, lat);
    var geometry = new ol.geom.Point(coords);
    var feature = new ol.Feature({geometry: geometry});
    var vector_source = new ol.source.Vector({features: [feature]});
    var style = map_utils.styles["red_point"];
    var vector_layer = new ol.layer.Vector({source: vector_source,
                                            style: style});
    map_utils.map_ref.addLayer(vector_layer);
    return map_utils.map_ref;
};

map_utils.draw_points = function (samples) {
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
    var style = map_utils.styles["red_point"];
    var vector_layer = new ol.layer.Vector({source: vector_source,
                                            style: style});
    map_utils.remove_sample_layer();
    map_utils.current_samples = vector_layer;
    map_utils.disable_selection();
    map_utils.map_ref.addLayer(vector_layer);
    map_utils.enable_selection(vector_layer);
    map_utils.zoom_map_to_layer(vector_layer);
    return map_utils.map_ref;
};

map_utils.get_selected_samples = function () {
    if (map_utils.select_interaction != null) {
        return map_utils.select_interaction.getFeatures();
    } else {
        return null;
    }
};

map_utils.highlight_sample = function (sample, color) {
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

map_utils.dragbox_draw_layer = null;

map_utils.dragbox_draw_interaction = null;

map_utils.current_bbox = null;

map_utils.set_bbox_coords = null;

map_utils.enable_dragbox_draw = function () {
    var source = new ol.source.Vector({"features": []});
    var style = map_utils.styles["polygon"];
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
        map_utils.current_bbox = {minlon: extent[0],
                                  minlat: extent[1],
                                  maxlon: extent[2],
                                  maxlat: extent[3]};

        /* If Angular code defines this function, then write values of extent to max-min lat-lon inputs. */
        if (map_utils.set_bbox_coords) {
            map_utils.set_bbox_coords();
        }

    };

    dragbox.on("boxend", boxend_action);
    map_utils.map_ref.addLayer(draw_layer);
    map_utils.map_ref.addInteraction(dragbox);
    map_utils.dragbox_draw_layer = draw_layer;
    map_utils.dragbox_draw_interaction = dragbox;
    return null;
};

map_utils.disable_dragbox_draw = function () {
    if (map_utils.dragbox_draw_layer != null) {
        map_utils.map_ref.removeLayer(map_utils.dragbox_draw_layer);
        map_utils.dragbox_draw_layer = null;
    }
    if (map_utils.dragbox_draw_interaction != null) {
        map_utils.map_ref.removeInteraction(map_utils.dragbox_draw_interaction);
        map_utils.dragbox_draw_interaction = null;
    }
    return null;
};
