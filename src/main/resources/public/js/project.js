var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Project = function (_React$Component) {
    _inherits(Project, _React$Component);

    function Project(props) {
        _classCallCheck(this, Project);

        var _this = _possibleConstructorReturn(this, (Project.__proto__ || Object.getPrototypeOf(Project)).call(this, props));

        _this.state = {
            userId: _this.props.userId,
            projectId: _this.props.projectId,
            institutionId: _this.props.institutionId,
            details: null,
            stats: null,
            imageryList: null,
            mapConfig: null,
            plotList: null,
            lonMin: "",
            latMin: "",
            lonMax: "",
            latMax: "",
            newSampleValueGroupName: "",
            newValueEntry: {},
            projectList: null,
            templateId: "0",
            // FIXME: Add these attributes to the JSON database
            dateCreated: null,
            datePublished: null,
            dateClosed: null,
            dateArchived: null,
            stateTransitions: {
                nonexistent: "Create",
                unpublished: "Publish",
                published: "Close",
                closed: "Archive",
                archived: "Archive"
            }
        };
        _this.setPrivacyLevel = _this.setPrivacyLevel.bind(_this);
        _this.setPlotDistribution = _this.setPlotDistribution.bind(_this);
        _this.setPlotShape = _this.setPlotShape.bind(_this);
        _this.setSampleDistribution = _this.setSampleDistribution.bind(_this);
        _this.configureGeoDash = _this.configureGeoDash.bind(_this);
        _this.downloadPlotData = _this.downloadPlotData.bind(_this);
        _this.downloadSampleData = _this.downloadSampleData.bind(_this);
        _this.closeProject = _this.closeProject.bind(_this);
        _this.changeAvailability = _this.changeAvailability.bind(_this);
        _this.setBaseMapSource = _this.setBaseMapSource.bind(_this);
        _this.addSampleValueGroup = _this.addSampleValueGroup.bind(_this);
        _this.removeSampleValueGroup = _this.removeSampleValueGroup.bind(_this);
        _this.addSampleValueRow = _this.addSampleValueRow.bind(_this);
        _this.getParentSampleValues = _this.getParentSampleValues.bind(_this);
        _this.setProjectTemplate = _this.setProjectTemplate.bind(_this);
        _this.getSampleValueGroupByName = _this.getSampleValueGroupByName.bind(_this);
        _this.removeSampleValueRow = _this.removeSampleValueRow.bind(_this);
        _this.handleInputName = _this.handleInputName.bind(_this);
        _this.handleInputColor = _this.handleInputColor.bind(_this);
        _this.handleInputParent = _this.handleInputParent.bind(_this);
        _this.handleChange = _this.handleChange.bind(_this);
        _this.topoSort = _this.topoSort.bind(_this);
        _this.createProject = _this.createProject.bind(_this);
        return _this;
    }

    _createClass(Project, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            this.initialization(this.props.documentRoot, this.state.userId, this.state.projectId, this.state.institutionId);
        }
    }, {
        key: "initialization",
        value: function initialization(documentRoot, userId, projectId, institutionId) {
            if (this.state.details == null) {
                this.getProjectById(projectId);
            } else {

                if (this.state.details.id == 0) {
                    this.state.details.privacyLevel = "private";
                    this.state.details.projectDistribution = "random";
                    this.state.details.plotShape = "circle";
                    this.state.details.sampleDistribution = "random";
                    this.getProjectList(userId, projectId);
                } else if (this.state.details.id != 0) {
                    if (document.getElementById("num-plots") != null) {
                        if (document.getElementById("plot-distribution-gridded").checked) document.getElementById("plot-design-text").innerHTML = "Description about gridded";
                        if (document.getElementById("plot-distribution-random").checked) document.getElementById("plot-design-text").innerHTML = "Description about random";
                        if (document.getElementById("plot-distribution-csv").checked) document.getElementById("plot-design-text").innerHTML = "Description about csv upload";
                        if (document.getElementById("plot-distribution-shp").checked) document.getElementById("plot-design-text").innerHTML = "Description about shp upload";

                        if (document.getElementById("sample-distribution-gridded").checked) document.getElementById("sample-design-text").innerHTML = "Description about gridded";
                        if (document.getElementById("sample-distribution-random").checked) document.getElementById("sample-design-text").innerHTML = "Description about random";
                        if (document.getElementById("sample-distribution-csv").checked) document.getElementById("sample-design-text").innerHTML = "Description about csv upload";
                        if (document.getElementById("sample-distribution-shp").checked) document.getElementById("sample-design-text").innerHTML = "Description about shp upload";
                    }
                    this.getProjectStats(projectId);
                }
                if (this.state.imageryList == null) {
                    this.getImageryList(institutionId);
                } else this.updateUnmanagedComponents(projectId);
            }
        }

        // var logFormData=function(formData)
        // {
        //     console.log(new Map(formData.entries()));
        // };

    }, {
        key: "createProject",
        value: function createProject() {
            if (confirm("Do you REALLY want to create this project?")) {
                utils.show_element("spinner");
                var formData = new FormData(document.getElementById("project-design-form"));
                formData.append("institution", this.props.institutionId);
                formData.append("plot-distribution-csv-file", document.getElementById("plot-distribution-csv-file").files[0]);
                formData.append("sample-values", JSON.stringify(this.state.details.sampleValues));
                var ref = this;
                $.ajax({
                    url: this.props.documentRoot + "/create-project",
                    type: "POST",
                    async: true,
                    crossDomain: true,
                    contentType: false,
                    processData: false,
                    data: formData
                }).fail(function () {
                    utils.hide_element("spinner");
                    alert("Error creating project. See console for details.");
                }).done(function (data) {
                    var detailsNew = ref.state.details;
                    detailsNew.availability = "unpublished";
                    ref.setState({ details: detailsNew });
                    utils.hide_element("spinner");
                    var newProjectId = data;
                    window.location = ref.props.documentRoot + "/project/" + newProjectId;
                });
            }
        }
    }, {
        key: "publishProject",
        value: function publishProject() {
            if (confirm("Do you REALLY want to publish this project?")) {
                utils.show_element("spinner");
                var ref = this;
                $.ajax({
                    url: this.props.documentRoot + "/publish-project/" + this.state.details.id,
                    type: "POST",
                    async: true,
                    crossDomain: true,
                    contentType: "application/json"
                }).fail(function (response) {
                    utils.hide_element("spinner");
                    console.log(response);
                    alert("Error publishing project. See console for details.");
                }).done(function (data) {
                    var detailsNew = ref.state.details;
                    detailsNew.availability = "published";
                    ref.setState({ details: detailsNew });
                    utils.hide_element("spinner");
                });
            }
        }
    }, {
        key: "closeProject",
        value: function closeProject() {
            if (confirm("Do you REALLY want to close this project?")) {
                utils.show_element("spinner");
                var ref = this;
                $.ajax({
                    url: this.props.documentRoot + "/close-project/" + this.state.details.id,
                    type: "POST",
                    async: true,
                    crossDomain: true,
                    contentType: "application/json"
                }).fail(function (response) {
                    utils.hide_element("spinner");
                    console.log(response);
                    alert("Error closing project. See console for details.");
                }).done(function (data) {
                    var detailsNew = ref.state.details;
                    detailsNew.availability = "closed";
                    ref.setState({ details: detailsNew });
                    utils.hide_element("spinner");
                });
            }
        }
    }, {
        key: "archiveProject",
        value: function archiveProject() {
            if (confirm("Do you REALLY want to archive this project?!")) {
                utils.show_element("spinner");
                var ref = this;
                $.ajax({
                    url: this.props.documentRoot + "/archive-project/" + this.state.details.id,
                    type: "POST",
                    async: true,
                    crossDomain: true,
                    contentType: "application/json"
                }).fail(function (response) {
                    utils.hide_element("spinner");
                    console.log(response);
                    alert("Error archiving project. See console for details.");
                }).done(function (data) {
                    var detailsNew = ref.state.details;
                    detailsNew.availability = "archived";
                    ref.setState({ details: detailsNew });
                    utils.hide_element("spinner");
                    alert("Project " + ref.state.details.id + " has been archived.");
                    window.location = ref.props.documentRoot + "/home";
                });
            }
        }
    }, {
        key: "changeAvailability",
        value: function changeAvailability() {
            if (this.state.details.availability == "nonexistent") {
                this.createProject();
            } else if (this.state.details.availability == "unpublished") {
                this.publishProject();
            } else if (this.state.details.availability == "published") {
                this.closeProject();
            } else if (this.state.details.availability == "closed") {
                this.archiveProject();
            }
        }
    }, {
        key: "configureGeoDash",
        value: function configureGeoDash() {

            if (this.state.plotList != null && this.state.details != null) {
                window.open(this.props.documentRoot + "/widget-layout-editor?editable=true&" + encodeURIComponent("institutionId=" + this.state.details.institution + "&pid=" + this.state.details.id), "_geo-dash");
            }
        }
    }, {
        key: "downloadPlotData",
        value: function downloadPlotData() {
            window.open(this.props.documentRoot + "/dump-project-aggregate-data/" + this.state.details.id, "_blank");
        }
    }, {
        key: "downloadSampleData",
        value: function downloadSampleData() {
            window.open(this.props.documentRoot + "/dump-project-raw-data/" + this.state.details.id, "_blank");
        }
    }, {
        key: "setProjectTemplate",
        value: function setProjectTemplate(event) {
            this.setState({ templateId: event.target.value });
            var templateProject = this.state.projectList.find(function (project) {
                return project.id == event.target.value;
            }, this);
            this.setState({ details: JSON.parse(JSON.stringify(templateProject)) }, function () {
                this.updateUnmanagedComponents(this.state.templateId);
            }); // clone project
        }
    }, {
        key: "setPrivacyLevel",
        value: function setPrivacyLevel(privacyLevel) {
            if (this.state.details != null) {
                var detailsNew = this.state.details;
                detailsNew.privacyLevel = privacyLevel;
                this.setState({ details: detailsNew });
            }
        }
    }, {
        key: "setBaseMapSource",
        value: function setBaseMapSource() {
            var e = document.getElementById("base-map-source");
            var bms = e.options[e.selectedIndex].value;
            var detailsNew = this.state.details;
            detailsNew.baseMapSource = bms;

            this.setState({ details: detailsNew });
            mercator.setVisibleLayer(this.state.mapConfig, this.state.details.baseMapSource);
        }
    }, {
        key: "setPlotDistribution",
        value: function setPlotDistribution(plotDistribution) {
            if (this.state.details != null) {
                var detailsNew = this.state.details;
                detailsNew.plotDistribution = plotDistribution;
                this.setState({ details: detailsNew });
                if (document.getElementById("num-plots") != null) {
                    if (plotDistribution == "random") {
                        utils.enable_element("plot-size");
                        utils.enable_element("num-plots");
                        utils.disable_element("plot-spacing");
                        utils.disable_element("plot-distribution-csv-file");
                        utils.disable_element("plot-distribution-shp-file");
                        document.getElementById("plot-design-text").innerHTML = "Description about random";
                    } else if (plotDistribution == "gridded") {
                        utils.enable_element("plot-size");
                        utils.disable_element("num-plots");
                        utils.enable_element("plot-spacing");
                        utils.disable_element("plot-distribution-csv-file");
                        utils.disable_element("plot-distribution-shp-file");
                        document.getElementById("plot-design-text").innerHTML = "Description about gridded";
                    } else if (plotDistribution == "csv") {
                        utils.enable_element("plot-size");
                        utils.disable_element("num-plots");
                        utils.disable_element("plot-spacing");
                        utils.disable_element("plot-distribution-shp-file");
                        utils.enable_element("plot-distribution-csv-file");
                        document.getElementById("plot-design-text").innerHTML = "Description about csv upload";
                    } else {
                        utils.disable_element("plot-size");
                        utils.disable_element("num-plots");
                        utils.disable_element("plot-spacing");
                        utils.disable_element("plot-distribution-csv-file");
                        utils.enable_element("plot-distribution-shp-file");
                        document.getElementById("plot-design-text").innerHTML = "Description about shp upload";
                    }
                }
            }
        }
    }, {
        key: "setPlotShape",
        value: function setPlotShape(plotShape) {
            if (this.state.details != null) {
                var detailsNew = this.state.details;
                detailsNew.plotShape = plotShape;
                this.setState({ details: detailsNew });
            }
        }
    }, {
        key: "setSampleDistribution",
        value: function setSampleDistribution(sampleDistribution) {
            if (this.state.details != null) {
                var detailsNew = this.state.details;
                detailsNew.sampleDistribution = sampleDistribution;
                this.setState({ details: detailsNew });
                if (document.getElementById("samples-per-plot") != null && document.getElementById("sample-resolution") != null) if (sampleDistribution == "random") {
                    utils.enable_element("samples-per-plot");
                    utils.disable_element("sample-resolution");
                    utils.disable_element("sample-distribution-csv-file");
                    utils.disable_element("sample-distribution-shp-file");
                    document.getElementById("sample-design-text").innerHTML = "Description about random";
                } else if (sampleDistribution == "gridded") {
                    utils.disable_element("samples-per-plot");
                    utils.enable_element("sample-resolution");
                    utils.disable_element("sample-distribution-csv-file");
                    utils.disable_element("sample-distribution-shp-file");
                    document.getElementById("sample-design-text").innerHTML = "Description about gridded";
                } else if (sampleDistribution == "csv") {
                    utils.disable_element("samples-per-plot");
                    utils.disable_element("sample-resolution");
                    utils.disable_element("sample-distribution-shp-file");
                    utils.enable_element("sample-distribution-csv-file");
                    document.getElementById("sample-design-text").innerHTML = "Description about csv upload";
                } else {
                    utils.disable_element("samples-per-plot");
                    utils.disable_element("sample-resolution");
                    utils.disable_element("sample-distribution-csv-file");
                    utils.enable_element("sample-distribution-shp-file");
                    document.getElementById("sample-design-text").innerHTML = "Description about shp upload";
                }
            }
        }
    }, {
        key: "getParentSampleValues",
        value: function getParentSampleValues(sampleValues) {
            return sampleValues.filter(function (sampleValue) {
                return sampleValue.parent == null || sampleValue.parent == "";
            });
        }
    }, {
        key: "getChildSampleValues",
        value: function getChildSampleValues(sampleValues, parentSampleValue) {
            return sampleValues.filter(function (sampleValue) {
                return sampleValue.parent == parentSampleValue.name;
            });
        }
    }, {
        key: "topoSort",
        value: function topoSort(sampleValues) {
            var parentSampleValues = this.getParentSampleValues(sampleValues);
            var parentChildGroups = parentSampleValues.map(function (parentSampleValue) {
                var childSampleValues = sampleValues.filter(function (sampleValue) {
                    return sampleValue.parent == parentSampleValue.name;
                });
                return [parentSampleValue].concat(childSampleValues);
            }, this);
            return [].concat.apply([], parentChildGroups);
        }
    }, {
        key: "addSampleValueGroup",
        value: function addSampleValueGroup() {
            if (this.state.details != null) {
                var groupName = document.getElementById("samplevaluegrouptext").value;
                if (groupName != "") {
                    var newValueEntryNew = this.state.newValueEntry;
                    newValueEntryNew[groupName] = { name: "", color: "#000000", image: "", parent: "" };
                    var detailsNew = this.state.details;
                    detailsNew.sampleValues.push({ name: groupName, values: [] });
                    this.setState({ newValueEntry: newValueEntryNew, details: detailsNew, newSampleValueGroupName: "" });
                    document.getElementById("samplevaluegrouptext").value = "";
                } else {
                    alert("Please enter a sample value group name first.");
                }
            }
        }
    }, {
        key: "removeSampleValueGroup",
        value: function removeSampleValueGroup(sampleValueGroupName) {
            if (this.state.details != null) {
                var detailsNew = this.state.details;
                detailsNew.sampleValues = detailsNew.sampleValues.filter(function (sampleValueGroup) {
                    return sampleValueGroup.name != sampleValueGroupName;
                });
                this.setState({
                    details: detailsNew
                });
            }
        }
    }, {
        key: "getSampleValueGroupByName",
        value: function getSampleValueGroupByName(sampleValueGroupName) {
            return this.state.details.sampleValues.find(function (sampleValueGroup) {
                return sampleValueGroup.name == sampleValueGroupName;
            });
        }
    }, {
        key: "removeSampleValueRow",
        value: function removeSampleValueRow(sampleValueGroupName, sampleValueName) {
            var sampleValueGroup = this.getSampleValueGroupByName(sampleValueGroupName);
            sampleValueGroup.values = sampleValueGroup.values.filter(function (sampleValue) {
                return sampleValue.name != sampleValueName && sampleValue.parent != sampleValueName;
            });
            this.setState({});
        }
    }, {
        key: "addSampleValueRow",
        value: function addSampleValueRow(sampleValueGroupName) {
            var entry = this.state.newValueEntry[sampleValueGroupName];
            if (entry.name != "") {
                var sampleValueGroup = this.getSampleValueGroupByName(sampleValueGroupName);
                sampleValueGroup.values.push({
                    name: entry.name,
                    color: entry.color,
                    image: entry.image,
                    parent: entry.parent
                });
                entry.name = "";
                entry.color = "#000000";
                entry.image = "";
                entry.parent = "";
            } else {
                alert("A sample value must possess both a name and a color.");
            }
            var dNew = this.state.newValueEntry;
            dNew[sampleValueGroupName] = entry;
            this.setState({ newValueEntry: dNew });
        }
    }, {
        key: "getProjectById",
        value: function getProjectById(projectId) {
            var _this2 = this;

            fetch(this.props.documentRoot + "/get-project-by-id/" + projectId).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            }).then(function (data) {
                if (data == "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = _this2.state.documentRoot + "/home";
                } else {
                    _this2.setState({ details: data });
                    if (_this2.state.details.id == 0) {
                        _this2.initialization(_this2.props.documentRoot, _this2.state.userId, projectId, _this2.state.institutionId);
                    } else {
                        _this2.initialization(_this2.props.documentRoot, _this2.state.userId, projectId, _this2.state.details.institution);
                    }
                }
            });
        }
    }, {
        key: "getProjectList",
        value: function getProjectList(userId, projectId) {
            var _this3 = this;

            fetch(this.props.documentRoot + "/get-all-projects?userId=" + userId).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the project list. See console for details.");
                }
            }).then(function (data) {
                _this3.setState({ projectList: data });
                var projList = _this3.state.projectList;
                projList.unshift(JSON.parse(JSON.stringify(_this3.state.details)));
                _this3.setState({ projectList: projList });
                _this3.setState({ userId: userId });
                _this3.setState({ projectId: "" + projectId });
            });
        }
    }, {
        key: "getProjectStats",
        value: function getProjectStats(projectId) {
            var _this4 = this;

            fetch(this.props.documentRoot + "/get-project-stats/" + projectId).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving project stats. See console for details.");
                }
            }).then(function (data) {
                _this4.setState({ stats: data });
            });
        }
    }, {
        key: "getImageryList",
        value: function getImageryList(institutionId) {
            var _this5 = this;

            fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institutionId).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            }).then(function (data) {
                _this5.setState({ imageryList: data });
                _this5.initialization(_this5.props.documentRoot, _this5.props.userId, _this5.state.details.id, _this5.props.institutionId);
            });
        }
    }, {
        key: "getPlotList",
        value: function getPlotList(projectId, maxPlots) {
            var _this6 = this;

            fetch(this.props.documentRoot + "/get-project-plots/" + projectId + "/" + maxPlots).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving plot list. See console for details.");
                }
            }).then(function (data) {
                _this6.setState({ plotList: data });
                _this6.showPlotCenters(projectId, maxPlots);
            });
        }
    }, {
        key: "showPlotCenters",
        value: function showPlotCenters(projectId, maxPlots) {
            if (this.state.plotList == null) {
                // Load the current project plots
                this.getPlotList(projectId, maxPlots);
            } else {
                // Draw the plot shapes on the map
                mercator.removeLayerByTitle(this.state.mapConfig, "flaggedPlots");
                mercator.removeLayerByTitle(this.state.mapConfig, "analyzedPlots");
                mercator.removeLayerByTitle(this.state.mapConfig, "unanalyzedPlots");
                mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList, this.state.details.plotShape);
            }
        }
    }, {
        key: "showProjectMap",
        value: function showProjectMap(projectId) {
            // Initialize the basemap
            if (this.state.mapConfig == null) {
                this.setState({ mapConfig: mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList) });
            }

            mercator.setVisibleLayer(this.state.mapConfig, this.state.details.baseMapSource);
            if (this.state.details.id == 0) {
                // Enable dragbox interaction if we are creating a new project
                var displayDragBoxBounds = function displayDragBoxBounds(dragBox) {
                    var extent = dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
                    // FIXME: Can we just set this.lonMin/lonMax/latMin/latMax instead?
                    document.getElementById("lon-min").value = extent[0];
                    document.getElementById("lat-min").value = extent[1];
                    document.getElementById("lon-max").value = extent[2];
                    document.getElementById("lat-max").value = extent[3];
                };
                mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
                mercator.removeLayerByTitle(this.state.mapConfig, "flaggedPlots");
                mercator.removeLayerByTitle(this.state.mapConfig, "analyzedPlots");
                mercator.removeLayerByTitle(this.state.mapConfig, "unanalyzedPlots");
                mercator.disableDragBoxDraw(this.state.mapConfig);
                mercator.enableDragBoxDraw(this.state.mapConfig, displayDragBoxBounds);
            } else {
                // Extract bounding box coordinates from the project boundary and show on the map
                var boundaryExtent = mercator.parseGeoJson(this.state.details.boundary, false).getExtent();
                this.setState({ lonMin: boundaryExtent[0] });
                this.setState({ latMin: boundaryExtent[1] });
                this.setState({ lonMax: boundaryExtent[2] });
                this.setState({ latMax: boundaryExtent[3] });

                // Display a bounding box with the project's AOI on the map and zoom to it
                mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
                mercator.addVectorLayer(this.state.mapConfig, "currentAOI", mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.details.boundary, true)), ceoMapStyles.polygon);
                mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");

                // Force reloading of the plotList
                this.setState({ plotList: null });

                // Show the plot centers on the map (but constrain to <= 100 points)
                this.showPlotCenters(projectId, 100);
            }
        }
    }, {
        key: "updateUnmanagedComponents",
        value: function updateUnmanagedComponents(projectId) {
            if (this.state.details != null) {
                // Enable the input fields that are connected to the radio buttons if their values are not null
                if (this.state.details.plotDistribution == "gridded") {
                    utils.enable_element("plot-spacing");
                }
                if (this.state.details.sampleDistribution == "gridded") {
                    utils.enable_element("sample-resolution");
                }

                if (this.state.imageryList.length > 0) {
                    var detailsNew = this.state.details;
                    detailsNew.baseMapSource = this.state.details.baseMapSource || this.state.imageryList[0].title;
                    // If baseMapSource isn't provided by the project, just use the first entry in the imageryList
                    this.setState({ details: detailsNew }, this.showProjectMap(projectId));
                    // Draw a map with the project AOI and a sampling of its plots
                }
            }
        }
    }, {
        key: "handleInputName",
        value: function handleInputName(sampleValueGroup, event) {
            var newValueEntryNew = this.state.newValueEntry;
            if (newValueEntryNew[sampleValueGroup]) {
                newValueEntryNew[sampleValueGroup].name = event.target.value;
            } else newValueEntryNew[sampleValueGroup] = { name: event.target.value, color: "#000000", image: "", parent: "" };
            this.setState({ newValueEntry: newValueEntryNew });
        }
    }, {
        key: "handleInputColor",
        value: function handleInputColor(sampleValueGroup, event) {
            var newValueEntryNew = this.state.newValueEntry;
            newValueEntryNew[sampleValueGroup].color = event.target.value;

            this.setState({ newValueEntry: newValueEntryNew });
        }
    }, {
        key: "handleInputParent",
        value: function handleInputParent(sampleValueGroup, event) {
            var newValueEntryNew = this.state.newValueEntry;
            newValueEntryNew[sampleValueGroup].parent = event.target.value;

            this.setState({ newValueEntry: newValueEntryNew });
        }
    }, {
        key: "handleChange",
        value: function handleChange(event) {
            var detailsNew = this.state.details;

            if (event.target.id == "project-name") {
                detailsNew.name = event.target.value;
            } else if (event.target.id = "project-description") {
                detailsNew.description = event.target.value;
            }
            this.setState({ details: detailsNew });
        }
    }, {
        key: "render",
        value: function render() {
            var header;
            if (this.props.projectId == "0") {
                header = React.createElement(
                    "h1",
                    null,
                    "Create Project"
                );
            } else {
                header = React.createElement(
                    "h1",
                    null,
                    "Review Project"
                );
            }
            return React.createElement(
                "div",
                { id: "project-design", className: "col-xl-6 col-lg-8 border bg-lightgray mb-5" },
                React.createElement(
                    "div",
                    { "class": "bg-darkgreen mb-3 no-container-margin" },
                    header
                ),
                React.createElement(ProjectStats, { project: this.state, project_stats_visibility: this.props.project_stats_visibility }),
                React.createElement(ProjectDesignForm, { projectId: this.props.projectId, project: this.state,
                    project_template_visibility: this.props.project_template_visibility,
                    setProjectTemplate: this.setProjectTemplate, setPrivacyLevel: this.setPrivacyLevel,
                    setSampleDistribution: this.setSampleDistribution,
                    addSampleValueRow: this.addSampleValueRow,
                    setBaseMapSource: this.setBaseMapSource,
                    setPlotDistribution: this.setPlotDistribution, setPlotShape: this.setPlotShape,
                    addSampleValueGroup: this.addSampleValueGroup,
                    topoSort: this.topoSort, getParentSampleValues: this.getParentSampleValues,
                    removeSampleValueGroup: this.removeSampleValueGroup,
                    removeSampleValueRow: this.removeSampleValueRow,
                    handleInputColor: this.handleInputColor, handleInputName: this.handleInputName,
                    handleChange: this.handleChange, handleInputParent: this.handleInputParent }),
                React.createElement(ProjectManagement, { project: this.state, projectId: this.props.projectId,
                    configureGeoDash: this.configureGeoDash, downloadPlotData: this.downloadPlotData,
                    downloadSampleData: this.downloadSampleData,
                    changeAvailability: this.changeAvailability, createProject: this.createProject })
            );
        }
    }]);

    return Project;
}(React.Component);

