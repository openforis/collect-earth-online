<#include "header.ftl">

<script type="text/javascript" src="js/admin.js"></script>

<div id="admin">
    <h1>Project Management</h1>
    <div id="create-project-form" ng-attr-id="create-project-form" ng-controller="admin.controller">
        <form id="project-management-form" method="post" action="admin">
            <div id="project-selection">
                <label>Currently Viewing:</label>
                <select id="project-selector" name="project-selector" size="1" ng-model="currentProjectId" ng-change="setCurrentProject()">
                    <option value="0">New Project</option>
                    <option ng-repeat="project in projectList" value="{{ project.id }}">{{ project.name }}</option>
                </select>
            </div>
            <input id="download-plot-data" class="button" type="button" name="download-plot-data" value="Download Data"
                   ng-click="exportCurrentPlotData()" style="visibility: {{ currentProjectId == 0 ? 'hidden' : 'visible' }}">
            <input id="create-project" class="button" type="button" name="create-project" ng-click="submitForm()"
                   value="{{ currentProjectId == 0 ? 'Create and launch this project' : 'Delete this project' }}">
            <fieldset id="project-info">
                <legend>Project Info</legend>
                <label>Name</label>
                <input id="project-name" type="text" name="project-name" autocomplete="off" ng-model="projectName">
                <label>Description</label>
                <textarea id="project-description" name="project-description" ng-model="projectDescription"></textarea>
            </fieldset>
            <fieldset id="plot-info">
                <legend>Plot Info</legend>
                <label>Number of plots</label>
                <input id="plots" type="number" name="plots" autocomplete="off" min="0" step="1" ng-model="numPlots">
                <label>Plot radius (m)</label>
                <input id="radius" type="number" name="buffer-radius" autocomplete="off" min="0.0" step="any" ng-model="plotRadius">
            </fieldset>
            <fieldset id="sample-info">
                <legend>Sample Info</legend>
                <label>Sample type</label>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <input id="random-sample-type" type="radio" name="sample-type" value="random" ng-change="setSampleType('random')" checked>
                            </td>
                            <td>
                                <label>Random</label>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input id="gridded-sample-type" type="radio" name="sample-type" value="gridded" ng-change="setSampleType('gridded')">
                            </td>
                            <td>
                                <label>Gridded</label>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <label>Samples per plot</label>
                <input id="samples-per-plot" type="number" name="samples-per-plot" autocomplete="off" min="0" step="1" ng-model="samplesPerPlot"
                       {{ currentSampleType == 'gridded' ? 'disabled' : '' }}>
                <label>Sample resolution (m)</label>
                <input id="sample-resolution" type="number" name="sample-resolution" autocomplete="off" min="0.0" step="any" ng-model="sampleResolution"
                       {{ currentSampleType == 'random' ? 'disabled' : '' }}>
            </fieldset>
            <fieldset id="bounding-box">
                <legend>Define Bounding Box</legend>
                <label>Hold CTRL and click-and-drag a bounding box on the map</label>
                <input id="lat-max" type="number" name="boundary-lat-max" ng-model="latMax" placeholder="North" autocomplete="off" min="-90.0" max="90.0" step="any">
                <input id="lon-min" type="number" name="boundary-lon-min" ng-model="lonMin" placeholder="West" autocomplete="off" min="-180.0" max="180.0" step="any">
                <input id="lon-max" type="number" name="boundary-lon-max" ng-model="lonMax" placeholder="East" autocomplete="off" min="-180.0" max="180.0" step="any">
                <input id="lat-min" type="number" name="boundary-lat-min" ng-model="latMin" placeholder="South" autocomplete="off" min="-90.0" max="90.0" step="any">
            </fieldset>
            <div id="map-and-imagery">
                <div id="new-project-map"></div>
                <label>Basemap imagery: </label>
                <select id="imagery-selector" name="imagery-selector" size="1" ng-model="currentImagery" ng-change="setCurrentImagery()">
                    <option value="DigitalGlobeRecentImagery">DigitalGlobe: Recent Imagery</option>
                    <option value="DigitalGlobeRecentImagery+Streets">DigitalGlobe: Recent Imagery+Streets</option>
                    <option value="BingAerial">Bing Maps: Aerial</option>
                    <option value="BingAerialWithLabels">Bing Maps: Aerial with Labels</option>
                    <option value="NASASERVIRChipset2002">NASA SERVIR Chipset 2002</option>
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
                        <tr ng-repeat="sampleValue in currentSampleValues">
                            <td>
                                <input class="button" type="button" value="-" ng-click="removeSampleValueRow(sampleValue.id)"
                                       {{ currentProjectId == 0 ? '' : 'disabled' }}>
                            </td>
                            <td>
                                {{ sampleValue.value }}
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
                            </td>
                            <td>
                                <input id="value-name" type="text" name="value-name" autocomplete="off" ng-model="valueName"
                                       {{ currentProjectId == 0 ? '' : 'disabled' }}>
                            </td>
                            <td>
                                <input id="value-color" type="color" name="value-color" ng-model="valueColor"
                                       {{ currentProjectId == 0 ? '' : 'disabled' }}>
                            </td>
                            <td>
                                <input id="value-image" type="file" name="value-image" accept="image/*" ng-model="valueImage"
                                       {{ currentProjectId == 0 ? '' : 'disabled' }}>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <input id="add-sample-value" class="button" type="button" name="add-sample-value" value="Add sample value" ng-click="addSampleValueRow()"
                       {{ currentProjectId == 0 ? '' : 'disabled' }}>
                <input type="hidden" name="sample-values" ng-model="sampleValues">
            </fieldset>
            <div id="spinner"></div>
        </form>
    </div>
</div>
<#include "footer.ftl">
