<#include "header.ftl">
<#include "start-content.ftl">
<#include "flash-messages.ftl">

<#if role?? && role == "admin">
<div id="geodash" ng-controller="GeodashAdminController as geodash" ng-init="geodash.initialize('${root}')">
<#else>
<div id="geodash" ng-controller="GeodashController as geodash" ng-init="geodash.initialize('${root}')">
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
    <#if role?? && role == "admin">
        <div id="dialog-form" title="Create new widget">
            <p class="validateTips">All form fields are required.</p>

            <form>
                <fieldset>
                    <div class="form-group">
                        <label for="widgetType">Type</label>
                        <select name="widgetType" class="form-control" id="widgetType">
                            <option value="addImageCollection">Image Collection</option>
                            <option value="timeSeriesGraph">Time Series Graph</option>
                            <option value="getStats">Statistics</option>
                        </select>
                    </div>
                    <div id="mainform">
                        <div class="form-group">
                            <label for="title">Title</label>
                            <input type="text" name="title" id="title" value="" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="collection">Image Collection</label>
                            <input type="text" name="collection" id="collection" value="" class="form-control">
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
                                <input type="submit" tabindex="-1" style="position:absolute; top:-1000px" class="btn btn-primary">
                            </div>
                        </div>
                    </div>
                    <div id="statsform" style="display:none;">
                        <div class="form-group">
                            <label for="stattitle">Title</label>
                            <input type="text" name="stattitle" id="stattitle" value="" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="statcolumns">Columns</label>
                            <input type="text" name="statcolumns" id="statcolumns" value="" class="form-control">
                        </div>
                    </div>

                </fieldset>
            </form>
        </div>
    </#if>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
