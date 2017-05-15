<script type="text/javascript" src="js/project-list.js"></script>

<div id="project-list" ng-app="projectList" ng-controller="ProjectListController as projectList" ng-init="projectList.initialize()">
    <h1>Projects [#]</h1>
    <ul>
        <li ng-repeat="project in projectList.projectList">
            <a href="dashboard?project={{ project.id }}">{{ project.name }}</a>
        </li>
    </ul>
</div>
