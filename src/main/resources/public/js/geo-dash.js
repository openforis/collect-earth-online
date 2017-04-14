var debugme;
var theURL = "geo-dash/"; //"http://localhost:4567/dashboard/";
var wCount = 0;
var wLoaded = 0;
var projAOI;
var projPairAOI;
var wStateFull = false;
var theSplit;
var ajaxurl = '';
var title = '';

$(function () {
    var pid = getParameterByName('pid');
    title = getParameterByName('title');
    projAOI = getParameterByName('aoi');
    if (projAOI) {
        try {
            theSplit = decodeURI(projAOI).replace('[','').replace(']','').split(',');
            projPairAOI = "[[" + theSplit[0] + "," + theSplit[1] + "],[" + theSplit[2] + ","
                        + theSplit[1] + "],[" + theSplit[2] + "," + theSplit[3] + "],[" + theSplit[0]
                        + "," + theSplit[3] + "],[" + theSplit[0] + "," + theSplit[1] + "]]";
        } catch (e) { }
    }
    ajaxurl = theURL + "id/" + pid;
    $.ajax({
        url: ajaxurl, //theURL + "id/" + pid,
        type: "get", //send it through get method
        dataType: 'jsonp',
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
            alert("error");
        }
    });
});

function tryMeNow() {
    $.ajax({
        url: ajaxurl, //theURL + "id/" + pid,
        type: "post", //send it through get method
        dataType: 'jsonp',
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
            alert("error");
        }
    });
}

var iamthis;

function makeAdjustable() {
    $(".panel-fullscreen").click(function (e) {
        console.info("****************************Clicked*********************");
        e.preventDefault();

        var $this = $(this);

        if ($this.children('i').hasClass('glyphicon-resize-full')) {
            $this.children('i').removeClass('glyphicon-resize-full');
            $this.children('i').addClass('glyphicon-resize-small');
        } else if ($this.children('i').hasClass('glyphicon-resize-small')) {
            $this.children('i').removeClass('glyphicon-resize-small');
            $this.children('i').addClass('glyphicon-resize-full');
        }
        $(this).closest('.panel').toggleClass('panel-fullscreen');
        iamthis = $this;
        var theWidget = $this.parent().parent().parent().parent();
        swapElements(theWidget, document.getElementById("fullholder"));
        //if (theWidget.children('div')[1].id.includes('widgetmap_')) {
        if (theWidget.children().children().children()[2].id.includes('widgetmap_')) {

            var mapdivid = 'widgetmap_' + $(theWidget).attr('id').substring(7);
            console.info('************adjust map image widget************************');

            if (wStateFull) {
                // minimize css
                $(theWidget).css('height', 'auto');
                $("#fulldiv").css('z-index', '0');
                $(theWidget).css('margin-bottom', '20px');
                $("#" + mapdivid).removeClass('fullmapwidget');
                $("#" + mapdivid).addClass('minmapwidget');
                $(theWidget.children()[1]).height('auto');
            } else {
                //maximize css
                $("#fulldiv").css('z-index', '1031');
                $(theWidget).css('height', '100%');
                $(theWidget).css('margin-bottom', '0');
                $("#" + mapdivid).removeClass('minmapwidget');
                $("#" + mapdivid).addClass('fullmapwidget');
                $(theWidget.children()[1]).height('100%');
            }
            wStateFull = !wStateFull;
            mapWidgetArray[mapdivid].updateSize();
        } else if (theWidget.children().children().children()[2].id.includes('widgetgraph_')) {
            var graphdivid = 'widgetgraph_' + $(theWidget).attr('id').substring(7);

            console.info('************adjust graph widget************************');
            /*********************resize the graph here*****************************/

            var width = 0;
            var height = 0;

            if (wStateFull) {
                // minimize css
                $(theWidget).css('height', 'auto');
                $("#fulldiv").css('z-index', '0');
                $(theWidget).css('margin-bottom', '20px');
                $("#" + graphdivid).removeClass('fullmapwidget');
                $("#" + graphdivid).addClass('minmapwidget');
                $(theWidget.children()[1]).height('auto');
            } else {
                //maximize css
                $("#fulldiv").css('z-index', '1031');
                $(theWidget).css('height', '100%');
                $(theWidget).css('margin-bottom', '0');
                $("#" + graphdivid).removeClass('minmapwidget');
                $("#" + graphdivid).addClass('fullmapwidget');
                $(theWidget.children()[1]).height('100%');
            }
            width = $("#" + graphdivid).outerWidth();
            height = $("#" + graphdivid).outerHeight();
            wStateFull = !wStateFull;
            graphWidgetArray[graphdivid].setSize(width, height, doAnimation = true);
            completeGraph();
        } else if (theWidget.children().children().children()[2].id.includes('widgetstats_')) {
            var statsdivid = 'widgetstats_' + $(theWidget).attr('id').substring(7);
            var width = 0;
            var height = 0;

            if (wStateFull) {
                // minimize css
                $(theWidget).css('height', 'auto');
                $("#fulldiv").css('z-index', '0');
                $(theWidget).css('margin-bottom', '20px');
                $("#" + statsdivid).removeClass('fullmapwidget');
                $("#" + statsdivid).addClass('minmapwidget');
            } else {
                //maximize css
                $("#fulldiv").css('z-index', '1031');
                $(theWidget).css('height', '100%');
                $(theWidget).css('margin-bottom', '0');
                $("#" + statsdivid).removeClass('minmapwidget');
                $("#" + statsdivid).addClass('fullmapwidget');
            }
            width = $("#" + statsdivid).outerWidth();
            height = $("#" + statsdivid).outerHeight();
            wStateFull = !wStateFull;
        }

    });
}

