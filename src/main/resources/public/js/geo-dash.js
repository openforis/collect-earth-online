/*jslint browser: true*/ /*global  $, console, window, getParameterByName, ol, Highcharts*/ /*  node: true */ /*jshint strict:false */

var debugme;
var theURL = "geo-dash/";
var gateway = "http://gateway.servirglobal.net:8888";
var wCount = 0;
var wLoaded = 0;
var projAOI;
var projPairAOI;
var wStateFull = false;
var theSplit;
var ajaxurl = "";
var title = "";
var dashboardID;
var bradius;
var bcenter;
var mapWidgetArray = {};
var graphWidgetArray = {};
/**********************debug variables remove before production******************************/
var iamthis;
var rowDiv = null;
var pageWidgets = [];
var icameback;
var textStatus;
var jqXHR;
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

        console.info("should have added buffer");
    } catch (e) {
        console.warn("buffer failed: " + e.message);
    }
}
var theDash;

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
var statcameback;
function numberWithCommas(x) {
    "use strict";
    try {
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    } catch (e) {
        console.warn(e.message);
    }
    return "N/A";
}
function calculateArea(poly) {
    "use strict";
    var sphere = new ol.Sphere(6378137);
    var coordinates = poly; //[[-105.30322265625, 22.33544921875], [-105.047900390625, 22.33544921875], [-105.047900390625, 23.53271484375], [-105.30322265625, 23.53271484375], [-105.30322265625, 22.33544921875]];
    var area_m = sphere.geodesicArea(coordinates);
    //var area_km = area_m / 1000 / 1000;
    var area_ha = area_m / 10000;
    if (area_ha < 0) {
        area_ha = area_ha * -1;
    }
    return numberWithCommas(area_ha);
}

