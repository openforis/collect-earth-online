<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<div id="institution" ng-controller="InstitutionController as institution" ng-init="institution.initialize('${root}', '${userid!""}')">
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
        <input id="initial-institution-id" type="hidden" name="initial-institution-id" value=${institution_id!"0"}>
        <input id="current-institution-id" type="hidden" name="current-institution-id" value="{{ institution.details.id }}">
    </div>
    <div id="project-list">
        <h1>Projects [{{ institution.projectList.length }}]</h1>
        <ul>
            <li><input id="create-project" type="button" value="Create New Project"
                       ng-click="institution.createProject()" ng-if="institution.isAdmin == true">
            </li>
            <li ng-if="institution.isAdmin == true" ng-repeat="project in institution.projectList">
                <a class="view-project" href="${root}/dashboard/{{ project.id }}">{{ project.name }}</a>
                <a class="edit-project" href="${root}/project/{{ project.id }}">Edit</a>
            </li>
            <li ng-if="institution.isAdmin == false" ng-repeat="project in institution.projectList">
                <a href="${root}/dashboard/{{ project.id }}">{{ project.name }}</a>
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
                        ng-model="user.institutionRole" ng-change="institution.updateUserInstitutionRole()">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="not-member">Remove</option>
                </select>
            </li>
        </ul>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
