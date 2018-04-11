angular.module("collection", []).controller("CollectionController", ["$http", function CollectionController($http) {
    this.root = "";
    this.userName = "";
    this.projectId = "";
    this.currentProject = null;
    this.stats = null;
    this.plotList = null;
    this.imageryList = null;
    this.currentImagery = {attribution: ""};
    this.imageryYear = 2017;
    this.stackingProfile = "Accuracy_Profile";
    this.mapConfig = null;

    // FIXME: make sure these are used
    this.currentPlot = null;
    this.userSamples = {};
    this.showSideBar = false;
    this.mapclass = "fullmap";
    this.quitclass = "quit-full";
    this.statClass = "projNoStats";
    this.arrowstate = "arrow-down";
    this.mapClickEvent;

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

    // FIXME: replace map_utils with mercator, set this.plotList, and recurse back with this.initialize()
    this.getProjectPlots = function () {
        $http.get(this.root + "/get-project-plots/" + this.projectId + "/1000")
            .then(angular.bind(this, function successCallback(response) {
                this.plotList = response.data;
                mercator.drawProjectPoints(this.plotList);
                map_utils.draw_project_points(response.data, "red_fill");
                this.mapClickEvent = map_utils.map_ref.on("click", function (evt) {
                    var feature = map_utils.map_ref.forEachFeatureAtPixel(evt.pixel, function (feature) { return feature; });
                    //Check if it is a cluster or a single
                    if (map_utils.isCluster(feature)) {
                        var features = feature.get("features");
                        var clusterpoints = [];
                        for(var i = 0; i < features.length; i++) {
                            clusterpoints.push(features[i].getGeometry().getCoordinates());
                        }
                        var linestring = new ol.geom.LineString(clusterpoints);
                        map_utils.map_ref.getView().fit(linestring.getExtent(), map_utils.map_ref.getSize());
                    } else {
                        if(feature.get("features") != null)
                        {
                            this.showSideBar = true;
                            this.mapclass = "sidemap";
                            this.quitclass = "quit-side";
                            map_utils.remove_plots_layer();
                            map_utils.map_ref.unByKey(this.mapClickEvent);
                            this.loadPlotById(feature.get("features")[0].get("id"));
                            map_utils.map_ref.updateSize();
                            window.setTimeout("map_utils.map_ref.updateSize()", 550);
                        }
                    }
                });
            }), function errorCallback(response) {
                console.log(response);
                alert("Error flagging plot as bad. See console for details.");
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
            // Draw a map with the project AOI
            this.showProjectMap();
        }
    };

    this.toggleStats = function () {
        if(this.statClass == "projNoStats"){
            this.statClass = "projStats";
            this.arrowstate = "arrow-up";
        } else {
            this.statClass = "projNoStats";
            this.arrowstate = "arrow-down";
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

    this.getPlotDatabyid = function (projectId, plotid) {
        $http.get(this.root + "/get-unanalyzed-plot-byid/" + projectId + "/" + plotid)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "done") {
                    this.currentPlot = null;
                    alert("All plots have been analyzed for this project.");
                } else {
                    this.currentPlot = response.data[0];
                    this.loadRandomPlot();
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    // FIXME: replace map_utils with mercator
    this.loadPlotById = function (id) {
        if (this.currentPlot == null) {
            this.getPlotDatabyid(this.projectId, id);
        } else {
            utils.enable_element("flag-plot-button");
            map_utils.draw_points(this.currentPlot.samples);
            window.open(this.root + "/geo-dash?editable=false&"
                        + encodeURIComponent("title=" + this.currentProject.name
                                             + "&pid=" + this.projectId
                                             + "&aoi=[" + map_utils.get_view_extent()
                                             + "]&daterange=&bcenter=" + this.currentPlot.center
                                             + "&bradius=" + this.currentProject.plotSize / 2),
                        "_geo-dash");
        }
    };

    // FIXME: replace map_utils with mercator
    this.loadRandomPlot = function () {
        if (this.currentPlot == null) {
            this.getPlotData(this.projectId);
        } else {
            utils.enable_element("flag-plot-button");
            map_utils.draw_points(this.currentPlot.samples);
            window.open(this.root + "/geo-dash?editable=false&"
                        + encodeURIComponent("title=" + this.currentProject.name
                                             + "&pid=" + this.projectId
                                             + "&aoi=[" + map_utils.get_view_extent()
                                             + "]&daterange=&bcenter=" + this.currentPlot.center
                                             + "&bradius=" + this.currentProject.plotSize / 2),
                        "_geo-dash");
        }
    };

    // FIXME: replace map_utils with mercator
    this.nextPlot = function () {
        document.getElementById("go-to-first-plot-button").addClass("d-none");
        document.getElementById("plot-nav").removeClass("d-none");
        this.showSideBar = true;
        this.mapclass = "sidemap";
        this.quitclass = "quit-side";
        map_utils.remove_plots_layer();
        map_utils.map_ref.updateSize();
        window.setTimeout("map_utils.map_ref.updateSize()", 550);
        this.currentPlot = null;
        this.userSamples = {};
        utils.disable_element("flag-plot-button");
        utils.disable_element("save-values-button");
        this.loadRandomPlot();
    };

    // FIXME: replace map_utils with mercator
    this.setCurrentValue = function (sampleValueGroup, sampleValue) {
        var selectedFeatures = map_utils.get_selected_samples();
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
            selectedFeatures.forEach(
                function (sample) {
                    var pointAssignments = this.userSamples[sample.get("sample_id")];
                    if (pointAssignments) {
                        pointAssignments[sampleValueGroup.name] = sampleValue.name;
                    } else {
                        pointAssignments = {};
                        pointAssignments[sampleValueGroup.name] = sampleValue.name;
                    }
                    this.userSamples[sample.get("sample_id")] = pointAssignments;
                    map_utils.highlight_sample(sample, sampleValue.color);
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

    // FIXME: these values are incorrect
    this.assignedPercentage = function () {
        var p = 0;
        try{
            p = (100 * this.stats.analyzedPlots / this.currentProject.numPlots);
        }
        catch(e)
        {
            p = 0;
        }
        return parseFloat(p).toFixed(2);
    };

    // FIXME: these values are incorrect
    this.flaggedPercentage = function () {
        var p = 0;
        try{
            p = (100 * this.stats.flaggedPlots / this.currentProject.numPlots);
        }
        catch(e)
        {
            p = 0;
        }
        return parseFloat(p).toFixed(2);
    };

    // FIXME: these values are incorrect
    this.completePercentage = function () {
        var p = 0;
        try{
            p = (100 * (this.stats.analyzedPlots + this.stats.flaggedPlots) / this.currentProject.numPlots);
        }
        catch(e)
        {
            p = 0;
        }
        return parseFloat(p).toFixed(2);
    };

    // FIXME: replace map_utils with mercator
    this.saveValues = function () {
        $http.post(this.root + "/add-user-samples",
                   {projectId: this.projectId,
                    plotId: this.currentPlot.id,
                    userId: this.userName,
                    userSamples: this.userSamples})
            .then(angular.bind(this, function successCallback() {
                alert("Your assignments have been saved to the database.");
                map_utils.disable_selection();
                this.stats.analyzedPlots++;
                this.nextPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error saving your assignments to the database. See console for details.");
            });
        this.stats.analyzedPlots++;
    };

    this.flagPlot = function () {
        $http.post(this.root + "/flag-plot",
                   {projectId: this.projectId,
                    plotId:    this.currentPlot.id})
            .then(angular.bind(this, function successCallback() {
                alert("Plot " + this.currentPlot.id + " has been flagged.");
                this.stats.flaggedPlots++;
                this.stats.analyzedPlots++;
                this.nextPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error flagging plot as bad. See console for details.");
            });
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
