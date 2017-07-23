<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<div id="institution">
    <div id="institution-details" ng-controller="InstitutionController as institution" ng-init="institution.initialize('${root}')">
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
        <input id="userid" type="hidden" name="userid" value=${userid!"-1"}>
        <input id="institution-admin" type="hidden" name="institution-admin" value="{{ institution.isAdmin }}">
        <input id="initial-institution-id" type="hidden" name="initial-institution-id" value=${institution_id!"0"}>
        <input id="current-institution-id" type="hidden" name="current-institution-id" value="{{ institution.details.id }}">
    </div>
    <div id="project-list" ng-controller="ProjectListController as projectList" ng-init="projectList.initialize('${root}')">
        <h1>Projects [{{ projectList.projectList.length }}]</h1>
        <ul>
            <#if role??>
                <#if navlink == "Institution">
                    <li><input id="create-project" type="button" value="Create New Project"
                               ng-click="projectList.createProject()" ng-show="projectList.isInstitutionAdmin()">
                    </li>
                </#if>
                <!-- FIXME: Show the View and Edit buttons if project.editable == true, only the View button otherwise -->
                <li ng-repeat="project in projectList.projectList">
                    <a class="view-project" href="${root}/dashboard/{{ project.id }}">{{ project.name }}</a>
                    <a class="edit-project" href="${root}/project/{{ project.id }}">Edit</a>
                </li>
            <#else>
                <li ng-repeat="project in projectList.projectList">
                    <a href="${root}/dashboard/{{ project.id }}">{{ project.name }}</a>
                </li>
            </#if>
        </ul>
    </div>
    <div id="user-list" ng-controller="UserListController as userList" ng-init="userList.initialize('${root}', ${(navlink == 'Home')?c})">
        <h1>Users [{{ userList.userList.length }}]</h1>
        <#if navlink == "Home">
            <div id="user-map"></div>
        <#else>
            <ul>
                <li ng-repeat="user in userList.userList">
                    <a href="${root}/account/{{ user.id }}">{{ user.email }}</a>
                </li>
            </ul>
        </#if>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
