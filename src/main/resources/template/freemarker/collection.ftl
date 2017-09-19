<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/javascript" src="${root}/js/collection.js"></script>

<div id="collection" ng-app="collection" ng-controller="CollectionController as collection"
     ng-init="collection.initialize('${root}', '${userid!""}', '${username!"guest"}', '${project_id}')">
    <input id="quit-button" class="button" type="button" name="collection-quit" value="Quit" onclick="window.location='${root}/home'">
    <div id="image-analysis-pane"></div>
    <div id="sidebar">
        <fieldset>
            <legend>Project Stats</legend>
            <table>
                <tbody>
                    <tr>
                        <td>Project</td>
                        <td>{{ collection.currentProject.name }}</td>
                    </tr>
                    <tr>
                        <td>Plots Assigned</td>
                        <td>{{ collection.plotsAssigned }} ({{ (100 * collection.plotsAssigned / collection.currentProject.numPlots)| number:0 }}%)</td>
                    </tr>
                    <tr>
                        <td>Plots Flagged</td>
                        <td>{{ collection.plotsFlagged }} ({{ (100 * collection.plotsFlagged / collection.currentProject.numPlots)| number:0 }}%)</td>
                    </tr>
                    <tr>
                        <td>Plots Completed</td>
                        <td>{{ collection.plotsAssigned + collection.plotsFlagged }} ({{ (100 * (collection.plotsAssigned + collection.plotsFlagged) / collection.currentProject.numPlots)| number:0 }}%)</td>
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
            <input id="new-plot-button" class="button" type="button" name="new-plot" value="Next Plot" ng-click="collection.nextPlot()">
            <input id="save-values-button" class="button" type="button" name="save-values" value="Save Assignments" ng-click="collection.saveValues()"
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
                           ng-click="collection.setCurrentValue(sampleValueGroup.name, sampleValue)">
                </li>
            </ul>
        </fieldset>
    </div>
    <div id="imagery-info"><p>{{ collection.currentProject.attribution }}</p></div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
