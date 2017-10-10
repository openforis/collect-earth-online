var gpid;
var gurl;
var gmodcdash;
angular.module("geodash", []).controller("GeodashController", ["$http", function GeodashController($http) {
    this.debugme;
    this.theURL = "geo-dash/";
    //this.gateway = "http://gateway.servirglobal.net:8888";
	this.gateway = "http://ceo.sig-gis.com:8888";
    this.wCount = 0;
    this.wLoaded = 0;
    this.projAOI;
    this.projPairAOI;
    this.wStateFull = false;
    this.dashboardID;
    this.bradius;
    this.bcenter;
    this.mapWidgetArray = {};
    this.graphWidgetArray = {};
    this.pageWidgets = [];
    this.maxHeight = 284;
    this.sHeight = 0;
    var geodash = this;
    gmodcdash = this;
    this.mainWidgetTypes = [{ id: "ImageCollectionNDVI", name: "NDVI Image Collection" },
                                        { id: "NDVItimeSeriesGraph", name: "NDVI Graph" },
                                        { id: "ImageCollectionEVI", name: "EVI Image Collection" },
                                        { id: "EVItimeSeriesGraph", name: "EVI Graph" },
                                        { id: "ImageCollectionEVI2", name: "EVI2 Image Collection" },
                                        { id: "EVI2timeSeriesGraph", name: "EVI2 Graph" },
                                        { id: "ImageCollectionNDMI", name: "NDMI Image Collection" },
                                        { id: "NDMItimeSeriesGraph", name: "NDMI Graph" },
                                        { id: "ImageCollectionNDWI", name: "NDWI Image Collection" },
                                        { id: "NDWItimeSeriesGraph", name: "NDWI Graph" },
                                        { id: "getStats", name: "Statistics" },
                                        { id: "custom", name: "Custom widget" }];
    this.imageCollectionList = ["addImageCollection", "ndviImageCollection", "ImageCollectionNDVI", "ImageCollectionEVI", "ImageCollectionEVI2", "ImageCollectionNDWI", "ImageCollectionNDMI"];
    this.graphCollectionList = ["timeSeriesGraph", "ndviTimeSeries", "eviTimeSeries", "evi2TimeSeries", "ndmiTimeSeries", "ndwiTimeSeries"];
    this.initialize = function (documentRoot) {
        geodash = this;
        var pid = this.getParameterByName("pid");
        gpid = pid;
        var title = this.getParameterByName("title");
        this.projAOI = this.getParameterByName("aoi");
        this.bradius = this.getParameterByName("bradius");
        this.bcenter = this.getParameterByName("bcenter");
        console.info('top');
        if (geodash.projAOI) {
            try {
            console.info('inside');
                var theSplit = decodeURI(this.projAOI).replace("[", "").replace("]", "").split(",");
                console.info('split: ' + theSplit);
                this.projPairAOI = "[[" + theSplit[0] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[1] + "]]";
            } catch (e) {
                console.warn("missing projAOI" + e.message);
            }
        }
        console.info('out');
        this.makeAjax({
            url: this.theURL + "id/" + pid,
            type: "get",
            dataType: "jsonp",
            data: encodeURIComponent({ title: title })
        }, function (response) {
            try {
                geodash.fillDashboard(response);
            } catch (e) {
                console.debug(e.message);
            }
            geodash.makeAdjustable();
        });
    };
    this.completeGraph = function () {
        "use strict";
        this.pageWidgets.forEach(function (widget, index) {
            if (widget.properties[0] === "timeSeriesGraph") {
                try {
                    $("#widgetgraph_" + widget.id + " .highcharts-title").children()[0].innerHTML = widget.properties[4];
                    $("#widgetgraph_" + widget.id + " .highcharts-yaxis").children()[0].innerHTML = widget.properties[4];
                } catch (e) {
                    console.debug("Graph failed for: " + index + e.message);
                }
            }
        });
    };
    this.addBuffer = function (whichMap) {
        "use strict";
        try {
            var circle = new ol.geom.Circle(ol.proj.transform(JSON.parse(this.bcenter).coordinates, "EPSG:4326", "EPSG:3857"), this.bradius * 1);
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
    };
    this.createChart = function (wIndex, wText, wTimeseriesData) {
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
            geodash.completeGraph();
        });
    };
    this.numberWithCommas = function (x) {
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
    };
    this.calculateArea = function (poly) {
        "use strict";
        var sphere = new ol.Sphere(6378137);
        var coordinates = poly;
        var area_m = sphere.geodesicArea(coordinates);
        var area_ha = area_m / 10000;
        if (area_ha < 0) {
            area_ha = area_ha * -1;
        }
        return this.numberWithCommas(area_ha);
    };
    this.addWidget = function (widget) {
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
            var widgetcontainer = "";

            widgetcontainer = $("<div />", {
                "id": "widget-container_" + widget.id,
                "class": "widget-container"
            });
            front = $("<div />").addClass("front");

            wtext = widget.properties[0];
            var widgettitle = $("<h4 />", {
                "id": "widgettitle_" + widget.id
            }).html(widget.name);
            var sub = $("<br />");
            if (this.imageCollectionList.includes(wtext)) {
                var maddiv = $("<div/>", {
                    "id": "widgetmap_" + widget.id,
                    "class": "minmapwidget"
                });
                var opacityControl = $('<input />',
                {
                    "type":"range",
                    "class":"mapRange",
                    "id":"rangeWidget_" + widget.id,
                    "value": ".9",
                    "min":"0",
                    "max":"1",
                    "step":".01",
                    "onchange":"gmodcdash.setOpacity(this.value, 'widgetmap_" +widget.id+"')",
                    "oninput":"gmodcdash.setOpacity(this.value, 'widgetmap_" +widget.id+"')"
                }
                );
                maddiv.attr("style", "width:100%; min-height:200px;");
                front.append(maddiv).append(widgettitle).append(opacityControl).append(sub);
                widgetcontainer.append(front);
                panel.append(widgetcontainer);
            } else if (wtext === "timeSeriesGraph" || wtext === "ndviTimeSeries" || wtext === "ndwiTimeSeries" || wtext === "eviTimeSeries" || wtext === "evi2TimeSeries" || wtext === "ndmiTimeSeries") {
                var graphdiv = $("<div/>", {
                    "id": "widgetgraph_" + widget.id,
                    "class": "minmapwidget"
                });
                var graphcontainer = $("<div/>", {
                    "id": "graphcontainer_" + widget.id,
                    "class": "minmapwidget graphwidget"
                });
                graphdiv.append(graphcontainer);
                graphdiv.append(widgettitle).append(sub);
                front.append(graphdiv);
                widgetcontainer.append(front);
                panel.append(widgetcontainer);
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
                widgetcontainer.append(front);
                panel.append(widgetcontainer);
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
    };
    this.enableMapWidget = function (mapdiv) {
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
        this.mapWidgetArray[mapdiv] = map;
    };
    this.addTileServer = function (imageid, token, mapdiv) {
        "use strict";
        var googleLayer = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: "https://earthengine.googleapis.com/map/" + imageid + "/{z}/{x}/{y}?token=" + token
            }),
            id: mapdiv
        });
        // googleLayer.id = mapdiv;
        this.mapWidgetArray[mapdiv].addLayer(googleLayer);
        this.addBuffer(this.mapWidgetArray[mapdiv]);
    };
    this.setOpacity = function (value, layerID) {
        //var layer;
        var id = layerID; //"widgetmap_2";
        var theLayers = this.mapWidgetArray[layerID].getLayers().forEach(function (lyr) {
            if (id == lyr.get('id')) {
                lyr.setOpacity(value);
            }
        });
    };
    this.makeAjax = function (parameters, donefunction) {
        "use strict";
        console.info('parameters: ' + parameters);
        $.ajax(parameters).fail(function (jqXHR, textStatus, errorThrown) {
            console.warn("error from ajax call: " + jqXHR + textStatus + errorThrown);
        }).done(donefunction);
    };
    this.getWidgetHeight = function (aHeight) {
        "use strict";
        if (aHeight - 40 > this.maxHeight) {
            this.maxHeight = aHeight;
        }
        return this.maxHeight - 29;
    };
    this.initWidget = function (widget) {
        "use strict";
        $(".front").height(this.getWidgetHeight($("#widget_" + widget.id).height()));
        var collectionName;
        var timeseriesData;
        var text;
        console.info('widget.properties[0]' + widget.properties[0]);
        if (widget.properties[0] === "addImageCollection") {
            this.enableMapWidget("widgetmap_" + widget.id);
            if (this.projAOI === "") {
                this.projAOI = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
            } else {
                if (typeof this.projAOI === "string") {
                    this.projAOI = $.parseJSON(this.projAOI);
                }
            }
            if (this.projAOI) {
                this.mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                    ol.proj.transform([this.projAOI[0], this.projAOI[1]], "EPSG:4326", "EPSG:3857").concat(ol.proj.transform([this.projAOI[2], this.projAOI[3]], "EPSG:4326", "EPSG:3857")),
                    this.mapWidgetArray["widgetmap_" + widget.id].getSize()
                );
            } else {
                this.mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                    this.projAOI,
                    this.mapWidgetArray["widgetmap_" + widget.id].getSize()
                );
            }
            collectionName = widget.properties[1];
            var dateFrom = widget.properties[2];
            var dateTo = widget.properties[3];
            var url = this.gateway + "/imageByMosaicCollection";
            var bands = "";
            if (widget.properties.length === 5) {
                bands = widget.properties[4];
            }
            var min = "";
            var max = "0.3";
            try {
                if (widget.min > 0) {
                    min = widget.min;
                }

                if (widget.max > 0) {
                    max = widget.max;
                }
            }
            catch (e) { alert(0); }
            var visParams;
            visParams = {
                min: min,
                max: max,
                bands: bands
            };
            this.makeAjax({
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
                        geodash.addTileServer(mapId, token, "widgetmap_" + $this.indexVal);
                    } else {
                        console.warn("Wrong Data Returned");
                    }
                }
            });
        } else if (widget.properties[0] === "timeSeriesGraph") {
            collectionName = widget.properties[1];
            var indexName = widget.properties[4];
            $.ajax({
                            url: this.gateway + "/timeSeriesIndex",
                            type: "POST",
                            async: true,
                            indexVal: widget.id,
                            crossDomain: true,
                            contentType: "application/json",
                            data: JSON.stringify({
                                collectionNameTimeSeries: widget.properties[1],
                                polygon: $.parseJSON(this.projPairAOI),
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
                                    geodash.icameback = data;
                                    geodash.textStatus = _textStatus;
                                    geodash.jqXHR = _jqXHR;
                                    timeseriesData = [];
                                    $.each(data.timeseries, function (ignore, value) {
                                        if (value[0] !== null) {
                                            timeseriesData.push([value[0], value[1]]);
                                        }
                                    });
                                    var $this = this;
                                    text = indexName;
                                    geodash.graphWidgetArray["widgetgraph_" + $this.indexVal] = geodash.createChart($this.indexVal, text, timeseriesData);
                                } else {
                                    console.warn("Wrong Data Returned");
                                }
                            }
                        });
        } else if (widget.properties[0] === "getStats") {
        $.ajax({
                        url: this.gateway + "/getStats",
                        type: "POST",
                        async: true,
                        indexVal: widget.id,
                        polyVal: $.parseJSON(this.projPairAOI),
                        crossDomain: true,
                        contentType: "application/json",
                        data: JSON.stringify({
                            paramType: collectionName,
                            paramValue: $.parseJSON(this.projPairAOI)
                        })
                    }).fail(function (jqXHR, textStatus, errorThrown) {
                        console.warn(jqXHR + textStatus + errorThrown);
                    }).done(function (data, _textStatus, _jqXHR) {
                        geodash.statcameback = data;
                        if (data.errMsg) {
                            console.warn(e.message + _textStatus + _jqXHR);
                        } else {
                            var $this = this;
                            $("#totalPop_" + $this.indexVal).text(geodash.numberWithCommas(data.pop));
                            $("#totalArea_" + $this.indexVal).text(geodash.calculateArea($this.polyVal) + " ha");
                            $("#elevationRange_" + $this.indexVal).text(geodash.numberWithCommas(data.minElev) + " - " + geodash.numberWithCommas(data.maxElev) + " m");

                        }
                    });
        } else if (widget.properties[0] === "ndviImageCollection") {
            this.enableMapWidget("widgetmap_" + widget.id);
            if (this.projAOI === "") {
                this.projAOI = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
            } else {
                if (typeof this.projAOI === "string") {
                    this.projAOI = $.parseJSON(this.projAOI);
                }
            }
            if (this.projAOI) {
                this.mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                    ol.proj.transform([this.projAOI[0], this.projAOI[1]], "EPSG:4326", "EPSG:3857").concat(ol.proj.transform([this.projAOI[2], this.projAOI[3]], "EPSG:4326", "EPSG:3857")),
                    this.mapWidgetArray["widgetmap_" + widget.id].getSize()
                );
            } else {
                this.mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                    this.projAOI,
                    this.mapWidgetArray["widgetmap_" + widget.id].getSize()
                );
            }
            var dateFrom = widget.properties[2];
            var dateTo = widget.properties[3];
            this.makeAjax({
                url: this.gateway + "/ndviImageCollection",
                type: "POST",
                async: true,
                indexVal: widget.id,
                crossDomain: true,
                contentType: "application/json",
                data: JSON.stringify({
                    dateFrom: dateFrom,
                    dateTo: dateTo
                })
            }, function (data, _textStatus, _jqXHR) {
                if (data.errMsg) {
                    console.warn(data.errMsg + " " + _textStatus + _jqXHR);
                } else {
                    if (data.hasOwnProperty("mapid")) {
                        var mapId = data.mapid;
                        var token = data.token;
                        var $this = this;
                        geodash.addTileServer(mapId, token, "widgetmap_" + $this.indexVal);
                    } else {
                        console.warn("Wrong Data Returned");
                    }
                }
            });
        }
        else if(widget.properties[0] === "ndviTimeSeries"){
            this.getTimeSeriesByIndex('NDVI', widget);
        }
        else if(widget.properties[0] === "eviTimeSeries"){
            this.getTimeSeriesByIndex('EVI', widget);
        }
        else if(widget.properties[0] === "evi2TimeSeries"){
            this.getTimeSeriesByIndex('EVI2', widget);
        }
        else if(widget.properties[0] === "ndmiTimeSeries"){
            this.getTimeSeriesByIndex('NDMI', widget);
        }else if(widget.properties[0] === "ndwiTimeSeries"){
            this.getTimeSeriesByIndex('NDWI', widget);
        }
        else if (widget.properties[0] === "ImageCollectionNDVI") {
            this.getImageCollectionByIndex('ndvi', widget);
        }
        else if (widget.properties[0] === "ImageCollectionEVI") {
            this.getImageCollectionByIndex('evi', widget);
        }
        else if (widget.properties[0] === "ImageCollectionEVI2") {
            this.getImageCollectionByIndex('evi2', widget);
        }
        else if (widget.properties[0] === "ImageCollectionNDMI") {
            this.getImageCollectionByIndex('ndmi', widget);
        }
        else if (widget.properties[0] === "ImageCollectionNDWI") {
            this.getImageCollectionByIndex('ndwi', widget);
        }
    };
    this.getImageCollectionByIndex = function(which, widget){
        this.enableMapWidget("widgetmap_" + widget.id);
                 if (gmodcdash.projAOI === "") {
                     gmodcdash.projAOI = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
                 } else {
                     if (typeof gmodcdash.projAOI === "string") {
                         gmodcdash.projAOI = $.parseJSON(gmodcdash.projAOI);
                     }
                 }

                 if (gmodcdash.projAOI) {
                     gmodcdash.mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                         ol.proj.transform([gmodcdash.projAOI[0], gmodcdash.projAOI[1]], "EPSG:4326", "EPSG:3857").concat(ol.proj.transform([gmodcdash.projAOI[2], gmodcdash.projAOI[3]], "EPSG:4326", "EPSG:3857")),
                         gmodcdash.mapWidgetArray["widgetmap_" + widget.id].getSize()
                     );
                 } else {
                     gmodcdash.mapWidgetArray["widgetmap_" + widget.id].getView().fit(
                         gmodcdash.projAOI,
                         gmodcdash.mapWidgetArray["widgetmap_" + widget.id].getSize()
                     );
                 }
                 collectionName = widget.properties[1];
                 var dateFrom = widget.properties[2];
                 var dateTo = widget.properties[3];
                 //var url = gmodcdash.gateway + "/"+which+"ImageCollection";
                 var url = gmodcdash.gateway + "/ImageCollectionbyIndex";
                 var bands = "";
                 if (widget.properties.length === 5) {
                     bands = widget.properties[4];
                 }
                 /********************/
                 var min = "";
                 var max = "0.3";
                 try {
                     if (widget.min > 0) {
                         min = widget.min;
                     }

                     if (widget.max > 0) {
                         max = widget.max;
                     }
                 }
                 catch (e) { alert(0);}
                 var visParams = {
                     min: min,
                     max: max,
                     bands: bands
                 };
                 //alert(visParams.min + " - " + visParams.max);
                 var theGeometry = []

                 for(var p = 0; p < gmodcdash.projAOI.length; p++)
                 {

                    var nextIndex = 0;
                    if(p < gmodcdash.projAOI.length -1)
                    {
                        nextIndex = p + 1;
                    }
                    var aPoint = []
                    aPoint.push(gmodcdash.projAOI[p])
                    aPoint.push(gmodcdash.projAOI[nextIndex])
                    theGeometry.push(aPoint)
                 }
                 var fPoint = [];
                 fPoint.push(gmodcdash.projAOI[0]);
                 fPoint.push(gmodcdash.projAOI[1]);
                 theGeometry.push(fPoint);

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
                         dateTo: dateTo,
                         index: which,
                         geometry: theGeometry
                     })
                 }).fail(function (jqXHR, textStatus, errorThrown) {
                     console.info(jqXHR + textStatus + errorThrown);
                 }).done(function (data, _textStatus, _jqXHR) {
                     if (data.errMsg) {
                         console.info(data.errMsg);
                     } else {
                         if (data.hasOwnProperty("mapid")) {
                             geodash.icameback = data;
                             geodash.textStatus = _textStatus;
                             geodash.jqXHR = _jqXHR;
                             var mapId = data.mapid;
                             var token = data.token;
                             var $this = this;
                             geodash.addTileServer(mapId, token, "widgetmap_" + $this.indexVal);
                         } else {
                             console.warn("Wrong Data Returned");
                         }
                     }
                 });

    };
    this.getTimeSeriesByIndex = function(which, widget)
    {
        $.ajax({
            url: this.gateway + "/timeSeriesIndex2",
            type: "POST",
            async: true,
            indexVal: widget.id,
            crossDomain: true,
            contentType: "application/json",
            data: JSON.stringify({
                collectionNameTimeSeries: widget.properties[1],
                geometry: $.parseJSON(this.projPairAOI),
                indexName: which,
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
                    geodash.icameback = data;
                    geodash.textStatus = _textStatus;
                    geodash.jqXHR = _jqXHR;
                    timeseriesData = [];
                    $.each(data.timeseries, function (ignore, value) {
                        if (value[0] !== null) {
                            timeseriesData.push([value[0], value[1]]);
                        }
                    });
                    var $this = this;
                    text = which;
                    geodash.graphWidgetArray["widgetgraph_" + $this.indexVal] = geodash.createChart($this.indexVal, text, timeseriesData);
                } else {
                    console.warn("Wrong Data Returned");
                }
            }
        });
    };
    this.fillDashboard = function (dashboard) {
        "use strict";
        $("#projectTitle").text(dashboard.projectTitle);

        this.dashboardID = dashboard.dashboardID;
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
                rowDiv.append(geodash.addWidget(widget));
                geodash.pageWidgets.push(widget);
            });
            if (rowDiv) {
                $("#dashHolder").append(rowDiv);
            }
        }
        this.pageWidgets.forEach(function (widget) {
            geodash.initWidget(widget);
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
    };
    this.getParameterByName = function (name, url) {
        "use strict";
        if (!url) {
            url = window.location.href;
        }
        url = decodeURIComponent(url);
        gurl = url;
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
    };
    this.swapElements = function (obj1, obj2) {
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
    };
    this.makeAdjustable = function () {
        "use strict";
        console.info(10);
        $(".panel-fullscreen").click(function (e) {
            e.preventDefault();
            console.info(0);
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
            geodash.swapElements(theWidget, document.getElementById("fullholder"));
            var width = 0;
            var height = 0;
            if (geodash.wStateFull) {
                $("section#content").css('overflow', 'auto')
            }
            else{
                $("section#content").css('overflow', 'hidden')
            }
            var widID;
            var refreshType = null;
            if (theWidget.children().children().children()[2].id.includes("widgetmap_")) {
                widID = "widgetmap_" + $(theWidget).attr("id").substring(7);
                refreshType = "map";
            } else if (theWidget.children().children().children()[2].id.includes("widgetgraph_")) {
                widID = "widgetgraph_" + $(theWidget).attr("id").substring(7);
                refreshType = "graph";
            } else if (theWidget.children().children().children()[2].id.includes("widgetstats_")) {
                widID = "widgetstats_" + $(theWidget).attr("id").substring(7);
            }
            if (geodash.wStateFull) {
                $(theWidget).css("height", "auto");
                $("#fulldiv").css("z-index", "0");
                $(theWidget).css("margin-bottom", "20px");
                $("#" + widID).removeClass("fullmapwidget");
                $("#" + widID).addClass("minmapwidget");
                $(theWidget.children()[1]).height(geodash.sHeight);
            } else {
                $("#content").scrollTop(0);
                $("#fulldiv").css("z-index", "1031");
                $(theWidget).css("height", "100%");
                $(theWidget).css("margin-bottom", "0");
                $("#" + widID).removeClass("minmapwidget");
                $("#" + widID).addClass("fullmapwidget");
                geodash.sHeight = $(theWidget.children()[1]).height();
                $(theWidget.children()[1]).height("100%");
                $(theWidget.children()[1]).children().height("100%");
            }
            width = $("#" + widID).outerWidth();
            height = $("#" + widID).outerHeight();
            geodash.wStateFull = !geodash.wStateFull;
            if (refreshType !== null) {
                switch (refreshType) {
                    case "map":
                        geodash.mapWidgetArray[widID].updateSize();
                        break;
                    case "graph":
                        if(geodash.wStateFull)
                        {
                            $('#' + widID).removeClass("graphwidget");
                        }
                        else
                        {
                            $('#' + widID).addClass("graphwidget");
                        }
                        geodash.graphWidgetArray[widID].setSize(width, height, true);
                        //geodash.completeGraph();
                        window.setTimeout('gmodcdash.fixGraphSize('+widID+')', 550);
                        break;
                }
            }

        });
        console.info(11);
    };
    this.fixGraphSize = function(which)
    {
        width = $(which).outerWidth();
        height = $(which).outerHeight();
        console.info(width);
        geodash.graphWidgetArray[which.id].setSize(width, height, true)
    }
}]);

