<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<script type="text/javascript" src="${root}/js/institution.js"></script>

<div id="institution" ng-app="institution" ng-controller="InstitutionController as institution"
     ng-init="institution.initialize('${root}', '${userid!""}', '${institution_id}')">
    <div id="institution-details">
        <div id="institution-view" ng-show="institution.pageMode == 'view'">
            <h1>{{ institution.details.name }}</h1>
            <img src="${root}/{{ institution.details.logo }}">
            <a href="{{ institution.details.url }}">{{ institution.details.url }}</a>
            <p>{{ institution.details.description }}</p>
        </div>
        <div id="institution-edit" ng-show="institution.pageMode == 'edit'">
            <label>Name</label>
            <input id="institution-name" type="text" ng-model="institution.details.name">
            <label>Logo</label>
            <input id="institution-logo" type="file" accept="image/*">
            <label>URL</label>
            <input id="institution-url" type="text" ng-model="institution.details.url">
            <label>Description</label>
            <textarea id="institution-description" ng-model="institution.details.description"></textarea>
        </div>
        <#if role??>
            <input id="create-institution" type="button" value="Create Institution"
                   ng-click="institution.togglePageMode()" ng-show="institution.pageMode == 'edit' && institution.details.id == 0">
            <input id="edit-institution" type="button" value="{{ institution.pageMode == 'view' ? 'Edit Institution' : 'Save Changes' }}"
                   ng-click="institution.togglePageMode()" ng-show="institution.details.id > 0 && institution.isAdmin">
            <input id="delete-institution" type="button" value="Delete Institution"
                   ng-click="institution.deleteInstitution()" ng-show="institution.details.id > 0 && institution.isAdmin">
        </#if>
    </div>
    <div id="project-list">
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
    <div id="user-list">
        <h1>Users [{{ institution.userList.length }}]</h1>
        <ul>
            <li ng-repeat="user in institution.userList">
                <a ng-if="institution.isAdmin == false" class="wide-user-entry"
                   href="${root}/account/{{ user.id }}">{{ user.email }}</a>
                <a ng-if="institution.isAdmin == true" class="narrow-user-entry"
                   href="${root}/account/{{ user.id }}">{{ user.email }}</a>
                <select ng-if="institution.isAdmin == true" name="user-institution-role" size="1"
                        ng-model="user.institutionRole"
                        ng-change="institution.updateUserInstitutionRole(user.id, user.email, user.institutionRole)">
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
            <li ng-if="institution.userId != '' && !institution.isInstitutionMember(institution.userId)">
                <input type="button" class="button" id="request-membership-button" name="request-membership-button"
                       value="Request Membership" ng-click="institution.requestMembership()">
            </li>
        </ul>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
