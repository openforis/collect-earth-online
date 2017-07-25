angular.module("collection", []).controller("CollectionController", ["$http", function CollectionController($http) {
    this.root = "";
    this.projectList = [];
    this.currentProjectId = "";
    this.currentProject = null;
    this.currentPlot = null;
    this.userSamples = {};

    this.getProjectList = function (userId) {
        $http.get(this.root + "/get-all-projects?userId=" + userId + "&institutionId=")
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
                this.initialize(this.root, userId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.getProjectById = function (projectId) {
        return this.projectList.find(
            function (project) {
                return project.id == projectId;
            }
        );
    };

    this.initialize = function (documentRoot, userId) {
        // Make the current documentRoot globally available
        this.root = documentRoot;

        if (this.projectList.length == 0) {
            // Load the projectList
            this.getProjectList(userId);
        } else {
            // Load the currentProject
            var initialProjectId = document.getElementById("initial-project-id").value;
            if (initialProjectId == "-1") {
                this.currentProjectId = this.projectList[0].id.toString();
            } else {
                this.currentProjectId = initialProjectId;
            }
            this.currentProject = this.getProjectById(parseInt(this.currentProjectId));

            // Initialize the base map and show the selected project's boundary
            map_utils.digital_globe_base_map({div_name: "image-analysis-pane",
                                              center_coords: [0.0, 0.0],
                                              zoom_level: 1});
            map_utils.set_dg_wms_layer_params(this.currentProject.imageryYear, this.currentProject.stackingProfile);
            map_utils.set_current_imagery(this.currentProject.baseMapSource);
            map_utils.draw_polygon(this.currentProject.boundary);
        }
    };

    this.switchProject = function () {
        var newProject = this.getProjectById(parseInt(this.currentProjectId));
        if (newProject) {
            this.currentProject = newProject;
            this.currentPlot = null;
            this.userSamples = {};
            // map_utils.remove_plot_layer();
            map_utils.remove_sample_layer();
            map_utils.disable_selection();
            utils.enable_element("new-plot-button");
            utils.disable_element("flag-plot-button");
            utils.disable_element("save-values-button");
            map_utils.set_current_imagery(newProject.baseMapSource);
            map_utils.draw_polygon(newProject.boundary);
        }
    };

    this.getPlotData = function (projectId) {
        $http.get(this.root + "/get-unanalyzed-plot/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "done") {
                    this.currentPlot = null;
                    alert("All plots have been analyzed for this project.");
                } else {
                    this.currentPlot = response.data;
                    this.loadRandomPlot();
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    this.loadRandomPlot = function () {
        if (this.currentPlot == null) {
            this.getPlotData(parseInt(this.currentProjectId));
        } else {
            this.userSamples = {};
            utils.disable_element("new-plot-button");
            utils.enable_element("flag-plot-button");
            utils.disable_element("save-values-button");
            // map_utils.draw_plot(this.currentPlot.center, this.currentProject.plotSize, this.currentProject.plotShape);
            map_utils.draw_points(this.currentPlot.samples);
            window.open(this.root + "/geo-dash?"
                        + encodeURIComponent("title=" + this.currentProject.name
                                             + "&pid=" + this.currentProjectId
                                             + "&aoi=[" + map_utils.get_view_extent()
                                             + "]&daterange=&bcenter=" + this.currentPlot.center
                                             + "&bradius=" + this.currentProject.plotSize / 2),
                        "_geo-dash");
        }
    };

    this.setCurrentValue = function (sampleValue) {
        var selectedFeatures = map_utils.get_selected_samples();
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
            selectedFeatures.forEach(
                function (sample) {
                    this.userSamples[sample.get("sample_id")] = sampleValue.id;
                    map_utils.highlight_sample(sample, sampleValue.color);
                },
                this // necessary to pass outer scope into function
            );
            selectedFeatures.clear();
            utils.blink_border(sampleValue.id);
            if (Object.keys(this.userSamples).length == this.currentPlot.samples.length) {
                utils.enable_element("save-values-button");
            }
        } else {
            alert("No sample points selected. Please click some first.");
        }
    };

    this.saveValues = function () {
        $http.post(this.root + "/add-user-samples",
                   {projectId: this.currentProjectId,
                    plotId: this.currentPlot.id,
                    userId: document.getElementById("user-id").value,
                    userSamples: this.userSamples})
            .then(angular.bind(this, function successCallback(response) {
                alert("Your assignments have been saved to the database.");
                utils.enable_element("new-plot-button");
                utils.disable_element("flag-plot-button");
                utils.disable_element("save-values-button");
                map_utils.disable_selection();
                this.currentPlot = null;
                this.loadRandomPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error saving your assignments to the database. See console for details.");
            });
    };

    this.flagPlot = function () {
        var projectId = this.currentProjectId;
        var plotId = this.currentPlot.id;
        $http.post(this.root + "/flag-plot",
                   {projectId: projectId,
                    plotId:    plotId})
            .then(angular.bind(this, function successCallback(response) {
                alert("Plot " + plotId + " has been flagged.");
                this.currentPlot = null;
                this.loadRandomPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error flagging plot as bad. See console for details.");
            });
    };

}]);
