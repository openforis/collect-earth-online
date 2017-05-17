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

    this.initialize = function (showMap) {
        // Load the userList
        this.getUserList();

        if (showMap) {
            // Show a map of users
            map_utils.digital_globe_base_map({div_name: "user-map",
                                              center_coords: [-72.5498326, 44.3736678],
                                              zoom_level: 5});

            // FIXME: Repeat this for each user dynamically based on their IP address
            map_utils.draw_point(-72.5498326, 44.3736678); // Worcester, VT
        }
    };

}]);
