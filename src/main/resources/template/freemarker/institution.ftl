<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/javascript" src="${root}/js/institution.js"></script>

<div id="institution" ng-app="institution" ng-controller="InstitutionController as institution"
     ng-init="institution.initialize('${root}', '${userid!""}', '${institution_id}')">
    <div id="institution-details" class="row">
        <div id="institution-view" class="col-xl-8 offset-xl-2 col-lg-10 offset-lg-1" ng-show="institution.pageMode == 'view'">
            <div id="institution-logo-container">
                <a href="{{ institution.details.url }}">
                </a>
            </div>
            <h1><a href="{{ institution.details.url }}">{{ institution.details.name }}</a></h1>
            <p>{{ institution.details.description }}</p>
        </div>
        <div id="institution-edit" ng-show="institution.pageMode == 'edit'">
            <label id="institution-name" >Name <input type="text" ng-model="institution.details.name"></label>
            <label id="institution-url">URL <input type="text" ng-model="institution.details.url"></label>
            <label id="institution-logo-selector">Logo <input id="institution-logo" type="file" accept="image/*"></label>
            <label id="institution-description">Description<br><textarea ng-model="institution.details.description"></textarea></label>
        </div>

    </div>
     <#if role??>
         <div class="row justify-content-center mb-2" id="institution-controls">
         		<div class="col-2">
         		<div class="btn-group btn-block">
		             <button id="create-institution" type="button"  class="btn btn-sm btn-outline-lightgreen btn-group btn-block mt-0"
		                     ng-click="institution.togglePageMode()" ng-show="institution.pageMode == 'edit' && institution.details.id == 0">
		            	 Create Institution
		            	 </button>
		             <button id="edit-institution" type="button"  class="btn btn-sm btn-outline-lightgreen btn-group btn-block mt-0"
		                     ng-click="institution.togglePageMode()" ng-show="institution.details.id > 0 && institution.isAdmin">
					{{ institution.pageMode == 'view' ? 'Edit' : 'Save' }}
					</button>				                     
              		<button id="delete-institution" type="button" class="btn btn-sm btn-outline-danger btn-group btn-block mt-0"
                     ng-click="institution.deleteInstitution()" ng-show="institution.details.id > 0 && institution.isAdmin">
                    Delete
                     </button>
                     </div>
         		</div>
         </div>
     </#if>
    <div class="row">
	    <div id="imagery-list" class="col-lg-4 col-xs-12" ng-if="institution.imageryMode == 'view'">
	        <h2>Imagery <span class="badge badge-pill bg-lightgreen">{{ institution.imageryList.length }}</span></h2>
	            <div class="row" ng-repeat="imagery in institution.imageryList">
		            		<div ng-if="institution.isAdmin == false" class="col mb-1">
		               		<button class="btn btn-outline-lightgreen btn-sm btn-block" >{{ imagery.title }}</button>
		                </div>
	    	            		<div ng-if="institution.isAdmin == true" class="col-lg-10 mb-1 pr-1">
		               		<button class="btn btn-outline-lightgreen btn-sm btn-block" >{{ imagery.title }}</button>
		               	</div>
	    	            		<div ng-if="institution.isAdmin == true" class="col-lg-2 pl-0">
			                <button class="btn btn-outline-danger btn-sm btn-block" ng-if="institution.isAdmin == true" id="delete-imagery" type="button" ng-click="institution.deleteImagery(imagery.id)">
			                		Delete
			                </button>
		            		</div>
	            </div>
	            <div class="row">
			        <table id="add-imagery" class="table table-sm" ng-if="institution.isAdmin == true && institution.imageryMode == 'edit'">
			            <tr>
			                <td>Title</td>
			                <td><input type="text" name="imagery-title" autocomplete="off" ng-model="institution.newImageryTitle"></td>
			            </tr>
			            <tr>
			                <td>Attribution</td>
			                <td><input type="text" name="imagery-attribution" autocomplete="off" ng-model="institution.newImageryAttribution"></td>
			            </tr>
			            <tr>
			                <td>GeoServer URL</td>
			                <td><input type="text" name="imagery-geoserver-url" autocomplete="off" ng-model="institution.newGeoServerURL"></td>
			            </tr>
			            <tr>
			                <td>GeoServer Layer Name</td>
			                <td><input type="text" name="imagery-layer-name" autocomplete="off" ng-model="institution.newLayerName"></td>
			            </tr>
			            <tr>
			                <td>GeoServer Params<br>(as JSON string)</td>
			                <td><input type="text" name="imagery-geoserver-params" autocomplete="off" ng-model="institution.newGeoServerParams"></td>
			            </tr>
			        </table>
		        </div>
	        <div class="row">
	        		<div class="col-lg-12">
	        		        <input ng-if="institution.isAdmin == true" type="button" id="add-imagery-button"
		               class="btn btn-sm btn-block btn-outline-yellow" ng-click="institution.toggleImageryMode()"
		               value="{{ institution.imageryMode == 'view' ? 'Add Imagery' : 'Save Changes' }}">
             	</div>
             </div>
	    </div>
	  <div id="project-list" class="col-lg-4 col-xs-12">
	      <h2>Projects <span class="badge badge-pill bg-lightgreen">{{ institution.projectList.length }}</span></h2>
	          <div class="row mb-1" ng-if="institution.isAdmin == true">
		          <div class="col">
		          	<button id="create-project" type="button" class="btn btn-sm btn-block btn-outline-yellow"
		                     ng-click="institution.createProject()" >
		                     Create New Project
	                </button>
				</div>
	          </div>
	          <div class="row" ng-if="institution.isAdmin == true" ng-repeat="project in institution.projectList">
	          	<div class="col-lg-10 mb-1 pr-1">
	             	<a class="btn btn-sm btn-outline-lightgreen btn-block" href="${root}/collection/{{ project.id }}">
	             		{{ project.name }}
	             	</a>
              	</div>
				<div class="col-lg-2 pl-0">
              		<a class="btn btn-sm btn-outline-lightgreen btn-block" class="edit-project" href="${root}/project/{{ project.id }}">Edit</a>
              	</div>
	          </div>
	          <div class="row" ng-if="institution.isAdmin == false" ng-repeat="project in institution.projectList">
	          	<div class="col mb-1 pr-1">
	             	<a class="btn btn-sm btn-outline-lightgreen btn-block" href="${root}/collection/{{ project.id }}">
	             		{{ project.name }}
	             	</a>
              	</div>
            	</div>
	  </div>
    <div id="user-list" class="col-lg-4 col-xs-12">
        <h2 ng-if="institution.isAdmin == true">Users <span class="badge badge-pill bg-lightgreen">{{ institution.userList.length }}</span></h2>
        <h2 ng-if="institution.isAdmin == false">Users <span class="badge badge-pill bg-lightgreen">{{ institution.nonPendingUsers }}</span></h2>
            <div class="row" ng-repeat="user in institution.userList">
            		<div class="col mb-1" ng-if="institution.isAdmin == false && user.institutionRole != 'pending'" >
              	  	<a class="btn btn-sm btn-outline-lightgreen btn-block" href="${root}/account/{{ user.id }}">{{ user.email }}</a>
            		</div>
            		<div class="col-lg-9 mb-1 pr-1" ng-if="institution.isAdmin == true" >
	                <a class="btn btn-sm btn-outline-lightgreen btn-block " href="${root}/account/{{ user.id }}">{{ user.email }}</a>
	            </div>
	            <div class="col-lg-3 mb-1 pl-0"  ng-if="institution.isAdmin == true" >
	                <select class="custom-select custom-select-sm" name="user-institution-role" size="1"
	                        ng-model="user.institutionRole"
	                        ng-change="institution.updateUserInstitutionRole(user.id, user.email, user.institutionRole)">
	                    <option ng-if="user.institutionRole == 'pending'" value="pending">Pending</option>
	                    <option value="member">Member</option>
	                    <option value="admin">Admin</option>
	                    <option value="not-member">Remove</option>
	                </select>
				</div>

            </div>
            <div class="row" ng-if="institution.isAdmin == true">
	            	<div class="col-lg-9 mb-1 pr-1">
	   	              <input class="form-control form-control-sm" type="email" name="new-institution-user" autocomplete="off" placeholder="Email" ng-model="institution.newUserEmail">
 	            	</div>
 	            	<div class="col-lg-3 mb-1 pl-0">
	                <button class="btn btn-sm btn-outline-yellow btn-block" name="add-institution-user" ng-click="institution.addUser()">Add User</button>
	            	</div>
            </div>
            <div ng-if="institution.userId != '' && institution.details.id > 0 && !institution.isInstitutionMember(institution.userId)">
                <input type="button" class="button" id="request-membership-button" name="request-membership-button"
                       value="Request Membership" ng-click="institution.requestMembership()">
            </div>

    </div>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
