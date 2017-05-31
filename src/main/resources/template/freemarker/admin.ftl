<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#include "flash-messages.ftl">

<div id="admin" ng-controller="AdminController as admin" ng-init="admin.initialize()">
    <h1>Project Management</h1>
    <div id="create-project-form">
        <form id="project-management-form" method="post" action="admin">
            <div id="project-selection">
                <label>Currently Viewing:</label>
                <select id="project-selector" name="project-selector" size="1" ng-model="admin.currentProjectId" ng-change="admin.setCurrentProject()">
                    <option value="0">New Project</option>
                    <option ng-repeat="project in admin.projectList" value="{{ project.id }}">{{ project.name }}</option>
                </select>
            </div>
            <input id="download-plot-data" class="button" type="button" name="download-plot-data" value="Download Data"
                   ng-click="admin.exportCurrentPlotData()" style="visibility: {{ admin.currentProjectId == 0 ? 'hidden' : 'visible' }}">
            <input id="create-project" class="button" type="button" name="create-project" ng-click="admin.submitForm($event)"
                   value="{{ admin.currentProjectId == 0 ? 'Create and launch this project' : 'Delete this project' }}">
            <fieldset id="project-info">
                <legend>Project Info</legend>
                <label>Name</label>
                <input id="project-name" type="text" name="project-name" autocomplete="off" ng-model="admin.projectName">
                <label>Description</label>
                <textarea id="project-description" name="project-description" ng-model="admin.projectDescription"></textarea>
            </fieldset>
            <fieldset id="plot-info">
                <legend>Plot Info</legend>
                <label>Number of plots</label>
                <input id="plots" type="number" name="plots" autocomplete="off" min="0" step="1" ng-model="admin.numPlots">
                <label>Plot radius (m)</label>
                <input id="radius" type="number" name="buffer-radius" autocomplete="off" min="0.0" step="any" ng-model="admin.plotRadius">
            </fieldset>
            <fieldset id="sample-info">
                <legend>Sample Info</legend>
                <label>Sample type</label>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <input id="random-sample-type" type="radio" name="sample-type" value="random" ng-click="admin.setSampleType('random')" checked>
                            </td>
                            <td>
                                <label>Random</label>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input id="gridded-sample-type" type="radio" name="sample-type" value="gridded" ng-click="admin.setSampleType('gridded')">
                            </td>
                            <td>
                                <label>Gridded</label>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <label>Samples per plot</label>
                <input id="samples-per-plot" type="number" name="samples-per-plot" autocomplete="off" min="0" step="1" ng-model="admin.samplesPerPlot">
                <label>Sample resolution (m)</label>
                <input id="sample-resolution" type="number" name="sample-resolution" autocomplete="off" min="0.0" step="any" ng-model="admin.sampleResolution" disabled>
            </fieldset>
            <fieldset id="bounding-box">
                <legend>Define Bounding Box</legend>
                <label>Hold CTRL and click-and-drag a bounding box on the map</label>
                <input id="lat-max" type="number" name="boundary-lat-max" ng-model="admin.latMax" placeholder="North" autocomplete="off" min="-90.0" max="90.0" step="any">
                <input id="lon-min" type="number" name="boundary-lon-min" ng-model="admin.lonMin" placeholder="West" autocomplete="off" min="-180.0" max="180.0" step="any">
                <input id="lon-max" type="number" name="boundary-lon-max" ng-model="admin.lonMax" placeholder="East" autocomplete="off" min="-180.0" max="180.0" step="any">
                <input id="lat-min" type="number" name="boundary-lat-min" ng-model="admin.latMin" placeholder="South" autocomplete="off" min="-90.0" max="90.0" step="any">
            </fieldset>
            <div id="map-and-imagery">
                <div id="new-project-map"></div>
                <label>Basemap imagery: </label>
                <select id="imagery-selector" name="imagery-selector" size="1" ng-model="admin.currentImagery" ng-change="admin.setCurrentImagery()">
                    <option value="DigitalGlobeRecentImagery">DigitalGlobe: Recent Imagery</option>
                    <option value="DigitalGlobeRecentImagery+Streets">DigitalGlobe: Recent Imagery+Streets</option>
                    <option value="BingAerial">Bing Maps: Aerial</option>
                    <option value="BingAerialWithLabels">Bing Maps: Aerial with Labels</option>
                    <option value="NASASERVIRChipset2002">NASA SERVIR Chipset 2002</option>
                    <option value="DigitalGlobeWMSImagery">DigitalGlobe: WMS Imagery</option>
                </select>
            </div>
            <fieldset id="sample-value-info">
                <legend>Sample Values</legend>
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Name</th>
                            <th>Color</th>
                            <th>Reference Image</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr ng-repeat="sampleValue in admin.sampleValues">
                            <td>
                                <input class="button" type="button" value="-" ng-click="admin.removeSampleValueRow(sampleValue.name)"
                                       style="visibility: {{ admin.currentProjectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                            <td>
                                {{ sampleValue.name }}
                            </td>
                            <td>
                                <div class="circle" style="background-color: {{ sampleValue.color }}"></div>
                            </td>
                            <td>
                                {{ sampleValue.image }}
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input class="button" type="button" name="add-sample-value" value="+" ng-click="admin.addSampleValueRow()"
                                       style="visibility: {{ admin.currentProjectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                            <td>
                                <input id="value-name" type="text" name="value-name" autocomplete="off" ng-model="admin.valueName"
                                       style="visibility: {{ admin.currentProjectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                            <td>
                                <input id="value-color" type="color" name="value-color" ng-model="admin.valueColor"
                                       style="visibility: {{ admin.currentProjectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                            <td>
                                <input id="value-image" type="file" name="value-image" accept="image/*" ng-model="admin.valueImage"
                                       style="visibility: {{ admin.currentProjectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                        </tr>
                    </tbody>
                </table>
                <input type="hidden" id="sample-values" name="sample-values" value="">
            </fieldset>
            <div id="spinner"></div>
        </form>
    </div>
    <input id="initial-project-id" type="hidden" name="initial-project-id" value=${project_id!"0"}>
</div>

<#include "end-content.ftl">
<#include "branding-banner.ftl">
<#include "footer.ftl">
