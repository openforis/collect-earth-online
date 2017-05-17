<#if navlink == "Institution">
    <div id="user-list" ng-controller="UserListController as userList" ng-init="userList.initialize(false)">
<#else>
    <div id="user-list" ng-controller="UserListController as userList" ng-init="userList.initialize(true)">
</#if>
<h1>Users [{{ userList.userList.length }}]</h1>
<#if navlink == "Institution">
    <ul>
        <li ng-repeat="user in userList.userList">
            <a href="account?id={{ user.id }}">{{ user.email }}</a>
        </li>
    </ul>
<#else>
    <div id="user-map"></div>
</#if>
    </div>
