angular.module("project", []).controller("ProjectController", ["$http", function ProjectController($http) {
    this.root = "";
    this.members = []; // FIXME: add to JSON
    this.contributors = []; // FIXME: add to JSON
    this.pointsClassified = 0; // FIXME: add to JSON
    this.badPlots = 0; // FIXME: add to JSON
    this.dateCreated = null; // FIXME: add to JSON
    this.datePublished = null; // FIXME: add to JSON
    this.dateClosed = null; // FIXME: add to JSON
    this.availability = "nonexistent"; // FIXME: add to JSON
    this.institutionId = "0";
    this.projectId = "0";
    this.projectName = "";
    this.projectDescription = "";
    this.privacyLevel = "private";
    this.lonMin = "";
    this.latMin = "";
    this.lonMax = "";
    this.latMax = "";
    this.baseMapSource = "DigitalGlobeWMSImagery"; // FIXME: add to JSON
    this.imageryYear = "2016"; // FIXME: add to JSON
    this.stackingProfile = "Accuracy_Profile"; // FIXME: add to JSON
    this.plotDistribution = "random"; // FIXME: add to JSON
    this.numPlots = "";
    this.plotSpacing = ""; // FIXME: add to JSON
    this.plotShape = "circle"; // FIXME: add to JSON
    this.plotSize = ""; // FIXME: add to JSON
    this.sampleDistribution = "random"; // FIXME: add to JSON
    this.samplesPerPlot = "";
    this.sampleResolution = "";
    this.sampleValues = [];
    this.valueName = "";
    this.valueColor = "#000000";
    this.valueImage = "";
    this.project = null;
    this.plotList = [];

    this.stateTransitions = {
        nonexistent: "Create",
        unpublished: "Publish",
        published: "Close",
        closed: "Archive",
        archived: "Archive"
    };

    this.downloadPlotData = function () {
        $http.get(this.root + "/dump-project-aggregate-data/" + this.projectId)
            .then(function successCallback(response) {
                window.open(response.data);
            }, function errorCallback(response) {
                console.log(response);
                alert("Error downloading data for this project. See console for details.");
            });
    };

    // FIXME: turn this into an AJAX request
    this.createProject = function () {
        // document.getElementById("sample-values").value = JSON.stringify(this.sampleValues);
        $http.post(this.root + "/project/" + this.projectId);
        var newProjectId = 100; // FIXME: set from the return value of the AJAX call
        window.location = this.root + "/project/" + newProjectId;
    };

    this.archiveProject = function () {
        if (confirm("Do you REALLY want to archive this project?!")) {
            $http.post(this.root + "/archive-project/" + this.projectId)
                .then(angular.bind(this, function successCallback(response) {
                    alert("Project " + this.projectId + " has been archived.");
                    window.location = this.root + "/home";
                }), function errorCallback(response) {
                    console.log(response);
                    alert("Error archiving project. See console for details.");
                });
        }
    };

    // FIXME: callback functions on each branch should set this.availability
    //        and hide the spinner
    this.changeAvailability = function () {
        document.getElementById("spinner").style.visibility = "visible";
        if (this.availability == "nonexistent") {
            this.availability = "unpublished";
            this.createProject();
        } else if (this.availability == "unpublished") {
            this.availability = "published";
            // FIXME: Publish the project
        } else if (this.availability == "published") {
            this.availability = "closed";
            // FIXME: Close the project
        } else if (this.availability == "closed") {
            this.availability = "archived";
            this.archiveProject();
        }
    };

    this.setPrivacyLevel = function (privacyLevel) {
        this.privacyLevel = privacyLevel;
    };

    this.setBaseMapSource = function () {
        map_utils.set_current_imagery(this.baseMapSource);
    };

    // FIXME: stub
    this.setImageryYear = function () {
        alert("This function has not yet been implemented.");
    };

    // FIXME: stub
    this.setStackingProfile = function () {
        alert("This function has not yet been implemented.");
    };

    this.setPlotDistribution = function (plotDistribution) {
        if (plotDistribution == "random") {
            utils.enable_element("num-plots");
            utils.disable_element("plot-spacing");
        } else {
            utils.disable_element("num-plots");
            utils.enable_element("plot-spacing");
        }
    };

    this.setPlotShape = function (plotShape) {
        this.plotShape = plotShape;
    };

    this.setSampleDistribution = function (sampleDistribution) {
        if (sampleDistribution == "random") {
            utils.enable_element("samples-per-plot");
            utils.disable_element("sample-resolution");
        } else {
            utils.disable_element("samples-per-plot");
            utils.enable_element("sample-resolution");
        }
    };

    this.removeSampleValueRow = function (sampleValueName) {
        this.sampleValues = this.sampleValues.filter(
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
            this.sampleValues.push({name: name, color: color, image: image});
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
                    this.project = response.data;
                    this.showProjectDetails();
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    this.getPlotData = function (projectId) {
        $http.get(this.root + "/get-project-plots/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                this.plotList = response.data;
                this.showProjectDetails();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    this.showProjectDetails = function () {
        if (this.project == null) {
            // Load the current project details
            this.getProjectById(this.projectId);
        } else {
            var project = this.project;
            if (this.plotList.length == 0) {
                this.getPlotData(project.id);
            } else {
                // FIXME: Simplify this code by matching binding variable names to JSON object fields
                this.projectName = project.name;
                this.projectDescription = project.description;
                this.privacyLevel = project.privacy;
                document.getElementById("privacy-" + project.privacy).checked = true;
                var boundaryExtent = map_utils.polygon_extent(project.boundary);
                this.lonMin = boundaryExtent[0];
                this.latMin = boundaryExtent[1];
                this.lonMax = boundaryExtent[2];
                this.latMax = boundaryExtent[3];
                map_utils.draw_polygon(project.boundary);
                this.baseMapSource = project.baseMapSource || project.imagery; // FIXME: add to JSON file
                this.imageryYear = project.imageryYear || "2016"; // FIXME: add to JSON file
                this.stackingProfile = project.stackingProfile || "Accuracy_Profile"; // FIXME: add to JSON file
                map_utils.set_current_imagery(this.baseMapSource);
                this.plotDistribution = project.plotDistribution || "random"; // FIXME: add to JSON file
                document.getElementById("plot-distribution-" + this.plotDistribution).checked = true;
                if (this.plotDistribution == "random") {
                    utils.enable_element("num-plots");
                    utils.disable_element("plot-spacing");
                } else {
                    utils.enable_element("num-plots");
                    utils.enable_element("plot-spacing");
                }
                this.numPlots = this.plotList.length;
                this.plotSpacing = this.plotList[0].plot.spacing || ""; // FIXME: add to JSON file
                this.plotShape = project.plotShape || "circle"; // FIXME: add to JSON file
                document.getElementById("plot-shape-" + this.plotShape).checked = true;
                this.plotSize = this.plotList[0].plot.radius; // FIXME: rename to size
                if (project.sample_resolution) { // FIXME: no _s, use camelCase
                    this.sampleDistribution = "gridded";
                    document.getElementById("sample-distribution-gridded").checked = true;
                    utils.enable_element("samples-per-plot");
                    utils.enable_element("sample-resolution");
                } else {
                    this.sampleDistribution = "random";
                    document.getElementById("sample-distribution-random").checked = true;
                    utils.enable_element("samples-per-plot");
                    utils.disable_element("sample-resolution");
                }
                this.samplesPerPlot = this.plotList[0].samples.length;
                this.sampleResolution = project.sample_resolution || "";
                this.sampleValues = project.sample_values; // FIXME: no _s, use camelCase
            }
        }
    };

    this.initialize = function (documentRoot, projectId, institutionId) {
        // Make the documentRoot, projectId, and institutionId globally available
        this.root = documentRoot;
        this.projectId = projectId;
        this.institutionId = institutionId;

        // Initialize the base map
        map_utils.digital_globe_base_map({div_name: "project-map",
                                          center_coords: [0.0, 0.0],
                                          zoom_level: 1});

        if (this.projectId == "0") {
            // Show the default imagery and enable the dragbox interaction
            map_utils.set_current_imagery(this.baseMapSource);
            map_utils.enable_dragbox_draw();

            // Link the bounding box input fields to the map object
            map_utils.set_bbox_coords = function () {
                var latmax = document.getElementById("lat-max");
                var lonmax = document.getElementById("lon-max");
                var latmin = document.getElementById("lat-min");
                var lonmin = document.getElementById("lon-min");
                latmax.value = map_utils.current_bbox.maxlat;
                lonmax.value = map_utils.current_bbox.maxlon;
                latmin.value = map_utils.current_bbox.minlat;
                lonmin.value = map_utils.current_bbox.minlon;
            };
        } else {
            // Set all the form fields to the values for the current project
            this.showProjectDetails();
        }
    };

}]);