function ProjectStats(props) {
    var project = props.project;
    if (project.stats != null) {
        return React.createElement(
            "div",
            { className: "row mb-3" },
            React.createElement(
                "div",
                { id: "project-stats", className: "col " + props.project_stats_visibility },
                React.createElement(
                    "button",
                    { className: "btn btn-outline-lightgreen btn-sm btn-block mb-1", "data-toggle": "collapse",
                        href: "#project-stats-collapse", role: "button", "aria-expanded": "false",
                        "aria-controls": "project-stats-collapse" },
                    "Project Stats"
                ),
                React.createElement(
                    "div",
                    { className: "collapse col-xl-12", id: "project-stats-collapse" },
                    React.createElement(
                        "table",
                        { className: "table table-sm" },
                        React.createElement(
                            "tbody",
                            null,
                            React.createElement(
                                "tr",
                                null,
                                React.createElement(
                                    "td",
                                    null,
                                    "Members"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.stats.members
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    "Contributors"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.stats.contributors
                                )
                            ),
                            React.createElement(
                                "tr",
                                null,
                                React.createElement(
                                    "td",
                                    null,
                                    "Total Plots"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.details.numPlots || 0
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    "Date Created"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.dateCreated
                                )
                            ),
                            React.createElement(
                                "tr",
                                null,
                                React.createElement(
                                    "td",
                                    null,
                                    "Flagged Plots"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.stats.flaggedPlots
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    "Date Published"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.datePublished
                                )
                            ),
                            React.createElement(
                                "tr",
                                null,
                                React.createElement(
                                    "td",
                                    null,
                                    "Analyzed Plots"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.stats.analyzedPlots
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    "Date Closed"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.dateClosed
                                )
                            ),
                            React.createElement(
                                "tr",
                                null,
                                React.createElement(
                                    "td",
                                    null,
                                    "Unanalyzed Plots"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.stats.unanalyzedPlots
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    "Date Archived"
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    project.dateArchived
                                )
                            )
                        )
                    )
                )
            )
        );
    } else {
        return React.createElement("span", null);
    }
}

