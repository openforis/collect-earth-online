/*****************************************************************************
 ***
 *** Create the admin object to act as a namespace for this file
 ***
 *****************************************************************************/

var admin = {};

admin.controller = function ($scope, $http) {
    // FIXME: Set using an AJAX request 
    $scope.projectList = ceo_sample_data.project_list;
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

    $scope.getProjectById = function (projectId) {
        for (var i = 0; i < $scope.projectList.length; i++) {
            if ($scope.projectList[i].id == projectId) {
                return $scope.projectList[i];
            }
        }
        return null;
    };

    $scope.setCurrentProject = function() {
        // FIXME: Set using an AJAX request
        var project = $scope.getProjectById($scope.project.currentProjectId);
        $scope.currentProject = project;

        if (project) {
            // FIXME: Set using an AJAX request
            $scope.plotData = ceo_sample_data.plot_data[$scope.project.currentProjectId];
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

    // FIXME: Set using an AJAX request 
        $scope.exportCurrentPlotData = function () {
        alert("Called exportCurrentPlotData()");
        //FIXME:  dump-project-aggregate-data [project id]
        var csv = "data:text/csv;charset=utf-8,"; 
        csv += 'PLOT_ID,CENTER_LON,CENTER_LAT,RADIUS_M,SAMPLE_POINTS\n';
        $scope.plotData.forEach(function(row) {
           var plotID = JSON.parse(row.plot.id);
           var centerLon = JSON.parse(row.plot.center).coordinates[0];
           var centerLat = JSON.parse(row.plot.center).coordinates[1];
           var plotRadius = JSON.parse(row.plot.radius);
           var samplePoints = row.samples.length;
           csv += plotID + ',' + centerLon + ',' + centerLat + ',' + plotRadius + ',' + samplePoints;
           csv += "\n";
        });

       var encodedUri = encodeURI(csv);
       var link = document.createElement("a");
       link.setAttribute("href", encodedUri);
       link.setAttribute("download", $scope.currentProject.name.replace(/\s+/g, "_") + ".csv" );
       document.body.appendChild(link); // Required for FF
       link.click();
    };


    $scope.submitForm = function ($event) {
        if ($scope.project.currentProjectId != "0") {
           if (confirm("Do you REALLY want to delete this project?!")) {
              alert("Project \"" + $scope.project.projectName + "\" has been deleted." + "\n");
              // FIXME:  remote-callback :archive-project [project id]
              // FIXME:  remote-callback :get-all-projects
           }

           var spinnerElem = document.getElementById("spinner");
           spinnerElem.style.visibility = "visible";
           $scope.project.buttonDelete = $event.currentTarget;
           $scope.project.buttonDelete.value = "Processing...please wait...";

           postFormData($scope.project, $http).
              then(function(response) {
                 console.log(response.config.data);
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


var postFormData = function (project, $http) {
   return $http.post('clone', project);
}


angular
    .module('collectEarth')
    .controller('admin.controller', admin.controller);
