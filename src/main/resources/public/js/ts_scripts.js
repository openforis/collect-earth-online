

/////INITIAL PAGE SETUP////////////////////////////////////////////////////////////////////
//set the bottom of the page length
$(document).ready(function() {
    setChipGalleryLength();
});

function setChipGalleryLength(){
    var max = $(document).height() - $('#chip-gallery').offset().top-5;
    $('#chip-gallery').css('height',max);
}

//convert data value to d3 color
function scaleByStretch(data, specIndex, stretch, n_stdev) {
    var v = ((data[specIndex] - stretch[specIndex].min) / (stretch[specIndex].max - stretch[specIndex].min)) * 255;
    v = v < 0 ? 0 : v;
    v = v > 255 ? 255 : v;
    return v;
}
function dataRGB(data, RspecIndex, GspecIndex, BspecIndex, stretch, n_stdev) {
    var r = scaleByStretch(data, RspecIndex, stretch, n_stdev);
    var	g = scaleByStretch(data, GspecIndex, stretch, n_stdev);
    var	b = scaleByStretch(data, BspecIndex, stretch, n_stdev);
    return d3.rgb(r,g,b);
}


//////////DEFINE GLOBAL VARIABLES/////////////////////////////////////////////////////////
var	specIndex = "TCW"; //default index to display - set again when a plot is clicked on
var	rgbColor = [];
var	allDataRGBcolor = [];
var data = {"Values":[]};
var allData = {"Values":[]};
var n_chips = 0;
var lastIndex = 0;
var origData = [];
//var userID = 9;
//var projectID = "";
//var plotID = "";
//var tsa = "999999";
var selectedCircles = [];
var lineDate = [];
var vertInfo = [];
var selectThese=[];
var lineData = [];
var chipstripwindow = null ;//keep track of whether the chipstrip window is open or not so it is not opened in multiple new window on each chip click
var highLightColor = "#32CD32";
var	activeRedSpecIndex = "B7" //"TCB"; //default index to display - set again when a plot is clicked on
var activeGreenSpecIndex = "B4" //"TCG"; //default index to display - set again when a plot is clicked on
var activeBlueSpecIndex = "B3" //"TCW"; //default index to display - set again when a plot is clicked on
var ylabel = "";
var yearList = [];

var sessionInfo = {
    "userID":userID,
    "projectID":"",
    "projectCode":"",
    "tsa":"999999",
    "plotID":"",
    "isDirty":false,
    "plotSize":1,
    //TSCEO workaround for CEO API.
    "numPlots":1000, 
    "tsStartYear": 1985,
    "tsEndYear": 2017,
    "tsTargetDay": 215,
    "currentLocation": null,
    "plots": []
}


var packetInfo = {}

var chipInfo = {
    useThisChip:[],
    canvasIDs:[],
    imgIDs:[],
    sxOrig:[],
    syOrig:[],
    sWidthOrig:[],
    sxZoom:[],
    syZoom:[],
    sWidthZoom:[],
    chipsInStrip:[],
    year:[],
    julday:[],
    src:[],
    sensor:[]
};

var chipDisplayProps = {
    box: 1,
    boxZoom: 1,
    chipSize:195,
    halfChipSize:97.5,
    offset:30,
    canvasHeight:195, //212,
    zoomLevel:20,
    plotColor:"#FFFFFF"
};

var	minZoom = 0;
var	maxZoom = 40;
var	stopZoom = 40;
var	sAdj = [0];
var	lwAdj = [chipDisplayProps.box];
var	zoomIn = 0;

var timeLapseIndex = 0;
var playTL;
var flickerTL;

var windowH = $(window).height();
var windowW = $(window).width();

function getUrls(sessionInfo, year){
    var server = 'https://localhost:8080';
    var geeServer = 'https://localhost:8888'
    var urls = {
        "annualSpec": server + '/data/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa+'/'+sessionInfo.plotID+'/'+year,
        "selectedSpec": geeServer + '/data/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa+'/'+sessionInfo.plotID,
        "projectList": server + '/get-all-projects',
        "plotInterp": server + '/index.php/vertex/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa+'/'+sessionInfo.plotID,
        "plotComment": server + '/comment/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa+'/'+sessionInfo.plotID,
        "plotList": server + '/get-project-plots/'+sessionInfo.projectID+'/'+sessionInfo.numPlots,
        "respDesign": server + '/config/response/'+sessionInfo.projectID,
        "chipOverRide": server + '/image/override',
        "vertInfoSave": server + '/vertex/save',
        "commentSave": server + '/comment/save'
    }
    return urls
}


//DEFINE LOADING FUNCTIONS AND LISTENERS//
function getData(sessionInfo,specIndex,activeRedSpecIndex,activeGreenSpecIndex,activeBlueSpecIndex,ylabel){
    $.getJSON(getUrls(sessionInfo).selectedSpec).done(function(returnedData){ //origData
        $("#targetDOY").text("(Target DOY: "+returnedData[0].target_day + ")")
        origData = returnedData; //reset global
        n_chips = origData.length; //reset global
        lastIndex = n_chips-1; //reset global
        data = {"Values":[]}; //reset global
        allData = {"Values":[]}; //reset global
        chipInfo = {useThisChip:[],canvasIDs:[],imgIDs:[],sxOrig:[],syOrig:[],sWidthOrig:[],sxZoom:[],syZoom:[],sWidthZoom:[],chipsInStrip:[],year:[],julday:[],src:[],sensor:[]}; //reset global
        yearList = []; //reset gobal

        for(var i=0;i<n_chips;i++){
            data.Values.push(parseSpectralData(origData,i));
            yearList.push(origData[i].image_year);
        }

        //set the default x domain max to the max year of the data, plus 1 to get a line at the end of the year
        var maxXdomain = d3.max(yearList)+1;
        var minXdomain = d3.min(yearList)-1;
        defaultDomain.year.max = maxXdomain;
        currentDomain.year.max = maxXdomain;
        defaultDomain.year.min = minXdomain;
        currentDomain.year.min = minXdomain;


        data = calcIndices(data); //reset global - calculate the spectral indices
        rgbColor = scaledRGB(data, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, n_chips); //reset global - calculate the rbg color
        data = calcDecDate(data); //could wrap this into data appending push function
        /*	YANG: 2016.08.06: warren want to change it to global stretch
        Yang: 2016.08.31: warren want to change it back to always local stretch */
        if (!currentDomain.hasCustomizedXY) {
            updateStretch();
        }
        /**/
        var urlList = [];
        var count = [];
        for(var i=0;i<n_chips;i++){
            urlList.push(getUrls(sessionInfo, origData[i].image_year).annualSpec)
            count.push(0)
        }

        urlList.forEach(function(listItem,index){
            $.getJSON(listItem).done(function(returnedData){
                for(var i=0;i<returnedData.length;i++){
                    allData.Values.push(parseSpectralData(returnedData,i));
                }
                //make sure that all of the urls have been added to "allData" before getting the plot interps and plotting the points - need "selectThese" to be determined first - any other way and asynchronous loading will mess it up
                count[index] = 1//++;
                if (d3.sum(count) == n_chips){
                    allData = calcIndices(allData); //reset global - calculate the spectral indices
                    allDataRGBcolor = scaledRGB(allData, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, allData.Values.length); //reset global - calculate the rbg color
                    allData = calcDecDate(allData); //could wrap this into data appending push function
                    allDecdate = [];

                    allData.Values.forEach(function(v){
                        allDecdate.push(v.decDate)
                    })

                    //get the plot interpretations
                    $.getJSON(getUrls(sessionInfo).plotInterp).done(function(vertices){
                        if (vertices.length > 0 && vertices[0].plotid != sessionInfo.plotID) {
                            return;
                        }

                        vertInfo = [];
                        vertices.forEach(function(v) {
                            vertInfo.push({
                                year: v.image_year,
                                julday: v.image_julday,
                                index: yearList.indexOf(v.image_year),//idx,
                                landUse: {
                                    primary: {
                                        landUse: v.dominant_landuse,
                                        notes: parseNote(v.dominant_landuse_notes, 'landuse')
                                    },
                                    secondary: {
                                        landUse: v.secondary_landuse,
                                        notes: parseNote(v.secondary_landuse_notes, 'landuse')
                                    }
                                },
                                landCover: {
                                    landCover: v.dominant_landcover,
                                    other: parseNote(v.dominant_landcover_notes, 'landcover')
                                },
                                changeProcess: {
                                    changeProcess: v.change_process,
                                    notes: parseNote(v.change_process_notes, 'process')
                                }
                            });
                        });

                        //fill in the comment box and the isExampleCheckbox
                        $.getJSON(getUrls(sessionInfo).plotComment).done(function(commentObj){
                            $("#commentInput").val(commentObj.comment);
                            $("#isExampleCheckbox").prop("checked",commentObj.is_example == 1);
                        });

                        //check to see if vert info has been filled in for this plot
                        if(vertInfo.length !=0){
                            for(var i=0;i<vertInfo.length;i++){
                                selectThese.push(vertInfo[i].index); //reset global
                            }
                        } else{
                            selectThese = [0,lastIndex]
                            for(var i=0;i<selectThese.length;i++){
                                vertInfo.push({year:origData[selectThese[i]].image_year,julday:origData[selectThese[i]].image_julday,index:selectThese[i],landUse:{
                                        //dominant:"",notes:{wetland:false,mining:false,rowCrop:false,orchardTreeFarm:false,vineyardsOtherWoody:false}
                                        primary:{landUse:"",notes:{wetland:false,mining:false,rowCrop:false,orchardTreeFarm:false,vineyardsOtherWoody:false}},
                                        secondary:{landUse:"",notes:{wetland:false,mining:false,rowCrop:false,orchardTreeFarm:false,vineyardsOtherWoody:false}}
                                    },landCover:{landCover:"",other:{trees:false,shrubs:false,grassForbHerb:false,impervious:false,naturalBarren:false,snowIce:false,water:false}},changeProcess:{changeProcess:"",notes:{natural:false,prescribed:false,sitePrepFire:false,airphotoOnly:false,clearcut:false,thinning:false,flooding:false,reserviorLakeFlux:false,wetlandDrainage:false}}})
                            }
                        }

                        //$(".segment").remove(); //reset the form
                        //$(".vertex").remove(); //reset the form

                        fillInForm() //fill out the form inputs
                        plotInt(); //draw the points
                        makeChipInfo("json", origData)
                        appendSrcImg(); //append the src imgs
                        appendChips("annual",selectThese); //append the chip div/canvas/img set

                        //once the imgs have loaded make the chip info and draw the img to the canvas and display the time-lapse feature
                        $("#img-gallery").imagesLoaded(function(){
                            //makeChipInfo("json", origData); //chip info array gets set in "appendChips" gets filled out here because we have to wait until the imgs have loaded to get their height (used when chip strip is the src - not needed when chips are singles)
                            drawAllChips("annual");	//draw the imgs to the canvas
                            //tlInt(); //draw the time-lapse img - this is for the time lapse video - not used
                            /* 										if ((expandedChipWindow != null) && expandedChipWindow.closed == false){
                                                                        var selectedColor = $("#selectedColor").prop("value");
                                                                        var pass_data = {
                                                                            "action":"init_chips", //hard assign
                                                                            "selectThese":selectThese, //selectThese, //"n_chips":"40", //get this from the img metadata
                                                                            "chipInfo":chipInfo,
                                                                            "n_chips":n_chips,
                                                                            "chipDisplayProps":chipDisplayProps,
                                                                            "selectedColor":selectedColor
                                                                        };
                                                                        expandedChipWindow.postMessage(JSON.stringify(pass_data),"*");
                                                                    } */
                        });
                    });
                    //plotInt(); //draw the points
                };
            });
        });
    });
}

/************************ BEGIN OSU PORT ***************************/
//DEFINE LOADING FUNCTIONS AND LISTENERS//
function getDataOSU(sessionInfo,specIndex,activeRedSpecIndex,activeGreenSpecIndex,activeBlueSpecIndex,ylabel){
    $.getJSON(getUrls(sessionInfo).selectedSpec).done(function(returnedData){ //origData
        $("#targetDOY").text("(Target DOY: "+returnedData[0].target_day + ")")
        origData = returnedData; //reset global
        n_chips = origData.length; //reset global
        lastIndex = n_chips-1; //reset global
        data = {"Values":[]}; //reset global
        allData = {"Values":[]}; //reset global
        chipInfo = {useThisChip:[],canvasIDs:[],imgIDs:[],sxOrig:[],syOrig:[],sWidthOrig:[],sxZoom:[],syZoom:[],sWidthZoom:[],chipsInStrip:[],year:[],julday:[],src:[],sensor:[]}; //reset global
        yearList = []; //reset gobal

        for(var i=0;i<n_chips;i++){
            data.Values.push(parseSpectralData(origData,i));
            yearList.push(origData[i].image_year);
        }

        //set the default x domain max to the max year of the data, plus 1 to get a line at the end of the year
        var maxXdomain = d3.max(yearList)+1;
        var minXdomain = d3.min(yearList)-1;
        defaultDomain.year.max = maxXdomain;
        currentDomain.year.max = maxXdomain;
        defaultDomain.year.min = minXdomain;
        currentDomain.year.min = minXdomain;


        data = calcIndices(data); //reset global - calculate the spectral indices
        rgbColor = scaledRGB(data, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, n_chips); //reset global - calculate the rbg color
        data = calcDecDate(data); //could wrap this into data appending push function
        /*	YANG: 2016.08.06: warren want to change it to global stretch
        Yang: 2016.08.31: warren want to change it back to always local stretch */
        if (!currentDomain.hasCustomizedXY) {
            updateStretch();
        }
        /**/
        var urlList = [];
        var count = [];
        for(var i=0;i<n_chips;i++){
            urlList.push(getUrls(sessionInfo, origData[i].image_year).annualSpec)
            count.push(0)
        }

        urlList.forEach(function(listItem,index){
            $.getJSON(listItem).done(function(returnedData){
                for(var i=0;i<returnedData.length;i++){
                    allData.Values.push(parseSpectralData(returnedData,i));
                }
                //make sure that all of the urls have been added to "allData" before getting the plot interps and plotting the points - need "selectThese" to be determined first - any other way and asynchronous loading will mess it up
                count[index] = 1//++;
                if (d3.sum(count) == n_chips){
                    allData = calcIndices(allData); //reset global - calculate the spectral indices
                    allDataRGBcolor = scaledRGB(allData, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, allData.Values.length); //reset global - calculate the rbg color
                    allData = calcDecDate(allData); //could wrap this into data appending push function
                    allDecdate = [];

                    allData.Values.forEach(function(v){
                        allDecdate.push(v.decDate)
                    })

                    //get the plot interpretations
                    $.getJSON(getUrls(sessionInfo).plotInterp).done(function(vertices){
                        if (vertices.length > 0 && vertices[0].plotid != sessionInfo.plotID) {
                            return;
                        }

                        vertInfo = [];
                        vertices.forEach(function(v) {
                            vertInfo.push({
                                year: v.image_year,
                                julday: v.image_julday,
                                index: yearList.indexOf(v.image_year),//idx,
                                landUse: {
                                    primary: {
                                        landUse: v.dominant_landuse,
                                        notes: parseNote(v.dominant_landuse_notes, 'landuse')
                                    },
                                    secondary: {
                                        landUse: v.secondary_landuse,
                                        notes: parseNote(v.secondary_landuse_notes, 'landuse')
                                    }
                                },
                                landCover: {
                                    landCover: v.dominant_landcover,
                                    other: parseNote(v.dominant_landcover_notes, 'landcover')
                                },
                                changeProcess: {
                                    changeProcess: v.change_process,
                                    notes: parseNote(v.change_process_notes, 'process')
                                }
                            });
                        });

                        //fill in the comment box and the isExampleCheckbox
                        $.getJSON(getUrls(sessionInfo).plotComment).done(function(commentObj){
                            $("#commentInput").val(commentObj.comment);
                            $("#isExampleCheckbox").prop("checked",commentObj.is_example == 1);
                        });

                        //check to see if vert info has been filled in for this plot
                        if(vertInfo.length !=0){
                            for(var i=0;i<vertInfo.length;i++){
                                selectThese.push(vertInfo[i].index); //reset global
                            }
                        } else{
                            selectThese = [0,lastIndex]
                            for(var i=0;i<selectThese.length;i++){
                                vertInfo.push({year:origData[selectThese[i]].image_year,julday:origData[selectThese[i]].image_julday,index:selectThese[i],landUse:{
                                        //dominant:"",notes:{wetland:false,mining:false,rowCrop:false,orchardTreeFarm:false,vineyardsOtherWoody:false}
                                        primary:{landUse:"",notes:{wetland:false,mining:false,rowCrop:false,orchardTreeFarm:false,vineyardsOtherWoody:false}},
                                        secondary:{landUse:"",notes:{wetland:false,mining:false,rowCrop:false,orchardTreeFarm:false,vineyardsOtherWoody:false}}
                                    },landCover:{landCover:"",other:{trees:false,shrubs:false,grassForbHerb:false,impervious:false,naturalBarren:false,snowIce:false,water:false}},changeProcess:{changeProcess:"",notes:{natural:false,prescribed:false,sitePrepFire:false,airphotoOnly:false,clearcut:false,thinning:false,flooding:false,reserviorLakeFlux:false,wetlandDrainage:false}}})
                            }
                        }

                        //$(".segment").remove(); //reset the form
                        //$(".vertex").remove(); //reset the form

                        fillInForm() //fill out the form inputs
                        plotInt(); //draw the points
                        makeChipInfo("json", origData)
                        appendSrcImg(); //append the src imgs
                        appendChips("annual",selectThese); //append the chip div/canvas/img set

                        //once the imgs have loaded make the chip info and draw the img to the canvas and display the time-lapse feature
                        $("#img-gallery").imagesLoaded(function(){
                            //makeChipInfo("json", origData); //chip info array gets set in "appendChips" gets filled out here because we have to wait until the imgs have loaded to get their height (used when chip strip is the src - not needed when chips are singles)
                            drawAllChips("annual");	//draw the imgs to the canvas
                            //tlInt(); //draw the time-lapse img - this is for the time lapse video - not used
                            /* 										if ((expandedChipWindow != null) && expandedChipWindow.closed == false){
                                                                        var selectedColor = $("#selectedColor").prop("value");
                                                                        var pass_data = {
                                                                            "action":"init_chips", //hard assign
                                                                            "selectThese":selectThese, //selectThese, //"n_chips":"40", //get this from the img metadata
                                                                            "chipInfo":chipInfo,
                                                                            "n_chips":n_chips,
                                                                            "chipDisplayProps":chipDisplayProps,
                                                                            "selectedColor":selectedColor
                                                                        };
                                                                        expandedChipWindow.postMessage(JSON.stringify(pass_data),"*");
                                                                    } */
                        });
                    });
                    //plotInt(); //draw the points
                };
            });
        });
    });
}

//function to populate the project list when #projectList element finishes loading
function addProjectDataOSU(sessionInfo){
    $.getJSON(getUrls(sessionInfo).projectList).done(function(object){
        console.log(object);
        for(var i=0;i<object.length;i++){
            $("#projectList").append('<li value="' + object[i].project_id + '" data-size="' + object[i].plot_size + '">'+object[i].project_code+'</li>')
            packetInfo[object[i].project_id] = object[i].packet_ids;
        }
    });
}

function getUrlsFromOSU(sessionInfo, year){
    var server = 'https://timesync.forestry.oregonstate.edu/_ts3';
    var urls = {
        "annualSpec": server + '/data/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa+'/'+sessionInfo.plotID+'/'+year,
        "selectedSpec": server + '/data/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa+'/'+sessionInfo.plotID,
        "projectList": server + '/project/'+sessionInfo.userID,
        "plotInterp": server + '/index.php/vertex/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa+'/'+sessionInfo.plotID,
        "plotComment": server + '/comment/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa+'/'+sessionInfo.plotID,
        "plotList": server + '/plot/'+sessionInfo.userID+'/'+sessionInfo.projectID+'/'+sessionInfo.tsa + '/' + sessionInfo.packet,
        "respDesign": server + '/config/response/'+sessionInfo.projectID,
        "chipOverRide": server + '/image/override',
        "vertInfoSave": server + '/vertex/save',
        "commentSave": server + '/comment/save'
    }
    return urls
}

