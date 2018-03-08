angular.module("home", []).controller("HomeController", ["$http", function HomeController($http) {
    this.root = "";
    this.userId = "";
    this.institutionList = null;
    this.projectList = null;
    this.imageryList = null;

    this.getInstitutionList = function () {
        $http.get(this.root + "/get-all-institutions")
            .then(angular.bind(this, function successCallback(response) {
                this.institutionList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution list. See console for details.");
            });
    };

    this.getProjectList = function () {
        $http.get(this.root + "/get-all-projects?userId=" + this.userId)
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
                this.initialize(this.root, this.userId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.getImageryList = function () {
        $http.get(this.root + "/get-all-imagery")
            .then(angular.bind(this, function successCallback(response) {
                this.imageryList = response.data;
                this.initialize(this.root, this.userId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    this.initialize = function (documentRoot, userId) {
        // Make the current documentRoot and userId globally available
        this.root = documentRoot;
        this.userId = userId;

        if (this.imageryList == null) {
            // Load the imageryList
            this.getImageryList();
        } else if (this.projectList == null) {
            // Load the projectList
            this.getProjectList();
        } else {
            // Load the institutionList
            this.getInstitutionList();

            // Display the project map
            map_utils.digital_globe_base_map({div_name: "home-map-pane",
                                              center_coords: [0.0, 0.0],
                                              zoom_level: 1},
                                             this.imageryList);

            // Show the DigitalGlobe RecentImagery layer
            map_utils.set_current_imagery("DigitalGlobeRecentImagery");

            // Draw markers on the map for each project
            map_utils.draw_project_markers(this.projectList, this.root);
        }
    };

}]);
