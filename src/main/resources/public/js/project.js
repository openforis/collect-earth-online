angular.module("project", []).controller("ProjectController", ["$http", function ProjectController($http) {
    this.root = "";
    this.institution = "";
    this.details = {};
    this.lonMin = "";
    this.latMin = "";
    this.lonMax = "";
    this.latMax = "";
    this.valueName = "";
    this.valueColor = "#000000";
    this.valueImage = "";
    this.plotList = [];
    this.flaggedPlots = 0;
    this.analyzedPlots = 0;
    this.unanalyzedPlots = 0;
    this.members = 0;
    this.contributors = 0;
    this.imageryList = [];

    // FIXME: Add these attributes to the JSON database
    this.dateCreated = null;
    this.datePublished = null;
    this.dateClosed = null;
    this.dateArchived = null;

    this.logFormData = function (formData) {
        console.log(new Map(formData.entries()));
    };

    this.createProject = function () {
        if (confirm("Do you REALLY want to create this project?")) {
            utils.show_element("spinner");
            var formData = new FormData(document.getElementById("project-design-form"));
            formData.append("institution", this.institution);
            formData.append("plot-distribution-csv-file", document.getElementById("plot-distribution-csv-file").files[0]);
            formData.append("sample-values", JSON.stringify(this.details.sampleValues));
            $http.post(this.root + "/create-project",
                       formData,
                       {transformRequest: angular.identity,
                        headers: {"Content-Type": undefined}})
                .then(angular.bind(this, function successCallback(response) {
                    this.details.availability = "unpublished";
                    utils.hide_element("spinner");
                    var newProjectId = response.data;
                    window.location = this.root + "/project/" + newProjectId;
                }), function errorCallback(response) {
                    utils.hide_element("spinner");
                    console.log(response);
                    alert("Error creating project. See console for details.");
                });
        }
    };

    this.publishProject = function () {
        if (confirm("Do you REALLY want to publish this project?")) {
            utils.show_element("spinner");
            $http.post(this.root + "/publish-project/" + this.details.id)
                .then(angular.bind(this, function successCallback(response) {
                    this.details.availability = "published";
                    utils.hide_element("spinner");
                }), function errorCallback(response) {
                    utils.hide_element("spinner");
                    console.log(response);
                    alert("Error publishing project. See console for details.");
                });
        }
    };

    this.closeProject = function () {
        if (confirm("Do you REALLY want to close this project?")) {
            utils.show_element("spinner");
            $http.post(this.root + "/close-project/" + this.details.id)
                .then(angular.bind(this, function successCallback(response) {
                    this.details.availability = "closed";
                    utils.hide_element("spinner");
                }), function errorCallback(response) {
                    utils.hide_element("spinner");
                    console.log(response);
                    alert("Error closing project. See console for details.");
                });
        }
    };

    this.archiveProject = function () {
        if (confirm("Do you REALLY want to archive this project?!")) {
            utils.show_element("spinner");
            $http.post(this.root + "/archive-project/" + this.details.id)
                .then(angular.bind(this, function successCallback(response) {
                    this.details.availability = "archived";
                    utils.hide_element("spinner");
                    alert("Project " + this.details.id + " has been archived.");
                    window.location = this.root + "/home";
                }), function errorCallback(response) {
                    utils.hide_element("spinner");
                    console.log(response);
                    alert("Error archiving project. See console for details.");
                });
        }
    };

    this.stateTransitions = {
        nonexistent: "Create",
        unpublished: "Publish",
        published: "Close",
        closed: "Archive",
        archived: "Archive"
    };

    this.changeAvailability = function () {
        if (this.details.availability == "nonexistent") {
            this.createProject();
        } else if (this.details.availability == "unpublished") {
            this.publishProject();
        } else if (this.details.availability == "published") {
            this.closeProject();
        } else if (this.details.availability == "closed") {
            this.archiveProject();
        }
    };

    this.configureGeoDash = function () {
        window.open(this.root + "/geo-dash?editable=true&"
                    + encodeURIComponent("title=" + this.details.name
                                         + "&pid=" + this.details.id
                                         + "&aoi=[" + map_utils.get_plot_extent(this.plotList[0].center, this.details.plotSize)
                                         + "]&daterange=&bcenter=" + this.plotList[0].center
                                         + "&bradius=" + this.details.plotSize / 2),
                    "_geo-dash");
    };

    this.downloadPlotData = function () {
        $http.get(this.root + "/dump-project-aggregate-data/" + this.details.id)
            .then(function successCallback(response) {
                window.open(response.data);
            }, function errorCallback(response) {
                console.log(response);
                alert("Error downloading data for this project. See console for details.");
            });
    };

    this.setPrivacyLevel = function (privacyLevel) {
        this.details.privacyLevel = privacyLevel;
    };

    this.setBaseMapSource = function () {
        map_utils.set_current_imagery(this.details.baseMapSource);
    };

    this.updateDGWMSLayer = function () {
        map_utils.set_dg_wms_layer_params(this.details.imageryYear, this.details.stackingProfile);
    };

    this.setPlotDistribution = function (plotDistribution) {
        this.details.plotDistribution = plotDistribution;
        if (plotDistribution == "random") {
            utils.enable_element("num-plots");
            utils.disable_element("plot-spacing");
        } else if (plotDistribution == "gridded") {
            utils.disable_element("num-plots");
            utils.enable_element("plot-spacing");
        } else {
            utils.disable_element("num-plots");
            utils.disable_element("plot-spacing");
        }
    };

    this.setPlotShape = function (plotShape) {
        this.details.plotShape = plotShape;
    };

    this.setSampleDistribution = function (sampleDistribution) {
        this.details.sampleDistribution = sampleDistribution;
        if (sampleDistribution == "random") {
            utils.enable_element("samples-per-plot");
            utils.disable_element("sample-resolution");
        } else {
            utils.disable_element("samples-per-plot");
            utils.enable_element("sample-resolution");
        }
    };

    this.removeSampleValueRow = function (sampleValueName) {
        this.details.sampleValues = this.details.sampleValues.filter(
            function (sampleValue) {
                return sampleValue.name != sampleValueName;
            }
        );
    };

    this.addSampleValueRow = function () {
        var name = this.valueName;
        var color = this.valueColor;
        var image = this.valueImage;

        if (name != "") {
            this.details.sampleValues.push({name: name, color: color, image: image});
            this.valueName = "";
            this.valueColor = "#000000";
            this.valueImage = "";
        } else {
            alert("A sample value must possess both a name and a color.");
        }
    };

    this.getProjectById = function (projectId) {
        $http.get(this.root + "/get-project-by-id/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.root + "/home";
                } else {
                    this.details = response.data;
                    if (this.details.id == 0) {
                        this.initialize(this.root, projectId, this.institution);
                    } else {
                        this.initialize(this.root, projectId, this.details.institution);
                    }
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    this.getImageryList = function (institutionId) {
        $http.get(this.root + "/get-all-imagery?institutionId=" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.imageryList = response.data;
                this.initialize(this.root, this.details.id, this.institution);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    this.getPlotList = function (projectId, maxPlots) {
        $http.get(this.root + "/get-project-plots/" + projectId + "/" + maxPlots)
            .then(angular.bind(this, function successCallback(response) {
                this.plotList = response.data;
                this.showPlotCenters(projectId, maxPlots);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving plot list. See console for details.");
            });
    };

    this.showPlotCenters = function (projectId, maxPlots) {
        if (angular.equals(this.plotList, [])) {
            // Load the current project plots
            this.getPlotList(projectId, maxPlots);
        } else {
            // Draw the plot shapes on the map
            map_utils.draw_plots(this.plotList, this.details.plotShape);
        }
    };

    this.getProjectStats = function (projectId) {
        $http.get(this.root + "/get-project-stats/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                this.flaggedPlots = response.data.flaggedPlots;
                this.analyzedPlots = response.data.analyzedPlots;
                this.unanalyzedPlots = response.data.unanalyzedPlots;
                this.members = response.data.members;
                this.contributors = response.data.contributors;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving project stats. See console for details.");
            });
    };

    this.initialize = function (documentRoot, projectId, institutionId) {
        // Make the documentRoot and institutionId globally available
        this.root = documentRoot;
        this.institution = institutionId;

        if (angular.equals(this.details, {})) {
            // Load the current project details
            this.getProjectById(projectId);
        } else if (angular.equals(this.imageryList, [])) {
            // Load the imageryList
            this.getImageryList(this.institution);
        } else {
            // Initialize the base map
            map_utils.digital_globe_base_map({div_name: "project-map",
                                              center_coords: [0.0, 0.0],
                                              zoom_level: 1},
                                             this.imageryList);
            map_utils.set_dg_wms_layer_params(this.details.imageryYear, this.details.stackingProfile);
            map_utils.set_current_imagery(this.details.baseMapSource);

            if (this.details.id == 0) {
                // Enable the dragbox interaction
                map_utils.enable_dragbox_draw();

                // Link the bounding box input fields to the map object
                map_utils.set_bbox_coords = function () {
                    document.getElementById("lat-max").value = map_utils.current_bbox.maxlat;
                    document.getElementById("lon-max").value = map_utils.current_bbox.maxlon;
                    document.getElementById("lat-min").value = map_utils.current_bbox.minlat;
                    document.getElementById("lon-min").value = map_utils.current_bbox.minlon;
                };
            } else {
                // Extract bounding box coordinates from the project boundary and show on the map
                var boundaryExtent = map_utils.polygon_extent(this.details.boundary);
                this.lonMin = boundaryExtent[0];
                this.latMin = boundaryExtent[1];
                this.lonMax = boundaryExtent[2];
                this.latMax = boundaryExtent[3];
                map_utils.draw_polygon(this.details.boundary);

                // Show the plot centers on the map (but constrain to <= 100 points)
                this.showPlotCenters(projectId, 100);

                // Load the project stats
                this.getProjectStats(projectId);
            }

            // Check the radio button values for this project
            document.getElementById("privacy-" + this.details.privacyLevel).checked = true;
            document.getElementById("plot-distribution-" + this.details.plotDistribution).checked = true;
            document.getElementById("plot-shape-" + this.details.plotShape).checked = true;
            document.getElementById("sample-distribution-" + this.details.sampleDistribution).checked = true;

            // Enable the input fields that are connected to the radio buttons if their values are not null
            if (this.details.plotDistribution == "gridded") {
                utils.enable_element("plot-spacing");
            }
            if (this.details.sampleDistribution == "gridded") {
                utils.enable_element("sample-resolution");
            }
        }
    };

}]).directive("convertToNumber", function () {
    return {
        require: "ngModel",
        link: function (scope, element, attrs, ngModel) {
            ngModel.$parsers.push(function (val) {
                return parseInt(val, 10);
            });
            ngModel.$formatters.push(function (val) {
                return "" + val;
            });
        }
    };
});
