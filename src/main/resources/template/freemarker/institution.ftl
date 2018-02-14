<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/javascript" src="${root}/js/institution.js"></script>

<div id="institution" ng-app="institution" ng-controller="InstitutionController as institution"
     ng-init="institution.initialize('${root}', '${userid!""}', '${institution_id}')">
    <div id="institution-details">
        <div id="institution-view" ng-show="institution.pageMode == 'view'">
            <div id="institution-logo-container">
                <a href="{{ institution.details.url }}">
                    <img src="${ of_users_api_url }/group/logo/{{ institution.details.id }}" alt="logo" />
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
        <#if role??>
            <div id="institution-controls">
                <input id="create-institution" type="button" value="Create Institution"
                       ng-click="institution.togglePageMode()" ng-show="institution.pageMode == 'edit' && institution.details.id == 0">
                <input id="edit-institution" type="button" value="{{ institution.pageMode == 'view' ? 'Edit' : 'Save' }}"
                       ng-click="institution.togglePageMode()" ng-show="institution.details.id > 0 && institution.isAdmin">
                <input id="delete-institution" type="button" value="Delete"
                       ng-click="institution.deleteInstitution()" ng-show="institution.details.id > 0 && institution.isAdmin">
            </div>
        </#if>
    </div>
        <div id="bcontainer">
        <div class="Wrapper">
        <div class="Table">
    <div id="imagery-list" class="Column">
        <h1>Imagery [{{ institution.imageryList.length }}]</h1>
        <ul ng-if="institution.imageryMode == 'view'">
            <li ng-repeat="imagery in institution.imageryList">
                <a ng-if="institution.isAdmin == false" class="wide-entry">{{ imagery.title }}</a>
                <a ng-if="institution.isAdmin == true" class="narrow-entry">{{ imagery.title }}</a>
                <input ng-if="institution.isAdmin == true" id="delete-imagery" type="button" value="Delete" ng-click="institution.deleteImagery(imagery.id)">
            </li>
        </ul>
        <table id="add-imagery" ng-if="institution.isAdmin == true && institution.imageryMode == 'edit'">
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
        <input ng-if="institution.isAdmin == true" type="button" id="add-imagery-button"
               class="button" ng-click="institution.toggleImageryMode()"
               value="{{ institution.imageryMode == 'view' ? 'Add Imagery' : 'Save Changes' }}">
    </div>
    <div id="project-list" class="Column">
        <h1>Projects [{{ institution.projectList.length }}]</h1>
        <ul>
            <li><input id="create-project" type="button" value="Create New Project"
                       ng-click="institution.createProject()" ng-if="institution.isAdmin == true">
            </li>
            <li ng-if="institution.isAdmin == true" ng-repeat="project in institution.projectList">
                <a class="view-project" href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
                <a class="edit-project" href="${root}/project/{{ project.id }}">Edit</a>
            </li>
            <li ng-if="institution.isAdmin == false" ng-repeat="project in institution.projectList">
                <a href="${root}/collection/{{ project.id }}">{{ project.name }}</a>
            </li>
        </ul>
    </div>
    <div id="user-list" class="Column">
        <h1 ng-if="institution.isAdmin == true">Users [{{ institution.userList.length }}]</h1>
        <h1 ng-if="institution.isAdmin == false">Users [{{ institution.nonPendingUsers }}]</h1>
        <ul>
            <li ng-repeat="user in institution.userList">
                <a ng-if="institution.isAdmin == false && user.institutionRole != 'pending'" class="wide-entry"
                   href="${root}/account/{{ user.id }}">{{ user.email }}</a>
                <a ng-if="institution.isAdmin == true" class="narrow-entry"
                   href="${root}/account/{{ user.id }}">{{ user.email }}</a>
                <select ng-if="institution.isAdmin == true" name="user-institution-role" size="1"
                        ng-model="user.institutionRole"
                        ng-change="institution.updateUserInstitutionRole(user.id, user.email, user.institutionRole)">
                    <option ng-if="user.institutionRole == 'pending'" value="pending">Pending</option>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="not-member">Remove</option>
                </select>
            </li>
            <li ng-if="institution.isAdmin == true">
                <input type="text" name="new-institution-user" autocomplete="off" placeholder="Email"
                       ng-model="institution.newUserEmail">
                <input type="button" class="button" name="add-institution-user" value="Add User" ng-click="institution.addUser()">
            </li>
            <li ng-if="institution.userId != '' && institution.details.id > 0 && !institution.isInstitutionMember(institution.userId)">
                <input type="button" class="button" id="request-membership-button" name="request-membership-button"
                       value="Request Membership" ng-click="institution.requestMembership()">
            </li>
        </ul>
    </div>
    </div>
    </div>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
