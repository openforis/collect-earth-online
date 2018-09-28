var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Collection = function (_React$Component) {
    _inherits(Collection, _React$Component);

    function Collection(props) {
        _classCallCheck(this, Collection);

        var _this = _possibleConstructorReturn(this, (Collection.__proto__ || Object.getPrototypeOf(Collection)).call(this, props));

        _this.state = {
            documentRoot: _this.props.documentRoot,
            currentProject: null,
            stats: null,
            plotList: null,
            imageryList: null,
            currentImagery: { attribution: "" },
            imageryYearDG: 2009,
            stackingProfileDG: "Accuracy_Profile",
            imageryYearPlanet: 2018,
            imageryMonthPlanet: "03",
            mapConfig: null,
            currentPlot: null,
            userSamples: {},
            statClass: "projNoStats",
            arrowState: "arrow-down",
            showSideBar: false,
            mapClass: "fullmap",
            quitClass: "quit-full"
        };
        _this.setBaseMapSource = _this.setBaseMapSource.bind(_this);
        _this.updateDGWMSLayer = _this.updateDGWMSLayer.bind(_this);
        _this.updatePlanetLayer = _this.updatePlanetLayer.bind(_this);
        _this.nextPlot = _this.nextPlot.bind(_this);
        _this.setCurrentValue = _this.setCurrentValue.bind(_this);
        _this.loadPlotById = _this.loadPlotById.bind(_this);
        _this.saveValues = _this.saveValues.bind(_this);
        return _this;
    }

    _createClass(Collection, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            this.initialization();
        }
    }, {
        key: "getProjectById",
        value: function getProjectById() {
            var _this2 = this;

            fetch(this.state.documentRoot + "/get-project-by-id/" + this.props.projectId).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            }).then(function (data) {
                if (data == null || data.id == 0) {
                    alert("No project found with ID " + _this2.props.projectId + ".");
                    window.location = _this2.state.documentRoot + "/home";
                } else {
                    _this2.setState({ currentProject: data });
                    _this2.getImageryList(data.institution);
                }
            });
        }
    }, {
        key: "getProjectStats",
        value: function getProjectStats() {
            var _this3 = this;

            fetch(this.state.documentRoot + "/get-project-stats/" + this.props.projectId).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error getting project stats. See console for details.");
                }
            }).then(function (data) {
                _this3.setState({ stats: data });
                //   this.initialization();
            });
        }
    }, {
        key: "getProjectPlots",
        value: function getProjectPlots() {
            var _this4 = this;

            fetch(this.state.documentRoot + "/get-project-plots/" + this.props.projectId + "/1000").then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error loading plot data. See console for details.");
                }
            }).then(function (data) {
                _this4.setState({ plotList: data });
            });
        }
    }, {
        key: "getImageryList",
        value: function getImageryList(institution) {
            var _this5 = this;

            fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + institution).then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            }).then(function (data) {
                _this5.setState({ imageryList: data });
            });
        }
    }, {
        key: "setBaseMapSource",
        value: function setBaseMapSource() {
            if (this.state.currentProject != null && this.state.mapConfig != null) {
                var bms = document.getElementById("base-map-source");
                if (bms != null) {
                    var proj = this.state.currentProject;
                    proj.baseMapSource = bms.options[bms.selectedIndex].value;
                    this.setState({ currentProject: proj });
                }
                mercator.setVisibleLayer(this.state.mapConfig, this.state.currentProject.baseMapSource);
                var cimagery = this.getImageryByTitle(this.state.currentProject.baseMapSource);
                this.setState({ currentImagery: cimagery });
                if (this.state.currentProject.baseMapSource == "DigitalGlobeWMSImagery") {
                    cimagery.attribution += " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")";
                    this.setState({ currentImagery: cimagery });
                    this.updateDGWMSLayer();
                } else if (this.state.currentProject.baseMapSource == "PlanetGlobalMosaic") {
                    cimagery.attribution += " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet;
                    this.setState({ currentImagery: cimagery });
                    this.updatePlanetLayer();
                }
            }
        }
    }, {
        key: "showProjectPlots",
        value: function showProjectPlots() {
            var _this6 = this;

            if (this.state.plotList != null) {
                mercator.addPlotLayer(this.state.mapConfig, this.state.plotList, function (feature) {
                    // FIXME: These three assignments don't appear to do anything
                    _this6.setState({ showSideBar: true });
                    _this6.setState({ mapClass: "sidemap" });
                    _this6.setState({ quitClass: "quit-side" });
                    _this6.loadPlotById(feature.get("features")[0].get("plotId"));
                });
            }
        }
    }, {
        key: "getImageryByTitle",
        value: function getImageryByTitle(imageryTitle) {
            return this.state.imageryList.find(function (imagery) {
                return imagery.title == imageryTitle;
            });
        }
    }, {
        key: "updateDGWMSLayer",
        value: function updateDGWMSLayer() {
            mercator.updateLayerWmsParams(this.state.mapConfig, "DigitalGlobeWMSImagery", {
                COVERAGE_CQL_FILTER: "(acquisition_date>='" + this.state.imageryYearDG + "-01-01')" + "AND(acquisition_date<='" + this.state.imageryYearDG + "-12-31')",
                FEATUREPROFILE: this.state.stackingProfileDG
            });
        }
    }, {
        key: "updatePlanetLayer",
        value: function updatePlanetLayer() {
            mercator.updateLayerSource(this.state.mapConfig, "PlanetGlobalMosaic", function (sourceConfig) {
                sourceConfig.month = this.state.imageryMonthPlanet;
                sourceConfig.year = this.state.imageryYearPlanet;
                return sourceConfig;
            }, this);
        }
    }, {
        key: "loadPlotById",
        value: function loadPlotById(plotId) {
            var mapConfig = this.state.mapConfig;
            var currentPlot = this.state.currentPlot;
            if (this.state.currentPlot == null) {
                this.getPlotDataById(plotId);
            } else {
                // FIXME: What is the minimal set of these that I can execute?
                utils.enable_element("new-plot-button");
                utils.enable_element("flag-plot-button");
                if (document.getElementById("flag-plot-button") != null) {
                    var ref = this;
                    document.getElementById("flag-plot-button").onclick = function () {
                        ref.flagPlot();
                    };
                }
                utils.disable_element("save-values-button");

                // FIXME: These classes should be handled with an ng-if in collection.ftl
                document.getElementById("go-to-first-plot-button").classList.add("d-none");
                document.getElementById("plot-nav").classList.remove("d-none");

                // FIXME: These three assignments don't appear to do anything
                this.setState({ showSideBar: true });
                this.setState({ mapClass: "sidemap" });
                this.setState({ quitClass: "quit-side" });

                // FIXME: Move these calls into a function in mercator-openlayers.js
                mercator.disableSelection(mapConfig);
                mercator.removeLayerByTitle(mapConfig, "currentSamples");
                mercator.addVectorLayer(mapConfig, "currentSamples", mercator.samplesToVectorSource(currentPlot.samples), ceoMapStyles.redPoint);
                mercator.enableSelection(mapConfig, "currentSamples");
                mercator.zoomMapToLayer(mapConfig, "currentSamples");
                window.open(this.state.documentRoot + "/geo-dash?editable=false&" + encodeURIComponent("title=" + this.state.currentProject.name + "&pid=" + this.props.projectId + "&aoi=[" + mercator.getViewExtent(mapConfig) + "]&daterange=&bcenter=" + currentPlot.center + "&bradius=" + this.state.currentProject.plotSize / 2), "_geo-dash");
            }
        }
    }, {
        key: "getPlotDataById",
        value: function getPlotDataById(plotId) {
            var _this7 = this;

            fetch(this.state.documentRoot + "/get-unanalyzed-plot-by-id/" + this.props.projectId + "/" + plotId).then(function (response) {
                if (response.ok) {
                    return response.text();
                } else {
                    console.log(response);
                    alert("Error retrieving plot data. See console for details.");
                }
            }).then(function (data) {
                if (data == "done") {
                    _this7.setState({ currentPlot: null });
                    _this7.showProjectPlots();
                    alert("This plot has already been analyzed.");
                } else if (data == "not found") {
                    _this7.setState({ currentPlot: null });
                    _this7.showProjectPlots();
                    alert("No plot with ID " + plotId + " found.");
                } else {
                    _this7.setState({ currentPlot: JSON.parse(data) });
                    _this7.loadPlotById(plotId);
                }
            });
        }
    }, {
        key: "setCurrentValue",
        value: function setCurrentValue(sampleValueGroup, sampleValue) {
            var selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig);
            if (selectedFeatures && selectedFeatures.getLength() > 0) {
                selectedFeatures.forEach(function (sample) {
                    var sampleId = sample.get("sampleId");
                    var uSamples = this.state.userSamples;
                    if (!this.state.userSamples[sampleId]) {
                        uSamples[sampleId] = {};
                        this.setState({ userSamples: uSamples });
                    }
                    uSamples[sampleId][sampleValueGroup.name] = sampleValue.name;
                    this.setState({ userSamples: uSamples });
                    mercator.highlightSamplePoint(sample, sampleValue.color);
                }, this // necessary to pass outer scope into function
                );
                selectedFeatures.clear();
                utils.blink_border(sampleValue.name + "_" + sampleValue.id);
                if (Object.keys(this.state.userSamples).length == this.state.currentPlot.samples.length && Object.values(this.state.userSamples).every(function (values) {
                    return Object.keys(values).length == this.state.currentProject.sampleValues.length;
                }, this)) {
                    // FIXME: What is the minimal set of these that I can execute?
                    utils.enable_element("save-values-button");
                    if (document.getElementById("save-values-button") != null) {
                        var ref = this;
                        document.getElementById("save-values-button").onclick = function () {
                            ref.saveValues();
                        };
                    }
                    utils.disable_element("new-plot-button");
                }
            } else {
                alert("No sample points selected. Please click some first.");
            }
        }
    }, {
        key: "flagPlot",
        value: function flagPlot() {
            var ref = this;
            if (ref.state.currentPlot != null) {
                $.ajax({
                    url: ref.state.documentRoot + "/flag-plot",
                    type: "POST",
                    async: true,
                    crossDomain: true,
                    contentType: false,
                    processData: false,
                    data: JSON.stringify({
                        projectId: ref.props.projectId,
                        plotId: ref.state.currentPlot.id,
                        userId: ref.props.userName
                    })
                }).fail(function () {
                    alert("Error flagging plot as bad. See console for details.");
                }).done(function (data) {
                    var statistics = ref.state.stats;
                    statistics.flaggedPlots = statistics.flaggedPlots + 1;
                    ref.setState({ stats: statistics });
                    ref.nextPlot();
                });
            }
        }
    }, {
        key: "nextPlot",
        value: function nextPlot() {
            // FIXME: What is the minimal set of these that I can execute?
            utils.enable_element("new-plot-button");
            utils.enable_element("flag-plot-button");
            utils.disable_element("save-values-button");

            // FIXME: These classes should be handled with an ng-if in collection.ftl
            document.getElementById("go-to-first-plot-button").classList.add("d-none");
            document.getElementById("plot-nav").classList.remove("d-none");
            // FIXME: These three assignments don't appear to do anything
            this.setState({ showSideBar: true });
            this.setState({ mapClass: "sidemap" });
            this.setState({ quitClass: "quit-side" });
            mercator.removeLayerByTitle(this.state.mapConfig, "currentPlots");
            mercator.removeLayerByTitle(this.state.mapConfig, "currentSamples");
            this.setState({ currentPlot: null });
            this.setState({ userSamples: {} });
            this.loadRandomPlot();
        }
    }, {
        key: "loadRandomPlot",
        value: function loadRandomPlot() {
            if (this.state.currentPlot == null) {
                this.getPlotData();
            } else {
                // FIXME: What is the minimal set of these that I can execute?
                utils.enable_element("flag-plot-button");

                // FIXME: Move these calls into a function in mercator-openlayers.js
                mercator.disableSelection(this.state.mapConfig);
                mercator.removeLayerByTitle(this.state.mapConfig, "currentSamples");
                mercator.addVectorLayer(this.state.mapConfig, "currentSamples", mercator.samplesToVectorSource(this.state.currentPlot.samples), ceoMapStyles.redPoint);
                mercator.enableSelection(this.state.mapConfig, "currentSamples");
                mercator.zoomMapToLayer(this.state.mapConfig, "currentSamples");

                window.open(this.state.documentRoot + "/geo-dash?editable=false&" + encodeURIComponent("title=" + this.state.currentProject.name + "&pid=" + this.props.projectId + "&aoi=[" + mercator.getViewExtent(this.state.mapConfig) + "]&daterange=&bcenter=" + this.state.currentPlot.center + "&bradius=" + this.state.currentProject.plotSize / 2), "_geo-dash");
            }
        }
    }, {
        key: "getPlotData",
        value: function getPlotData() {
            var _this8 = this;

            fetch(this.state.documentRoot + "/get-unanalyzed-plot/" + this.props.projectId).then(function (response) {
                if (response.ok) {
                    return response.text();
                } else {
                    console.log(response);
                    alert("Error retrieving plot data. See console for details.");
                }
            }).then(function (data) {
                if (data == "done") {
                    _this8.setState({ currentPlot: null });
                    // FIXME: What is the minimal set of these that I can execute?
                    utils.disable_element("new-plot-button");
                    utils.disable_element("flag-plot-button");
                    utils.disable_element("save-values-button");
                    alert("All plots have been analyzed for this project.");
                } else {
                    _this8.setState({ currentPlot: JSON.parse(data) });
                    _this8.loadRandomPlot();
                }
            });
        }
    }, {
        key: "assignedPercentage",
        value: function assignedPercentage() {
            if (this.state.currentProject == null || this.state.stats == null) {
                return "0.00";
            } else {
                return (100.0 * this.state.stats.analyzedPlots / this.state.currentProject.numPlots).toFixed(2);
            }
        }
    }, {
        key: "flaggedPercentage",
        value: function flaggedPercentage() {
            if (this.state.currentProject == null || this.state.stats == null) {
                return "0.00";
            } else {
                return (100.0 * this.state.stats.flaggedPlots / this.state.currentProject.numPlots).toFixed(2);
            }
        }
    }, {
        key: "completedPercentage",
        value: function completedPercentage() {
            if (this.state.currentProject == null || this.state.stats == null) {
                return "0.00";
            } else {
                return (100.0 * (this.state.stats.analyzedPlots + this.state.stats.flaggedPlots) / this.state.currentProject.numPlots).toFixed(2);
            }
        }
    }, {
        key: "saveValues",
        value: function saveValues() {
            var ref = this;
            $.ajax({
                url: ref.state.documentRoot + "/add-user-samples",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: false,
                processData: false,
                data: JSON.stringify({
                    projectId: ref.props.projectId,
                    plotId: ref.state.currentPlot.id,
                    userId: ref.props.userName,
                    userSamples: ref.state.userSamples
                })
            }).fail(function () {
                alert("Error saving your assignments to the database. See console for details.");
            }).done(function (data) {
                var statistics = ref.state.stats;
                statistics.analyzedPlots = statistics.analyzedPlots + 1;
                ref.setState({ stats: statistics });
                ref.nextPlot();
            });
        }
    }, {
        key: "showProjectMap",
        value: function showProjectMap() {
            this.setState({ mapConfig: mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, this.state.imageryList) });
            this.setBaseMapSource();
            // Show the project's boundary
            mercator.addVectorLayer(this.state.mapConfig, "currentAOI", mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary, true)), ceoMapStyles.polygon);
            mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
            // Draw the project plots as clusters on the map
            this.showProjectPlots();
        }
    }, {
        key: "initialization",
        value: function initialization() {
            var _this9 = this;

            this.getProjectById();
            this.getProjectStats();
            this.getProjectPlots();
            setTimeout(function () {
                if (_this9.state.imageryList != null && _this9.state.imageryList.length > 0) {
                    _this9.showProjectMap();
                }
            }, 250);
        }
    }, {
        key: "render",
        value: function render() {
            return React.createElement(
                React.Fragment,
                null,
                React.createElement(ImageAnalysisPane, { collection: this.state, nextPlot: this.nextPlot }),
                React.createElement(
                    "div",
                    { id: "sidebar", className: "col-xl-3" },
                    React.createElement(SideBar, { collection: this.state, setBaseMapSource: this.setBaseMapSource,
                        setCurrentValue: this.setCurrentValue, updateDGWMSLayer: this.updateDGWMSLayer,
                        updatePlanetLayer: this.updatePlanetLayer, nextPlot: this.nextPlot,
                        flagPlot: this.flagPlot,
                        assignedPercentage: this.assignedPercentage(), flaggedPercentage: this.flaggedPercentage(),
                        completedPercentage: this.completedPercentage()
                    })
                )
            );
        }
    }]);

    return Collection;
}(React.Component);