function ProjectDesignForm(props) {
    var addSampleValueGroupButton = "";
    if (props.projectId == "0") {
        addSampleValueGroupButton = React.createElement(
            "div",
            { id: "add-sample-value-group" },
            React.createElement("input", { type: "button", className: "button", value: "Add Sample Value Group",
                onClick: props.addSampleValueGroup }),
            "\xA0",
            React.createElement("input", { type: "text", id: "samplevaluegrouptext", autoComplete: "off", value: project.newSampleValueGroupName })
        );
    }
    return React.createElement(
        "form",
        { id: "project-design-form", className: "px-2 pb-2", method: "post",
            action: props.documentRoot + "/create-project",
            encType: "multipart/form-data" },
        React.createElement(ProjectTemplateVisibility, { project: props.project, setProjectTemplate: props.setProjectTemplate }),
        React.createElement(ProjectInfo, { project: props.project, handleChange: props.handleChange }),
        React.createElement(ProjectVisibility, { project: props.project, setPrivacyLevel: props.setPrivacyLevel }),
        React.createElement(ProjectAOI, { projectId: props.projectId, project: props.project }),
        React.createElement(ProjectImagery, { project: props.project, setBaseMapSource: props.setBaseMapSource }),
        React.createElement(PlotDesign, { project: props.project, setPlotDistribution: props.setPlotDistribution,
            setPlotShape: props.setPlotShape }),
        React.createElement(SampleDesign, { project: props.project, setSampleDistribution: props.setSampleDistribution }),
        React.createElement(SampleValueInfo, { project: props.project, projectId: props.projectId,
            addSampleValueRow: props.addSampleValueRow, topoSort: props.topoSort,
            getParentSampleValues: props.getParentSampleValues,
            removeSampleValueGroup: props.removeSampleValueGroup,
            removeSampleValueRow: props.removeSampleValueRow, handleInputColor: props.handleInputColor,
            handleInputName: props.handleInputName, handleInputParent: props.handleInputParent }),
        addSampleValueGroupButton
    );
}

