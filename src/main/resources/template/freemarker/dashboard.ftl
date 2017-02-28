<#include "header.ftl">

<script type="text/javascript" src="/js/dashboard.js"></script>

<div ng-controller="ctlDashboard"  ng-attr-id="{{ formID }}">
    <input class="button" id="quit-button" name="dashboard-quit" onclick="window.location='/select-project'" value="Quit" type="button">
    <div id="image-analysis-pane"></div>
    <div id="sidebar">
        <div id="sidebar-contents">
            <fieldset>
                <div>{{ test }}</div> 
		<legend>1. Select Project</legend>
                <select name="project-id" size="1" id="project-id" ng-change="update()" ng-model="selProj"> 
		    <option ng-repeat="project in projects" value="{{ project.id }}">{{ project.name }}</option>
                </select>
		
		<!--
		<select name="project-id" size="1" id="project-id" ng-change="update()" ng-model="selProj" ng-options="project.name for option in projects track by project.id">
                </select>
		-->
		<input name="new-plot" value="2. Analyze New Plot" id="new-plot-button" class="button" type="button">
            </fieldset>
            <fieldset>
                <legend>3. Assign Values</legend>
                <ul>
                    <li>
                        <input name="Forest_1" value="Forest" style="border-left: 1.5rem solid rgb(30, 198, 27);" type="button">
                    </li>
                    <li>
                        <input name="Grassland_2" value="Grassland" style="border-left: 1.5rem solid rgb(156, 241, 53);" type="button">
                    </li>
                    <li>
                        <input name="Bare Surface_3" value="Bare Surface" style="border-left: 1.5rem solid rgb(213, 222, 133);" type="button">
                    </li>
                    <li>
                        <input name="Impervious Surface_4" value="Impervious Surface" style="border-left: 1.5rem solid rgb(139, 144, 132);" type="button">
                    </li>
                    <li>
                        <input name="Agriculture_5" value="Agriculture" style="border-left: 1.5rem solid rgb(242, 198, 19);" type="button">
                    </li>
                    <li>
                        <input name="Urban_6" value="Urban" style="border-left: 1.5rem solid rgb(106, 58, 117);" type="button">
                    </li>
                    <li>
                        <input name="Water_7" value="Water" style="border-left: 1.5rem solid rgb(47, 77, 192);" type="button">
                    </li>
                    <li>
                        <input name="Cloud_8" value="Cloud" style="border-left: 1.5rem solid rgb(255, 255, 255);" type="button">
                    </li>
                    <li>
                        <input name="Unknown_9" value="Unknown" style="border-left: 1.5rem solid rgb(0, 0, 0);" type="button">
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
<!--
    <div id="imagery-info">
        <p>DigitalGlobe Maps API: Recent Imagery+Streets | June 2015 |
        © DigitalGlobe, Inc</p>
    </div>
-->
    <input id="user-id" name="user-id" value=${user_id} type="hidden">
    <input id="initial-project-id" name="initial-project-id" value=${project_id} type="hidden">
</div>
<#include "footer.ftl">
