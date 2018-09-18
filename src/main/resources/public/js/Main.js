class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
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

     getProjectById(projectId) {
        fetch(this.state.documentRoot + "/get-project-by-id/" + projectId)
            .then(response => {
                if (response.ok) {
                    response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            })
            .then(data => {
                    if (data == null || data.id == 0) {
                        alert("No project found with ID " + projectId + ".");
                        window.location = this.state.documentRoot + "/home";
                    } else {
                        this.setState({currentProject: data});
                        this.initialize(this.state.documentRoot, this.props.userName, this.props.projectId);
                    }
                }
            );

    }
    getProjectStats() {
        fetch(this.state.documentRoot + "/get-project-stats/" + this.props.projectId)
            .then(response => {
                if (response.ok) {
                    response.json();
                }
                else {
                    console.log(response);
                    alert("Error getting project stats. See console for details.");
                }
            })
            .then(data => {
                this.setState({stats: data});
                this.initialize(this.state.documentRoot, this.props.userName, this.props.projectId);
            });
    }

    getProjectPlots() {
        fetch(this.state.documentRoot + "/get-project-plots/" + this.props.projectId + "/1000")
            .then(response => {
                if (response.ok) {
                    response.json();
                }
                else {
                    console.log(response);
                    alert("Error loading plot data. See console for details.");
                }
            })
            .then(data => {
                this.setState({plotList: data});
                this.initialize(this.state.documentRoot, this.props.userName, this.props.projectId);
            })
    }

    getImageryList(institutionId) {
        fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + institutionId)
            .then(response => {
                if (response.ok) {
                    response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => {
                this.setState({imageryList :data});
                this.initialize(this.state.documentRoot, this.props.userName, this.props.projectId);
            });
    }
    getImageryByTitle(imageryTitle) {
        return this.state.imageryList.find(
            function (imagery) {
                return imagery.title == imageryTitle;
            }
        );
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
    setBaseMapSource = function () {
        mercator.setVisibleLayer(this.state.mapConfig, this.state.currentProject.baseMapSource);
        this.state.currentImagery = this.getImageryByTitle(this.state.currentProject.baseMapSource);
        if (this.state.currentProject.baseMapSource == "DigitalGlobeWMSImagery") {
            this.state.currentImagery.attribution += " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")";
            this.updateDGWMSLayer();
        } else if (this.state.currentProject.baseMapSource == "PlanetGlobalMosaic") {
            this.state.currentImagery.attribution += " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet;
            this.updatePlanetLayer();
        }
    }
    showProjectPlots() {
        mercator.addPlotLayer(this.mapConfig,
            this.plotList,
            this.change.bind(this, function (feature) {
                // FIXME: These three assignments don't appear to do anything
                this.setState({showSideBar : true});
                this.setState({mapClass : "sidemap"});
                this.setState({quitClass : "quit-side"});
                this.loadPlotById(feature.get("features")[0].get("plotId"));
            }));
    }
    showProjectMap() {
        // Initialize the base map
        this.state.mapConfig = mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, this.state.imageryList);
        this.setBaseMapSource();

        // Show the project's boundary
        mercator.addVectorLayer(this.state.mapConfig,
            "currentAOI",
            mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary, true)),
            ceoMapStyles.polygon);
        mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");

        // Draw the project plots as clusters on the map
        this.showProjectPlots();
    }

    getPlotDataById(plotId) {
        fetch(this.state.documentRoot + "/get-unanalyzed-plot-by-id/" + this.props.projectId + "/" + plotId)
            .then(response => {
                if (response.ok) {
                    response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving plot data. See console for details.");
                }
            })
            .then(data => {
                if (data == "done") {
                    this.state.currentPlot = null;
                    this.showProjectPlots();
                    alert("This plot has already been analyzed.");
                } else if (response.data == "not found") {
                    this.state.currentPlot = null;
                    this.showProjectPlots();
                    alert("No plot with ID " + plotId + " found.");
                } else {
                    this.state.currentPlot = data;
                    this.loadPlotById(plotId);
                }
            });
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
            this.state.showSideBar = true;
            this.state.mapClass = "sidemap";
            this.state.quitClass = "quit-side";

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
    getPlotData() {
        fetch(this.state.documentRoot + "/get-unanalyzed-plot-by-id/" + this.props.projectId + "/" + plotId)
            .then(response => {
                if (response.ok) {
                    response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving plot data. See console for details.");
                }
            })
            .then(data => {

                if (data == "done") {
                    this.setState({currentPlot : null});
                    // FIXME: What is the minimal set of these that I can execute?
                    utils.disable_element("new-plot-button");
                    utils.disable_element("flag-plot-button");
                    utils.disable_element("save-values-button");
                    alert("All plots have been analyzed for this project.");
                } else {
                    this.setState({currentPlot : data});
                    this.loadRandomPlot();
                }
            });
    }
    loadRandomPlot() {
        if (this.state.currentPlot == null) {
            this.getPlotData();
        } else {
            // FIXME: What is the minimal set of these that I can execute?
            utils.enable_element("flag-plot-button");

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
    nextPlot() {
        // FIXME: What is the minimal set of these that I can execute?
        utils.enable_element("new-plot-button");
        utils.enable_element("flag-plot-button");
        utils.disable_element("save-values-button");
        // FIXME: These classes should be handled with an ng-if in collection.ftl
        document.getElementById("#go-to-first-plot-button").addClass("d-none");
        document.getElementById("#plot-nav").removeClass("d-none");
        // FIXME: These three assignments don't appear to do anything
        this.state.showSideBar = true;
        this.state.mapClass = "sidemap";
        this.state.quitClass = "quit-side";
        mercator.removeLayerByTitle(this.state.mapConfig, "currentPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "currentSamples");
        this.state.currentPlot = null;
        this.state.userSamples = {};
        this.loadRandomPlot();
    }
    setCurrentValue(sampleValueGroup, sampleValue) {
        var selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig);
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
            selectedFeatures.forEach(
                function (sample) {
                    var sampleId = sample.get("sampleId");
                    if (!this.state.userSamples[sampleId]) {
                        this.state.userSamples[sampleId] = {};
                    }
                    this.state.userSamples[sampleId][sampleValueGroup.name] = sampleValue.name;
                    mercator.highlightSamplePoint(sample, sampleValue.color);
                },
                this // necessary to pass outer scope into function
            );
            selectedFeatures.clear();
            utils.blink_border(sampleValue.name + "_" + sampleValue.id);
            if (Object.keys(this.state.userSamples).length == this.state.currentPlot.samples.length
                && Object.values(this.state.userSamples).every(function (values) {
                    return Object.keys(values).length == this.state.currentProject.sampleValues.length;
                }, this)) {
                // FIXME: What is the minimal set of these that I can execute?
                utils.enable_element("save-values-button");
                utils.disable_element("new-plot-button");
            }
        } else {
            alert("No sample points selected. Please click some first.");
        }
    }
    saveValues() {
        $.ajax({
            url: this.state.documentRoot + "/add-user-samples",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: false,
            processData: false,
            data:  {projectId: this.projectId,
                plotId: this.currentPlot.id,
                userId: this.userName,
                userSamples: this.userSamples}
        }).fail(function () {
            console.log(response);
            alert("Error saving your assignments to the database. See console for details.");
        }).done(function (data) {
            this.state.stats.analyzedPlots++;
            this.nextPlot();
        });
    }
    toggleStats() {
        if (this.state.statClass == "projNoStats") {
            this.setState({statClass :"projStats"});
            this.setState({arrowState : "arrow-up"});
        } else {
            this.setState({statClass : "projNoStats"});
            this.setState({arrowState : "arrow-down"});
        }
    }

    assignedPercentage() {
        if (this.state.currentProject == null || this.state.stats == null) {
            return "0.00";
        } else {
            return (100.0 * this.state.stats.analyzedPlots / this.state.currentProject.numPlots).toFixed(2);
        }
    }

    flaggedPercentage () {
        if (this.state.currentProject == null || this.state.stats == null) {
            return "0.00";
        } else {
            return (100.0 * this.state.stats.flaggedPlots / this.state.currentProject.numPlots).toFixed(2);
        }
    }

    completedPercentage() {
        if (this.state.currentProject == null || this.state.stats == null) {
            return "0.00";
        } else {
            return (100.0 * (this.state.stats.analyzedPlots + this.state.stats.flaggedPlots) / this.state.currentProject.numPlots).toFixed(2);
        }
    }




    render() {
        return (
            <React.Fragment>
                <ImageAnalysisPane />
                <SideBar/>
                <div className="modal fade" id="confirmation-quit" tabIndex="-1" role="dialog"
                     aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                    <div className="modal-dialog modal-dialog-centered" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title" id="exampleModalLongTitle">Confirmation</h5>
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                Are you sure you want to stop collecting data?
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary btn-sm" data-dismiss="modal">Close
                                </button>
                                <button type="button" className="btn bg-lightgreen btn-sm" id="quit-button"
                                        onClick=${"window.location='" + this.state.documentRoot + "/home'"}>OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}
class ImageAnalysisPane extends React.Component {
    constructor(props) {
        super(props);
    };
    render() {
        var showSidebar;
        if(this.props.showSideBar){
            showSidebar=<div>
                <span id="action-button" name="collection-actioncall" title="Click a plot to analyze:"
                      alt="Click a plot to analyze">Click a plot to analyze, or:<p></p><br/>
                    <span className="button" onClick="collection.nextPlot()">Analyze random plot</span>
                    <br style="clear:both;"/>
                    <br style="clear:both;"/>
                </span>
            </div>
        }
        else{
            showSidebar=<div style="position:relative;">
                <span id="action-button" name="collection-actioncall" title="Select each plot to choose value"
                      alt="Select each plot to choose value">Select each dot to choose value
                </span>
            </div>
        }
        return (
            <div id="image-analysis-pane" className="collection.map"
                 className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
                <div className="buttonHolder d-none">
                    {showSidebar}
                </div>
                <div id="imagery-info" className="row d-none">
                    <p className="col small">{this.props.currentImagery.attribution}</p>
                </div>
            </div>
        );
    }
}

class SideBar extends React.Component {

    render() {
        const collection=this.props.collection;
        return (
            <React.Fragment>
                <h2 className="header">{collection.currentProject.name}</h2>
                <SideBarFieldSet/>
                <div className="row">
                    <div className="col-sm-12 btn-block">
                        <button id="save-values-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                type="button"
                                name="save-values" onClick={collection.saveValues()} style="opacity:0.5" disabled>
                            Save
                        </button>
                        <button className="btn btn-outline-lightgreen btn-sm btn-block mb-1" data-toggle="collapse"
                                href="#project-stats-collapse" role="button" aria-expanded="false"
                                aria-controls="project-stats-collapse">
                            Project Stats
                        </button>
                        <div className="row justify-content-center mb-1 text-center">
                            <div className="col-lg-12">
                                <fieldset id="projStats" className="collection.statClass" className="text-center">
                                    <div className="collapse" id="project-stats-collapse">
                                        <table className="table table-sm">
                                            <tbody>
                                            <tr>
                                                <td className="small">Project</td>
                                                <td className="small">{collection.currentProject.name}</td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Assigned</td>
                                                <td className="small">
                                                    {collection.stats.analyzedPlots}
                                                    ({collection.assignedPercentage()}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Flagged</td>
                                                <td className="small">
                                                    {collection.stats.flaggedPlots}
                                                    ({collection.flaggedPercentage()}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Completed</td>
                                                <td className="small">
                                                    {collection.stats.analyzedPlots + collection.stats.flaggedPlots}
                                                    ({collection.completedPercentage()}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Total</td>
                                                <td className="small">{collection.currentProject.numPlots}</td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </fieldset>
                            </div>
                        </div>
                        <button id="collection-quit-button" className="btn btn-outline-danger btn-block btn-sm"
                                type="button"
                                name="collection-quit" className="collection.quitClass" data-toggle="modal"
                                data-target="#confirmation-quit">
                            Quit
                        </button>
                    </div>
                </div>

            </React.Fragment>

        );
    }

}

class SideBarFieldSet extends React.Component {
    render() {
        const collection=this.props.collection;

        return (
            <React.Fragment>
                <fieldset className="mb-3 text-center">
                    <h3>Plot Navigation</h3>
                    <div className="row">
                        <div className="col" id="go-to-first-plot">
                            <input id="go-to-first-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="new-plot" value="Go to first plot" onClick={collection.nextPlot()}/>
                        </div>
                    </div>
                    <div className="row d-none" id="plot-nav">
                        <div className="col-sm-6 pr-2">
                            <input id="new-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="new-plot" value="Skip" onClick={collection.nextPlot()}/>
                        </div>
                        <div className="col-sm-6 pl-2">
                            <input id="flag-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="flag-plot" value="Flag Plot as Bad" onClick={collection.flagPlot()}
                                   style="opacity:0.5" disabled/>
                        </div>
                    </div>
                </fieldset>
                <fieldset className="mb-3 justify-content-center text-center">
                    <h3>Imagery Options</h3>
                    <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                            size="1"
                            value={collection.currentProject.baseMapSource} onChange={collection.setBaseMapSource()}>
                        {
                        collection.imageryList.map(imagery=>
                            <option value={imagery.title}>{imagery.title}</option>
                            )
                        }


                    </select>
                    if(collection.currentProject.baseMapSource == 'DigitalGlobeWMSImagery'){
                    <select className="form-control form-control-sm" id="dg-imagery-year" name="dg-imagery-year"
                            size="1"
                            value={collection.imageryYearDG} convert-to-number
                            onChange={collection.updateDGWMSLayer()}>
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>
                        <option value="2016">2016</option>
                        <option value="2015">2015</option>
                        <option value="2014">2014</option>
                        <option value="2013">2013</option>
                        <option value="2012">2012</option>
                        <option value="2011">2011</option>
                        <option value="2010">2010</option>
                        <option value="2009">2009</option>
                        <option value="2008">2008</option>
                        <option value="2007">2007</option>
                        <option value="2006">2006</option>
                        <option value="2005">2005</option>
                        <option value="2004">2004</option>
                        <option value="2003">2003</option>
                        <option value="2002">2002</option>
                        <option value="2001">2001</option>
                        <option value="2000">2000</option>
                    </select>
                }
                if(collection.currentProject.baseMapSource == 'DigitalGlobeWMSImagery'){
                    <select className="form-control form-control-sm" id="dg-stacking-profile" name="dg-stacking-profile"
                            size="1"
                            ng-model="collection.stackingProfileDG" onChange={collection.updateDGWMSLayer()}>
                        <option value="Accuracy_Profile">Accuracy Profile</option>
                        <option value="Cloud_Cover_Profile">Cloud Cover Profile</option>
                        <option value="Global_Currency_Profile">Global Currency Profile</option>
                        <option value="MyDG_Color_Consumer_Profile">MyDG Color Consumer Profile</option>
                        <option value="MyDG_Consumer_Profile">MyDG Consumer Profile</option>
                    </select>
                }
                if(collection.currentProject.baseMapSource == 'PlanetGlobalMosaic'){
                    <select className="form-control form-control-sm" id="planet-imagery-year" name="planet-imagery-year"
                            size="1"
                            value={collection.imageryYearPlanet} convert-to-number
                            onChange={collection.updatePlanetLayer()}>
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>
                        <option value="2016">2016</option>
                    </select>
                }
                if(collection.currentProject.baseMapSource == 'PlanetGlobalMosaic'){
                    <select className="form-control form-control-sm" id="planet-imagery-month"
                            name="planet-imagery-month" size="1"
                            value={collection.imageryMonthPlanet} onChange={collection.updatePlanetLayer()}>
                        <option value="01">January</option>
                        <option value="02">February</option>
                        <option value="03">March</option>
                        <option value="04">April</option>
                        <option value="05">May</option>
                        <option value="06">June</option>
                        <option value="07">July</option>
                        <option value="08">August</option>
                        <option value="09">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                    </select>
                }
                </fieldset>
                {
                    collection.currentProject.sampleValues.map(sampleValueGroup=>
                        <fieldset className="mb-1 justify-content-center text-center">
                            <h3 className="text-center">Sample Value: {sampleValueGroup.name}</h3>
                            <ul id="samplevalue" className="justify-content-center">
                                {
                                sampleValueGroup.values.map(sampleValue=>
                                <li className="mb-1">
                                    <button type="button" className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                                            id={ sampleValue.name + '_' + sampleValue.id }
                                            name={ sampleValue.name + '_' + sampleValue.id }
                                            onClick={collection.setCurrentValue(sampleValueGroup, sampleValue)}>
                                        <div className="circle" style={{"background-color": sampleValue.color , border:"solid 1px", float: "left","margin-top": "4px"}}></div>
                                        <span className="small">{sampleValue.name}</span>
                                    </button>
                                </li>
                                )
                                }
                            </ul>
                        </fieldset>
                    )
                }

            </React.Fragment>

        );
    }
}

function renderCollection(documentRoot, username, projectId) {
    ReactDOM.render(
        <Institution documentRoot={documentRoot} userName={username} projectId={projectId}/>,
        document.getElementById("collection")
    );
}