function ProjectTemplateVisibility(props) {
    var project = props.project;
    if (project.projectList != null) {
        return React.createElement(
            "div",
            { className: "row " + props.project_template_visibility },
            React.createElement(
                "div",
                { className: "col" },
                React.createElement(
                    "h2",
                    { className: "header px-0" },
                    "Use Project Template (Optional)"
                ),
                React.createElement(
                    "div",
                    { id: "project-template-selector" },
                    React.createElement(
                        "div",
                        { className: "form-group" },
                        React.createElement(
                            "h3",
                            { htmlFor: "project-template" },
                            "Select Project"
                        ),
                        React.createElement(
                            "select",
                            { className: "form-control form-control-sm", id: "project-template",
                                name: "project-template",
                                size: "1", value: project.templateId, onChange: props.setProjectTemplate },
                            project.projectList.map(function (proj) {
                                return React.createElement(
                                    "option",
                                    { value: proj.id },
                                    proj.name
                                );
                            })
                        )
                    )
                )
            )
        );
    } else {
        return React.createElement("span", null);
    }
}

function ProjectInfo(props) {
    var project = props.project;
    if (project.details != null) {
        return React.createElement(
            "div",
            { className: "row" },
            React.createElement(
                "div",
                { className: "col" },
                React.createElement(
                    "h2",
                    { className: "header px-0" },
                    "Project Info"
                ),
                React.createElement(
                    "div",
                    { id: "project-info" },
                    React.createElement(
                        "div",
                        { className: "form-group" },
                        React.createElement(
                            "h3",
                            { htmlFor: "project-name" },
                            "Name"
                        ),
                        React.createElement("input", { className: "form-control form-control-sm", type: "text", id: "project-name", name: "name",
                            autoComplete: "off", defaultValue: project.details.name,
                            onChange: props.handleChange })
                    ),
                    React.createElement(
                        "div",
                        { className: "form-group" },
                        React.createElement(
                            "h3",
                            { htmlFor: "project-description" },
                            "Description"
                        ),
                        React.createElement("textarea", { className: "form-control form-control-sm", id: "project-description",
                            name: "description",
                            value: project.details.description, onChange: props.handleChange })
                    )
                )
            )
        );
    } else {
        return React.createElement("span", null);
    }
}

