/*****************************************************************************
 ***
 *** Create the dashboard object to act as a namespace for this file
 ***
 *****************************************************************************/

var dashboard = {};

dashboard.controller = function ($scope, $http) {
    // FIXED: Set using an AJAX request
    $scope.projectList = getProjectList($http);

    $scope.getProjectById = function (projectId) {
        for (var i = 0; i < $scope.projectList.length; i++) {
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

    $scope.loadRandomPlot = function () {
        // FIXED: Set using an AJAX request
       // var currentProjectPlots = ceo_sample_data.plot_data[$scope.currentProjectId];
        var currentProjectPlots  = $scope.projectList.plot_data[$scope.project.currentProjectId];
        var randomIndex = Math.floor(Math.random() * currentProjectPlots.length);
        var newPlot = currentProjectPlots[randomIndex].plot;
        var newSamples = currentProjectPlots[randomIndex].samples;
        $scope.currentPlot = newPlot;
        $scope.currentSamples = newSamples;
        $scope.userSamples = {};
        utils.disable_element("new-plot-button");
        utils.enable_element("flag-plot-button");
        utils.disable_element("save-values-button");
        map_utils.draw_buffer(newPlot.center, newPlot.radius);
        map_utils.draw_points(newSamples);
        var map = map_utils.map_ref;

        var aOIExtent= ol.proj.transformExtent(map.getView().calculateExtent(map.getSize()), 'EPSG:3857', 'EPSG:4326');

        console.info(aOIExtent + "***********");

        var elt = document.getElementById('project-id');
        var title = elt.options[elt.selectedIndex].text;
        var pid = elt.options[elt.selectedIndex].value;
        var url = "http://localhost:8081/geo-dash?title=" + title + "&pid=" + pid + "&aoi=[" + aOIExtent + "]&daterange=";
        window.open(url, '_geo-dash');
    };

    $scope.setCurrentValue = function (sampleValue) {
        var selectedFeatures = map_utils.get_selected_samples();
        if (selectedFeatures) {
            var samples = selectedFeatures.getArray();
            utils.blink_border(sampleValue.id);
            for (var i = 0; i < samples.length; i++) {
                var sample = samples[i];
                var sampleId = sample.get("sample_id");
                $scope.userSamples[sampleId] = sampleValue.id;
                map_utils.highlight_sample(sample, sampleValue.color)
            }
            selectedFeatures.clear();
            if (Object.keys($scope.userSamples).length == $scope.currentSamples.length) {
                utils.enable_element("save-values-button");
            }
        } else {
            alert("No sample points selected. Please click some first.");
        }
    };

    $scope.saveValues = function () {
        var userId = parseInt(document.getElementById("user-id").value);
        var plotId = $scope.currentPlot.id;
        var imagery = $scope.currentProject.imagery;
        var userSamples = JSON.stringify($scope.userSamples, null, 4);
        var postData = [userId, plotId, imagery, userSamples];

        // FIXED: Implement this as an AJAX call
        $http.post('add-user-samples', postData).
            then (function() {
                alert("Called saveValues with:\n" +
                  "userId = " + userId + "\n" +
                  "plotId = " + plotId + "\n" +
                  "imagery = " + imagery + "\n" +
                  "userSamples = " + userSamples);
                map_utils.disable_selection();
                $scope.currentPlot = null;
             }, function(response) {
                console.log(response.data);
             });
        // alert("Your assignments have been saved to the database.");
        $scope.loadRandomPlot();
    };

    $scope.flagPlot = function () {
        var plotId = $scope.currentPlot.id;
        // FIXED: Implement this as an AJAX call
        $http.post('flag-plot', plotId).
            then (function() {
                alert("Called flagPlot with plotId = " + plotId);
                $scope.loadRandomPlot();
            }, function(response) {
                console.log(response.data);
            });
        // alert("Plot " + plotId + " has been flagged");
        $scope.loadRandomPlot();
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


angular
    .module('collectEarth')
    .controller('dashboard.controller', dashboard.controller);