function appendPlotsOSU(sessionInfo){
    $("#projBtn").empty().append(sessionInfo.projectCode+'<span class="caret projBtn"></span>');
    $("#plotList").empty();

    $.getJSON(getUrls(sessionInfo).plotList).done(function(object){
        console.log(object);
        for(var i=0;i<object.length;i++){
            if(object[i].is_complete == 1){
                //$("#plotList").append('<li class="done">'+object[i].plotid+'</li>');
                if(object[i].is_example != 1){
                    $("#plotList").append('<li style="display:none"><small><span class="glyphicon glyphicon-ok" style="margin-right:3px"></span></small>'+object[i].plotid+'</li>');
                } else{
                    $("#plotList").append('<li style="display:none" class="example"><small><span class="glyphicon glyphicon-ok" style="margin-right:3px"></span></small>'+object[i].plotid+'</li>');
                }
            } else {
                //$("#plotList").append('<li>'+object[i].plotid+'</li>');
                if(object[i].is_example != 1){
                    $("#plotList").append('<li style="display:none"><small><span class="glyphicon glyphicon-none" style="margin-right:3px"></span></small>'+object[i].plotid+'</li>');
                } else{
                    $("#plotList").append('<li style="display:none" class="example"><small><span class="glyphicon glyphicon-none" style="margin-right:3px"></span></small>'+object[i].plotid+'</li>');
                }
            }
        }

        //show the plot in the list - depends on the status of the exmaplePlots checkbox
        if($("#examplePlots").prop("checked")){
            $(".example").show()
        } else{
            $("#plotList li").show()
        }

        //checkAllPlots(sessionInfo);
        //append the tooltips
        if($("#toolTipsCheck").hasClass("glyphicon-ok")){
            $("#plotList li").prop("title","This is a plot selector. Clicking on it will load the plot's spectral time series data and the corresponding image chips. Each time you select a new plot the display properties of the previous plot will be saved for the session. Segmentation and vertex interpretations will also be saved.")
            $("#plotList li").find("span").prop("title","This is a plot complete indicator. A checkmark will appear when a plot's interpretation is complete.")
        }
    })
}
/************************ END OSU PORT ***************************/

//function to populate the project list when #projectList element finishes loading
function addProjectData(sessionInfo){
    $.getJSON(getUrls(sessionInfo).projectList).done(function(object){
        console.log(object);
        for(var i=0;i<object.length;i++){
            /*TSCEO
                1. add ts_plot_size, ts_target_day, ts_start_year, ts_end_year
            */
            var tsConfig = {
                'tsPlotSize': 1,
                'tsTargetDay': 215,
                'tsStartYear': 1985,
                'tsEndYear': 2017,
                'numPlots': object[i].numPlots
            }

            var prjItem = `<li value="${object[i].id}" 
                                data-size="1" 
                                data-ts-target-day="${tsConfig.tsTargetDay}" 
                                data-ts-start-year="${tsConfig.tsStartYear}"
                                data-ts-end-year="${tsConfig.tsEndYear}"
                                data-num-plots="${tsConfig.numPlots}">${object[i].name}</li>`;

            // $("#projectList").append('<li value="' + object[i].id + '" data-size="' + 1 + '" data-ts-config="' + 'JSON.stringify(tsConfig)' + '">'+object[i].name+'</li>')
            $("#projectList").append(prjItem);
            packetInfo[object[i].id] = object[i].packet_ids === undefined ? null : object[i].packet_ids;
        }
    });
}



function parseSpectralData(origData,i){
    var vertInfoSpec = {
        "Year":origData[i].image_year,
        "doy":origData[i].image_julday,
        "B1":parseInt(origData[i].b1)/10000,
        "B2":parseInt(origData[i].b2)/10000,
        "B3":parseInt(origData[i].b3)/10000,
        "B4":parseInt(origData[i].b4)/10000,
        "B5":parseInt(origData[i].b5)/10000,
        "B7":parseInt(origData[i].b7)/10000,
        "cloud_cover": parseInt(origData[i].cloud_cover)
    }
    return vertInfoSpec
}

//listener/action for when the body has loaded - append the projects to the projects list
$("#projectList").load(addProjectData(sessionInfo))

//if the comment area is typed in, then the session is dirty and should be saved
$('#commentInput').keypress(function(){
    sessionInfo.isDirty = true;
});

$('#exportBtn').click(function(event) {
    var target = 'exportts.php?t=' + authHeader + '&pid=' + sessionInfo.projectID + '&uid=' + sessionInfo.userID;
    if (sessionInfo.projectID == '') {
        return;
    }
    window.location.href=target;
});

//if the isExampleCheckbox is altered, then the session is dirty and should be saved, also the class of the #plotList li.selected needs to be updated
$('#isExampleCheckbox').change(function(){
    sessionInfo.isDirty = true;
    var thisPlotLi = $("#plotList li.selected");
    if(this.checked == true){
        thisPlotLi.addClass("example");
    } else{
        thisPlotLi.removeClass("example");
    }
    //update the list
    if($("#examplePlots").prop("checked") == true){
        showHideExamples();
    }

});

//listener/action for when a project is clicked on - append plots to the plot list for that project
$("body").on("click", "#projectList li", function(){
    clearThePlotDisplay(sessionInfo, vertInfo) //vertInfo is null because it may not have been created yet if this is the first loading
    sessionInfo.projectID = $(this).val();
    sessionInfo.projectCode = $(this).text();
    sessionInfo.plotID = ""; //defaulted as "" when application is first opened, do this to reset to default if a new project is selected from the same session or else the plotID will still be assigned, but from the last project
    sessionInfo.plots = [];
    sessionInfo = {...sessionInfo, ...$(this).data()};
    chipDisplayProps.box = $(this).data().size;

    var thesePackets = packetInfo[sessionInfo.projectID];
    $('#packetList').empty();
    //if no packet information is defined, autoload all plots and disable packet list
    if (thesePackets === null) {
        $('#packetBtn').prop('disabled', true);
        $("#packetBtn").empty().append('All<span class="caret projBtn"></span>');
        sessionInfo.packet = -1;
    }
    else {
        $('#packetBtn').prop('disabled', false);
        var packets = thesePackets.split(',').forEach(function(v, i) {
            $('#packetList').append('<li value="' + v + '">Packet ' + v + '</li>')
            if (i === 0) {
                $("#packetBtn").empty().append('Packet ' + v +'<span class="caret projBtn"></span>');
                sessionInfo.packet = v
            }
        });
    }
    appendPlots(sessionInfo);
});

//listener/action for when a project is clicked on - append plots to the plot list for that project
$("body").on("click", "#packetList li", function(){
    clearThePlotDisplay(sessionInfo, vertInfo) //vertInfo is null because it may not have been created yet if this is the first loading
    sessionInfo.packet = $(this).val();
    sessionInfo.plotID = ""; //defaulted as "" when application is first opened, do this to reset to default if a new project is selected from the same session or else the plotID will still be assigned, but from the last project

    $("#packetBtn").empty().append('Packet ' + sessionInfo.packet +'<span class="caret projBtn"></span>');
    appendPlots(sessionInfo);
});


//listener/action for when a project is clicked on - append plots to the plot list for that project
$("body").on("click", "#packetList li", function(){
    // clearThePlotDisplay(sessionInfo, vertInfo) //vertInfo is null because it may not have been created yet if this is the first loading
    // sessionInfo.projectID = $(this).val();
    // sessionInfo.projectCode = $(this).text();
    // sessionInfo.plotID = ""; //defaulted as "" when application is first opened, do this to reset to default if a new project is selected from the same session or else the plotID will still be assigned, but from the last project
    // sessionInfo.plotSize = $(this).data().size;
    // chipDisplayProps.box = $(this).data().size;
    // appendPlots(sessionInfo);
});



//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////FUNCTIONS TO CHECK IF VERTINFO IS COMPLETE FOR A PLOT///////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//function to check if plots are done and add a class to them that changes their background color if they are
function checkPlot(sessionInfo, vertInfo){
    var nVerts = vertInfo.length
    if(nVerts == 0 | sessionInfo.plotID == ""){return} //if it has never been clicked on before then leave, else check if it is a complete interpretation
    var total = 0;
    vertInfo.forEach(function(v){
        total = total + (v.changeProcess.changeProcess != "" ? 1:0);
        total = total + (v.landUse.primary.landUse != "" ? 1:0);
        total = total + (v.landCover.landCover != "" ? 1:0);
    });

    //find the li that we're working with if is hasn't be supplied (after clicking to a new )
    var thisPlotLi = $("#plotList li.selected");

    //if(typeof thisPlotLi === "undefined"){
    //	$("#plotList li").each(function(){
    //		if($(this).text() == sessionInfo.plotID){
    //			thisPlotLi = $(this)
    //			return
    //		}
    //	});
    //}
    var done = false;
    if(total+1 == nVerts*3){
        //thisPlotLi.addClass("done")
        thisPlotLi.find("span").removeClass().addClass("glyphicon glyphicon-ok")
        done = true;
    }else{
        //thisPlotLi.removeClass("done")
        thisPlotLi.find("span").removeClass().addClass("glyphicon glyphicon-none")
    }
    return done;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////



//function to clear all plot elements in preparation for a new plot display - gets called when a new plot is selected or a new project is selected
function clearThePlotDisplay(sessionInfo, vertInfo){
    //console.log(vertInfo);
    saveVertInfo(sessionInfo, vertInfo); //save any info from the current plot selection
    $("#chip-gallery, #img-gallery, #svg").empty(); //reset
    $(".segment, .vertex").remove(); //empty the current vertex and segment forms
    $("#commentInput").val("")
    $("#isExampleCheckbox").prop("checked",false)
    if((chipstripwindow != null) && chipstripwindow.closed == false){
        var message = {"action":"clearChips"}
        chipstripwindow.postMessage(JSON.stringify(message),"*");
    }
    //tlctx.clearRect(0, 0, 235, 235); //reset this is for the time lapse video - not used
    timeLapseIndex = 0; //reset
    selectedCircles = []; //reset
    lineData = []; //reset
    selectThese = []; //reset
    vertInfo = [];
}

//function to load and append plots when a project is clicked on
function appendPlots(sessionInfo){
    $("#projBtn").empty().append(sessionInfo.projectCode+'<span class="caret projBtn"></span>');
    $("#plotList").empty();

    $.getJSON(getUrls(sessionInfo).plotList).done(function(object){
        console.log(object);
        //TSCEO keep a copy of the plots list
        sessionInfo.plots = object;
        for(var i=0;i<object.length;i++){
            //TSCEO: temporaly force to have value for is_complete and is_example
            object[i].is_complete = 0;
            object[i].is_example = 0;

            let center = object[i].center;

            if(object[i].is_complete == 1){
                //$("#plotList").append('<li class="done">'+object[i].plotid+'</li>');
                if(object[i].is_example != 1){
                    let pLi = `<li style="display:none" data-center='${center}'>
                                    <small>
                                        <span class="glyphicon glyphicon-ok" style="margin-right:3px"></span>
                                    </small>${object[i].id}</li>`;
                    $("#plotList").append(pLi);
                } else{
                    let pLi = `<li style="display:none" class="example" data-center='${center}'>
                    <small>
                        <span class="glyphicon glyphicon-ok" style="margin-right:3px"></span>
                    </small>${object[i].id}</li>`;                   
                    $("#plotList").append(pLi);
                }
            } else {
                //$("#plotList").append('<li>'+object[i].plotid+'</li>');
                if(object[i].is_example != 1){
                    let pLi = `<li style="display:none" data-center='${center}'>
                                    <small>
                                        <span class="glyphicon glyphicon-none" style="margin-right:3px"></span>
                                    </small>${object[i].id}</li>`;
                    $("#plotList").append(pLi);
                } else{
                    let pLi = `<li style="display:none" class="example" data-center='${center}'>
                                    <small>
                                        <span class="glyphicon glyphicon-none" style="margin-right:3px"></span>
                                    </small>${object[i].id}</li>`;
                    $("#plotList").append(pLi);
                }
            }
        }

        //show the plot in the list - depends on the status of the exmaplePlots checkbox
        if($("#examplePlots").prop("checked")){
            $(".example").show()
        } else{
            $("#plotList li").show()
        }

        //checkAllPlots(sessionInfo);
        //append the tooltips
        if($("#toolTipsCheck").hasClass("glyphicon-ok")){
            $("#plotList li").prop("title","This is a plot selector. Clicking on it will load the plot's spectral time series data and the corresponding image chips. Each time you select a new plot the display properties of the previous plot will be saved for the session. Segmentation and vertex interpretations will also be saved.")
            $("#plotList li").find("span").prop("title","This is a plot complete indicator. A checkmark will appear when a plot's interpretation is complete.")
        }
    })
}

//listener/handler for example plot check box
$("#examplePlots").change(function() {
    showHideExamples();
});

//handler for turning example plots on and off in the plot list
function showHideExamples(){
    clearThePlotDisplay(sessionInfo, vertInfo); //remove all plot elements in prep for new plot
    $("#plotList li").removeClass("selected");
    if($("#examplePlots").prop("checked") == true){
        $("#plotList li").not(".example").hide();
    } else{
        $("#plotList li").show();
    }
}





//setup the domains
var date = new Date();
defaultDomain.year.max = date.getFullYear()+1; //add one since the data displayed is a decimal if final year is 2016, point might be 2016.56 - need to include up to 2016.99999
var currentDomain = $.extend(true, {}, defaultDomain); //make a copy of the default domain that can be altered
currentDomain["dirty"] = 0; //need to add this since it is not in the default domain
/* YANG 2016.08.06
Yang: 2016.08.31: warren want to change it back to always local stretch */
currentDomain["hasCustomizedXY"] = 0;
/**/


//listener/action for plot selection - load the data for the selected plot
$("body").on("click", "#plotList li", function(e){
    if(e.originalEvent.detail > 1){return;} //no double clicks, it populates the vertInfo structure twice

    var formerPlotID = sessionInfo.plotID

    //temp domain, not defined yet
    saveSetting(sessionInfo.projectID, formerPlotID, currentDomain);

    clearThePlotDisplay(sessionInfo, vertInfo); //remove all plot elements in prep for new plot

    //get and set the sessionInfo.plotID
    var index = $("#plotList li").index($(this));
    sessionInfo.plotID = $(this).text()
    sessionInfo.currentLocation = $(this).data().center;

    currentDomain = getSetting(sessionInfo.projectID, sessionInfo.plotID, defaultDomain)
    currentDomain.dirty = 0; //need to reset this since it is "clean" now

    //checkPlot(sessionInfo, vertInfo); //this gets handled in the saveVertInfo function which gets called in the clearThePlotDisplay function call just 1 line above
    //var thisVertInfo = $("#plotList li").index($("#plotList li.selected"))
    //plotFormInfo[thisVertInfo] = vertInfo;

    $("#plotList li").removeClass("selected");
    $(this).addClass("selected");

    vertInfo = [] //plotFormInfo[index];

    specIndex = $("#indexList li.active").attr('id');
    ylabel = $("#"+specIndex).text() //check to see if this one needs to be passed to the getData function

    getData(sessionInfo,specIndex,activeRedSpecIndex,activeGreenSpecIndex,activeBlueSpecIndex,ylabel)
});

function saveSetting(projectID, plotID, domain){
    if(domain.dirty == 1){localStorage.setItem(projectID + '.' + plotID, JSON.stringify(domain));}
}

function getSetting(projectID, plotID, defaultDomain){
    var currentDomain = JSON.parse(localStorage.getItem(projectID + '.' + plotID));
    if(currentDomain  === null){
        currentDomain = $.extend(true, {}, defaultDomain);
        /* YANG 20160806 currentDomain["hasCustomizedXY"] = 0; */
    }
    return currentDomain
}

////////////////////////////////////////FROM YANG///////////////////////////////////////////////////////////////////////
//Parse Land Use, Land Cover, and Change Process notes * @param note* @param category* @returns {*}

function parseNote(note, category) {
    var landuseNote = {wetland:false, mining:false, rowCrop:false, orchardTreeFarm:false, vineyardsOtherWoody:false};
    var landcoverNote = {trees:false, shrubs:false, grassForbHerb:false, impervious:false, naturalBarren:false, snowIce:false, water:false};
    var processNote = {natural:false, prescribed:false, sitePrepFire:false, airphotoOnly:false, clearcut:false, thinning:false, flooding:false, reserviorLakeFlux:false, wetlandDrainage:false};

    var result = landuseNote;
    if (category == 'landcover') {
        result = landcoverNote;
    }
    else if (category == 'process') {
        result = processNote;
    }
    if (note.trim()=='') {
        return result;
    }

    var items = note.split("|");
    items.forEach(function(item) {
        result[item] = true;
    })
    return result;
}

//serialize Land Use, Land Cover, and Change process notes for database@param notes@returns {string}
//			function serializeNote(notes) {
//				var result = "";
//				var idx = 0;
//				for (var k in notes) {
//					if (notes[k]) {
//						if (idx++ > 0) {
//							result += '|';
//						}
//						result += k;
//					}
//				}
//				return result;
//			}
////////////////////////////////////////FROM YANG///////////////////////////////////////////////////////////////////////








//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////D3 POINT AND LINE SCRIPTS////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

//define function to update the zoom behaviors
function zoomUpdate() {
    xyzoom = d3.behavior.zoom()
        .scaleExtent([1,1])
        .y(yscale)
        .x(xscale)
        .on("zoom", zoomDraw);

    xzoom = d3.behavior.zoom()
        .x(xscale)
        .on("zoom", zoomDraw);
    yzoom = d3.behavior.zoom()
        .y(yscale)
        .on("zoom", zoomDraw);

    xybox.call(xyzoom).on("dblclick.zoom", null); //svg.
    xbox.call(xzoom).on("dblclick.zoom", null); //svg.
    ybox.call(yzoom).on("dblclick.zoom", null);	//svg.

    currentDomain[specIndex].min = xscale.domain()[0];
    currentDomain[specIndex].max = xscale.domain()[1];
    currentDomain[specIndex].min = yscale.domain()[0];
    currentDomain[specIndex].max = yscale.domain()[1];
    currentDomain.year.min = xscale.domain()[0];
    currentDomain.year.max = xscale.domain()[1];
    currentDomain.dirty = 1;
    /* YANG 2016.08.06
    Yang: 2016.08.31: warren want to change it back to always local stretch */
    currentDomain.hasCustomizedXY = 1;
    /**/
}

//define function to redraw the points and update the zoom behavior is invoked
function zoomDraw() {

    svg.select('.y.axis').call(yaxis);
    svg.selectAll("circle")
        .attr("cx", function(d){return xscale(d.decDate);})
        .attr("cy", function(d){return yscale(d[specIndex]);});
    //svg.selectAll("circle.data")
    //	.attr("cx", function(d){return xscale(d.decDate);})
    //	.attr("cy", function(d){return yscale(d[specIndex]);});
    //svg.selectAll("circle.allData")
    //	.attr("cx", function(d){return xscale(d.decDate);})
    //	.attr("cy", function(d){return yscale(d[specIndex]);});

    //draw the x axis - draw this afte the points so that their ticks marks don't draw over it
    svg.select('.x.axis').call(xaxis);


    svg.selectAll("#plotLine").attr("d", lineFunction(lineData));
    svg.selectAll(".vline")
        .attr("x1", function(d){return xscale(d)}) //d.Year
        .attr("x2", function(d){return xscale(d)}) //d.Year
    zoomUpdate();
};

//define function to initialize the spectral trajectory
var plotDrawn = 0; //global variable needed for the window resize
function plotInt(){
    plotDrawn = 1
    //get the range of the x values
    var showPoints = $("#allPointsDisplayThumb").hasClass("glyphicon-thumbs-down");
    if(showPoints == false){
        var pointDisplay = "visible";
        var opacity = 0.5;
    } else {
        var pointDisplay = "hidden"
        var opacity = 1;
    }

    var w = $("#plot").width()
    //$("#svg").attr("width",w)

    //var yearmin = d3.min(data.Values, function(d) {return d.Year;});
    //var	yearmax = d3.max(data.Values, function(d) {return d.Year;});

    //var date = new Date();
    //var yearmin = 1982;
    //var yearmax = date.getFullYear()


    //adjust the ranges so there is some buffer

    //currentDomain.year.min = yearmin; //needs to be a global variable - for resetting the plot to defualt domain
    //currentDomain.year.max = yearmax+1; //needs to be a global variable - for resetting the plot to defualt domain
    //xmin = yearmin;
    //xmax = yearmax+1;


    //make an array of ticks and lables
    //var year //i think this is an abandoned line
    var xLabels = [];
    //for(var i=0;i<=yearmax-yearmin;i+=2){xLabels.push(yearmin+i+0.49)}
    for(var i=0;i<defaultDomain.year.max-defaultDomain.year.min;i+=2){xLabels.push(defaultDomain.year.min+i+0.49)}

    //make an array of vertcal line x positions
    var xGrid = [];
    for(var i=defaultDomain.year.min;i<=defaultDomain.year.max;i++){xGrid.push(i)}
    //for(var i=0;i<=currentDomain.year.max-currentDomain.year.min;i++){xGrid.push(currentDomain.year.min+i)}

    //define the width of the svg plot area
    //var w = 740,//
    var	h = 250;

    //define the plot margins
    var pt = 10, //plot top
        pr = 15, //plot right
        pl = 65, //plot left
        pb = 28; //plot bottom 37

    //define the x scale
    xscale = d3.scale.linear() //NEEDS TO BE A GLOBAL VARIABLE - IS USED HERE AND IN THE UPDATE FUNCTION
        .domain([currentDomain.year.min, currentDomain.year.max])
        .range([pl, w - pr]);

    //define the y scale
    yscale = d3.scale.linear() //NEEDS TO BE A GLOBAL VARIABLE - IS USED HERE AND IN THE UPDATE FUNCTION
        .domain([currentDomain[specIndex].min, currentDomain[specIndex].max]) //domain is a global variable defined in an outside .js file - specIndex is also global variable
        .range([h - pb, pt]);

    //define the x axis
    xaxis = d3.svg.axis()
        .scale(xscale)
        .orient("bottom")
        .tickValues(xLabels)
        .tickFormat(d3.format(".4r"))
        .outerTickSize(0);
    //.tickFormat(d3.format("d"));


    //define the x axis
    yaxis = d3.svg.axis() //NEEDS TO BE A GLOBAL VARIABLE - IS USED HERE AND IN THE UPDATE FUNCTION
        .tickSize((-w+pr+pl), 0)
        .scale(yscale)
        .orient("left");

    //define the zoom behavior
    xyzoom = d3.behavior.zoom()
        .scaleExtent([1,1])
        .y(yscale)
        .x(xscale)
        .on("zoom", zoomDraw); //zoomed

    xzoom = d3.behavior.zoom()
        .x(xscale)
        .on("zoom", zoomDraw);
    yzoom = d3.behavior.zoom()
        .y(yscale)
        .on("zoom", zoomDraw);

    //retrieve the svg reference
    svg = d3.select("#svg");

    //make the default line data
    //lineData = [ //needs to be local variable
    //	{"x":yearmin ,"y":data.Values[0][specIndex]},
    //	{"x":yearmax ,"y":data.Values[len-1][specIndex]}
    //];

    //make the line function to convert the xy object to svg path syntax
    lineFunction = d3.svg.line() //global because it gets used when selecting new points
        .x(function(d){return xscale(d.x);})
        .y(function(d){return yscale(d.y);})
        .interpolate("linear");

    //append an xy box
    xybox = svg.append("rect")
        .attr("class", "zoom xy box")
        .attr("id","xybox")
        .attr("x", pl) //70
        .attr("y", pt) //10
        .attr("width", w - pl - pr)
        .attr("height", h - pt - pb)
        .style("visibility", "hidden")
        .attr("pointer-events", "all")
        .call(xyzoom)
        .on("dblclick.zoom", null)


    var vline = svg.selectAll(".vline")
        .data(xGrid) //.data(data.Values)
        .enter()
        .append("line")
        .attr("x1", function(d){return xscale(d)}) //d.Year
        .attr("x2", function(d){return xscale(d)}) //d.Year
        .attr("y1", function(d){return -20000})
        .attr("y2", function(d){return 20000})
        .attr("class","vline")


    //.selectAll("text")
    //.attr("y", -10)
    //.attr("x", 12)
    //.attr("transform", "rotate(90)")

    //draw the y axis
    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + pl + ",0)")
        .call(yaxis);

    //append all the points
    allCircles = svg.selectAll(".allData")
        .data(allData.Values)
        .enter()
        .append("circle")
        .filter(function(d) {
            if ($('#showAnomaly').prop('checked')) {
                return d.cloud_cover == 0;
            }
            else {
                return true;
            }
        })
        //.style("fill-opacity",0.25) //0.25
        .attr("visibility",pointDisplay) //"hidden"
        .style("fill",function(d){return dataRGB(d, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2);})
        // .style("fill",function(d,i){return allDataRGBcolor[i];})
        .attr("cx", function(d){return xscale(d.decDate);}) //d.decDate
        .attr("cy", function(d){return yscale(d[specIndex]);})
        .attr("r", 3)
        .attr("class","allData");

    //append the representative points
    var rad = w*0.0085;
    circles = svg.selectAll(".data")
        .data(data.Values)
        .enter()
        .append("circle")
        .style("fill-opacity",opacity)
        .style("fill",function(d,i){return rgbColor[i];})
        .attr("cx", function(d){return xscale(d.decDate);})
        .attr("cy", function(d){return yscale(d[specIndex]);})
        .attr("r", rad)
        .attr("class","data unselected");

    //draw the x axis - draw this afte the points so that their ticks marks don't draw over it
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (h - pb) + ")")
        .call(xaxis)

    //add label for the y axis
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", (h-pb)/-2)
        .attr("y", 15)
        .style("text-anchor", "middle")
        .text(ylabel) //"TC Wetness"
        .attr("id","specPlotIndex");

    //define clip path so that circles don't go outside the axes
    svg.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", 70)
        .attr("y", 10)
        .attr("width", w-pr-pl)
        .attr("height", h-pb-pt);

    //append an x box
    xbox = svg.append("rect")
        .attr("class", "zoom x box")
        .attr("id","xbox")
        .attr("x", pl)
        .attr("y", h-pb)
        .attr("width", w - pl - pr)
        .attr("height", pb)
        .style("visibility", "hidden")
        .attr("pointer-events", "all")
        .call(xzoom)
        .on("dblclick.zoom", null)

    //append a y box
    ybox = svg.append("rect")
        .attr("class", "zoom y box")
        .attr("id","ybox")
        .attr("y", pt)
        .attr("width", pl)
        .attr("height", h - pt - pb)
        .style("visibility", "hidden")
        .attr("pointer-events", "all")
        .call(yzoom)
        .on("dblclick.zoom", null)

    //append title for tooltips
    if($("#toolTipsCheck").hasClass("glyphicon glyphicon-ok")){
        d3.selectAll("circle.data").append("svg:title").text("This is an annual spectral time series point. It is the spectral return for the pixel at the plot center for the day selected to represent this year in the annual time series. Hovering over it will activate a green highlight outline that corresponds to the green highlight outline of the matched image chip in the chip gallery. The highlighting feature makes it easy to know which point belongs to which image chip. Doubling clicking the point will toggle it as a vertex. The first and last points cannot be toggled.")
        d3.selectAll("circle.allData").append("svg:title").text("This is an intra-annual spectral time series point. It is the spectral return for the pixel at the plot center for one of all days selected to represent a year in the annual time series. It will be highlighted blue when hovering over an image chip in the intra-annual chip window as a correspondence marking feature. These points are helpful for determining the intra-annual variability of plots and can help make a more informed decision about whether to place a vertex or change the default annual point/image chip.")
        d3.selectAll("#xbox").append("svg:title").text("This is the x-axis. Click and hold to drag the scale to the left or right and mouse wheel to zoom in and out.")
        d3.selectAll("#ybox").append("svg:title").text("This is the y-axis. Click and hold to drag the scale up or down and mouse wheel to zoom in and out.")
    } else{
        d3.selectAll("circle.data").append("svg:title").text("")
        d3.selectAll("circle.allData").append("svg:title").text("")
        d3.selectAll("#xbox").append("svg:title").text("")
        d3.selectAll("#ybox").append("svg:title").text("")
    }

    //default the first and last circles to class "selected"
    var dataCircles = $("circle.data");
    for(var i=0;i<selectThese.length;i++){
        dataCircles.eq(selectThese[i]).attr("class","data selected");
        lineData.push({"x":data.Values[selectThese[i]].decDate ,"y":data.Values[selectThese[i]][specIndex]}) //.Year
    }


    //add the default line
    var lineGraph = svg.append("path") //local because it will get overwritten
        .attr("d", lineFunction(lineData))
        //.style("stroke", $("#selectedColor").prop("value"))
        .attr("id","plotLine");

    //Define the svg text element for the DOY tooltip
    var doyTxt = svg.append("text")
        .attr("id", "doyTxt")
        .attr("text-anchor", "middle")
        .style("opacity", 0);


    //show doy on hover
    allCircles.on("mouseover", function(d){
        doyTxt.text(d.doy)
            .attr("x", xscale(d.decDate))
            .attr("y", yscale(d[specIndex]) - 10)
            .style("opacity", 1);
    })
        .on("mouseout", function(d){
            doyTxt.style("opacity", 0);
        });

    //show doy on hover
    circles.on("mouseover", function(d){
        doyTxt.text(d.doy)
            .attr("x", xscale(d.decDate))
            .attr("y", yscale(d[specIndex]) - 20)
            .style("opacity", 1);
    })
        .on("mouseout", function(d){
            doyTxt.style("opacity", 0);
        });

    //add the path to the circles to activate the clipping
    circles.attr("clip-path", "url(#clip)");
    allCircles.attr("clip-path", "url(#clip)");
    lineGraph.attr("clip-path", "url(#clip)");
    vline.attr("clip-path", "url(#clip)");


    //dataCircles.eq(0).attr("class","data selected");
    //dataCircles.eq(len-1).attr("class","data selected");

    //fill in the global selectedCircles variable for the first time
    var selectedCirclesTemp = $("circle.data.selected");
    selectedCircles = [];
    for(var i=0; i < selectedCirclesTemp.length; i++){
        selectedCircles.push(dataCircles.index(selectedCirclesTemp[i]));
    }
    setSelectedColor(); //set the selected color of the line and the circles
    //updateSegmentForm();

    //if the line and vertices are set to "no show" then make them transparent
    if ($("#lineDisplayThumb").attr("class") == "glyphicon glyphicon-thumbs-down"){
        $("circle.selected").css("stroke-opacity","0");
        $("circle.highlight").css("stroke-opacity","0");
        $("#plotLine").css("stroke-opacity","0");
    }


}
/* YANG 2016.
Yang: 2016.08.31: warren want to change it back to always local stretch */
function updateStretch() {
    var specs = ['B1','B2','B3','B4','B5','B7','TCB','TCG','TCW','TCA','NDVI','NBR'];
    specs.map(function(specIndex) {
        var localMin = d3.min(data.Values, function(d) {return d[specIndex];}); //get the local min
        var localMax = d3.max(data.Values, function(d) {return d[specIndex];}); //get the local max
        var buffer = (localMax - localMin) * 0.1; //calulate a buffer to add to the min and max so that the point is not cut off
        localMin -= buffer; //adjust the min by the buffer
        localMax += buffer; //adjust the max by the buffer

        currentDomain[specIndex].min = localMin; //set the currentDomain min for the specIndex
        currentDomain[specIndex].max = localMax; //set the currentDomain max for the specIndex
    });
}
/**/

