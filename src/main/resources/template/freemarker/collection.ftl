<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/javascript" src="${root}/js/collection.js"></script>

<div id="collection" ng-app="collection" ng-controller="CollectionController as collection"
     ng-init="collection.initialize('${root}', '${userid!""}', '${username!"guest"}', '${project_id}')">
    <input id="quit-button" class="button" type="button" name="collection-quit" value="Quit" ng-class="collection.quitclass" onclick="window.location='${root}/home'">
    <div id="image-analysis-pane" ng-class="collection.mapclass">
        <div class="buttonHolder">
            <div ng-hide="collection.showSideBar">
                <span id="action-button" name="collection-actioncall" title="Click a plot to analyze:" alt="Click a plot to analyze">Click a plot to analyze, or:<p></p><br> <span class="button" ng-click="collection.nextPlot()">Analyze random plot</span>
                <br style="clear:both;"><br style="clear:both;"></span>
            </div>
            <div ng-show="collection.showSideBar" style="position:relative;">
            <span id="action-button" name="collection-actioncall" title="Select each plot to choose value" alt="Select each plot to choose value">Select each dot to choose value</span>
            </div>
        </div>
    </div>
    <div id="sidebar" ng-show="collection.showSideBar">
        <div id="showarrow" ng-click="collection.toggleStats()">
            <div ng-class="collection.arrowstate"></div>
            <div></div>
            <div></div>
        </div>
        <div id="spacer"></div>
        <fieldset id="projStats" ng-class="collection.statClass">
            <legend>Project Stats</legend>
            <table>
                <tbody>
                    <tr>
                        <td>Project</td>
                        <td>{{ collection.currentProject.name }}</td>
                    </tr>
                    <tr>
                        <td>Plots Assigned</td>
                        <td>{{ collection.analyzedPlots }} ({{ (100 * collection.analyzedPlots / collection.currentProject.numPlots)| number:0 }}%)</td>
                    </tr>
                    <tr>
                        <td>Plots Flagged</td>
                        <td>{{ collection.flaggedPlots }} ({{ (100 * collection.flaggedPlots / collection.currentProject.numPlots)| number:0 }}%)</td>
                    </tr>
                    <tr>
                        <td>Plots Completed</td>
                        <td>{{ collection.analyzedPlots + collection.flaggedPlots }} ({{ (100 * (collection.analyzedPlots + collection.flaggedPlots) / collection.currentProject.numPlots)| number:0 }}%)</td>
                    </tr>
                    <tr>
                        <td>Plots Total</td>
                        <td>{{ collection.currentProject.numPlots }}</td>
                    </tr>
                </tbody>
            </table>
        </fieldset>
        <fieldset>
            <legend>Plot Navigation</legend>
            <input id="new-plot-button" class="button" type="button" name="new-plot" value="Skip" ng-click="collection.nextPlot()">
            <input id="save-values-button" class="button" type="button" name="save-values" value="Save" ng-click="collection.saveValues()"
                   style="opacity:0.5" disabled>
            <input id="flag-plot-button" class="button" type="button" name="flag-plot" value="Flag Plot as Bad" ng-click="collection.flagPlot()"
                   style="opacity:0.5" disabled>
        </fieldset>
        <fieldset>
            <legend>Imagery Options</legend>
            <select id="base-map-source" name="base-map-source" size="1" ng-model="collection.currentProject.baseMapSource" ng-change="collection.setBaseMapSource()">
                <option ng-repeat="imagery in collection.imageryList" value="{{ imagery.title }}">{{ imagery.title }}</option>
            </select>
        </fieldset>
        <fieldset ng-repeat="sampleValueGroup in collection.currentProject.sampleValues">
            <legend>Sample Value: {{ sampleValueGroup.name }}</legend>
            <ul>
                <li ng-repeat="sampleValue in sampleValueGroup.values">
                    <input type="button" id="{{ sampleValue.name + '_' + sampleValue.id }}" name="{{ sampleValue.name + '_' + sampleValue.id }}"
                           value="{{ sampleValue.name }}" style="border-left:1.5rem solid {{ sampleValue.color }}"
                           ng-click="collection.setCurrentValue(sampleValueGroup, sampleValue)">
                </li>
            </ul>
        </fieldset>
    </div>
    <div id="imagery-info"><p>{{ collection.currentProject.attribution }}</p></div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
