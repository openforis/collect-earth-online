<#include "header.ftl">

<script type="text/javascript" src="js/dashboard.js"></script>

<div id="dashboard" ng-app="dashboard" ng-controller="DashboardController as dashboard" ng-init="dashboard.initialize()">
    <input id="quit-button" class="button" type="button" name="dashboard-quit" value="Quit" onclick="window.location='select-project'">
    <div id="image-analysis-pane"></div>
    <div id="sidebar">
        <div id="sidebar-contents">
            <fieldset>
                <legend>1. Select Project</legend>
                <select id="project-id" name="project-id" size="1" ng-model="dashboard.currentProjectId" ng-change="dashboard.switchProject()">
                    <option ng-repeat="project in dashboard.projectList" value="{{ project.id }}">{{ project.name }}</option>
                </select>
                <input id="new-plot-button" class="button" type="button" name="new-plot" value="2. Analyze New Plot" ng-click="dashboard.loadRandomPlot()">
            </fieldset>
            <fieldset>
                <legend>3. Assign Values</legend>
                <ul>
                    <li ng-repeat="sample in dashboard.currentProject.sample_values">
                        <input type="button" id="{{ sample.id }}" name="{{ sample.name + '_' + sample.id }}" value="{{ sample.name }}"
                               style="border-left:1.5rem solid {{ sample.color }}" ng-click="dashboard.setCurrentValue(sample)">
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
                                           ng-click="dashboard.saveValues()" style="opacity:0.5" disabled>
                                </td>
                            </tr>
                            <tr>
                                <td> </td>
                                <td>or</td>
                                <td>
                                    <input id="flag-plot-button" class="button" type="button" name="flag-plot" value="Flag Plot as Bad"
                                           ng-click="dashboard.flagPlot()" style="opacity:0.5" disabled>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </fieldset>
        </div>
    </div>
    <div id="imagery-info"><p>{{ dashboard.currentProject.attribution }}</p></div>
    <input id="user-id" type="hidden" name="user-id" value=${username}>
    <input id="initial-project-id" type="hidden" name="initial-project-id" value=${project_id}>
</div>
<#include "footer.ftl">
