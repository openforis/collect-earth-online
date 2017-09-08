angular.module("home", []).controller("HomeController", ["$scope", "$http", "$window", function HomeController($scope, $http, $window) {
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
    this.windowWidth;
    this.mobileDisplay = "block";
    this.togglebtn = "auto";

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
        if($scope.home.windowWidth <= 600)
        {
            if(this.showPanel == true)
            {
                    this.showPanel = false;
                    this.mapWidth = "100%";
                    this.toggleValue = ">>";
                    this.btnHolderWidth = "0%";
                    this.mobileDisplay = "block";
                    this.togglebtn = "auto;"
            }
            else{
                this.showPanel = true;
                this.mapWidth = "0%";
                this.toggleValue = "<<";
                this.btnHolderWidth = "100%";
                this.mobileDisplay = "none";
                this.togglebtn = "0px;"
            }
        }
        else{
            this.mobileDisplay = "block";
            this.togglebtn = "auto;"
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
        }
        $scope.$$postDigest(function() {
            map_utils.map_ref.updateSize();
        });
    };

    this.updateMapSize = function () {
        map_utils.map_ref.updateSize();
    };

    this.checkResizing = function () {
        if($window.innerWidth <= 600)
        {
            if(this.showPanel == false)
            {
                    this.mapWidth = "100%";
                    this.toggleValue = ">>";
                    this.btnHolderWidth = "0%";
                    this.mobileDisplay = "block";
                    this.togglebtn = "auto;"

            }
            else{
                this.mapWidth = "0%";
                this.toggleValue = "<<";
                this.btnHolderWidth = "100%";
                this.mobileDisplay = "none";
                this.togglebtn = "0px;"
            }
        }
        else{
            this.mobileDisplay = "block";
            this.togglebtn = "auto;"
            if(this.showPanel == false)
            {
                    this.mapWidth = "100%";
                    this.toggleValue = ">>";
                    this.btnHolderWidth = "0%";
            }
            else{
            whatami = this;
                this.mapWidth = "75%";
                this.toggleValue = "<<";
                this.btnHolderWidth = "25%";
            }
        }
        if(!$scope.$$phase)
        {
            $scope.$apply();
        }
        $scope.home.updateMapSize();
    };

    this.initialize = function (documentRoot, userId) {
        // Make the current documentRoot globally available
        this.root = documentRoot;
        this.userId = userId;
        this.windowWidth = $window.innerWidth;
        angular.element($window).bind('resize', function(){
                   $scope.home.windowWidth = $window.innerWidth;
                   $scope.home.checkResizing()
         });
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

            // Show the DigitalGlobe RecentImagery layer
            map_utils.set_current_imagery("DigitalGlobeRecentImagery");

            // Draw markers on the map for each project
            map_utils.draw_project_markers(this.projectList, this.root);
        }
        whatami = this;
        if($window.innerWidth <= 600){
            this.showPanel = false;
            try{
                this.checkResizing();
            }
            catch(e){}
        }
    };

}]);

var whatami;