function ProjectVisibility(props) {
    if (props.project.details != null) {
        return React.createElement(
            "div",
            { className: "row" },
            React.createElement(
                "div",
                { className: "col" },
                React.createElement(
                    "h2",
                    { className: "header px-0" },
                    "Project Visibility"
                ),
                React.createElement(
                    "h3",
                    null,
                    "Privacy Level"
                ),
                React.createElement(
                    "div",
                    { id: "project-visibility", className: "mb-3" },
                    React.createElement(
                        "div",
                        { className: "form-check form-check-inline" },
                        React.createElement("input", { className: "form-check-input", type: "radio", id: "privacy-public", name: "privacy-level",
                            value: "public", checked: props.project.details.privacyLevel === 'public',
                            onClick: function onClick() {
                                return props.setPrivacyLevel('public');
                            } }),
                        React.createElement(
                            "label",
                            { className: "form-check-label small", htmlFor: "privacy-public" },
                            "Public: ",
                            React.createElement(
                                "i",
                                null,
                                "All Users"
                            )
                        )
                    ),
                    React.createElement(
                        "div",
                        { className: "form-check form-check-inline" },
                        React.createElement("input", { className: "form-check-input", type: "radio", id: "privacy-private", name: "privacy-level",
                            value: "private", onClick: function onClick() {
                                return props.setPrivacyLevel('private');
                            },
                            checked: props.project.details.privacyLevel === 'private' }),
                        React.createElement(
                            "label",
                            { className: "form-check-label small", htmlFor: "privacy-private" },
                            "Private: ",
                            React.createElement(
                                "i",
                                null,
                                "Group Admins"
                            )
                        )
                    ),
                    React.createElement(
                        "div",
                        { className: "form-check form-check-inline" },
                        React.createElement("input", { className: "form-check-input", type: "radio", id: "privacy-institution",
                            name: "privacy-level",
                            value: "institution", onClick: function onClick() {
                                return props.setPrivacyLevel('institution');
                            },
                            checked: props.project.details.privacyLevel === 'institution' }),
                        React.createElement(
                            "label",
                            { className: "form-check-label small", htmlFor: "privacy-institution" },
                            "Institution: ",
                            React.createElement(
                                "i",
                                null,
                                "Group Members"
                            )
                        )
                    ),
                    React.createElement(
                        "div",
                        { className: "form-check form-check-inline" },
                        React.createElement("input", { className: "form-check-input", type: "radio", id: "privacy-invitation",
                            name: "privacy-level",
                            value: "invitation", onClick: function onClick() {
                                return props.setPrivacyLevel('invitation');
                            }, disabled: true,
                            checked: props.project.details.privacyLevel === 'invitation' }),
                        React.createElement(
                            "label",
                            { className: "form-check-label small", htmlFor: "privacy-invitation" },
                            "Invitation: ",
                            React.createElement(
                                "i",
                                null,
                                "Coming Soon"
                            )
                        )
                    )
                )
            )
        );
    }
    return React.createElement("span", null);
}

