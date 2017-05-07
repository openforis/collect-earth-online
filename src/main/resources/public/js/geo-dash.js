/*property
    Circle, Color, Feature, Map, OSM, Sphere, Stroke, Style, Tile, Vector,
    View, XYZ, addClass, addFeatures, addLayer, ajax, append, apply, area,
    async, attr, bands, center, changeMonth, changeYear, chart, children,
    class, click, closest, collectionName, collectionNameTimeSeries, color,
    colors, concat, contentType, coordinates, createElement, crossDomain, css,
    dashID, dashboardID, data, dataType, dateFormat, dateFrom,
    dateFromTimeSeries, dateTo, dateToTimeSeries, datepicker, debug, done,
    each, enabled, errMsg, error, exec, fail, fill, fillColor, firstChild, fit,
    flip, forEach, geodesicArea, geom, get, getArray, getElementById,
    getLayers, getOptions, getSize, getView, grabElement, handle, hasClass,
    hasOwnProperty, height, hover, href, html, id, includes, index, indexName,
    indexOf, indexVal, info, innerHTML, insertBefore, join, layer, layers,
    legend, length, lineWidth, linearGradient, location, map, mapid, marker,
    max, maxElev, message, min, minElev, name, onclick, ontouchstart,
    outerHeight, outerWidth, paramType, paramValue, parent, parentNode, parse,
    parseJSON, plotOptions, pointFormat, polyVal, polygon, pop, position,
    preventDefault, proj, projectTitle, projection, properties, prototype,
    push, radius, remove, removeChild, removeClass, removeLayer, removeValue,
    replace, series, setData, setOpacity, setSize, sort, sortable, source,
    split, states, stops, stringify, stroke, style, substring, subtitle,
    success, target, text, threshold, timeseries, title, toString, toggle,
    toggleClass, token, tooltip, transform, trigger, type, update, updateSize,
    url, val, view, visParams, warn, widgetJSON, widgets, width, x1, x2, xAxis,
    y1, y2, yAxis, zoom, zoomType, show, extend, match, Color, dialog, scrollTop, widget,
    autoOpen, modal, buttons, close, is, reset, change, value, find, hide
*/
/*jslint browser: true*/ /*global  $, console, window, getParameterByName, ol, Highcharts*/ /*  node: true */ /*jshint strict:false */
/*jslint this */

var debugme;
var theURL = "geo-dash/";
var gateway = "http://gateway.servirglobal.net:8888";
var wCount = 0;
var wLoaded = 0;
var projAOI;
var projPairAOI;
var wStateFull = false;
var dashboardID;
var bradius;
var bcenter;
var mapWidgetArray = {};
var graphWidgetArray = {};
var pageWidgets = [];


