<div id="project-list" ng-controller="ProjectListController as projectList" ng-init="projectList.initialize('${root}')">
    <h1>Projects [{{ projectList.projectList.length }}]</h1>
    <ul>
        <#if role??>
            <#if navlink == "Institution">
                <li><input id="create-project" type="button" value="Create New Project"
                           ng-click="projectList.createProject()" ng-show="projectList.isInstitutionAdmin()">
                </li>
            </#if>
            <li ng-repeat="project in projectList.projectList">
                <a class="view-project" href="${root}/dashboard/{{ project.id }}">{{ project.name }}</a>
                <a class="edit-project" href="${root}/project/{{ project.id }}" ng-show="project.editable">Edit</a>
            </li>
        <#else>
            <li ng-repeat="project in projectList.projectList">
                <a href="${root}/dashboard/{{ project.id }}">{{ project.name }}</a>
            </li>
        </#if>
    </ul>
</div>
