angular.module("home", []).controller("HomeController", ["$http", "$window", function HomeController($http, $window) {
    this.root = "";
    this.institutionList = [];
    this.projectList = [];
    this.userList = [];
    this.imageryList = [{"id":1,"title":"DigitalGlobeRecentImagery","extent":null,"source_config":{"type":"DigitalGlobe","imagery_id":"digitalglobe.nal0g75k","access_token":"pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNqM2RuZTE3dTAwMncyd3Bwanh4MHJ1cmgifQ.LNrR2h_I0kz6fra93XGP2g"}},{"id":2,"title":"DigitalGlobeRecentImagery+Streets","extent":null,"source_config":{"type":"DigitalGlobe","imagery_id":"digitalglobe.nal0mpda","access_token":"pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNqM2RuZTE3dTAwMncyd3Bwanh4MHJ1cmgifQ.LNrR2h_I0kz6fra93XGP2g"}},{"id":3,"title":"BingAerial","extent":null,"source_config":{"type":"BingMaps","imagery_id":"Aerial","access_token":"AlQPbThspGcsiCnczC-2QVOYU9u_PrteLw6dxNQls99dmLXcr9-qWCM5J4Y2G-pS"}},{"id":4,"title":"BingAerialWithLabels","extent":null,"source_config":{"type":"BingMaps","imagery_id":"AerialWithLabels","access_token":"AlQPbThspGcsiCnczC-2QVOYU9u_PrteLw6dxNQls99dmLXcr9-qWCM5J4Y2G-pS"}},{"id":5,"title":"NASASERVIRChipset2002","extent":[10298030,898184,12094575,2697289],"source_config":{"type":"GeoServer","geoserver_url":"http://pyrite.sig-gis.com/geoserver/wms","geoserver_params":{"LAYERS":"servir:yr2002","TILED":true}}},{"id":6,"title":"DigitalGlobeWMSImagery","extent":null,"source_config":{"type":"GeoServer","geoserver_url":"https://services.digitalglobe.com/mapservice/wmsaccess","geoserver_params":{"VERSION":"1.1.1","LAYERS":"DigitalGlobe:Imagery","CONNECTID":"a797f723-f91f-40d7-8458-3669a830b6de"}}}];

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
    this.togglePanel = function()
    {
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
    }

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
        map_utils.digital_globe_base_map({div_name: "home-map-pane",
                                                      center_coords: [0.0, 0.0],
                                                      zoom_level: 1},
                                                     this.imageryList);

        window.onresize = function(event) {
           console.info("resize");
                            map_utils.map_ref.updateSize();
        };
        window.addEventListener('resize', () => { console.info("resize");
                                                                              map_utils.map_ref.updateSize(); });




    };

}]);
