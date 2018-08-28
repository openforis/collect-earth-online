<#include "header.ftl">
<#include "geodash-navbar.ftl">
<#include "start-content.ftl">
<script>
    let theURL="${root}" + "/geo-dash";
    var pid = this.getParameterByName("pid");
    function getParameterByName (name, url) {
        "use strict";
        if (!url) {
            url = window.location.href;
        }
        url = decodeURIComponent(url);
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        var results = regex.exec(url);
        if (!results) {
            return null;
        }
        if (!results[2]) {
            return "";
        }
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
</script>

<script type="text/babel" src="${root}/js/geodashreact.js"></script>
<br style="clear:both;">
    <div id="fulldiv" class="full">
        <div id="fullholder" ></div>
    </div>
    <div class="container-fluid">
        <div id="dashHolder"></div>
    </div>
    <!-- change false to true below -->
    <#if role?? && editable == "false">
		<div class="modal fade" id="dialog-form" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
  			<div class="modal-dialog modal-dialog-centered" role="document">
				<div class="modal-content">
          			<div class="modal-header mb-0">
	        			<h5 class="modal-title">New Widget</h5>
        				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
          					<span aria-hidden="true">&times;</span>
        				</button>
      				</div>
					<div class="modal-body">
						<p><small class="form-text text-muted">All form fields are required.</small></p>
            			<form name="form" id="form">
                    		<fieldset>
	                    		<div class="form-group">
		                    		<label for="mainType">Type</label>
			                        <select name="mainType" class="form-control" id="mainType" ng-model="geodash.mainwidgetTypeSelected" ng-change="geodash.updatemainwidgetType(geodash.mainwidgetTypeSelected)"
			                             data-ng-options="mainWidgetType as mainWidgetType.name for mainWidgetType in geodash.mainWidgetTypes" >
			                        </select>
		                        </div>
		                        <div id="cookedWidget" ng-show="geodash.cooked">
		                            <div id="cookedNDVIImage" ng-show="geodash.cookedImage">
		                                <div class="form-group">
		                                    <label for="cookedImageTitle">Title</label>
		                                    <input type="text" name="cookedImageTitle" id="cookedImageTitle" value="" class="form-control">
		                                </div>
		                                 <div class="input-group input-daterange" id="range_new_cooked">
		                                 	<label for="sDate_new_cooked">Select Image Date Range you would like</label>
		                                    <input type="text" class="form-control" value="" id="sDate_new_cooked">
		                                    <div class="input-group-addon my-auto">to</div>
		                                    <input type="text" class="form-control" value="" id="eDate_new_cooked">
		                                </div>
		                                <div class="form-group">
		                                    <label for="cookedImageColumns">Columns</label>
		                                    <input type="text" name="cookedImageColumns" id="cookedImageColumns" value="" class="form-control">
		                                </div>
		                            </div>
		                            <div id="cookedNDVIGraph" ng-show="geodash.cookedGraph">
		                                <div class="form-group">
		                                    <label for="cookedGraphTitle">Title</label>
		                                    <input type="text" name="cookedGraphTitle" id="cookedGraphTitle" value="" class="form-control">
		                                </div>
		                                 <label>Select Graph Date Range you would like</label>
		                                 <div class="input-group input-daterange" id="range_new_cooked_graph">
		                                    <input type="text" class="form-control my-auto" value="" id="sDate_new_cooked_graph">
		                                    <div class="input-group-addon">to</div>
		                                    <input type="text" class="form-control" value="" id="eDate_new_cooked_graph">
		                                </div>
		                                <div class="form-group">
		                                    <label for="cookedGraphColumns">Columns</label>
		                                    <input type="text" name="cookedGraphColumns" id="cookedGraphColumns" value="" class="form-control">
		                                </div>
		                            </div>
		                            <div id="statsform" ng-show="geodash.cookedStats">
		                                <div class="form-group">
		                                    <label for="stattitle">Title</label>
		                                    <input type="text" name="stattitle" id="stattitle" value="" class="form-control">
		                                </div>
		                                <div class="form-group">
		                                    <label for="statcolumns">Columns</label>
		                                    <input type="text" name="statcolumns" id="statcolumns" value="" class="form-control">
		                                </div>
		                            </div>
		                        </div>
		                        <div id="customBuildWidget" ng-hide="geodash.cooked">
		                            <div class="form-group">
		                                <label for="widgetType">Type</label>
		                                <select name="widgetType" class="form-control" id="widgetType">
		                                    <option value="addImageCollection">Image Collection</option>
		                                    <option value="timeSeriesGraph">Time Series Graph</option>
		                                </select>
		                            </div>
		                            <div id="mainform">
		                                <div class="form-group">
		                                    <label for="title">Title</label>
		                                    <input type="text" name="title" id="title" value="" class="form-control">
		                                </div>
		                                <div class="form-group">
		                                    <label for="collection">Image Collection</label>
		                                    <input type="text" name="collection" id="iCollection" value="" class="form-control">
		                                </div>
		                                <div class="form-group">
		                                		<label for="sDate_new">Date Range</label>
		                                    <div class="input-group input-daterange  mb-2" id="range_new">
		                                        <input type="text" class="form-control" value="" id="sDate_new">
		                                        <div class="input-group-addon my-auto mx-1">to</div>
		                                        <input type="text" class="form-control" value="" id="eDate_new">
		                                    </div>
		                                    <div class="form-group">
		                                        <label for="bands">Bands(optional)</label>
		                                        <input type="text" name="bands" id="bands" value="" class="form-control">
		                                    </div>
		                                    <div class="form-group">
		                                        <label for="columns">Columns</label>
		                                        <input type="text" name="columns" id="columns" value="" class="form-control">
		                                    </div>
		                                    <div class="form-group">
		                                        <!-- Allow form submission with keyboard without duplicating the dialog button -->
		                                        <input type="submit" tabindex="-1" class="btn btn-outline-lightgreen btn-block" >
		                                    </div>
		                                </div>
									</div>
								</div>
							</fieldset>
                		</form>
					</div>
				</div>
			</div>
		</div>
    </#if>
</div>
<#include "end-content.ftl">
<#include "footer.ftl">
