/*****************************************************************************
 ***
 *** Create the admin object to act as a namespace for this file
 ***
 *****************************************************************************/

var admin = {};

admin.controller = function ($scope, $http) {
    // FIXED: Set using an AJAX request 
    $scope.projectList = getProjectList($http);
    $scope.project = {};
    $scope.project.currentProjectId = "0";
    $scope.currentProject = null;
    $scope.plotData = null;
    $scope.project.projectName = "";
    $scope.project.projectDescription = "";
    $scope.project.numPlots = "";
    $scope.project.plotRadius = "";
    $scope.project.sampleType = "random";
    $scope.project.samplesPerPlot = "";
    $scope.project.sampleResolution = "";
    $scope.project.lonMin = "";
    $scope.project.latMin = "";
    $scope.project.lonMax = "";
    $scope.project.latMax = "";
    $scope.project.currentImagery = "DigitalGlobeRecentImagery+Streets";
    $scope.valueName = "";
    $scope.valueColor = "#000000";
    $scope.valueImage = "";
    $scope.project.sampleValues = [];
    $scope.project.isGridded = false;

    // Initialize the base map and enable the dragbox interaction
    map_utils.digital_globe_base_map({div_name: "new-project-map",
                                      center_coords: [102.0, 17.0],
                                      zoom_level: 5});
    map_utils.enable_dragbox_draw();

    map_utils.set_bbox_coords = function () {
        var latmax = document.getElementById('lat-max');
        var lonmax = document.getElementById('lon-max');
        var latmin = document.getElementById('lat-min');
        var lonmin = document.getElementById('lon-min');
        latmax.value = map_utils.current_bbox.maxlat;
        lonmax.value = map_utils.current_bbox.maxlon;
        latmin.value = map_utils.current_bbox.minlat;
        lonmin.value = map_utils.current_bbox.minlon;
    }

    $scope.deleteCurrentProject = function() {
        $http.get('archive-project').
            then (function() {
                alert("Project \"" + $scope.project.projectName + "\" has been deleted." + "\n");
                $scope.project.currentProjectId = 0;
                getProjectList();            
            }, function(response) {
                console.log(response.status);
            });
    }

    $scope.getProjectById = function (projectId) {
        for (var i = 0; i < $scope.projectList.length; i++) {
            if ($scope.projectList[i].id == projectId) {
                return $scope.projectList[i];
            }
        }
        return null;
    };

    $scope.setCurrentProject = function() {
        var project = $scope.getProjectById($scope.project.currentProjectId);
        $scope.currentProject = project;

        if (project) {
            // FIXED: Set using an AJAX request
            $scope.plotData = $scope.projectList.plot_data[$scope.project.currentProjectId];
            $scope.project.projectName = project.name;
            $scope.project.projectDescription = project.description;
            $scope.project.numPlots = $scope.plotData.length;
            $scope.project.plotRadius = $scope.plotData[0].plot.radius;
            if (project.sample_resolution) {
                $scope.project.sampleType = "gridded";
                document.getElementById("gridded-sample-type").checked = true;
                utils.enable_element("samples-per-plot");
                utils.enable_element("sample-resolution");
            } else {
                $scope.project.sampleType = "random";
                document.getElementById("random-sample-type").checked = true;
                utils.enable_element("samples-per-plot");
                utils.disable_element("sample-resolution");
            }
            $scope.project.samplesPerPlot = $scope.plotData[0].samples.length;
            $scope.project.sampleResolution = project.sample_resolution || "";
            var boundaryExtent = map_utils.polygon_extent(project.boundary);
            $scope.project.lonMin = boundaryExtent[0];
            $scope.project.latMin = boundaryExtent[1];
            $scope.project.lonMax = boundaryExtent[2];
            $scope.project.latMax = boundaryExtent[3];
            $scope.project.currentImagery = project.imagery;
            map_utils.set_current_imagery($scope.project.currentImagery);
            map_utils.disable_dragbox_draw();
            map_utils.draw_polygon(project.boundary);
            $scope.project.sampleValues = project.sample_values;
        } else {
            $scope.project.projectName = "";
            $scope.project.projectDescription = "";
            $scope.project.numPlots = "";
            $scope.project.plotRadius = "";
            $scope.project.sampleType = "random";
            document.getElementById("random-sample-type").checked = true;
            utils.enable_element("samples-per-plot");
            utils.disable_element("sample-resolution");
            $scope.project.samplesPerPlot = "";
            $scope.project.sampleResolution = "";
            $scope.project.lonMin = "";
            $scope.project.latMin = "";
            $scope.project.lonMax = "";
            $scope.project.latMax = "";
            $scope.project.currentImagery = "DigitalGlobeRecentImagery+Streets";
            map_utils.set_current_imagery($scope.project.currentImagery);
            map_utils.enable_dragbox_draw();
            map_utils.map_ref.removeLayer(map_utils.current_boundary);
            map_utils.current_boundary = null;
            map_utils.zoom_and_recenter_map(102.0, 17.0, 5);
            $scope.project.sampleValues = [];
        }
    };

    // FIXED: Set using an AJAX request 
    $scope.exportCurrentPlotData = function () {
        var projId = {project_id: $scope.project.currentProjectId};
        var data = JSON.stringify(projId);
        if ($scope.project.currentProjectId != 0) {
            $http.post('dump_project_aggregate_data', data).
            then(function(data) {
                window.open(data);
            }, function(response) {
                console.log(response.status);
            });
        } 
    };


    $scope.submitForm = function ($event) {
        if ($scope.project.currentProjectId != "0") {
           if (confirm("Do you REALLY want to delete this project?!")) {
               $scope.deleteCurrentProject();
           } 

           var spinnerElem = document.getElementById("spinner");
           spinnerElem.style.visibility = "visible";
           $scope.project.buttonDelete = $event.currentTarget;
           $scope.project.buttonDelete.value = "Processing...please wait...";
           

           postFormData($scope.project, $http).
               then(function(response, data, status, headers) {
                   spinnerElem.style.visibility = "hidden";
                   response.config.data["buttonDelete"].value = "Delete this project";
               }, function(response) { 
                   console.log(response.status);
               });
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
        map_utils.set_current_imagery($scope.project.currentImagery); 
    };

    $scope.removeSampleValueRow = function (sampleValueId) {
        // Find and remove item from array
        var i = $scope.project.sampleValues.indexOf(sampleValueId);
        if(i != 1) {
           $scope.project.sampleValues.splice(i,1);
        }	
    };

    $scope.addSampleValueRow = function () {
        var id = 0;
        var imageVal = null;

        if ($scope.currentProject) {
            id = $scope.currentProject.sample_values[$scope.currentProject.sample_values.length - 1].id + 1;
        }

        if ($scope.valueImage) {
            imageVal = $scope.valueImage;
        }

        var newSampleItem = {
            color: $scope.valueColor,
            value: $scope.valueName,
            id: id,
            image: imageVal
        }

        $scope.project.sampleValues.push(newSampleItem);
    };

};

var getProjectList = function ($http) {
//  FIXME:  GARY - Once the get-all-projects route is created, uncomment the block of code below
/*    $http.get('get-all-projects').
        then (function(data) {
            return data;
        }, function(response) {
            console.log(response.status);
            return {};
        });
*/

    return ceo_sample_data.project_list;  
}

var postFormData = function (data, $http) {
   return $http.post('admin', data);
}


angular
    .module('collectEarth')
    .controller('admin.controller', admin.controller);