//define function to update the D3 scatterplot when new selection are made
function plotUpdate(data, specIndex, rgbColor, currentDomain){
    //reset the y domain based on new spectral index
    yscale.domain([currentDomain[specIndex].min, currentDomain[specIndex].max]); //yscale was defined in the plotInt function

    //update the zoom since the y axis domain has changed
    zoomUpdate()

    //update the circles with new data
    svg.selectAll("circle.allData") //svg was defined in the plotInt function
    // .data(allData.Values)
        .transition()
        .duration(500)
        //.attr("cx", function(d){return xscale(d.decDate);})
        .attr("cy", function(d){return yscale(d[specIndex]);})
        .style("fill",function(d){return dataRGB(d, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2);})
    // .style("fill",function(d,i){return allDataRGBcolor[i]})

    svg.selectAll("circle.data") //svg was defined in the plotInt function
        .data(data.Values)
        .transition()
        .duration(500)
        //.attr("cx", function(d){return xscale(d.decDate);})
        .attr("cy", function(d){return yscale(d[specIndex]);})
        .style("fill",function(d,i){return rgbColor[i]})

    //make a new line
    lineData = [];
    for(var i=0; i < selectedCircles.length; i++){
        var thisone = selectedCircles[i];
        lineData[i] = ({"x":data.Values[thisone].decDate, "y":data.Values[thisone][specIndex]}); //.push
    }

    //update the line
    svg.selectAll("#plotLine") //local because it will get overwritten
        .transition()
        .duration(500)
        .attr("d", lineFunction(lineData));

    //update y axis
    svg.select(".y.axis") //svg was defined in the plotInt function
        .transition()
        .duration(500)
        .call(yaxis);
}

function updatePlotRGB(){
    svg.selectAll("circle.data") //svg was defined in the plotInt function
        .transition()
        .duration(500)
        .style("fill",function(d,i){return rgbColor[i]})

    svg.selectAll("circle.allData") //svg was defined in the plotInt function
        .transition()
        .duration(500)
        .style("fill",function(d,i){return allDataRGBcolor[i]})
}

function changePlotPoint(){
    svg.selectAll("circle.data") //svg was defined in the plotInt function
        .data(data.Values) //data value changed so need to rebind the data
        .transition()
        .duration(500)
        .attr("cx", function(d){return xscale(d.decDate);})
        .attr("cy", function(d){return yscale(d[specIndex]);})
        .style("fill",function(d,i){return rgbColor[i]})

    //make a new line in case the point is also a vertex
    lineData=[];
    for(var i=0; i < selectedCircles.length; i++){
        var thisone = selectedCircles[i];
        lineData.push({"x":data.Values[thisone].decDate, "y":data.Values[thisone][specIndex]})
        //lineData[i] = ({"x":data.Values[thisone].decDate, "y":data.Values[thisone][specIndex]}); //.push
    }
    //update the line
    svg.selectAll("#plotLine")
        .transition()
        .duration(500)
        .attr("d", lineFunction(lineData));
}


//define function to add and remove line segments
function changePlotLine(){
    var selectedCirclesTemp = $("circle.selected");
    lineData = [] //reset lineData
    selectedCircles = []; //reset selectedCircles
    for(var i=0; i < selectedCirclesTemp.length; i++){
        var thisone = $("circle.data").index(selectedCirclesTemp[i]);
        selectedCircles.push(thisone);
        lineData.push({"x":data.Values[thisone].decDate, "y":data.Values[thisone][specIndex]});
    }

    $("#plotLine").remove(); //remove the line

    lineGraph = svg.append("path") //redraw the line
        .attr("d", lineFunction(lineData))
        .attr("id","plotLine")
        .attr("clip-path", "url(#clip)");

    //updateSegmentForm();
}

//mechanism to reset the plot zoom
$("#btnResetGlobal").click(function(){
    //svg.call(xyzoom
    //	.x(xscale.domain([defaultDomain.year.min, defaultDomain.year.max])) //xmin and xmax are global variables that are set in the "plotInt" function
    //	.y(yscale.domain([defaultDomain[specIndex].min, defaultDomain[specIndex].max])) //domain is javascript object that comes from an outside file
    //	.event);
    svg.call(xzoom
        .x(xscale.domain([defaultDomain.year.min, defaultDomain.year.max])) //xmin and xmax are global variables that are set in the "plotInt" function
        .y(yscale.domain([defaultDomain[specIndex].min, defaultDomain[specIndex].max])) //domain is javascript object that comes from an outside file
        .event);
    svg.call(yzoom
        .x(xscale.domain([defaultDomain.year.min, defaultDomain.year.max])) //xmin and xmax are global variables that are set in the "plotInt" function
        .y(yscale.domain([defaultDomain[specIndex].min, defaultDomain[specIndex].max])) //domain is javascript object that comes from an outside file
        .event);
});

$("#btnResetLocal").click(function(){
    //svg.call(xyzoom
    //	.x(xscale.domain([defaultDomain.year.min, defaultDomain.year.max])) //xmin and xmax are global variables that are set in the "plotInt" function
    //	.y(yscale.domain([defaultDomain[specIndex].min, defaultDomain[specIndex].max])) //domain is javascript object that comes from an outside file
    //	.event);
    localStretch();
});


function localStretch() {
    var localMin = d3.min(data.Values, function(d) {return d[specIndex];}); //get the local min
    var localMax = d3.max(data.Values, function(d) {return d[specIndex];}); //get the local max
    var buffer = (localMax - localMin) * 0.1; //calulate a buffer to add to the min and max so that the point is not cut off
    localMin -= buffer; //adjust the min by the buffer
    localMax += buffer; //adjust the max by the buffer

    currentDomain[specIndex].min = localMin; //set the currentDomain min for the specIndex
    currentDomain[specIndex].max = localMax; //set the currentDomain max for the specIndex

    svg.call(xzoom
        .x(xscale.domain([defaultDomain.year.min, defaultDomain.year.max])) //xmin and xmax are global variables that are set in the "plotInt" function
        .y(yscale.domain([currentDomain[specIndex].min, currentDomain[specIndex].max])) //domain is javascript object that comes from an outside file
        .event);
    svg.call(yzoom
        .x(xscale.domain([defaultDomain.year.min, defaultDomain.year.max])) //xmin and xmax are global variables that are set in the "plotInt" function
        .y(yscale.domain([currentDomain[specIndex].min, currentDomain[specIndex].max])) //domain is javascript object that comes from an outside file
        .event);
}



//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////

//resizes the trajectory plot when the browser window if resized - min width is 1150px
$(window).resize(function(r){
    //windowH and windowW are global variables
    var newHeight = $(window).height()
    var newWidth = $(window).width();
    if(newHeight != windowH){
        setChipGalleryLength();
    }
    if(newWidth != windowW && plotDrawn == 1){
        $("#svg").empty(); //reset
        selectedCircles = []; //reset
        lineData = []; //reset
        plotInt(); //redraw the plot
    }
});


//define function to update the circle selection
function changeSelectedClass(seriesIndex){
    var thisCircle = $("circle.data").eq(seriesIndex);
    var thisChipHolder = $(".chipHolder").eq(seriesIndex); //thisCanvas
    var status = thisCircle.attr("class");
    if(status == "data unselected"){ //add a vertex
        thisCircle.attr("class","data selected");
        thisChipHolder.addClass("selected");
        updateSegmentForm(seriesIndex,"add")
    } else { //remove a vertex
        thisCircle.attr("class","data unselected");
        thisCircle.css("stroke","none");
        thisChipHolder.removeClass("selected");
        thisChipHolder.css("border-color","white");
        updateSegmentForm(seriesIndex,"remove")
    }
    changePlotLine(); //update the plotline
    //updateSegmentForm(); //update the segment forms

    setSelectedColor();
    circleBorderColor = thisCircle.css("stroke");
    //circleBorderWidth = thisCircle.css("stroke-width");
    thisCircle.css({"stroke":highLightColor,"stroke-width":5}).attr("id","hover")
    thisChipHolder.addClass("hover")
    borderColor = thisChipHolder.css("borderTopColor");
    thisChipHolder.css({"borderTopColor":highLightColor,"borderRightColor":highLightColor,"borderBottomColor":highLightColor,"borderLeftColor":highLightColor,});
}

//make the trajectory svg circles selectable
$(document).on("dblclick", "circle.data, .chipHolder.annual", function(e){ //need to use this style event binding for elements that don't exisit yet - these lines will run before the "circle" elements are created, alternatively could use the commented lines in the above jquery section
    sessionInfo.isDirty = true;
    if($("tr").hasClass("active") == false){
        e.preventDefault(); //make sure that default browser behaviour is prevented
        var nodeType = $(this).prop('nodeName');
        if(nodeType == "circle"){
            var seriesIndex = $("circle.data").index(this);
        } else{
            var seriesIndex = $(".chipHolder").index(this);
        }
        //if(seriesIndex != 0 &&  seriesIndex != lastIndex){changeSelectedClass(seriesIndex);}
        changeSelectedClass(seriesIndex);
    }
});