function ProjectAOI(props) {
    var project = props.project;
    var msg = "";
    if (props.projectId == "0") {
        msg = React.createElement(
            "div",
            { className: "row" },
            React.createElement(
                "div",
                { className: "col small text-center mb-2" },
                "Hold CTRL and click-and-drag a bounding box on the map"
            )
        );
    }
    return React.createElement(
        "div",
        { "class": "row" },
        React.createElement(
            "div",
            { "class": "col" },
            React.createElement(
                "h2",
                { "class": "header px-0" },
                "Project AOI"
            ),
            React.createElement(
                "div",
                { id: "project-aoi" },
                React.createElement("div", { id: "project-map" }),
                msg,
                React.createElement(
                    "div",
                    { "class": "form-group mx-4" },
                    React.createElement(
                        "div",
                        { "class": "row" },
                        React.createElement(
                            "div",
                            { "class": "col-md-6 offset-md-3" },
                            React.createElement("input", { "class": "form-control form-control-sm", type: "number", id: "lat-max", name: "lat-max",
                                defaultValue: project.latMax, placeholder: "North", autocomplete: "off", min: "-90.0",
                                max: "90.0", step: "any" })
                        )
                    ),
                    React.createElement(
                        "div",
                        { "class": "row" },
                        React.createElement(
                            "div",
                            { "class": "col-md-6" },
                            React.createElement("input", { "class": "form-control form-control-sm", type: "number", id: "lon-min", name: "lon-min",
                                defaultValue: project.lonMin, placeholder: "West", autocomplete: "off", min: "-180.0",
                                max: "180.0", step: "any" })
                        ),
                        React.createElement(
                            "div",
                            { "class": "col-md-6" },
                            React.createElement("input", { "class": "form-control form-control-sm", type: "number", id: "lon-max", name: "lon-max",
                                defaultValue: project.lonMax, placeholder: "East", autocomplete: "off", min: "-180.0",
                                max: "180.0", step: "any" })
                        )
                    ),
                    React.createElement(
                        "div",
                        { "class": "row" },
                        React.createElement(
                            "div",
                            { "class": "col-md-6 offset-md-3" },
                            React.createElement("input", { "class": "form-control form-control-sm", type: "number", id: "lat-min", name: "lat-min",
                                defaultValue: project.latMin, placeholder: "South", autocomplete: "off", min: "-90.0",
                                max: "90.0", step: "any" })
                        )
                    )
                )
            )
        )
    );
}

function ProjectImagery(props) {
    var project = props.project;
    if (project.imageryList != null) {
        return React.createElement(
            "div",
            { className: "row mb-3" },
            React.createElement(
                "div",
                { className: "col" },
                React.createElement(
                    "h2",
                    { className: "header px-0" },
                    "Project Imagery"
                ),
                React.createElement(
                    "div",
                    { id: "project-imagery" },
                    React.createElement(
                        "div",
                        { className: "form-group mb-1" },
                        React.createElement(
                            "h3",
                            { htmlFor: "base-map-source" },
                            "Basemap Source"
                        ),
                        React.createElement(
                            "select",
                            { className: "form-control form-control-sm", id: "base-map-source", name: "base-map-source",
                                size: "1",
                                value: project.details.baseMapSource, onChange: props.setBaseMapSource },
                            project.imageryList.map(function (imagery) {
                                return React.createElement(
                                    "option",
                                    { value: imagery.title },
                                    imagery.title
                                );
                            })
                        )
                    )
                )
            )
        );
    } else {
        return React.createElement("span", null);
    }
}

function PlotDesign(props) {
    var project = props.project;
    var plotshape = "";
    var txt = "";
    if (project.details != null) {
        if (project.details.plotShape == 'circle') {
            txt = 'Diameter (m)';
        } else txt = 'Width (m)';
        plotshape = React.createElement(
            React.Fragment,
            null,
            React.createElement(
                "p",
                { htmlFor: "plot-size" },
                txt
            ),
            React.createElement("input", { className: "form-control form-control-sm", type: "number", id: "plot-size",
                name: "plot-size", autoComplete: "off", min: "0.0", step: "any",
                defaultValue: project.details.plotSize })
        );
        return React.createElement(
            "div",
            { className: "row mb-3" },
            React.createElement(
                "div",
                { className: "col" },
                React.createElement(
                    "h2",
                    { className: "header px-0" },
                    "Plot Design"
                ),
                React.createElement(
                    "div",
                    { id: "plot-design" },
                    React.createElement(
                        "div",
                        { className: "row" },
                        React.createElement(
                            "div",
                            { id: "plot-design-col1", className: "col" },
                            React.createElement(
                                "h3",
                                null,
                                "Spatial Distribution"
                            ),
                            React.createElement(
                                "div",
                                { className: "form-check form-check-inline" },
                                React.createElement("input", { className: "form-check-input", type: "radio", id: "plot-distribution-random",
                                    name: "plot-distribution", value: "random",
                                    onClick: function onClick() {
                                        return props.setPlotDistribution('random');
                                    },
                                    checked: props.project.details.plotDistribution === 'random' }),
                                React.createElement(
                                    "label",
                                    { className: "form-check-label small",
                                        htmlFor: "plot-distribution-random" },
                                    "Random"
                                )
                            ),
                            React.createElement(
                                "div",
                                { className: "form-check form-check-inline" },
                                React.createElement("input", { className: "form-check-input", type: "radio", id: "plot-distribution-gridded",
                                    name: "plot-distribution", defaultValue: "gridded",
                                    onClick: function onClick() {
                                        return props.setPlotDistribution('gridded');
                                    },
                                    checked: props.project.details.plotDistribution === 'gridded' }),
                                React.createElement(
                                    "label",
                                    { className: "form-check-label small",
                                        htmlFor: "plot-distribution-gridded" },
                                    "Gridded"
                                )
                            ),
                            React.createElement(
                                "div",
                                { className: "form-check form-check-inline" },
                                React.createElement("input", { className: "form-check-input", type: "radio", id: "plot-distribution-csv",
                                    name: "plot-distribution", defaultValue: "csv",
                                    onClick: function onClick() {
                                        return props.setPlotDistribution('csv');
                                    },
                                    checked: props.project.details.plotDistribution === 'csv' }),
                                React.createElement(
                                    "label",
                                    { className: "btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0",
                                        id: "custom-csv-upload" },
                                    React.createElement(
                                        "small",
                                        null,
                                        "Upload CSV"
                                    ),
                                    React.createElement("input", { type: "file", accept: "text/csv", id: "plot-distribution-csv-file",
                                        style: { display: "none" }, disabled: true })
                                )
                            ),
                            React.createElement(
                                "div",
                                { className: "form-check form-check-inline" },
                                React.createElement("input", { className: "form-check-input", type: "radio", id: "plot-distribution-shp",
                                    name: "plot-distribution", defaultValue: "shp",
                                    onClick: function onClick() {
                                        return props.setPlotDistribution('shp');
                                    },
                                    checked: props.project.details.plotDistribution === 'shp' }),
                                React.createElement(
                                    "label",
                                    { className: "btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0",
                                        id: "custom-shp-upload" },
                                    React.createElement(
                                        "small",
                                        null,
                                        "Upload SHP"
                                    ),
                                    React.createElement("input", { type: "file", accept: ".shp", id: "plot-distribution-shp-file",
                                        style: { display: "none" }, disabled: true })
                                )
                            ),
                            React.createElement(
                                "p",
                                { id: "plot-design-text" },
                                "Description about random"
                            ),
                            React.createElement(
                                "div",
                                { className: "form-group mb-1" },
                                React.createElement(
                                    "p",
                                    { htmlFor: "num-plots" },
                                    "Number of plots"
                                ),
                                React.createElement("input", { className: "form-control form-control-sm", type: "number", id: "num-plots",
                                    name: "num-plots", autoComplete: "off", min: "0", step: "1",
                                    defaultValue: project.details == null ? "" : project.details.numPlots })
                            ),
                            React.createElement(
                                "div",
                                { className: "form-group mb-1" },
                                React.createElement(
                                    "p",
                                    { htmlFor: "plot-spacing" },
                                    "Plot spacing (m)"
                                ),
                                React.createElement("input", { className: "form-control form-control-sm", type: "number", id: "plot-spacing",
                                    name: "plot-spacing", autoComplete: "off", min: "0.0", step: "any",
                                    defaultValue: project.details == null ? "" : project.details.plotSpacing,
                                    disabled: true })
                            )
                        )
                    ),
                    React.createElement("hr", null),
                    React.createElement(
                        "div",
                        { className: "row" },
                        React.createElement(
                            "div",
                            { id: "plot-design-col2", className: "col" },
                            React.createElement(
                                "h3",
                                null,
                                "Plot Shape"
                            ),
                            React.createElement(
                                "div",
                                { className: "form-check form-check-inline" },
                                React.createElement("input", { className: "form-check-input", type: "radio", id: "plot-shape-circle",
                                    name: "plot-shape", defaultValue: "circle",
                                    onClick: function onClick() {
                                        return props.setPlotShape('circle');
                                    },
                                    checked: props.project.details.plotShape === 'circle' }),
                                React.createElement(
                                    "label",
                                    { className: "form-check-label small", htmlFor: "plot-shape-circle" },
                                    "Circle"
                                )
                            ),
                            React.createElement(
                                "div",
                                { className: "form-check form-check-inline" },
                                React.createElement("input", { className: "form-check-input", type: "radio", id: "plot-shape-square",
                                    name: "plot-shape", defaultValue: "square",
                                    onClick: function onClick() {
                                        return props.setPlotShape('square');
                                    },
                                    checked: props.project.details.plotShape === 'square' }),
                                React.createElement(
                                    "label",
                                    { className: "form-check-label small", htmlFor: "plot-shape-square" },
                                    "Square"
                                )
                            ),
                            plotshape
                        )
                    )
                )
            )
        );
    } else {
        return React.createElement("span", null);
    }
}

