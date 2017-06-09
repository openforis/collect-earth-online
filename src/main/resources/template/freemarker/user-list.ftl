<div id="user-list" ng-controller="UserListController as userList" ng-init="userList.initialize(${(navlink == 'Home')?c})">
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
