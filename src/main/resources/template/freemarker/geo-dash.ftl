<#include "header.ftl">
<#include "start-content.ftl">

<!-- geo dash nav -->
<nav class="navbar navbar-expand-lg navbar-light fixed-top pt-0 pb-0" style="background-color: white;" id="geodash-nav">
	<div class="container-fluid">
	<a class="navbar-brand" href="home">    
		<img class= "img-fluid" id="ceo-site-logo" src="${root}/img/ceo-logo.png">
	</a>
  <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
    <span class="navbar-toggler-icon"></span>
  </button>
  <div class="collapse navbar-collapse" id="navbarSupportedContent">
     <ul id="login-info" class="navbar-nav mr-auto">
	     <li  class="nav-item my-auto">
	     	<h1>GEO-DASH</h1>
	     </li>
	         </ul>
	     
	     <ul class="navbar-nav mr-0">
        <#if username??>
	            <#if navlink == "Logout">
	            <li id="username" class="nav-item my-auto">
	            <span class="nav-link disabled">${username}</span> 
	            </li>
	            <li class="nav-item my-auto">
   	            <button type="button" class="btn btn-outline-danger btn-sm" onclick="location.href = '${root}/logout'">
           	      Logout
                 </button>	
                 </li>    
	            <#else>
	            <li id="username" class="nav-item my-auto">
	            <span class="nav-link disabled">${username}</span> 
	            </li>
	            <li  class="nav-item my-auto">
   	            <button type="button" class="btn btn-outline-danger btn-sm" onclick="location.href = '${root}/logout'">
           	      Logout
                 </button>	 
                 </li>   
               </#if>
        <#else>
            <#if navlink == "Login" || navlink == "Register">
            <li class="nav-item my-auto">
	            <button type="button" class="btn bg-lightgreen btn-sm" onclick="location.href = '${root}/login'">
	                Login/Register
                </button>
                </li>
	            <#else>
	            <li class="nav-item my-auto">
	            <button type="button" class="btn bg-lightgreen btn-sm" onclick="location.href = '${root}/login'">
	                Login/Register
                </button>
                </li>
            </#if>
        </#if>
        	     <li class="nav-item my-auto ml-1">                   
	     	 <input type="submit" id="btnNewWidget" value="New Widget" class="btn btn-outline-lightgreen btn-sm" ng-click="geodash.createNewWidget()" style="float:right;" data-toggle="modal" data-target="#dialog-form">
	     </li>
	     </ul>
    </div>
    </div>
</nav>
<!-- end geo dash nav -->

<#if role?? && editable == "true">
<script type="text/javascript" src="${root}/js/geo-dash-admin.js"></script>
<div id="geodash" ng-app="geodashadmin" ng-controller="GeodashAdminController as geodash" ng-init="geodash.initialize('${root}')">
<#else>
<script type="text/javascript" src="${root}/js/geo-dash.js"></script>
<div id="geodash" ng-app="geodash" ng-controller="GeodashController as geodash" ng-init="geodash.initialize('${root}')">
</#if>

    <div id="fulldiv" class="full">
        <div id="fullholder"></div>
    </div>
     <div id="geohead" class="d-none"> <img id="ceo-site-logo" src="/img/ceo-logo1.png" style="
            position: relative;
            top: 1px;
            left: 10px;
            height: 40px;
            padding: 4px;
        ">
        <div id="login-info">
                <#if username??>
                    <#if navlink == "Logout">
                         <span>${username}</span> <a class="active-link" href="${root}/logout">Logout</a>
                    <#else>
                        <span>${username}</span> <a href="${root}/logout">Logout</a>
                    </#if>
                <#else>
                    <#if navlink == "Login" || navlink == "Register">
                        <a class="active-link" href="${root}/login">Login/Register</a>
                    <#else>
                        <a ng-href="${root}/login{{geodash.querystring}}&returnurl=geo-dash">Login/Register</a>
                    </#if>
                </#if>
            </div>
        </div>
    <div class="container-fluid">
        <div id="dashHolder">

        </div>
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