function SampleDesign(props) {
    var project = props.project;
    if (project.details != null) {
        return React.createElement(
            "div",
            { className: "row mb-3" },
            React.createElement(
                "div",
                { className: "col" },
                React.createElement(
                    "div",
                    { id: "sample-design" },
                    React.createElement(
                        "h2",
                        { className: "header px-0" },
                        "Sample Design"
                    ),
                    React.createElement(
                        "h3",
                        null,
                        "Spatial Distribution"
                    ),
                    React.createElement(
                        "div",
                        { className: "form-check form-check-inline" },
                        React.createElement("input", { className: "form-check-input", type: "radio", id: "sample-distribution-random",
                            name: "sample-distribution", defaultValue: "random",
                            onClick: function onClick() {
                                return props.setSampleDistribution('random');
                            },
                            checked: props.project.details.sampleDistribution === 'random' }),
                        React.createElement(
                            "label",
                            { className: "form-check-label small",
                                htmlFor: "sample-distribution-random" },
                            "Random"
                        )
                    ),
                    React.createElement(
                        "div",
                        { className: "form-check form-check-inline" },
                        React.createElement("input", { className: "form-check-input", type: "radio", id: "sample-distribution-gridded",
                            name: "sample-distribution", defaultValue: "gridded",
                            onClick: function onClick() {
                                return props.setSampleDistribution('gridded');
                            },
                            checked: props.project.details.sampleDistribution === 'gridded' }),
                        React.createElement(
                            "label",
                            { className: "form-check-label small",
                                htmlFor: "sample-distribution-gridded" },
                            "Gridded"
                        )
                    ),
                    React.createElement(
                        "div",
                        { className: "form-check form-check-inline" },
                        React.createElement("input", { className: "form-check-input", type: "radio", id: "sample-distribution-csv",
                            name: "sample-distribution", defaultValue: "csv",
                            onClick: function onClick() {
                                return props.setSampleDistribution('csv');
                            },
                            checked: props.project.details.sampleDistribution === 'csv' }),
                        React.createElement(
                            "label",
                            { className: "btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0",
                                id: "sample-custom-csv-upload" },
                            React.createElement(
                                "small",
                                null,
                                "Upload CSV"
                            ),
                            React.createElement("input", { type: "file", accept: "text/csv", id: "sample-distribution-csv-file",
                                style: { display: "none" }, disabled: true })
                        )
                    ),
                    React.createElement(
                        "div",
                        { className: "form-check form-check-inline" },
                        React.createElement("input", { className: "form-check-input", type: "radio", id: "sample-distribution-shp",
                            name: "sample-distribution", defaultValue: "shp",
                            onClick: function onClick() {
                                return props.setSampleDistribution('shp');
                            },
                            checked: props.project.details.sampleDistribution === 'shp' }),
                        React.createElement(
                            "label",
                            { className: "btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0",
                                id: "sample-custom-shp-upload" },
                            React.createElement(
                                "small",
                                null,
                                "Upload SHP"
                            ),
                            React.createElement("input", { type: "file", accept: ".shp", id: "sample-distribution-shp-file",
                                style: { display: "none" }, disabled: true })
                        )
                    ),
                    React.createElement(
                        "p",
                        { id: "sample-design-text" },
                        "Description about random"
                    ),
                    React.createElement(
                        "div",
                        { className: "form-group mb-1" },
                        React.createElement(
                            "p",
                            { htmlFor: "samples-per-plot" },
                            "Samples per plot"
                        ),
                        React.createElement("input", { className: "form-control form-control-sm", type: "number", id: "samples-per-plot",
                            name: "samples-per-plot", autoComplete: "off", min: "0", step: "1",
                            defaultValue: project.details.samplesPerPlot })
                    ),
                    React.createElement(
                        "div",
                        { className: "form-group mb-1" },
                        React.createElement(
                            "p",
                            { htmlFor: "sample-resolution" },
                            "Sample resolution (m)"
                        ),
                        React.createElement("input", { className: "form-control form-control-sm", type: "number", id: "sample-resolution",
                            name: "sample-resolution", autoComplete: "off", min: "0.0", step: "any",
                            defaultValue: project.details.sampleResolution, disabled: true })
                    )
                )
            )
        );
    } else return React.createElement("span", null);
}

