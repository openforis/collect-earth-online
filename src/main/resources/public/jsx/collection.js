import React from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";

class Collection extends React.Component {
    constructor(props) {
        super(props);
        // FIXME: Refactor this state further down the component tree
        this.state = {
            currentProject: {sampleValues: []},
            stats: {},
            plotList: [],
            imageryList: [],
            mapConfig: null,
            currentImagery: {attribution: ""},
            imageryYearDG: 2009,
            stackingProfileDG: "Accuracy_Profile",
            imageryYearPlanet: 2018,
            imageryMonthPlanet: "03",
            projectPlotsShown: false,
            navButtonsShown: 1,
            newPlotButtonDisabled: false,
            flagPlotButtonDisabled: false,
            saveValuesButtonDisabled: true,
            currentPlot: null,
            userSamples: {},
            clicked:false
        };
        this.setBaseMapSource  = this.setBaseMapSource.bind(this);
        this.updateDGWMSLayer  = this.updateDGWMSLayer.bind(this);
        this.updatePlanetLayer = this.updatePlanetLayer.bind(this);
        this.getPlotData       = this.getPlotData.bind(this);
        this.nextPlot          = this.nextPlot.bind(this);
        this.flagPlot          = this.flagPlot.bind(this);
        this.saveValues        = this.saveValues.bind(this);
        // FIXME: Do all of these need to be bound?
        this.setCurrentValue   = this.setCurrentValue.bind(this);
        this.showAnswers       = this.showAnswers.bind(this);
        this.hideAnswers       = this.hideAnswers.bind(this);
        this.getCurrent        = this.getCurrent.bind(this);
    }

    componentDidMount() {
        this.getProjectById();
        this.getProjectStats();
        this.getProjectPlots();
    }

    componentDidUpdate() {
        if (this.state.currentProject.institution && this.state.imageryList.length == 0) {
            this.getImageryList(this.state.currentProject.institution);
        }
        if (this.state.imageryList.length > 0 && this.state.mapConfig == null) {
            this.showProjectMap();
        }
        if (this.state.mapConfig && this.state.plotList.length > 0 && this.state.projectPlotsShown == false) {
            this.showProjectPlots();
        }
        if (this.state.mapConfig && this.state.currentImagery.id == null) {
            this.updateMapImagery(this.state.currentProject.baseMapSource);
        }
    }

