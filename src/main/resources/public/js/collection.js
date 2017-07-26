angular.module("collection", []).controller("CollectionController", ["$http", function CollectionController($http) {
    this.root = "";
    this.userId = "";
    this.userName = "";
    this.projectId = "";
    this.currentProject = null;
    this.currentPlot = null;
    this.userSamples = {};
    this.plotsAssigned = 0;
    this.plotsFlagged = 0;

    this.getProjectById = function (projectId, userId) {
        $http.get(this.root + "/get-project-by-id/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.root + "/home";
                } else {
                    this.currentProject = response.data;
                    this.initialize(this.root, userId, this.userName, projectId);
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    this.initialize = function (documentRoot, userId, userName, projectId) {
        // Make the current documentRoot, userId, userName, and projectId globally available
        this.root = documentRoot;
        this.userId = userId;
        this.userName = userName;
        this.projectId = projectId;

        if (this.currentProject == null) {
            // Load the project details
            this.getProjectById(projectId, userId);
        } else {
            // Initialize the base map and show the selected project's boundary
            map_utils.digital_globe_base_map({div_name: "image-analysis-pane",
                                              center_coords: [0.0, 0.0],
                                              zoom_level: 1});
            map_utils.set_dg_wms_layer_params(this.currentProject.imageryYear, this.currentProject.stackingProfile);
            map_utils.set_current_imagery(this.currentProject.baseMapSource);
            map_utils.draw_polygon(this.currentProject.boundary);
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
            this.getPlotData(this.projectId);
        } else {
            this.userSamples = {};
            utils.disable_element("new-plot-button");
            utils.enable_element("flag-plot-button");
            utils.disable_element("save-values-button");
            // map_utils.draw_plot(this.currentPlot.center, this.currentProject.plotSize, this.currentProject.plotShape);
            map_utils.draw_points(this.currentPlot.samples);
            window.open(this.root + "/geo-dash?"
                        + encodeURIComponent("title=" + this.currentProject.name
                                             + "&pid=" + this.projectId
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
                   {projectId: this.projectId,
                    plotId: this.currentPlot.id,
                    userId: this.userName,
                    userSamples: this.userSamples})
            .then(angular.bind(this, function successCallback(response) {
                alert("Your assignments have been saved to the database.");
                utils.enable_element("new-plot-button");
                utils.disable_element("flag-plot-button");
                utils.disable_element("save-values-button");
                map_utils.disable_selection();
                this.currentPlot = null;
                this.plotsAssigned++;
                this.loadRandomPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error saving your assignments to the database. See console for details.");
            });
    };

    this.flagPlot = function () {
        $http.post(this.root + "/flag-plot",
                   {projectId: this.projectId,
                    plotId:    this.currentPlot.id})
            .then(angular.bind(this, function successCallback(response) {
                alert("Plot " + this.currentPlot.id + " has been flagged.");
                this.currentPlot = null;
                this.plotsFlagged++;
                this.loadRandomPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error flagging plot as bad. See console for details.");
            });
    };

}]);