var rowDiv = null;
var pageWidgets = [];
var icameback;
var textStatus, jqXHR;

function completeGraph() {
    for (var i = 0; i < pageWidgets.length; i++) {
        if (pageWidgets[i].properties[0] == 'addImageCollection') {
            //return;
        } else if (pageWidgets[i].properties[0] == 'timeSeriesGraph') {
            try {
                var graphname = pageWidgets[i].properties[4];
                var title = $('#widgetgraph_' + pageWidgets[i].id + ' .highcharts-title').children()[0]
                title.innerHTML = graphname
                var yaxis = $('#widgetgraph_' + pageWidgets[i].id + ' .highcharts-yaxis').children()[0]
                yaxis.innerHTML = graphname
            } catch(e) { }
        }
    }
}

function fillDashboard(dashboard) {
    $("#projectTitle").text(dashboard.projectTitle);
    var colCount = 0;
    wCount = 0;

    if (dashboard.widgets != null && dashboard.widgets.length > 0) {
        rowDiv = null;

        for (var i = 0; i < dashboard.widgets.length; i++) {
            if (dashboard.widgets[i].width) {
                /*   FIX THIS  */
            } else {
                if (wCount % 4 == 0) { //beginning a new row
                    if (rowDiv) {
                        $("#dashHolder").append(rowDiv);
                    }
                    rowDiv = $('<div/>', { "class": "row placeholders" });
                }
            }

            if (!rowDiv) {
                rowDiv = $('<div/>', { "class": "row placeholders" });
            }

            rowDiv.append(addWidget(dashboard.widgets[i]));
            pageWidgets.push(dashboard.widgets[i]);
            wCount++;
        }

        if (rowDiv) {
            $("#dashHolder").append(rowDiv);
        }
    }

    for (var i = 0; i < pageWidgets.length; i++) {
        // check if they are addImageCollection, if so enable
        //
        // add tileserver
        // zoom to location

        try {
            $("#flip-container_" + pageWidgets[i].id).flip({
                trigger: 'manual'
            });
        } catch (e) { }

        try {
            $(".back").height($("#widget_" + pageWidgets[i].id).height());
        } catch (e) { }
        //widget_0

        if (pageWidgets[i].properties[0] == 'addImageCollection') {
            enableMapWidget('widgetmap_' + pageWidgets[i].id);

            var minLng = -108.30322265625;
            var minLat = 21.33544921875;
            var maxLng = -105.347900390625;
            var maxLat = 23.53271484375;
            //[-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375]  //california sample
            //[-86.93115, 34.86516, -86.413707, 34.538107]  //huntsville sample
            //var extent =

            if (projAOI == "") {
                projAOI = [-108.30322265625, 21.33544921875, -105.347900390625, 23.53271484375];
            } else {
                projAOI = eval(projAOI);
            }

            var theMap = mapWidgetArray['widgetmap_' + pageWidgets[i].id]; // + pageWidgets[i].id]

            if (projAOI) {
                theMap.getView().fit(
                    projAOI,
                    theMap.getSize()
                );
            } else {
                theMap.getView().fit(
                    projAOI,
                    theMap.getSize()
                );
            }

            var collectionName = pageWidgets[i].properties[1];
            var dateFrom = pageWidgets[i].properties[2];
            var dateTo = pageWidgets[i].properties[3];
            var url = "http://54.186.177.52:8888/imageByMosaicCollection";
            var bands = '';

            if (pageWidgets[i].properties.length == 5) {
                bands = pageWidgets[i].properties[4];
            }

            console.info(bands);

            var visParams = {
                min: '',
                max: '0.3',
                bands: bands
            };

            $.ajax({
                url: url,
                type: 'POST',
                async: true,
                indexVal : i,
                crossDomain: true,
                contentType: 'application/json',
                data: JSON.stringify({
                    collectionName: collectionName,
                    visParams: visParams,
                    dateFrom: dateFrom,
                    dateTo: dateTo
                })
            }).fail(function (jqXHR, textStatus, errorThrown) {
                alert(textStatus);
            }).done(function (data, _textStatus, _jqXHR) {
                if (data.errMsg) {
                    alert(data.errMsg);
                } else {
                    if (data.hasOwnProperty('mapid')) {
                        icameback = data;
                        textStatus = _textStatus;
                        jqXHR = _jqXHR;
                        console.warn('Data Returned');
                        var mapId = data.mapid;
                        var token = data.token;
                        addTileServer(mapId, token, 'widgetmap_' + this.indexVal); // + pageWidgets[i].id);
                    } else {
                        console.warn('Wrong Data Returned');
                    }
                }
            });
        } else if(pageWidgets[i].properties[0] == 'timeSeriesGraph') {
            var collectionName = pageWidgets[i].properties[1];
            var dateFrom = pageWidgets[i].properties[2];
            var dateTo = pageWidgets[i].properties[3];
            var indexName = pageWidgets[i].properties[4];
            var polygon = eval(projPairAOI); //eval(pageWidgets[i].properties[5]);
            var url = "http://54.186.177.52:8888/timeSeriesIndex";

            $.ajax({
                url: url,
                type: 'POST',
                async: true,
                indexVal: i,
                crossDomain: true,
                contentType: 'application/json',
                data: JSON.stringify({
                    collectionNameTimeSeries: collectionName,
                    polygon: polygon,
                    indexName: indexName,
                    visParams: visParams,
                    dateFromTimeSeries: dateFrom,
                    dateToTimeSeries: dateTo
                })
            }).fail(function (jqXHR, textStatus, errorThrown) {
                alert(textStatus);
            }).done(function (data, _textStatus, _jqXHR) {
                if (data.errMsg) {
                    alert(data.errMsg);
                } else {
                    if (data.hasOwnProperty('timeseries')) {
                        icameback = data;
                        textStatus = _textStatus;
                        jqXHR = _jqXHR;
                        console.warn('Data Returned');
                        timeseriesData = [];
                        $.each(data.timeseries, function (index, value) {
                            if (value[0] != null) {
                                timeseriesData.push([value[1], value[0]]);
                            }
                        });
                        text = indexName;
                        console.info('Creating :widgetgraph_' + this.indexVal);
                        graphWidgetArray['widgetgraph_' + this.indexVal] = Highcharts.chart('graphcontainer_' + this.indexVal, {
                            chart: {
                                zoomType: 'x'
                            },
                            title: {
                                text: text
                            },
                            subtitle: {
                                text: document.ontouchstart === undefined ? 'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
                            },
                            xAxis: {
                                type: 'datetime'
                            },
                            yAxis: {
                                title: {
                                    text: text
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
                                            [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
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
                            tooltip : {
                                pointFormat: 'Value: {point.y}'
                            },
                            series: [{
                                type: 'area',
                                name: text,
                                data: timeseriesData
                            }]
                        }, function (chart) {
                            completeGraph();
                        });
                    } else {
                        console.warn('Wrong Data Returned');
                    }
                }
            });
        } else if (pageWidgets[i].properties[0] == 'getStats') {
            var paramType = pageWidgets[i].properties[1];
            var polygon = eval(projPairAOI); //eval(pageWidgets[i].properties[2]);
            console.info('***************' + paramType + '****************************');
            console.info('***************' + polygon + '****************************');
            var url = "http://54.186.177.52:8888/getStats";
            $.ajax({
                url: url,
                type: 'POST',
                async: true,
                indexVal: i,
                polyVal: polygon,
                crossDomain: true,
                contentType: 'application/json',
                data: JSON.stringify({
                    paramType: collectionName,
                    paramValue: polygon
                })
            }).fail(function (jqXHR, textStatus, errorThrown) {
                alert(textStatus + 'what');
            }).done(function (data, _textStatus, _jqXHR) {
                statcameback = data;
                if (data.errMsg) {
                    alert(data.errMsg);
                } else {
                    //put stats on page
                    $('#totalPop_' + this.indexVal).text(numberWithCommas(data.pop));
                    $('#totalArea_' + this.indexVal).text(calculateArea(this.polyVal) + ' ha');
                    $('#elevationRange_' + this.indexVal).text(numberWithCommas(data.minElev) + ' - ' + numberWithCommas(data.maxElev) + ' m');
                }
            });
        }
    }

    //a74a24f2a0c84ce1111e34818cc06318
    //c4739ba8174f2c096a6447b144a8b5a1
    //addTileServer('a74a24f2a0c84ce1111e34818cc06318', 'c4739ba8174f2c096a6447b144a8b5a1');

    // mapWidgetArray[0].zoomToExtent(new ol.Bounds(minLng, minLat, maxLng, maxLat));//.transform("EPSG:4326", "EPSG:900913"))
}

var statcameback;

function calculateArea(poly) {
    var sphere = new ol.Sphere(6378137);
    var coordinates = poly; //[[-105.30322265625, 22.33544921875], [-105.047900390625, 22.33544921875], [-105.047900390625, 23.53271484375], [-105.30322265625, 23.53271484375], [-105.30322265625, 22.33544921875]];
    var area_m = sphere.geodesicArea(coordinates);
    var area_km = area_m / 1000 / 1000;
    var area_ha = area_m / 10000;
    if (area_ha < 0) {
        area_ha = area_ha * -1;
    }
    return numberWithCommas(area_ha);
}

function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

function flipme(which) {
    // alert(which);
    $("#" + which).flip('toggle');
}

var isAdmin = true;

function addWidget(widget) {
    console.info(widget.name);

    var awidget = $('<div/>', { "class": "col-xs-6 col-sm-3 placeholder" });

    if (widget.width) {
        awidget = $('<div/>', { "class": "col-xs-6 col-sm-"+ widget.width + " placeholder" });
    }

    var panel = $('<div/>', { "class": "panel panel-default" });
    panel.attr('id', 'widget_' + widget.id);
    var panHead = $("<div/>", { "class": "panel-heading" });
    var toolsholder = $("<ul/>", { "class": "list-inline panel-actions pull-right" });

    if (isAdmin) {
        //glyphicon glyphicon-cog
        var clickcommand = 'flipme("flip-container_' + widget.id +'")';
        var toolfliptog = $("<li/>");
        var theflipbutton = $("<a/>", { "class": "list-inline panel-actions panel-flip", "onclick": clickcommand });
        var theflipicon = $("<i/>", { "class": "glyphicon glyphicon-cog" });
        theflipbutton.append(theflipicon);
        theflipbutton.attr('role', 'button');
        theflipbutton.attr('title', 'Toggle flip');
        toolfliptog.append(theflipbutton);
        toolsholder.append(toolfliptog);
    }

    var toolmaxtog = $("<li/>");
    var thebutton = $("<a/>", { "class": "list-inline panel-actions panel-fullscreen" });
    var theicon = $("<i/>", { "class": "glyphicon glyphicon-resize-full" });
    thebutton.append(theicon);
    thebutton.attr('role', 'button');
    thebutton.attr('title', 'Toggle Fullscreen');
    toolmaxtog.append(thebutton);
    toolsholder.append(toolmaxtog);
    panHead.append(toolsholder);
    panel.append(panHead);
    var img;
    var wtext = "I had no property";

    if (widget.properties[0]) {
        if (isAdmin) {
            var flippercontainer = $('<div />', { "id": "flip-container_" + widget.id, 'class' : 'flip-container' }); //ontouchstart="this.classList.toggle('hover');">')
            // var flipper =$('<div />').addClass('flipper');
            var front =$('<div />').addClass('front');
            var back = $('<div />').addClass('back').html('this is the Admin side which will contain a form');
        }
        wtext = widget.properties[0];
        var title = $('<h4 />').html(widget.name);
        var sub = $('<br />'); // $('<span />').addClass('text-muted').html(wtext);
        if (wtext == "addImageCollection") {
            var maddiv = $('<div/>', { "id": "widgetmap_" + widget.id, 'class' : 'minmapwidget' });
            maddiv.attr('style', 'width:100%; min-height:200px;');
            front.append(maddiv).append(title).append(sub);
            flippercontainer.append(front);
            back.html('');
            back.append(getImageCollectionForm(widget));
            flippercontainer.append(back);
            //flippercontainer.append(flipper)
            panel.append(flippercontainer);
        } else if (wtext == "timeSeriesGraph") {
            //build graph here
            var graphdiv = $('<div/>', { "id": "widgetgraph_" + widget.id, 'class': 'minmapwidget' });
            var graphcontainer = $('<div/>', { 'id': 'graphcontainer_' + widget.id, 'class': 'minmapwidget' });
            graphdiv.append(graphcontainer);
            graphdiv.append(title).append(sub);
            front.append(graphdiv);
            flippercontainer.append(front);
            back.append(getTimeSeriesGraphForm(widget));
            flippercontainer.append(back);
            panel.append(flippercontainer);
        } else if (wtext == "getStats") {
            var statsDiv = $('<div/>', { "id": "widgetstats_" + widget.id, 'class': 'minmapwidget' });
            // var header = $('<div/>', { 'style': 'padding-left:20px;padding-top:20px;' });
            //var wtitle = $('<span/>', { 'style': 'color: #333333; font-size: 18px;' }).html('Key Information');
            //header.append(wtitle).append($('<br/>')).append($('<br/>'));
            //statsDiv.append(header);
            //build table here
            var content = "<table style='border:0px; width:100%'>";
            //total pop
            content += '<tr style="padding-top:20px;"><td style="width:80px"  class="statsWidget">';
            content += '<img src="img/icon_population.png" style="width: 50px; height: 50px; -webkit-border-radius: 25px; -moz-border-radius: 25px; border-radius: 25px; background-color: #e2843a; "></td>';
            content += '<td class="statsWidget"><span style="color:#787878">Total population</span><h4 id="totalPop_' + widget.id + '" style="color: #606060; font-size: 16px; font-weight: bold; "></h4><img src="static/img/loading.gif" id="loading-indicator-1" style="display:none" />';
            content += '</td></tr>';
            //area
            content += '<tr style="padding-top:20px;"><td style="width:80px" class="statsWidget">';
            content += '<img src="img/icon_area.png" style="width: 50px; height: 50px; -webkit-border-radius: 25px; -moz-border-radius: 25px; border-radius: 25px; background-color: #e2843a; "></td>';
            content += '<td class="statsWidget"><span style="color:#787878">Area</span><h4 id="totalArea_' + widget.id + '" style="color: #606060; font-size: 16px; font-weight: bold; "></h4><img src="static/img/loading.gif" id="loading-indicator-1" style="display:none" />';
            content += '</td></tr>';
            //elevation
            content += '<tr style="padding-top:20px;"><td style="width:80px" class="statsWidget">';
            content += '<img src="img/icon_elevation.png" style="width: 50px; height: 50px; -webkit-border-radius: 25px; -moz-border-radius: 25px; border-radius: 25px; background-color: #e2843a; "></td>';
            content += '<td class="statsWidget"><span style="color:#787878">Elevation</span><h4 id="elevationRange_' + widget.id + '" style="color: #606060; font-size: 16px; font-weight: bold; "></h4><img src="static/img/loading.gif" id="loading-indicator-1" style="display:none" />';
            content += '</td></tr>';
            //close table
            content += "</table>";

            statsDiv.append(content);
            statsDiv.append(title).append(sub);
            front.append(statsDiv);
            flippercontainer.append(front);
            flippercontainer.append(back);
            panel.append(flippercontainer);
        } else {
            img = $('<img>'); //Equivalent: $(document.createElement('img'))
            img.attr('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==');
            img.attr('width', '200');
            img.attr('height', '200');
            img.addClass("img-responsive");
            panel.append(img).append(title).append(sub);
        }
    }

    awidget.append(panel);
    return awidget;
    // $("#dashHolder").append('<h1 class="page-header">Dashboard</h1>');
}

function getTimeSeriesGraphForm(which) {
    var theForm = $('<div />');
    theForm.append('<div class="appm">Edit widget</div>');
    var theTable = $("<table />", { width: '100%' });
    theTable.append('<tr><td><span>Title: <span></td><td><input type="text" placeholder="Title" name="widgetTitle" id="title_' + which.id + '" value="' + which.name + '"/></td></tr>');
    theTable.append('<tr><td><span>Image Collection: <span></td><td><input type="text" placeholder="Image Collection" id="collection_' + which.id + '" name="imagecollection" value="' + which.properties[1] + '"/></td></tr>');
    theTable.append('<tr><td colspan="2"><input type="text" placeholder="Start Date" id="sDate_' + which.id + '" name="sDate" value="' + which.properties[2] + '"/> to <input type="text" placeholder="End Date" id="eDate_' + which.id + '" name="eDate" value="' + which.properties[3] + '"/></td></tr>');
    var columns = 3;
    if (which.width) {
        columns = which.width;
    }
    theTable.append('<tr><td><span>Columns: <span></td><td><input type="text" placeholder="Columns" id="columns_' + which.id + '" name="columns" value="' + columns + '"/></td></tr>');
    theForm.append(theTable);
    theForm.append('<br><input type="submit" id="savebutton" value="Save" />');
    return theForm;
}

function getImageCollectionForm(which) {
    var theForm = $('<div />');
    theForm.append('<div class="appm">Edit widget</div>');
    var theTable = $("<table />", { width: '100%' });
    theTable.append('<tr><td><span>Title: <span></td><td><input type="text" placeholder="Title" name="widgetTitle" id="title_' + which.id + '" value="' + which.name + '"/></td></tr>');
    theTable.append('<tr><td><span>Image Collection: <span></td><td><input type="text" placeholder="Image Collection" id="collection_' + which.id + '" name="imagecollection" value="' + which.properties[1] + '"/></td></tr>');
    theTable.append('<tr><td colspan="2"><input type="text" placeholder="Start Date" id="sDate_' + which.id + '" name="sDate" value="' + which.properties[2] + '"/> to <input type="text" placeholder="End Date" id="eDate_' + which.id + '" name="eDate" value="' + which.properties[3] + '"/></td></tr>');
    var columns = 3;
    if (which.width) {
        columns = which.width;
    }
    theTable.append('<tr><td><span>Columns: <span></td><td><input type="text" placeholder="Columns" id="columns_' + which.id + '" name="columns" value="' + columns + '"/></td></tr>');
    theForm.append(theTable);
    theForm.append('<br><input type="submit" id="savebutton" value="Save" />');
    return theForm;
}

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    var results = regex.exec(url);
    if (!results) { return null; }
    if (!results[2]) { return ''; }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var mapWidgetArray = {};
var graphWidgetArray = {};

function enableMapWidget(mapdiv) {
    var raster = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    var map = new ol.Map({
        layers: [raster],
        target: mapdiv,
        view: new ol.View({
            center: [0, 0],
            projection: 'EPSG:4326',
            zoom: 4
        })
    });
    mapWidgetArray[mapdiv] = map;
}

function addTileServer(imageid, token, mapdiv) {
    var googleLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://earthengine.googleapis.com/map/' + imageid + '/{z}/{x}/{y}?token=' + token
        })
    });
    mapWidgetArray[mapdiv].addLayer(googleLayer);
}

var o1, o2;

function swapElements(obj1, obj2) {
    // create marker element and insert it where obj1 is
    obj1 = obj1.get(0);
    o2 = obj2;
    var temp = document.createElement("div");
    if (obj1.parentNode) {
        obj1.parentNode.insertBefore(temp, obj1);
        console.info('0');
    } else {
        obj1.parent().insertBefore(temp, obj1);
        console.info('1');
    }

    if (obj2.parentNode) {
        // move obj1 to right before obj2
        obj2.parentNode.insertBefore(obj1, obj2);
        console.info('2');
    } else {
        obj2.parent().insertBefore(obj1, obj2);
        console.info('3');
    }

    if (temp.parentNode) {
        // move obj2 to right before where obj1 used to be
        temp.parentNode.insertBefore(obj2, temp);
        console.info('4');
        // remove temporary marker node
        temp.parentNode.removeChild(temp);
        console.info('5');
    } else {
        temp.parent().insertBefore(obj2, temp);
        console.info('6');
        // remove temporary marker node
        temp.parent().removeChild(temp);
        console.info('7');
    }
}
