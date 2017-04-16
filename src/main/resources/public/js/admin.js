/*****************************************************************************
 ***
 *** Create the admin object to act as a namespace for this file
 ***
 *****************************************************************************/

var admin = {};

admin.controller = function ($scope, $http) {
    $scope.projectList = getProjectList($http);
    $scope.currentProjectId = "0";
    $scope.currentProject = null;
    $scope.projectName = "";
    $scope.projectDescription = "";
    $scope.numPlots = "";
    $scope.plotRadius = "";
    $scope.sampleType = "random";
    $scope.samplesPerPlot = "";
    $scope.sampleResolution = "";
    $scope.lonMin = "";
    $scope.latMin = "";
    $scope.lonMax = "";
    $scope.latMax = "";
    $scope.currentImagery = "DigitalGlobeRecentImagery+Streets";
    $scope.valueName = "";
    $scope.valueColor = "#000000";
    $scope.valueImage = "";
    $scope.sampleValues = [];

    // Initialize the base map and enable the dragbox interaction
    map_utils.digital_globe_base_map({div_name: "new-project-map",
                                      center_coords: [102.0, 17.0],
                                      zoom_level: 5});
    map_utils.enable_dragbox_draw();

    map_utils.set_bbox_coords = function () {
        var latmax = document.getElementById("lat-max");
        var lonmax = document.getElementById("lon-max");
        var latmin = document.getElementById("lat-min");
        var lonmin = document.getElementById("lon-min");
        latmax.value = map_utils.current_bbox.maxlat;
        lonmax.value = map_utils.current_bbox.maxlon;
        latmin.value = map_utils.current_bbox.minlat;
        lonmin.value = map_utils.current_bbox.minlon;
    }

    $scope.deleteCurrentProject = function() {
        $http.get("archive-project").
            then (function() {
                alert("Project \"" + $scope.projectName + "\" has been deleted." + "\n");
                $scope.currentProjectId = 0;
                getProjectList();
            }, function(response) {
                console.log(response.status);
            });
    }

    $scope.getProjectById = function (projectId) {
        $scope.projectList.find(
            function (project) {
                return project.id == projectId;
            }
        );
    };

    $scope.setCurrentProject = function() {
        var project = $scope.getProjectById($scope.currentProjectId);
        $scope.currentProject = project;

        if (project) {
            var plotData = $scope.projectList.plot_data[$scope.currentProjectId];
            $scope.projectName = project.name;
            $scope.projectDescription = project.description;
            $scope.numPlots = plotData.length;
            $scope.plotRadius = plotData[0].plot.radius;
            if (project.sample_resolution) {
                $scope.sampleType = "gridded";
                document.getElementById("gridded-sample-type").checked = true;
                utils.enable_element("samples-per-plot");
                utils.enable_element("sample-resolution");
            } else {
                $scope.sampleType = "random";
                document.getElementById("random-sample-type").checked = true;
                utils.enable_element("samples-per-plot");
                utils.disable_element("sample-resolution");
            }
            $scope.samplesPerPlot = plotData[0].samples.length;
            $scope.sampleResolution = project.sample_resolution || "";
            var boundaryExtent = map_utils.polygon_extent(project.boundary);
            $scope.lonMin = boundaryExtent[0];
            $scope.latMin = boundaryExtent[1];
            $scope.lonMax = boundaryExtent[2];
            $scope.latMax = boundaryExtent[3];
            $scope.currentImagery = project.imagery;
            map_utils.set_current_imagery($scope.currentImagery);
            map_utils.disable_dragbox_draw();
            map_utils.draw_polygon(project.boundary);
            $scope.sampleValues = project.sample_values;
        } else {
            $scope.projectName = "";
            $scope.projectDescription = "";
            $scope.numPlots = "";
            $scope.plotRadius = "";
            $scope.sampleType = "random";
            document.getElementById("random-sample-type").checked = true;
            utils.enable_element("samples-per-plot");
            utils.disable_element("sample-resolution");
            $scope.samplesPerPlot = "";
            $scope.sampleResolution = "";
            $scope.lonMin = "";
            $scope.latMin = "";
            $scope.lonMax = "";
            $scope.latMax = "";
            $scope.currentImagery = "DigitalGlobeRecentImagery+Streets";
            map_utils.set_current_imagery($scope.currentImagery);
            map_utils.enable_dragbox_draw();
            map_utils.map_ref.removeLayer(map_utils.current_boundary);
            map_utils.current_boundary = null;
            map_utils.zoom_and_recenter_map(102.0, 17.0, 5);
            $scope.sampleValues = [];
        }
    };

    $scope.exportCurrentPlotData = function () {
        var project_id = parseInt($scope.currentProjectId);
        if (project_id != 0) {
            $http.post("dump-project-aggregate-data",
                       {project_id: project_id})
                .then(function successCallback(response) {
                    window.open(response.data);
                }, function errorCallback(response) {
                    console.log(response);
                    alert("Error downloading data for this project. See the console for more information.");
                });
        }
    };

    $scope.submitForm = function ($event) {
        if ($scope.currentProjectId != "0") {
            if (confirm("Do you REALLY want to delete this project?!")) {
                $scope.deleteCurrentProject();
            }
        } else {
            $event.currentTarget.value = "Processing...please wait...";
            document.getElementById("spinner").style.visibility = "visible";
            document.getElementById("project-management-form").submit();
        }
    };

    $scope.setSampleType = function (sampleType) {
        if (sampleType == "random") {
            utils.enable_element("samples-per-plot");
            utils.disable_element("sample-resolution");
        } else {
            utils.disable_element("samples-per-plot");
            utils.enable_element("sample-resolution");
        }
    };

    $scope.setCurrentImagery = function () {
        map_utils.set_current_imagery($scope.currentImagery);
    };

    $scope.removeSampleValueRow = function (sampleValueName) {
        $scope.sampleValues = $scope.sampleValues.filter(
            function (sampleValue) {
                return sampleValue.name != sampleValueName;
            }
        );
    };

    $scope.addSampleValueRow = function () {
        var name = $scope.valueName;
        var color = $scope.valueColor;
        var image = $scope.valueImage;

        if (name != "") {
            $scope.sampleValues.push({name: name, color: color, image: image});
            $scope.valueName = "";
            $scope.valueColor = "#000000";
            $scope.valueImage = "";
        } else {
            alert("A sample value must possess both a name and a color.");
        }
    };

};

var getProjectList = function ($http) {
    //  FIXME:  GARY - Once the get-all-projects route is created, uncomment the block of code below
    /*    $http.get("get-all-projects").
          then (function(data) {
          return data;
          }, function(response) {
          console.log(response.status);
          return {};
          });
    */
    return ceo_sample_data.project_list;
}

angular
    .module("collectEarth")
    .controller("admin.controller", admin.controller);
