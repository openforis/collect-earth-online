<#include "header.ftl">

<script type="text/javascript" src="/js/dashboard.js"></script>

<div ng-controller="ctlDashboard"  ng-attr-id="{{ formID }}">
    <input class="button" id="quit-button" name="dashboard-quit" onclick="window.location='/select-project'" value="Quit" type="button">
    <div id="image-analysis-pane"></div>
    <div id="sidebar">
        <div id="sidebar-contents">
            <fieldset>
                <legend>1. Select Project</legend>
		<div><p>{{ debugText }}</p></div>
                <select name="project-id" size="1" id="project-id" ng-model="selProj" ng-change="update()">
		    <option ng-repeat="project in projects" value="{{ project.id }}">{{ project.name }}</option>
                </select>
		

		<input name="new-plot" value="2. Analyze New Plot" id="new-plot-button" class="button" type="button">
            </fieldset>
            <fieldset>
                <legend>3. Assign Values</legend>
                <ul>
		    <li ng-repeat="sample in currentProject.sample_values">
			<input id="{{ sample.id }}" value="{{ sample.value }}" style="border-left:1.5rem solid {{ sample.color }}" type="button">
		    </li>
                </ul>
                <div id="final-plot-options">
                    <table>
                        <tbody>
                            <tr>
                                <td>4.</td>
                                <td>Either</td>
                                <td>
                                    <input name="save-values" value="Save Assignments" id="save-values-button" class="button" disabled="" style="opacity: 0.5;" type="button">
                                </td>
                            </tr>
                            <tr>
                                <td> </td>
                                <td>or</td>
                                <td>
                                    <input name="flag-plot" value="Flag Plot as Bad" id="flag-plot-button" class="button" disabled="" style="opacity: 0.5;" type="button">
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </fieldset>
        </div>
    </div>
    <div id="imagery-info" ng-model="imageryInfo"><p>{{ imageryInfoText }}</p></div>
    <input id="user-id" name="user-id" value=${user_id} type="hidden">
    <input id="initial-project-id" name="initial-project-id" value=${project_id} type="hidden">
</div>
<#include "footer.ftl">
