<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<div id="home">
    <div id="ceo-description">
        <img id="ceo-logo" src="${root}/img/ceo-logo1.png">
        <h1>Earth Image Identification</h1>
        <h2>Collaborate. Play. Map the world.</h2>
        <p>
            Collect Earth Online is a collaborative effort between its
            developers and its community of users. We welcome
            suggestions for improvements on our
            <a href="https://github.com/openforis/collect-earth-online/issues">Github</a>
            issues page.
        </p>
    </div>
    <div id="institution-list" ng-controller="InstitutionListController as institutionList" ng-init="institutionList.initialize('${root}')">
        <h1>Institutions [{{ institutionList.institutionList.length }}]</h1>
        <ul>
            <#if role??>
                <li><a class="create-institution" href="${root}/institution/0">Create New Institution</a></li>
            </#if>
            <li ng-repeat="institution in institutionList.institutionList">
                <a href="${root}/institution/{{ institution.id }}">{{ institution.name }}</a>
            </li>
        </ul>
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