$(document).on({
    mouseenter: function(){
        var nodeType = $(this).prop('nodeName');
        if(nodeType == "circle"){
            var thisCircle = $(this);
            var thisIndex = $("circle.data").index(thisCircle)
            var thisChipHolder = $(".chipHolder.annual").eq(thisIndex)
        } else{
            var thisChipHolder = $(this); //store since it gets called multiple times
            var thisIndex = $(".chipHolder.annual").index(thisChipHolder) //get the index of the hovered .chipHolder.annual
            var thisCircle = $("circle.data").eq(thisIndex) //figure out what circle.data to highlight based on index of the hovered .chipHolder.annual
        }
        circleBorderColor = thisCircle.css("stroke"); //need to record the stroke so we know if the circle is selected or not - if selected there will be a stroke, if not stroke will be none
        circleBorderWidth = thisCircle.css("stroke-width"); //need to record the stroke width because it could be 2 or 5 depending on whether highlighting is turn on in the trajectory form
        thisCircle.css({"stroke":highLightColor,"stroke-width":5}).attr("id","hover"); //set the stroke and stroke-width of the circle
        thisChipHolder.addClass("hover"); //add hover class to the .chipHolder.annual so we know which one to turn off on mouseleave - TODO: could just record the index instead of mess with DOM
        borderColor = thisChipHolder.css("borderTopColor"); //record the chipHolder border color so we can return it on mouseleave
        thisChipHolder.css({"borderTopColor":highLightColor,"borderRightColor":highLightColor,"borderBottomColor":highLightColor,"borderLeftColor":highLightColor,}); //ser the highlight border colors
    },
    mouseleave: function(){
        $("#hover").css({"stroke":circleBorderColor,"stroke-width":circleBorderWidth}).removeAttr("id");
        $(".hover").css({"borderTopColor":borderColor,"borderRightColor":borderColor,"borderBottomColor":borderColor,"borderLeftColor":borderColor,}).removeClass("hover");
    }
},".chipHolder.annual, circle.data")


//define function to calculate stretched 8-bit color array by spectral index
function calcColor(data, specIndex, stretch, n_stdev, len) {
    var dataC = $.extend(true, {}, data); //make a copy the data so the original is not altered by the min/max setting
    //var minv = stretch[specIndex].mean - (stretch[specIndex].stdev * n_stdev) //calcuate the min value for the stretch
    //var maxv = stretch[specIndex].mean + (stretch[specIndex].stdev * n_stdev) //calcuate the max value for the stretch
    var	color = []; //make a empty array to hold the color weight for each data point
    for(var i=0;i<len;i++){ //loop through all the data points
        //if(dataC.Values[i][specIndex] < minv) dataC.Values[i][specIndex] = minv; //if the point value is less than the min strech value, then set to min - in-function data copy only!
        //if(dataC.Values[i][specIndex] > maxv) dataC.Values[i][specIndex] = maxv; //if the point value is greater than the max strech value, then set to max  - infunction data copy only!
        if(dataC.Values[i][specIndex] < stretch[specIndex].min) dataC.Values[i][specIndex] = stretch[specIndex].min; //if the point value is less than the min strech value, then set to min - in-function data copy only!
        if(dataC.Values[i][specIndex] > stretch[specIndex].max) dataC.Values[i][specIndex] = stretch[specIndex].max; //if the point value is greater than the max strech value, then set to max  - infunction data copy only!
        //color[i] = ((dataC.Values[i][specIndex] - minv) / (maxv - minv)) * 256; //set the 8-bit color weight for each point
        color[i] = ((dataC.Values[i][specIndex] - stretch[specIndex].min) / (stretch[specIndex].max - stretch[specIndex].min)) * 256; //set the 8-bit color weight for each point
    }
    return color; //return the color weights
}

//define function to return scaled color arrays as RGB color
function scaledRGB(data, RspecIndex, GspecIndex, BspecIndex, stretch, n_stdev, len){
    var colorR = calcColor(data, RspecIndex, stretch, n_stdev, len);
    var	colorG = calcColor(data, GspecIndex, stretch, n_stdev, len);
    var	colorB = calcColor(data, BspecIndex, stretch, n_stdev, len);
    var	color = [];
    for(var i=0;i<len;i++){color[i] = d3.rgb(colorR[i],colorG[i],colorB[i]);}
    return color;
}

//define function to calculate spectral indices from the raw band data
function calcIndices(data){
    //define and initialize variables
    var n_obj = data.Values.length, //this is already calc
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b7 = 0,
        bcoef = [0.2043, 0.4158, 0.5524, 0.5741, 0.3124, 0.2303],
        gcoef = [-0.1603, -0.2819, -0.4934, 0.7940, -0.0002, -0.1446],
        wcoef = [0.0315, 0.2021, 0.3102, 0.1594,-0.6806, -0.6109],
        i = 0;

    //calculate indices and include them in the json object
    for(i;i<n_obj;i++){
        //pull out the values by band from json object so we don't have to deal with the long json text to
        //call a value when calculating indices

        b1 = data.Values[i].B1;
        b2 = data.Values[i].B2;
        b3 = data.Values[i].B3;
        b4 = data.Values[i].B4;
        b5 = data.Values[i].B5;
        b7 = data.Values[i].B7;

        //calculate indices
        data.Values[i]["TCB"]=(b1*bcoef[0])+(b2*bcoef[1])+(b3*bcoef[2])+(b4*bcoef[3])+(b5*bcoef[4])+(b7*bcoef[5]);
        data.Values[i]["TCG"]=(b1*gcoef[0])+(b2*gcoef[1])+(b3*gcoef[2])+(b4*gcoef[3])+(b5*gcoef[4])+(b7*gcoef[5]);
        data.Values[i]["TCW"]=(b1*wcoef[0])+(b2*wcoef[1])+(b3*wcoef[2])+(b4*wcoef[3])+(b5*wcoef[4])+(b7*wcoef[5]);
        data.Values[i]["TCA"]=Math.atan(data.Values[i].TCG/data.Values[i].TCB) * (180/Math.PI); // * 100;
        data.Values[i]["NBR"]=(b4-b7)/(b4+b7);
        data.Values[i]["NDVI"]=(b4-b3)/(b4+b3);
    }
    return data
}


//define function to determine if leap year
function leapYear(year){
    return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
}

function calcDecDate(trajData){
    for(var i=0;i<trajData.Values.length;i++){
        var thisYear = trajData.Values[i].Year;
        if(leapYear(thisYear)){
            var n_days = 367
        } else{
            var n_days = 366
        }
        var decDate = thisYear + (trajData.Values[i].doy/n_days);
        trajData.Values[i]["decDate"] = decDate
    }
    return trajData
}


//update the plot when buttons are clicked
$(document).ready(function(){
    $(".specPlot li").click(function() { //This will attach the function to all the input elements
        //figure out which dropdown was selected and change its active status
        var thisLi = $(this);
        var thisListID = thisLi.closest("ul").attr('id'),
            thisSpecIndexID = thisLi.attr('id'),
            newactive = "#"+thisListID+" #"+thisSpecIndexID,
            activesearch = "#"+thisListID+" .active",
            activeid = $(activesearch).attr('id'),
            oldactive = "#"+thisListID+" #"+activeid;

        $(oldactive).removeClass('active');
        $(newactive).addClass('active');

        if(thisLi.parent().hasClass("rgb")){
            if(thisListID == "redList"){$("#btnRed div").replaceWith('<div><strong>R</strong><small>GB</small><br><small>'+$("#"+thisSpecIndexID).text()+'</small><span class="caret specPlot"></span></div>')}
            else if(thisListID == "greenList"){$("#btnGreen div").replaceWith('<div><small>R</small><strong>G</strong><small>B</small><br><small>'+$("#"+thisSpecIndexID).text()+'</small><span class="caret specPlot"></span></div>')}
            else if(thisListID == "blueList"){$("#btnBlue div").replaceWith('<div><small>RG</small><strong>B</strong><br><small>'+$("#"+thisSpecIndexID).text()+'</small><span class="caret specPlot"></span></div>')};

            //these could be global, they are retrieved again when a chip is replaced.
            // activeRedSpecIndex = $("#redList li.active").attr('id')
            // activeGreenSpecIndex = $("#greenList li.active").attr('id')
            // activeBlueSpecIndex = $("#blueList li.active").attr('id')

            rgbColor = scaledRGB(data, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, n_chips);
            allDataRGBcolor = scaledRGB(allData, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, allData.Values.length);
            updatePlotRGB();
        } else if(thisLi.parent().hasClass("indexList")){
            $("#btnIndex div").replaceWith('<div><strong>Index:</strong><br><small>'+$("#"+thisSpecIndexID).text()+'</small><span class="caret specPlot"></span></div>');
            specIndex = $("#indexList li.active").attr('id')

            // localStretch();
            plotUpdate(data, specIndex, rgbColor, currentDomain);
            $("#specPlotIndex").text($("#"+specIndex).text());
        } else if(thisLi.parent().hasClass("chipSetList")){
            var setText = $("#"+thisSpecIndexID).text()

            switch(setText){
                case "TM TC":
                    activeRedSpecIndex = "TCB";
                    activeGreenSpecIndex = "TCG";
                    activeBlueSpecIndex = "TCW";
                    break;
                case "SWIR2,NIR,Red":
                    activeRedSpecIndex = "B7";
                    activeGreenSpecIndex = "B4";
                    activeBlueSpecIndex = "B3";
                    break;
                case "NIR,Red,Green":
                    activeRedSpecIndex = "B4";
                    activeGreenSpecIndex = "B3";
                    activeBlueSpecIndex = "B2";
                    break;
            }

            rgbColor = scaledRGB(data, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, n_chips);
            allDataRGBcolor = scaledRGB(allData, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, allData.Values.length);
            updatePlotRGB();

            $("#btnChipSet div").replaceWith('<div><strong>Chip Set:</strong><br><small>'+setText+'</small><span class="caret specPlot"></span></div>');
            $("#chip-gallery, #img-gallery").empty(); //reset
            appendSrcImg(); //append the src imgs
            appendChips("annual",selectThese); //append the chip div/canvas/img set
            drawAllChips("annual");

            var message = {
                "action":"change_chip_set",
                "thisChipSet":$("#chipSetList .active").attr("id")
            };

            if ((chipstripwindow != null) || (chipstripwindow.closed == false)){      //if the window is open then send message to change the chip set
                chipstripwindow.postMessage(JSON.stringify(message),"*");
            }
        }
    });
});





//mechanism to display the selected points and line in the trajectory plot
$("#btnLine").click(function(){
    if ($("#lineDisplayThumb").attr("class") == "glyphicon glyphicon-thumbs-up"){
        $("#lineDisplayThumb").removeClass("glyphicon glyphicon-thumbs-up")
            .addClass("glyphicon glyphicon-thumbs-down");
        $("circle.selected").css("stroke-opacity","0");
        $("circle.highlight").css("stroke-opacity","0");
        $("#plotLine").css("stroke-opacity","0");
    } else{
        $("#lineDisplayThumb").removeClass("glyphicon glyphicon-thumbs-down")
            .addClass("glyphicon glyphicon-thumbs-up");
        $("circle.selected").css("stroke-opacity","1");
        $("circle.highlight").css("stroke-opacity","1");
        $("#plotLine").css("stroke-opacity","1");
    }
});

//mechanism to display all points trajectory plot
$("#btnPoints").click(function(){
    if ($("#allPointsDisplayThumb").attr("class") == "glyphicon glyphicon-thumbs-up"){
        $("#allPointsDisplayThumb").removeClass("glyphicon glyphicon-thumbs-up")
            .addClass("glyphicon glyphicon-thumbs-down");
        $("circle.allData").attr("visibility","hidden");
        $("circle.data").css("fill-opacity","1");
    } else{
        $("#allPointsDisplayThumb").removeClass("glyphicon glyphicon-thumbs-down")
            .addClass("glyphicon glyphicon-thumbs-up");
        $("circle.allData").attr("visibility","visible");
        $("circle.data").css("fill-opacity","0.5");
    }
});

//mechanism to display all points trajectory plot
$("#showAnomaly").click(function(){
    $("#svg").empty();
    lineData = [];
    plotInt();
});

$("#highlightColor").change(function(){
    setHighlightColor();
});

$("#selectedColor").change(function(){
    setSelectedColor()
});

$("#plotColor").change(function(){
    chipDisplayProps.plotColor = $("#plotColor").prop("value")
    drawAllChips("annual")
});

function setHighlightColor(){
    //var color = $("#highlightColor").prop("value");
    highLightColor = $("#highlightColor").prop("value");
    $("circle.highlight").css({"stroke":highLightColor,"stroke-width":5});
    $(".chipHolder.highlight").css("border-color",highLightColor);
    $("tr.active").css("background-color",highLightColor);
}

function setSelectedColor(){
    var color = $("#selectedColor").prop("value");
    $("circle.selected").css("stroke",color);
    $("#plotLine").css("stroke",color);
    $(".chipHolder.selected").css("border-color",color);
}


///////////////////////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS/////////////////////////////////////////////////////////////////
//////////////BELOW ARE LINE INFO FORM SCRIPTS////////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS//////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS/////////////////////////////////
////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS/////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS////



////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
//GLOBAL VARIABLES//////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

//OLD VERTINFO TEMPLATE
//template vertInfo object which holds all the segment and vertice info
//			var vertInfo = {[{
//						year:0,
//						index:0,
//						landUse:{
//							dominant:"",
//							notes:{
//								wetland:false,
//								mining:false,
//								rowCrop:false,
//								orchardTreeFarm:false,
//								vineyardsOtherWoody:false
//							}
//						},
//						landCover:{
//							dominant:"",
//							other:{
//								trees:false,
//								shrubs:false,
//								grassForbHerb:false,
//								impervious:false,
//								naturalBarren:false,
//								snowIce:false,
//								water:false
//							}
//						},
//						changeProcess:{
//							changeProcess:"",
//							notes:{
//								natural:false,
//								prescribed:false,
//								sitePrepFire:false,
//								airphotoOnly:false,
//								clearcut:false,
//								thinning:false,
//								flooding:false,
//								reserviorLakeFlux:false,
//								wetlandDrainage:false
//							}
//						}
//				}]}

//NEW VERTINFO TEMPLATE
//template vertInfo object which holds all the segment and vertice info
//			var vertInfo = {[{
//						year:0,
//						index:0,
//						landUse:{
//							primary:{
//								landUse:"",
//								notes:{
//									wetland:false,
//									mining:false,
//									rowCrop:false,
//									orchardTreeFarm:false,
//									vineyardsOtherWoody:false
//								}
//							},
//							secondary:{
//								landUse:"",
//								notes:{
//									wetland:false,
//									mining:false,
//									rowCrop:false,
//									orchardTreeFarm:false,
//									vineyardsOtherWoody:false
//								}
//							}
//						},
//						landCover:{
//							landCover:"",
//							other:{
//								trees:false,
//								shrubs:false,
//								grassForbHerb:false,
//								impervious:false,
//								naturalBarren:false,
//								snowIce:false,
//								water:false
//							}
//						},
//						changeProcess:{
//							changeProcess:"",
//							notes:{
//								natural:false,
//								prescribed:false,
//								sitePrepFire:false,
//								airphotoOnly:false,
//								clearcut:false,
//								thinning:false,
//								flooding:false,
//								reserviorLakeFlux:false,
//								wetlandDrainage:false
//							}
//						}
//				}]}



////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
//EVENT LISTENERS///////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////




$( window ).unload(function() { //catches refresh and url change
    saveVertInfo(sessionInfo, vertInfo);
    if((chipstripwindow != null) && chipstripwindow.closed == false){
        chipstripwindow.close();
    }
});

$(window).on("beforeunload", function(){ //catches exist buttons
    saveVertInfo(sessionInfo, vertInfo);
    if((chipstripwindow != null) && chipstripwindow.closed == false){
        chipstripwindow.close();
    }
})

//function to prepare vert info to be posted to the server
function saveVertInfo(sessionInfo, vertInfo){
    //first deal with the vertInfo
    //package up the vert info
    if(typeof vertInfo === 'undefined' | sessionInfo.projectID == "" | sessionInfo.plotID == "" ){return}

    if (!sessionInfo.isDirty) {
        return;
    }

    var vertInfoSave = {
        "vertInfo": vertInfo,   //array of objects � see below for the keys
        "projectID": sessionInfo.projectID,   //integer
        "userID": sessionInfo.userID,   //integer
        "plotID": sessionInfo.plotID,   //integer
        "tsa": sessionInfo.tsa   //integer
    }

    vertInfoSave = JSON.stringify(vertInfoSave); //make vert info object into a string
    $.post(getUrls(sessionInfo).vertInfoSave, {"vertInfoSave":vertInfoSave})
        .fail(function(){
            alert("Failed to save vertInfo");
        });

    //deal with the comment
    var commentText = $("#commentInput").val(); //get the comment
    //if(commentText != ""){ //check to see if there is a comment - if so then send it to the server - commented because we want to save comment eachtime because the is_complete check is included now (2/22/16)
    var done = checkPlot(sessionInfo, vertInfo) == true ? 1:0
    var example = $("#isExampleCheckbox").prop("checked") == true ? 1:0
    //package up the comment info
    var commentInfo = {
        "projectID": sessionInfo.projectID,
        "tsa": sessionInfo.tsa,
        "plotID": sessionInfo.plotID,
        "userID": sessionInfo.userID,
        "comment": commentText, //,
        "isComplete": done,
        "isExample":example
    }

    //make comment object into a string
    commentInfo = JSON.stringify(commentInfo);

    //send the comment to the server
    $.post(getUrls(sessionInfo).commentSave, {"comment":commentInfo})
        .fail(function(){
            alert("Failed to save plot comment");
        });

    sessionInfo.isDirty = false;
    //} //end bracket for if(commentText != "")
}

//saves the form info to the server
$("#saveBtn").click(function(){
    saveVertInfo(sessionInfo, vertInfo)
});


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////CONTEXT MENU/////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//copies right clicked td to younger siblings
var thisTRindex = 0; //global variable needed for context menu only
var thisTD = {}; //global variable needed for context menu only

//listener/handler for showing the context menu on right click of any td.formDrop and sets the "thisTRindex" and "thisTD"...
//variables needed by the next listener/handler that deals with selecting options from the cotext menu
$(document).ready(function(){
    document.oncontextmenu = function() {return false;};
    $(document).on("mousedown", "td.formDrop", function(e){
        if(e.button == 2){
            $("#contextMenu").css({
                "left":e.pageX-115,
                "top":e.pageY
            }).show();
            thisTD = $(this);
            var thisTR = thisTD.closest("tr");
            thisTRindex = thisTR.index();
            return false;
        }
        return true;
    });
});

$("#contextMenuList li").click(function(){
    $("#contextMenu").hide();
    var thisLiID = $(this).attr("id");
    if(thisLiID == "fillDown"){
        if(thisTD.hasClass("changeProcessInput")){
            if(thisTRindex+1 >= vertInfo.length){return}
            for(var i=thisTRindex+1;i<vertInfo.length;i++){
                vertInfo[i].changeProcess = $.extend(true, {}, vertInfo[thisTRindex].changeProcess);
            }
        } else if(thisTD.hasClass("landUseInput")){
            for(var i=thisTRindex;i<vertInfo.length;i++){
                vertInfo[i].landUse = $.extend(true, {}, vertInfo[thisTRindex-1].landUse);
            }
        } else if(thisTD.hasClass("landCoverInput")){
            for(var i=thisTRindex;i<vertInfo.length;i++){
                vertInfo[i].landCover = $.extend(true, {}, vertInfo[thisTRindex-1].landCover);
            }
        }
    } else if(thisLiID == "copyPrev"){
        if(thisTD.hasClass("changeProcessInput")){
            if(thisTRindex >= vertInfo.length){return}
            vertInfo[thisTRindex].changeProcess = $.extend(true, {}, vertInfo[thisTRindex-1].changeProcess);
        } else if(thisTD.hasClass("landUseInput")){
            vertInfo[thisTRindex-1].landUse = $.extend(true, {}, vertInfo[thisTRindex-2].landUse);
        } else if(thisTD.hasClass("landCoverInput")){
            vertInfo[thisTRindex-1].landCover = $.extend(true, {}, vertInfo[thisTRindex-2].landCover);
        }
    }

    $(".segment, .vertex").remove(); //empty the current vertex and segment forms
    fillInForm(); //refill the forms with the copied info
});

