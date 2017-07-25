<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/javascript" src="${root}/js/collection.js"></script>

<div id="collection" ng-app="collection" ng-controller="CollectionController as collection"
     ng-init="collection.initialize('${root}', '${userid!""}')">
    <input id="quit-button" class="button" type="button" name="collection-quit" value="Quit" onclick="window.location='${root}/home'">
    <div id="image-analysis-pane"></div>
    <div id="sidebar">
        <fieldset>
            <legend>1. Select Project</legend>
            <select id="project-id" name="project-id" size="1" ng-model="collection.currentProjectId" ng-change="collection.switchProject()">
                <option ng-repeat="project in collection.projectList" value="{{ project.id }}">{{ project.name }}</option>
            </select>
            <input id="new-plot-button" class="button" type="button" name="new-plot" value="2. Analyze New Plot" ng-click="collection.loadRandomPlot()">
        </fieldset>
        <fieldset>
            <legend>3. Assign Values</legend>
            <ul>
                <li ng-repeat="sample in collection.currentProject.sampleValues">
                    <input type="button" id="{{ sample.id }}" name="{{ sample.name + '_' + sample.id }}" value="{{ sample.name }}"
                           style="border-left:1.5rem solid {{ sample.color }}" ng-click="collection.setCurrentValue(sample)">
                </li>
            </ul>
            <div id="final-plot-options">
                <table>
                    <tbody>
                        <tr>
                            <td>4.</td>
                            <td>Either</td>
                            <td>
                                <input id="save-values-button" class="button" type="button" name="save-values" value="Save Assignments"
                                       ng-click="collection.saveValues()" style="opacity:0.5" disabled>
                            </td>
                        </tr>
                        <tr>
                            <td> </td>
                            <td>or</td>
                            <td>
                                <input id="flag-plot-button" class="button" type="button" name="flag-plot" value="Flag Plot as Bad"
                                       ng-click="collection.flagPlot()" style="opacity:0.5" disabled>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </fieldset>
    </div>
    <div id="imagery-info"><p>{{ collection.currentProject.attribution }}</p></div>
    <input id="user-id" type="hidden" name="user-id" value=${username!"guest"}>
    <input id="initial-project-id" type="hidden" name="initial-project-id" value=${project_id!"-1"}>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
