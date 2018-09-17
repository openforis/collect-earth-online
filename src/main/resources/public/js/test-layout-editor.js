var gpid;
var gurl;
var gmodcdash;
angular.module("geodash", []).controller("GeodashWidgetEditorController", ["$http", function GeodashController($http) {
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
    this.querystring;
    this.gridLayout = [];
    var geodash = this;
    gmodcdash = this;
    this.masterWidgetTypes = [{id:"ImageCollection", name:"Image Collection"},
    {id:"timeSeriesGraph", name:"Time Series Graph"},
    {id:"getStats", name:"Statistics"}];
    this.widgetIndices = [{id:"NDVI", name:"NDVI"},
                             {id:"EVI", name:"EVI"},
                             {id:"EVI2", name:"EVI 2"},
                             {id:"NDMI", name:"NDMI"},
                           {id:"NDWI", name:"NDWI"},
                           {id:"custom", name:"Custom widget"}];
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
    this.updatedWidgets = [];
    this.placementList = [];
    this.currentClicked;
    this.workingNode;
    this.dialog;
    this.form;
    this.custom = false;
    this.cooked = false;
    this.indices = false
    this.cookedStats = false;
    this.cookedImage = false;
    this.cookedGraph = false;
    this.cookedNDVIImage = false;
    this.cookedEVIImage = false;
    this.cookedEVI2Image = false;
    this.cookedNDMIImage = false;
    this.cookedNDWIImage = false;
    this.cookedNDVIGraph = false;
    this.cookedEVIGraph = false;
    this.cookedEVI2Graph = false;
    this.cookedNDMIGraph = false;
    this.cookedNDWIGraph = false;
    this.isUpdatedLayout = false;


    this.initialize = function (documentRoot) {
        geodash = this;
        this.querystring = window.location.search;
        var pid = this.getParameterByName("pid");
        gpid = pid;
        var title = this.getParameterByName("title");
        this.isUpdatedLayout = this.getParameterByName("layoutupdate");
        for (var fs = 0; fs < 7; fs++) {
            if (this.gridLayout[fs] == null) {
                //Return to all -1 after testing
                this.gridLayout[fs] = [-1, -1, -1, -1];
            }
        }
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
        });
         angular.element(document).ready(function () {
            gmodcdash.setupDialog();
        });
    };
   angular.element(document).ready(function () {
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
    });
    this.updateWidgetIndicesSelected = function(which){
        if(which != null && which.id)
        {
            if(this.cookedImage)
            {
                this.custom = false;
                this.cooked = true;
                if(which.id === 'NDVI')
                {
                    this.cookedNDVIImage = true;
                }else if(which.id === 'EVI')
                {
                  this.cookedEVIImage = true;
                }
                else if(which.id === 'EVI2')
                {
                  this.cookedEVI2Image = true;
                }
                else if(which.id === 'NDMI')
                {
                  this.cookedNDMIImage = true;
                }
                else if(which.id === 'NDWI')
                {
                  this.cookedNDWIImage = true;
                }
                else if(which.id === 'custom'){
                /***********************************Need to fix this custom section**********************/
                    this.cooked = false;
                    this.custom = true;
                }
            }
            else if(this.cookedGraph)
            {
                this.custom = false;
                this.cooked = true;
                if(which.id === 'NDVI')
                {
                    this.cookedNDVIGraph = true;
                }else if(which.id === 'EVI')
                {
                  this.cookedEVIGraph = true;
                }
                else if(which.id === 'EVI2')
                {
                  this.cookedEVI2Graph = true;
                }
                else if(which.id === 'NDMI')
                {
                  this.cookedNDMIGraph = true;
                }
                else if(which.id === 'NDWI')
                {
                  this.cookedNDWIGraph = true;
                }
                else if(which.id === 'custom'){
                /***********************************Need to fix this custom section**********************/
                    this.cooked = false;
                    this.custom = true;
                }
            }
        }
        else{
            this.cooked = false;
        }

    };
    this.updateWidgetTypeSelected = function(which){
        this.resetMainTypes();
        //document.getElementById("widgetIndicesSelect").selectedIndex = 0;
        this.cooked = false;
        this.widgetIndicesSelected = null;
        if(which != null && which.id)
        {
            if(which.id === 'getStats'){
                this.cooked = true;
                this.cookedStats = true;
            }
            else{
                if(which.id === 'ImageCollection')
                {
                    this.cookedGraph = false;
                    this.cookedImage = true;
                }
                else if(which.id === "timeSeriesGraph"){
                    this.cookedGraph = true;
                    this.cookedImage = false;
                }
                else{//timeSeriesGraph
                    this.cookedGraph = false;
                    this.cookedImage = false;
                }
                this.indices = true;
            }
        }
    };
    this.updatemainwidgetType = function(item){
        this.resetMainTypes()
        if(item.id === 'custom'){
        this.cooked = false;
        }
        else{
            this.cooked = true;
            if(item.id === 'ImageCollectionNDVI'){
                this.cookedNDVIImage = true;
                this.cookedImage = true;
            }
            else  if(item.id === 'ImageCollectionNDWI'){
                this.cookedNDWIImage = true;
                this.cookedImage = true;
            }
            else  if(item.id === 'ImageCollectionEVI'){
                this.cookedEVIImage = true;
                this.cookedImage = true;
            }
            else  if(item.id === 'ImageCollectionEVI2'){
                this.cookedEVI2Image = true;
                this.cookedImage = true;
            }
            else  if(item.id === 'ImageCollectionNDMI'){
                this.cookedNDMIImage = true;
                this.cookedImage = true;
            }
            else  if(item.id === 'NDVItimeSeriesGraph'){
                this.cookedNDVIGraph = true;
                this.cookedGraph = true;
            }
            else  if(item.id === 'NDWItimeSeriesGraph'){
                this.cookedNDWIGraph = true;
                this.cookedGraph = true;
            }
            else  if(item.id === 'EVItimeSeriesGraph'){
                this.cookedEVIGraph = true;
                this.cookedGraph = true;
            }
            else  if(item.id === 'EVI2timeSeriesGraph'){
                this.cookedEVI2Graph = true;
                this.cookedGraph = true;
            }
            else  if(item.id === 'NDMItimeSeriesGraph'){
                this.cookedNDMIGraph = true;
                this.cookedGraph = true;
            }
            else  if(item.id === 'getStats'){
                this.cookedStats = true;
            }
        }
     };
     this.resetMainTypes = function(){
        this.indices = false;
        this.cookedStats = false;
        this.cookedNDVIImage = false;
        this.cookedEVIImage = false;
        this.cookedEVI2Image = false;
        this.cookedNDMIImage = false;
        this.cookedNDWIImage = false;
        this.cookedNDVIGraph = false;
        this.cookedEVIGraph = false;
        this.cookedEVI2Graph = false;
        this.cookedNDMIGraph = false;
        this.cookedNDWIGraph = false;
        this.cookedGraph = false;
        this.cookedImage = false;
     }
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
    }
    this.setupDialog = function () {
            geodash.dialog = $("#dialog-form").dialog({
                autoOpen: false,
                height: 400,
                width: 350,
                modal: true,
                buttons: [{
                    text: "Create widget",
                    "class": "btn btn-primary",
                    click: geodash.createUserWidget
                },
                        {
                            text: "Cancel",
                            "class": "btn btn-outline-danger btn-sm",
                            click: function () {
                                geodash.dialog.dialog("close");
                            }
                        }],
                close: function () {
                    geodash.form[0].reset();
                    //$("#widgetType").trigger("change");
                    //allFields.removeClass("ui-state-error");
                }
            });
            geodash.form = this.dialog.find("form");
    };
    this.createWidgetDialog = function(){
        gmodcdash.dialog.dialog("open");
    }
    this.createUserWidget = function(){
        //alert("Click an empty blue box to position the new widget");



        var newWidget = {};
        var newid = 0;
        var newposition = 0;
        var readyToGo = false;
        if (geodash.pageWidgets.length > 0) {
            geodash.pageWidgets.sort(function (a, b) {
                return parseInt(a.id) - parseInt(b.id);
            });
            newid = geodash.pageWidgets[geodash.pageWidgets.length - 1].id + 1;

            geodash.pageWidgets.sort(function (a, b) {
                return parseInt(a.position) - parseInt(b.position);
            });
            var newposition = geodash.pageWidgets[geodash.pageWidgets.length - 1].position + 1;
        }

        if ($("#mainform").is(":visible")) {
            var theType = geodash.cookedImage ? "addImageCollection" : "timeSeriesGraph";
            newWidget.name = $("#title").val();
            newWidget.width = $("#columns").val();
            newWidget.id = newid;
            newWidget.properties = [theType, $("#iCollection").val(), $("#sDate_new").val(), $("#eDate_new").val(), $("#bands").val()];
            //newWidget.position = newposition;
            newWidget.gridcolumn = "1 / span 3";
            newWidget.gridrow = "1 / span 1";
            readyToGo = true;
        } else if (geodash.cookedStats === true) {

            newWidget.name = $("#stattitle").val();
            newWidget.width = $("#statcolumns").val();
            newWidget.id = newid;
            newWidget.properties = ["getStats", "poly", ""];
            //newWidget.position = newposition;
            newWidget.gridcolumn = "1 / span 3";
            newWidget.gridrow = "1 / span 1";
            readyToGo = true;
        }
        else if(geodash.cookedImage === true)
        {
            newWidget.name = $("#cookedImageTitle").val();
            newWidget.width = $("#cookedImageColumns").val();
            newWidget.id = newid;
            //newWidget.position = newposition;
            newWidget.gridcolumn = "1 / span 3";
            newWidget.gridrow = "1 / span 1";
            readyToGo = true;
            if(geodash.cookedNDVIImage === true){
                newWidget.properties = ['ImageCollectionNDVI', ' ', $("#sDate_new_cooked").val(), $("#eDate_new_cooked").val(), 'NDVI'];
            }
            else if(geodash.cookedEVIImage === true){
                    newWidget.properties = ['ImageCollectionEVI', ' ', $("#sDate_new_cooked").val(), $("#eDate_new_cooked").val(), 'EVI'];
            }
            else if(geodash.cookedEVI2Image === true){
                newWidget.properties = ['ImageCollectionEVI2', ' ', $("#sDate_new_cooked").val(), $("#eDate_new_cooked").val(), 'EVI2'];
            }
            else if(geodash.cookedNDMIImage === true){
                    newWidget.properties = ['ImageCollectionNDMI', ' ', $("#sDate_new_cooked").val(), $("#eDate_new_cooked").val(), 'NDMI'];
            }
            else if(geodash.cookedNDWIImage === true){
                    newWidget.properties = ['ImageCollectionNDWI', ' ', $("#sDate_new_cooked").val(), $("#eDate_new_cooked").val(), 'NDWI'];
            }
        }
         else if(geodash.cookedGraph === true){
            newWidget.name = $("#cookedGraphTitle").val();
            newWidget.width = $("#cookedGraphColumns").val();
            newWidget.id = newid;
            //newWidget.position = newposition;
            newWidget.gridcolumn = "1 / span 3";
            newWidget.gridrow = "1 / span 1";
            readyToGo = true;
            if(geodash.cookedNDVIGraph === true){
             newWidget.properties = ['ndviTimeSeries', ' ', $("#sDate_new_cooked_graph").val(), $("#eDate_new_cooked_graph").val(), 'NDVI'];
            }
            else if(geodash.cookedEVIGraph === true){
                newWidget.properties = ['eviTimeSeries', ' ', $("#sDate_new_cooked_graph").val(), $("#eDate_new_cooked_graph").val(), 'EVI'];
            }
            else if(geodash.cookedEVI2Graph === true){
                newWidget.properties = ['evi2TimeSeries', ' ', $("#sDate_new_cooked_graph").val(), $("#eDate_new_cooked_graph").val(), 'EVI2'];
            }
            else if(geodash.cookedNDMIGraph === true){
                newWidget.properties = ['ndmiTimeSeries', ' ', $("#sDate_new_cooked_graph").val(), $("#eDate_new_cooked_graph").val(), 'NDMI'];
            }
            else if(geodash.cookedNDWIGraph === true){
                newWidget.properties = ['ndwiTimeSeries', ' ', $("#sDate_new_cooked_graph").val(), $("#eDate_new_cooked_graph").val(), 'NDWI'];
            }
        }
        if(readyToGo === true)
        {
            geodash.createWidget(newWidget);
        }

        geodash.dialog.dialog("close");
    }
     this.createWidget = function (which) {
            "use strict";
            this.ajaxurl = this.theURL + "createwidget/widget";
            $.ajax({
                url: this.ajaxurl,
                type: "get",
                dataType: "jsonp",
                widget: JSON.stringify(which),
                data: {
                    pID: gpid,
                    dashID: this.dashboardID,
                    widgetJSON: JSON.stringify(which)
                },
                success: function () {
                    var myWidget = JSON.parse(this.widget);
                    superWidget = myWidget;
                    $("#addholder").append(geodash.addWidget(myWidget)[0]);

                    geodash.pageWidgets.push(myWidget);
                    var statuscookie = Cookies.get('modal_dismiss');
                    checkccookie = statuscookie;
                    if(checkccookie == null || statuscookie == false || statuscookie == 'false')
                    {
                    $('<div />').html('<p>Click an empty green box to position the new widget</p><label style="float:right;"><input type="checkbox" name="dismiss">Never show again!</label><br />').dialog({
                                          modal: true,
                                         title: 'Widget placement',
                                         width: 400,
                                        buttons : {
                                            Ok: function() {
                                                $(this).dialog("close"); //closing on Ok click
                                                 $( "#widget_" + myWidget.id ).click();
                                            }
                                        },
                                        close: function(){
                                             var status = $("input[name=dismiss]", this).is(":checked");
                                            Cookies.set('modal_dismiss', status);
                                        }

                                    });
                    }
                    else{
                        $( "#widget_" + myWidget.id ).click();
                    }
                },
                error: function (xhr) {
                    debugme = xhr;
                }
            });
        }
    this.togglePlacementSelection = function (element) {
        debugelem = element; //this is the selected element that we want to reposition
        if (gmodcdash.activeMenu) {
            // work out logic to make sure they are connected if there is already one selected
            // clone or edit new box on top
            // for now i will just highlight b4 i move on
            if (geodash.placementList.length > 0) {
                geodash.placementList.push(element);
                geodash.repositionWidget(element);
            }
            else {
                geodash.placementList.push(element);
                //element.classList.add("active-widget");
                if (document.getElementById(gmodcdash.activeMenu.id + "c") != null) {
                    geodash.workingNode = document.getElementById(geodash.activeMenu.id + "c").parentElement;
                    geodash.repositionWidget(element);
                }
                else {
                    var widgetRef = JSON.parse(JSON.stringify(gmodcdash.pageWidgets.filter(widget => widget.id == gmodcdash.activeMenu.id.split('_')[1])[0]));
                    //add actual widget to the updateWidget array
                    geodash.updatedWidgets.push(widgetRef);
                    var mynode = gmodcdash.activeMenu.parentElement.cloneNode(true);
                    mynode.firstElementChild.classList.remove("active-widget");
                    mynode.firstElementChild.classList.add("active-placed-widget");

                    mynode.firstElementChild.onclick = null;
                    mynode.style.gridColumn = element.style.gridColumn;
                    widgetRef.gridcolumn = element.style.gridColumn;
                    mynode.style.gridRow = element.style.gridRow;
                    widgetRef.gridrow = element.style.gridRow;
                    mynode.firstElementChild.classList.remove("background-color");
                    // remove and row or column css
                    mynode.firstElementChild.id = mynode.firstElementChild.id + "c";
                    var removeList = [];
                    for (var i = 0; i < mynode.classList.length; i++) {
                        if (mynode.classList[i].toLowerCase().indexOf('rowspan') > -1 || mynode.classList[i].toLowerCase().indexOf('colspan') > -1 || mynode.classList[i].toLowerCase().indexOf('columnspan') > -1) {
                            removeList.push(mynode.classList[i]);
                        }
                    }
                    for (var a = 0; a < removeList.length; a++) {
                        mynode.classList.remove(removeList[a]);
                    }
                    mynode.classList.add("columnSpan3");

//                    var toolmaxtog = $("<li/>", {
//                                "style" : "display:inline;"
//                            });
//                            var thebutton = $("<a/>", {
//                                "class": "list-inline panel-actions panel-fullscreen"
//                            });
//                            var theicon = $("<i/>", {
//                                "class": "fas fa-expand-arrows-alt" //"glyphicon glyphicon-resize-full"
//                            });
                    var myli = document.createElement('li');
                    myli.style.display = "inline";
                    myli.style.float = "right";

                    var removeMe = "Remove Me";
                    var a = document.createElement('a');
                    a.onclick = function(){geodash.removePlacedWidget(mynode.firstElementChild.id);};
                    a.style.cursor = "pointer";
                    //a.innerHTML = "X";
                    var itext = document.createElement('i');
                    itext.classList.add("fas");
                    itext.classList.add("fa-window-close");
                    itext.style.color = "#31BAB0";
                    a.append(itext);

                    myli.append(a);
                    mynode.firstElementChild.firstElementChild.firstElementChild.append(myli);
                    geodash.workingNode = mynode;
                    //gmodcdash.activeMenu = mynode;
                    document.getElementById("replacementContainer").appendChild(mynode);
                    var theID = parseInt(gmodcdash.activeMenu.id.split('_')[1]);
                    try{
                    this.gridLayout[mynode.style.gridRowStart - 1][(mynode.style.gridColumnStart - 1) / 3] = theID;
                    }
                    catch(e){}
                }
            }
        }
    }
    this.removePlacedWidget = function(which){
        //alert("Remove Me: " + which);
        var indexval = parseInt(which.substr(which.indexOf('_') + 1,which.length - which.indexOf('c') + 1));
        bang = which;
        if(gmodcdash.activeMenu.id == which.substr(0,which.indexOf('c')))
        {
            gmodcdash.activeMenu.classList.remove("active-widget");
            gmodcdash.activeMenu = null;

        }
        //remove all ids from gmodcdash.gridLayout
        for(var i = 0; i < gmodcdash.gridLayout.length; i++)
        {
            for(var a = 0; a < gmodcdash.gridLayout[i].length; a++)
            {
                //check if it matches
                if(gmodcdash.gridLayout[i][a] == indexval)
                {
                    gmodcdash.gridLayout[i][a] = -1;
                }
            }
        }
        geodash.updatedWidgets = geodash.updatedWidgets.filter(function( obj ) {
            return obj.id !== indexval;
        });

        var elem = document.getElementById(which).parentNode;
        elem.parentNode.removeChild(elem);
        return false;
    }
    this.repositionWidget = function (element) {
        //element is the selected element that we want to reposition
        //widgetRef reference to widget json
        var widgetRef = gmodcdash.updatedWidgets.filter(widget => widget.id == gmodcdash.activeMenu.id.split('_')[1])[0];
        //geodash.workingNode reference to active widget that has been or is being placed
        workingNodeLocation = geodash.getElementLocation(geodash.workingNode);
        if (workingNodeLocation.columnSpan.trim() == "span") {
            workingNodeLocation.columnSpan = "span 3";
        }
        if (workingNodeLocation.rowSpan.toString().trim() == "auto") {
            workingNodeLocation.rowSpan = "1";
        }
        elementLocation = geodash.getElementLocation(element);
        var cols = 1;
        if (geodash.workingNode.style.gridColumnEnd.indexOf('span') > -1) {
            cols = parseInt(geodash.workingNode.style.gridColumnEnd.split(' ')[1]);
        }
        //figure this out to include span in the calculation and increase the span properly
        var tempElem = geodash.workingNode.cloneNode(true);
        var colspan = workingNodeLocation.columnSpan.indexOf('span') > -1? parseInt(workingNodeLocation.columnSpan.split(' ')[1].trim()): parseInt(workingNodeLocation.columnSpan);
        workingNodeLocation.columnSpan = colspan;
        var plusCol = parseInt(workingNodeLocation.column) + colspan == parseInt(elementLocation.column);
        var minusCol = parseInt(workingNodeLocation.column) - parseInt(elementLocation.column) === 3;
        var plusRow = parseInt(workingNodeLocation.row) + parseInt(workingNodeLocation.rowSpan) == parseInt(elementLocation.row);
        var minusRow = parseInt(workingNodeLocation.row) - parseInt(elementLocation.row) === 1;
        if (plusCol) {
            tempElem.style.gridColumn = workingNodeLocation.column + " / span " + (parseInt(workingNodeLocation.columnSpan) + 3);
        }
        else if (minusCol) {
            tempElem.style.gridColumn = (parseInt(elementLocation.column)) + " / span " + (parseInt(workingNodeLocation.columnSpan) + 3);
        }
        if (plusRow) {
            tempElem.style.gridRow = workingNodeLocation.row + " / span " + (parseInt(workingNodeLocation.rowSpan) + 1);
        }
        else if (minusRow) {
            tempElem.style.gridRow = (parseInt(elementLocation.row)) + " / span " + (parseInt(workingNodeLocation.rowSpan) + 1);
        }
        if (!this.willCoverOther(tempElem)) {
            if (plusCol) {
                widgetRef.gridcolumn = workingNodeLocation.column + " / span " + (parseInt(workingNodeLocation.columnSpan) + 3);
                geodash.workingNode.style.gridColumn = workingNodeLocation.column + " / span " + (parseInt(workingNodeLocation.columnSpan) + 3);
            }
            else if (minusCol) {
               widgetRef.gridcolumn = elementLocation.column + " / span " + (parseInt(workingNodeLocation.columnSpan) + 3);
               geodash.workingNode.style.gridColumn = elementLocation.column + " / span " + (parseInt(workingNodeLocation.columnSpan) + 3);
           }
             if (plusRow) {
                            widgetRef.gridrow = workingNodeLocation.row + " / span " + (parseInt(workingNodeLocation.rowSpan) + 1);
                            geodash.workingNode.style.gridRow = workingNodeLocation.row + " / span " + (parseInt(workingNodeLocation.rowSpan) + 1);
            }
            else if (minusRow) {
                           widgetRef.gridrow = elementLocation.row + " / span " + (parseInt(workingNodeLocation.row) + 1);
                           geodash.workingNode.style.gridRow = elementLocation.row + " / span " + (parseInt(workingNodeLocation.rowSpan) + 1);
                       }
            var funkList = [];
                for (var b = 0; b < geodash.workingNode.classList.length; b++) {
                    if(plusCol  || minusCol){
                        if (geodash.workingNode.classList[b].indexOf("columnSpan") > -1) {
                            funkList.push(geodash.workingNode.classList[b]);
                        }
                    }
                    if(plusRow || minusRow){
                        if (geodash.workingNode.classList[b].indexOf("rowSpan") > -1) {
                            funkList.push(geodash.workingNode.classList[b]);
                        }
                    }
                }
                for (var c = 0; c < funkList.length; c++) {
                    geodash.workingNode.classList.remove(funkList[c]);
                }

            if(plusRow || minusRow){
                geodash.workingNode.classList.add("rowSpan" + (parseInt(workingNodeLocation.rowSpan) + 1));
            }
            if(plusCol || minusCol)
            {
                geodash.workingNode.classList.add("columnSpan" + (parseInt(workingNodeLocation.columnSpan) + 3));
            }

            var theID = parseInt(gmodcdash.activeMenu.id.split('_')[1]);
            if (geodash.workingNode.style.gridRowEnd.indexOf('span') > -1) {
                var rows = parseInt(geodash.workingNode.style.gridRowEnd.split(' ')[1]) - 1;
                var cols = 1;
                if (geodash.workingNode.style.gridColumnEnd.indexOf('span') > -1) {
                    cols = parseInt(geodash.workingNode.style.gridColumnEnd.split(' ')[1] / 3) - 1;
                }
                for (var i = 0; i <= rows; i++) {

                    if (cols > 0) {
                        for (var c = 0; c <= cols; c++) {
                            this.gridLayout[(geodash.workingNode.style.gridRowStart - 1) + i][((geodash.workingNode.style.gridColumnStart - 1) / 3) + c] = theID;
                        }
                    }
                    else {
                        this.gridLayout[(geodash.workingNode.style.gridRowStart - 1) + i][(geodash.workingNode.style.gridColumnStart - 1) / 3] = theID;
                    }
                }
            }
            else if (geodash.workingNode.style.gridColumnEnd.indexOf('span') > -1) {
                var cols = 1;
                cols = parseInt(geodash.workingNode.style.gridColumnEnd.split(' ')[1] / 3) - 1;


                if (cols > 0) {
                    for (var c = 0; c <= cols; c++) {
                        this.gridLayout[(geodash.workingNode.style.gridRowStart - 1)][((geodash.workingNode.style.gridColumnStart - 1) / 3) + c] = theID;
                    }
                }
                else {
                    this.gridLayout[(geodash.workingNode.style.gridRowStart - 1)][(geodash.workingNode.style.gridColumnStart - 1) / 3] = theID;
                }

            }
        }
        else {
            alert("Selection would intersect with another widget.  Please remove other widget first.");

        }
    }
    this.willCoverOther = function (widget) {
        //write logic to see if new location would intersect another widget
        // 4 X 7 grid
        function isDefault(element, index, array) {
            return element > -1;
        }
        var BreakException = {};
        var theID = parseInt(gmodcdash.activeMenu.id.split('_')[1]);
        compareWidget = widget;
        c2w = widget;
        var untouched = true;
        try {
            gmodcdash.gridLayout.forEach(function (item) {
                var control = !item.some(isDefault);
                untouched = untouched && control;
                if (!untouched) {
                    throw BreakException;
                }
            });
        }
        catch (e) { console.log(e.message); }

        //var w2 = gmodcdash.gridLayout.map(function(item) { return item.indexOf(1) > -1? 1: -1; });
        if (!untouched) {
            // elementLocation

            //will have to check for overlap

            if (widget.style.gridRowEnd.indexOf('span') > -1) {
                var rows = parseInt(widget.style.gridRowEnd.split(' ')[1]) - 1;
                var cols = 1;
                if (widget.style.gridColumnEnd.indexOf('span') > -1) {
                    cols = parseInt(widget.style.gridColumnEnd.split(' ')[1] / 3) - 1;
                }
                for (var i = 0; i <= rows; i++) //changed both for vars to 1
                {

                    if (cols > 0) {
                        for (var c = 0; c <= cols; c++) {
                             if (this.gridLayout[(parseInt(widget.style.gridRowStart) - 1) + i][(((parseInt(widget.style.gridColumnStart) - 1) / 3) + parseInt(c))] != -1 && this.gridLayout[(parseInt(widget.style.gridRowStart) - 1) + i][((parseInt(widget.style.gridColumnStart) - 1) / 3) + c] != theID) {
                                return true;
                            }
                        }
                    }
                    else {
                        if (this.gridLayout[(parseInt(widget.style.gridRowStart) - 1) + i][(parseInt(widget.style.gridColumnStart) - 1) / 3] != -1 && this.gridLayout[(parseInt(widget.style.gridRowStart) - 1) + i][(parseInt(widget.style.gridColumnStart) - 1) / 3] != theID) {
                            return true;
                        }
                    }
                }
            }
            else if (widget.style.gridColumnEnd.indexOf('span') > -1) {
                var cols = 1;
                cols = parseInt(widget.style.gridColumnEnd.split(' ')[1] / 3) - 1;


                if (cols > 0) {
                    for (var c = 0; c <= cols; c++) {
                        if (this.gridLayout[(parseInt(widget.style.gridRowStart) - 1)][((parseInt(widget.style.gridColumnStart) - 1) / 3) + c] != -1 && this.gridLayout[(parseInt(widget.style.gridRowStart) - 1)][((parseInt(widget.style.gridColumnStart) - 1) / 3) + c] != theID) {
                            return true;
                        }
                    }
                }
                else {
                    if (this.gridLayout[(parseInt(widget.style.gridRowStart) - 1)][(parseInt(widget.style.gridColumnStart) - 1) / 3] != -1 && this.gridLayout[(parseInt(widget.style.gridRowStart) - 1)][(parseInt(widget.style.gridColumnStart) - 1) / 3] != theID) {
                        return true;
                    }
                }

            }
            else if (gmodcdash.gridLayout[parseInt(elementLocation.row) - 1][(parseInt(elementLocation.column) - 1) / 3] === -1) {
                return false;
            }
            return false;
        }
        else {//no widgets placed yet
            return false
        }

        //this.gridLayout;
        return true;
    }
    this.updateWidgets = function () {
        var proceed = true;
        if (geodash.pageWidgets.length != geodash.updatedWidgets.length) {

            var txt;


            $('<div />').html('<p><span class="ui-icon ui-icon-alert" style="float:left; margin:12px 12px 20px 0;"></span>These items will be permanently deleted and cannot be recovered. Are you sure?</p>').dialog({
                  resizable: false,
                  title: "Confirm deleting unplaced widgets",
                  height: "auto",
                  width: 400,
                  modal: true,
                  buttons: {
                    "Accept new configuration": function() {
                      $( this ).dialog( "close" );
                      geodash.tCount = geodash.pageWidgets.length;
                      geodash.updatedWidgets.forEach(function (widget) {
                          geodash.sendUpdate(widget.id, JSON.stringify(widget), false);
                          for(var i = 0; i < geodash.pageWidgets.length; i++){
                              if(widget.id == geodash.pageWidgets[i].id)
                              {
                                 geodash.pageWidgets = geodash.pageWidgets.filter(function( obj ) {
                                      return obj.id !== widget.id;
                                  });
                                  break;
                              }
                          }
                      });

                      geodash.pageWidgets.forEach(function(widget){
                          geodash.sendUpdate(widget.id, JSON.stringify({}), false, true);
                      });
                    },
                    Cancel: function() {
                      $( this ).dialog( "close" );
                    }
                  }
                });


        }
        else{
              geodash.tCount = geodash.pageWidgets.length;
              geodash.updatedWidgets.forEach(function (widget) {
                  geodash.sendUpdate(widget.id, JSON.stringify(widget), false);
                  for(var i = 0; i < geodash.pageWidgets.length; i++){
                      if(widget.id == geodash.pageWidgets[i].id)
                      {
                         geodash.pageWidgets = geodash.pageWidgets.filter(function( obj ) {
                              return obj.id !== widget.id;
                          });
                          break;
                      }
                  }
              });

              geodash.pageWidgets.forEach(function(widget){
                  geodash.sendUpdate(widget.id, JSON.stringify({}), false, true);
              });
        }
    }
    this.tCount = 0;
    this.dataReturned = 0;
    this.checkUpdate = function()
    {
        if(this.dataReturned == this.tCount)
        {
            window.location = window.location.href + "&layoutupdate=true";
        }
    }
    this.sendUpdate = function (id, wjson, onlyPosition, isDelete) {
        "use strict";
        if(isDelete)
        {
            this.ajaxurl = this.theURL + "deletewidget/widget/" + id;
        }
        else{
            this.ajaxurl = this.theURL + "updatewidget/widget/" + id;
        }
        $.ajax({
            url: this.ajaxurl,
            type: "get",
            dataType: "jsonp",
            indexVal: id,
            data: {
                dashID: this.dashboardID,
                widgetJSON: wjson
            },
            success: function () {
                //window.location = window.location.href;
                geodash.dataReturned++;
                geodash.checkUpdate();
            },
            error: function (xhr) {
            }
        });
    }
    this.getElementLocation = function (element) {
        dbe = element;
        var location = { row: 1, column: 1, rowSpan: 1, columnSpan: 3 };
        var stylelist = element.attributes.style.value.split(";");
        var gridArea = stylelist.filter(style => style.indexOf("grid-area") > -1);

        if (gridArea.length > 0) {
            dgridArea.push(gridArea);
            location.row = gridArea[0].split(":")[1].split("/")[0].trim();
            var rowSpan = gridArea[0].split(":")[1].split("/")[2].trim();
            if (rowSpan.indexOf("auto") > -1) {
                location.rowSpan = 1;
            }
            else {
                location.rowSpan = rowSpan.split(" ")[1];
            }
            location.column = gridArea[0].split(":")[1].split("/")[1].trim();
            var colSpan = gridArea[0].split(":")[1].split("/")[3].trim();
            if (colSpan.indexOf("auto") > -1) {
                location.columnSpan = 1;
            }
            else {
                location.columnSpan = colSpan.split(" ")[1];
            }
        }
        else {
            location.column = stylelist.filter(style => style.indexOf("grid-column") > -1)[0].split("/")[0].trim().split(":")[1];
            if (stylelist.filter(style => style.indexOf("grid-column") > -1)[0].split("/").length == 2) {
                location.columnSpan = stylelist.filter(style => style.indexOf("grid-column") > -1)[0].split("/")[1].split(" ")[1];
            }
            location.row = stylelist.filter(style => style.indexOf("grid-row") > -1)[0].split("/")[0].trim().split(":")[1];
            if (stylelist.filter(style => style.indexOf("grid-row") > -1)[0].split("/").length == 2) {
                location.rowSpan = stylelist.filter(style => style.indexOf("grid-row") > -1)[0].split("/")[1].split(" ")[1];
            }
        }
        return location;
    }
    this.activeMenu = "";

    this.setActive = function (element) {
        $('#updateDashHolder .placeholder .panel').removeClass('active-placed-widget');
        geodash.placementList = [];
        if (gmodcdash.activeMenu) {
            gmodcdash.activeMenu.classList.remove("active-widget");
        }
        if (geodash.activeMenu == element) {//Deselect the element
            geodash.activeMenu = "";
        }
        else {
            geodash.activeMenu = element;
            try {
                element.classList.add("active-widget");
                try {
                    document.getElementById(element.id + "c").classList.add("active-placed-widget");
                }
                catch (ex) { }
            }
            catch (e) { }
        }
    }
    this.addWidget = function (widget) {
        "use strict";
        var awidget = $("<div/>", {
            "class": "col-xs-6 col-sm-3 placeholder"
        });
        var hasSpan = false;
        if (widget.gridcolumn) {
            var classnames = "";
            if (widget.gridcolumn.includes("span 12")) {
                classnames = "placeholder fullcolumnspan";
            }
            else if (widget.gridcolumn.includes("span 9")) {
                classnames = "placeholder columnSpan9";
            }
            else if (widget.gridcolumn.includes("span 6")) {
                classnames = "placeholder columnSpan6";
            }
            else {
                classnames = "placeholder columnSpan3";
            }
            if (widget.gridrow.includes("span 2")) {
                classnames += " rowSpan2";
                hasSpan = true;
            }
            else if (widget.gridrow.includes("span 3")) {
                classnames += " rowSpan3";
                hasSpan = true;
            }
            else {
                classnames += " rowSpan1";
            }

            awidget = $("<div/>", {
                "class": classnames,
                "style": "grid-column:" + widget.gridcolumn + "; grid-row: " + widget.gridrow + ";"
            });
        }
        //ng-class="{active : activeMenu === item}

        else if (widget.width) {
            awidget = $("<div/>", {
                "class": "col-xs-6 col-sm-" + widget.width + " placeholder"
            });
        }
        var panel = $("<div/>", {
            "class": "panel panel-default"
        });
        if (hasSpan) {
            panel = $("<div/>", {
                "class": "panel panel-default",
                "style": "height:100%;"
            });
        }
        panel.attr("id", "widget_" + widget.id);
        // panel.attr("ng-click", "geodash.setActive()");
        panel.attr("onclick", "gmodcdash.setActive(this)");
        var panHead = $("<div/>", {
            "class": "panel-heading"
        });
        var toolsholder = $("<ul/>", {
            "class": "list-inline panel-actions pull-right"
        });
        var theName = widget.name == null || widget.name.trim() == ""? "Unnamed Widget" :widget.name;
        var toolSpace = $("<li/>", {
            "style" : "display:inline;"
        }).html(theName);
        toolsholder.append(toolSpace);

        panHead.append(toolsholder);
        panel.append(panHead);
        var img;
        var wtext = "I had no property";
        if (widget.properties[0]) {
            var front = "";
            var widgetcontainer = "";
            if (hasSpan) {

                widgetcontainer = $("<div />", {
                    "id": "widget-container_" + widget.id,
                    "class": "widget-container",
                    "height": "100%"
                });
            }
            else {
                widgetcontainer = $("<div />", {
                    "id": "widget-container_" + widget.id,
                    "class": "widget-container"
                });
            }

            var typeimage = geodash.getImageByType(widget.properties[0])
            front = $("<div />", {
                "class": "front",
                "style": "height: calc(100% - 45px); background-image: url('" + typeimage+ "');background-size: cover; background-repeat: no-repeat; background-position: 50% 50%; text-align:center; display:table; width:100%;"
            });

            wtext = widget.properties[0];
            var widgettitle = $("<h3 />", {
                "id": "widgettitle_" + widget.id,
                "style": "color: red; display: table-cell; vertical-align: middle; font-weight: 900;"
            }).html("Sample image");
            var sub = $("<br />");
            front.append(widgettitle).append(sub);
            panel.append(front);
        }
        awidget.append(panel);
        return awidget;
    };
    this.getImageByType = function(which){
        var theImage = "";
        if (which === "getStats") {
            theImage = "/img/statssample.gif";
        }
        else if (which.toLowerCase().includes("image")) {
            theImage = "/img/mapsample.gif";
        }
        else {
            theImage = "/img/graphsample.gif";
        }

        return theImage;
    }
    this.makeAjax = function (parameters, donefunction) {
        "use strict";
        $.ajax(parameters).fail(function (jqXHR, textStatus, errorThrown) {
            console.warn("error from ajax call: " + jqXHR + textStatus + errorThrown);
        }).done(donefunction);
    };

    this.fillDashboard = function (dashboard) {
        "use strict";
        this.dashboardID = dashboard.dashboardID;

        if (dashboard.widgets !== null && dashboard.widgets.length > 0) {
            if (dashboard.widgets[0].id === "undefined" || dashboard.widgets[0].id === null) {
                try {
                    dashboard.widgets = JSON.parse(dashboard.widgets);
                } catch (e) {
                    console.warn("dashboard failed: " + e.message);
                }
            }
            rdash = dashboard.widgets;
            dashboard.widgets.sort(function (a, b) {
                return parseFloat(a.position) - parseFloat(b.position);
            });
            if(!dashboard.widgets[0].gridcolumn)
            {
                //change this to a sorry and help message with update_widget_demo.gif
                $('<div />').html('<p>Update widgets to version 2 by selecting each widget then clicking the green box you would like the widget to start in and clicking connecting boxes to expand as seen below.  Click update when finished.</p><img src="img/update_widget_demo.gif" alt="Update Widgets" style="max-width: 50vw;">').dialog({
                                                          modal: true,
                                                         title: 'Update Widgets',
                                                         width: '55vw',
                                                         position: { my: "center top+50", at: "center top+50", of: window },
                                                        buttons : {
                                                            Ok: function() {
                                                                $(this).dialog("close"); //closing on Ok click
                                                            }
                                                        },

                                                    });
                var col = 1;
                var row = 1;
                dashboard.widgets.forEach(function(widget) {
                    if(col > 10){
                        col = 1;
                        row++;
                    }
                    widget.gridcolumn = col + " / span 3";
                    col = col + 3;
                    widget.gridrow = row + " / span 1";
                });

            }
            else{
            //layoutupdate
                var statuscookie = Cookies.get('modal_init_direction');
                if(statuscookie == null || statuscookie == false || statuscookie == 'false')
                {
                    if(this.isUpdatedLayout != 'true')
                    {
                        $('<div />').html('<p>Arrange widgets by selecting each widget then clicking the green box you would like the widget to start in and clicking connecting boxes to expand as seen below.  Click update when finished.</p><img src="img/update_widget_demo.gif" alt="Update Widgets" style="max-width: 50vw;"><br /><label style="float:right;"><input type="checkbox" name="initdirection">Never show again!</label><br />').dialog({
                              modal: true,
                             title: 'Update Widgets',
                             width: '55vw',
                             position: { my: "center top+50", at: "center top+50", of: window },
                            buttons : {
                                Ok: function() {
                                    $(this).dialog("close"); //closing on Ok click
                                }
                            },
                            close: function(){
                                 var status = $("input[name=initdirection]", this).is(":checked");
                                Cookies.set('modal_init_direction', status);
                            }

                        });
                    }
                }
            }

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

        } else{
            var filename = 'new_widget_layout.gif';
            if(jQuery(window).width() < 992)
            {
                /* I need to create this resource using the responsive sized screen*/
                //filename = 'mapsample.gif';
            }
            $('<div />').html('<p>Start adding by widgets. The create button is at the top right after you create your first widget click that to add another.</p><img src="img/'+filename+'" alt="Create widget layout" style="max-width:50vw">').dialog({
                  modal: true,
                 title: 'Add Widgets',
                 width: '55vw',
                  position: { my: "center top+50", at: "center top+50", of: window },
                buttons : {
                    Ok: function() {
                        $(this).dialog("close"); //closing on Ok click
                         gmodcdash.createWidgetDialog();
                    }
                },

            });
        }

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
}]);
var debugelem;
var dgridArea = [];
var compareWidget;
var c2w;
var bang;
var superWidget;
var dbe;
var rdash;
var checkccookie;