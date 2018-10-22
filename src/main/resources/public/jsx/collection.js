import React from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";

class Collection extends React.Component {
    constructor(props) {
        super(props);
        // FIXME: Refactor this state further down the component tree
        this.state = {
            currentProject: {sampleValues: []},
            stats: null,
            plotList: null,
            imageryList: null,
            currentImagery: {attribution: ""},
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
            quitClass: "quit-full",
            clicked:false
        };
        // FIXME: Do all of these need to be bound?
        this.setBaseMapSource  = this.setBaseMapSource.bind(this);
        this.updateDGWMSLayer  = this.updateDGWMSLayer.bind(this);
        this.updatePlanetLayer = this.updatePlanetLayer.bind(this);
        this.nextPlot          = this.nextPlot.bind(this);
        this.setCurrentValue   = this.setCurrentValue.bind(this);
        this.getPlotData       = this.getPlotData.bind(this);
        this.saveValues        = this.saveValues.bind(this);
        this.showProjectMap    = this.showProjectMap.bind(this);
        this.showAnswers       = this.showAnswers.bind(this);
        this.flagPlot          = this.flagPlot.bind(this);
    }

    componentDidMount() {
        this.getProjectById();
        this.getProjectStats();
        this.getProjectPlots();
    }

    componentDidUpdate() {
        if (this.state.currentProject.institution && this.state.imageryList == null) {
            this.getImageryList(this.state.currentProject.institution);
        }
        if (this.state.imageryList && this.state.mapConfig == null) {
            this.showProjectMap();
        }
        if (this.state.mapConfig && this.state.plotList) {
            this.showProjectPlots();
        }
        if (this.state.mapConfig && this.state.currentImagery.id == null) {
            this.updateMapImagery(this.state.currentProject.baseMapSource);
        }
    }

