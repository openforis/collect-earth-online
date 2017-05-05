<#include "header.ftl">

<script type="text/javascript" src="js/selectProject.js"></script>

<div id="select-project-form" ng-app="selectProject" ng-controller="SelectProjectController as selectProject" ng-init="selectProject.initialize()">
    <h1>Select a Project</h1>
    <ul>
        <li ng-repeat="project in selectProject.projectList">
            <a href="dashboard?project={{ project.id }}">{{ project.name }}</a>
        </li>
    </ul>
</div>
<#include "footer.ftl">