//hide the context menu if it is open and something else is clicked
$("html").click(function(){
    if($("#contextMenu").css("display") == "block"){$("#contextMenu").hide()}
});

//$("#contextMenu").click(function(e){
//	e.stopPropagation();
//});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//controls the trajectory form section tabs and tables
$("#segmentsFormTab").click(function(){
    var status = $("#segmentsFormTab").attr("class");
    if(status == "unselected"){
        highlightOff();
        closeDropAndRecord();
        $("#CommentsFormTab, #verticesFormTab").attr("class","unselected");
        $("#CommentsFormDiv, #verticesFormDiv").hide();
        $("#segmentsFormTab").attr("class","selected").show();
        $("#segmentsFormDiv").show();
    }
});
$("#verticesFormTab").click(function(){
    var status = $("#verticesFormTab").attr("class");
    if(status == "unselected"){
        highlightOff();
        closeDropAndRecord();
        $("#segmentsFormTab, #CommentsFormTab").attr("class","unselected");
        $("#segmentsFormDiv, #CommentsFormDiv").hide();
        $("#verticesFormTab").attr("class","selected").show();
        $("#verticesFormDiv").show();
    }
});
$("#CommentsFormTab").click(function(){
    var status = $("#CommentsFormTab").attr("class");
    if(status == "unselected"){
        highlightOff();
        closeDropAndRecord();
        $("#segmentsFormTab, #verticesFormTab").attr("class","unselected");
        $("#segmentsFormDiv, #verticesFormDiv").hide();
        $("#CommentsFormTab").attr("class","selected").show();
        $("#CommentsFormDiv").show();
    }
});


//INPUT DROP DOWNS AND HIGHLIGHTING CIRCLES PERTAINING TO THE SELECTED ROW//////////////////////
$(document).on("click",".changeProcessInput", function(e){		//, .landUseInput, .landCoverInput,
    highlightOff();
    closeDropAndRecord();
    var thisInput = $(this);
    thisInput.addClass("active"); //set this <td> as active so we know which <td> to place the dropdown selection in
    thisInput.closest("tr").addClass("active"); //set this <tr> as active so it will be highlighted
    $("#CPnotesList li").addClass("disabled")//.removeClass("selected") //reset the display
    $("#CPnotesList input").attr("disabled", true)
    $("#changeProcessList .selected").removeClass("selected");

    dropInputLists(thisInput, "changeProcessDiv", -1, -1, 1);
    var thisOne = $("tr.segment .changeProcessInput").index(thisInput)+1;
    var selection = vertInfo[thisOne].changeProcess.changeProcess;

    appendCPnotes(selection);
    changeNoteIcon("#CPnotesList", thisOne, "changeProcess");
    highlightOn("segment", thisOne);
    e.stopPropagation(); //stop other actions from happening - what are the other actions??? - check
});

$(document).on("click",".lulc", function(e){
    highlightOff();
    closeDropAndRecord();
    //by default make all the li's disabled
    $("#LUnotesList li").addClass("disabled")//.removeClass("selected"); //reset the display
    $("#LUnotesListSec li").addClass("disabled")//.removeClass("selected"); //reset the display
    $("#LCnotesList li").addClass("disabled")//.removeClass("selected"); //reset the display
    //by default make all inputs disabled
    $("#LUnotesList input").attr("disabled", true)
    $("#LUnotesListSec input").attr("disabled", true)
    $("#LCnotesList input").attr("disabled", true)
    //by default remove all selected classes
    $("#landUseList .selected").removeClass("selected");
    $("#landUseListSec .selected").removeClass("selected");
    $("#landCoverList .selected").removeClass("selected");


    //var thisInput = ; //either lu or lc
    var thisInput = $(this);
    var thisRow = thisInput.closest("tr"); //which row
    var thisLU = thisRow.children(".landUseInput");
    var thisLC = thisRow.children(".landCoverInput");
    thisRow.addClass("active");
    thisLU.addClass("active");
    thisLC.addClass("active");

    var thisOne = $("tr.vertex").index(thisRow);
    highlightOn("vertex", thisOne);

    //change selected attributes to active
    var LUselection = vertInfo[thisOne].landUse.primary.landUse;
    var LUselectionSec = vertInfo[thisOne].landUse.secondary.landUse;
    var LCselection = vertInfo[thisOne].landCover.landCover;
    appendLUnotes(LUselection, "primary");
    appendLUnotes(LUselectionSec, "secondary");
    appendLCnotes(LCselection);

    changeNoteIcon("#LUnotesList", thisOne, "landUse");
    changeNoteIcon("#LUnotesListSec", thisOne, "landUseSec");
    changeNoteIcon("#LCnotesList", thisOne, "landCover");



    //position the dropdown
    var luPos = thisLU.position();
    var lcPos = thisLC.position();
    var bottomTop = luPos.top;
    var bottomLeft = luPos.left;
    var bottomHeight = thisLU[0].getBoundingClientRect().height;
    var luWidth = thisLU[0].getBoundingClientRect().width;
    var lcWidth = thisLC[0].getBoundingClientRect().width;
    var bottomWidth = luWidth + lcWidth;
    var xAdj = -1;
    var yAdj = -1;
    var widthAdj = 1;

    $("#landUseDiv").css("width", parseFloat(luWidth)-6+"px"); //widthAdj+
    $("#landCoverDiv").css("width", parseFloat(lcWidth)-6+"px"); //widthAdj+

    $("#lulc").css({
        position: "absolute",
        top: (bottomTop+parseFloat(bottomHeight)+yAdj),
        left: bottomLeft+xAdj,
        width: (parseFloat(bottomWidth)+widthAdj+"px")
    }).show();
});



$("#luLevelSwitchHolder li").click(function(){
    var levelID = $(this).attr("id")
    $("#luLevelSwitchHolder li").removeClass("selected").css({"font-weight":"normal"})
    if(levelID == "LUprimaryTab"){
        $("#LUprimaryTab").addClass("selected").css({"font-weight":"bold"})
        $("#landUseListSec").hide();
        $("#landUseList").show();
        $("#LUnotesListSec").hide();
        $("#LUnotesList").show();

    } else if(levelID == "LUsecondaryTab"){
        $("#LUsecondaryTab").addClass("selected").css({"font-weight":"bold"})
        $("#landUseListSec li").addClass("disabled");
        var thisLIindex = $("#landUseList li").index($("#landUseList .selected"))
        if(thisLIindex != -1){
            $("#landUseListSec li:lt("+thisLIindex+")").removeClass("disabled")
            $("#landUseListSec li:gt("+thisLIindex+")").removeClass("disabled")
        }

        $("#landUseList").hide();
        $("#landUseListSec").show();
        $("#LUnotesList").hide();
        $("#LUnotesListSec").show();
    }
})


///////////////////////////////////////////////////////////////////////////////////////////////////

//DROP THE SELECTION LISTS ON CLICK///////////////////////////////////////////////////////////////////
$("#changeProcessSelection").click(function(e){			//, #landUseSelection, #landCoverSelection"
    var thisList = $(this).next("ul").attr("id")
    $("#"+thisList).show();
    e.stopPropagation();
});
////////////////////////////////////////////////////////////////////////////////////////////////////////


//DONE BUTTON EVENT HANDLERS////////////////////////////////////////////////////////////////////////////
//when done buttons are clicked close their dropdown and record  the info in the inputs to the lineInfo object
//$(".doneBtn").click(function(){   //not using done btn anymore - closeDropAndRecord is now called on mouse leave
//	closeDropAndRecord();
//});


$("#lulc, #changeProcessDiv, #formsDiv").mouseleave(function() {
    closeDropAndRecord();
});


//MAKE SURE THAT FORM DROPS ARE CLOSED WHEN MOVING TO A NEW PLOT OR PROJECT

//$("").click(function(){ //, #projBtn
//$(document).on("click","#plotList li", function(){		 //, #LUnotesList li, #LCnotesList li
//	console.log("IM IN!")
//	closeDropAndRecord();
//});
//////////////////////////////////////////////////////////////////////////////////////////////////////////


//DISPLAY THE CONDITIONAL NOTES ONCE A CHANGE PROCESS HAS BEEN SELECTED/////////////////

$("#changeProcessList li").click(function(){	//, #landUseList li, #landCoverList li
    $("#CPnotesList li").addClass("disabled")//.removeClass("selected"); //reset display
    $("#CPnotesList input").attr("disabled", true)
    $("#CPnotesList input").prop("checked", false)
    $("#changeProcessList li").removeClass("selected");
    //$(this).addClass("selected");
    var selection = $(this).text();	//get the text from the list selection that was clicked
    $("td.active").text(selection);	 //place the text in the active td
    appendCPnotes(selection);
});

$("#landUseList li").click(function(){
    $("#LUnotesList li").addClass("disabled")//.removeClass("selected"); //reset display
    $("#LUnotesList input").attr("disabled", true)
    $("#LUnotesList input").prop("checked", false)
    $("#landUseList li").removeClass("selected");
    //$(this).addClass("selected");
    var selection = $(this).text();	//get the text from the list selection that was clicked
    $("td.landUseInput.active").text(selection);	 //place the text in the active td
    appendLUnotes(selection, "primary");
});


$("#landUseListSec li").click(function(){
    $("#LUnotesListSec li").addClass("disabled")//.removeClass("selected"); //reset display
    $("#LUnotesListSec input").attr("disabled", true)
    $("#LUnotesListSec input").prop("checked", false)

    if ($('#landUseListSec li.selected').text()===$(this).text()) {
        $("#landUseListSec li").removeClass("selected"); //remove any selected classes
        appendLUnotes('', "secondary");
    }
    else {
        $("#landUseListSec li").removeClass("selected"); //remove any selected classes
        $(this).addClass("selected"); //add the selected class to the clicked one
        var selection = $(this).text();	//get the text from the list selection that was clicked
        //$("td.landUseInput.active").text(selection);	 //place the text in the active td
        //%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% NEED TO HIGHLIGHT THE ONE THAT WAS SELECTED SINCE THERE IS NO LI TO PLACE IT IN
        appendLUnotes(selection, "secondary");
    }
});






$("#landCoverList li").click(function(){
    $("#LCnotesList li").addClass("disabled")//.removeClass("selected"); //reset display
    $("#LCnotesList input").attr("disabled", true)
    $("#LCnotesList input").prop("checked", false)
    $("#landCoverList li").removeClass("selected");





    //$(this).addClass("selected");
    var selection = $(this).text();	//get the text from the list selection that was clicked
    $("td.landCoverInput.active").text(selection);	 //place the text in the active td
    appendLCnotes(selection);
});




/////////////////////////////////////////////////////////////////////////////////////////


//MAKE THE NOTE CHECKBOXES TOGGLE ON AND OFF AND SET THE "SELECTED" CLASS////////////////
//$(document).ready(function(){
//	$(document).on("click","#CPnotesList li, #LUnotesList li, #LCnotesList li", function(){
//		var selected = $(this);
//		if(selected.hasClass("disabled") == false){
//			if(selected.hasClass("selected")){
//				//selected.removeClass("selected");
//				//$("span", this).replaceWith('<span class="glyphicon glyphicon-unchecked"></span> ');
//			} else {
//				//selected.addClass("selected");
//				//$("span", this).replaceWith('<span class="glyphicon glyphicon-ok"></span> ');
//			}
//		}
//	});
//});
//////////////////////////////////////////////////////////////////////////////////////////

