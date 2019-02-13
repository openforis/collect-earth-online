<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<script type="text/javascript" src="${root}/js/card-test.js"></script>
<div id="card-test" ng-app="cardTest" ng-controller="CardTestController as cardTest" ng-init="cardTest.initialize('${root}')">
    <h1>Collect Survey Card Test</h1>
    <p>Enter the Project ID, Record ID, and Sample IDs for the survey you wish to load from Collect:</p>
    <label>Project ID</label>
    <input type="number" id="project-id" name="project-id" placeholder="e.g. 1" autocomplete="off" min="0" step="1" ng-model="cardTest.projectId">
    <label>Record ID</label>
    <input type="number" id="record-id" name="record-id" placeholder="e.g. 5" autocomplete="off" min="0" step="1" ng-model="cardTest.recordId">
    <label>Sample IDs</label>
    <input type="text" id="sample-ids" name="sample-ids" placeholder="e.g. [1]" autocomplete="off" ng-model="cardTest.sampleIds">
    <br>
    <input type="button" class="button" value="Load Plot Survey" ng-click="cardTest.loadPlotSurvey()">
    <input type="button" class="button" value="Load Subplot Survey" ng-click="cardTest.loadSubplotSurvey()">
    <input type="button" class="button" value="Call Collect Forms" ng-click="cardTest.callCollectForms()">
    <div id="collect-survey" ng-bind-html="cardTest.surveyForm"></div>
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
