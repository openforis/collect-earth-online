/*****************************************************************************
 ***
 *** Create the admin object to act as a namespace for this file
 ***
 *****************************************************************************/

var admin = {};

// FIXME: admin.controller needs to define these terms:
// - removeSampleValueRow(sampleValue.id)
// - addSampleValueRow()
admin.controller = function ($scope) {
    // FIXME: Set using an AJAX request
    $scope.projectList = ceo_sample_data.project_list;
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
        var project = $scope.getProjectById($scope.currentProjectId);
        $scope.currentProject = project;

        if (project) {
            // FIXME: Set using an AJAX request
            var plotData = ceo_sample_data.plot_data[$scope.currentProjectId];
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

    // FIXME: stub
    $scope.exportCurrentPlotData = function () {
        alert("Called exportCurrentPlotData()");
    };

    // FIXME: stub
    $scope.submitForm = function () {
        alert("Called submitForm()");
    };

    // FIXME: stub
    $scope.setSampleType = function (sampleType) {
        alert("Called sampleType(" + sampleType + ")");
        if (sampleType == "random") {
            utils.enable_element("samples-per-plot");
            utils.disable_element("sample-resolution");
        } else {
            utils.disable_element("samples-per-plot");
            utils.enable_element("sample-resolution");
        }
    };

    // FIXME: stub
    $scope.setCurrentImagery = function () {
        alert("Called setCurrentImagery()");
    };

    // FIXME: Review and fix the code below this point

    ////////////////////
    // $scope.newSample = [];
    // var extents0 = map_utils.current_boundary.getSource().getExtent();
    // var extents = ol.extent.applyTransform(extents0, ol.proj.getTransform("EPSG:3857", "EPSG:4326"));
    // map_utils.current_bbox = {minlon: extents[0],
    //                           minlat: extents[1],
    //                           maxlon: extents[2],
    //                           maxlat: extents[3]};
    // map_utils.set_bbox_coords();
    ////////////////////

    // Initialize New Sample Value Fields

    $scope.addSample = function() {
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

        $scope.currentProject.sample_values.push(newSampleItem);
        $scope.newSample.push(newSampleItem);
    }

    map_utils.set_bbox_coords = function() {
        var latmax = document.getElementById('lat-max');
        var lonmax = document.getElementById('lon-max');
        var latmin = document.getElementById('lat-min');
        var lonmin = document.getElementById('lon-min');

        latmax.value = map_utils.current_bbox.maxlat;
        lonmax.value = map_utils.current_bbox.maxlon;
        latmin.value = map_utils.current_bbox.minlat;
        lonmin.value = map_utils.current_bbox.minlon;
    }
};

angular
    .module('collectEarth')
    .controller('admin.controller', admin.controller);
