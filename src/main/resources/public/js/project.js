angular.module("project", []).controller("ProjectController", ["$http", function ProjectController($http) {
    this.root = "";
    this.projectList = [];
    this.currentProjectId = "0";
    this.currentProject = null;
    this.projectName = "";
    this.projectDescription = "";
    this.plotList = [];
    this.numPlots = "";
    this.plotRadius = "";
    this.sampleType = "random";
    this.samplesPerPlot = "";
    this.sampleResolution = "";
    this.lonMin = "";
    this.latMin = "";
    this.lonMax = "";
    this.latMax = "";
    this.currentImagery = "DigitalGlobeWMSImagery";
    this.sampleValues = [];
    this.valueName = "";
    this.valueColor = "#000000";
    this.valueImage = "";
    this.privacyLevel = "private";

    this.getProjectList = function (institutionId) {
        $http.get(this.root + "/get-all-projects/" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.projectList = response.data;
                this.initialize(this.root);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project list. See console for details.");
            });
    };

    this.initialize = function (documentRoot) {
        // Make the current documentRoot globally available
        this.root = documentRoot;

        if (this.projectList.length == 0) {
            // Load the projectList
            this.getProjectList("ALL");
        } else {
            // Load the currentProject
            this.currentProjectId = document.getElementById("initial-project-id").value;

            // Initialize the base map and enable the dragbox interaction
            map_utils.digital_globe_base_map({div_name: "new-project-map",
                                              center_coords: [102.0, 17.0],
                                              zoom_level: 5});

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

            // Set all the form fields to the values for the currentProject
            this.setCurrentProject();
        }
    };

    this.getProjectById = function (projectId) {
        return this.projectList.find(
            function (project) {
                return project.id == projectId;
            }
        );
    };

    this.getPlotData = function (projectId) {
        $http.get(this.root + "/get-project-plots/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                this.plotList = response.data;
                this.setCurrentProject();
                this.plotList = [];
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    this.setCurrentProject = function () {
        var project = this.getProjectById(parseInt(this.currentProjectId));
        this.currentProject = project;

        if (project) {
            if (this.plotList.length == 0) {
                this.getPlotData(project.id);
            } else {
                this.projectName = project.name;
                this.projectDescription = project.description;
                this.numPlots = this.plotList.length;
                this.plotRadius = this.plotList[0].plot.radius;
                if (project.sample_resolution) {
                    this.sampleType = "gridded";
                    document.getElementById("gridded-sample-type").checked = true;
                    utils.enable_element("samples-per-plot");
                    utils.enable_element("sample-resolution");
                } else {
                    this.sampleType = "random";
                    document.getElementById("random-sample-type").checked = true;
                    utils.enable_element("samples-per-plot");
                    utils.disable_element("sample-resolution");
                }
                this.samplesPerPlot = this.plotList[0].samples.length;
                this.sampleResolution = project.sample_resolution || "";
                var boundaryExtent = map_utils.polygon_extent(project.boundary);
                this.lonMin = boundaryExtent[0];
                this.latMin = boundaryExtent[1];
                this.lonMax = boundaryExtent[2];
                this.latMax = boundaryExtent[3];
                this.currentImagery = project.imagery;
                map_utils.set_current_imagery(this.currentImagery);
                map_utils.disable_dragbox_draw();
                map_utils.draw_polygon(project.boundary);
                this.sampleValues = project.sample_values;
                this.privacyLevel = project.privacy;
                document.getElementById("privacy-" + project.privacy).checked = true;
            }
        } else {
            this.projectName = "";
            this.projectDescription = "";
            this.numPlots = "";
            this.plotRadius = "";
            this.sampleType = "random";
            document.getElementById("random-sample-type").checked = true;
            utils.enable_element("samples-per-plot");
            utils.disable_element("sample-resolution");
            this.samplesPerPlot = "";
            this.sampleResolution = "";
            this.lonMin = "";
            this.latMin = "";
            this.lonMax = "";
            this.latMax = "";
            this.currentImagery = "DigitalGlobeWMSImagery";
            map_utils.set_current_imagery(this.currentImagery);
            map_utils.enable_dragbox_draw();
            map_utils.map_ref.removeLayer(map_utils.current_boundary);
            map_utils.current_boundary = null;
            map_utils.zoom_and_recenter_map(102.0, 17.0, 5);
            this.sampleValues = [];
        }
    };

    this.exportCurrentPlotData = function () {
        var projectId = parseInt(this.currentProjectId);
        if (projectId != 0) {
            $http.get(this.root + "/dump-project-aggregate-data/" + projectId)
                .then(function successCallback(response) {
                    window.open(response.data);
                }, function errorCallback(response) {
                    console.log(response);
                    alert("Error downloading data for this project. See console for details.");
                });
        }
    };

    this.deleteCurrentProject = function () {
        var projectId = parseInt(this.currentProjectId);
        if (projectId != 0) {
            $http.post(this.root + "/archive-project/" + projectId)
                .then(angular.bind(this, function successCallback(response) {
                    alert("Project " + projectId + " has been deleted.");
                    window.location = this.root + "/project/0";
                }), function errorCallback(response) {
                    console.log(response);
                    alert("Error archiving project. See console for details.");
                });
        }
    };

    this.submitForm = function ($event) {
        if (this.currentProjectId == "0") {
            $event.currentTarget.value = "Processing...please wait...";
            document.getElementById("spinner").style.visibility = "visible";
            document.getElementById("sample-values").value = JSON.stringify(this.sampleValues);
            document.getElementById("project-management-form").submit();
        } else {
            if (confirm("Do you REALLY want to delete this project?!")) {
                this.deleteCurrentProject();
            }
        }
    };

    this.setSampleType = function (sampleType) {
        if (sampleType == "random") {
            utils.enable_element("samples-per-plot");
            utils.disable_element("sample-resolution");
        } else {
            utils.disable_element("samples-per-plot");
            utils.enable_element("sample-resolution");
        }
    };

    this.setPrivacyLevel = function (privacyLevel) {
        this.privacyLevel = privacyLevel;
    };

    this.setCurrentImagery = function () {
        map_utils.set_current_imagery(this.currentImagery);
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

}]);