function SampleValueInfo(props) {
    var project = props.project;
    if (project.details != null) {
        return project.details.sampleValues.map(function (sampleValueGroup) {
            return React.createElement(
                "div",
                { className: "sample-value-info" },
                React.createElement(
                    "h2",
                    { className: "header px-0" },
                    React.createElement(RemoveSampleValueGroupButton, { projectId: props.projectId,
                        removeSampleValueGroup: props.removeSampleValueGroup,
                        sampleValueGroup: sampleValueGroup }),
                    "Sample Value Group: ",
                    sampleValueGroup.name
                ),
                React.createElement(
                    "table",
                    { className: "table table-sm" },
                    React.createElement(
                        "thead",
                        null,
                        React.createElement(
                            "tr",
                            null,
                            React.createElement("th", { scope: "col" }),
                            React.createElement(
                                "th",
                                { scope: "col" },
                                "Name"
                            ),
                            React.createElement(
                                "th",
                                { scope: "col" },
                                "Color"
                            ),
                            React.createElement(
                                "th",
                                { scope: "col" },
                                "\xA0"
                            )
                        )
                    ),
                    React.createElement(
                        "tbody",
                        null,
                        props.topoSort(sampleValueGroup.values).map(function (sampleValue) {
                            return React.createElement(
                                "tr",
                                null,
                                React.createElement(
                                    "td",
                                    null,
                                    React.createElement(RemoveSampleValueRowButton, { projectId: props.projectId,
                                        removeSampleValueRow: props.removeSampleValueRow,
                                        sampleValueGroup: sampleValueGroup,
                                        sampleValue: sampleValue })
                                ),
                                React.createElement(
                                    "td",
                                    { style: {
                                            "font-style": sampleValue.parent == null || sampleValue.parent == '' ? 'normal' : 'italic', "text-indent": '10px'
                                        } },
                                    sampleValue.name
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    React.createElement("div", { className: "circle",
                                        style: { "background-color": sampleValue.color, border: "solid 1px" } })
                                ),
                                React.createElement(
                                    "td",
                                    null,
                                    "\xA0"
                                )
                            );
                        }),
                        React.createElement(SampleValueTable, { project: project, projectId: props.projectId,
                            sampleValueGroup: sampleValueGroup,
                            getParentSampleValues: props.getParentSampleValues,
                            addSampleValueRow: props.addSampleValueRow,
                            handleInputName: props.handleInputName,
                            handleInputColor: props.handleInputColor,
                            handleInputParent: props.handleInputParent })
                    )
                )
            );
        });
    } else {
        return React.createElement("span", null);
    }
}

function RemoveSampleValueGroupButton(props) {
    if (props.projectId == "0") {
        return React.createElement("input", { id: "remove-sample-value-group", type: "button", className: "button", value: "-",
            onClick: function onClick() {
                return props.removeSampleValueGroup(props.sampleValueGroup.name);
            } });
    } else return React.createElement("span", null);
}

function RemoveSampleValueRowButton(props) {
    if (props.projectId == "0") {
        if (props.sampleValue) {
            return React.createElement("input", { type: "button", className: "button", value: "-",
                onClick: function onClick() {
                    return props.removeSampleValueRow(props.sampleValueGroup.name, props.sampleValue.name);
                } });
        } else return React.createElement("h1", null);
    } else return React.createElement("span", null);
}

function SampleValueTable(props) {
    var project = props.project;
    var name = "",
        color = "",
        parent = "";
    if (project.newValueEntry[props.sampleValueGroup.name]) {
        name = project.newValueEntry[props.sampleValueGroup.name].name;
        color = project.newValueEntry[props.sampleValueGroup.name].color;
        parent = project.newValueEntry[props.sampleValueGroup.name].parent;
    }
    if (props.projectId == "0") {
        return React.createElement(
            "tr",
            null,
            React.createElement(
                "td",
                null,
                React.createElement("input", { type: "button", className: "button", value: "+",
                    onClick: function onClick() {
                        return props.addSampleValueRow(props.sampleValueGroup.name);
                    } })
            ),
            React.createElement(
                "td",
                null,
                React.createElement("input", { type: "text", className: "value-name", autoComplete: "off",
                    value: name, onChange: function onChange(e) {
                        return props.handleInputName(props.sampleValueGroup.name, e);
                    } })
            ),
            React.createElement(
                "td",
                null,
                React.createElement("input", { type: "color", className: "value-color",
                    value: color, onChange: function onChange(e) {
                        return props.handleInputColor(props.sampleValueGroup.name, e);
                    } })
            ),
            React.createElement(
                "td",
                null,
                React.createElement(
                    "label",
                    { htmlFor: "value-parent" },
                    "Parent:"
                ),
                React.createElement(
                    "select",
                    { id: "value-parent", className: "form-control form-control-sm", size: "1", defaultValue: parent,
                        onChange: function onChange(e) {
                            return props.handleInputParent(props.sampleValueGroup.name, e);
                        } },
                    React.createElement(
                        "option",
                        { value: "" },
                        "None"
                    ),
                    props.getParentSampleValues(props.sampleValueGroup.values).map(function (parentSampleValue) {
                        return React.createElement(
                            "option",
                            { value: parentSampleValue.name },
                            parentSampleValue.name
                        );
                    })
                )
            )
        );
    } else return React.createElement("span", null);
}

function ProjectManagement(props) {
    var project = props.project;
    var buttons = "";
    if (props.projectId == "0") {
        buttons = React.createElement("input", { type: "button", id: "create-project", className: "btn btn-outline-danger btn-sm btn-block",
            name: "create-project", value: "Create Project",
            onClick: props.createProject });
    } else {
        if (project.details != null) {
            buttons = React.createElement(
                React.Fragment,
                null,
                React.createElement("input", { type: "button", id: "configure-geo-dash", className: "btn btn-outline-lightgreen btn-sm btn-block",
                    name: "configure-geo-dash", value: "Configure Geo-Dash",
                    onClick: props.configureGeoDash,
                    style: { display: project.details.availability == 'unpublished' || project.details.availability == 'published' ? 'block' : 'none' } }),
                React.createElement("input", { type: "button", id: "download-plot-data",
                    className: "btn btn-outline-lightgreen btn-sm btn-block",
                    name: "download-plot-data", value: "Download Plot Data",
                    onClick: props.downloadPlotData,
                    style: { display: project.details.availability == 'published' || project.details.availability == 'closed' ? 'block' : 'none' } }),
                React.createElement("input", { type: "button", id: "download-sample-data",
                    className: "btn btn-outline-lightgreen btn-sm btn-block",
                    name: "download-sample-data", value: "Download Sample Data",
                    onClick: props.downloadSampleData,
                    style: { display: project.details.availability == 'published' || project.details.availability == 'closed' ? 'block' : 'none' } }),
                React.createElement("input", { type: "button", id: "change-availability",
                    className: "btn btn-outline-danger btn-sm btn-block",
                    name: "change-availability",
                    value: project.stateTransitions[project.details.availability] + "Project",
                    onClick: props.changeAvailability })
            );
        }
    }
    return React.createElement(
        "div",
        { id: "project-management", className: "col mb-3" },
        React.createElement(
            "h2",
            { className: "header px-0" },
            "Project Management"
        ),
        React.createElement(
            "div",
            { className: "row" },
            buttons,
            React.createElement("div", { id: "spinner" })
        )
    );
}