    getProjectById() {
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
                    console.log(surveyQuestions);
                    project.sampleValues = surveyQuestions;
                    this.setState({currentProject: project});
                }
            });
    }

    // FIXME: add {answered: false} to each surveyQuestion object
    // FIXME: add {hasChildQuestion: false} to each surveyQuestion answer object
    // FIXME: for each child question, find its parent question object and parent answer object
    //        add {hasChildQuestion: true} to each parent answer object that you find
    //        if a parent answer is "Any", add {hasChildQuestion: true} all answer objects in the parent question object
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
                                  this.setState({navButtonsShown: 2,
                                                 newPlotButtonDisabled: false,
                                                 flagPlotButtonDisabled: false,
                                                 saveValuesButtonDisabled: true});
                                  this.getPlotData(feature.get("features")[0].get("plotId"));
                              });
        this.setState({projectPlotsShown: true});
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
        mercator.setVisibleLayer(this.state.mapConfig, newBaseMapSource);
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
                    this.setState({currentPlot: null,
                                   userSamples: {}});
                    const msg = (plotId == "random")
                        ? "All plots have been analyzed for this project."
                        : "This plot has already been analyzed.";
                    alert(msg);
                } else if (data == "not found") {
                    this.setState({currentPlot: null,
                                   userSamples: {}});
                    alert("No plot with ID " + plotId + " found.");
                } else if (data == "error") {
                    this.setState({currentPlot: null,
                                   userSamples: {}});
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({currentPlot: newPlot,
                                   userSamples: {}});
                    this.showProjectPlot(newPlot);
                    this.showGeoDash(newPlot);
                }
            });
    }

    showProjectPlot(plot) {
        mercator.disableSelection(this.state.mapConfig);
        mercator.removeLayerByTitle(this.state.mapConfig, "currentPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "currentPlot");
        mercator.removeLayerByTitle(this.state.mapConfig, "currentSamples");
        mercator.addVectorLayer(this.state.mapConfig,
                                "currentPlot",
                                mercator.geometryToVectorSource(
                                    plot.geom
                                        ? mercator.parseGeoJson(plot.geom, true)
                                        : mercator.getPlotPolygon(plot.center,
                                                                  this.state.currentProject.plotSize,
                                                                  this.state.currentProject.plotShape)
                                ),
                                ceoMapStyles.polygon);
        mercator.addVectorLayer(this.state.mapConfig,
                                "currentSamples",
                                mercator.samplesToVectorSource(plot.samples),
                                ceoMapStyles.yellowPoint);
        mercator.enableSelection(this.state.mapConfig, "currentSamples");
        mercator.zoomMapToLayer(this.state.mapConfig, "currentPlot");
    }

    showGeoDash(plot) {
        const plotRadius = this.state.currentProject.plotSize
            ? this.state.currentProject.plotSize / 2.0
            : mercator.getViewRadius(this.state.mapConfig);
        window.open(this.props.documentRoot + "/geo-dash?editable=false&"
                    + encodeURIComponent("title=" + this.state.currentProject.name
                                         + "&pid=" + this.props.projectId
                                         + "&plotid=" + this.state.currentProject.id
                                         + "&plotshape=" + this.state.currentProject.plotShape
                                         + "&aoi=[" + mercator.getViewExtent(this.state.mapConfig)
                                         + "]&daterange=&bcenter=" + plot.center
                                         + "&bradius=" + plotRadius),
                    "_geo-dash");
    }

    nextPlot() {
        this.setState({navButtonsShown: 2,
                       newPlotButtonDisabled: false,
                       flagPlotButtonDisabled: false,
                       saveValuesButtonDisabled: true});
        this.getPlotData("random");
    }

    flagPlot() {
        if (this.state.currentPlot != null) {
            fetch(this.props.documentRoot + "/flag-plot",
                  {
                      method: "post",
                      headers: {
                          "Accept": "application/json",
                          "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                          projectId: this.props.projectId,
                          plotId: this.state.currentPlot.id,
                          userId: this.props.userName
                      })
                  })
                .then(response => {
                    if (response.ok) {
                        let statistics = this.state.stats;
                        statistics.flaggedPlots = statistics.flaggedPlots + 1;
                        this.setState({stats: statistics});
                        this.nextPlot();
                    } else {
                        console.log(response);
                        alert("Error flagging plot as bad. See console for details.");
                    }
                });
        }
    }

    saveValues() {
        fetch(this.props.documentRoot + "/add-user-samples",
              {
                  method: "post",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                      projectId: this.props.projectId,
                      plotId: this.state.currentPlot.id,
                      userId: this.props.userName,
                      userSamples: this.state.userSamples
                  })
              })
            .then(response => {
                if (response.ok) {
                    let statistics = this.state.stats;
                    statistics.analyzedPlots = statistics.analyzedPlots + 1;
                    this.setState({stats: statistics});
                    this.nextPlot();
                } else {
                    console.log(response);
                    alert("Error saving your assignments to the database. See console for details.");
                }
            });
    }

    // FIXME: Needs to be reviewed
    setCurrentValue(event, surveyQuestion, answer) {
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

    // FIXME: Move this functionality into render()
    loadPlotCommon(plotId) {
        // FIXME: What is this?
        if(document.getElementById("testg")!=null)
            document.getElementById("testg").style.display="block";
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

    render() {
        return (
            <React.Fragment>
                <ImageAnalysisPane imageryAttribution={this.state.currentImagery.attribution}/>
                <SideBar currentProject={this.state.currentProject}
                         navButtonsShown={this.state.navButtonsShown}
                         newPlotButtonDisabled={this.state.newPlotButtonDisabled}
                         flagPlotButtonDisabled={this.state.flagPlotButtonDisabled}
                         nextPlot={this.nextPlot}
                         flagPlot={this.flagPlot}
                         imageryList={this.state.imageryList}
                         setBaseMapSource={this.setBaseMapSource}
                         imageryYearDG={this.state.imageryYearDG}
                         stackingProfileDG={this.state.stackingProfileDG}
                         updateDGWMSLayer={this.updateDGWMSLayer}
                         imageryYearPlanet={this.state.imageryYearPlanet}
                         imageryMonthPlanet={this.state.imageryMonthPlanet}
                         updatePlanetLayer={this.updatePlanetLayer}
                         stats={this.state.stats}
                         saveValues={this.saveValues}
                         saveValuesButtonDisabled={this.state.saveValuesButtonDisabled}
                         getCurrent={this.getCurrent}/>
            </React.Fragment>
        );
    }
}

function ImageAnalysisPane(props) {
    return (
        <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
            <div id="imagery-info" className="row">
                <p className="col small">{props.imageryAttribution}</p>
            </div>
        </div>
    );
}

function SideBar(props) {
    return (
        <div id="sidebar" className="col-xl-3">
            <ProjectName projectName={props.currentProject.name}/>
            <PlotNavigation navButtonsShown={props.navButtonsShown}
                            nextPlot={props.nextPlot}
                            flagPlot={props.flagPlot}
                            newPlotButtonDisabled={props.newPlotButtonDisabled}
                            flagPlotButtonDisabled={props.flagPlotButtonDisabled}/>
            <ImageryOptions baseMapSource={props.currentProject.baseMapSource}
                            setBaseMapSource={props.setBaseMapSource}
                            imageryList={props.imageryList}
                            imageryYearDG={props.imageryYearDG}
                            stackingProfileDG={props.stackingProfileDG}
                            updateDGWMSLayer={props.updateDGWMSLayer}
                            imageryYearPlanet={props.imageryYearPlanet}
                            imageryMonthPlanet={props.imageryMonthPlanet}
                            updatePlanetLayer={props.updatePlanetLayer}/>
            <SurveyQuestions surveyQuestions={props.currentProject.sampleValues}
                             getCurrent={props.getCurrent}/>
            <div className="row">
                <div className="col-sm-12 btn-block">
                    <SaveValuesButton saveValues={props.saveValues}
                                      saveValuesButtonDisabled={props.saveValuesButtonDisabled}/>
                    <ProjectStats projectName={props.currentProject.name}
                                  numPlots={props.currentProject.numPlots}
                                  stats={props.stats}/>
                    <QuitButton/>
                </div>
            </div>
        </div>
    );
}

function ProjectName(props) {
    return (
        <h2 className="header">{props.projectName || ""}</h2>
    );
}

function PlotNavigation(props) {
    return (
        <fieldset className="mb-3 text-center">
            <h3>Plot Navigation</h3>
            <div className={props.navButtonsShown == 1 ? "row" : "row d-none"} id="go-to-first-plot">
                <div className="col">
                    <input id="go-to-first-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                           type="button" name="new-plot" value="Go to first plot" onClick={props.nextPlot}/>
                </div>
            </div>
            <div className={props.navButtonsShown == 2 ? "row" : "row d-none"} id="plot-nav">
                <div className="col-sm-6 pr-2">
                    <input id="new-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                           type="button" name="new-plot" value="Skip" onClick={props.nextPlot}
                           style={{opacity: props.newPlotButtonDisabled ? "0.5" : "1.0"}}
                           disabled={props.newPlotButtonDisabled}/>
                </div>
                <div className="col-sm-6 pl-2">
                    <input id="flag-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                           type="button" name="flag-plot" value="Flag Plot as Bad" onClick={props.flagPlot}
                           style={{opacity: props.flagPlotButtonDisabled ? "0.5" : "1.0"}}
                           disabled={props.flagPlotButtonDisabled}/>
                </div>
            </div>
        </fieldset>
    );
}

function ImageryOptions(props) {
    return (
        <fieldset className="mb-3 justify-content-center text-center">
            <h3>Imagery Options</h3>
            <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                    size="1" defaultValue={props.baseMapSource || ""}
                    onChange={props.setBaseMapSource}>
                {
                    props.imageryList.map(
                        (imagery, uid) =>
                            <option key={uid} value={imagery.title}>{imagery.title}</option>
                    )
                }
            </select>
            <DigitalGlobeMenus baseMapSource={props.baseMapSource}
                               imageryYearDG={props.imageryYearDG}
                               stackingProfileDG={props.stackingProfileDG}
                               updateDGWMSLayer={props.updateDGWMSLayer}/>
            <PlanetMenus baseMapSource={props.baseMapSource}
                         imageryYearPlanet={props.imageryYearPlanet}
                         imageryMonthPlanet={props.imageryMonthPlanet}
                         updatePlanetLayer={props.updatePlanetLayer}/>
        </fieldset>
    );
}

function range(start, stop, step) {
    return Array.from({length: (stop - start) / step}, (_, i) => start + (i * step));
}

function DigitalGlobeMenus(props) {
    if (props.baseMapSource == "DigitalGlobeWMSImagery") {
        return (
            <React.Fragment>
                <select className="form-control form-control-sm"
                        id="dg-imagery-year"
                        name="dg-imagery-year"
                        size="1"
                        defaultValue={props.imageryYearDG}
                        onChange={props.updateDGWMSLayer}>
                    {
                        range(2018,1999,-1).map(year => <option key={year} value={year}>{year}</option>)
                    }
                </select>
                <select className="form-control form-control-sm"
                        id="dg-stacking-profile"
                        name="dg-stacking-profile"
                        size="1"
                        defaultValue={props.stackingProfileDG}
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
    if (props.baseMapSource == "PlanetGlobalMosaic") {
        return (
            <React.Fragment>
                <select className="form-control form-control-sm"
                        id="planet-imagery-year"
                        name="planet-imagery-year"
                        size="1"
                        defaultValue={props.imageryYearPlanet}
                        onChange={props.updatePlanetLayer}>
                    {
                        range(2018,2015,-1).map(year => <option key={year} value={year}>{year}</option>)
                    }
                </select>
                <select className="form-control form-control-sm"
                        id="planet-imagery-month"
                        name="planet-imagery-month"
                        size="1"
                        defaultValue={props.imageryMonthPlanet}
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

// FIXME: how does props.getCurrent() work?
function SurveyQuestions(props) {
    return (
        <fieldset className="mb-3 justify-content-center text-center">
            <h3>Survey Questions</h3>
            <i style={{fontSize: "small"}}>(Click on a question to expand)</i>
            {props.surveyQuestions.length > 0 && props.getCurrent(-1, props._this)}
        </fieldset>
    );
}

function SaveValuesButton(props) {
    return (
        <input id="save-values-button" className="btn btn-outline-lightgreen btn-sm btn-block"
               type="button" name="save-values" value="Save" onClick={props.saveValues}
               style={{opacity: props.saveValuesButtonDisabled ? "0.5" : "1.0"}}
               disabled={props.saveValuesButtonDisabled}/>
    );
}

class ProjectStats extends React.Component {
    asPercentage(part, total) {
        return (part && total)
            ? (100.0 * part / total).toFixed(2)
            : "0.00";
    }

    render() {
        return (
            <React.Fragment>
                <button className="btn btn-outline-lightgreen btn-sm btn-block mb-1" data-toggle="collapse"
                        href="#project-stats-collapse" role="button" aria-expanded="false"
                        aria-controls="project-stats-collapse">
                    Project Stats
                </button>
                <div className="row justify-content-center mb-1 text-center">
                    <div className="col-lg-12">
                        <fieldset id="projStats" className="text-center projNoStats">
                            <div className="collapse" id="project-stats-collapse">
                                <table className="table table-sm">
                                    <tbody>
                                        <tr>
                                            <td className="small">Project</td>
                                            <td className="small">
                                                {this.props.projectName || ""}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="small">Plots Analyzed</td>
                                            <td className="small">
                                                {this.props.stats.analyzedPlots || ""}
                                                ({this.asPercentage(this.props.stats.analyzedPlots, this.props.numPlots)}%)
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="small">Plots Flagged</td>
                                            <td className="small">
                                                {this.props.stats.flaggedPlots || ""}
                                                ({this.asPercentage(this.props.stats.flaggedPlots, this.props.numPlots)}%)
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="small">Plots Completed</td>
                                            <td className="small">
                                                {this.props.stats.analyzedPlots + this.props.stats.flaggedPlots || ""}
                                                ({this.asPercentage(this.props.stats.analyzedPlots + this.props.stats.flaggedPlots, this.props.numPlots)}%)
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="small">Plots Total</td>
                                            <td className="small">
                                                {this.props.numPlots || ""}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </fieldset>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

function QuitButton() {
    return (
        <button id="collection-quit-button" className="btn btn-outline-danger btn-block btn-sm"
                type="button" name="collection-quit" data-toggle="modal" data-target="#confirmation-quit">
            Quit
        </button>
    );
}

export function renderCollectionPage(args) {
    ReactDOM.render(
        <Collection documentRoot={args.documentRoot} userName={args.userName} projectId={args.projectId}/>,
        document.getElementById("collection")
    );
}
