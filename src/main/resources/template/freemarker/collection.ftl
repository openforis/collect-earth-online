<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/javascript" src="${root}/js/collection.js"></script>

<div id="collection" class="row" ng-app="collection" ng-controller="CollectionController as collection"
     ng-init="collection.initialize('${root}', '${userid!""}', '${username!"guest"}', '${project_id}')">
    		<div id="image-analysis-pane" ng-class="collection.map" class="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
        <div class="buttonHolder d-none">
            <div ng-hide="collection.showSideBar">
                <span id="action-button" name="collection-actioncall" title="Click a plot to analyze:" alt="Click a plot to analyze">Click a plot to analyze, or:<p></p><br> <span class="button" ng-click="collection.nextPlot()">Analyze random plot</span>
                <br style="clear:both;"><br style="clear:both;"></span>
            </div>
            <div ng-show="collection.showSideBar" style="position:relative;">
            <span id="action-button" name="collection-actioncall" title="Select each plot to choose value" alt="Select each plot to choose value">Select each dot to choose value</span>
            </div>
        </div>
         <div id="imagery-info" class="row d-none">
         	<p class="col small">{{ collection.currentProject.attribution }}</p>
        	</div>
    </div>
    <div id="sidebar" class="col-xl-3" old_ng-show="collection.showSideBar">
    		<div class="row justify-content-center mb-4">
    			<div class="col-lg-12 ">
        			<input id="quit-button" class="btn btn-outline-danger btn-block" type="button" name="collection-quit" value="Quit" ng-class="collection.quitclass" onclick="window.location='${root}/home'">
    			</div>	
    		</div>
        <div id="showarrow" ng-click="collection.toggleStats()">
            <div ng-class="collection.arrowstate"></div>
		   
        </div>
        <div id="spacer"></div>
        <fieldset id="projStats" ng-class="collection.statClass">
            <h2>Project Stats</h2>
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
        </fieldset>
        <fieldset class="mb-4">
            <h2>Plot Navigation</h2>
            <div class="row no-gutters btn-group btn-block justify-content-center">
		            <input id="new-plot-button" class="btn btn-outline-lightgreen btn-sm " type="button" name="new-plot" value="Skip" ng-click="collection.nextPlot()">
            			<input id="save-values-button" class="btn btn-outline-lightgreen btn-sm" type="button" name="save-values" value="Save" ng-click="collection.saveValues()"
	                   style="opacity:0.5" disabled>
            		<input id="flag-plot-button" class="btn btn-outline-lightgreen btn-sm" type="button" name="flag-plot" value="Flag Plot as Bad" ng-click="collection.flagPlot()"
	                   style="opacity:0.5" disabled>
            </div>
        </fieldset>
        <fieldset class="mb-4 justify-content-center">
            <h2>Imagery Options</h2>
            <select id="base-map-source" class="form-control form-control-sm" name="base-map-source" size="1" ng-model="collection.currentProject.baseMapSource" ng-change="collection.setBaseMapSource()">
                <option ng-repeat="imagery in collection.imageryList" value="{{ imagery.title }}">{{ imagery.title }}</option>
            </select>
        </fieldset>
        <fieldset ng-repeat="sampleValueGroup in collection.currentProject.sampleValues" class="mb-4 justify-content-center">
            <h2>Sample Value: {{ sampleValueGroup.name }}</h2>
            <ul id="samplevalue" class="justify-content-center">
                <li class="mb-1" ng-repeat="sampleValue in sampleValueGroup.values">
                		 <button type="button" class="btn btn-outline-darkgray btn-small btn-block pl-1" id="{{ sampleValue.name + '_' + sampleValue.id }}" name="{{ sampleValue.name + '_' + sampleValue.id }}"
                           ng-click="collection.setCurrentValue(sampleValueGroup, sampleValue)">
                           <div class="circle" style="background-color:{{ sampleValue.color }}; border:solid 1px; float: left;
    margin-top: 4px;"></div>
                           <span class="small">{{ sampleValue.name }}</span>
                      </button>               		
                </li>
            </ul>
        </fieldset>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
