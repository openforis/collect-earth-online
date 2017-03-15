/*****************************************************************************
 ***
 *** Create the admin object to act as a namespace for this file
 ***
 *****************************************************************************/

var admin = {};

// FIXME: admin.controller needs to define these terms:
// - currentProjectId (set to "0" initially)
// - setCurrentProject()
// - projectList
// - exportCurrentPlotData()
// - submitForm()
// - projectName
// - projectDescription
// - numPlots
// - plotRadius
// - setSampleType('random')
// - setSampleType('gridded')
// - currentSampleType
// - samplesPerPlot
// - sampleResolution
// - latMin
// - latMax
// - lonMin
// - lonMax
// - currentImagery = "DigitalGlobeRecentImagery+Streets"
// - setCurrentImagery()
// - currentSampleValues
// - removeSampleValueRow(sampleValue.id)
// - valueName
// - valueColor
// - valueImage
// - addSampleValueRow()
// - sampleValues
admin.controller = function ($scope) {
    // FIXME: Set using an AJAX request
    $scope.projectList = ceo_sample_data.project_list;

    // Initialize the base map and enable the dragbox interaction
    map_utils.digital_globe_base_map({div_name: "new-project-map",
                                      center_coords: [102.0, 17.0],
                                      zoom_level: 5});
    map_utils.enable_dragbox_draw();

    // FIXME: Review and fix the code below this point

    // Initialize New Sample Value Fields
    resetNewSampleValue($scope);

    $scope.imageryInfoText = map_utils.current_imagery;

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
        resetNewSampleValue($scope);
    }

    $scope.setCurrentProject = function() {
        $scope.test = $scope.currentProjectId;
        $scope.newSample = [];
        resetNewSampleValue($scope);


        $scope.currentProject = getProject($scope.currentProjectId);

        if ($scope.currentProject) {
            $scope.imageryInfoText = $scope.currentProject.attribution;
            map_utils.set_current_imagery($scope.currentProject.imagery);
            map_utils.remove_plot_layer();
            map_utils.remove_sample_layer();
            map_utils.draw_polygon($scope.currentProject.boundary);
            map_utils.disable_dragbox_draw();

            $scope.currentImagery = $scope.currentProject.imagery;

            // Populate lat-max,lat-min, lon-mat, lon-min inut fields with data from project
            var extents0 = map_utils.current_boundary.getSource().getExtent();
            var extents = ol.extent.applyTransform(extents0, ol.proj.getTransform("EPSG:3857", "EPSG:4326"));
            map_utils.current_bbox = {minlon: extents[0],
                                      minlat: extents[1],
                                      maxlon: extents[2],
                                      maxlat: extents[3]};
            map_utils.set_bbox_coords();

            // Populate other input fields with data from project
            $scope.projectName = $scope.currentProject.name;
            $scope.projectDescription = $scope.currentProject.description;
            $scope.numPlots = 3;
            $scope.plotRadius = ceo_sample_data.plot_data[$scope.currentProject.id][0].plot.radius;
            $scope.samplesPerPlot = ceo_sample_data.plot_data[$scope.currentProject.id][0].samples.length;
            $scope.sampleResolution = "";
        }
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

function getProject(projectId) {
    var i = 0;
    for (i=0; i < ceo_sample_data.project_list.length; i++) {
        if (ceo_sample_data.project_list[i].id == projectId) {
            return ceo_sample_data.project_list[i];
        }
    }
}

function resetNewSampleValue($scope) {
    $scope.valueName = "";
    $scope.valueColor = "#000000";
    $scope.valueImage = null;
}

angular
    .module('collectEarth')
    .controller('admin.controller', admin.controller);
