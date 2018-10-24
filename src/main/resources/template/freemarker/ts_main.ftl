<!DOCTYPE html>
<html lan="en">
<head>
    <title>TimeSync</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Cache-control" content="no-cache">
    <meta http-equiv="X-UA-Compatible" content="IE=edge"> <!--needed so that D3 will work in IE!-->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
    <link rel="stylesheet" type="text/css" href="${root}/css/timesync_style.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min.js" charset="utf-8"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.imagesloaded/3.2.0/imagesloaded.pkgd.min.js"></script>
    <script type="text/javascript" src="${root}/js/jquery.mousewheel.min.js"></script>
    <script type="text/javascript" src="${root}/js/ts_specIndexStretch.js"></script>

    <script>
        var userID = 1; //${userid};
        var authHeader = "authHeader";
    </script>
</head>
<body>
<div id="topSection">
    <p id="title" style="display:inline-block;">TimeSync - v3.0</p>
    <p style="display:inline-block;">Project:</p>
    <div class="dropdown" style="display:inline-block; margin-right:15px;">
        <button id="projBtn" class="btn btn-default btn-xs dropdown-toggle" type="button" data-toggle="dropdown" style="font-size:11px; margin-bottom:2px; height:21.7167px; width:100px; text-align: left;">
            <span class="caret projBtn"></span>
        </button>
        <ul id="projectList" class="dropdown-menu">
        </ul>
    </div>
    <p style="display:inline-block;">Packet:</p>
    <div class="dropdown" style="display:inline-block; margin-right:15px;">
        <button id="packetBtn" class="btn btn-default btn-xs dropdown-toggle" type="button" data-toggle="dropdown" style="font-size:11px; margin-bottom:2px; height:21.7167px; width:100px; text-align: left;">
            <span class="caret projBtn"></span>
        </button>
        <ul id="packetList" class="dropdown-menu">
        </ul>
    </div>
    <div id="chipOptionHolder">
        <div class="chipOptions" id="chipSizeDiv">
            <p style="display:inline-block;">Chip Size:</p>
            <input id="chipSize" autocomplete="off" type="number" name="chipSize" min="135" max="255" step="10" value="195">
        </div>
        <div class="chipOptions" id="plotSizeDiv" style="display:none;">
            <p style="display:inline-block;">Plot Size:</p>
            <input id="plotSize" autocomplete="off" type="number" name="plotSize" min="1" max="5" step="2" value="1">
        </div>
        <div class="chipOptions">
            <p style="display:inline-block;">Zoom: </p>
            <span class="glyphicon glyphicon-minus"></span>
            <input id="zoomSize" autocomplete="off" type="range" name="zoomSize" min="0" max="40" value="20">
            <span class="glyphicon glyphicon-plus"></span>
        </div>
        <div class="chipOptions colorOptions" style="display:none;">
            <input id="selectedColor" autocomplete="off" type="color" name="selectedColor" value="#ED2939">
            <p style="display:inline-block;">Selected</p>
        </div>
        <div class="chipOptions colorOptions" style="display:none;">
            <input id="highlightColor" autocomplete="off" type="color" name="highlightColor" value="#32CD32">
            <p style="display:inline-block;">Highlight</p>
        </div>
        <div class="chipOptions colorOptions" style="display:none;">
            <input id="plotColor" autocomplete="off" type="color" name="plotColor" value="#FFFFFF">    <!--#ED2939-->
            <p style="display:inline-block;">Plot</p>
        </div>
    </div>

    <div class="dropdown" style="display:inline-block; margin-right:15px;">
        <button id="helpBtn" class="btn btn-default btn-xs dropdown-toggle" type="button" data-toggle="dropdown" style="font-size:11px; margin-bottom:2px; height:21.7167px; text-align: left;"> <!--; width:50px-->
            Help
        </button>
        <ul id="helpList" class="dropdown-menu">
            <!--
            <li><a style="padding:0px;" target='_blank' href="TimeSync-How-To-Guide-V1.0.0.pdf">How-To Guide</a></li>
            <li><a style="padding:0px;" target='_blank' href="Response-Design-Classes_v.3.0.1.pdf">Response Design</a></li>
            -->
            <li id="doyCalLi">Calendar</li>
            <li id="toolTips">Tool Tips<span id="toolTipsCheck" class="glyphicon glyphicon-none" style="margin-left:4px"></span></li>
        </ul>
    </div>
    <button id="exportBtn" class="btn btn-default btn-xs dropdown-toggle" type="button" data-toggle="dropdown" style="font-size:11px; margin-bottom:2px; height:21.7167px; text-align: left;">
        Export Data
    </button>
    <div style="display:inline-block">
        <label class="switch switch-left-right">
            <input id="examplePlots" class="switch-input" type="checkbox" autocomplete="off"/>
            Example Plots
        </label>
    </div>

    <div style="display:inline-block">
        <label class="switch switch-left-right">
            <input id="showAnomaly" class="switch-input" type="checkbox" checked autocomplete="off"/>
            Clear Pixels only
        </label>
    </div>

    <div style="display:inline-block">
        <label class="switch switch-left-right">
            <button>
                Sync with Collect Earth Online
            </button>
        </label>
    </div>

