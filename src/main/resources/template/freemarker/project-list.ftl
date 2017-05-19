<div id="project-list" ng-controller="ProjectListController as projectList" ng-init="projectList.initialize()">
    <h1>Projects [{{ projectList.projectList.length }}]</h1>
    <ul>
        <#if role?? && role == "admin">
        <li><a class="create-project" href="admin">Create New Project</a></li>
        <li ng-repeat="project in projectList.projectList">
            <a class="view-project" href="dashboard?project={{ project.id }}">{{ project.name }}</a>
            <a class="edit-project" href="admin?project={{ project.id }}">Edit</a>
        </li>
        <#else>
        <li ng-repeat="project in projectList.projectList">
            <a href="dashboard?project={{ project.id }}">{{ project.name }}</a>
        </li>
        </#if>
    </ul>
</div>
