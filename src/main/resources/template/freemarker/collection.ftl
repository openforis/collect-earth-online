<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">
<script type="text/javascript" src="${root}/js/collection.js"></script>
<div id="collection" class="row" ng-app="collection" ng-controller="CollectionController as collection"
     ng-init="collection.initialize('${root}', '${userid!""}', '${username!"guest"}', '${project_id}')">
    <div id="image-analysis-pane" ng-class="collection.map" class="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
        <div class="buttonHolder d-none">
            <div ng-hide="collection.showSideBar">
                <span id="action-button" name="collection-actioncall" title="Click a plot to analyze:"
                      alt="Click a plot to analyze">Click a plot to analyze, or:<p></p><br>
                    <span class="button" ng-click="collection.nextPlot()">Analyze random plot</span>
                    <br style="clear:both;">
                    <br style="clear:both;">
                </span>
            </div>
            <div ng-show="collection.showSideBar" style="position:relative;">
                <span id="action-button" name="collection-actioncall" title="Select each plot to choose value"
                      alt="Select each plot to choose value">Select each dot to choose value
                </span>
            </div>
        </div>
        <div id="imagery-info" class="row d-none">
            <p class="col small">{{ collection.currentImagery.attribution }}</p>
        </div>
    </div>
    <div id="sidebar" class="col-xl-3" old_ng-show="collection.showSideBar">
        <fieldset class="mb-3 text-center">
            <h3>Plot Navigation</h3>
            <div class="row">
                <div class="col" id="go-to-first-plot">
                    <input id="go-to-first-plot-button" class="btn btn-outline-lightgreen btn-sm btn-block" type="button"
                           name="new-plot" value="Go to first plot" ng-click="collection.nextPlot()">
                </div>
            </div>
            <div class="row d-none" id="plot-nav">
                <div class="col-sm-6 pr-2">
                    <input id="new-plot-button" class="btn btn-outline-lightgreen btn-sm btn-block" type="button"
                           name="new-plot" value="Skip" ng-click="collection.nextPlot()">
                </div>
                <div class="col-sm-6 pl-2">
                    <input id="flag-plot-button" class="btn btn-outline-lightgreen btn-sm btn-block" type="button"
                           name="flag-plot" value="Flag Plot as Bad" ng-click="collection.flagPlot()" style="opacity:0.5" disabled>
                </div>
            </div>
        </fieldset>
        <fieldset class="mb-3 justify-content-center text-center">
            <h3>Imagery Options</h3>
            <select id="base-map-source" class="form-control form-control-sm" name="base-map-source" size="1"
                    ng-model="collection.currentProject.baseMapSource" ng-change="collection.setBaseMapSource()">
                <option ng-repeat="imagery in collection.imageryList" value="{{ imagery.title }}">{{ imagery.title }}</option>
            </select>
        </fieldset>
        <fieldset ng-repeat="sampleValueGroup in collection.currentProject.sampleValues"
                  class="mb-1 justify-content-center text-center">
            <h3 class="text-center">Sample Value: {{ sampleValueGroup.name }}</h3>
            <ul id="samplevalue" class="justify-content-center">
                <li class="mb-1" ng-repeat="sampleValue in sampleValueGroup.values">
                    <button type="button" class="btn btn-outline-darkgray btn-sm btn-block pl-1"
                            id="{{ sampleValue.name + '_' + sampleValue.id }}" name="{{ sampleValue.name + '_' + sampleValue.id }}"
                            ng-click="collection.setCurrentValue(sampleValueGroup, sampleValue)">
                        <div class="circle" style="background-color:{{ sampleValue.color }}; border:solid 1px; float: left;
                                    margin-top: 4px;"></div>
                        <span class="small">{{ sampleValue.name }}</span>
                    </button>
                </li>
            </ul>
        </fieldset>
        <div class="row">
            <div class="col-sm-12 btn-block">
                <button id="save-values-button" class="btn btn-outline-lightgreen btn-sm btn-block" type="button"
                        name="save-values" ng-click="collection.saveValues()" style="opacity:0.5" disabled>
                    Save
                </button>
                <button class="btn btn-outline-lightgreen btn-sm btn-block mb-1" data-toggle="collapse"
                        href="#project-stats-collapse" role="button" aria-expanded="false" aria-controls="project-stats-collapse">
                    Project Stats
                </button>
                <div class="row justify-content-center mb-1 text-center">
                    <div class="col-lg-12">
                        <fieldset id="projStats" ng-class="collection.statClass" class="text-center">
                            <div class="collapse" id="project-stats-collapse">
                                <table class="table table-sm">
                                    <tbody>
                                        <tr>
                                            <td class="small">Project</td>
                                            <td class="small">{{ collection.currentProject.name }}</td>
                                        </tr>
                                        <tr>
                                            <td class="small">Plots Assigned</td>
                                            <td class="small">{{ collection.plotsAssigned }} ({{ collection.assignedPercentage() }}%)</td>
                                        </tr>
                                        <tr>
                                            <td class="small">Plots Flagged</td>
                                            <td class="small">{{ collection.plotsFlagged }} ({{ collection.flaggedPercentage() }}%)</td>
                                        </tr>
                                        <tr>
                                            <td class="small">Plots Completed</td>
                                            <td class="small">{{ collection.plotsAssigned + collection.plotsFlagged }} ({{ collection.completePercentage() }}%)</td>
                                        </tr>
                                        <tr>
                                            <td class="small">Plots Total</td>
                                            <td class="small">{{ collection.currentProject.numPlots }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </fieldset>
                    </div>
                </div>
                <button id="collection-quit-button" class="btn btn-outline-danger btn-block btn-sm" type="button"
                        name="collection-quit" ng-class="collection.quitclass" data-toggle="modal" data-target="#confirmation-quit">
                    Quit
                </button>
            </div>
        </div>
    </div>
</div>
<!-- Begin Quit Confirmation Popup -->
<div class="modal fade" id="confirmation-quit" tabindex="-1" role="dialog"
     aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLongTitle">Confirmation</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                Are you sure you want to stop collecting data?
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>
                <button type="button" class="btn bg-lightgreen btn-sm" id="quit-button"
                        onclick="window.location='${root}/home'">OK</button>
            </div>
        </div>
    </div>
</div>
<!-- End Quit Confirmation Popup -->
<#include "end-content.ftl">
<#include "footer.ftl">
