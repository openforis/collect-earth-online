<div id="project-list" ng-controller="ProjectListController as projectList" ng-init="projectList.initialize()">
    <h1>Projects [{{ projectList.projectList.length }}]</h1>
    <ul>
        <li ng-repeat="project in projectList.projectList">
            <a href="dashboard?project={{ project.id }}">{{ project.name }}</a>
        </li>
    </ul>
</div>
