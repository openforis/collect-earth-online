<div id="institution-list" ng-controller="InstitutionListController as institutionList" ng-init="institutionList.initialize()">
    <h1>Institutions [{{ institutionList.institutionList.length }}]</h1>
    <ul>
        <li ng-repeat="institution in institutionList.institutionList">
            <a href="dashboard?project={{ institution.id }}">{{ institution.name }}</a>
        </li>
    </ul>
</div>