//highlight selected circles, canvases, and input row when the magnifying glass is clicked
$(document).ready(function(){
    $(document).on("click","td.highlightIt", function(){
        var thisTr = $(this).closest("tr");
        if(thisTr.hasClass("active")){
            highlightOff();
            closeDropAndRecord();
        } else {
            highlightOff();
            closeDropAndRecord();
            thisTr.addClass("active");
            if(thisTr.hasClass("segment")){
                thisOne = $("tr.segment").index(thisTr);
                highlightOn("segment", thisOne+1);
            } else {
                thisOne = $("tr.vertex").index(thisTr);
                highlightOn("vertex", thisOne);
            }
        }
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
//UNIQUE FUNCTIONS//////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//APPEND NOTES TO THE NOTES DIV///////////////////////////////////////////////////////////////////
//change process
function appendCPnotes(selection){
    //$("#CPnotesList").empty();
    switch(selection){
        case "Fire":
            //$("#CPnotesList").append('<li class="natural">Natural</li><li class="prescribed">Prescribed</li><li class="sitePrepFire">Site-prep fire</li><li class="airphotoOnly">Airphoto only</li>');
            $("#fire").addClass("selected");
            $(".forFire").closest("li").removeClass("disabled");
            $(".forFire").attr("disabled", false);
            break;
        case "Harvest":
            //$("#CPnotesList").append('<li class="clearcut">Clearcut</li><li class="thinning">Thinning</li><li class="sitePrepFire">Site-prep fire</li><li class="airphotoOnly">Airphoto only</li>');
            $("#harvest").addClass("selected");
            $(".forHarvest").closest("li").removeClass("disabled");
            $(".forHarvest").attr("disabled", false);
            break;
        // case "Decline":
        // 	//$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
        // 	$("#decline").addClass("selected");
        // 	$(".forDecline").closest("li").removeClass("disabled");
        // 	$(".forDecline").attr("disabled", false);
        // 	break;
        case "Acute Decline":
            //$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
            $("#acuteDecline").addClass("selected");
            $(".forAcuteDecline").closest("li").removeClass("disabled");
            $(".forAcuteDecline").attr("disabled", false);
            break;
        case "Condition Decline":
            //$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
            $("#conditionDecline").addClass("selected");
            $(".forConditionDecline").closest("li").removeClass("disabled");
            $(".forConditionDecline").attr("disabled", false);
            break;
        case "Wind":
            //$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
            $("#wind").addClass("selected");
            $(".forWind").closest("li").removeClass("disabled");
            $(".forWind").attr("disabled", false);
            break;
        case "Hydrology":
            //$("#CPnotesList").append('<li class="flooding">Flooding</li><li class="reserviorLakeFlux">Reservoir/Lake flux</li><li class="airphotoOnly">Airphoto only</li>');
            $("#hydro").addClass("selected");
            $(".forHydro").closest("li").removeClass("disabled");
            $(".forHydro").attr("disabled", false);
            break;
        case "Debris":
            //$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
            $("#debris").addClass("selected");
            $(".forDebris").closest("li").removeClass("disabled");
            $(".forDebris").attr("disabled", false);
            break;
        case "Growth/Recovery":
            //$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
            $("#growth").addClass("selected");
            $(".forGrowth").closest("li").removeClass("disabled");
            $(".forGrowth").attr("disabled", false);
            break;
        case "Stable":
            //$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
            $("#stable").addClass("selected");
            $(".forStable").closest("li").removeClass("disabled");
            $(".forStable").attr("disabled", false);
            break;
        case "Mechanical":
            //$("#CPnotesList").append('<li class="wetlandDrainage">Wetland drainage</li><li class="airphotoOnly">Airphoto only</li>');
            $("#mechanical").addClass("selected");
            $(".forMechanical").closest("li").removeClass("disabled");
            $(".forMecahnical").attr("disabled", false);
            break;
        case "Other":
            //$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
            $("#otherCP").addClass("selected");
            $(".forOther").closest("li").removeClass("disabled");
            $(".forOther").attr("disabled", false);
            break;
    }
}

//land use
function appendLUnotes(selection, level){
    switch(selection){
        case "Forest":
            if(level == "primary"){
                //$("#LUnotesList").append('<li class="wetland">Wetland</li>');
                $("#landUseList .forest").addClass("selected");
                //$(".forForest").removeClass("disabled")

                $("#LUnotesList .forForest").attr("disabled", false);
                $("#LUnotesList .forForest").closest("li").removeClass("disabled");
            } else{
                $("#landUseListSec .forest").addClass("selected");
                $("#LUnotesListSec .forForest").attr("disabled", false);
                $("#LUnotesListSec .forForest").closest("li").removeClass("disabled");
            }
            break;
        case "Developed":
            if(level == "primary"){
                //$("#LUnotesList").append('<li class="mining">Mining</li>');
                $("#landUseList .developed").addClass("selected");
                //$(".forDeveloped").removeClass("disabled")
                $("#LUnotesList .forDeveloped").attr("disabled", false);
                $("#LUnotesList .forDeveloped").closest("li").removeClass("disabled");
            } else{
                $("#landUseListSec .developed").addClass("selected");
                $("#LUnotesListSec .forDeveloped").attr("disabled", false);
                $("#LUnotesListSec .forDeveloped").closest("li").removeClass("disabled");
            }
            break;
        case "Agriculture":
            if(level == "primary"){
                //$("#LUnotesList").append('<li class="rowCrop">Row crop</li><li class="orchardTreeFarm">Orchard/Tree farm</li><li class="vineyardsOtherWoody">Vineyard/Other woody</li>');
                $("#landUseList .ag").addClass("selected");
                //$(".forAg").removeClass("disabled");
                $("#LUnotesList .forAg").attr("disabled", false);
                $("#LUnotesList .forAg").closest("li").removeClass("disabled");
            } else{
                $("#landUseListSec .ag").addClass("selected");
                $("#LUnotesListSec .forAg").attr("disabled", false);
                $("#LUnotesListSec .forAg").closest("li").removeClass("disabled");
            }
            break;

        case "Non-forest Wetland":
            if(level == "primary"){
                //$("#LUnotesList").append('<li class="wetland">Wetland</li>');
                $("#landUseList .nonForWet").addClass("selected");
                //$(".forForest").removeClass("disabled");
                $("#LUnotesList .forForest").attr("disabled", true);
                // $("#LUnotesList .forForest").closest("li").removeClass("disabled");
            } else{
                $("#landUseListSec .nonForWet").addClass("selected");
                $("#LUnotesListSec .forForest").attr("disabled", true);
                // $("#LUnotesListSec .forForest").closest("li").removeClass("disabled");
            }
            break;
        case "Rangeland":
            if(level == "primary"){
                //$("#LUnotesList").append('<li class="mining">Mining</li>');
                $("#landUseList .rangeland").addClass("selected");
                //$(".forDeveloped").removeClass("disabled");
                $("#LUnotesList .forDeveloped").attr("disabled", true);
                // $("#LUnotesList .forDeveloped").closest("li").removeClass("disabled");
            } else{
                $("#landUseListSec .rangeland").addClass("selected");
                $("#LUnotesListSec .forDeveloped").attr("disabled", true);
                // $("#LUnotesListSec .forDeveloped").closest("li").removeClass("disabled");
            }
            break;
        case "Other":
            if(level == "primary"){
                //$("#LUnotesList").append('<li class="rowCrop">Row crop</li><li class="orchardTreeFarm">Orchard/Tree farm</li><li class="vineyardsOtherWoody">Vineyard/Other woody</li>');
                $("#landUseList .otherLU").addClass("selected");
                //$(".forAg").removeClass("disabled");
                $("#LUnotesList .forAg").attr("disabled", true);
                // $("#LUnotesList .forAg").closest("li").removeClass("disabled");
            } else{
                $("#landUseListSec .otherLU").addClass("selected");
                $("#LUnotesListSec .forAg").attr("disabled", true);
                // $("#LUnotesListSec .forAg").closest("li").removeClass("disabled");
            }
            break;
        default:
            if(level == "primary"){
                $("#LUnotesList li").attr("disabled", true);
            } else{
                $("#LUnotesListSec li").attr("disabled", true);
            }
            break;
    }
}

//land cover
function appendLCnotes(selection){
    switch(selection){
        case "Trees":;
            $("#treesLC").addClass("selected");
            $("#shrubs,#grassForbHerb,#impervious,#naturalBarren,#snowIce,#water").closest("li").removeClass("disabled");
            $("#shrubs,#grassForbHerb,#impervious,#naturalBarren,#snowIce,#water").attr("disabled",false);
            break;
        case "Shrubs":
            $("#shrubsLC").addClass("selected");
            $("#trees,#grassForbHerb,#impervious,#naturalBarren,#snowIce,#water").closest("li").removeClass("disabled");
            $("#trees,#grassForbHerb,#impervious,#naturalBarren,#snowIce,#water").attr("disabled",false);
            break;
        case "Grass/forb/herb":
            $("#gfhLC").addClass("selected");
            $("#trees,#shrubs,#impervious,#naturalBarren,#snowIce,#water").closest("li").removeClass("disabled");
            $("#trees,#shrubs,#impervious,#naturalBarren,#snowIce,#water").attr("disabled",false);
            break;
        case "Impervious":
            $("#imperviousLC").addClass("selected");
            $("#trees,#shrubs,#grassForbHerb,#naturalBarren,#snowIce,#water").closest("li").removeClass("disabled");
            $("#trees,#shrubs,#grassForbHerb,#naturalBarren,#snowIce,#water").attr("disabled",false);
            break;
        case "Barren":
            $("#natBarLC").addClass("selected");
            $("#trees,#shrubs,#impervious,#grassForbHerb,#snowIce,#water").closest("li").removeClass("disabled");
            $("#trees,#shrubs,#impervious,#grassForbHerb,#snowIce,#water").attr("disabled",false);
            break;
        case "Snow/ice":
            $("#snowIceLC").addClass("selected");
            $("#trees,#shrubs,#impervious,#naturalBarren,#grassForbHerb,#water").closest("li").removeClass("disabled");
            $("#trees,#shrubs,#impervious,#naturalBarren,#grassForbHerb,#water").attr("disabled",false);
            break;
        case "Water":
            $("#waterLC").addClass("selected");
            $("#trees,#shrubs,#impervious,#naturalBarren,#snowIce,#grassForbHerb").closest("li").removeClass("disabled");
            $("#trees,#shrubs,#impervious,#naturalBarren,#snowIce,#grassForbHerb").attr("disabled",false);
            break;
    }




    //$("#LCnotesList").empty();
    //if(selection != ""){
    //$("#LCnotesList").append(
    //	'<li class="trees">Trees</li>'+
    //	'<li class="shrubs">Shrubs</li>'+
    //	'<li class="grassForbHerb">Grass/forb/herb</li>'+
    //	'<li class="impervious">Impervious</li>'+
    //	'<li class="naturalBarren">Natural/barren</li>'+
    //	'<li class="snowIce">Snow/ice</li>'+
    //	'<li class="water">Water</li>'
    //);
    //	$("#LCnotesList li").each(function(){
    //		var thisClass = $(this).text().trim();
    //		if(thisClass == selection){
    //			$(this).hide();
    //			return false
    //		}
    //	});
    //}
}


//DONE BUTTON FUNCTION TO CLOSE DROPDOWN MENUS AND RECORD INFO FROM THE FORM INPUTS TO THE LINEINFO OBJECT

function changeProcessDoneBtn(){
    $("#changeProcessDiv").hide();
    //$("#changeProcessList").hide();

    //remove the highlighted circle class - could find the highlighted class and only change that one (current implementation) or just reset all selected circles (commented out)
    highlightOff();

    //fill in the lineInfo object
    var thisOne = $(".changeProcessInput").index($(".changeProcessInput.active"))+1;
    var selection = $("td.changeProcessInput.active").text();

    vertInfo[thisOne].changeProcess.changeProcess = selection;
    //vertInfo[thisOne].changeProcess.notes.natural = $("#natural").hasClass("selected")
    //vertInfo[thisOne].changeProcess.notes.prescribed = $("#prescribed").hasClass("selected")
    //vertInfo[thisOne].changeProcess.notes.sitePrepFire = $("#sitePrepFire").hasClass("selected")
    //vertInfo[thisOne].changeProcess.notes.airphotoOnly = $("#airphotoOnly").hasClass("selected")
    //vertInfo[thisOne].changeProcess.notes.clearcut = $("#clearcut").hasClass("selected")
    //vertInfo[thisOne].changeProcess.notes.thinning = $("#thinning").hasClass("selected")
    //vertInfo[thisOne].changeProcess.notes.flooding = $("#flooding").hasClass("selected")
    //vertInfo[thisOne].changeProcess.notes.reserviorLakeFlux = $("#reserviorLakeFlux").hasClass("selected")
    //vertInfo[thisOne].changeProcess.notes.wetlandDrainage = $("#wetlandDrainage").hasClass("selected")

    vertInfo[thisOne].changeProcess.notes.natural = $("#natural").prop("checked");
    vertInfo[thisOne].changeProcess.notes.prescribed = $("#prescribed").prop("checked");
    vertInfo[thisOne].changeProcess.notes.sitePrepFire = $("#sitePrepFire").prop("checked");
    vertInfo[thisOne].changeProcess.notes.airphotoOnly = $("#airphotoOnly").prop("checked");
    vertInfo[thisOne].changeProcess.notes.clearcut = $("#clearcut").prop("checked");
    vertInfo[thisOne].changeProcess.notes.thinning = $("#thinning").prop("checked");
    vertInfo[thisOne].changeProcess.notes.flooding = $("#flooding").prop("checked");
    vertInfo[thisOne].changeProcess.notes.reserviorLakeFlux = $("#reserviorLakeFlux").prop("checked");
    vertInfo[thisOne].changeProcess.notes.wetlandDrainage = $("#wetlandDrainage").prop("checked");


    //$("#CPnotesList .selected").removeClass("selected");

    //switch(selection){
    //	case "Fire":
    //		fillInNotes("#CPnotesList .selected",thisOne,"natural","changeProcess");
    //		fillInNotes("#CPnotesList .selected",thisOne,"prescribed","changeProcess");
    //		fillInNotes("#CPnotesList .selected",thisOne,"sitePrepFire","changeProcess");
    //	break;
    //	case "Harvest":
    //		fillInNotes("#CPnotesList .selected",thisOne,"clearcut","changeProcess");
    //		fillInNotes("#CPnotesList .selected",thisOne,"thinning","changeProcess");
    //		fillInNotes("#CPnotesList .selected",thisOne,"sitePrepFire","changeProcess");
    //	break;
    //	case "Decline":
    //	break;
    //	case "Wind":
    //	break;
    //	case "Hydrology":
    //		fillInNotes("#CPnotesList .selected",thisOne,"flooding","changeProcess");
    //		fillInNotes("#CPnotesList .selected",thisOne,"reserviorLakeFlux","changeProcess");
    //	break;
    //	case "Debris":
    //	break;
    //	case "Growth":
    //	break;
    //	case "Stable":
    //	break;
    //	case "Conversion":
    //		fillInNotes("#CPnotesList .selected",thisOne,"wetlandDrainage","changeProcess");
    //	break;
    //	case "Other":
    //	break;
    //}
    //fillInNotes("#CPnotesList .selected",thisOne,"airphotoOnly","changeProcess");
    //console.log(vertInfo)
}

//land use
function landUseDoneBtn(){
    //$("#landUseDiv").hide(); //hide the dropdown
    //$("#landUseList").hide();

    //remove the highlighted circle class - could find the highlighted class and only change that one (current implementation) or just reset all selected circles (commented out)
    highlightOff();

    //fill in the lineInfo object
    var thisOne = $(".landUseInput").index($(".landUseInput.active"));

    vertInfo[thisOne].landUse.primary.landUse = $("td.landUseInput.active").text();

    var thisSelectedSecLU = $("#landUseListSec .selected")
    vertInfo[thisOne].landUse.secondary.landUse = thisSelectedSecLU.text() //get the text from the selected class
    thisSelectedSecLU.removeClass("selected"); //then make sure to get rid of the selected class so it can be set dynamically

    //vertInfo[thisOne].landUse.primary.notes.wetland = $("#wetland").hasClass("selected")
    //vertInfo[thisOne].landUse.primary.notes.mining = $("#mining").hasClass("selected")
    //vertInfo[thisOne].landUse.primary.notes.rowCrop = $("#rowCrop").hasClass("selected")
    //vertInfo[thisOne].landUse.primary.notes.orchardTreeFarm = $("#orchardTreeFarm").hasClass("selected")
    //vertInfo[thisOne].landUse.primary.notes.vineyardsOtherWoody = $("#vineyardsOtherWoody").hasClass("selected")


    vertInfo[thisOne].landUse.primary.notes.wetland = $("#LUnotesList .wetland").prop("checked");
    vertInfo[thisOne].landUse.primary.notes.mining = $("#LUnotesList .mining").prop("checked");
    vertInfo[thisOne].landUse.primary.notes.rowCrop = $("#LUnotesList .rowCrop").prop("checked");
    vertInfo[thisOne].landUse.primary.notes.orchardTreeFarm = $("#LUnotesList .orchardTreeFarm").prop("checked");
    vertInfo[thisOne].landUse.primary.notes.vineyardsOtherWoody = $("#LUnotesList .vineyardsOtherWoody").prop("checked");


    vertInfo[thisOne].landUse.secondary.notes.wetland = $("#LUnotesListSec .wetland").prop("checked");
    vertInfo[thisOne].landUse.secondary.notes.mining = $("#LUnotesListSec .mining").prop("checked");
    vertInfo[thisOne].landUse.secondary.notes.rowCrop = $("#LUnotesListSec .rowCrop").prop("checked");
    vertInfo[thisOne].landUse.secondary.notes.orchardTreeFarm = $("#LUnotesListSec .orchardTreeFarm").prop("checked");
    vertInfo[thisOne].landUse.secondary.notes.vineyardsOtherWoody = $("#LUnotesListSec .vineyardsOtherWoody").prop("checked");
}

//land cover
function landCoverDoneBtn(){
    //$("#landCoverDiv").hide(); //hide the dropdown
    //$("#landCoverList").hide();

    //remove the highlighted circle class - could find the highlighted class and only change that one (current implementation) or just reset all selected circles (commented out)
    highlightOff();

    //fill in the lineInfo object
    var thisOne = $(".landCoverInput").index($(".landCoverInput.active"));
    var selection = $("td.landCoverInput.active").text();

    vertInfo[thisOne].landCover.landCover = selection;

    //non checkbox
    //vertInfo[thisOne].landCover.other.trees = $("#trees").hasClass("selected")
    //vertInfo[thisOne].landCover.other.shrubs = $("#shrubs").hasClass("selected")
    //vertInfo[thisOne].landCover.other.grassForbHerb = $("#grassForbHerb").hasClass("selected")
    //vertInfo[thisOne].landCover.other.impervious = $("#impervious").hasClass("selected")
    //vertInfo[thisOne].landCover.other.naturalBarren = $("#naturalBarren").hasClass("selected")
    //vertInfo[thisOne].landCover.other.snowIce = $("#snowIce").hasClass("selected")
    //vertInfo[thisOne].landCover.other.water = $("#water").hasClass("selected")

    //checkbox
    vertInfo[thisOne].landCover.other.trees = $("#trees").prop("checked");
    vertInfo[thisOne].landCover.other.shrubs = $("#shrubs").prop("checked");
    vertInfo[thisOne].landCover.other.grassForbHerb = $("#grassForbHerb").prop("checked");
    vertInfo[thisOne].landCover.other.impervious = $("#impervious").prop("checked");
    vertInfo[thisOne].landCover.other.naturalBarren = $("#naturalBarren").prop("checked");
    vertInfo[thisOne].landCover.other.snowIce = $("#snowIce").prop("checked");
    vertInfo[thisOne].landCover.other.water = $("#water").prop("checked");


    //fillInNotes("#LCnotesList .selected",thisOne,"trees","landCover");
    //fillInNotes("#LCnotesList .selected",thisOne,"shrubs","landCover");
    //fillInNotes("#LCnotesList .selected",thisOne,"grassForbHerb","landCover");
    //fillInNotes("#LCnotesList .selected",thisOne,"impervious","landCover");
    //fillInNotes("#LCnotesList .selected",thisOne,"naturalBarren","landCover");
    //fillInNotes("#LCnotesList .selected",thisOne,"snowIce","landCover");
    //fillInNotes("#LCnotesList .selected",thisOne,"water","landCover");

    $("#LCnotesList .selected").removeClass("selected");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
//SHARED FUNCTIONS//////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
function fillInForm(){
    var len = selectThese.length;
    $('.segment, vertex').remove();

    //fill in segment form
    for(var i=0;i<len-1;i++){
        var yearStart = vertInfo[i].year
        var yearEnd = vertInfo[i+1].year
        $("#segmentsFormTbl").append('<tr class="segment"><td class="highlightIt"><span class="glyphicon glyphicon-search"></span></td><td>'+yearStart+'</td><td>'+yearEnd+'</td><td class="changeProcessInput formDrop"></td></tr>');
        $(".changeProcessInput").eq(i).text(vertInfo[i+1].changeProcess.changeProcess)
    }
    //fill in vertex form
    for(i=0; i < len; i++){
        yearStart = vertInfo[i].year;
        $("#verticesFormTbl").append('<tr class="vertex"><td class="highlightIt"><span class="glyphicon glyphicon-search"></span></td><td>'+yearStart+'</td><td class="landUseInput formDrop lulc"></td><td class="landCoverInput formDrop lulc"></td></tr>');
        $(".landUseInput").eq(i).text(vertInfo[i].landUse.primary.landUse)
        $(".landCoverInput").eq(i).text(vertInfo[i].landCover.landCover)
    }
}


//function to sync the segments form to the selected vertices
function updateSegmentForm(seriesIndex, addRemove){
    if(addRemove == "add"){
        //figure out where to insert the new vertInfo object - compare the index of the selected year against those already selected and recorded in the vertInfo array
        for(var i=0;i<vertInfo.length;i++){
            if(vertInfo[i].index > seriesIndex){break} //where it breaks out is the index (i) to splice the new vertInfo object
        }

        //make a vertInfo object to splice into the vertInfo array
        var spliceVertInfo = {
            year:data.Values[seriesIndex].Year, //fill in for the selected point
            julday:data.Values[seriesIndex].doy,
            index:seriesIndex, //fill in for the selected point
            landUse:{
                primary:{
                    landUse:"",
                    notes:{
                        wetland:false,
                        mining:false,
                        rowCrop:false,
                        orchardTreeFarm:false,
                        vineyardsOtherWoody:false
                    }
                },
                secondary:{
                    landUse:"",
                    notes:{
                        wetland:false,
                        mining:false,
                        rowCrop:false,
                        orchardTreeFarm:false,
                        vineyardsOtherWoody:false
                    }
                }
            },
            landCover:{
                landCover:"",
                other:{
                    trees:false,
                    shrubs:false,
                    grassForbHerb:false,
                    impervious:false,
                    naturalBarren:false,
                    snowIce:false,
                    water:false
                }
            },
            changeProcess:{
                changeProcess:"",
                notes:{
                    natural:false,
                    prescribed:false,
                    sitePrepFire:false,
                    airphotoOnly:false,
                    clearcut:false,
                    thinning:false,
                    flooding:false,
                    reserviorLakeFlux:false,
                    wetlandDrainage:false
                }
            }
        }

        vertInfo.splice(i,0,spliceVertInfo) //splice the new vertInfo object into the vertInfo array at the location found above (i)
        selectThese.splice(i,0,seriesIndex) //insert the seriesIndex in the "selectThese" array so that highlighting and form filling reflects the change


    } else if(addRemove == "remove"){ //remove a vertex
        var thisVertIndex = selectThese.indexOf(seriesIndex); //get the vertexInfo array index of the selected point
        vertInfo.splice(thisVertIndex, 1); //remove the vertInfo object at the index found one line above
        selectThese.splice(thisVertIndex,1); //remove the series index from the selectThese array at the index found one line above
    }

    $(".segment").remove(); //empty the current segment form
    $(".vertex").remove(); //empty the current vertex form
    fillInForm(); //append new forms and fill them in from the altered vertInfo array



    //vertInfo = [];
    //var yearStart = 0,
    //	yearEnd = 0,
    //	len = selectedCircles.length,
    //	startIndex = 0,
    //	endIndex = 0,
    //	i = 0;

    //make empty segment entries in the form
    //for(i; i < len-1; i++){
    //	startIndex = selectedCircles[i];
    //	endIndex = selectedCircles[i+1];
    //	yearStart = data.Values[startIndex].Year; //years[startIndex]
    //	yearEnd =   data.Values[endIndex].Year; //years[endIndex];
    //	$("#segmentsFormTbl").append('<tr class="segment"><td class="highlightIt"><span class="glyphicon glyphicon-search"></span></td><td>'+yearStart+'</td><td>'+yearEnd+'</td><td class="changeProcessInput formDrop"></td></tr>');
    //}

    //make empty vertex entries
    //for(i=0; i < len; i++){
    //	startIndex = selectedCircles[i];
    //	yearStart = data.Values[startIndex].Year //years[startIndex];
    //	$("#verticesFormTbl").append('<tr class="vertex"><td class="highlightIt"><span class="glyphicon glyphicon-search"></span></td><td>'+yearStart+'</td><td class="landUseInput formDrop lulc"></td><td class="landCoverInput formDrop lulc"></td></tr>');
    //	vertInfo.push({
    //		year:yearStart,
    //		index:startIndex,
    //		landUse:{
    //			dominant:"",
    //			notes:{
    //				wetland:false,
    //				mining:false,
    //				rowCrop:false,
    //				orchardTreeFarm:false,
    //				vineyardsOtherWoody:false
    //			}
    //
    //		},
    //		landCover:{
    //			dominant:"",
    //			other:{
    //				trees:false,
    //				shrubs:false,
    //				grassForbHerb:false,
    //				impervious:false,
    //				naturalBarren:false,
    //				snowIce:false,
    //				water:false
    //			}
    //		},
    //		changeProcess:{
    //			changeProcess:"",
    //			notes:{
    //				natural:false,
    //				prescribed:false,
    //				sitePrepFire:false,
    //				airphotoOnly:false,
    //				clearcut:false,
    //				thinning:false,
    //				flooding:false,
    //				reserviorLakeFlux:false,
    //				wetlandDrainage:false
    //			}
    //		}
    //	});
    //}
}


//function to show a dropdown for the land use and change process inputs
function dropInputLists(thisInput, thisList, xAdj, yAdj, widthAdj){
    var rowPos = thisInput.position(),
        bottomTop = rowPos.top,
        bottomLeft = rowPos.left,
        bottomWidth = thisInput[0].getBoundingClientRect().width,
        bottomHeight = thisInput[0].getBoundingClientRect().height

    //drop its dropdown based on the position of the clicked element
    $("#"+thisList).css({
        position: "absolute",
        top: (bottomTop+parseFloat(bottomHeight)+yAdj),
        left: bottomLeft+xAdj,
        width: (parseFloat(bottomWidth)+widthAdj+"px")
    }).show();
}

//fill in note check box status in the lineInfo object when the done button is pressed
//function fillInNotes(selector, thisOne, noteClass, inputType){
//	noteClassSelected = $(selector).hasClass(noteClass);
//	switch(inputType){
//		case "landUse":
//			if(noteClassSelected){
//				vertInfo[thisOne].landUse.primary.notes[noteClass] = true;
//			} else {
//				vertInfo[thisOne].landUse.primary.notes[noteClass] = false;
//			}
//		break;
//		case "landCover":
//			if(noteClassSelected){
//				vertInfo[thisOne].landCover.other[noteClass] = true;
//			} else {
//				vertInfo[thisOne].landCover.other[noteClass] = false;
//			}
//		break;
//		case "changeProcess":
//			if(noteClassSelected){
//				vertInfo[thisOne].changeProcess.notes[noteClass] = true;
//			} else {
//				vertInfo[thisOne].changeProcess.notes[noteClass] = false;
//			}
//		break;
//	}
//}

//function to change the note icon depending on whether the note is selected or not
function changeNoteIcon(notesList, thisOne, inputType){
    //theseLi = $(notesList+" li")
    //theseLi.each(function(i){
    //var thisLi = $(this)
    //var noteClass = thisLi.attr("id");

    switch(inputType){
        case "landUse":
            $("#LUnotesList .wetland").prop("checked",vertInfo[thisOne].landUse.primary.notes.wetland);
            $("#LUnotesList .mining").prop("checked",vertInfo[thisOne].landUse.primary.notes.mining);
            $("#LUnotesList .rowCrop").prop("checked",vertInfo[thisOne].landUse.primary.notes.rowCrop);
            $("#LUnotesList .orchardTreeFarm").prop("checked",vertInfo[thisOne].landUse.primary.notes.orchardTreeFarm);
            $("#LUnotesList .vineyardsOtherWoody").prop("checked",vertInfo[thisOne].landUse.primary.notes.vineyardsOtherWoody);
            //noteNull = vertInfo[thisOne].landUse.primary.notes[noteClass];
            break;
        case "landUseSec":



            $("#LUnotesListSec .wetland").prop("checked",vertInfo[thisOne].landUse.secondary.notes.wetland);
            $("#LUnotesListSec .mining").prop("checked",vertInfo[thisOne].landUse.secondary.notes.mining);
            $("#LUnotesListSec .rowCrop").prop("checked",vertInfo[thisOne].landUse.secondary.notes.rowCrop);
            $("#LUnotesListSec .orchardTreeFarm").prop("checked",vertInfo[thisOne].landUse.secondary.notes.orchardTreeFarm);
            $("#LUnotesListSec .vineyardsOtherWoody").prop("checked",vertInfo[thisOne].landUse.secondary.notes.vineyardsOtherWoody);
            //noteNull = vertInfo[thisOne].landUse.primary.notes[noteClass];
            break;
        case "landCover":
            $("#trees").prop("checked",vertInfo[thisOne].landCover.other.trees);
            $("#shrubs").prop("checked",vertInfo[thisOne].landCover.other.shrubs);
            $("#grassForbHerb").prop("checked",vertInfo[thisOne].landCover.other.grassForbHerb);
            $("#impervious").prop("checked",vertInfo[thisOne].landCover.other.impervious);
            $("#naturalBarren").prop("checked",vertInfo[thisOne].landCover.other.naturalBarren);
            $("#snowIce").prop("checked",vertInfo[thisOne].landCover.other.snowIce);
            $("#water").prop("checked",vertInfo[thisOne].landCover.other.water);
            //noteNull = vertInfo[thisOne].landCover.other[noteClass];
            break;
        case "changeProcess":
            $("#natural").prop("checked",vertInfo[thisOne].changeProcess.notes.natural);
            $("#prescribed").prop("checked",vertInfo[thisOne].changeProcess.notes.prescribed);
            $("#sitePrepFire").prop("checked",vertInfo[thisOne].changeProcess.notes.sitePrepFire);
            $("#airphotoOnly").prop("checked",vertInfo[thisOne].changeProcess.notes.airphotoOnly);
            $("#clearcut").prop("checked",vertInfo[thisOne].changeProcess.notes.clearcut);
            $("#thinning").prop("checked",vertInfo[thisOne].changeProcess.notes.thinning);
            $("#flooding").prop("checked",vertInfo[thisOne].changeProcess.notes.flooding);
            $("#reserviorLakeFlux").prop("checked",vertInfo[thisOne].changeProcess.notes.reserviorLakeFlux);
            $("#wetlandDrainage").prop("checked",vertInfo[thisOne].changeProcess.notes.wetlandDrainage);
            //noteNull = vertInfo[thisOne].changeProcess.notes[noteClass];
            break;
    }

    //noteNull = lineInfo.segments[thisOne].notes[noteClass];
    //		if(noteNull == false){
    //thisLi.prepend('<span class="glyphicon glyphicon-unchecked"></span> ') //theseLi.eq(i)
    //		} else{
    //thisLi.removeClass("disables");
    //thisLi.prepend('<span class="glyphicon glyphicon-ok"></span> '); //theseLi.eq(i)
    //thisLi.addClass("selected");
    //		}
    //});
}

//turn highlighting off
function highlightOff(){
    $("circle.data.highlight").attr("class","data selected").css({"stroke":highLightColor,"stroke-width":2});
    $(".chipHolder.highlight").addClass("selected").removeClass("highlight");
    $("tr.active").removeClass("active").css("background-color","white"); //only needed when using the color options
    $("circle").css("cursor","pointer");
    $(".chipImg").css("cursor","pointer");
    setSelectedColor();
}

//turn highlighting on
function highlightOn(linePart, thisOne){
    switch(linePart){
        case "vertex":
            var thisIndex = vertInfo[thisOne].index;
            $("circle.data:eq("+thisIndex+")").attr("class","data highlight");
            $(".chipHolder:eq("+thisIndex+")").removeClass("selected").addClass("highlight");
            break;
        case "segment":
            var startIndex = vertInfo[thisOne-1].index; //pull out the start index for the selected row
            var endIndex = vertInfo[thisOne].index; //pull out the end index for the selected row
            $("circle.data:eq("+startIndex+")").attr("class","data highlight"); //highlight the start circle for the selected row (segment)
            $("circle.data:eq("+endIndex+")").attr("class","data highlight"); //highlight the end circle for the selected row (segment)
            $(".chipHolder:eq("+startIndex+")").removeClass("selected").addClass("highlight"); //highlight the start canvas for the selected row (segment)
            $(".chipHolder:eq("+endIndex+")").removeClass("selected").addClass("highlight"); //highlight the end canvas for the selected row (segment)
            break;
    }
    $("circle").css("cursor","not-allowed");
    $(".chipImg").css("cursor","not-allowed");
    setHighlightColor(); //only needed when using the color options
}

//figure out which dropdown to close and what info to record
function closeDropAndRecord(){
    $("#luLevelSwitchHolder li").removeClass("selected").css({"font-weight":"normal"});
    $("#LUprimaryTab").addClass("selected").css({"font-weight":"bold"});
    $("#landUseListSec").hide();
    $("#landUseList").show();
    $("#LUnotesListSec").hide();
    $("#LUnotesList").show();
    var tdActive = $("td.active");
    if(tdActive.length != 0){ //only perform closeDropAndRecord if there is an active td
        sessionInfo.isDirty = true;
        if(tdActive.hasClass("changeProcessInput")){
            changeProcessDoneBtn();
        } else if(tdActive.hasClass("lulc")){ //landUseInput
            $("#lulc").hide();
            landUseDoneBtn();
            landCoverDoneBtn();
        } //else if(tdActive.hasClass("landCoverInput")){
        //landCoverDoneBtn();
        //}
        tdActive.removeClass("active");
    }
}
/////////////////////////////////////////////////////////////////////////////////////////





///////////////////////////////////////////////////////BELOW ARE CHIP SCRIPTS///////////////////////////////////////////////////////
//////////////BELOW ARE CHIP SCRIPTS////////////////////////////////////////BELOW ARE CHIP SCRIPTS//////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////BELOW ARE CHIP SCRIPTS//////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////BELOW ARE CHIP SCRIPTS///////////////////////
////////////////////////////BELOW ARE CHIP SCRIPTS//////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////BELOW ARE CHIP SCRIPTS/////////////////////////////////BELOW ARE CHIP SCRIPTS////



///////////PLOT SIZE CHANGE///////////////////////////////////////////////////////////////////////////////
$("#plotSize").change(function(){ //REACT IGNORED FUNCTION
    var plotSizeObject = $("#plotSize"),
        plotSize = parseInt(plotSizeObject.prop("value"));
    if((plotSize % 2) == 0){plotSize += 1}
    plotSize = Math.min(plotSize,5);
    plotSize = Math.max(plotSize,1);
    plotSizeObject.prop("value",plotSize);
    //chipInfo.box = Math.sqrt(plotSize);
    chipDisplayProps.box = plotSize;
    $("#plotSizeList").hide();
    switch(chipDisplayProps.box){
        case 1:
            stopZoom = 40;
            break;
        case 3:
            stopZoom = 32;
            break;
        case 5:
            stopZoom = 27;
            break;
    }
    updateChipInfo();
    drawAllChips("annual");
    var message = {"action":"plotSize","chipDisplayProps":chipDisplayProps} //prepare zoom message

    if ((chipstripwindow != null) && chipstripwindow.closed == false){
        chipstripwindow.postMessage(JSON.stringify(message),"*");
    }
    /* 				if ((expandedChipWindow != null) && expandedChipWindow.closed == false){
                        expandedChipWindow.postMessage(JSON.stringify(message),"*");
                    } */
});

///////////CHIP SIZE CHANGE///////////////////////////////////////////////////////////////////////////////
$("#chipSize").change(function(){
    var chipSizeObject = $("#chipSize");
    var	chipSize = parseInt(chipSizeObject.prop("value"));
    if((chipSize % 2) == 0){chipSize += 1}
    chipSize = Math.min(chipSize,255);
    chipSize = Math.max(chipSize,135);
    chipSizeObject.prop("value",chipSize);

    //redraw the canvases and img chips
    chipDisplayProps.chipSize = chipSize;
    chipDisplayProps.halfChipSize = chipSize/2;
    chipDisplayProps.offset = (255 - chipSize)/2; // - 1;  //YANG 2016.08.06
    chipDisplayProps.canvasHeight = chipSize//+17;

    $(".chipHolder").remove();
    appendChips("annual", selectThese);
    updateChipInfo();
    drawAllChips("annual");
    var message = {"action":"chipSize","chipDisplayProps":chipDisplayProps} //prepare zoom message

    //send the zoom message
    if ((chipstripwindow != null) && chipstripwindow.closed == false){
        chipstripwindow.postMessage(JSON.stringify(message),"*");
    }
    /* 				if ((expandedChipWindow != null) && expandedChipWindow.closed == false){
                        expandedChipWindow.postMessage(JSON.stringify(message),"*");
                    } */

});

///////////ZOOM SLIDER CHANGE///////////////////////////////////////////////////////////////////////////////
$("#zoomSize").change(function(){
    var zoomSizeObject = $("#zoomSize"),
        zoomSize = parseInt(zoomSizeObject.val());
    if (zoomSize > stopZoom){zoomSize = stopZoom}
    if (zoomSize < minZoom){zoomSize = minZoom}
    chipDisplayProps.zoomLevel = zoomSize;

    drawAllChips("annual"); //redraw the annual chips with the new zoom

    var message = {"action":"zoom","chipDisplayProps":chipDisplayProps}

    //send the zoom array to the external window
    if ((chipstripwindow != null) && chipstripwindow.closed == false){
        chipstripwindow.postMessage(JSON.stringify(message),"*");
    }
    /* 					if ((expandedChipWindow != null) && expandedChipWindow.closed == false){
                            expandedChipWindow.postMessage(JSON.stringify(zoomInfo),"*");
                        } */
});





///////////DEFINE THE FUNCTION TO ADD THE CANVAS AND IMAGE FOR EACH CHIP ON-THE-FLY////////////
function appendSrcImg(){
    for(var i=0;i<n_chips;i++){
        //chipInfo.imgIDs[i] = ("img"+i);
        //var appendThisImg = '<img class="chipImgSrc" id="'+chipInfo.imgIDs[i]+'"src="'+origData[i].url+'">';
        var thisChipSet = $("#chipSetList .active").attr("id");
        var appendThisImg = '<img class="chipImgSrc" id="'+chipInfo.imgIDs[i]+'"src="'+chipInfo.src[i][thisChipSet]+'">';
        $("#img-gallery").append(appendThisImg);
    }
}

function appendChips(window, selected, color){ //this function is handling the appending of the main chips and the remote chips, though it might be better to separate them
    for(var i=0; i<n_chips; i++){
        chipInfo.canvasIDs[i] = ("chip"+i);
        var appendThisCanvas = '<div id="'+chipInfo.canvasIDs[i]+'" class="chipHolder">'+
            '<canvas class="chipImg" width="'+chipDisplayProps.chipSize+'" height="'+chipDisplayProps.canvasHeight+'"></canvas>'+
            '<div class="chipDate">&nbsp;</div>'+ //'<span class="glyphicon glyphicon-new-window expandChipYear" aria-hidden="true" style="float:right; margin-right:5px"></span>'+
            '</div>';
        $("#chip-gallery").append(appendThisCanvas);
    }
    if(window == "annual"){
        $(".chipHolder, .chipImg, .chipImgSrc").addClass("annual")
        for(var i=0;i<selected.length;i++){$(".chipHolder").eq(selected[i]).addClass("selected");}
        setSelectedColor()
    } else if(window == "intraAnnual"){
        $(".chipHolder, .chipImg, .chipImgSrc").addClass("intraAnnual")
        for(var i=0;i<selected.length;i++){$(".chipHolder").eq(selected[i]).addClass("selected");}
    }

    if($("#toolTipsCheck").hasClass("glyphicon glyphicon-ok")){
        $("canvas.chipImg.annual").prop("title","This is an annual image chip. It represents the 255 x 255 pixel image subset centered on the plot. There is one image per year and the center pixel outlined in white corresponds to a spectral point in the pixel time series. The correspondence between this image chip and its mathcing point in the spectral point time series is marked by shared green highlighting on hover. Holding the shift key while mouse wheeling on an image chip will change the scale. Double clicking on an image chip will toggle a vertex on and off. Image chips that are outlined in red represent vertices.")
        $("span.expandChipYear").prop("title","This is intra-annual image chip window icon. Clicking it will open a new window and/or load all image chips for the year. In the intra-annual image chip window, all chips have a corresponding intra-annual spectral point in the time series plot. Hovering over any of the image chips while the Show Points (show intra-annual points) toggle is active (thumbs up), the corresponding point will be highlighted in blue. This will help you make a decision about which point is best suited to represent the year. Clicking on any of the image chips will set that chip as the new data for the year. The data will immediately change in the main chip gallery and in the spectral time series plot.")
        $(".chipDate").prop("title","This is the year and day of the image chip and corresponding point in the spectral time series plot. The day is defined by day-of-year. In the Help button dropdown menu there is a conversion calendar that links day-of-year to month-day to help interpret when the image was recorded.")
    }
}




////////////////DEFINE FUNCTION TO INITIALLY POPULATE CHIPINFO OBJECT/////////////////////////////////////
function makeChipInfo(selection, origData){
    for(var i=0; i < n_chips; i++){
        //var thisimg = document.getElementById(chipInfo.imgIDs[i]);
        //var	thisManyChips = thisimg.naturalHeight/255;
        if(selection == "random"){
            //randomly select a chip from a strip to display - not needed once we have json file to tell us
            var useThisChip = Math.floor((Math.random() * thisManyChips));
        } else if(selection == "ordered"){
            var useThisChip = i;
        } else if(selection == "json"){
            var useThisChip = 0;
            var year = origData[i].image_year
            var julday = origData[i].image_julday
            var src = {chipSetBGW:origData[i].url_tcb,
                chipSet743:origData[i].url_743,
                chipSet432:origData[i].url_432}
            //var src = origData[i].url
            var sensor = origData[i].sensor
        }
        //define/store some other info needed for zooming
        //chipInfo.chipsInStrip.push(thisManyChips);
        //chipInfo.useThisChip.push(useThisChip);
        //chipInfo.year.push(year);
        //chipInfo.julday.push(julday);
        //chipInfo.src.push(src);

        chipInfo.chipsInStrip[i] = 1 //thisManyChips;
        chipInfo.useThisChip[i] = useThisChip;
        chipInfo.year[i] = year;
        chipInfo.julday[i] = julday;
        chipInfo.src[i] = src;
        chipInfo.sensor[i] = sensor;
        chipInfo.imgIDs[i] = ("img"+i);
    }
    updateChipInfo();
}


////////////////DEFINE FUNCTION TO UPDATE THE CHIPINFO OBJECT WHEN A NEW CHIP SIZE IS SELECTED////////////
function updateChipInfo(){
    for(var i=0; i < n_chips; i++){
        //define/store some other info needed for zooming
        chipInfo.sxOrig[i] = chipDisplayProps.offset;	//0 chipInfo.offset set/push the original source x offset to the sxOrig array
        chipInfo.syOrig[i] = (255*chipInfo.useThisChip[i])+chipDisplayProps.offset; // +chipInfo.offset   set/push the original source y offset to the syOrig array
        chipInfo.sWidthOrig[i] = chipDisplayProps.chipSize; //255  set/push the original source x width to the sWidthOrig array
        chipInfo.sxZoom[i] = chipInfo.sxOrig[i];
        chipInfo.syZoom[i] = chipInfo.syOrig[i];
        chipInfo.sWidthZoom[i] = chipInfo.sWidthOrig[i];
    }

    var starter = chipDisplayProps.halfChipSize,
        lwstarter = chipDisplayProps.box;

    //console.log(sAdj);
    for(var i=1; i<maxZoom+1; i++){
        starter *= 0.9
        sAdj[i] = (chipDisplayProps.halfChipSize-starter);
        lwstarter /= 0.9;
        lwAdj[i] = lwstarter;
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////


function tlPlay(){
    var tlImgID = $(".chipImgSrc").eq(timeLapseIndex)[0]
    tlctx.drawImage(
        tlImgID,
        chipInfo.sxZoom[timeLapseIndex],
        chipInfo.syZoom[timeLapseIndex],
        chipInfo.sWidthZoom[timeLapseIndex],
        chipInfo.sWidthZoom[timeLapseIndex],
        0,0,235,235
    );
    tlctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
    tlctx.lineWidth=1;
    tlctx.lineCap = 'square';
    tlctx.strokeRect(117.5-(chipDisplayProps.boxZoom/2), 117.5-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
    $("#tlDate").text(data.Values[timeLapseIndex].Year);
    if(timeLapseIndex < lastIndex){timeLapseIndex += 1} else {timeLapseIndex = 0}
}

flickerDir = "forward"; //"forward";
function tlFlicker(){
    var tlImgID = $(".chipImgSrc").eq(timeLapseIndex)[0]
    tlctx.drawImage(
        tlImgID,
        chipInfo.sxZoom[timeLapseIndex],
        chipInfo.syZoom[timeLapseIndex],
        chipInfo.sWidthZoom[timeLapseIndex],
        chipInfo.sWidthZoom[timeLapseIndex],
        0,0,235,235
    );
    tlctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
    tlctx.lineWidth=1;
    tlctx.lineCap = 'square';
    tlctx.strokeRect(117.5-(chipDisplayProps.boxZoom/2), 117.5-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
    $("#tlDate").text(data.Values[timeLapseIndex].Year);

    if(flickerDir == "forward"){
        timeLapseIndex -= 1;
        flickerDir = "back";
    } else{
        timeLapseIndex += 1;
        flickerDir = "forward";
    }
    if(timeLapseIndex > lastIndex){timeLapseIndex = 0}
    if(timeLapseIndex < 0){timeLapseIndex = lastIndex}
}


var vidCntl = {"isVidPlaying":0,"dontPlayVid":0,"isFlickerOn":0,"dontFlicker":0,"speed":300}
$(".tlBtn").click(function(){
    var thisID = $(this).attr("id");
    var wasVidPlaying = vidCntl.isVidPlaying;
    var wasFlickerOn = vidCntl.isFlickerOn;

    if(vidCntl.isVidPlaying == 1){
        clearInterval(playTL);
        $("#tlPlay span").attr("class","glyphicon glyphicon-play")
        vidCntl.isVidPlaying = 0;
        vidCntl.dontPlayVid = 1;
    }
    if(vidCntl.isFlickerOn == 1){
        clearInterval(flickerTL);
        $("#tlPlay span").attr("class","glyphicon glyphicon-play")
        vidCntl.isFlickerOn = 0;
        vidCntl.dontFlicker = 1;
        flickerDir = "forward";
    }


    if(thisID == "tlBackx2"){
        timeLapseIndex += -2;
        timeLapseIndex = (timeLapseIndex < 0) ? 0:timeLapseIndex
        drawTLimage();
        $("#tlDate").text(data.Values[timeLapseIndex].Year);
        drawTLimage();
    } else if(thisID == "tlBack" && timeLapseIndex > 0){
        timeLapseIndex += -1;
        drawTLimage();
        $("#tlDate").text(data.Values[timeLapseIndex].Year);
        drawTLimage();
    } else if(thisID == "tlPlay" && vidCntl.dontPlayVid == 0){
        playTL = setInterval(tlPlay, vidCntl.speed);
        vidCntl.isVidPlaying = 1
        $("#tlPlay span").attr("class","glyphicon glyphicon-pause")
    } else if(thisID == "tlForward" && timeLapseIndex < lastIndex){
        timeLapseIndex += 1;
        drawTLimage();
        $("#tlDate").text(data.Values[timeLapseIndex].Year);
        drawTLimage();
    } else if(thisID == "tlForwardx2"){
        timeLapseIndex += 2;
        timeLapseIndex = (timeLapseIndex > lastIndex) ? (lastIndex):timeLapseIndex
        $("#tlDate").text(data.Values[timeLapseIndex].Year);
        drawTLimage();
    } else if(thisID == "flicker" && vidCntl.dontFlicker == 0){
        flickerTL = setInterval(tlFlicker, vidCntl.speed);
        vidCntl.isFlickerOn = 1
    } else if(thisID == "faster"){
        vidCntl.speed = (vidCntl.speed > 100) ? vidCntl.speed-50:vidCntl.speed //50 is the lowest speed
        if(wasVidPlaying == 1){
            playTL = setInterval(tlPlay, vidCntl.speed);
            $("#tlPlay span").attr("class","glyphicon glyphicon-pause")
            vidCntl.isVidPlaying = 1
        }
        if(wasFlickerOn == 1){
            flickerTL = setInterval(tlFlicker, vidCntl.speed);
            vidCntl.isFlickerOn = 1
        }
    } else if(thisID == "slower"){
        vidCntl.speed = (vidCntl.speed < 850) ? vidCntl.speed+50:vidCntl.speed //900 is the lowest speed
        if(wasVidPlaying == 1){
            playTL = setInterval(tlPlay, vidCntl.speed);
            $("#tlPlay span").attr("class","glyphicon glyphicon-pause")
            vidCntl.isVidPlaying = 1
        }
        if(wasFlickerOn == 1){
            flickerTL = setInterval(tlFlicker, vidCntl.speed);
            vidCntl.isFlickerOn = 1
        }
    }

    vidCntl.dontPlayVid = 0;
    vidCntl.dontFlicker = 0;

    //$("#tlDate").text(data.Values[timeLapseIndex].Year);
})

function drawTLimage(){
    var tlImgID = $(".chipImgSrc").eq(timeLapseIndex)[0]
    tlctx.drawImage(
        tlImgID,
        chipInfo.sxZoom[timeLapseIndex],
        chipInfo.syZoom[timeLapseIndex],
        chipInfo.sWidthZoom[timeLapseIndex],
        chipInfo.sWidthZoom[timeLapseIndex],
        0,0,235,235
    );
    tlctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
    tlctx.lineWidth=1;
    tlctx.lineCap = 'square';
    tlctx.strokeRect(117.5-(chipDisplayProps.boxZoom/2), 117.5-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////












////////////////DEFINE FUNCTION TO DRAW ALL THE IMAGE CHIPS TO THE CANVASES/////////////////////
//var plotColor = $("#plotColor").prop("value") //global variable
function drawAllChips(window){
    updateZoom();
    for(var i=0; i<n_chips; i++){drawOneChip(i, window)}
}


////////////DEFINE FUNCTION TO DRAW A NEW IMAGE SECTION TO A CANVAS////////////////////////////
function drawOneChip(thisChip, window){
    var timgID = $('.chipImgSrc.'+window).eq(thisChip)[0];
    var	canvasID = $('.chipImg.'+window).eq(thisChip)[0];
    var	ctx = canvasID.getContext("2d");

    var img = new Image;
    img.onload = function() {
        try {
            ctx.clearRect(0,0,canvasID.width, canvasID.height);
            ctx.mozImageSmoothingEnabled = false;
            ctx.webkitImageSmoothingEnabled = false;
            ctx.msImageSmoothingEnabled = false;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
                img,
                chipInfo.sxZoom[thisChip],
                chipInfo.syZoom[thisChip],
                chipInfo.sWidthZoom[thisChip],
                chipInfo.sWidthZoom[thisChip],
                0,0,chipDisplayProps.chipSize,chipDisplayProps.chipSize
            ); //chipInfo.offset,chipInfo.offset
            ctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
            ctx.lineWidth=1;
            ctx.lineCap = 'square';
            ctx.strokeRect(chipDisplayProps.halfChipSize-(chipDisplayProps.boxZoom/2), chipDisplayProps.halfChipSize-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
        }
        catch (e) {}
    }

    img.src = timgID.src;

    if(window == "annual"){
        $(".chipDate").eq(thisChip).empty().append(chipInfo.year[thisChip]+"-"+chipInfo.julday[thisChip]+" "+chipInfo.sensor[thisChip]+'<span class="glyphicon glyphicon-new-window expandChipYear" aria-hidden="true" style="float:right; margin-right:5px"></span>')
        if($("#toolTipsCheck").hasClass("glyphicon glyphicon-ok")){
            $("span.expandChipYear").prop("title","This is intra-annual image chip window icon. Clicking it will open a new window and/or load all image chips for the year. In the intra-annual image chip window, all chips have a corresponding intra-annual spectral point in the time series plot. Hovering over any of the image chips while the Show Points (show intra-annual points) toggle is active (thumbs up), the corresponding point will be highlighted in blue. This will help you make a decision about which point is best suited to represent the year. Clicking on any of the image chips will set that chip as the new data for the year. The data will immediately change in the main chip gallery and in the spectral time series plot.")
        }

    } else if(window == "intraAnnual"){
        $(".chipDate").eq(thisChip).empty().append(chipInfo.year[thisChip]+"-"+chipInfo.julday[thisChip]+" "+chipInfo.sensor[thisChip])
    }
}



////////////REPLACE A CHIP WITH ONE SELECTED IN THE REMOTE WINDOW//////////////////////////////
function replaceChip(pass_data){
    //adjust the chip offset for the orig
    var replaceThisChip = pass_data.originChipIndex
    var thisImg = $(".chipImgSrc").eq(replaceThisChip);
    var thisChipSet = $("#chipSetList .active").attr("id"); //this could be global -it gets used in "appendSrcImg()"
    thisImg.attr("src",chipInfo.src[replaceThisChip][thisChipSet]);
    chipInfo.useThisChip[replaceThisChip] = pass_data.useThisChip;
    chipInfo.syOrig[replaceThisChip] = (255*chipInfo.useThisChip[replaceThisChip])+chipDisplayProps.offset; // +chipInfo.offset   set/push the original source y offset to the syOrig array
    chipInfo.syZoom[replaceThisChip] = chipInfo.syOrig[replaceThisChip]+sAdj[chipDisplayProps.zoomLevel];
    //draw the chip - need to call updateZoom first since not running drawAllChips
    //updateZoom() //don't need to run since the syZoom was updated a line up

    //thisImg.on("load",function(){
    //	drawOneChip(replaceThisChip)
    //}).attr("src",chipInfo.src[replaceThisChip]);


    //thisImg.on("load",function(){
    drawOneChip(replaceThisChip, "annual")
    //});
}
/////////////////////////////////////////////////////////////////////////////////////////////////


function updateZoom(){
    for(var i=0; i<n_chips; i++){
        chipInfo.sxZoom[i] = chipInfo.sxOrig[i]+sAdj[chipDisplayProps.zoomLevel];
        chipInfo.syZoom[i] = chipInfo.syOrig[i]+sAdj[chipDisplayProps.zoomLevel];
        chipInfo.sWidthZoom[i] = chipInfo.sWidthOrig[i]-(sAdj[chipDisplayProps.zoomLevel]*2);
    }
    chipDisplayProps.boxZoom = lwAdj[chipDisplayProps.zoomLevel];
}


$(document).on("mousewheel",".chipImg",function(e){ //canvas.annual
    if(e.shiftKey){ //
        e.preventDefault(); //make sure that default browser behaviour is prevented

        //if(Math.abs(e.deltaY) <= 15) {return; } //{zoomIn = 1} else {zoomIn = 0}
        //if(Math.abs(e.deltaY) < 1) {return; }
        //if(e.deltaX <= -1 || e.deltaY >= 1){zoomIn = 1} else {zoomIn = 0}
        var delta = e.deltaY;
        // if (window.navigator.platform==='Win32' && window.navigator.product==='Gecko') {
        // 	delta = e.deltaX;
        // }

        if(delta > 0){
            if (chipDisplayProps.zoomLevel < maxZoom & chipDisplayProps.zoomLevel < stopZoom){chipDisplayProps.zoomLevel++;}
        } else {
            if (chipDisplayProps.zoomLevel > minZoom){chipDisplayProps.zoomLevel--;}
        }
        $("#zoomSize").val(chipDisplayProps.zoomLevel) //this initiates the img chip redraw for annual through jquery value change event handling

        var message = {
            "action":"zoom",
            "chipDisplayProps":chipDisplayProps
        }

        if($(this).hasClass("annual")){
            drawAllChips("annual"); //redraw the chips with the new zoom - since the event listener is attached to the .chipImg class it will try to run this in the intra-annual chip window and throw an undefined variable error because "annual" class chips do not exist there - not a problem the program continues
            if ((chipstripwindow != null) && chipstripwindow.closed == false){
                chipstripwindow.postMessage(JSON.stringify(message),"*");
            }
            /* 						if((expandedChipWindow != null) && expandedChipWindow.closed == false){
                                        expandedChipWindow.postMessage(JSON.stringify(zoomInfo),"*");
                                    } */
        } else if($(this).hasClass("intraAnnual")){
            drawAllChips("intraAnnual"); //redraw the chips with the new zoom
            originURL.postMessage(JSON.stringify(message),"*"); //originURL is defined in the intraAnnual window
        }
    }
});



///////////////////OPEN THE REMOTE CHIP STRIP WINDOW AND SEND MESSAGES/////////////////////

//var originURL = null;
$("body").on("click", ".expandChipYear, .data", function(e){ //need to use body because the canvases have probably not loaded yet
    var nodeType = $(this).prop('nodeName');
    if(nodeType == "circle"){
        if(e.shiftKey){
            var thisImg = $("circle.data").index(this);
        } else {
            return
        }
    } else if(nodeType == "SPAN"){
        var thisImg = $(".expandChipYear").index(this);
    }

    //if (e.ctrlKey) {
    //var thisImg = (parseInt($(this).attr("id").replace( /^\D+/g, ''))); //extract the chip index
    //var thisImg = $(".expandChipYear").index(this) //extract the chip index
    var selectedColor = $("#selectedColor").prop("value");
    var pass_data = {
        "action":"add_chips", //hard assign
        "n_chips":chipInfo.chipsInStrip[thisImg], //"n_chips":"40", //get this from the img metadata
        "src":chipInfo.src[thisImg], //"src":"chips/chips_2012.png", //get this from the id of the .chipholder clicked
        "chipIndex":thisImg,
        "chipDisplayProps":chipDisplayProps,
        "useThisChip":chipInfo.useThisChip[thisImg], //this is only needed if the chips are in strips
        "year":chipInfo.year[thisImg],
        "julday":chipInfo.julday[thisImg],
        "userID":sessionInfo.userID,
        "projectID":sessionInfo.projectID,
        "plotID":sessionInfo.plotID,
        "tsa":sessionInfo.tsa,
        "selectedColor":selectedColor,
        "yearList":yearList,
        "thisChipSet":$("#chipSetList .active").attr("id") //this is found one other time - could make it global
    };
    if ((chipstripwindow == null) || (chipstripwindow.closed)){      //if the window is not loaded then load it and send the message after it is fully loaded
        chipstripwindow = window.open("./chip_qa.php?t=" + authHeader + "&a="+Math.floor(Math.random()*800000),"_blank","width=1080px, height=840px", "toolbar=0","titlebar=0","menubar=0","scrollbars=yes"); //open the remote chip strip window

        var pscall = setTimeout(function(){
            // console.log('sending message');
            chipstripwindow.postMessage(JSON.stringify(pass_data),"*");
        }, 1000);

        // $(chipstripwindow).on("load",function(){
        // 	console.log("sending message");
        // 	chipstripwindow.postMessage(JSON.stringify(pass_data),"*");
        // });
    } else {                                                         //else if the window is already loaded, just send the message - no need to wait
        chipstripwindow.postMessage(JSON.stringify(pass_data),"*");
    }
    //}
});


///////////////////OPEN THE REMOTE CHIP STRIP WINDOW AND SEND MESSAGES/////////////////////
/* 			var trajectoryWindow = null ;//keep track of whether the chipstrip window is open or not so it is not opened in multiple new window on each chip click
			var innerWidth = window.innerWidth
			$("body").on("click", "#expandTrajPlot", function(e){ //need to use body because the canvases have probably not loaded yet

				var pass_data = {
					"action":"add_trajectory", //hard assign
					"data":data,
					"allData":allData,
					"specIndex":specIndex,
					"domain":currentDomain,
					"n_chips":n_chips,
					"selectThese":selectThese,
					"activeRedSpecIndex":activeRedSpecIndex,
					"activeGreenSpecIndex":activeGreenSpecIndex,
					"activeBlueSpecIndex":activeBlueSpecIndex
				};

				if ((trajectoryWindow == null) || (trajectoryWindow.closed)){      //if the window is not loaded then load it and send the message after it is fully loaded
					trajectoryWindow = window.open("./expanded_trajectory_plot.html","_blank","width="+innerWidth+"px, height=750px, toolbar=0, titlebar=0, menubar=0, scrollbars=yes"); //open the remote chip strip window
					$(trajectoryWindow).load(function(){trajectoryWindow.postMessage(JSON.stringify(pass_data),"*");}); //wait until the remote window finishes loading before sending the message
					} else {                                                         //else if the window is already loaded, just send the message - no need to wait
					trajectoryWindow.postMessage(JSON.stringify(pass_data),"*");
				}
			}); */


/* 			var expandedChipWindow = null;
			$("#expandChipGallery").click(function(){

				var selectedColor = $("#selectedColor").prop("value");
				var pass_data = {
					"action":"init_chips", //hard assign
					"selectThese":selectedCircles, //selectThese, //"n_chips":"40", //get this from the img metadata
					"chipInfo":chipInfo,
					"n_chips":n_chips,
					"chipDisplayProps":chipDisplayProps,
					"selectedColor":selectedColor

				};
				if ((expandedChipWindow == null) || (expandedChipWindow.closed)){      //if the window is not loaded then load it and send the message after it is fully loaded
					expandedChipWindow = window.open("./expanded_chip_gallery.html","_blank","width=1080px, height=840px", "toolbar=0","titlebar=0","menubar=0","scrollbars=yes"); //open the remote chip strip window
					$(expandedChipWindow).load(function(){expandedChipWindow.postMessage(JSON.stringify(pass_data),"*");}); //wait until the remote window finishes loading before sending the message
				} else {                                                         //else if the window is already loaded, just send the message - no need to wait
					expandedChipWindow.postMessage(JSON.stringify(pass_data),"*");
				}
			}); */


var doyCalWindow = null;
$("#doyCalLi").click(function(){
    if ((doyCalWindow == null) || (doyCalWindow.closed)){      //if the window is not loaded then load it and send the message after it is fully loaded
        doyCalWindow = window.open("./doy_calendar.html","_blank","width=900px, height=647px, toolbar=0, titlebar=0, menubar=0, scrollbars=yes"); //open the remote chip strip window
    }
});

/* 			loads a page that contains the response design - taken care of with a pdf link right now (3/2/16)
			var RDWindow = null;
			$("#RDLi").click(function(){
				if ((RDWindow == null) || (RDWindow.closed)){      //if the window is not loaded then load it and send the message after it is fully loaded
					RDWindow = window.open("./response_design.html","_blank","width=900px, height=647px, toolbar=0, titlebar=0, menubar=0, scrollbars=1"); //open the remote chip strip window
				}
			}); */


//////////////////////////GET MESSAGES FROM REMOTE////////////////////////////////////////////
//receive messages from the origin window
function changeDefaultChip(sessionInfo, year, newDOY, oldDOY){
    var imagePreference = {
        "projectID": sessionInfo.projectID,
        "tsa": sessionInfo.tsa,
        "plotID": sessionInfo.plotID,
        "userID": sessionInfo.userID,
        "year": year,
        "julday": newDOY,
        "oldJulday": oldDOY
    }

    imagePreference = JSON.stringify(imagePreference);
    $.post(getUrls(sessionInfo).chipOverRide, {"imagePreference":imagePreference})
        .fail(function(){
            alert("Failed to save image preference");
        });
}

function IsJsonString(json){
    var str = json.toString();
    try {
        JSON.parse(str);
    }
    catch (e)
    {
        return false;
    }
     
    return true;
}

$(window).on("message onmessage",function(e){
    try {
        var remoteMessage = JSON.parse(e.originalEvent.data);
    }
    catch (e) {
        return;
    }

    if(remoteMessage.action == "replace_chip"){
        //capture info to send to the server
        var oldDOY = data.Values[remoteMessage.originChipIndex].doy
        var newDOY = remoteMessage.data.doy

        //fill in the data for the new image selection
        data.Values[remoteMessage.originChipIndex] = remoteMessage.data;
        data = calcDecDate(data);
        chipInfo.src[remoteMessage.originChipIndex]=remoteMessage.src;
        chipInfo.julday[remoteMessage.originChipIndex]=remoteMessage.data.doy //.julday; //newDOY

        //replace the chip
        replaceChip(remoteMessage); //replace a chip with one selected in the remote window

        //prepare the color for the new selection
        rgbColor = scaledRGB(data, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, n_chips);

        //change the spectral plot
        changePlotPoint();

        //save the new image selection to the server so it will be the default in the future
        changeDefaultChip(sessionInfo, year=data.Values[remoteMessage.originChipIndex].Year, newDOY=newDOY, oldDOY=oldDOY) //changeDefaultChip(sessionInfo, year=data.Values[remoteMessage.originChipIndex].Year, newDOY=remoteMessage.julday, oldDOY=data.Values[remoteMessage.originChipIndex].doy)

    } else if(remoteMessage.action == "zoom"){
        chipDisplayProps = remoteMessage.chipDisplayProps
        $("#zoomSize").val(chipDisplayProps.zoomLevel)
        drawAllChips("annual");
    } else if(remoteMessage.action == "mouseEnter"){
        var thisPoint = allDecdate.indexOf(remoteMessage.data.decDate)
        $("circle.allData").eq(thisPoint).attr("r", 9)
        $("circle.allData").eq(thisPoint).css({"stroke":"#19B5FE","stroke-width":5})	  //#ED2939
    } else if(remoteMessage.action == "mouseLeave"){
        var thisPoint = allDecdate.indexOf(remoteMessage.data.decDate)
        $("circle.allData").eq(thisPoint).attr("r", 3)
        $("circle.allData").eq(thisPoint).css({"stroke-width":0})
    }

    //$("#message").append(e.originalEvent.data); //****need to use 'originalEvent' instead of 'event' since im using jquery to bind the event. the jquery event object is different from the javascript event object - originalEvent is a copied version of the original javascript event object
});


function tlInt(){
    var tlImgID = $(".chipImgSrc").eq(timeLapseIndex)[0]
    tlctx.mozImageSmoothingEnabled = false;
    tlctx.msImageSmoothingEnabled = false;
    tlctx.imageSmoothingEnabled = false;
    tlctx.drawImage(
        tlImgID,
        chipInfo.sxZoom[timeLapseIndex],
        chipInfo.syZoom[timeLapseIndex],
        chipInfo.sWidthZoom[timeLapseIndex],
        chipInfo.sWidthZoom[timeLapseIndex],
        0,0,235,235
    );
    tlctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
    tlctx.lineWidth=1;
    tlctx.lineCap = 'square';
    tlctx.strokeRect(117.5-(chipDisplayProps.boxZoom/2), 117.5-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
    $("#tlDate").text(data.Values[timeLapseIndex].Year);
}




/////////////////////////LOAD THE CHIPS////////////////////////////////////////////////////////
//function to run functions that need all the elements to be loaded - also need to do them in order was the window is loaded
//var tlctx //global
//function start(){
//makeChipInfo("json"); //random
//drawAllChips();

//tlImgID = document.getElementById("img0");
//	tlImgID = $(".chipImgSrc").eq(timeLapseIndex)[0]
//	console.log(tlImgID);
//	tlctx = tlCanvasID.getContext("2d")
//	tlctx.mozImageSmoothingEnabled = false;
//	tlctx.msImageSmoothingEnabled = false;
//	tlctx.imageSmoothingEnabled = false;
//	tlctx.drawImage(
//		tlImgID,
//		chipInfo.sxZoom[timeLapseIndex],
//		chipInfo.syZoom[timeLapseIndex],
//		chipInfo.sWidthZoom[timeLapseIndex],
//		chipInfo.sWidthZoom[timeLapseIndex],
//		0,0,235,235
//	);
//	tlctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
//	tlctx.lineWidth=1;
//	tlctx.lineCap = 'square';
//	tlctx.strokeRect(117.5-(chipDisplayProps.boxZoom/2), 117.5-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
//	$("#tlDate").text(data.Values[timeLapseIndex].Year);
//
//}