function ImageAnalysisPane(props) {
    var showSidebar;
    var collection = props.collection;
    if (collection.showSideBar) {
        showSidebar = React.createElement(
            "div",
            null,
            React.createElement(
                "span",
                { id: "action-button", name: "collection-actioncall", title: "Click a plot to analyze:",
                    alt: "Click a plot to analyze" },
                "Click a plot to analyze, or:",
                React.createElement("p", null),
                React.createElement("br", null),
                React.createElement(
                    "span",
                    { className: "button", onClick: props.nextPlot },
                    "Analyze random plot"
                ),
                React.createElement("br", { style: { clear: "both" } }),
                React.createElement("br", { style: { clear: "both" } })
            )
        );
    } else {
        showSidebar = React.createElement(
            "div",
            { style: { position: "relative" } },
            React.createElement(
                "span",
                { id: "action-button", name: "collection-actioncall", title: "Select each plot to choose value",
                    alt: "Select each plot to choose value" },
                "Select each dot to choose value"
            )
        );
    }
    return React.createElement(
        "div",
        { id: "image-analysis-pane", className: "col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height" },
        React.createElement(
            "div",
            { className: "buttonHolder d-none" },
            showSidebar
        ),
        React.createElement(
            "div",
            { id: "imagery-info", className: "row d-none" },
            React.createElement(
                "p",
                { className: "col small" },
                collection.currentImagery.attribution
            )
        )
    );
}

