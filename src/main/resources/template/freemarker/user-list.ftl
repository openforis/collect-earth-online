<script type="text/javascript" src="js/user-list.js"></script>

<div id="user-list" ng-app="userList" ng-controller="UserListController as userList" ng-init="userList.initialize()">
    <h1>Users [#]</h1>
    <ul>
        <li ng-repeat="user in userList.userList">
            <a href="dashboard?project={{ user.id }}">{{ user.name }}</a>
        </li>
    </ul>
</div>
