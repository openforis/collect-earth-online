angular.module("project", []).controller("ProjectController", ["$http", function ProjectController($http) {
    this.root = "";
    this.institution = "";
    this.details = null;
    this.stats = null;
    this.imageryList = null;
    this.mapConfig = null;
    this.plotList = null;
    this.lonMin = "";
    this.latMin = "";
    this.lonMax = "";
    this.latMax = "";
    this.newSampleValueGroupName = "";
    this.newValueEntry = {};

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
                .then(angular.bind(this, function successCallback() {
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
                .then(angular.bind(this, function successCallback() {
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
                .then(angular.bind(this, function successCallback() {
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
        if (this.plotList != null) {
            window.open(this.root + "/widget-layout-editor?editable=true&"
                        + encodeURIComponent("title=" + this.details.name
                                             + "&pid=" + this.details.id
                                             + "&aoi=[" + mercator.getPlotExtent(this.plotList[0].center,
                                                                                 this.details.plotSize,
                                                                                 this.details.plotShape)
                                             + "]&daterange=&bcenter=" + this.plotList[0].center
                                             + "&bradius=" + this.details.plotSize / 2),
                        "_geo-dash");
        }
    };

    this.downloadPlotData = function () {
        window.open(this.root + "/dump-project-aggregate-data/" + this.details.id, "_blank");
    };

    this.downloadSampleData = function () {
        window.open(this.root + "/dump-project-raw-data/" + this.details.id, "_blank");
    };

    this.setPrivacyLevel = function (privacyLevel) {
        this.details.privacyLevel = privacyLevel;
    };

    this.setBaseMapSource = function () {
        mercator.setVisibleLayer(this.mapConfig, this.details.baseMapSource);
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

    this.addSampleValueGroup = function () {
        var groupName = this.newSampleValueGroupName;
        if (groupName != "") {
            this.newValueEntry[groupName] = {name: "", color: "#000000", image: ""};
            this.details.sampleValues.push({name: groupName, values: []});
            this.newSampleValueGroupName = "";
        } else {
            alert("Please enter a sample value group name first.");
        }
    };

    this.getSampleValueGroupByName = function (sampleValueGroupName) {
        return this.details.sampleValues.find(
            function (sampleValueGroup) {
                return sampleValueGroup.name == sampleValueGroupName;
            }
        );
    };

    this.removeSampleValueRow = function (sampleValueGroupName, sampleValueName) {
        var sampleValueGroup = this.getSampleValueGroupByName(sampleValueGroupName);
        sampleValueGroup.values = sampleValueGroup.values.filter(
            function (sampleValue) {
                return sampleValue.name != sampleValueName;
            }
        );
    };

    this.addSampleValueRow = function (sampleValueGroupName) {
        var entry = this.newValueEntry[sampleValueGroupName];
        if (entry.name != "") {
            var sampleValueGroup = this.getSampleValueGroupByName(sampleValueGroupName);
            sampleValueGroup.values.push({name: entry.name, color: entry.color, image: entry.image});
            entry.name = "";
            entry.color = "#000000";
            entry.image = "";
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

    this.getProjectStats = function (projectId) {
        $http.get(this.root + "/get-project-stats/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                this.stats = response.data;
                this.initialize(this.root, projectId, this.institution);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving project stats. See console for details.");
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
        if (this.plotList == null) {
            // Load the current project plots
            this.getPlotList(projectId, maxPlots);
        } else {
            // Draw the plot shapes on the map
            mercator.addPlotOverviewLayers(this.mapConfig, this.plotList, this.details.plotShape);
        }
    };

    this.showProjectMap = function (projectId) {
        // Initialize the basemap
        this.mapConfig = mercator.createMap("project-map", [0.0, 0.0], 1, this.imageryList);
        mercator.setVisibleLayer(this.mapConfig, this.details.baseMapSource);

        if (this.details.id == 0) {
            // Enable dragbox interaction if we are creating a new project
            var displayDragBoxBounds = function (dragBox) {
                var extent = dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
                // FIXME: Can we just set this.lonMin/lonMax/latMin/latMax instead?
                document.getElementById("lon-min").value = extent[0];
                document.getElementById("lat-min").value = extent[1];
                document.getElementById("lon-max").value = extent[2];
                document.getElementById("lat-max").value = extent[3];
            };
            mercator.enableDragBoxDraw(this.mapConfig, displayDragBoxBounds);
        } else {
            // Extract bounding box coordinates from the project boundary and show on the map
            var boundaryExtent = mercator.parseGeoJson(this.details.boundary, false).getExtent();
            this.lonMin = boundaryExtent[0];
            this.latMin = boundaryExtent[1];
            this.lonMax = boundaryExtent[2];
            this.latMax = boundaryExtent[3];

            // Display a bounding box with the project's AOI on the map and zoom to it
            mercator.addVectorLayer(this.mapConfig,
                                    "currentAOI",
                                    mercator.geometryToVectorSource(mercator.parseGeoJson(this.details.boundary, true)),
                                    ceoMapStyles.polygon);
            mercator.zoomMapToLayer(this.mapConfig, "currentAOI");

            // Show the plot centers on the map (but constrain to <= 100 points)
            this.showPlotCenters(projectId, 100);
        }
    };

    this.initialize = function (documentRoot, projectId, institutionId) {
        // Make the documentRoot and institutionId globally available
        this.root = documentRoot;
        this.institution = institutionId;

        if (this.details == null) {
            // Load the project details
            this.getProjectById(projectId);
        } else if (this.details.id != 0 && this.stats == null) {
            // Load the project stats
            this.getProjectStats(projectId);
        } else if (this.imageryList == null) {
            // Load the imageryList
            this.getImageryList(this.institution);
        } else {
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

            if (this.imageryList.length > 0) {
                // If baseMapSource isn't provided by the project, just use the first entry in the imageryList
                this.details.baseMapSource = this.details.baseMapSource || this.imageryList[0].title;

                // Draw a map with the project AOI and a sampling of its plots
                this.showProjectMap(projectId);
            }
        }
    };

}]);
