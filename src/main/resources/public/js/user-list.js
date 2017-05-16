angular.module("userList", []).controller("UserListController", ["$http", function UserListController($http) {
    this.userList = [];

    this.getUserList = function () {
        $http.get("get-all-users")
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

        // Show a map of users
        // FIXME: Add markers to the map for each user based on their IP address
        map_utils.digital_globe_base_map({div_name: "user-map",
                                          center_coords: [102.0, 17.0],
                                          zoom_level: 5});
    };

}]);
