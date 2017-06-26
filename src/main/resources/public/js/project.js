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
    this.members = []; // FIXME: add to JSON
    this.contributors = []; // FIXME: add to JSON
    this.pointsClassified = 0; // FIXME: add to JSON
    this.badPlots = 0; // FIXME: add to JSON
    this.dateCreated = null; // FIXME: add to JSON
    this.datePublished = null; // FIXME: add to JSON
    this.dateClosed = null; // FIXME: add to JSON

    this.stateTransitions = {
        nonexistent: "Create",
        unpublished: "Publish",
        published: "Close",
        closed: "Archive",
        archived: "Archive"
    };

    // FIXME: turn this into an AJAX request
    this.createProject = function () {
        // document.getElementById("sample-values").value = JSON.stringify(this.details.sampleValues);
        $http.post(this.root + "/project/" + this.details.id);
        var newProjectId = 100; // FIXME: set from the return value of the AJAX call
        window.location = this.root + "/project/" + newProjectId;
    };

    this.archiveProject = function () {
        if (confirm("Do you REALLY want to archive this project?!")) {
            $http.post(this.root + "/archive-project/" + this.details.id)
                .then(angular.bind(this, function successCallback(response) {
                    alert("Project " + this.details.id + " has been archived.");
                    window.location = this.root + "/home";
                }), function errorCallback(response) {
                    console.log(response);
                    alert("Error archiving project. See console for details.");
                });
        }
    };

    // FIXME: callback functions on each branch should set this.details.availability
    //        and hide the spinner
    this.changeAvailability = function () {
        document.getElementById("spinner").style.visibility = "visible";
        if (this.details.availability == "nonexistent") {
            this.details.availability = "unpublished";
            this.createProject();
        } else if (this.details.availability == "unpublished") {
            this.details.availability = "published";
            // FIXME: Publish the project
        } else if (this.details.availability == "published") {
            this.details.availability = "closed";
            // FIXME: Close the project
        } else if (this.details.availability == "closed") {
            this.details.availability = "archived";
            this.archiveProject();
        }
    };

    // FIXME: update this backend function for the new project-list.json contents
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
        this.details.privacy = privacyLevel;
    };

    this.setBaseMapSource = function () {
        map_utils.set_current_imagery(this.details.baseMapSource);
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
        this.details.plotShape = plotShape;
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
                    this.initialize(this.root, projectId, this.institution);
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    this.initialize = function (documentRoot, projectId, institutionId) {
        // Make the documentRoot and institutionId globally available
        this.root = documentRoot;
        this.institution = institutionId;

        if (angular.equals(this.details, {})) {
            // Load the current project details
            this.getProjectById(projectId);
        } else {
            // Initialize the base map
            map_utils.digital_globe_base_map({div_name: "project-map",
                                              center_coords: [0.0, 0.0],
                                              zoom_level: 1});
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
            }

            // Ensure that imageryYear and stackingProfile are set to defaults if undefined
            this.details.imageryYear = this.details.imageryYear || "2016";
            this.details.stackingProfile = this.details.stackingProfile || "Accuracy_Profile";

            // Check the radio button values for this project
            document.getElementById("privacy-" + this.details.privacy).checked = true;
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

}]);