    getProjectById() {
        // FIXME: Make this more concise
        fetch(this.props.documentRoot + "/get-project-by-id/" + this.props.projectId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                    return new Promise(resolve => resolve(null));
                }
            })
            .then(project => {
                if (project == null || project.id == 0) {
                    alert("No project found with ID " + this.props.projectId + ".");
                    window.location = this.props.documentRoot + "/home";
                } else {
                    const surveyQuestions = this.convertSampleValuesToSurveyQuestions(project.sampleValues);
                    // FIXME: add {answered: false} to each surveyQuestion object
                    // FIXME: add {hasChildQuestion: false} to each surveyQuestion answer object
                    // FIXME: for each child question, find its parent question object and parent answer object
                    //        add {hasChildQuestion: true} to each parent answer object that you find
                    //        if a parent answer is "Any", add {hasChildQuestion: true} all answer objects in the parent question object
                    console.log(surveyQuestions);
                    project.sampleValues = surveyQuestions;
                    this.setState({currentProject: project});
                }
            });
    }

    convertSampleValuesToSurveyQuestions(sampleValues) {
        return sampleValues.map(sampleValue => {
            if (sampleValue.name && sampleValue.values) {
                const surveyQuestionAnswers = sampleValue.values.map(value => {
                    if (value.name) {
                        return {id: value.id,
                                answer: value.name,
                                color: value.color};
                    } else {
                        return value;
                    }
                });
                return {id: sampleValue.id,
                        question: sampleValue.name,
                        answers: surveyQuestionAnswers,
                        parent_question: -1,
                        parent_answer: -1};
            } else {
                return sampleValue;
            }
        });
    }

    getProjectStats() {
        // FIXME: Make this more concise
        fetch(this.props.documentRoot + "/get-project-stats/" + this.props.projectId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error getting project stats. See console for details.");
                    return new Promise(resolve => resolve(null));
                }
            })
            .then(data => {
                this.setState({stats: data});
            });
    }

    getProjectPlots() {
        // FIXME: Make this more concise
        fetch(this.props.documentRoot + "/get-project-plots/" + this.props.projectId + "/1000")
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error loading plot data. See console for details.");
                    return new Promise(resolve => resolve(null));
                }
            })
            .then(data => {
                this.setState({plotList: data});
            });
    }

    getImageryList(institution) {
        // FIXME: Make this more concise
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institution)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                    return new Promise(resolve => resolve(null));
                }
            })
            .then(data => {
                this.setState({imageryList: data});
            });
    }

    showProjectMap() {
        let mapConfig = mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, this.state.imageryList);
        // Show the project's boundary
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary, true)),
                                ceoMapStyles.polygon);
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        this.setState({mapConfig: mapConfig});
    }

    showProjectPlots() {
        mercator.addPlotLayer(this.state.mapConfig,
                              this.state.plotList,
                              // FIXME: Is "this" bound correctly?
                              feature => {
                                  // FIXME: These three assignments don't appear to do anything
                                  this.setState({showSideBar: true,
                                                 mapClass: "sidemap",
                                                 quitClass: "quit-side"});
                                  this.getPlotData(feature.get("features")[0].get("plotId"));
                              });
    }

    setBaseMapSource(event) {
        const dropdown = event.target;
        const newBaseMapSource = dropdown.options[dropdown.selectedIndex].value;
        let proj = this.state.currentProject;
        proj.baseMapSource = newBaseMapSource;
        this.setState({currentProject: proj});
        this.updateMapImagery(newBaseMapSource);
    }

    updateMapImagery(newBaseMapSource) {
        // Make the selected imagery visible on the map
        mercator.setVisibleLayer(this.state.mapConfig, newBaseMapSource);
        // Update the attribution text on the map
        let newImagery = this.getImageryByTitle(newBaseMapSource);
        if (newBaseMapSource == "DigitalGlobeWMSImagery") {
            newImagery.attribution += " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")";
            this.updateDGWMSLayer();
        } else if (newBaseMapSource == "PlanetGlobalMosaic") {
            newImagery.attribution += " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet;
            this.updatePlanetLayer();
        }
        this.setState({currentImagery: newImagery});
    }

    getImageryByTitle(imageryTitle) {
        return this.state.imageryList.find(imagery => imagery.title == imageryTitle);
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
                                   sourceConfig => {
                                       sourceConfig.month = this.state.imageryMonthPlanet;
                                       sourceConfig.year = this.state.imageryYearPlanet;
                                       return sourceConfig;
                                   },
                                   this);
    }

    getPlotData(plotId) {
        const url = (plotId == "random")
            ? this.props.documentRoot + "/get-unanalyzed-plot/" + this.props.projectId
            : this.props.documentRoot + "/get-unanalyzed-plot-by-id/" + this.props.projectId + "/" + plotId;
        fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    console.log(response);
                    alert("Error retrieving plot data. See console for details.");
                    return new Promise(resolve => resolve("error"));
                }
            })
            .then(data => {
                if (data == "done") {
                    this.setState({currentPlot: null});
                    const msg = (plotId == "random")
                        ? "All plots have been analyzed for this project."
                        : "This plot has already been analyzed.";
                    alert(msg);
                } else if (data == "not found") {
                    this.setState({currentPlot: null});
                    alert("No plot with ID " + plotId + " found.");
                } else if (data == "error") {
                    this.setState({currentPlot: null});
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({currentPlot: newPlot});
                    this.showProjectPlot(newPlot);
                    this.showGeoDash(newPlot);
                }
            });
    }

    showProjectPlot(plot) {
        let mapConfig = this.state.mapConfig;
        mercator.disableSelection(mapConfig);
        mercator.removeLayerByTitle(mapConfig, "currentPlot");
        mercator.removeLayerByTitle(mapConfig, "currentSamples");
        mercator.addVectorLayer(mapConfig,
                                "currentPlot",
                                mercator.geometryToVectorSource(
                                    plot.geom
                                        ? mercator.parseGeoJson(plot.geom, true)
                                        : mercator.getPlotPolygon(plot.center,
                                                                  this.state.currentProject.plotSize,
                                                                  this.state.currentProject.plotShape)
                                ),
                                ceoMapStyles.polygon);
        mercator.addVectorLayer(mapConfig,
                                "currentSamples",
                                mercator.samplesToVectorSource(plot.samples),
                                ceoMapStyles.yellowPoint);
        mercator.enableSelection(mapConfig, "currentSamples");
        mercator.zoomMapToLayer(mapConfig, "currentPlot");
        this.setState({mapConfig: mapConfig});
    }

    showGeoDash(plot) {
        window.open(this.props.documentRoot + "/geo-dash?editable=false&"
                    + encodeURIComponent("title=" + this.state.currentProject.name
                                         + "&pid=" + this.props.projectId
                                         + "&plotid=" + this.state.currentProject.id
                                         + "&plotshape=" + this.state.currentProject.plotShape
                                         + "&aoi=[" + mercator.getViewExtent(this.state.mapConfig)
                                         + "]&daterange=&bcenter=" + plot.center
                                         + "&bradius=" + (this.state.currentProject.plotSize
                                                          ? this.state.currentProject.plotSize / 2.0
                                                          : mercator.getViewRadius(this.state.mapConfig))),
                    "_geo-dash");
    }

    // FIXME: Move this functionality into render()
    loadPlotCommon(plotId) {
        utils.enable_element("new-plot-button");
        utils.enable_element("flag-plot-button");
        utils.disable_element("save-values-button");
        utils.enable_element("flag-plot-button");
        utils.disable_element("new-plot-button");
        utils.disable_element("flag-plot-button");
        utils.disable_element("save-values-button");
        document.getElementById("go-to-first-plot-button").classList.add("d-none");
        document.getElementById("plot-nav").classList.remove("d-none");
        // FIXME: What is this?
        if(document.getElementById("testg")!=null)
            document.getElementById("testg").style.display="block";
        // FIXME: These three assignments don't appear to do anything
        this.setState({showSideBar: true,
                       mapClass: "sidemap",
                       quitClass: "quit-side"});
    }

    // FIXME: Needs to be reviewed
    setCurrentValue(event,surveyQuestion, answer) {
        var selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig);
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
            if (answer.hasChildQuestion) {
                alert("Select an answer for "+answer.answer + " by selecting the child question.");
            }
            else{
                selectedFeatures.forEach(
                    function (sample) {
                        var sampleId = sample.get("sampleId");
                        var uSamples = this.state.userSamples;
                        if (!this.state.userSamples[sampleId]) {
                            uSamples[sampleId] = {};
                            this.setState({userSamples: uSamples});
                        }
                        uSamples[sampleId][surveyQuestion.question] = answer.answer;
                        this.setState({userSamples: uSamples});
                        mercator.highlightSamplePoint(sample, answer.color);
                    },
                    this // necessary to pass outer scope into function
                );
                console.log("user samples");
                console.log(this.state.userSamples);
                selectedFeatures.clear();
                utils.blink_border(answer.answer + "_" + answer.id);

            }
        }
        else {
            alert("No sample points selected. Please click some first.");
        }
        if (Object.keys(this.state.userSamples).length == this.state.currentPlot.samples.length
            && Object.values(this.state.userSamples).every(function (values) {
                return Object.keys(values).length == this.state.currentProject.sampleValues.length;
            }, this)) {
            // FIXME: What is the minimal set of these that I can execute?
            utils.enable_element("save-values-button");
            if (document.getElementById("save-values-button") != null) {
                var ref = this;
                document.getElementById("save-values-button").onclick = function () {
                    ref.saveValues();
                }
            }
            utils.disable_element("new-plot-button");
        }
    }

    // FIXME: Needs to be reviewed
    flagPlot() {
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
                ref.setState({stats: statistics});
                ref.nextPlot();
            });
        }
    }

    // FIXME: Needs to be reviewed
    nextPlot() {
        // FIXME: What is the minimal set of these that I can execute?
        utils.enable_element("new-plot-button");
        utils.enable_element("flag-plot-button");
        utils.disable_element("save-values-button");

        // FIXME: These classes should be handled with an ng-if in collection.ftl
        document.getElementById("go-to-first-plot-button").classList.add("d-none");
        document.getElementById("plot-nav").classList.remove("d-none");
        // FIXME: These three assignments don't appear to do anything
        this.setState({showSideBar: true});
        this.setState({mapClass: "sidemap"});
        this.setState({quitClass: "quit-side"});
        mercator.removeLayerByTitle(this.state.mapConfig, "currentPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "currentPlot");
        mercator.removeLayerByTitle(this.state.mapConfig, "currentSamples");
        this.setState({currentPlot: null});
        this.setState({userSamples: {}});
        this.getPlotData("random");
        var ref=this;

    }

    // FIXME: Needs to be reviewed
    saveValues(){
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
            ref.setState({stats: statistics});
            ref.nextPlot();
        });
    }

    // FIXME: Needs to be reviewed
    showAnswers(event){
        var x = event.target.nextSibling;
        if(this.state.clicked==true){
            x.style.display === "none";
        }
        var cp=this.state.currentProject;
        var sv=this.state.currentProject.sampleValues;
        if (x.style.display === "none") {
            x.style.display = "block";
            sv.map((sq)=>{
                if(sq.id==event.target.id){
                    sq.answered=true;
                }
            });
        } else {
            x.style.display = "none";
            sv.map((sq)=>{
                if(sq.id==event.target.id){
                    sq.answered=false;
                }
            });
        }
        cp.sampleValues=sv;
        this.setState({currentProject:cp});
    }

    // FIXME: Needs to be reviewed
    hideAnswers(){
        var x=document.getElementById("samplevalue");
        x.style.display="none";
    }

    // FIXME: what?!
    getCurrent = (node,ref) => this.state.currentProject.sampleValues.filter(cNode => cNode.parent_question == node).map(function(cNode,_uid) {
        if(cNode.answered) {
            return <fieldset key={_uid} className="mb-1 justify-content-center text-center" id="testg">
                <button id={cNode.id} className="text-center btn btn-outline-lightgreen btn-sm btn-block"
            onClick={ref.showAnswers} style={{marginBottom: "10px"}}>Survey
            Question: {cNode.question}</button>
                <ul id="samplevalue" className="samplevalue justify-content-center" style={{display: "none"}}>
                {
                    cNode.answers.map((ans, uid) =>
                                      <li key={uid} className="mb-1">
                                      <button type="button"
                                      className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                                      id={ans.answer + "_" + ans.id}
                                      name={ans.answer + "_" + ans.id}
                                      onClick={(e) => ref.setCurrentValue(e, cNode, ans)}>
                                      <div className="circle" style={{
                                          backgroundColor: ans.color,
                                          border: "solid 1px",
                                          float: "left",
                                          marginTop: "4px"
                                      }}></div>
                                      <span className="small">{ans.answer}</span>
                                      </button>
                                      </li>
                                     )
                }
            </ul>
                {ref.getCurrent(cNode.id, ref)}

            </fieldset>
        }
        else {
            return <fieldset key={_uid} className="mb-1 justify-content-center text-center" id="testg">
                <button id={cNode.id} className="text-center btn btn-outline-lightgreen btn-sm btn-block"
            onClick={ref.showAnswers} style={{marginBottom: "10px"}}>Survey
            Question: {cNode.question}</button>
                <ul id="samplevalue" className="samplevalue justify-content-center" style={{display: "none"}}>
                {
                    cNode.answers.map((ans, uid) =>
                                      <li key={uid} className="mb-1">
                                      <button type="button"
                                      className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                                      id={ans.answer + "_" + ans.id}
                                      name={ans.answer + "_" + ans.id}
                                      onClick={() => ref.setCurrentValue(cNode, ans)}>
                                      <div className="circle" style={{
                                          backgroundColor: ans.color,
                                          border: "solid 1px",
                                          float: "left",
                                          marginTop: "4px"
                                      }}></div>
                                      <span className="small">{ans.answer}</span>
                                      </button>
                                      </li>
                                     )
                }
            </ul>
                </fieldset>
        }

    });

    assignedPercentage() {
        return (this.state.currentProject && this.state.stats)
            ? (100.0 * this.state.stats.analyzedPlots / this.state.currentProject.numPlots).toFixed(2)
            : "0.00";
    }

    flaggedPercentage() {
        return (this.state.currentProject && this.state.stats)
            ? (100.0 * this.state.stats.flaggedPlots / this.state.currentProject.numPlots).toFixed(2)
            : "0.00";
    }

    completedPercentage() {
        return (this.state.currentProject && this.state.stats)
            ? (100.0 * (this.state.stats.analyzedPlots + this.state.stats.flaggedPlots) / this.state.currentProject.numPlots).toFixed(2)
            : "0.00";
    }

    render() {
        return (
            <React.Fragment>
                <ImageAnalysisPane collection={this.state} nextPlot={this.nextPlot}/>
                <div id="sidebar" className="col-xl-3">
                    <SideBar collection={this.state}
                             setBaseMapSource={this.setBaseMapSource}
                             setCurrentValue={this.setCurrentValue}
                             updateDGWMSLayer={this.updateDGWMSLayer}
                             updatePlanetLayer={this.updatePlanetLayer}
                             nextPlot={this.nextPlot}
                             flagPlot={this.flagPlot}
                             assignedPercentage={this.assignedPercentage()}
                             flaggedPercentage={this.flaggedPercentage()}
                             completedPercentage={this.completedPercentage()}
                             showAnswers={this.showAnswers}
                             getCurrent={this.getCurrent}
                             _this={this}/>
                </div>
            </React.Fragment>
        );
    }
}

