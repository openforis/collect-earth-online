<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<div id="home" ng-controller="HomeController as home" ng-init="home.initialize('${root}')">
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
    <div id="institution-list">
        <h1>Institutions [{{ home.institutionList.length }}]</h1>
        <ul>
            <#if role??>
                <li><a class="create-institution" href="${root}/institution/0">Create New Institution</a></li>
            </#if>
            <li ng-repeat="institution in home.institutionList">
                <a href="${root}/institution/{{ institution.id }}">{{ institution.name }}</a>
            </li>
        </ul>
    </div>
    <div id="project-list">
        <h1>Projects [{{ home.projectList.length }}]</h1>
        <ul>
            <#if role??>
                <!-- FIXME: Show the View and Edit buttons if project.editable == true, only the View button otherwise -->
                <li ng-repeat="project in home.projectList">
                    <a class="view-project" href="${root}/dashboard/{{ project.id }}">{{ project.name }}</a>
                    <a class="edit-project" href="${root}/project/{{ project.id }}">Edit</a>
                </li>
            <#else>
                <li ng-repeat="project in home.projectList">
                    <a href="${root}/dashboard/{{ project.id }}">{{ project.name }}</a>
                </li>
            </#if>
        </ul>
    </div>
    <div id="user-list">
        <h1>Users [{{ home.userList.length }}]</h1>
        <!-- FIXME: Replace the user list with a user map -->
        <!-- <div id="user-map"></div> -->
        <ul>
            <li ng-repeat="user in home.userList">
                <a href="${root}/account/{{ user.id }}">{{ user.email }}</a>
            </li>
        </ul>
    </div>
</div>

<#include "end-content.ftl">
<#include "footer.ftl">
