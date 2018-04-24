angular.module("collection", []).controller("CollectionController", ["$http", function CollectionController($http) {
    this.root = "";
    this.userName = "";
    this.projectId = "";
    this.currentProject = null;
    this.stats = null;
    this.plotList = null;
    this.imageryList = null;
    this.currentImagery = {attribution: ""};
    this.imageryYear = 2009;
    this.stackingProfile = "Accuracy_Profile";
    this.mapConfig = null;
    this.currentPlot = null;
    this.userSamples = {};
    this.showSideBar = false;
    this.mapClass = "fullmap";
    this.quitClass = "quit-full";
    this.statClass = "projNoStats";
    this.arrowState = "arrow-down";

    this.getProjectById = function (projectId) {
        $http.get(this.root + "/get-project-by-id/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "" || response.data.id == 0) {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.root + "/home";
                } else {
                    this.currentProject = response.data;
                    this.initialize(this.root, this.userName, projectId);
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    this.getProjectStats = function () {
        $http.get(this.root + "/get-project-stats/" + this.projectId)
            .then(angular.bind(this, function successCallback(response) {
                this.stats = response.data;
                this.initialize(this.root, this.userName, this.projectId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error getting project stats. See console for details.");
            });
    };

    this.getProjectPlots = function () {
        $http.get(this.root + "/get-project-plots/" + this.projectId + "/1000")
            .then(angular.bind(this, function successCallback(response) {
                this.plotList = response.data;
                this.initialize(this.root, this.userName, this.projectId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error loading plot data. See console for details.");
            });
    };

    this.getImageryList = function (institutionId) {
        $http.get(this.root + "/get-all-imagery?institutionId=" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.imageryList = response.data;
                this.initialize(this.root, this.userName, this.projectId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    this.getImageryByTitle = function (imageryTitle) {
        return this.imageryList.find(
            function (imagery) {
                return imagery.title == imageryTitle;
            }
        );
    };

    this.updateDGWMSLayer = function () {
        mercator.updateLayerWmsParams(this.mapConfig,
                                      "DigitalGlobeWMSImagery",
                                      {COVERAGE_CQL_FILTER: "(acquisition_date>='" + this.imageryYear + "-01-01')"
                                       + "AND(acquisition_date<='" + this.imageryYear + "-12-31')",
                                       FEATUREPROFILE: this.stackingProfile});
    };

    this.setBaseMapSource = function () {
        mercator.setVisibleLayer(this.mapConfig, this.currentProject.baseMapSource);
        this.currentImagery = this.getImageryByTitle(this.currentProject.baseMapSource);
        if (this.currentProject.baseMapSource == "DigitalGlobeWMSImagery") {
            this.currentImagery.attribution += " | " + this.imageryYear + " (" + this.stackingProfile + ")";
            this.updateDGWMSLayer();
        }
    };

    this.showProjectPlots = function () {
        mercator.addPlotLayer(this.mapConfig,
                              this.plotList,
                              angular.bind(this, function (feature) {
                                  // FIXME: These three assignments don't appear to do anything
                                  this.showSideBar = true;
                                  this.mapClass = "sidemap";
                                  this.quitClass = "quit-side";
                                  this.loadPlotById(feature.get("features")[0].get("plotId"));
                              }));
    };

    this.showProjectMap = function () {
        // Initialize the base map
        this.mapConfig = mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, this.imageryList);
        this.setBaseMapSource();

        // Show the project's boundary
        mercator.addVectorLayer(this.mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.currentProject.boundary, true)),
                                ceoMapStyles.polygon);
        mercator.zoomMapToLayer(this.mapConfig, "currentAOI");

        // Draw the project plots as clusters on the map
        this.showProjectPlots();
    };

    this.initialize = function (documentRoot, userName, projectId) {
        // Make the documentRoot, userName, and projectId globally available
        this.root = documentRoot;
        this.userName = userName;
        this.projectId = projectId;

        if (this.currentProject == null) {
            // Load the project details
            this.getProjectById(projectId);
        } else if (this.stats == null) {
            // Load the project stats
            this.getProjectStats();
        } else if (this.plotList == null) {
            // Load the project plots
            this.getProjectPlots();
        } else if (this.imageryList == null) {
            // Load the imageryList
            this.getImageryList(this.currentProject.institution);
        } else if (this.imageryList.length > 0) {
            // Draw a map with the project AOI and plot clusters
            this.showProjectMap();
        }
    };

    this.getPlotDataById = function (plotId) {
        $http.get(this.root + "/get-unanalyzed-plot-by-id/" + this.projectId + "/" + plotId)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "done") {
                    this.currentPlot = null;
                    this.showProjectPlots();
                    alert("This plot has already been analyzed.");
                } else if (response.data == "not found") {
                    this.currentPlot = null;
                    this.showProjectPlots();
                    alert("No plot with ID " + plotId + " found.");
                } else {
                    this.currentPlot = response.data;
                    this.loadPlotById(plotId);
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    this.loadPlotById = function (plotId) {
        if (this.currentPlot == null) {
            this.getPlotDataById(plotId);
        } else {
            angular.element("#go-to-first-plot-button").addClass("d-none");
            angular.element("#plot-nav").removeClass("d-none");
            this.showSideBar = true;
            this.mapClass = "sidemap";
            this.quitClass = "quit-side";
            utils.enable_element("new-plot-button");
            utils.enable_element("flag-plot-button");
            utils.disable_element("save-values-button");

            // FIXME: Move these calls into a function in mercator-openlayers.js
            mercator.disableSelection(this.mapConfig);
            mercator.removeLayerByTitle(this.mapConfig, "currentSamples");
            mercator.addVectorLayer(this.mapConfig,
                                    "currentSamples",
                                    mercator.samplesToVectorSource(this.currentPlot.samples),
                                    ceoMapStyles.redPoint);
            mercator.enableSelection(this.mapConfig, "currentSamples");
            mercator.zoomMapToLayer(this.mapConfig, "currentSamples");

            window.open(this.root + "/geo-dash?editable=false&"
                        + encodeURIComponent("title=" + this.currentProject.name
                                             + "&pid=" + this.projectId
                                             + "&aoi=[" + mercator.getViewExtent(this.mapConfig)
                                             + "]&daterange=&bcenter=" + this.currentPlot.center
                                             + "&bradius=" + this.currentProject.plotSize / 2),
                        "_geo-dash");
        }
    };

    this.getPlotData = function () {
        $http.get(this.root + "/get-unanalyzed-plot/" + this.projectId)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "done") {
                    this.currentPlot = null;
                    utils.disable_element("new-plot-button");
                    utils.disable_element("flag-plot-button");
                    utils.disable_element("save-values-button");
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

    // FIXME: merge with loadPlotById()
    this.loadRandomPlot = function () {
        if (this.currentPlot == null) {
            this.getPlotData();
        } else {
            utils.enable_element("flag-plot-button");

            // FIXME: Move these calls into a function in mercator-openlayers.js
            mercator.disableSelection(this.mapConfig);
            mercator.removeLayerByTitle(this.mapConfig, "currentSamples");
            mercator.addVectorLayer(this.mapConfig,
                                    "currentSamples",
                                    mercator.samplesToVectorSource(this.currentPlot.samples),
                                    ceoMapStyles.redPoint);
            mercator.enableSelection(this.mapConfig, "currentSamples");
            mercator.zoomMapToLayer(this.mapConfig, "currentSamples");

            window.open(this.root + "/geo-dash?editable=false&"
                        + encodeURIComponent("title=" + this.currentProject.name
                                             + "&pid=" + this.projectId
                                             + "&aoi=[" + mercator.getViewExtent(this.mapConfig)
                                             + "]&daterange=&bcenter=" + this.currentPlot.center
                                             + "&bradius=" + this.currentProject.plotSize / 2),
                        "_geo-dash");
        }
    };

    this.nextPlot = function () {
        angular.element("#go-to-first-plot-button").addClass("d-none");
        angular.element("#plot-nav").removeClass("d-none");
        this.showSideBar = true;
        this.mapClass = "sidemap";
        this.quitClass = "quit-side";
        mercator.removeLayerByTitle(this.mapConfig, "currentPlots");
        mercator.removeLayerByTitle(this.mapConfig, "currentSamples");
        this.currentPlot = null;
        this.userSamples = {};
        utils.enable_element("new-plot-button");
        utils.enable_element("flag-plot-button");
        utils.disable_element("save-values-button");
        this.loadRandomPlot();
    };

    this.setCurrentValue = function (sampleValueGroup, sampleValue) {
        var selectedFeatures = mercator.getSelectedSamples(this.mapConfig);
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
            selectedFeatures.forEach(
                function (sample) {
                    var pointAssignments = this.userSamples[sample.get("sampleId")];
                    if (pointAssignments) {
                        pointAssignments[sampleValueGroup.name] = sampleValue.name;
                    } else {
                        pointAssignments = {};
                        pointAssignments[sampleValueGroup.name] = sampleValue.name;
                    }
                    this.userSamples[sample.get("sampleId")] = pointAssignments;
                    mercator.highlightSamplePoint(sample, sampleValue.color);
                },
                this // necessary to pass outer scope into function
            );
            selectedFeatures.clear();
            utils.blink_border(sampleValue.name + "_" + sampleValue.id);
            if (Object.keys(this.userSamples).length == this.currentPlot.samples.length
                && Object.values(this.userSamples).every(function (values) {
                    return Object.keys(values).length == this.currentProject.sampleValues.length;
                }, this)) {
                utils.enable_element("save-values-button");
                utils.disable_element("new-plot-button");
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
            .then(angular.bind(this, function successCallback() {
                alert("Your assignments have been saved to the database.");
                this.stats.analyzedPlots++;
                this.nextPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error saving your assignments to the database. See console for details.");
            });
    };

    this.flagPlot = function () {
        $http.post(this.root + "/flag-plot",
                   {projectId: this.projectId,
                    plotId:    this.currentPlot.id})
            .then(angular.bind(this, function successCallback() {
                alert("Plot " + this.currentPlot.id + " has been flagged.");
                this.stats.flaggedPlots++;
                this.nextPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error flagging plot as bad. See console for details.");
            });
    };

    this.toggleStats = function () {
        if (this.statClass == "projNoStats") {
            this.statClass = "projStats";
            this.arrowState = "arrow-up";
        } else {
            this.statClass = "projNoStats";
            this.arrowState = "arrow-down";
        }
    };

    // FIXME: these values are incorrect
    this.assignedPercentage = function () {
        if (this.currentProject == null || this.stats == null) {
            return "0.00";
        } else {
            return (100.0 * this.stats.analyzedPlots / this.currentProject.numPlots).toFixed(2);
        }
    };

    // FIXME: these values are incorrect
    this.flaggedPercentage = function () {
        if (this.currentProject == null || this.stats == null) {
            return "0.00";
        } else {
            return (100.0 * this.stats.flaggedPlots / this.currentProject.numPlots).toFixed(2);
        }
    };

    // FIXME: these values are incorrect
    this.completedPercentage = function () {
        if (this.currentProject == null || this.stats == null) {
            return "0.00";
        } else {
            return (100.0 * (this.stats.analyzedPlots + this.stats.flaggedPlots) / this.currentProject.numPlots).toFixed(2);
        }
    };

}]).directive("convertToNumber",
              function () {
                  return {
                      require: "ngModel",
                      link: function (scope, element, attrs, ngModel) {
                          ngModel.$parsers.push(function (val) { return parseInt(val, 10); });
                          ngModel.$formatters.push(function (val) { return "" + val; });
                      }
                  };
              });
