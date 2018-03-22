<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<script type="text/javascript" src="${root}/js/card-test.js"></script>
<div id="card-test" ng-app="cardTest" ng-controller="CardTestController as cardTest" ng-init="cardTest.initialize('${root}')">
    <h1>Collect Project Card Test</h1>
    <p>Enter the Project ID for the project you wish to load from Collect:</p>
    <input type="number" id="project-id" name="project-id" placeholder="Project ID" autocomplete="off" min="0" step="1" ng-model="cardTest.projectId">
    <input type="button" class="button" value="Load Project" ng-click="cardTest.loadCollectCardsByProjectId()">
    <div id="collect-survey"></div>
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
