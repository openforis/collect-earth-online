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