function completeGraph() {
    "use strict";
    pageWidgets.forEach(function (widget, index) {
        if (widget.properties[0] === "timeSeriesGraph") {
            try {
                $("#widgetgraph_" + widget.id + " .highcharts-title").children()[0].innerHTML = widget.properties[4];
                $("#widgetgraph_" + widget.id + " .highcharts-yaxis").children()[0].innerHTML = widget.properties[4];
            } catch (e) {
                console.debug("Graph failed for: " + index + e.message);
            }
        }
    });
}
function addBuffer(whichMap) {
    "use strict";
    try {
        var circle = new ol.geom.Circle(ol.proj.transform(JSON.parse(bcenter).coordinates, "EPSG:4326", "EPSG:3857"), bradius * 1); //bradius / 1000);
        var CircleFeature = new ol.Feature(circle);
        var vectorSource = new ol.source.Vector({});
        vectorSource.addFeatures([CircleFeature]);
        var layer = new ol.layer.Vector({
            source: vectorSource,
            style: [
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: "#8b2323",
                        width: 2
                    }),
                    fill: null
                })
            ]
        });
        whichMap.addLayer(layer);
    } catch (e) {
        console.warn("buffer failed: " + e.message);
    }
}
function createChart(wIndex, wText, wTimeseriesData) {
    "use strict";
    return Highcharts.chart("graphcontainer_" + wIndex, {
        chart: {
            zoomType: "x"
        },
        title: {
            text: wText
        },
        subtitle: {
            text: document.ontouchstart === undefined
                ? "Click and drag in the plot area to zoom in"
                : "Pinch the chart to zoom in"
        },
        xAxis: {
            type: "datetime"
        },
        yAxis: {
            title: {
                text: wText
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                    },
                    stops: [
                        [0, Highcharts.getOptions().colors[0]],
                        [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get("rgba")]
                    ]
                },
                marker: {
                    radius: 2
                },
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1
                    }
                },
                threshold: null
            }
        },
        tooltip: {
            pointFormat: "Value: {point.y}"
        },
        series: [{
            type: "area",
            name: wText,
            data: wTimeseriesData
        }]
    }, function () {
        completeGraph();
    });
}
function numberWithCommas(x) {
    "use strict";
    if (typeof x === "number") {
        try {
            var parts = x.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        } catch (e) {
            console.warn(e.message);
        }
    }
    return "N/A";
}
function calculateArea(poly) {
    "use strict";
    var sphere = new ol.Sphere(6378137);
    var coordinates = poly;
    var area_m = sphere.geodesicArea(coordinates);
    var area_ha = area_m / 10000;
    if (area_ha < 0) {
        area_ha = area_ha * -1;
    }
    return numberWithCommas(area_ha);
}
function addWidget(widget) {
    "use strict";
    var awidget = $("<div/>", {
        "class": "col-xs-6 col-sm-3 placeholder"
    });
    if (widget.width) {
        awidget = $("<div/>", {
            "class": "col-xs-6 col-sm-" + widget.width + " placeholder"
        });
    }
    var panel = $("<div/>", {
        "class": "panel panel-default"
    });
    panel.attr("id", "widget_" + widget.id);
    var panHead = $("<div/>", {
        "class": "panel-heading"
    });
    var toolsholder = $("<ul/>", {
        "class": "list-inline panel-actions pull-right"
    });
    var toolSpace = $("<li/>");
    toolsholder.append(toolSpace);
    var toolmaxtog = $("<li/>");
    var thebutton = $("<a/>", {
        "class": "list-inline panel-actions panel-fullscreen"
    });
    var theicon = $("<i/>", {
        "class": "glyphicon glyphicon-resize-full"
    });
    thebutton.append(theicon);
    thebutton.attr("role", "button");
    thebutton.attr("title", "Toggle Fullscreen");
    toolmaxtog.append(thebutton);
    toolsholder.append(toolmaxtog);
    panHead.append(toolsholder);
    panel.append(panHead);
    var img;
    var wtext = "I had no property";
    if (widget.properties[0]) {
        var front = "";
        var back = "";
        var flippercontainer = "";

        flippercontainer = $("<div />", {
            "id": "flip-container_" + widget.id,
            "class": "flip-container"
        });
        front = $("<div />").addClass("front");
        back = $("<div />").addClass("back").html("");

        wtext = widget.properties[0];
        var widgettitle = $("<h4 />", {
            "id": "widgettitle_" + widget.id
        }).html(widget.name);
        var sub = $("<br />");
        if (wtext === "addImageCollection") {
            var maddiv = $("<div/>", {
                "id": "widgetmap_" + widget.id,
                "class": "minmapwidget"
            });
            maddiv.attr("style", "width:100%; min-height:200px;");
            front.append(maddiv).append(widgettitle).append(sub);
            flippercontainer.append(front);
            back.html("");
            flippercontainer.append(back);
            panel.append(flippercontainer);
        } else if (wtext === "timeSeriesGraph") {
            var graphdiv = $("<div/>", {
                "id": "widgetgraph_" + widget.id,
                "class": "minmapwidget"
            });
            var graphcontainer = $("<div/>", {
                "id": "graphcontainer_" + widget.id,
                "class": "minmapwidget"
            });
            graphdiv.append(graphcontainer);
            graphdiv.append(widgettitle).append(sub);
            front.append(graphdiv);
            flippercontainer.append(front);
            back.html("");
            flippercontainer.append(back);
            panel.append(flippercontainer);
        } else if (wtext === "getStats") {

            var statsDiv = $("<div/>", {
                "id": "widgetstats_" + widget.id,
                "class": "minmapwidget"
            });
            var content = "<div><div class=\"form-group\"><div class=\"input-group\"><div class=\"input-group-addon\"><img src=\"img/icon-population.png\" style=\"width: 50px; height: 50px; border-radius: 25px; background-color: rgb(226, 132, 58);\"></div>";
            content += "  <label for=\"totalPop_" + widget.id + "\" style=\"color:#787878\">Total population</label>";
            content += "<h4 id=\"totalPop_" + widget.id + "\" style=\"color: #606060; font-size: 16px; font-weight: bold; \"></h4><img src=\"img/loading.gif\" id=\"loading-indicator-1\" style=\"display:none\" /></div></div>";
            content += "<div class=\"form-group\"><div class=\"input-group\"><div class=\"input-group-addon\"><img src=\"img/icon-area.png\" style=\"width: 50px; height: 50px; border-radius: 25px; background-color: rgb(226, 132, 58);\"></div>";
            content += "<label for=\"totalArea_" + widget.id + "\" style=\"color:#787878\">Area</label>";
            content += "<h4 id=\"totalArea_" + widget.id + "\" style=\"color: #606060; font-size: 16px; font-weight: bold; \"></h4><img src=\"img/loading.gif\" id=\"loading-indicator-1\" style=\"display:none\" /></div></div>";
            content += "<div class=\"form-group\"><div class=\"input-group\"><div class=\"input-group-addon\"><img src=\"img/icon-elevation.png\" style=\"width: 50px; height: 50px; border-radius: 25px; background-color: rgb(226, 132, 58);\"></div>";
            content += "<label for=\"elevationRange_" + widget.id + "\" style=\"color:#787878\">Elevation</label>";
            content += "<h4 id=\"elevationRange_" + widget.id + "\" style=\"color: #606060; font-size: 16px; font-weight: bold; \"></h4><img src=\"img/loading.gif\" id=\"loading-indicator-1\" style=\"display:none\" /></div></div>";
            statsDiv.append(content);
            front.append(statsDiv);
            flippercontainer.append(front);
            back.html("");
            flippercontainer.append(back);
            panel.append(flippercontainer);
        } else {
            img = $("<img>");
            img.attr("src", "data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==");
            img.attr("width", "200");
            img.attr("height", "200");
            img.addClass("img-responsive");
            panel.append(img).append(sub);
        }
    }
    awidget.append(panel);
    return awidget;
}
function enableMapWidget(mapdiv) {
    "use strict";
    var raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });
    var map = new ol.Map({
        layers: [raster],
        target: mapdiv,
        view: new ol.View({
            center: [0, 0],
            projection: "EPSG:3857",
            zoom: 4
        })
    });
    mapWidgetArray[mapdiv] = map;
}
function addTileServer(imageid, token, mapdiv) {
    "use strict";
    var googleLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: "https://earthengine.googleapis.com/map/" + imageid + "/{z}/{x}/{y}?token=" + token
        })
    });
    mapWidgetArray[mapdiv].addLayer(googleLayer);
    addBuffer(mapWidgetArray[mapdiv]);
}
function makeAjax(parameters, donefunction) {
    "use strict";
    $.ajax(parameters).fail(function (jqXHR, textStatus, errorThrown) {
        console.warn("error from imageCollection: " + jqXHR + textStatus + errorThrown);
    }).done(donefunction);
}
function initWidget(widget) {
    "use strict";
    var collectionName;
    var timeseriesData;
    var text;
    try {
        $("#flip-container_" + widget.id).flip({
            trigger: "manual"
        });
    } catch (e) {
        console.info("widget flip issue: " + e.message);
    }
    try {
        $(".back").height($("#widget_" + widget.id).height());
    } catch (e2) {
        console.info("widget flip issue: " + e2.message);
    }
    if (widget.properties[0] === "addImageCollection") {
        enableMapWidget("widgetmap_" + widget.id);
        if (projAOI === "") {
            projAOI = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
        } else {
            if (typeof projAOI === "string") {
                projAOI = $.parseJSON(projAOI);
            }
        }
        if (projAOI) {
            mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                ol.proj.transform([projAOI[0], projAOI[1]], "EPSG:4326", "EPSG:3857").concat(ol.proj.transform([projAOI[2], projAOI[3]], "EPSG:4326", "EPSG:3857")),
                mapWidgetArray["widgetmap_" + widget.id].getSize()
            );
        } else {
            mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                projAOI,
                mapWidgetArray["widgetmap_" + widget.id].getSize()
            );
        }
        collectionName = widget.properties[1];
        var dateFrom = widget.properties[2];
        var dateTo = widget.properties[3];
        var url = gateway + "/imageByMosaicCollection";
        var bands = "";
        if (widget.properties.length === 5) {
            bands = widget.properties[4];
        }
        var visParams = {
            min: "",
            max: "0.3",
            bands: bands
        };
        makeAjax({
            url: url,
            type: "POST",
            async: true,
            indexVal: widget.id,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                collectionName: collectionName,
                visParams: visParams,
                dateFrom: dateFrom,
                dateTo: dateTo
            })
        }, function (data) {
            if (data.errMsg) {
                console.info(data.errMsg);
            } else {
                if (data.hasOwnProperty("mapid")) {
                    var mapId = data.mapid;
                    var token = data.token;
                    var $this = this;
                    addTileServer(mapId, token, "widgetmap_" + $this.indexVal);
                } else {
                    console.warn("Wrong Data Returned");
                }
            }
        });
    } else if (widget.properties[0] === "timeSeriesGraph") {
        collectionName = widget.properties[1];
        var indexName = widget.properties[4];
        makeAjax({
            url: gateway + "/timeSeriesIndex",
            type: "POST",
            async: true,
            indexVal: widget.id,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                collectionNameTimeSeries: widget.properties[1],
                polygon: $.parseJSON(projPairAOI),
                indexName: widget.properties[4],
                dateFromTimeSeries: widget.properties[2],
                dateToTimeSeries: widget.properties[3]
            })
        }, function (data) {
            if (data.errMsg) {
                console.warn(data.errMsg);
            } else {
                if (data.hasOwnProperty("timeseries")) {
                    timeseriesData = [];
                    $.each(data.timeseries, function (ignore, value) {
                        if (value[0] !== null) {
                            timeseriesData.push([value[1], value[0]]);
                        }
                    });
                    var $this = this;
                    text = indexName;
                    graphWidgetArray["widgetgraph_" + $this.indexVal] = createChart($this.indexVal, text, timeseriesData);
                } else {
                    console.warn("Wrong Data Returned");
                }
            }
        });
    } else if (widget.properties[0] === "getStats") {
        makeAjax({
            url: gateway + "/getStats",
            type: "POST",
            async: true,
            indexVal: widget.id,
            polyVal: $.parseJSON(projPairAOI),
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                paramType: collectionName,
                paramValue: $.parseJSON(projPairAOI)
            })
        }, function (data, _textStatus, _jqXHR) {
            if (data.errMsg) {
                console.warn(e.message + _textStatus + _jqXHR);
            } else {
                var $this = this;
                $("#totalPop_" + $this.indexVal).text(numberWithCommas(data.pop));
                $("#totalArea_" + $this.indexVal).text(calculateArea($this.polyVal) + " ha");
                $("#elevationRange_" + $this.indexVal).text(numberWithCommas(data.minElev) + " - " + numberWithCommas(data.maxElev) + " m");

            }
        });
    }
}
function fillDashboard(dashboard) {
    "use strict";
    $("#projectTitle").text(dashboard.projectTitle);

    dashboardID = dashboard.dashboardID;
    if (dashboard.widgets[0].id === "undefined" || dashboard.widgets[0].id === null) {
        try {
            dashboard.widgets = JSON.parse(dashboard.widgets);
        } catch (e) {
            console.warn("dashboard failed: " + e.message);
        }
    }
    dashboard.widgets.sort(function (a, b) {
        return parseFloat(a.position) - parseFloat(b.position);
    });
    if (dashboard.widgets !== null && dashboard.widgets.length > 0) {
        var rowDiv = null;
        dashboard.widgets.forEach(function (widget) {
            if (!rowDiv) {
                rowDiv = $("<div/>", {
                    "class": "row placeholders"
                });
            }
            rowDiv.append(addWidget(widget));
            pageWidgets.push(widget);
        });
        if (rowDiv) {
            $("#dashHolder").append(rowDiv);
        }
    }
    pageWidgets.forEach(function (widget) {
        initWidget(widget);
    });
    $(".input-daterange input").each(function () {
        try {
            $(this).datepicker({
                changeMonth: true,
                changeYear: true,
                dateFormat: "yy-mm-dd"
            });
        } catch (e) {
            console.warn(e.message);
        }
    });
}
function getParameterByName(name, url) {
    "use strict";
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(url);
    if (!results) {
        return null;
    }
    if (!results[2]) {
        return "";
    }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
function swapElements(obj1, obj2) {
    "use strict";
    obj1 = obj1.get(0);
    var temp = document.createElement("div");
    if (obj1.parentNode) {
        obj1.parentNode.insertBefore(temp, obj1);
    } else {
        obj1.parent().insertBefore(temp, obj1);
    }
    if (obj2.parentNode) {
        obj2.parentNode.insertBefore(obj1, obj2);
    } else {
        obj2.parent().insertBefore(obj1, obj2);
    }
    if (temp.parentNode) {
        temp.parentNode.insertBefore(obj2, temp);
        temp.parentNode.removeChild(temp);
    } else {
        temp.parent().insertBefore(obj2, temp);
        temp.parent().removeChild(temp);
    }
}
function makeAdjustable() {
    "use strict";
    $(".panel-fullscreen").click(function (e) {
        e.preventDefault();
        var $this = $(this);
        if ($this.children("i").hasClass("glyphicon-resize-full")) {
            $this.children("i").removeClass("glyphicon-resize-full");
            $this.children("i").addClass("glyphicon-resize-small");
        } else if ($this.children("i").hasClass("glyphicon-resize-small")) {
            $this.children("i").removeClass("glyphicon-resize-small");
            $this.children("i").addClass("glyphicon-resize-full");
        }
        $this.closest(".panel").toggleClass("panel-fullscreen");
        var theWidget = $this.parent().parent().parent().parent();
        swapElements(theWidget, document.getElementById("fullholder"));
        var width = 0;
        var height = 0;
        if (theWidget.children().children().children()[2].id.includes("widgetmap_")) {
            var mapdivid = "widgetmap_" + $(theWidget).attr("id").substring(7);
            if (wStateFull) {
                $(theWidget).css("height", "auto");
                $("#fulldiv").css("z-index", "0");
                $(theWidget).css("margin-bottom", "20px");
                $("#" + mapdivid).removeClass("fullmapwidget");
                $("#" + mapdivid).addClass("minmapwidget");
                $(theWidget.children()[1]).height("auto");
            } else {
                $("#content").scrollTop(0);
                $("#fulldiv").css("z-index", "1031");
                $(theWidget).css("height", "100%");
                $(theWidget).css("margin-bottom", "0");
                $("#" + mapdivid).removeClass("minmapwidget");
                $("#" + mapdivid).addClass("fullmapwidget");
                $(theWidget.children()[1]).height("100%");
            }
            wStateFull = !wStateFull;
            mapWidgetArray[mapdivid].updateSize();
        } else if (theWidget.children().children().children()[2].id.includes("widgetgraph_")) {
            var graphdivid = "widgetgraph_" + $(theWidget).attr("id").substring(7);
            if (wStateFull) {
                $(theWidget).css("height", "auto");
                $("#fulldiv").css("z-index", "0");
                $(theWidget).css("margin-bottom", "20px");
                $("#" + graphdivid).removeClass("fullmapwidget");
                $("#" + graphdivid).addClass("minmapwidget");
                $(theWidget.children()[1]).height("auto");
            } else {
                $("#content").scrollTop(0);
                $("#fulldiv").css("z-index", "1031");
                $(theWidget).css("height", "100%");
                $(theWidget).css("margin-bottom", "0");
                $("#" + graphdivid).removeClass("minmapwidget");
                $("#" + graphdivid).addClass("fullmapwidget");
                $(theWidget.children()[1]).height("100%");
            }
            width = $("#" + graphdivid).outerWidth();
            height = $("#" + graphdivid).outerHeight();
            wStateFull = !wStateFull;
            graphWidgetArray[graphdivid].setSize(width, height, true);
            completeGraph();
        } else if (theWidget.children().children().children()[2].id.includes("widgetstats_")) {
            var statsdivid = "widgetstats_" + $(theWidget).attr("id").substring(7);
            if (wStateFull) {
                $(theWidget).css("height", "auto");
                $("#fulldiv").css("z-index", "0");
                $(theWidget).css("margin-bottom", "20px");
                $("#" + statsdivid).removeClass("fullmapwidget");
                $("#" + statsdivid).addClass("minmapwidget");
            } else {
                $("#content").scrollTop(0);
                $("#fulldiv").css("z-index", "1031");
                $(theWidget).css("height", "100%");
                $(theWidget).css("margin-bottom", "0");
                $("#" + statsdivid).removeClass("minmapwidget");
                $("#" + statsdivid).addClass("fullmapwidget");
            }
            width = $("#" + statsdivid).outerWidth();
            height = $("#" + statsdivid).outerHeight();
            wStateFull = !wStateFull;
        }

    });
}
$(function () {
    "use strict";
    var pid = getParameterByName("pid");
    var title = getParameterByName("title");
    projAOI = getParameterByName("aoi");
    bradius = getParameterByName("bradius");
    bcenter = getParameterByName("bcenter");
    if (projAOI) {
        try {
            var theSplit = decodeURI(projAOI).replace("[", "").replace("]", "").split(",");
            projPairAOI = "[[" + theSplit[0] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[1] + "]]";
        } catch (e) {
            console.warn("missing projAOI" + e.message);
        }
    }
    makeAjax({
        url: theURL + "id/" + pid,
        type: "get",
        dataType: "jsonp",
        data: {
            title: title
        }
    }, function (response) {
        try {
            fillDashboard(response);
        } catch (e) {
            console.debug(e.message);
        }
        makeAdjustable();
    });
});
