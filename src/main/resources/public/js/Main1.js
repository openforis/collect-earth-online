var cp="",im="",pl="";
class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            documentRoot:this.props.documentRoot,
            currentProject : null,
            stats : null,
            plotList : null,
            imageryList : null,
            currentImagery : {attribution: ""},
            imageryYearDG : 2009,
            stackingProfileDG : "Accuracy_Profile",
            imageryYearPlanet : 2018,
            imageryMonthPlanet : "03",
            mapConfig : null,
            currentPlot : null,
            userSamples : {},
            statClass : "projNoStats",
            arrowState : "arrow-down",
            showSideBar : false,
            mapClass : "fullmap",
            quitClass : "quit-full",
        };

    };

    componentDidMount(){
        fetch(this.state.documentRoot + "/get-project-by-id/" + this.props.projectId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }})
            .then(data => {
                if (data == null || data.id == 0) {
                    alert("No project found with ID " + this.props.projectId + ".");
                    window.location = this.state.documentRoot + "/home";
                } else {
                    this.setState({currentProject: data});
                    cp=data;

                }
            });
        fetch(this.state.documentRoot + "/get-project-stats/" + this.props.projectId)
            .then(function(response) {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error getting project stats. See console for details.");
                }
                return response;
            })
            .then(data => {
                this.setState({stats: data});
            });
        fetch(this.state.documentRoot + "/get-project-plots/" + this.props.projectId + "/1000")
            .then(response => {
                if (response.ok) {
                   return response.json();
                }
                else {
                    console.log(response);
                    alert("Error loading plot data. See console for details.");
                }
            })
            .then(data => {
                this.setState({plotList: data});
                pl=data;
            });
        fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + cp.institution)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => {
                this.setState({imageryList :data});
                im=data;
                    if (im.length > 0 && cp!="") {
                        this.setState({mapConfig: mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, im)});
                        this.setBaseMapSource();

                        // Show the project's boundary
                        mercator.addVectorLayer(this.state.mapConfig,
                            "currentAOI",
                            mercator.geometryToVectorSource(mercator.parseGeoJson(cp    .boundary, true)),
                            ceoMapStyles.polygon);
                        mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");

                        // Draw the project plots as clusters on the map
                        this.showProjectPlots();
                }
            });

    }
    setBaseMapSource() {
        if (this.state.currentProject != null) {
        mercator.setVisibleLayer(this.state.mapConfig, this.state.currentProject.baseMapSource);
        this.setState({currentImagery: this.getImageryByTitle(this.state.currentProject.baseMapSource)});
        var cimagery = this.state.currentImagery;

            if (this.state.currentProject.baseMapSource == "DigitalGlobeWMSImagery") {
                cimagery.attribution += " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")";
                this.setState({currentImagery: cimagery});
                this.updateDGWMSLayer();
            } else if (this.state.currentProject.baseMapSource == "PlanetGlobalMosaic") {
                cimagery.attribution += " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet;
                this.setState({currentImagery: cimagery});
                this.updatePlanetLayer();
            }
        }
    }
    showProjectPlots() {
        if(this.state.plotList!=null) {
            mercator.addPlotLayer(this.state.mapConfig,
                this.state.plotList,
                (feature) => {// FIXME: These three assignments don't appear to do anything
                    this.setState({showSideBar: true});
                    this.setState({mapClass: "sidemap"});
                    this.setState({quitClass: "quit-side"});
                    this.loadPlotById(feature.get("features")[0].get("plotId"));
                }
            );
        }
    }
    updateDGWMSLayer() {
        mercator.updateLayerWmsParams(this.state.mapConfig,
            "DigitalGlobeWMSImagery",
            {
                COVERAGE_CQL_FILTER: "(acquisition_date>='" + this.state.imageryYearDG + "-01-01')"
                    + "AND(acquisition_date<='" + this.state.imageryYearDG + "-12-31')",
                FEATUREPROFILE: this.state.stackingProfileDG
            });
    }
    updatePlanetLayer() {
        mercator.updateLayerSource(this.state.mapConfig,
            "PlanetGlobalMosaic",
            function (sourceConfig) {
                sourceConfig.month = this.state.imageryMonthPlanet;
                sourceConfig.year = this.state.imageryYearPlanet;
                return sourceConfig;
            },
            this);
    }
    loadPlotById(plotId) {
        if (this.state.currentPlot == null) {
            this.getPlotDataById(plotId);
        } else {
            // FIXME: What is the minimal set of these that I can execute?
                utils.enable_element("new-plot-button");
                utils.enable_element("flag-plot-button");
                utils.disable_element("save-values-button");

                // FIXME: These classes should be handled with an ng-if in collection.ftl
                document.getElementById("#go-to-first-plot-button").addClass("d-none");
                document.getElementById("#plot-nav").removeClass("d-none");

            // FIXME: These three assignments don't appear to do anything
            this.setState({showSideBar : true});
            this.setState({mapClass : "sidemap"});
            this.setState({quitClass : "quit-side"});

            // FIXME: Move these calls into a function in mercator-openlayers.js
            mercator.disableSelection(this.state.mapConfig);
            mercator.removeLayerByTitle(this.state.mapConfig, "currentSamples");
            mercator.addVectorLayer(this.state.mapConfig,
                "currentSamples",
                mercator.samplesToVectorSource(this.state.currentPlot.samples),
                ceoMapStyles.redPoint);
            mercator.enableSelection(this.state.mapConfig, "currentSamples");
            mercator.zoomMapToLayer(this.state.mapConfig, "currentSamples");

            window.open(this.state.documentRoot + "/geo-dash?editable=false&"
                + encodeURIComponent("title=" + this.state.currentProject.name
                    + "&pid=" + this.state.projectId
                    + "&aoi=[" + mercator.getViewExtent(this.state.mapConfig)
                    + "]&daterange=&bcenter=" + this.state.currentPlot.center
                    + "&bradius=" + this.state.currentProject.plotSize / 2),
                "_geo-dash");
        }
    }
    getPlotDataById(plotId) {
        fetch(this.state.documentRoot + "/get-unanalyzed-plot-by-id/" + this.props.projectId + "/" + plotId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving plot data. See console for details.");
                }
            })
            .then(data => {
                if (data[0] == "done") {
                    this.setState({currentPlot : null});
                    this.showProjectPlots();
                    alert("This plot has already been analyzed.");
                } else if (data[0] == "not found") {
                    this.setState({currentPlot : null});
                    this.showProjectPlots();
                    alert("No plot with ID " + plotId + " found.");
                } else {
                    this.setState({currentPlot : data});
                    this.loadPlotById(plotId);
                }
            });
    }
    getImageryByTitle(imageryTitle) {
        return this.state.imageryList.find(
            function (imagery) {
                return imagery.title == imageryTitle;
            }
        );
    };

    render() {
        console.log(this.state);

        return(<React.Fragment>
                <ImageAnalysisPane collection={this.state} imageryList={this.state.imageryList}/>
                helloo
            </React.Fragment>
        );
    }
}
class ImageAnalysisPane extends React.Component {
    constructor(props) {
        super(props);
        this.state={imageryList:this.props.imageryList};
    };
    componentDidMount(){

    }

    render() {
        var showSidebar;
        const collection = this.props.collection;

        if (collection.showSideBar) {
            showSidebar = <div>
                <span id="action-button" name="collection-actioncall" title="Click a plot to analyze:"
                      alt="Click a plot to analyze">Click a plot to analyze, or:<p></p><br/>
                    <span className="button">Analyze random plot</span>
                    <br style={{clear:"both"}}/>
                    <br style={{clear:"both"}}/>
                </span>
            </div>
        }
        else {
            showSidebar = <div style={{position:"relative"}}>
                <span id="action-button" name="collection-actioncall" title="Select each plot to choose value"
                      alt="Select each plot to choose value">Select each dot to choose value
                </span>
            </div>
        }
        return (
            <div id="image-analysis-pane" className= {collection.mapClass ? collection.mapClass  : "col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height"}>
                <div className="buttonHolder d-none">
                    {showSidebar}
                </div>
                <div id="imagery-info" className="row d-none">
                    <p className="col small">{collection.currentImagery.attribution}</p>
                </div>
            </div>
        );
    }
}

function renderCollection(documentRoot, username, projectId) {

    ReactDOM.render(
        <Collection documentRoot={documentRoot} userName={username} projectId={projectId}/>,
        document.getElementById("collection")
    );
}
