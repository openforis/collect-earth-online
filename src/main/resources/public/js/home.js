angular.module("home", []).controller("HomeController", ["$http", function HomeController($http) {
    this.root = "";
    this.institutionList = [];
    this.projectList = [];
    this.userList = [];

    this.getInstitutionList = function () {
        $http.get(this.root + "/get-all-institutions")
            .then(angular.bind(this, function successCallback(response) {
                this.institutionList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution list. See console for details.");
            });
    };

    this.getProjectList = function (userId) {
        $http.get(this.root + "/get-all-projects?userId=" + userId + "&institutionId=")
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.getUserList = function () {
        $http.get(this.root + "/get-all-users")
            .then(angular.bind(this, function successCallback(response) {
                this.userList = response.data;
                // FIXME: Repeat this for each user dynamically based on their location attribute
                // map_utils.draw_point(-72.5498326, 44.3736678); // Worcester, VT
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the user list. See console for details.");
            });
    };

    this.initialize = function (documentRoot, userId) {
        // Make the current documentRoot globally available
        this.root = documentRoot;

        // Load the institutionList
        this.getInstitutionList();

        // Load the projectList for this userId
        this.getProjectList(userId);

        // Load the userList
        this.getUserList();

        // FIXME: Show a map of users (their points will be drawn by the getUserList callback)
        // map_utils.digital_globe_base_map({div_name: "user-map",
        //                                   center_coords: [-72.5498326, 44.3736678],
        //                                   zoom_level: 5},
        //                                   this.imageryList); // FIXME: load this
    };

}]);
