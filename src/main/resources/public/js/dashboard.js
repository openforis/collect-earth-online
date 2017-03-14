/*****************************************************************************
 ***
 *** Create the dashboard object to act as a namespace for this file
 ***
 *****************************************************************************/

var dashboard = {};

dashboard.controller = function ($scope) {
    // FIXME: set using AJAX request
    $scope.projectList = ceo_sample_data.project_list;

    $scope.getProjectById = function (projectId) {
        var i = 0;
        for (i = 0; i < $scope.projectList.length; i++) {
            if ($scope.projectList[i].id == projectId) {
                return $scope.projectList[i];
            }
        }
        return null;
    };

    $scope.currentProjectId = document.getElementById("initial-project-id").value;
    $scope.currentProject = $scope.getProjectById($scope.currentProjectId);
    $scope.currentPlot = null;
    $scope.currentSamples = [];
    $scope.userSamples = {};

    // Initialize the base map and show the selected project's boundary
    map_utils.digital_globe_base_map({div_name: "image-analysis-pane",
                                      center_coords: [102.0, 17.0],
                                      zoom_level: 5});
    map_utils.set_current_imagery($scope.currentProject.imagery);
    map_utils.draw_polygon($scope.currentProject.boundary);

    $scope.switchProject = function () {
        var newProject = $scope.getProjectById($scope.currentProjectId);

        if (newProject) {
            $scope.currentProject = newProject;
            $scope.currentPlot = null;
            $scope.currentSamples = [];
            $scope.userSamples = {};
            map_utils.remove_plot_layer();
            map_utils.remove_sample_layer();
            map_utils.disable_selection();
            utils.enable_element("new-plot-button");
            utils.disable_element("flag-plot-button");
            utils.disable_element("save-values-button");
            map_utils.set_current_imagery(newProject.imagery);
            map_utils.draw_polygon(newProject.boundary);
        }
    };

    // FIXME: Review this function
    $scope.loadRandomPlot = function () {
        if ($scope.currentProject) {
            var currProj = ceo_sample_data.plot_data[$scope.currentProject.id];
            var numPlots = currProj.length;
            var rndmPlotId = Math.floor((Math.random() * numPlots) + 1);
            var rndmPlot = currProj[rndmPlotId];

            map_utils.draw_buffer(rndmPlot.plot.center, rndmPlot.plot.radius);
            map_utils.draw_points(rndmPlot.samples);
        }
    };

    // FIXME: Stub
    $scope.setCurrentValue = function (sample) {
        window.alert("Called setCurrentValue");
    };

    // FIXME: Stub
    $scope.saveValues = function () {
        window.alert("Called saveValues");
    };

    // FIXME: Stub
    $scope.flagPlot = function () {
        window.alert("Called flagPlot");
    };
};

angular
    .module('collectEarth')
    .controller('dashboard.controller', dashboard.controller);
