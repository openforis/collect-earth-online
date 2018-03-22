<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<script type="text/javascript" src="${root}/js/project.js"></script>
<div id="project" class="row" ng-app="project" ng-controller="ProjectController as project"
     ng-init="project.initialize('${root}', '${project_id!0}', '${institution_id!0}')">
    <div id="project-dashboard" class="col-md-6">
        <div class="bg-darkgreen">
            <h1>Project Dashboard</h1>
        </div>
        <div id="project-map"></div>
        <div class="row">
            <div id="project-stats" class="col-xl-6 col-lg-12">
                <div class="row">
                    <h2 class="col-xl-12">Project Stats</h2>
                </div>
                <div class="row">
                    <div class="col-xl-12">
                        <table class="table table-sm">
                            <tbody>
                                <tr>
                                    <td>Members</td>
                                    <td>{{ project.members }}</td>
                                    <td>Contributors</td>
                                    <td>{{ project.contributors }}</td>
                                </tr>
                                <tr>
                                    <td>Total Plots</td>
                                    <td>{{ project.details.numPlots || 0 }}</td>
                                    <td>Date Created</td>
                                    <td>{{ project.dateCreated }}</td>
                                </tr>
                                <tr>
                                    <td>Flagged Plots</td>
                                    <td>{{ project.flaggedPlots }}</td>
                                    <td>Date Published</td>
                                    <td>{{ project.datePublished }}</td>
                                </tr>
                                <tr>
                                    <td>Analyzed Plots</td>
                                    <td>{{ project.analyzedPlots }}</td>
                                    <td>Date Closed</td>
                                    <td>{{ project.dateClosed }}</td>
                                </tr>
                                <tr>
                                    <td>Unanalyzed Plots</td>
                                    <td>{{ project.unanalyzedPlots }}</td>
                                    <td>Date Archived</td>
                                    <td>{{ project.dateArchived }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div id="project-management" class="col-xl-6 col-lg-12">
                <div class="row">
                    <h2 class="col-xl-12">Project Management</h2>
                </div>
                <div class="row">
                    <div class="col-lg-12 text-center">
                        <div class="btn-group-vertical btn-block">
                            <input type="button" id="configure-geo-dash" class="btn btn-outline-lightgreen btn-sm btn-block"
                                   name="configure-geo-dash" value="Configure Geo-Dash"
                                   ng-click="project.configureGeoDash()">
                            <input type="button" id="download-plot-data" class="btn btn-outline-lightgreen btn-sm btn-block"
                                   name="download-plot-data" value="Download Plot Data"
                                   ng-click="project.downloadPlotData()"
                                   style="display: {{ project.details.availability == 'published' || project.details.availability == 'closed' ? 'block' : 'none' }}">
                            <input type="button" id="download-sample-data" class="btn btn-outline-lightgreen btn-sm btn-block"
                                   name="download-sample-data" value="Download Sample Data"
                                   ng-click="project.downloadSampleData()"
                                   style="display: {{ project.details.availability == 'published' || project.details.availability == 'closed' ? 'block' : 'none' }}">
                            <input type="button" id="change-availability" class="btn btn-outline-danger btn-sm btn-block"
                                   name="change-availability" value="{{ project.stateTransitions[project.details.availability] }} Project"
                                   ng-click="project.changeAvailability()">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div id="project-design" class="col-md-6">
        <form id="project-design-form" method="post" action="${root}/create-project" enctype="multipart/form-data">
            <div class="bg-darkgreen mb-2">
                <h1>Project Design</h1>
            </div>
            <div class="row">
                <div class="col-xl-8 col-lg-12">
                    <h2>Project Info</h2>
                    <div id="project-info">
                        <div class="form-group">
                            <label class="small" for="project-name">Name</label>
                            <input class="form-control form-control-sm" type="text" id="project-name" name="name" autocomplete="off" ng-model="project.details.name">
                        </div>
                        <div class="form-group">
                            <label class="small" for="project-description">Description</label>
                            <textarea class="form-control form-control-sm" id="project-description" name="description" ng-model="project.details.description"></textarea>
                        </div>
                    </div>
                </div>
                <div class="col-xl-4 col-lg-12">
                    <h2 class="mb-0">Project Visibility</h2>
                    <h3>Privacy Level</h3>
                    <div id="project-visibility">
                        <div class="form-check">
                            <input class="form-check-input" type="radio" id="privacy-public" name="privacy-level" value="public"
                                   ng-click="project.setPrivacyLevel('public')">
                            <label class="form-check-label small" for="privacy-level">Public: <i>All Users</i></label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" id="privacy-private" name="privacy-level" value="private"
                                   ng-click="project.setPrivacyLevel('private')" checked>
                            <label class="form-check-label small" for="privacy-level">Private: <i>Group Admins</i></label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" id="privacy-institution" name="privacy-level" value="institution"
                                   ng-click="project.setPrivacyLevel('institution')">
                            <label class="form-check-label small" for="privacy-level">Institution: <i>Group Members</i></label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" id="privacy-invitation" name="privacy-level" value="invitation"
                                   ng-click="project.setPrivacyLevel('invitation')" disabled>
                            <label class="form-check-label small" for="privacy-level">Invitation: <i>Coming Soon</i></label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-6 col-lg-12">
                    <h2>Project AOI</h2>
                    <div id="project-aoi">
                        <div class="form-group">
                            <label class="small">Hold CTRL and click-and-drag a bounding box on the map</label>
                            <div class="row">
                                <div class="col-md-6 offset-md-3">
                                    <input class="form-control form-control-sm" type="number" id="lat-max" name="lat-max"
                                           ng-model="project.latMax" placeholder="North" autocomplete="off" min="-90.0" max="90.0" step="any">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <input class="form-control form-control-sm" type="number" id="lon-min" name="lon-min"
                                           ng-model="project.lonMin" placeholder="West" autocomplete="off" min="-180.0" max="180.0" step="any">
                                </div>
                                <div class="col-md-6">
                                    <input class="form-control form-control-sm" type="number" id="lon-max" name="lon-max"
                                           ng-model="project.lonMax" placeholder="East" autocomplete="off" min="-180.0" max="180.0" step="any">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 offset-md-3">
                                    <input class="form-control form-control-sm" type="number" id="lat-min" name="lat-min"
                                           ng-model="project.latMin" placeholder="South" autocomplete="off" min="-90.0" max="90.0" step="any">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-6 col-lg-12">
                    <h2>Project Imagery</h2>
                    <div id="project-imagery">
                        <div class="form-group mb-1">
                            <label class="small mb-0" for="base-map-source">Basemap Source</label>
                            <select class="form-control form-control-sm" id="base-map-source" name="base-map-source" size="1"
                                    ng-model="project.details.baseMapSource" ng-change="project.setBaseMapSource()">
                                <option ng-repeat="imagery in project.imageryList" value="{{ imagery.title }}">{{ imagery.title }}</option>
                            </select>
                        </div>
                        <div class="form-group mb-1">
                            <label class="small mb-0" for="imagery-year"
                                   style="visibility: {{ project.details.baseMapSource == 'DigitalGlobeWMSImagery' ? 'visible' : 'hidden' }}">Imagery Year</label>
                            <select class="form-control form-control-sm" id="imagery-year" name="imagery-year" size="1"
                                    ng-model="project.details.imageryYear" convert-to-number ng-change="project.updateDGWMSLayer()"
                                    style="visibility: {{ project.details.baseMapSource == 'DigitalGlobeWMSImagery' ? 'visible' : 'hidden' }}">
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
                                <option value="2006">2006</option>
                                <option value="2005">2005</option>
                                <option value="2004">2004</option>
                                <option value="2003">2003</option>
                                <option value="2002">2002</option>
                                <option value="2001">2001</option>
                                <option value="2000">2000</option>
                            </select>
                        </div>
                        <div class="form-group mb-1">
                            <label class="small mb-0" for="stacking-profile"
                                   style="visibility: {{ project.details.baseMapSource == 'DigitalGlobeWMSImagery' ? 'visible' : 'hidden' }}">Stacking Profile</label>
                            <select class="form-control form-control-sm" id="stacking-profile" name="stacking-profile" size="1"
                                    ng-model="project.details.stackingProfile" ng-change="project.updateDGWMSLayer()"
                                    style="visibility: {{ project.details.baseMapSource == 'DigitalGlobeWMSImagery' ? 'visible' : 'hidden' }}">
                                <option value="Accuracy_Profile">Accuracy Profile</option>
                                <option value="Cloud_Cover_Profile">Cloud Cover Profile</option>
                                <option value="Global_Currency_Profile">Global Currency Profile</option>
                                <option value="MyDG_Color_Consumer_Profile">MyDG Color Consumer Profile</option>
                                <option value="MyDG_Consumer_Profile">MyDG Consumer Profile</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-xl-6 col-lg-12">
                    <h2>Plot Design</h2>
                    <div id="plot-design">
                        <div class="row">
                            <div id="plot-design-col1" class="col-xl-6 col-md-12">
                                <label class="small mb-0">Spatial Distribution</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" id="plot-distribution-random" name="plot-distribution" value="random"
                                           ng-click="project.setPlotDistribution('random')" checked>
                                    <label class="form-check-label small">Random</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" id="plot-distribution-gridded" name="plot-distribution" value="gridded"
                                           ng-click="project.setPlotDistribution('gridded')">
                                    <label class="form-check-label small">Gridded</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" id="plot-distribution-csv" name="plot-distribution" value="csv"
                                           ng-click="project.setPlotDistribution('csv')">
                                    <label class="btn btn-sm btn-block btn-outline-lightgreen btn-file pt-0 pb-0" id="custom-csv-upload">
                                        <small>Upload CSV</small>
                                        <input type="file" accept="text/csv" id="plot-distribution-csv-file" style="display: none;">
                                    </label>
                                </div>
                                <div class="form-group mb-1">
                                    <label class="small mb-0" for="num-plots">Number of plots</label>
                                    <input class="form-control form-control-sm" type="number" id="num-plots" name="num-plots" autocomplete="off"
                                           min="0" step="1" ng-model="project.details.numPlots">
                                </div>
                                <div class="form-group mb-1">
                                    <label class="small mb-0" for="plot-spacing">Plot spacing (m)</label>
                                    <input class="form-control form-control-sm" type="number" id="plot-spacing" name="plot-spacing" autocomplete="off"
                                           min="0.0" step="any" ng-model="project.details.plotSpacing" disabled>
                                </div>
                            </div>
                            <div id="plot-design-col2" class="col-xl-6 col-md-12">
                                <label class="small mb-0">Plot Shape</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" id="plot-shape-circle" name="plot-shape" value="circle"
                                           ng-click="project.setPlotShape('circle')" checked>
                                    <label class="form-check-label small">Circle</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" id="plot-shape-square" name="plot-shape" value="square"
                                           ng-click="project.setPlotShape('square')">
                                    <label class="form-check-label small">Square</label>
                                </div>
                                <label class="small mb-0" for="plot-size">Plot {{ project.details.plotShape == 'circle' ? 'Diameter' : 'Width' }} (m)</label>
                                <input class="form-control form-control-sm" type="number" id="plot-size" name="plot-size" autocomplete="off"
                                       min="0.0" step="any" ng-model="project.details.plotSize">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-4 offset-xl-1 col-lg-12">
                    <div id="sample-design">
                        <h2>Sample Design</h2>
                        <label class="small mb-0">Spatial Distribution</label>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" id="sample-distribution-random" name="sample-distribution" value="random"
                                   ng-click="project.setSampleDistribution('random')" checked>
                            <label class="form-check-label small">Random</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" id="sample-distribution-gridded" name="sample-distribution" value="gridded"
                                   ng-click="project.setSampleDistribution('gridded')">
                            <label class="form-check-label small">Gridded</label>
                        </div>
                        <div class="form-group mb-1">
                            <label class="small mb-0" for="samples-per-plot">Samples per plot</label>
                            <input class="form-control form-control-sm" type="number" id="samples-per-plot" name="samples-per-plot" autocomplete="off"
                                   min="0" step="1" ng-model="project.details.samplesPerPlot">
                        </div>
                        <div class="form-group mb-1">
                            <label class="small mb-0" for="sample-resolution">Sample resolution (m)</label>
                            <input class="form-control form-control-sm" type="number" id="sample-resolution" name="sample-resolution" autocomplete="off"
                                   min="0.0" step="any" ng-model="project.details.sampleResolution" disabled>
                        </div>
                    </div>
                </div>
            </div>
            <hr>
            <div class="sample-value-info" ng-repeat="sampleValueGroup in project.details.sampleValues">
                <h2>Sample Value: {{ sampleValueGroup.name }}</h2>
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col">Name</th>
                            <th scope="col">Color</th>
                            <th scope="col">Reference Image</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr ng-repeat="sampleValue in sampleValueGroup.values">
                            <td>
                                <input type="button" class="button" value="-" ng-click="project.removeSampleValueRow(sampleValueGroup.name, sampleValue.name)"
                                       style="visibility: {{ project.details.id == 0 ? 'visible' : 'hidden' }}">
                            </td>
                            <td>
                                {{ sampleValue.name }}
                            </td>
                            <td>
                                <div class="circle" style="background-color: {{ sampleValue.color }};border:solid 1px;"></div>
                            </td>
                            <td>
                                {{ sampleValue.image }}
                            </td>
                        </tr>
                        <tr style="visibility: {{ project.details.id == 0 ? 'visible' : 'hidden' }}">
                            <td>
                                <input type="button" class="button" value="+" ng-click="project.addSampleValueRow(sampleValueGroup.name)">
                            </td>
                            <td>
                                <input type="text" class="value-name" autocomplete="off" ng-model="project.newValueEntry[sampleValueGroup.name].name">
                            </td>
                            <td>
                                <input type="color" class="value-color" ng-model="project.newValueEntry[sampleValueGroup.name].color">
                            </td>
                            <td>
                                <input type="file" class="value-image" accept="image/*" ng-model="project.newValueEntry[sampleValueGroup.name].image">
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div id="add-sample-value-group" style="visibility: {{ project.details.id == 0 ? 'visible' : 'hidden' }}">
                <input type="button" class="button" value="Add Sample Value Group" ng-click="project.addSampleValueGroup()">
                <input type="text" autocomplete="off" ng-model="project.newSampleValueGroupName">
            </div>
        </form>
    </div>
    <div id="spinner"></div>
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
