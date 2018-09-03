<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/babel" src="${root}/js/Main.js"></script>
<script type="text/javascript">
	let nonPendingUsers="";
	let pageMode = "view";
    $(function() {initialize();});
    function initialize() {
        if(typeof(renderInstitution)=="undefined")
            setTimeout(initialize,250);
        else
            renderInstitution("${root}", "${userid}","${institution_id}","${of_users_api_url}","${role}","${storage}",nonPendingUsers,pageMode);
    }
</script>

<div id="institution">
    <div class="row">

    <div id="user-list" class="col-lg-4 col-xs-12">
        <h2 ng-if="institution.isAdmin == true" class="header">Users <span class="badge badge-pill  badge-light">{{ institution.userList.length }}</span></h2>
        <h2 ng-if="institution.isAdmin == false" class="header">Users <span class="badge badge-pill  badge-light">{{ institution.nonPendingUsers }}</span></h2>
            <div class="row" ng-repeat="user in institution.userList">
            		<div class="col mb-1" ng-if="institution.isAdmin == false && user.institutionRole != 'pending'" >
              	  	<a class="btn btn-sm btn-outline-lightgreen btn-block" href="${root}/account/{{ user.id }}">{{ user.email }}</a>
            		</div>
            		<div class="col-9 mb-1 pr-1" ng-if="institution.isAdmin == true" >
	                <a class="btn btn-sm btn-outline-lightgreen btn-block " href="${root}/account/{{ user.id }}">{{ user.email }}</a>
	            </div>
	            <div class="col-3 mb-1 pl-0"  ng-if="institution.isAdmin == true" >
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
            <div class="row mb-1" ng-if="institution.isAdmin == true">
	            	<div class="col-9 pr-1">
	   	              <input class="form-control form-control-sm" type="email" name="new-institution-user" autocomplete="off" placeholder="Email" ng-model="institution.newUserEmail">
 	            	</div>
 	            	<div class="col-3 pl-0">
	                <button class="btn btn-sm btn-outline-yellow btn-block" name="add-institution-user" ng-click="institution.addUser()"><span class="d-xl-none"><i class="fa fa-plus-square"></i></span> <span class="d-none d-xl-block">Add User</span></button>
	            	</div>
            </div>
            <div ng-if="institution.userId != '' && institution.details.id > 0 && !institution.isInstitutionMember(institution.userId)">
                       <button class="btn btn-sm btn-outline-yellow btn-block mb-2" id="request-membership-button" name="request-membership-button"  ng-click="institution.requestMembership()"><i class="fa fa-plus-square"></i> Request membership</button>
            </div>

    </div>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