function ImageAnalysisPane(props) {
    return (
        <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
            <div className="buttonHolder d-none">
                {
                    props.collection.showSideBar ?
                        (
                            <div>
                                <span id="action-button" name="collection-actioncall" title="Click a plot to analyze:"
                                      alt="Click a plot to analyze">Click a plot to analyze, or:<p></p><br/>
                                    <span className="button" onClick={props.nextPlot}>Analyze random plot</span>
                                    <br style={{clear: "both"}}/>
                                    <br style={{clear: "both"}}/>
                                </span>
                            </div>
                        ) : (
                            <div style={{position: "relative"}}>
                                <span id="action-button" name="collection-actioncall" title="Select each plot to choose value"
                                      alt="Select each plot to choose value">Select each dot to choose value
                                </span>
                            </div>
                        )
                }
            </div>
            <div id="imagery-info" className="row d-none">
                <p className="col small">{props.collection.currentImagery.attribution}</p>
            </div>
        </div>
    );
}

function SideBar(props) {
    return (
        <React.Fragment>
            <h2 className="header">{props.collection.currentProject.name || ""}</h2>
            <SideBarFieldSet collection={props.collection}
                             setBaseMapSource={props.setBaseMapSource}
                             setCurrentValue={props.setCurrentValue}
                             updateDGWMSLayer={props.updateDGWMSLayer}
                             updatePlanetLayer={props.updatePlanetLayer}
                             nextPlot={props.nextPlot}
                             flagPlot={props.flagPlot}
                             showAnswers={props.showAnswers}
                             getCurrent={props.getCurrent}
                             _this={props._this}/>
            <div className="row">
                <div className="col-sm-12 btn-block">
                    <button id="save-values-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                            type="button" name="save-values" style={{opacity: "0.5"}} disabled>
                        Save
                    </button>
                    <button className="btn btn-outline-lightgreen btn-sm btn-block mb-1" data-toggle="collapse"
                            href="#project-stats-collapse" role="button" aria-expanded="false"
                            aria-controls="project-stats-collapse">
                        Project Stats
                    </button>
                    <div className="row justify-content-center mb-1 text-center">
                        <div className="col-lg-12">
                            <fieldset id="projStats" className={"text-center " + props.collection.statClass}>
                                <div className="collapse" id="project-stats-collapse">
                                    <table className="table table-sm">
                                        <tbody>
                                            <tr>
                                                <td className="small">Project</td>
                                                <td className="small">
                                                    {props.collection.currentProject.name || ""}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Assigned</td>
                                                <td className="small">
                                                    {props.collection.stats.analyzedPlots || ""}
                                                    ({props.assignedPercentage}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Flagged</td>
                                                <td className="small">
                                                    {props.collection.stats.flaggedPlots || ""}
                                                    ({props.flaggedPercentage}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Completed</td>
                                                <td className="small">
                                                    {props.collection.stats.analyzedPlots + props.collection.stats.flaggedPlots || ""}
                                                    ({props.completedPercentage}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Total</td>
                                                <td className="small">
                                                    {props.collection.currentProject.numPlots || ""}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </fieldset>
                        </div>
                    </div>
                    <button id="collection-quit-button" className="btn btn-outline-danger btn-block btn-sm"
                            type="button" name="collection-quit" data-toggle="modal" data-target="#confirmation-quit">
                        Quit
                    </button>
                </div>
            </div>
        </React.Fragment>
    );
}

function range(start, stop, step) {
    return Array.from({length: (stop - start) / step}, (_, i) => start + (i * step));
}

function DigitalGlobeMenus(props) {
    if (props.collection.currentProject && props.collection.currentProject.baseMapSource == "DigitalGlobeWMSImagery") {
        return (
            <React.Fragment>
                <select className="form-control form-control-sm"
                        id="dg-imagery-year"
                        name="dg-imagery-year"
                        size="1"
                        defaultValue={props.collection.imageryYearDG}
                        onChange={props.updateDGWMSLayer}>
                    {
                        range(2018,1999,-1).map(year => <option key={year} value={year}>{year}</option>)
                    }
                </select>
                <select className="form-control form-control-sm"
                        id="dg-stacking-profile"
                        name="dg-stacking-profile"
                        size="1"
                        defaultValue={props.collection.stackingProfileDG}
                        onChange={props.updateDGWMSLayer}>
                    {
                        ["Accuracy_Profile","Cloud_Cover_Profile","Global_Currency_Profile","MyDG_Color_Consumer_Profile","MyDG_Consumer_Profile"]
                            .map(profile => <option key={profile} value={profile}>{profile}</option>)
                    }
                </select>
            </React.Fragment>
        );
    } else {
        return "";
    }
}

function PlanetMenus(props) {
    if (props.collection.currentProject && props.collection.currentProject.baseMapSource == "PlanetGlobalMosaic") {
        return (
            <React.Fragment>
                <select className="form-control form-control-sm"
                        id="planet-imagery-year"
                        name="planet-imagery-year"
                        size="1"
                        defaultValue={props.collection.imageryYearPlanet}
                        onChange={props.updatePlanetLayer}>
                    {
                        range(2018,2015,-1).map(year => <option key={year} value={year}>{year}</option>)
                    }
                </select>
                <select className="form-control form-control-sm"
                        id="planet-imagery-month"
                        name="planet-imagery-month"
                        size="1"
                        defaultValue={props.collection.imageryMonthPlanet}
                        onChange={props.updatePlanetLayer}>
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
            </React.Fragment>
        );
    } else {
        return "";
    }
}

function SideBarFieldSet(props) {
    return (
        <React.Fragment>
            <fieldset className="mb-3 text-center">
                <h3>Plot Navigation</h3>
                <div className="row">
                    <div className="col" id="go-to-first-plot">
                        <input id="go-to-first-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                               type="button" name="new-plot" defaultValue="Go to first plot" onClick={props.nextPlot}/>
                    </div>
                </div>
                <div className="row d-none" id="plot-nav">
                    <div className="col-sm-6 pr-2">
                        <input id="new-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                               type="button" name="new-plot" defaultValue="Skip" onClick={props.nextPlot}/>
                    </div>
                    <div className="col-sm-6 pl-2">
                        <input id="flag-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                               type="button" name="flag-plot" value="Flag Plot as Bad"
                               style={{opacity: "0.5"}} disabled onClick={props.flagPlot}/>
                    </div>
                </div>
            </fieldset>
            <fieldset className="mb-3 justify-content-center text-center">
                <h3>Imagery Options</h3>
                <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                        size="1" defaultValue={props.collection.currentProject.baseMapSource || ""}
                        onChange={props.setBaseMapSource}>
                    {
                        // FIXME: make imageryList = []
                        props.collection.imageryList.map((imagery, uid) => <option key={uid} value={imagery.title}>{imagery.title}</option>)
                    }
                </select>
                <DigitalGlobeMenus collection={props.collection}/>
                <PlanetMenus collection={props.collection}/>
            </fieldset>
            <fieldset className="mb-3 justify-content-center text-center">
                <h3>Survey Questions</h3>
                <i style={{fontSize: "small"}}>(Click on a question to expand)</i>
            </fieldset>
            {props.collection.currentProject && props.getCurrent(-1, props._this)}
        </React.Fragment>
    );
}

export function renderCollectionPage(args) {
    ReactDOM.render(
        <Collection documentRoot={args.documentRoot} userName={args.userName} projectId={args.projectId}/>,
        document.getElementById("collection")
    );
}
