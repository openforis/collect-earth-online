angular.module("home", []).controller("HomeController", ["$http", function HomeController($http) {
    this.institutionList = null;
    this.projectList = null;
    this.imageryList = null;
    this.mapConfig = null;

    this.getInstitutionList = function (documentRoot, userId) {
        $http.get(documentRoot + "/get-all-institutions")
            .then(angular.bind(this, function successCallback(response) {
                this.institutionList = response.data;
                this.initialize(documentRoot, userId);
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
        if (this.imageryList.length > 0) {
            this.mapConfig = mercator.createMap("home-map-pane", [0.0, 0.0], 1, this.imageryList);
            mercator.setVisibleLayer(this.mapConfig, this.imageryList[0].title);
            if (this.projectList.length > 0) {
                mercator.addProjectMarkersAndZoom(this.mapConfig,
                                                  this.projectList,
                                                  documentRoot,
                                                  40); // clusterDistance = 40, use null to disable clustering
            }
        }
    };

    this.initialize = function (documentRoot, userId) {
        alert(documentRoot);
        if (this.institutionList == null) {
                // Load the institutionList
                this.getInstitutionList(documentRoot, userId);
        } else if (this.projectList == null) {
            // Load the projectList
            this.getProjectList(documentRoot, userId);
        } else if (this.imageryList == null) {
            // Load the imageryList
            this.getImageryList(documentRoot, userId);
        } else {
            // Display the world map and project markers
            this.showProjectMap(documentRoot);
        }
    };

}]);
