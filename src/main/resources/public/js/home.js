angular.module("home", []).controller("HomeController", ["$http", function HomeController($http) {
    this.institutionList = null;
    this.projectList = null;
    this.imageryList = null;
    this.mapConfig = null;

    this.getInstitutionList = function (documentRoot) {
        $http.get(documentRoot + "/get-all-institutions")
            .then(angular.bind(this, function successCallback(response) {
                this.institutionList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution list. See console for details.");
            });
    };

    this.getProjectList = function (documentRoot, userId) {
        $http.get(documentRoot + "/get-all-projects?userId=" + userId)
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
                this.initialize(documentRoot, userId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.getImageryList = function (documentRoot, userId) {
        $http.get(documentRoot + "/get-all-imagery")
            .then(angular.bind(this, function successCallback(response) {
                this.imageryList = response.data;
                this.initialize(documentRoot, userId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    this.showProjectMap = function (documentRoot) {
        this.mapConfig = mercator.createMap("home-map-pane", [0.0, 0.0], 1, this.imageryList);
        mercator.setVisibleLayer(this.mapConfig, "DigitalGlobeRecentImagery");
        mercator.addProjectMarkers(this.mapConfig, this.projectList, documentRoot);
        mercator.zoomMapToLayer(this.mapConfig, "projectMarkers");
    };

    this.initialize = function (documentRoot, userId) {
        if (this.imageryList == null) {
            // Load the imageryList
            this.getImageryList(documentRoot, userId);
        } else if (this.projectList == null) {
            // Load the projectList
            this.getProjectList(documentRoot, userId);
        } else {
            // Load the institutionList
            this.getInstitutionList(documentRoot);

            // Display the world map and project markers
            this.showProjectMap(documentRoot);
        }
    };

}]);