function SideBar(props) {
    var collection = props.collection;
    return React.createElement(
        React.Fragment,
        null,
        React.createElement(
            "h2",
            { className: "header" },
            collection.currentProject == null ? "" : collection.currentProject.name
        ),
        React.createElement(SideBarFieldSet, { collection: props.collection, setBaseMapSource: props.setBaseMapSource,
            setCurrentValue: props.setCurrentValue,
            updateDGWMSLayer: props.updateDGWMSLayer, updatePlanetLayer: props.updatePlanetLayer,
            nextPlot: props.nextPlot, flagPlot: props.flagPlot }),
        React.createElement(
            "div",
            { className: "row" },
            React.createElement(
                "div",
                { className: "col-sm-12 btn-block" },
                React.createElement(
                    "button",
                    { id: "save-values-button", className: "btn btn-outline-lightgreen btn-sm btn-block",
                        type: "button",
                        name: "save-values", style: { opacity: "0.5" }, disabled: true },
                    "Save"
                ),
                React.createElement(
                    "button",
                    { className: "btn btn-outline-lightgreen btn-sm btn-block mb-1", "data-toggle": "collapse",
                        href: "#project-stats-collapse", role: "button", "aria-expanded": "false",
                        "aria-controls": "project-stats-collapse" },
                    "Project Stats"
                ),
                React.createElement(
                    "div",
                    { className: "row justify-content-center mb-1 text-center" },
                    React.createElement(
                        "div",
                        { className: "col-lg-12" },
                        React.createElement(
                            "fieldset",
                            _defineProperty({ id: "projStats", className: "collection.statClass" }, "className", "text-center"),
                            React.createElement(
                                "div",
                                { className: "collapse", id: "project-stats-collapse" },
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
                                                { className: "small" },
                                                "Project"
                                            ),
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                collection.currentProject == null ? "" : collection.currentProject.name
                                            )
                                        ),
                                        React.createElement(
                                            "tr",
                                            null,
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                "Plots Assigned"
                                            ),
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                collection.stats == null ? "" : collection.stats.analyzedPlots,
                                                "(",
                                                props.assignedPercentage,
                                                "%)"
                                            )
                                        ),
                                        React.createElement(
                                            "tr",
                                            null,
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                "Plots Flagged"
                                            ),
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                collection.stats == null ? "" : collection.stats.flaggedPlots,
                                                "(",
                                                props.flaggedPercentage,
                                                "%)"
                                            )
                                        ),
                                        React.createElement(
                                            "tr",
                                            null,
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                "Plots Completed"
                                            ),
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                collection.stats == null ? "" : collection.stats.analyzedPlots + collection.stats.flaggedPlots,
                                                "(",
                                                props.completedPercentage,
                                                "%)"
                                            )
                                        ),
                                        React.createElement(
                                            "tr",
                                            null,
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                "Plots Total"
                                            ),
                                            React.createElement(
                                                "td",
                                                { className: "small" },
                                                collection.currentProject == null ? "" : collection.currentProject.numPlots
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                React.createElement(
                    "button",
                    { id: "collection-quit-button", className: "btn btn-outline-danger btn-block btn-sm",
                        type: "button",
                        name: "collection-quit", "data-toggle": "modal",
                        "data-target": "#confirmation-quit" },
                    "Quit"
                )
            )
        )
    );
}

