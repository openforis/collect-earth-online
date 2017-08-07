angular.module("home", []).controller("HomeController", ["$http", function HomeController($http) {
    this.root = "";
    this.userId = "";
    this.institutionList = [];
    this.projectList = [];
    this.userList = [];
    this.imageryList = [];

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
        var el2 = document.getElementById("lPanel");
        var el = document.getElementById("mapPanel");
        var el3 = document.getElementById("togglePanel-button");
        var el4 = document.getElementById("btnHolder");
        if(el2.style.display == 'none')
        {
        el2.style.display = "block";
                el.style.width = "75%";
                el3.value = "<<";
                el4.style.width = "25%";
        }
        else{
        el2.style.display = "none";
        el.style.width = "100%";
        el3.value = ">>";
        el4.style.width = "0%";
        }
        map_utils.map_ref.updateSize();
    };

    this.updateMapSize = function () {
        console.info("resize");
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