</div>

<div id="containerDiv">
    <div id="plotSelectionDiv" class="sectionDiv">
        <p class="header">Plots</p>
        <ul id="plotList"> <!-- the <li>'s will be filled in on-the-fly -->
        </ul>
    </div>
    <div id="plot" class="sectionDiv">
        <p class="header">Spectral Trajectory</p>
        <svg id="svg" width="740" height="250"></svg>
        <div class="btn-group" role="group" aria-label="..." style="margin:-1px; display: inline-block;">
            <div class="btn-group specPlotDrop" role="group">
                <button id="btnIndex" class="btn btn-default dropdown-toggle specPlotBtn" type="button"  style="border-top-left-radius:0px">
                    <div><strong>Index/Band</strong>:<br><small>TC Wetness</small><span class="caret specPlot"></span></div>
                </button>
                <ul class="dropdown-menu specPlot indexList" id="indexList">
                    <li id="B1">Blue</li>
                    <li id="B2">Green</li>
                    <li id="B3">Red</li>
                    <li id="B4">NIR</li>
                    <li id="B5">SWIR1</li>
                    <li id="B7">SWIR2</li>
                    <li id="TCB">TC Brightness</li>
                    <li id="TCG">TC Greenness</li>
                    <li class="active" href="#" id="TCW">TC Wetness</li>
                    <li id="TCA">TC Angle</li>
                    <li id="NDVI">NDVI</li>
                    <li id="NBR">NBR</li>
                </ul>
            </div>
            <div class="btn-group specPlotDrop" role="group">
                <button id="btnChipSet" class="btn btn-default dropdown-toggle specPlotBtn" type="button">
                    <div><strong>Chip Set</strong>:<br><small>SWIR2,NIR,Red</small><span class="caret specPlot"></span></div>
                </button>
                <ul class="dropdown-menu specPlot chipSetList" id="chipSetList">
                    <li id="chipSetBGW">TM TC</li>
                    <li class="active" id="chipSet743">SWIR2,NIR,Red</li>
                    <li id="chipSet432">NIR,Red,Green</li>
                </ul>
            </div>
            <div id="btnRed" class="btn-group specPlotDrop" role="group" style="display:none">
                <button class="btn btn-default dropdown-toggle specPlotBtn" type="button">
                    <div><strong>R</strong><small>GB</small>:<br><small>TC Brightness</small><span class="caret specPlot"></span></div>
                </button>
                <ul class="dropdown-menu specPlot rgb" id="redList">
                    <li href="#" id="B1">Band 1</li>
                    <li href="#" id="B2">Band 2</li>
                    <li href="#" id="B3">Band 3</li>
                    <li href="#" id="B4">Band 4</li>
                    <li href="#" id="B5">Band 5</li>
                    <li href="#" id="B7">Band 7</li>
                    <li class="active" href="#" id="TCB">TC Brightness</li>
                    <li href="#" id="TCG">TC Greenness</li>
                    <li href="#" id="TCW">TC Wetness</li>
                    <li href="#" id="TCA">TC Angle</li>
                    <li href="#" id="NDVI">NDVI</li>
                    <li href="#" id="NBR">NBR</li>
                </ul>
            </div>
            <div class="btn-group specPlotDrop" role="group" style="display:none">
                <button id="btnGreen" class="btn btn-default dropdown-toggle specPlotBtn" type="button">
                    <div><small>R</small><strong>G</strong><small>B</small>:<br><small>TC Greenness</small><span class="caret specPlot"></span></div>
                </button>
                <ul class="dropdown-menu specPlot rgb" id="greenList">
                    <li href="#" id="B1">Band 1</li>
                    <li href="#" id="B2">Band 2</li>
                    <li href="#" id="B3">Band 3</li>
                    <li href="#" id="B4">Band 4</li>
                    <li href="#" id="B5">Band 5</li>
                    <li href="#" id="B7">Band 7</li>
                    <li href="#" id="TCB">TC Brightness</li>
                    <li class="active" href="#" id="TCG">TC Greenness</li>
                    <li href="#" id="TCW">TC Wetness</li>
                    <li href="#" id="TCA">TC Angle</li>
                    <li href="#" id="NDVI">NDVI</li>
                    <li href="#" id="NBR">NBR</li>
                </ul>
            </div>
            <div class="btn-group specPlotDrop" role="group" style="display:none">
                <button id="btnBlue" class="btn btn-default dropdown-toggle specPlotBtn" type="button">
                    <div><small>RG</small><strong>B</strong>:<br><small>TC Wetness</small><span class="caret specPlot"></span></div>
                </button>
                <ul class="dropdown-menu specPlot rgb" id="blueList">
                    <li href="#" id="B1">Band 1</li>
                    <li href="#" id="B2">Band 2</li>
                    <li href="#" id="B3">Band 3</li>
                    <li href="#" id="B4">Band 4</li>
                    <li href="#" id="B5">Band 5</li>
                    <li href="#" id="B7">Band 7</li>
                    <li href="#" id="TCB">TC Brightness</li>
                    <li href="#" id="TCG">TC Greenness</li>
                    <li class="active" href="#" id="TCW">TC Wetness</li>
                    <li href="#" id="TCA">TC Angle</li>
                    <li href="#" id="NDVI">NDVI</li>
                    <li href="#" id="NBR">NBR</li>
                </ul>
            </div>
            <div class="btn-group" role="group">
                <button id="btnLine" class="btn btn-default specPlotBtn" type="button">
                    <Strong>Show Line</strong><br><span id="lineDisplayThumb" class="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span>
                </button>
            </div>
            <div class="btn-group" role="group">
                <button id="btnPoints" class="btn btn-default specPlotBtn" type="button">
                    <Strong>Show All</strong><br><span id="allPointsDisplayThumb" class="glyphicon glyphicon-thumbs-down" aria-hidden="true"></span>
                </button>
            </div>
            <div class="btn-group" role="group">
                <button id="btnResetGlobal" class="btn btn-default specPlotBtn" type="button">
                    <Strong>Global Stretch</strong><br><span class="glyphicon glyphicon-refresh" aria-hidden="true"></span>
                </button>
            </div>
            <div class="btn-group" role="group">
                <button id="btnResetLocal" class="btn btn-default specPlotBtn" type="button" style="border-bottom-right-radius:0px">
                    <Strong>Local Stretch</strong><br><span class="glyphicon glyphicon-repeat" aria-hidden="true"></span>
                </button>
            </div>
        </div>
    </div>


    <div id="formsDiv" class="sectionDiv">
        <p class="header">Interpretation Forms</p>
        <ul class="test">
            <li id="segmentsFormTab" class="selected" style="border-top-left-radius:4px; text-align:center;">Segments
            <li id="verticesFormTab" class="unselected" style="margin-left:-1px; text-align:center;">Vertices
            <li id="CommentsFormTab" class="unselected" style="margin-left:-1px; border-top-right-radius:4px; text-align:center;">Comments
        </ul>

        <div id="segmentsFormDiv">
            <table id="segmentsFormTbl">
                <col width="19">
                <col width="38">
                <col width="38">
                <tr class="trHeader">
                    <th></th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Change Process</th>
                </tr>
            </table>
        </div>

        <div id="changeProcessDiv" class="dropThis">
            <p class="subHeader" style="margin-top:3px">Change Process:</p>
            <ul id="changeProcessList">
                <li id="fire">Fire</li>
                <li id="harvest">Harvest</li>
                <li id="acuteDecline">Structural Decline</li>
                <li id="conditionDecline">Spectral Decline</li>
                <li id="wind">Wind</li>
                <li id="hydro">Hydrology</li>
                <li id="debris">Debris</li>
                <li id="growth">Growth/Recovery</li>
                <li id="stable">Stable</li>
                <li id="mechanical">Mechanical</li>
                <li id="otherCP">Other</li>
            </ul>
            <p class="subHeader">Notes:</p>
            <ul id="CPnotesList" class="notesList">
                <li><input id="natural" class="natural forFire" type="checkbox" name="changeProcess" value="natural" autocomplete="off"> Natural</li>
                <li><input id="clearcut" class="clearcut forHarvest" type="checkbox" name="changeProcess" value="clearcut" autocomplete="off"> Clearcut</li>
                <li><input id="thinning" class="thinning forHarvest" type="checkbox" name="changeProcess" value="thinning" autocomplete="off"> Thinning</li>
                <li><input id="prescribed" class="prescribed forFire" type="checkbox" name="changeProcess" value="prescribed" autocomplete="off"> Prescribed</li>
                <li><input id="sitePrepFire" class="sitePrepFire forFire forHarvest" type="checkbox" name="changeProcess" value="sitePrepFire" autocomplete="off"> Site-prep fire</li>
                <li><input id="flooding" class="flooding forHydro" type="checkbox" name="changeProcess" value="flooding" autocomplete="off"> Flooding</li>
                <li><input id="reserviorLakeFlux" class="reserviorLakeFlux forHydro" type="checkbox" name="changeProcess" value="reserviorLakeFlux" autocomplete="off"> Reservoir/Lake flux</li>
                <li><input id="wetlandDrainage" class="wetlandDrainage forConserv" type="checkbox" name="changeProcess" value="wetlandDrainage" autocomplete="off"> Wetland drainage</li>
                <li><input id="airphotoOnly" class="airphotoOnly forFire forHarvest forDecline forAcuteDecline forConditionDecline forWind forHydro forDebris forGrowth forStable forMechanical forOther" type="checkbox" name="changeProcess" value="airphotoOnly" autocomplete="off"> Airphoto only</li>
            </ul>
        </div>

        <div id="verticesFormDiv">
            <table id="verticesFormTbl">
                <col width="19">
                <col width="38">
                <col width="140">
                <tr class="trHeader">
                    <th></th>
                    <th>Year</th>
                    <th>Land Use</th>
                    <th>Land Cover</th>
                </tr>
            </table>
        </div>

        <div id="lulc" class="dropThis">
            <table 	style="border:none;">
                <tr>
                    <td style="padding:0px 0px 0px 0px; border:none;">
                        <div id="landUseDiv" style="margin:4px 2px 0px 4px;" >  <!-- class="dropThis" -->
                            <!-- <div id="landUseSelection" class="formDropSelection" align="center"><span class="glyphicon glyphicon-triangle-bottom"></span></div> --> <!-- <div id="theSelection"></div> -->
                            <p class="subHeader">Land Use:</p> <!--<span id="luSecondIcon" class="glyphicon glyphicon-star" style="float:right;margin-right:6px;margin-top:2px;"> -->

                            <ul id="luLevelSwitchHolder" class="lulcLevelSwitchHolder">
                                <li id="LUprimaryTab" class="selected" style="border-top-left-radius:4px; text-align:center;">Primary
                                <li id="LUsecondaryTab" style="margin-left:-1px; border-top-right-radius:4px; text-align:center;">Secondary
                            </ul>

                            <!--<div id="luLevelSwitchHolder">
                                <div id="LUprimary" class="luLevelSwitch" style="background-color: blue;">Primary</div>
                                <div id="LUsecondary" class="luLevelSwitch" style="border-left:1px solid #afafaf; padding-left:4px; background-color: yellow;">Secondary</div>
                            </div>-->
                            <ul id="landUseList" class="LUlist">
                                <li id="forest" class="forest">Forest</li>
                                <li id="developed" class="developed">Developed</li>
                                <li id="ag" class="ag">Agriculture</li>
                                <li id="nonForWet" class="nonForWet">Non-forest Wetland</li>
                                <li id="rangeland" class="rangeland">Rangeland</li>
                                <li id="otherLU" class="otherLU">Other</li>
                            </ul>

                            <ul id="landUseListSec" class="LUlist" style="display:none">
                                <li id="forest" class="forest">Forest</li>
                                <li id="developed" class="developed">Developed</li>
                                <li id="ag" class="ag">Agriculture</li>
                                <li id="nonForWet" class="nonForWet">Non-forest Wetland</li>
                                <li id="rangeland" class="rangeland">Rangeland</li>
                                <li id="otherLU" class="otherLU">Other</li>
                            </ul>

                            <p class="subHeader">Notes:</p>
                            <ul id="LUnotesList" class="notesList">
                                <li><input id="wetland" class="wetland forForest" type="checkbox" name="landUse" value="wetland" autocomplete="off"> Wetland</li>
                                <li><input id="mining" class="mining forDeveloped" type="checkbox" name="landUse" value="mining" autocomplete="off"> Mining</li>
                                <li><input id="rowCrop" class="rowCrop forAg" class="rowCrop forAg" type="checkbox" name="landUse" value="rowCrop" autocomplete="off"> Row crop</li>
                                <li><input id="orchardTreeFarm" class="orchardTreeFarm forAg" type="checkbox" name="landUse" value="orchardTreeFarm" autocomplete="off"> Orchard/Tree farm/Vineyard</li>
                                <!--<li><input id="vineyardsOtherWoody" class="vineyardsOtherWoody forAg" type="checkbox" name="landUse" value="vineyardsOtherWoody" autocomplete="off"> Vineyard/Other woody</li>-->
                            </ul>

                            <ul id="LUnotesListSec" class="notesList" style="display:none">
                                <li><input id="wetland" class="wetland forForest" type="checkbox" name="landUse" value="wetland" autocomplete="off"> Wetland</li>
                                <li><input id="mining" class="mining forDeveloped" type="checkbox" name="landUse" value="mining" autocomplete="off"> Mining</li>
                                <li><input id="rowCrop" class="rowCrop forAg" class="rowCrop forAg" type="checkbox" name="landUse" value="rowCrop" autocomplete="off"> Row crop</li>
                                <li><input id="orchardTreeFarm" class="orchardTreeFarm forAg" type="checkbox" name="landUse" value="orchardTreeFarm" autocomplete="off"> Orchard/Tree farm/Vineyard</li>
                                <!--<li><input id="vineyardsOtherWoody" class="vineyardsOtherWoody forAg" type="checkbox" name="landUse" value="vineyardsOtherWoody" autocomplete="off"> Vineyard/Other woody</li>-->
                            </ul>
                        </div>
                    </td>
                    <td style="padding:0px 0px 0px 0px; border:none;">
                        <div id="landCoverDiv" style="margin:4px 4px 0px 3px"> <!-- class="dropThis" -->
                            <!-- <div id="landCoverSelection" class="formDropSelection" align="center"><span class="glyphicon glyphicon-triangle-bottom"></span></div> --> <!-- <div id="theSelection"></div> -->
                            <p class="subHeader">Land Cover:</p> <!-- style="margin-bottom:24px;"-->
                            <ul id="lcLevelSwitchHolder" class="lulcLevelSwitchHolder">
                                <li id="LCprimaryTab" class="selected" style="border-top-left-radius:4px; border-top-right-radius:4px; text-align:center;">Primary
                            </ul>


                            <ul id="landCoverList">
                                <li id="treesLC">Trees</li>
                                <li id="shrubsLC">Shrubs</li>
                                <li id="gfhLC">Grass/forb/herb</li>
                                <li id="imperviousLC">Impervious</li>
                                <li id="natBarLC">Barren</li>
                                <li id="snowIceLC">Snow/ice</li>
                                <li id="waterLC">Water</li>
                            </ul>
                            <p class="subHeader">Other:</p>
                            <ul id="LCnotesList" class="notesList">
                                <li class="trees"><input id="trees" type="checkbox" name="landCover" value="trees" autocomplete="off"> Trees</li>
                                <li class="shrubs"><input id="shrubs" type="checkbox" name="landCover" value="shrubs" autocomplete="off"> Shrubs</li>
                                <li class="grassForbHerb"><input id="grassForbHerb" type="checkbox" name="landCover" value="grassForbHerb" autocomplete="off"> Grass/forb/herb</li>
                                <li class="impervious"><input id="impervious" type="checkbox" name="landCover" value="impervious" autocomplete="off"> Impervious</li>
                                <li class="naturalBarren"><input id="naturalBarren" type="checkbox" name="landCover" value="naturalBarren" autocomplete="off"> Barren</li>
                                <li class="snowIce"><input id="snowIce" type="checkbox" name="landCover" value="snowIce" autocomplete="off"> Snow/ice</li>
                                <li class="water"><input id="water" type="checkbox" name="landCover" value="water" autocomplete="off"> Water</li>
                            </ul>
                            <!-- <div id="landCoverDoneBtn" class="doneBtn">Done</div> -->
                        </div>
                    </td>
                <tr>
            </table>
            <!-- <div id="luLcDoneBtn" class="doneBtn">Done</div> -->
        </div>

        <div id="CommentsFormDiv">
            <div id="commentInputDiv">
                <textarea id="commentInput" autocomplete="off"></textarea>
            </div>
            <div id="exampleCheckBox">
                <input type="checkbox" id="isExampleCheckbox" value="True" autocomplete="off"> Example
            </div>
        </div>
    </div>
</div>

<div id="chipGallerySection">
    <div>
        <p class="header" style="display:inline-block">Image Chip Selection</p>
        <!--<span id="expandChipGallery" class="glyphicon glyphicon-new-window right-align" style="float:right; margin:3px; cursor:pointer"></span>-->
        <span id="targetDOY" class="header"></span>
        <!--
        <p id="targetDOY" class="header" style="float:right; padding-right:3px"></p> <!-- display:inline-block;  margin-right:3px -->
    </div>
    <div id="chip-gallery"></div>
</div>
<div id="img-gallery"></div>

<div id="contextMenu" style="display:none; position:absolute">
    <p class="subHeader">Copy options:</p>
    <ul id="contextMenuList">
        <li id="copyPrev">Copy from previous</li>
        <li id="fillDown">Copy to all following</li>
        <li id="fillCancel">Cancel</li>
    </ul>
</div>

<script type="text/javascript" src="${root}/js/ts_scripts.js"></script>
<script type="text/javascript" src="${root}/js/ts_tooltips.js"></script>
</body>
</html>