angular.module("userList", []).controller("UserListController", ["$http", function UserListController($http) {
    this.userList = [];

    this.getUserList = function () {
        $http.get("get-all-projects") // FIXME: Call a remote endpoint that returns a list of users
            .then(angular.bind(this, function successCallback(response) {
                this.userList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the user list. See console for details.");
            });
    };

    this.initialize = function () {
        // Load the userList
        this.getUserList();
    };

}]);
