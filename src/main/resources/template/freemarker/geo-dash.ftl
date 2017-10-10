<#include "header.ftl">
<#include "start-content.ftl">

<#if role?? && editable == "true">
<script type="text/javascript" src="${root}/js/geo-dash-admin.js"></script>
<div id="geodash" ng-app="geodashadmin" ng-controller="GeodashAdminController as geodash" ng-init="geodash.initialize('${root}')">
<#else>
<script type="text/javascript" src="${root}/js/geo-dash.js"></script>
<div id="geodash" ng-app="geodash" ng-controller="GeodashController as geodash" ng-init="geodash.initialize('${root}')">
</#if>
    <div id="fulldiv" class="full">
        <div id="fullholder"></div>
    </div>
    <div class="container-fluid">
        <div class="row">
            <div id="dashHolder" class="col-sm-12 col-md-12 main">
                <div>
                    <input type="submit" id="btnNewWidget" value="New Widget" class="btn btn-primary" ng-click="geodash.createNewWidget()" style="display:none; float:right;">
                    <h1 class="page-header">GEO-DASH</h1>
                </div>
            </div>
        </div>
    </div>
    <#if role?? && editable == "true">
        <div id="dialog-form" title="Create new widget">
            <p class="validateTips">All form fields are required.</p>

            <form name="form" id="form">
                    <fieldset>
                        <select  name="mainType" class="form-control" id="mainType" ng-model="geodash.mainwidgetTypeSelected" ng-change="geodash.updatemainwidgetType(geodash.mainwidgetTypeSelected)"
                             data-ng-options="mainWidgetType as mainWidgetType.name for mainWidgetType in geodash.mainWidgetTypes" >
                        </select>
                        <div id="cookedWidget" ng-show="geodash.cooked">
                            <div id="cookedNDVIImage" ng-show="geodash.cookedImage">
                                <div class="form-group">
                                    <label for="cookedImageTitle">Title</label>
                                    <input type="text" name="cookedImageTitle" id="cookedImageTitle" value="" class="form-control">
                                </div>
                                 <label>Select Image Date Range you would like</label>
                                 <div class="input-group input-daterange" id="range_new_cooked">

                                    <input type="text" class="form-control" value="" id="sDate_new_cooked">
                                    <div class="input-group-addon">to</div>
                                    <input type="text" class="form-control" value="" id="eDate_new_cooked">
                                </div>
                                <div class="form-group">
                                    <label for="cookedImageColumns">Columns</label>
                                    <input type="text" name="cookedImageColumns" id="cookedImageColumns" value="" class="form-control">
                                </div>
                            </div>
                            <div id="cookedNDVIGraph" ng-show="geodash.cookedGraph">

                                <div class="form-group">
                                    <label for="cookedGraphTitle">Title</label>
                                    <input type="text" name="cookedGraphTitle" id="cookedGraphTitle" value="" class="form-control">
                                </div>
                                 <label>Select Graph Date Range you would like</label>
                                 <div class="input-group input-daterange" id="range_new_cooked_graph">

                                    <input type="text" class="form-control" value="" id="sDate_new_cooked_graph">
                                    <div class="input-group-addon">to</div>
                                    <input type="text" class="form-control" value="" id="eDate_new_cooked_graph">
                                </div>
                                <div class="form-group">
                                    <label for="cookedGraphColumns">Columns</label>
                                    <input type="text" name="cookedGraphColumns" id="cookedGraphColumns" value="" class="form-control">
                                </div>

                            </div>
                            <div id="statsform" ng-show="geodash.cookedStats">
                                <div class="form-group">
                                    <label for="stattitle">Title</label>
                                    <input type="text" name="stattitle" id="stattitle" value="" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label for="statcolumns">Columns</label>
                                    <input type="text" name="statcolumns" id="statcolumns" value="" class="form-control">
                                </div>
                            </div>
                        </div>
                        <div id="customBuildWidget" ng-hide="geodash.cooked">
                            <div class="form-group">
                                <label for="widgetType">Type</label>
                                <select name="widgetType" class="form-control" id="widgetType">
                                    <option value="addImageCollection">Image Collection</option>
                                    <option value="timeSeriesGraph">Time Series Graph</option>

                                </select>
                            </div>
                            <div id="mainform">
                                <div class="form-group">
                                    <label for="title">Title</label>
                                    <input type="text" name="title" id="title" value="" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label for="collection">Image Collection</label>
                                    <input type="text" name="collection" id="iCollection" value="" class="form-control">
                                </div>
                                <div class="form-group">
                                    <div class="input-group input-daterange" id="range_new">
                                        <input type="text" class="form-control" value="" id="sDate_new">
                                        <div class="input-group-addon">to</div>
                                        <input type="text" class="form-control" value="" id="eDate_new">
                                    </div>
                                    <div class="form-group">
                                        <label for="bands">Bands:(optional)</label>
                                        <input type="text" name="bands" id="bands" value="" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label for="columns">Columns</label>
                                        <input type="text" name="columns" id="columns" value="" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <!-- Allow form submission with keyboard without duplicating the dialog button -->
                                        <input type="submit" tabindex="-1" style="position: absolute; top: -1000px" class="btn btn-primary">
                                    </div>
                                </div>
                            </div>

                        </div>
                    </fieldset>
                </form>
        </div>
    </#if>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
