<#include "header.ftl">
<#include "branding-banner.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<#include "flash-messages.ftl">

<div id="project" ng-controller="ProjectController as project" ng-init="project.initialize('${root}')">
    <div id="project-dashboard">
        <h1>Project Dashboard</h1>
        <div id="project-map"></div>
        <div id="project-stats">
            <h2>Project Stats</h2>
            <table>
                <tr><td>Members</td><td>{{ project.members.length }}</td></tr>
                <tr><td>Contributors</td><td>{{ project.contributors.length }}</td></tr>
                <tr><td>Points Classified</td><td>{{ project.pointsClassified }}</td></tr>
                <tr><td>Bad Plots</td><td>{{ project.badPlots }}</td></tr>
                <tr><td>Date Created</td><td>{{ project.dateCreated }}</td></tr>
                <tr><td>Date Published</td><td>{{ project.datePublished }}</td></tr>
                <tr><td>Date Closed</td><td>{{ project.dateClosed }}</td></tr>
            </table>
        </div>
        <div id="project-management">
            <h2>Project Management</h2>
            <input type="button" id="change-availability" class="button"
                   name="change-availability" value="{{ project.stateTransitions[project.availability] }} Project"
                   ng-click="project.changeAvailability()">
            <input type="button" id="download-plot-data" class="button"
                   name="download-plot-data" value="Download Plot Data"
                   ng-click="project.downloadPlotData()"
                   style="visibility: {{ project.availability == 'published' || project.availability == 'closed' ? 'visible' : 'hidden' }}">
        </div>
    </div>
    <div id="project-design">
        <h1>Project Design</h1>
        <form method="post" action="${root}/project/${project_id}">
            <fieldset id="project-info">
                <legend>Project Info</legend>
                <label>Name</label>
                <input type="text" id="project-name" name="project-name" autocomplete="off" ng-model="project.projectName">
                <label>Description</label>
                <textarea id="project-description" name="project-description" ng-model="project.projectDescription"></textarea>
            </fieldset>
            <fieldset id="project-visibility">
                <legend>Project Visibility</legend>
                <label>Privacy Level</label>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <input type="radio" id="privacy-public" name="privacy-level" value="public" ng-click="project.setPrivacyLevel('public')">
                            </td>
                            <td>
                                <label>Public: <i>All Users</i></label>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input type="radio" id="privacy-private" name="privacy-level" value="private" ng-click="project.setPrivacyLevel('private')" checked>
                            </td>
                            <td>
                                <label>Private: <i>Group Admins</i></label>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input type="radio" id="privacy-institution" name="privacy-level" value="institution" ng-click="project.setPrivacyLevel('institution')">
                            </td>
                            <td>
                                <label>Institution: <i>Group Members</i></label>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input type="radio" id="privacy-invitation" name="privacy-level" value="invitation" ng-click="project.setPrivacyLevel('invitation')" disabled>
                            </td>
                            <td>
                                <label>Invitation: <i>Coming Soon</i></label>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </fieldset>
            <fieldset id="project-aoi">
                <legend>Project AOI</legend>
                <label>Hold CTRL and click-and-drag a bounding box on the map</label>
                <input type="number" id="lat-max" name="boundary-lat-max" ng-model="project.latMax" placeholder="North" autocomplete="off" min="-90.0" max="90.0" step="any">
                <input type="number" id="lon-min" name="boundary-lon-min" ng-model="project.lonMin" placeholder="West" autocomplete="off" min="-180.0" max="180.0" step="any">
                <input type="number" id="lon-max" name="boundary-lon-max" ng-model="project.lonMax" placeholder="East" autocomplete="off" min="-180.0" max="180.0" step="any">
                <input type="number" id="lat-min" name="boundary-lat-min" ng-model="project.latMin" placeholder="South" autocomplete="off" min="-90.0" max="90.0" step="any">
            </fieldset>
            <fieldset id="project-imagery">
                <legend>Project Imagery</legend>
                <label>Basemap Source</label>
                <select id="basemap-source" name="basemap-source" size="1" ng-model="project.baseMapSource" ng-change="project.setBaseMapSource()">
                    <option value="DigitalGlobeWMSImagery">DigitalGlobe: WMS Imagery</option>
                    <option value="DigitalGlobeRecentImagery">DigitalGlobe: Recent Imagery</option>
                    <option value="DigitalGlobeRecentImagery+Streets">DigitalGlobe: Recent Imagery+Streets</option>
                    <option value="BingAerial">Bing Maps: Aerial</option>
                    <option value="BingAerialWithLabels">Bing Maps: Aerial with Labels</option>
                    <option value="NASASERVIRChipset2002">NASA SERVIR Chipset 2002</option>
                </select>
                <label>Imagery Year</label>
                <select id="imagery-year" name="imagery-year" size="1" ng-model="project.imageryYear" ng-change="project.setImageryYear()">
                    <option value="2016">2016</option>
                    <option value="2015">2015</option>
                    <option value="2014">2014</option>
                    <option value="2013">2013</option>
                    <option value="2012">2012</option>
                    <option value="2011">2011</option>
                    <option value="2010">2010</option>
                    <option value="2009">2009</option>
                    <option value="2008">2008</option>
                    <option value="2007">2007</option>
                </select>
                <label>Stacking Profile</label>
                <select id="stacking-profile" name="stacking-profile" size="1" ng-model="project.stackingProfile" ng-change="project.setStackingProfile()">
                    <option value="Accuracy_Profile">Accuracy Profile</option>
                    <option value="Cloud_Cover_Profile">Cloud Cover Profile</option>
                    <option value="Global_Currency_Profile">Global Currency Profile</option>
                    <option value="MyDG_Color_Consumer_Profile">MyDG Color Consumer Profile</option>
                    <option value="MyDG_Consumer_Profile">MyDG Consumer Profile</option>
                </select>
            </fieldset>
            <fieldset id="plot-design">
                <legend>Plot Design</legend>
                <div id="plot-design-col1">
                    <label>Spatial Distribution</label>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <input type="radio" id="plot-distribution-random" name="plot-distribution"
                                           value="random" ng-click="project.setPlotDistribution('random')" checked>
                                </td>
                                <td>
                                    <label>Random</label>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <input type="radio" id="plot-distribution-gridded" name="plot-distribution"
                                           value="gridded" ng-click="project.setPlotDistribution('gridded')">
                                </td>
                                <td>
                                    <label>Gridded</label>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <label>Number of plots</label>
                    <input type="number" id="num-plots" name="plots" autocomplete="off" min="0" step="1" ng-model="project.numPlots">
                    <label>Plot spacing (m)</label>
                    <input type="number" id="plot-spacing" name="plot-spacing" autocomplete="off" min="0.0" step="any" ng-model="project.plotSpacing" disabled>
                </div>
                <div id="plot-design-col2">
                    <label>Plot Shape</label>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <input type="radio" id="plot-shape-circle" name="plot-shape"
                                           value="circle" ng-click="project.setPlotShape('circle')" checked>
                                </td>
                                <td>
                                    <label>Circle</label>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <input type="radio" id="plot-shape-square" name="plot-shape"
                                           value="square" ng-click="project.setPlotShape('square')">
                                </td>
                                <td>
                                    <label>Square</label>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <label>Plot {{ project.plotShape == 'circle' ? 'Radius' : 'Width' }} (m)</label>
                    <input type="number" id="plot-size" name="plot-size" autocomplete="off" min="0.0" step="any" ng-model="project.plotSize">
                </div>
            </fieldset>
            <fieldset id="sample-design">
                <legend>Sample Design</legend>
                <label>Spatial Distribution</label>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <input type="radio" id="sample-distribution-random" name="sample-distribution"
                                       value="random" ng-click="project.setSampleDistribution('random')" checked>
                            </td>
                            <td>
                                <label>Random</label>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input type="radio" id="sample-distribution-gridded" name="sample-distribution"
                                       value="gridded" ng-click="project.setSampleDistribution('gridded')">
                            </td>
                            <td>
                                <label>Gridded</label>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <label>Samples per plot</label>
                <input type="number" id="samples-per-plot" name="samples-per-plot" autocomplete="off" min="0" step="1" ng-model="project.samplesPerPlot">
                <label>Sample resolution (m)</label>
                <input type="number" id="sample-resolution" name="sample-resolution" autocomplete="off" min="0.0" step="any" ng-model="project.sampleResolution" disabled>
            </fieldset>
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
                        <tr ng-repeat="sampleValue in project.sampleValues">
                            <td>
                                <input type="button" class="button" value="-" ng-click="project.removeSampleValueRow(sampleValue.name)"
                                       style="visibility: {{ project.projectId == 0 ? 'visible' : 'hidden' }}">
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
                                <input type="button" class="button" name="add-sample-value" value="+" ng-click="project.addSampleValueRow()"
                                       style="visibility: {{ project.projectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                            <td>
                                <input type="text" id="value-name" name="value-name" autocomplete="off" ng-model="project.valueName"
                                       style="visibility: {{ project.projectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                            <td>
                                <input type="color" id="value-color" name="value-color" ng-model="project.valueColor"
                                       style="visibility: {{ project.projectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                            <td>
                                <input type="file" id="value-image" name="value-image" accept="image/*" ng-model="project.valueImage"
                                       style="visibility: {{ project.projectId == 0 ? 'visible' : 'hidden' }}">
                            </td>
                        </tr>
                    </tbody>
                </table>
                <input type="hidden" id="sample-values" name="sample-values" value="">
            </fieldset>
            <input type="hidden" id="project-id" name="project-id" value=${project_id!"0"}>
            <input type="hidden" id="institution-id" name="institution-id" value=${institution_id!"0"}>
        </form>
    </div>
    <div id="spinner"></div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