function SideBarFieldSet(props) {
    var collection = props.collection;
    var selectDG, selectPlanet;
    var sampleValueGroup = "";
    var imageryTitle = "";
    if (collection.imageryList != null && collection.currentProject != null) {
        imageryTitle = React.createElement(
            "select",
            { className: "form-control form-control-sm", id: "base-map-source", name: "base-map-source",
                size: "1", defaultValue: collection.currentProject.baseMapSource,
                onChange: props.setBaseMapSource },
            collection.imageryList.map(function (imagery) {
                return React.createElement(
                    "option",
                    { value: imagery.title },
                    imagery.title
                );
            })
        );
    }
    if (collection.currentProject != null) {
        sampleValueGroup = collection.currentProject.sampleValues.map(function (sampleValueGroup) {
            return React.createElement(
                "fieldset",
                { className: "mb-1 justify-content-center text-center" },
                React.createElement(
                    "h3",
                    { className: "text-center" },
                    "Sample Value: ",
                    sampleValueGroup.name
                ),
                React.createElement(
                    "ul",
                    { id: "samplevalue", className: "samplevalue justify-content-center" },
                    sampleValueGroup.values.map(function (sampleValue) {
                        return React.createElement(
                            "li",
                            { className: "mb-1" },
                            React.createElement(
                                "button",
                                { type: "button",
                                    className: "btn btn-outline-darkgray btn-sm btn-block pl-1",
                                    id: sampleValue.name + '_' + sampleValue.id,
                                    name: sampleValue.name + '_' + sampleValue.id,
                                    onClick: function onClick() {
                                        return props.setCurrentValue(sampleValueGroup, sampleValue);
                                    } },
                                React.createElement("div", { className: "circle", style: {
                                        "background-color": sampleValue.color,
                                        border: "solid 1px",
                                        float: "left",
                                        "margin-top": "4px"
                                    } }),
                                React.createElement(
                                    "span",
                                    { className: "small" },
                                    sampleValue.name
                                )
                            )
                        );
                    })
                )
            );
        });
        if (collection.currentProject.baseMapSource == 'DigitalGlobeWMSImagery') {
            selectDG = React.createElement(
                React.Fragment,
                null,
                React.createElement(
                    "select",
                    { className: "form-control form-control-sm", id: "dg-imagery-year",
                        name: "dg-imagery-year",
                        size: "1",
                        defaultValue: collection.imageryYearDG,
                        onChange: props.updateDGWMSLayer },
                    React.createElement(
                        "option",
                        { value: "2018" },
                        "2018"
                    ),
                    React.createElement(
                        "option",
                        { value: "2017" },
                        "2017"
                    ),
                    React.createElement(
                        "option",
                        { value: "2016" },
                        "2016"
                    ),
                    React.createElement(
                        "option",
                        { value: "2015" },
                        "2015"
                    ),
                    React.createElement(
                        "option",
                        { value: "2014" },
                        "2014"
                    ),
                    React.createElement(
                        "option",
                        { value: "2013" },
                        "2013"
                    ),
                    React.createElement(
                        "option",
                        { value: "2012" },
                        "2012"
                    ),
                    React.createElement(
                        "option",
                        { value: "2011" },
                        "2011"
                    ),
                    React.createElement(
                        "option",
                        { value: "2010" },
                        "2010"
                    ),
                    React.createElement(
                        "option",
                        { value: "2009" },
                        "2009"
                    ),
                    React.createElement(
                        "option",
                        { value: "2008" },
                        "2008"
                    ),
                    React.createElement(
                        "option",
                        { value: "2007" },
                        "2007"
                    ),
                    React.createElement(
                        "option",
                        { value: "2006" },
                        "2006"
                    ),
                    React.createElement(
                        "option",
                        { value: "2005" },
                        "2005"
                    ),
                    React.createElement(
                        "option",
                        { value: "2004" },
                        "2004"
                    ),
                    React.createElement(
                        "option",
                        { value: "2003" },
                        "2003"
                    ),
                    React.createElement(
                        "option",
                        { value: "2002" },
                        "2002"
                    ),
                    React.createElement(
                        "option",
                        { value: "2001" },
                        "2001"
                    ),
                    React.createElement(
                        "option",
                        { value: "2000" },
                        "2000"
                    )
                ),
                React.createElement(
                    "select",
                    { className: "form-control form-control-sm", id: "dg-stacking-profile", name: "dg-stacking-profile",
                        size: "1",
                        defaultValue: collection.stackingProfileDG, onChange: props.updateDGWMSLayer },
                    React.createElement(
                        "option",
                        { value: "Accuracy_Profile" },
                        "Accuracy Profile"
                    ),
                    React.createElement(
                        "option",
                        { value: "Cloud_Cover_Profile" },
                        "Cloud Cover Profile"
                    ),
                    React.createElement(
                        "option",
                        { value: "Global_Currency_Profile" },
                        "Global Currency Profile"
                    ),
                    React.createElement(
                        "option",
                        { value: "MyDG_Color_Consumer_Profile" },
                        "MyDG Color Consumer Profile"
                    ),
                    React.createElement(
                        "option",
                        { value: "MyDG_Consumer_Profile" },
                        "MyDG Consumer Profile"
                    )
                )
            );
        }
        if (collection.currentProject.baseMapSource == 'PlanetGlobalMosaic') {
            selectPlanet = React.createElement(
                React.Fragment,
                null,
                " ",
                React.createElement(
                    "select",
                    { className: "form-control form-control-sm", id: "planet-imagery-year",
                        name: "planet-imagery-year",
                        size: "1",
                        defaultValue: collection.imageryYearPlanet,
                        onChange: props.updatePlanetLayer },
                    React.createElement(
                        "option",
                        { value: "2018" },
                        "2018"
                    ),
                    React.createElement(
                        "option",
                        { value: "2017" },
                        "2017"
                    ),
                    React.createElement(
                        "option",
                        { value: "2016" },
                        "2016"
                    )
                ),
                React.createElement(
                    "select",
                    { className: "form-control form-control-sm", id: "planet-imagery-month",
                        name: "planet-imagery-month", size: "1",
                        defaultValue: collection.imageryMonthPlanet, onChange: props.updatePlanetLayer },
                    React.createElement(
                        "option",
                        { value: "01" },
                        "January"
                    ),
                    React.createElement(
                        "option",
                        { value: "02" },
                        "February"
                    ),
                    React.createElement(
                        "option",
                        { value: "03" },
                        "March"
                    ),
                    React.createElement(
                        "option",
                        { value: "04" },
                        "April"
                    ),
                    React.createElement(
                        "option",
                        { value: "05" },
                        "May"
                    ),
                    React.createElement(
                        "option",
                        { value: "06" },
                        "June"
                    ),
                    React.createElement(
                        "option",
                        { value: "07" },
                        "July"
                    ),
                    React.createElement(
                        "option",
                        { value: "08" },
                        "August"
                    ),
                    React.createElement(
                        "option",
                        { value: "09" },
                        "September"
                    ),
                    React.createElement(
                        "option",
                        { value: "10" },
                        "October"
                    ),
                    React.createElement(
                        "option",
                        { value: "11" },
                        "November"
                    ),
                    React.createElement(
                        "option",
                        { value: "12" },
                        "December"
                    )
                )
            );
        }
    }

    return React.createElement(
        React.Fragment,
        null,
        React.createElement(
            "fieldset",
            { className: "mb-3 text-center" },
            React.createElement(
                "h3",
                null,
                "Plot Navigation"
            ),
            React.createElement(
                "div",
                { className: "row" },
                React.createElement(
                    "div",
                    { className: "col", id: "go-to-first-plot" },
                    React.createElement("input", { id: "go-to-first-plot-button", className: "btn btn-outline-lightgreen btn-sm btn-block",
                        type: "button",
                        name: "new-plot", defaultValue: "Go to first plot", onClick: props.nextPlot })
                )
            ),
            React.createElement(
                "div",
                { className: "row d-none", id: "plot-nav" },
                React.createElement(
                    "div",
                    { className: "col-sm-6 pr-2" },
                    React.createElement("input", { id: "new-plot-button", className: "btn btn-outline-lightgreen btn-sm btn-block",
                        type: "button",
                        name: "new-plot", defaultValue: "Skip", onClick: props.nextPlot })
                ),
                React.createElement(
                    "div",
                    { className: "col-sm-6 pl-2" },
                    React.createElement("input", { id: "flag-plot-button", className: "btn btn-outline-lightgreen btn-sm btn-block",
                        type: "button",
                        name: "flag-plot", defaultValue: "Flag Plot as Bad", onClick: props.flagPlot,
                        style: { opacity: "0.5" }, disabled: true })
                )
            )
        ),
        React.createElement(
            "fieldset",
            { className: "mb-3 justify-content-center text-center" },
            React.createElement(
                "h3",
                null,
                "Imagery Options"
            ),
            imageryTitle,
            selectDG,
            selectPlanet
        ),
        sampleValueGroup
    );
}