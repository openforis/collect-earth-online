angular.module("home", []).controller("HomeController", ["$http", function HomeController($http) {
    this.root = "";
    this.userId = "";
    this.institutionList = [];
    this.projectList = [];
    this.userList = [];
    this.imageryList = [];
    this.showPanel = true;
    this.mapWidth = "75%";
    this.toggleValue = "<<";
    this.btnHolderWidth = "25%";

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
                this.initialize(this.root, this.userId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.getUserList = function () {
        $http.get(this.root + "/get-all-users")
            .then(angular.bind(this, function successCallback(response) {
                this.userList = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the user list. See console for details.");
            });
    };

    this.getImageryList = function () {
        $http.get(this.root + "/get-all-imagery?institutionId=")
            .then(angular.bind(this, function successCallback(response) {
                this.imageryList = response.data;
                this.initialize(this.root, this.userId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    this.togglePanel = function () {
        var el4 = document.getElementById("btnHolder");
        if(this.showPanel == true)
        {
                this.showPanel = false;
                this.mapWidth = "100%";
                this.toggleValue = ">>";
                this.btnHolderWidth = "0%";
        }
        else{
            this.showPanel = true;
            this.mapWidth = "75%";
            this.toggleValue = "<<";
            this.btnHolderWidth = "25%";
        }
        //this didn't work without the timeout
        //Maybe there is a better way to update after the variable changes the targeted element
        setTimeout(this.updateMapSize, 50);
    };

    this.updateMapSize = function () {
        map_utils.map_ref.updateSize();
    };

    this.initialize = function (documentRoot, userId) {
        // Make the current documentRoot globally available
        this.root = documentRoot;
        this.userId = userId;

        if (angular.equals(this.imageryList, [])) {
            // Load the imageryList
            this.getImageryList();
        } else if (angular.equals(this.projectList, [])) {
            // Load the projectList for this userId
            this.getProjectList(userId);
        } else {
            // Load the institutionList
            this.getInstitutionList();

            // Load the userList
            this.getUserList();

            // Display the project map
            map_utils.digital_globe_base_map({div_name: "home-map-pane",
                                              center_coords: [0.0, 0.0],
                                              zoom_level: 1},
                                             this.imageryList);

            // Draw markers on the map for each project
            map_utils.draw_project_markers(this.projectList);

            // Set onresize event handler for different browsers
            window.onresize = this.updateMapSize;
            window.addEventListener("resize", this.updateMapSize());
        }
    };

}]);