function flipme(which) {
    "use strict";
    $("#" + which).flip("toggle");
    $("#" + which + " .back div.ctr").toggle();

}
var isAdmin = true;
function getEditForm(which, bandsupport) {
    "use strict";
    var theForm = $("<div />", {
        "class": "ctr"
    });
    var titlegroup = " <div class=\"form-group\"><label for=\"title_" + which.id + "\">Title:</label><input type=\"text\" class=\"form-control\" id=\"title_" + which.id + "\" value=\"" + which.name + "\" placeholder=\"Title\"></div>";
    var collectiongroup = "<div class=\"form-group\"><label for=\"collection_" + which.id + "\">Image Collection:</label><input type=\"text\" class=\"form-control\" id=\"collection_" + which.id + "\" placeholder=\"Image Collection\" value=\"" + which.properties[1] + "\"> </div>";
    var rangegroup = "<div class=\"input-group input-daterange\" id=\"range_" + which.id + "\"><input type=\"text\" class=\"form-control\"  value=\"" + which.properties[2] + "\" id=\"sDate_" + which.id + "\"><div class=\"input-group-addon\">to</div><input type=\"text\" class=\"form-control\" value=\"" + which.properties[3] + "\" id=\"eDate_" + which.id + "\">";
    var bandsgroup = "";
    if (bandsupport) {
        bandsgroup = "<div class=\"form-group\"><label for=\"bands_" + which.id + "\">Bands:(optional)</label> <input type=\"text\" placeholder=\"Columns\" id=\"bands_" + which.id + "\" name=\"bands_" + which.id + "\" value=\"" + which.properties[4] + "\" class=\"form-control\">";
    }
    var columns = 3;
    if (which.width) {
        columns = which.width;
    }
    var columnsgroup = "<div class=\"form-group\"><label for=\"columns_" + which.id + "\">Columns:</label><input type=\"text\" placeholder=\"Columns\" id=\"columns_" + which.id + "\" name=\"columns_" + which.id + "\" value=\"" + columns + "\" class=\"form-control\">";
    if (bandsgroup) {
        theForm.append(titlegroup).append(collectiongroup).append(rangegroup).append(bandsgroup).append(columnsgroup);
    } else {
        theForm.append(titlegroup).append(collectiongroup).append(rangegroup).append(columnsgroup);
    }

    theForm.append("<br><input type=\"submit\" id=\"savebutton_" + which.id + "\" value=\"Save\" class=\"btn btn-primary\" onclick=\"updatewidget(this)\"/> <input type=\"submit\" id=\"deletebutton_" + which.id + "\" value=\"Delete\" class=\"btn btn-primary\" onclick=\"deleteWidget(this)\"/>");

    return theForm;
}
function getTimeSeriesGraphForm(which) {
    "use strict";
    return getEditForm(which, false);
}
function getImageCollectionForm(which) {
    "use strict";
    return getEditForm(which, true);
}
function addWidget(widget) {
    "use strict";
    console.info(widget.name);

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
    if (isAdmin) {
        var clickcommand = "flipme(\"flip-container_" + widget.id + "\")";
        var toolfliptog = $("<li/>");
        var theflipbutton = $("<a/>", {
            "class": "list-inline panel-actions panel-flip",
            "onclick": clickcommand
        });
        var theflipicon = $("<i/>", {
            "class": "glyphicon glyphicon-cog"
        });
        theflipbutton.append(theflipicon);
        theflipbutton.attr("role", "button");
        theflipbutton.attr("title", "Toggle flip");
        toolfliptog.append(theflipbutton);
        toolsholder.append(toolfliptog);
    }
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
        if (isAdmin) {
            flippercontainer = $("<div />", {
                "id": "flip-container_" + widget.id,
                "class": "flip-container"
            }); //ontouchstart="this.classList.toggle("hover");">")

            front = $("<div />").addClass("front");
            back = $("<div />").addClass("back").html("this is the Admin side which will contain a form");

        }
        wtext = widget.properties[0];
        var widgettitle = $("<h4 />", {
            "id": "widgettitle_" + widget.id
        }).html(widget.name);
        var sub = $("<br />"); // $("<span />").addClass("text-muted").html(wtext);
        if (wtext === "addImageCollection") {
            var maddiv = $("<div/>", {
                "id": "widgetmap_" + widget.id,
                "class": "minmapwidget"
            });
            maddiv.attr("style", "width:100%; min-height:200px;");
            front.append(maddiv).append(widgettitle).append(sub);
            flippercontainer.append(front);
            back.html("");
            back.append(getImageCollectionForm(widget));
            flippercontainer.append(back);
            panel.append(flippercontainer);
        } else if (wtext === "timeSeriesGraph") {
            //build graph here
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
            back.append(getTimeSeriesGraphForm(widget));
            flippercontainer.append(back);
            panel.append(flippercontainer);
        } else if (wtext === "getStats") {

            var statsDiv = $("<div/>", {
                "id": "widgetstats_" + widget.id,
                "class": "minmapwidget"
            });
            var content = "<div><div class=\"form-group\"><div class=\"input-group\"><div class=\"input-group-addon\"><img src=\"img/icon_population.png\" style=\"width: 50px; height: 50px; border-radius: 25px; background-color: rgb(226, 132, 58);\"></div>";
            content += "  <label for=\"totalPop_" + widget.id + "\" style=\"color:#787878\">Total population</label>";
            content += "<h4 id=\"totalPop_" + widget.id + "\" style=\"color: #606060; font-size: 16px; font-weight: bold; \"></h4><img src=\"static/img/loading.gif\" id=\"loading-indicator-1\" style=\"display:none\" /></div></div>";
            content += "<div class=\"form-group\"><div class=\"input-group\"><div class=\"input-group-addon\"><img src=\"img/icon_area.png\" style=\"width: 50px; height: 50px; border-radius: 25px; background-color: rgb(226, 132, 58);\"></div>";
            content += "<label for=\"totalArea_" + widget.id + "\" style=\"color:#787878\">Area</label>";
            content += "<h4 id=\"totalArea_" + widget.id + "\" style=\"color: #606060; font-size: 16px; font-weight: bold; \"></h4><img src=\"static/img/loading.gif\" id=\"loading-indicator-1\" style=\"display:none\" /></div></div>";
            content += "<div class=\"form-group\"><div class=\"input-group\"><div class=\"input-group-addon\"><img src=\"img/icon_elevation.png\" style=\"width: 50px; height: 50px; border-radius: 25px; background-color: rgb(226, 132, 58);\"></div>";
            content += "<label for=\"elevationRange_" + widget.id + "\" style=\"color:#787878\">Elevation</label>";
            content += "<h4 id=\"elevationRange_" + widget.id + "\" style=\"color: #606060; font-size: 16px; font-weight: bold; \"></h4><img src=\"static/img/loading.gif\" id=\"loading-indicator-1\" style=\"display:none\" /></div></div>";

            statsDiv.append(content);
            statsDiv.append(title).append(sub);
            front.append(statsDiv);
            flippercontainer.append(front);
            flippercontainer.append(back);
            panel.append(flippercontainer);
        } else {
            img = $("<img>"); //Equivalent: $(document.createElement("img"))
            img.attr("src", "data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==");
            img.attr("width", "200");
            img.attr("height", "200");
            img.addClass("img-responsive");
            panel.append(img).append(title).append(sub);
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
            projection: "EPSG:3857", //4326",
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
function fillDashboard(dashboard) {
    "use strict";
    $("#projectTitle").text(dashboard.projectTitle);
    wCount = 0;
    theDash = dashboard;
    dashboardID = dashboard.dashboardID;
    try {
        dashboard.widgets = JSON.parse(dashboard.widgets);
    } catch (e) {
        console.warn("dashboard failed: " + e.message);
    }
    if (dashboard.widgets !== null && dashboard.widgets.length > 0) {
        rowDiv = null;
        dashboard.widgets.forEach(function (widget, index) {
            if (widget.width) {
                /*   FIX THIS  */
                console.info("is this fixed?" + index);
            } else {
                if (wCount % 4 === 0) {//beginning a new row
                    if (rowDiv) {
                        $("#dashHolder").append(rowDiv);
                    }
                    rowDiv = $("<div/>", {
                        "class": "row placeholders"
                    });
                }
            }
            if (!rowDiv) {
                rowDiv = $("<div/>", {
                    "class": "row placeholders"
                });
            }
            rowDiv.append(addWidget(widget));
            pageWidgets.push(widget);
            wCount += 1;
        });
        if (rowDiv) {
            $("#dashHolder").append(rowDiv);
        }
    }
    var collectionName;
    var timeseriesData = [];
    var text;
    pageWidgets.forEach(function (widget) {
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
                if (typeof projAOI === 'string') {
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
            console.info(bands);
            var visParams = {
                min: "",
                max: "0.3",
                bands: bands
            };
            $.ajax({
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
            }).fail(function (jqXHR, textStatus, errorThrown) {
                console.info(jqXHR + textStatus + errorThrown);
            }).done(function (data, _textStatus, _jqXHR) {
                if (data.errMsg) {
                    console.info(data.errMsg);
                } else {
                    if (data.hasOwnProperty("mapid")) {
                        icameback = data;
                        textStatus = _textStatus;
                        jqXHR = _jqXHR;
                        console.warn("Data Returned");
                        var mapId = data.mapid;
                        var token = data.token;
                        var $this = this;
                        addTileServer(mapId, token, "widgetmap_" + $this.indexVal);// + pageWidgets[i].id);
                    } else {
                        console.warn("Wrong Data Returned");
                    }
                }
            });
        } else if (widget.properties[0] === "timeSeriesGraph") {
            collectionName = widget.properties[1];
            //var dateFrom = pageWidgets[i].properties[2];
            //var dateTo = pageWidgets[i].properties[3];
            var indexName = widget.properties[4];
            //var polygon = eval(projPairAOI); //eval(pageWidgets[i].properties[5]);
            //var url = gateway + "/timeSeriesIndex";//http://54.186.177.52:8888/timeSeriesIndex";
            $.ajax({
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
            }).fail(function (jqXHR, textStatus, errorThrown) {
                console.warn(jqXHR + textStatus + errorThrown);
            }).done(function (data, _textStatus, _jqXHR) {
                if (data.errMsg) {
                    console.warn(data.errMsg);
                } else {
                    if (data.hasOwnProperty("timeseries")) {
                        icameback = data;
                        textStatus = _textStatus;
                        jqXHR = _jqXHR;
                        console.warn("Data Returned");
                        timeseriesData = [];
                        $.each(data.timeseries, function (index, value) {
                            if (value[0] !== null) {
                                timeseriesData.push([value[1], value[0]]);
                            } else {
                                console.info(index);
                            }
                        });
                        var $this = this;
                        text = indexName;
                        console.info("Creating :widgetgraph_" + $this.indexVal);
                        graphWidgetArray["widgetgraph_" + $this.indexVal] = createChart($this.indexVal, text, timeseriesData);
                    } else {
                        console.warn("Wrong Data Returned");
                    }
                }
            });
        } else if (widget.properties[0] === "getStats") {
            //var paramType = pageWidgets[i].properties[1];
            //var polygon = eval(projPairAOI); //eval(pageWidgets[i].properties[2]);
            //var url = gateway + "/getStats"; //http://54.186.177.52:8888/getStats";
            $.ajax({
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
            }).fail(function (jqXHR, textStatus, errorThrown) {
                console.warn(jqXHR + textStatus + errorThrown);
            }).done(function (data, _textStatus, _jqXHR) {
                statcameback = data;
                if (data.errMsg) {
                    console.warn(e.message + _textStatus + _jqXHR);
                } else {
                    //put stats on page
                    var $this = this;
                    $("#totalPop_" + $this.indexVal).text(numberWithCommas(data.pop));
                    $("#totalArea_" + $this.indexVal).text(calculateArea($this.polyVal) + " ha");
                    $("#elevationRange_" + $this.indexVal).text(numberWithCommas(data.minElev) + " - " + numberWithCommas(data.maxElev) + " m");

                }
            });
        }
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
function imageCollectionAJAX(url, id, collectionName, visParams, dateFrom, dateTo) {
    "use strict";
    $.ajax({
        url: url,
        type: "POST",
        async: true,
        indexVal: id,
        crossDomain: true,
        contentType: "application/json",
        data: JSON.stringify({
            collectionName: collectionName,
            visParams: visParams,
            dateFrom: dateFrom,
            dateTo: dateTo
        })
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.warn("error from imageCollection: " + jqXHR + textStatus + errorThrown);
    }).done(function (data, _textStatus, _jqXHR) {
        if (data.errMsg) {
            console.warn("error from imageCollection: " + data.errMsg);
        } else {
            if (data.hasOwnProperty("mapid")) {
                icameback = data;
                textStatus = _textStatus;
                jqXHR = _jqXHR;
                console.warn("Data Returned");
                var mapId = data.mapid;
                var token = data.token;
                addTileServer(mapId, token, "widgetmap_" + this.indexVal);
            } else {
                console.warn("Wrong Data Returned");
            }
        }
    });
}
function createWidget(which)
{
    "use strict";
    pageWidgets.sort(function (a, b) {
        return parseInt(a.id) - parseInt(b.id);
    });
    var id = pageWidgets[pageWidgets.length - 1].id + 1
    var outWidget = { "name": "NDWI", "width": "3", "id": id, "properties": ["timeSeriesGraph", "LANDSAT/LE7_L1T_32DAY_NDWI", "2015-01-01", "2016-01-01", "NDWI", ""] };
    //var outWidget = { "id": id, "name": "LANDSAT7 TOA", "properties": ["addImageCollection", "LANDSAT/LE7_L1T_32DAY_TOA", "2006-01-01", "2016-01-01", "B5, B4, B3"], "width": "3" };
    console.info("will create " + which);
    ajaxurl = theURL + "createwidget/widget";
    $.ajax({
        url: ajaxurl, //theURL + "id/" + pid,
        type: "get", //send it through get method
        dataType: "jsonp",
        data: {
            dashID: dashboardID,
            widgetJSON: JSON.stringify(outWidget)
        },
        success: function () {
            //update the widget with new params;
            // updateWidgetUI(this.indexVal);
            pageWidgets.push(outWidget);
            console.warn("Back from create");
        },
        error: function (xhr) {
            //Do Something to handle error
            debugme = xhr;
            //alert("error");
        }
    });
}
function updateWidgetUI(which) {
    "use strict";
    var widgetID = which;
    var updatingWidget;
    pageWidgets.forEach(function (widget) {
        if (parseInt(widget.id) === parseInt(widgetID)) {
            updatingWidget = widget;
            return;
        }
    });
    if (updatingWidget.properties[0] === "addImageCollection") {
        var themap = mapWidgetArray["widgetmap_" + widgetID];
        themap.removeLayer(themap.getLayers().getArray()[1]);

        var collectionName = $("#collection_" + widgetID).val();
        var dateFrom = $("#sDate_" + widgetID).val();
        var dateTo = $("#eDate_" + widgetID).val();
        var url = gateway + "/imageByMosaicCollection";
        var bands = "";
        if ($("#bands_" + widgetID).val().length > 1) {
            bands = $("#bands_" + widgetID).val();
        }
        console.info(bands);
        var visParams = {
            min: "",
            max: "0.3",
            bands: bands
        };
        //update text as well
        $("#widgettitle_" + widgetID).html($("#title_" + widgetID).val());
        imageCollectionAJAX(url, widgetID, collectionName, visParams, dateFrom, dateTo);
    }
    else {
        console.info("I have to write this");
    }
}
function sendUpdate(id, wjson) {
    "use strict";
    ajaxurl = theURL + "updatewidget/widget/" + id;
    $.ajax({
        url: ajaxurl, //theURL + "id/" + pid,
        type: "get", //send it through get method
        dataType: "jsonp",
        indexVal: id,
        data: {
            dashID: dashboardID,
            widgetJSON: wjson
        },
        success: function () {
            //update the widget with new params;
            updateWidgetUI(this.indexVal);
            console.warn("Back from update");
        },
        error: function (xhr) {
            //Do Something to handle error
            debugme = xhr;
            //alert("error");
        }
    });
}
var needit;
function updatewidget(which) {
    "use strict";
    var widgetID = which.id.replace("savebutton_", "");
    var updatingWidget;
    var outWidget;
    //for ( i = 0; i < pageWidgets.length; i++) {
    //    if (pageWidgets[i].id == widgetID) {
    //        updatingWidget = pageWidgets[i];
    //        break;
    //    }
    //}
    needit = widgetID;
    pageWidgets.forEach(function (widget) {
        if (parseInt(widget.id) === parseInt(widgetID)) {
            updatingWidget = widget;
            return;
        }
    }); if (updatingWidget.properties[0] === "getStats") {
        console.info("i need to write this");
    }
    else {
        var newProperties = [];
        outWidget = {};
        newProperties.push(updatingWidget.properties[0]);

        var collection = $("#collection_" + widgetID).val();
        newProperties.push(collection);


        var startDate = $("#sDate_" + widgetID).val();
        newProperties.push(startDate);
        var endDate = $("#eDate_" + widgetID).val();
        newProperties.push(endDate);
        var wtitle = $("#title_" + widgetID).val();
        if (updatingWidget.properties[0] === "addImageCollection") {
            var bands = $("#bands_" + widgetID).val();
            newProperties.push(bands);
        }
        else {
            newProperties.push(wtitle);
        }
        
        
        var columns = $("#columns_" + widgetID).val();
        outWidget.id = parseInt(widgetID);
        outWidget.name = wtitle;
        outWidget.properties = newProperties;
        outWidget.width = columns;

        var wjson = JSON.stringify(outWidget);
        sendUpdate(widgetID, wjson);
        //dashboardID
    }
    // else if (updatingWidget.properties[0] === "timeSeriesGraph") {
    //    console.info("i need to write this");
    //} else if (updatingWidget.properties[0] === "getStats") {
    //    console.info("i need to write this");
    //}
}
Array.prototype.removeValue = function (name, value) {
    var array = $.map(this, function (v, i) {
        return v[name] === value ? null : v;
    });
    this.length = 0; //clear original array
    this.push.apply(this, array); //push all elements except the one we want to delete
}
Array.prototype.grabElement = function (name, value) {
    var array = $.map(this, function (v, i) {
        return v[name] === value ? v : null;
    });
    return array[0];
}
function removeWidgetFromUI(wID) {
    "use strict";
    wID = parseInt(wID);
    if (pageWidgets.grabElement('id', wID).properties[0] === "addImageCollection")
    {
        delete graphWidgetArray["widgetmap_" + wID];
    }
    else if (pageWidgets.grabElement('id', wID).properties[0] === "timeSeriesGraph")
    {
        delete graphWidgetArray["widgetgraph_" + wID];
    }
    $("#widget_" + wID).parent().remove();
    pageWidgets.removeValue('id', wID);
}
function deleteWidget(which) {
    "use strict";
    var widgetID = which.id.replace("deletebutton_", "");
    console.info("will delete " + widgetID);
    removeWidgetFromUI(widgetID);
    ajaxurl = theURL + "deletewidget/widget/" + widgetID;
    $.ajax({
        url: ajaxurl, //theURL + "id/" + pid,
        type: "get", //send it through get method
        dataType: "jsonp",
        data: {
            dashID: dashboardID
        },
        success: function () {
            //update the widget with new params;
            // updateWidgetUI(this.indexVal);
            console.warn("Back from delete");
        },
        error: function (xhr) {
            //Do Something to handle error
            debugme = xhr;
            //alert("error");
        }
    });
}
/*******************Utilities**********************************/
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
    // create marker element and insert it where obj1 is
    obj1 = obj1.get(0);
    var temp = document.createElement("div");
    if (obj1.parentNode) {
        obj1.parentNode.insertBefore(temp, obj1);
    } else {
        obj1.parent().insertBefore(temp, obj1);
    }
    if (obj2.parentNode) {
        // move obj1 to right before obj2
        obj2.parentNode.insertBefore(obj1, obj2);
    } else {
        obj2.parent().insertBefore(obj1, obj2);
    }
    if (temp.parentNode) {
        // move obj2 to right before where obj1 used to be
        temp.parentNode.insertBefore(obj2, temp);
        // remove temporary marker node
        temp.parentNode.removeChild(temp);
    } else {
        temp.parent().insertBefore(obj2, temp);
        // remove temporary marker node
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
        iamthis = $this;
        var theWidget = $this.parent().parent().parent().parent();
        swapElements(theWidget, document.getElementById("fullholder"));
        var width = 0;
        var height = 0;
        if (theWidget.children().children().children()[2].id.includes("widgetmap_")) {
            var mapdivid = "widgetmap_" + $(theWidget).attr("id").substring(7);
            if (wStateFull) {
                // minimize css
                $(theWidget).css("height", "auto");
                $("#fulldiv").css("z-index", "0");
                $(theWidget).css("margin-bottom", "20px");
                $("#" + mapdivid).removeClass("fullmapwidget");
                $("#" + mapdivid).addClass("minmapwidget");
                $(theWidget.children()[1]).height("auto");
            } else {
                //maximize css
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
            /*********************resize the graph here*****************************/
            if (wStateFull) {
                // minimize css
                $(theWidget).css("height", "auto");
                $("#fulldiv").css("z-index", "0");
                $(theWidget).css("margin-bottom", "20px");
                $("#" + graphdivid).removeClass("fullmapwidget");
                $("#" + graphdivid).addClass("minmapwidget");
                $(theWidget.children()[1]).height("auto");
            } else {
                //maximize css
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
                // minimize css
                $(theWidget).css("height", "auto");
                $("#fulldiv").css("z-index", "0");
                $(theWidget).css("margin-bottom", "20px");
                $("#" + statsdivid).removeClass("fullmapwidget");
                $("#" + statsdivid).addClass("minmapwidget");
            } else {
                //maximize css
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
/*********************init********************************/
$(function () {
    "use strict";
    var pid = getParameterByName("pid");
    title = getParameterByName("title");
    projAOI = getParameterByName("aoi");
    bradius = getParameterByName("bradius");
    bcenter = getParameterByName("bcenter");
    if (projAOI) {
        try {
            theSplit = decodeURI(projAOI).replace("[", "").replace("]", "").split(",");
            projPairAOI = "[[" + theSplit[0] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[1] + "]]";
        } catch (e) {
            console.warn("missing projAOI" + e.message);
        }
    }
    ajaxurl = theURL + "id/" + pid;
    $.ajax({
        url: ajaxurl, //theURL + "id/" + pid,
        type: "get", //send it through get method
        dataType: "jsonp",
        data: {
            title: title
        },
        success: function (response) {
            debugme = response;
            fillDashboard(response);
            makeAdjustable();
        },
        error: function (xhr) {
            //Do Something to handle error
            debugme = xhr;
            //alert("error");
        }
    });
});
function tryMeNow() {
    "use strict";
    $.ajax({
        url: ajaxurl, //theURL + "id/" + pid,
        type: "post", //send it through get method
        dataType: "jsonp",
        data: {
            title: title
        },
        success: function (response) {
            debugme = response;
            fillDashboard(response);
            makeAdjustable();
        },
        error: function (xhr) {
            //Do Something to handle error
            debugme = xhr;
            console.warn("error" + debugme);
        }
    });
}