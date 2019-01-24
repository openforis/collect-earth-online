import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";

class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentProject: {sampleValues: []},
            stats: {},
            plotList: [],
            imageryList: [],
            mapConfig: null,
            currentImagery: null,
            imageryAttribution: "",
            imageryYearDG: 2009,
            stackingProfileDG: "Accuracy_Profile",
            imageryYearPlanet: "2018",
            imageryMonthPlanet: "03",
            imageryMonthNamePlanet: "March",
            projectPlotsShown: false,
            navButtonsShown: 1,
            prevPlotButtonDisabled: true,
            nextPlotButtonDisabled: false,
            flagPlotButtonDisabled: false,
            saveValuesButtonDisabled: true,
            currentPlot: null,
            userSamples: {},
            userImages: {},
            selectedAnswers: {},
            collectionStart: 0,
            newPlotInput: 0,
            reviewPlots: false,
            selectedQuestion: ""
        };
        this.setBaseMapSource = this.setBaseMapSource.bind(this);
        this.setImageryYearDG = this.setImageryYearDG.bind(this);
        this.setStackingProfileDG = this.setStackingProfileDG.bind(this);
        this.setImageryYearPlanet = this.setImageryYearPlanet.bind(this);
        this.setImageryMonthPlanet = this.setImageryMonthPlanet.bind(this);
        this.goToFirstPlot = this.goToFirstPlot.bind(this);
        this.prevPlot = this.prevPlot.bind(this);
        this.nextPlot = this.nextPlot.bind(this);
        this.goToPlot = this.goToPlot.bind(this);
        this.updateNewPlotId = this.updateNewPlotId.bind(this);
        this.setReviewPlots = this.setReviewPlots.bind(this);
        this.flagPlot = this.flagPlot.bind(this);
        this.saveValues = this.saveValues.bind(this);
        this.highlightAnswer = this.highlightAnswer.bind(this);
        this.setCurrentValue = this.setCurrentValue.bind(this);
        this.redirectToHomePage = this.redirectToHomePage.bind(this);
    }

    componentDidMount() {
        this.getProjectById();
        this.getProjectPlots();
    }

    componentDidUpdate(prevState) {
        // Wait to get imagery list until project is loaded
        if (this.state.currentProject.institution && this.state.imageryList.length == 0) {
            this.getImageryList(this.state.currentProject.institution);
        }
        if (this.state.imageryList.length > 0 && this.state.mapConfig == null) {
            this.showProjectMap();
        }
        if (this.state.mapConfig && this.state.plotList.length > 0 && this.state.projectPlotsShown == false) {
            this.showProjectPlots();
        }
        if (this.state.mapConfig && this.state.currentImagery == null) {
            this.updateMapImagery(this.state.currentProject.baseMapSource);
        }
        if (this.state.currentPlot && (this.state.currentPlot !== prevState.currentPlot)) {
            console.log(this.state.currentPlot);
            console.log(prevState.currentPlot);
            this.showProjectPlot(this.state.currentPlot);
            this.showGeoDash(this.state.currentPlot);
        }


        if (this.state.selectedQuestion && this.state.sampleValues && 
            (this.state.selectedQuestion !== prevState.selectedQuestion || this.state.sampleValues !== prevState.sampleValues)) {
            this.highlightSamplesByQuestion();
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
                    project.sampleValues = surveyQuestions;
                    this.setState({currentProject: project});
                }
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
        console.log('project map')
        let mapConfig = mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, this.state.imageryList);
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary, true)),
                                ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        this.setState({mapConfig: mapConfig});
    }

    showProjectPlots() {
        console.log('project plots 2')
        mercator.addPlotLayer(this.state.mapConfig,
                              this.state.plotList,
                              feature => {
                                  this.setState({
                                      navButtonsShown: 2,
                                      prevPlotButtonDisabled: false,
                                      nextPlotButtonDisabled: false,
                                      flagPlotButtonDisabled: false,
                                      saveValuesButtonDisabled: true
                                  });
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

    setImageryYearDG(event) {
        const slider = event.target;
        const newImageryYearDG = slider.value;
        const currentImagery = this.getImageryByTitle(this.state.currentProject.baseMapSource);
        const newImageryAttribution = currentImagery.attribution + " | " + newImageryYearDG + " (" + this.state.stackingProfileDG + ")";
        this.setState({
            imageryYearDG: newImageryYearDG,
            imageryAttribution: newImageryAttribution
        });
        this.updateDGWMSLayer(newImageryYearDG, this.state.stackingProfileDG);
    }

    setStackingProfileDG(event) {
        const dropdown = event.target;
        const newStackingProfileDG = dropdown.options[dropdown.selectedIndex].value;
        const currentImagery = this.getImageryByTitle(this.state.currentProject.baseMapSource);
        const newImageryAttribution = currentImagery.attribution + " | " + this.state.imageryYearDG + " (" + newStackingProfileDG + ")";
        this.setState({
            stackingProfileDG: newStackingProfileDG,
            imageryAttribution: newImageryAttribution
        });
        this.updateDGWMSLayer(this.state.imageryYearDG, newStackingProfileDG);
    }

    setImageryYearPlanet(event) {
        const slider = event.target;
        const newImageryYearPlanet = slider.value;
        const currentImagery = this.getImageryByTitle(this.state.currentProject.baseMapSource);
        const newImageryAttribution = currentImagery.attribution + " | " + newImageryYearPlanet + "-" + this.state.imageryMonthPlanet;
        this.setState({
            imageryYearPlanet: newImageryYearPlanet,
            imageryAttribution: newImageryAttribution
        });
        this.updatePlanetLayer(this.state.imageryMonthPlanet, newImageryYearPlanet);
    }

    setImageryMonthPlanet(event) {
        const slider = event.target;
        let newImageryMonthPlanet = "";

        let newImageryMonth = slider.value;

        if (parseInt(newImageryMonth) == 1) {
            newImageryMonthPlanet = "January";

        }
        if (parseInt(newImageryMonth) == 2) {
            newImageryMonthPlanet = "February";
        }
        else if (parseInt(newImageryMonth) == 3) {
            newImageryMonthPlanet = "March";
        }
        else if (parseInt(newImageryMonth) == 4) {
            newImageryMonthPlanet = "April";
        }
        else if (parseInt(newImageryMonth) == 5) {
            newImageryMonthPlanet = "May";
        }
        else if (parseInt(newImageryMonth) == 6) {
            newImageryMonthPlanet = "June";
        }
        else if (parseInt(newImageryMonth) == 7) {
            newImageryMonthPlanet = "July";
        }
        else if (parseInt(newImageryMonth) == 8) {
            newImageryMonthPlanet = "August";
        }
        else if (parseInt(newImageryMonth) == 9) {
            newImageryMonthPlanet = "September";
        }
        else if (parseInt(newImageryMonth) == 10) {
            newImageryMonthPlanet = "October";
        }
        else if (parseInt(newImageryMonth) == 11) {
            newImageryMonthPlanet = "November";
        }
        else if (parseInt(newImageryMonth) == 12) {
            newImageryMonthPlanet = "December";
        }


        const currentImagery = this.getImageryByTitle(this.state.currentProject.baseMapSource);
        const newImageryAttribution = currentImagery.attribution + " | " + this.state.imageryYearPlanet + "-" + newImageryMonthPlanet;
        this.setState({
            imageryMonthPlanet: newImageryMonth,
            imageryMonthNamePlanet: newImageryMonthPlanet,
            imageryAttribution: newImageryAttribution
        });
        if (parseInt(slider.value) < 10) {
            newImageryMonth = "0" + slider.value;
        }
        this.updatePlanetLayer(newImageryMonth, this.state.imageryYearPlanet);
    }

    updateMapImagery(newBaseMapSource) {
        console.log('update map imagery')
        mercator.setVisibleLayer(this.state.mapConfig, newBaseMapSource);
        const newImagery = this.getImageryByTitle(newBaseMapSource);
        let newImageryAttribution = newImagery.attribution;
        if (newBaseMapSource == "DigitalGlobeWMSImagery") {
            newImageryAttribution += " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")";
            this.updateDGWMSLayer(this.state.imageryYearDG, this.state.stackingProfileDG);
        } else if (newBaseMapSource == "PlanetGlobalMosaic") {
            newImageryAttribution += " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet;
            this.updatePlanetLayer(this.state.imageryMonthPlanet, this.state.imageryYearPlanet);
        }
        this.setState({
            currentImagery: newImagery,
            imageryAttribution: newImageryAttribution
        });
    }

    getImageryByTitle(imageryTitle) {
        return this.state.imageryList.find(imagery => imagery.title == imageryTitle);
    }

    updateDGWMSLayer(imageryYear, stackingProfile) {
        console.log('dqwms')
        mercator.updateLayerWmsParams(this.state.mapConfig,
                                      "DigitalGlobeWMSImagery",
                                      {
                                          COVERAGE_CQL_FILTER: "(acquisitionDate>='" + imageryYear + "-01-01')"
                                              + "AND(acquisitionDate<='" + imageryYear + "-12-31')",
                                          FEATUREPROFILE: stackingProfile
                                      });
    }

    updatePlanetLayer(imageryMonth, imageryYear) {
        console.log('planet')
        mercator.updateLayerSource(this.state.mapConfig,
                                   "PlanetGlobalMosaic",
                                   sourceConfig => {
                                       sourceConfig.month = imageryMonth;
                                       sourceConfig.year = imageryYear;
                                       return sourceConfig;
                                   },
                                   this);
    }

    getPlotData(plotId) {
        let userParam = this.state.reviewPlots ? "?userName=" + this.props.userName : ""
        fetch(this.props.documentRoot + "/get-plot-by-id/" + this.props.projectId + "/" + plotId + userParam)
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
                    alert("This plot has already been analyzed.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        newPlotInput: newPlot.plotId ? newPlot.plotId : newPlot.id,
                        userSamples: newPlot.samples ? this.samplesToValues(newPlot.samples) : {},
                        userImages: newPlot.samples ? this.samplesToImages(newPlot.samples) : {},
                        // FIXME update with existing plot
                        selectedAnswers: {},
                        collectionStart: Date.now(),
                        navButtonsShown: 2,
                        prevPlotButtonDisabled: false,
                        nextPlotButtonDisabled: false,
                        flagPlotButtonDisabled: false,
                        saveValuesButtonDisabled: true
                    });
                }
            });
    }

    getNextPlotData(plotId) {
        let userParam = this.state.reviewPlots ? "?userName=" + this.props.userName : ""
        fetch(this.props.documentRoot + "/get-next-plot/" + this.props.projectId + "/" + plotId + userParam)
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
                    if (plotId == -1) {
                        alert("All plots have been analyzed for this project.");
                        window.open(this.props.documentRoot + "/home");
                    } else {
                        this.setState({nextPlotButtonDisabled: true});
                        alert("You have reached the end of the plot list.");
                    }
                } else {
                    const newPlot = JSON.parse(data);
                    if (plotId == -1) {
                        this.setState({
                            currentPlot: newPlot,
                            newPlotInput: newPlot.plotId ? newPlot.plotId : newPlot.id,
                            userSamples: {},
                            userImages: {},
                            collectionStart: Date.now(),
                            navButtonsShown: 2
                        });
                    } else {
                        this.setState({
                            currentPlot: newPlot,
                            newPlotInput: newPlot.plotId ? newPlot.plotId : newPlot.id,
                            userSamples: newPlot.samples ? this.samplesToValues(newPlot.samples) : {},
                            userImages: newPlot.samples ? this.samplesToImages(newPlot.samples) : {},
                            // FIXME update with existing plot
                            selectedAnswers: {},
                            collectionStart: Date.now(),
                            prevPlotButtonDisabled: false,
                            saveValuesButtonDisabled: true
                        });
                    }
                }
            });
    }

    getPrevPlotData(plotId) {
        let userParam = this.state.reviewPlots ? "?userName=" + this.props.userName : ""
        fetch(this.props.documentRoot + "/get-prev-plot/" + this.props.projectId + "/" + plotId + userParam)
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
                    this.setState({prevPlotButtonDisabled: true});
                    alert("All previous plots have been analyzed.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        newPlotInput: newPlot.plotId ? newPlot.plotId : newPlot.id,
                        userSamples: newPlot.samples ? this.samplesToValues(newPlot.samples) : {},
                        userImages: newPlot.samples ? this.samplesToImages(newPlot.samples) : {},
                        // FIXME update with existing plot
                        selectedAnswers: {},
                        collectionStart: Date.now(),
                        nextPlotButtonDisabled: false,
                        saveValuesButtonDisabled: true
                    });
                }
            });
    }

    samplesToValues(samples) {
        return samples.reduce((obj, s) => {
            var newObj = obj
            newObj[s.id] = s.value
            return newObj;
            }
        , {})   
    }

    samplesToImages(samples) {
        return samples.reduce((obj, s) => {
            var newObj = obj
            newObj[s.id] = s.userImage
            return newObj;
            }
        , {})  
    }

    convertSampleValuesToSurveyQuestions(sampleValues) {
        return sampleValues.map(sampleValue => {
            if (sampleValue.name && sampleValue.values) {
                const surveyQuestionAnswers = sampleValue.values.map(value => {
                    if (value.name) {
                        return {
                            id: value.id,
                            answer: value.name,
                            color: value.color
                        };
                    } else {
                        return value;
                    }
                });
                return {
                    id: sampleValue.id,
                    question: sampleValue.name,
                    answers: surveyQuestionAnswers,
                    parent_question: -1,
                    parent_answer: -1
                };
            } else {
                return sampleValue;
            }
        });
    }

    showProjectPlot(plot) {
        console.log("project plot")
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
                                ceoMapStyles.yellowPolygon);
        mercator.addVectorLayer(this.state.mapConfig,
                                "currentSamples",
                                mercator.samplesToVectorSource(plot.samples),
                                plot.samples[0].geom
                                    ? ceoMapStyles.blackPolygon
                                    : ceoMapStyles.blackCircle);
        mercator.enableSelection(this.state.mapConfig, "currentSamples");
        mercator.zoomMapToLayer(this.state.mapConfig, "currentPlot");
    }

    showGeoDash(plot) {
        console.log("geodash")
        const plotRadius = this.state.currentProject.plotSize
                           ? this.state.currentProject.plotSize / 2.0
                           : mercator.getViewRadius(this.state.mapConfig);
        window.open(this.props.documentRoot + "/geo-dash?"
                    + "&pid=" + this.props.projectId
                                         + "&plotid=" + plot.id
                                         + "&plotshape=" + encodeURIComponent((plot.geom ? "polygon" : this.state.currentProject.plotShape))
                                         + "&aoi=" + encodeURIComponent("[" + mercator.getViewExtent(this.state.mapConfig) + "]")
                                         + "&daterange=&bcenter=" + plot.center
                                         + "&bradius=" + plotRadius,
                    "_geo-dash");
    }

    goToFirstPlot() {
        this.getNextPlotData(-1);
    }

    prevPlot() {
        this.getPrevPlotData(this.state.currentPlot.plotId ? parseInt(this.state.currentPlot.plotId) : this.state.currentPlot.id);
    }

    nextPlot() {
        this.getNextPlotData(this.state.currentPlot.plotId ? parseInt(this.state.currentPlot.plotId) : this.state.currentPlot.id);
    }

    goToPlot() {
        if (!isNaN(this.state.newPlotInput)) {
            this.getPlotData(this.state.newPlotInput)
        } else {
            alert("Please enter a number to go to plot")
        }
    }
    
    updateNewPlotId(value) {
        this.setState({
            newPlotInput: value,
            prevPlotButtonDisabled: false,
            nextPlotButtonDisabled: false
        })
    }

    setReviewPlots() {
        this.setState({reviewPlots: !this.state.reviewPlots})
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
                        this.getProjectPlots();
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
                      confidence: -1,
                      collectionStart: this.state.collectionStart,
                      userSamples: this.state.userSamples,
                      userImages: this.state.userImages
                  })
              })
            .then(response => {
                if (response.ok) {
                    let statistics = this.state.stats;
                    statistics.analyzedPlots = statistics.analyzedPlots + 1;
                    this.setState({stats: statistics, selectedAnswers: {}});
                    //reset state
                    this.nextPlot();
                } else {
                    console.log(response);
                    alert("Error saving your assignments to the database. See console for details.");
                }
            });
    }

    highlightAnswer(questionText, answerText) {
        let selectedAnswers = this.state.selectedAnswers;
        selectedAnswers[questionText] = answerText;
        this.setState({selectedAnswers: selectedAnswers});
    }

    getImageryAttributes () {
        if (this.state.currentImagery.title == "DigitalGlobeWMSImagery") {
            return {imageryYearDG: this.state.imageryYearDG, stackingProfileDG: this.state.stackingProfileDG};
        } else if (this.state.currentImagery.title == "PlanetGlobalMosaic") {
            return {imageryMonthPlanet: this.state.imageryMonthPlanet, imageryYearPlanet: this.state.imageryYearPlanet};
        } else {
            return {};
        }
    }

    setCurrentValue(questionText, answerId, answerText, answerColor) {
        const selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig);
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
            let userSamples = this.state.userSamples;
            let userImages = this.state.userImages;
            selectedFeatures.forEach(feature => {
                const sampleId = feature.get("sampleId");
                if (!userSamples[sampleId]) {
                    userSamples[sampleId] = {};
                }
                if (!userImages[sampleId]) {
                    userImages[sampleId] = {};
                }
                userSamples[sampleId][questionText] = {answer: answerText,
                                                       color: answerColor};
                userImages[sampleId] = {id: this.state.currentImagery.id,
                                        attributes: this.getImageryAttributes()};
            }, this); // necessary to pass outer scope into function
            this.setState({userSamples: userSamples,
                           userImages: userImages});
            this.allowSaveIfSurveyComplete(userSamples);
            return true;
        } else {
            alert("No samples selected. Please click some first.");
            return false;
        }
    }

    highlightSamplesByQuestion() {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples");
        allFeatures.forEach(feature => {
            const sampleId = feature.get("sampleId");
            const answerColor = (this.state.userSamples[sampleId] && this.state.userSamples[sampleId][this.state.selectedQuestion])
                ? this.state.userSamples[sampleId][this.state.selectedQuestion]["color"]
                : null;
            mercator.highlightSampleGeometry(feature, answerColor);
        });
    }

    allowSaveIfSurveyComplete() {
        const assignedSamples = Object.keys(this.state.userSamples);
        const totalSamples = this.state.currentPlot.samples;
        if (assignedSamples.length == totalSamples.length
            && assignedSamples.every(sampleId => this.surveyQuestionTreeComplete(userSamples[sampleId], -1))) {
            this.setState({saveValuesButtonDisabled: false});
        }
    }

    // FIXME: Make sure that each sample has answered all questions along its explored survey question tree
    surveyQuestionTreeComplete(sampleAssignments, rootNodeId) {
        return true;
        // Actual (yet incomplete) code is below)
        // const topLevelNodes = this.getChildNodes(-1);
        // const rootNode = topLevelNodes[0];
        // if (sampleAssignments[rootNode.question]) {
        //     const childNodes = this.getChildNodes(rootNode.id);
        //     return childNodes.every(childNode => this.surveyQuestionTreeComplete(sampleAssignments, childNode.id));
        // }
    }

    getChildNodes(surveyNodeId) {
        return this.state.currentProject.sampleValues.filter(surveyNode => surveyNode.parent_question == surveyNodeId);
    }

    redirectToHomePage() {
        // window.location = this.props.documentRoot + "/home";
    }

    render() {
        return (
            <Fragment>
                <ImageAnalysisPane imageryAttribution={this.state.imageryAttribution} projectPlotsShown={this.state.projectPlotsShown}/>
                <SideBar 
                    projectId={this.props.projectId}
                    documentRoot={this.props.documentRoot}
                    saveValues={this.saveValues}
                    saveValuesButtonDisabled={this.state.saveValuesButtonDisabled}
                    projectName={this.state.currentProject.name}
                >
                    {this.state.projectPlotsShown && 
                        <Fragment>
                            <PlotNavigation 
                                plotId={this.state.currentPlot && (this.state.currentPlot.plotId ? this.state.currentPlot.plotId : this.state.currentPlot.id)}
                                reviewPlots={this.state.reviewPlots}
                                newPlotInput={this.state.newPlotInput}
                                navButtonsShown={this.state.navButtonsShown}
                                goToFirstPlot={this.goToFirstPlot}
                                prevPlot={this.prevPlot}
                                nextPlot={this.nextPlot}
                                flagPlot={this.flagPlot}
                                goToPlot={this.goToPlot}
                                setReviewPlots={this.setReviewPlots}
                                updateNewPlotId={this.updateNewPlotId}
                                prevPlotButtonDisabled={this.state.prevPlotButtonDisabled}
                                nextPlotButtonDisabled={this.state.nextPlotButtonDisabled}
                                flagPlotButtonDisabled={this.state.flagPlotButtonDisabled}
                                gotoFirstPlotButtonDisabled={this.state.gotoFirstPlotButtonDisabled}
                            />
                            <ImageryOptions 
                                baseMapSource={this.state.currentProject.baseMapSource}
                                setBaseMapSource={this.setBaseMapSource}
                                imageryList={this.state.imageryList}
                                imageryYearDG={this.imageryYearDG}
                                stackingProfileDG={this.stackingProfileDG}
                                setImageryYearDG={this.setImageryYearDG}
                                setStackingProfileDG={this.setStackingProfileDG}
                                imageryYearPlanet={this.imageryYearPlanet}
                                imageryMonthPlanet={this.imageryMonthPlanet}
                                imageryMonthNamePlanet={this.imageryMonthNamePlanet}
                                setImageryYearPlanet={this.setImageryYearPlanet}
                                setImageryMonthPlanet={this.setImageryMonthPlanet}
                            />
                            <SurveyQuestions 
                                surveyQuestions={this.state.currentProject.sampleValues}
                                surveyAnswersVisible={this.state.surveyAnswersVisible}
                                surveyQuestionsVisible={this.state.surveyQuestionsVisible}
                                hideShowAnswers={this.hideShowAnswers}
                                showQuestions={this.showQuestions}
                                hideQuestions={this.hideQuestions}
                                highlightAnswer={this.highlightAnswer}
                                setCurrentValue={this.setCurrentValue}
                                selectedAnswers={this.state.selectedAnswers}
                                prevSurveyQuestionTree={this.prevSurveyQuestionTree}
                                nextSurveyQuestionTree={this.nextSurveyQuestionTree}
                                prevQuestionButtonDisabled={this.state.prevQuestionButtonDisabled}
                                nextQuestionButtonDisabled={this.state.nextQuestionButtonDisabled}
                            />
                        </Fragment>
                    }
                </SideBar>
                <QuitMenu redirectToHomePage={this.redirectToHomePage}/>
            </Fragment>
        );
    }
}

function ImageAnalysisPane(props) {
    return (
        <Fragment>
            <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
                <div id="imagery-info" className="row">
                    <p className="col small">{props.imageryAttribution}</p>
                </div>
            </div>
            {!props.projectPlotsShown && 
                <div id="spinner" style={{top: "45%", left: "38%"}}></div>
            }
        </Fragment>
    );
}

function SideBar(props) {
    return (
        <div id="sidebar" className="col-xl-3" style={{overflow: "scroll"}}>
            <h2 className="header">{props.projectName || ""}</h2>
            
            {props.children}
            
            <div className="row">
                <div className="col-sm-12 btn-block">
                    <input 
                        id="save-values-button" 
                        className="btn btn-outline-lightgreen btn-sm btn-block"
                        type="button" 
                        name="save-values" 
                        value="Save" 
                        onClick={props.saveValues}
                        style={{opacity: props.saveValuesButtonDisabled ? "0.5" : "1.0"}}
                        disabled={props.saveValuesButtonDisabled}
                    />
                    <ProjectStats 
                        documentRoot={props.documentRoot}
                        projectId={props.projectId}
                    />
                    <button 
                        id="collection-quit-button" 
                        className="btn btn-outline-danger btn-block btn-sm"
                        type="button" 
                        name="collection-quit" 
                        data-toggle="modal" 
                        data-target="#confirmation-quit"
                    >
                        Quit
                    </button>
                </div>
            </div>
        </div>
    );
}

function PlotNavigation(props) {
    return (
        <fieldset className="mb-3 text-center">
            <h3 className="mb-2">Plot Navigation</h3>

            {props.plotId &&
                <div className="row py-2 justify-content-center">
                    <h3 className="mt-2">Current Plot ID:</h3>
                        <input
                            type="text"
                            id="plotId"
                            autoComplete="off"
                            className="col-4 px-0 mx-2"
                            value={props.newPlotInput}
                            onChange={e => props.updateNewPlotId(e.target.value)}
                        />
                        <input
                            id="goto-plot-button"
                            className="text-center btn btn-outline-lightgreen btn-sm"
                            type="button"
                            name="goto-plot"
                            value="Go to plot"
                            onClick={props.goToPlot}
                        />               
                </div>
            }

            {props.navButtonsShown == 1 &&
                <div className="row" id="go-to-first-plot">
                    <div className="col">
                        <input 
                            id="go-to-first-plot-button" 
                            className="btn btn-outline-lightgreen btn-sm btn-block"
                            type="button" 
                            name="new-plot" 
                            value="Go to first plot" 
                            onClick={props.goToFirstPlot}
                            style={{opacity: props.gotoFirstPlotButtonDisabled ? "0.5" : "1.0"}}
                            disabled={props.gotoFirstPlotButtonDisabled}
                        />
                    </div>
                </div>
            }

            {props.navButtonsShown == 2 &&
                <div className="row justify-content-center py-2" id="plot-nav">
                    <div className="px-1">
                        <input 
                            id="prev-plot-button" 
                            className="btn btn-outline-lightgreen"
                            type="button" 
                            name="new-plot" 
                            value="Prev" 
                            onClick={props.prevPlot}
                            style={{opacity: props.prevPlotButtonDisabled ? "0.5" : "1.0"}}
                            disabled={props.prevPlotButtonDisabled}
                        />
                    </div>
                    <div className="px-1">
                        <input 
                            id="new-plot-button" 
                            className="btn btn-outline-lightgreen"
                            type="button" 
                            name="new-plot" 
                            value="Next" 
                            onClick={props.nextPlot}
                            style={{opacity: props.nextPlotButtonDisabled ? "0.5" : "1.0"}}
                            disabled={props.nextPlotButtonDisabled}
                        />
                    </div>
                    <div className="px-1">
                        <input 
                            id="flag-plot-button" 
                            className="btn btn-outline-lightgreen"
                            type="button" 
                            name="flag-plot" 
                            value="Flag" 
                            onClick={props.flagPlot}
                            style={{opacity: props.flagPlotButtonDisabled ? "0.5" : "1.0"}}
                            disabled={props.flagPlotButtonDisabled}
                        />
                    </div>
                </div>
            }
            <div className="row justify-content-center">
                <div className="form-check">
                    <input 
                        className="form-check-input"
                        checked={props.reviewPlots}
                        id="reviewCheck"
                        onChange={props.setReviewPlots}
                        type="checkbox"
                    />
                    <label htmlFor="reviewCheck" className="form-check-label">Review your analyzed plots</label>
                </div>
            </div>
        </fieldset>
    );
}

function ImageryOptions(props) {
    return (
        <fieldset className="mb-3 justify-content-center text-center">
            <h3 className="mb-2">Imagery Options</h3>
            <select 
                className="form-control form-control-sm" 
                id="base-map-source" 
                name="base-map-source"
                size="1" value={props.baseMapSource || ""}
                onChange={props.setBaseMapSource}
            >
                {
                    props.imageryList.map(
                        (imagery, uid) =>
                            <option key={uid} value={imagery.title}>{imagery.title}</option>
                    )
                }
            </select>
            {props.baseMapSource === "DigitalGlobeWMSImagery" &&
                <DigitalGlobeMenus 
                    imageryYearDG={props.imageryYearDG}
                    stackingProfileDG={props.stackingProfileDG}
                    setImageryYearDG={props.setImageryYearDG}
                    setStackingProfileDG={props.setStackingProfileDG}
                />
            }
            {props.baseMapSource === "PlanetGlobalMosaic" && 
                <PlanetMenus 
                    imageryYearPlanet={props.imageryYearPlanet}
                    imageryMonthPlanet={props.imageryMonthPlanet}
                    imageryMonthNamePlanet={props.imageryMonthNamePlanet}
                    setImageryYearPlanet={props.setImageryYearPlanet}
                    setImageryMonthPlanet={props.setImageryMonthPlanet}
                />
            }
        </fieldset>
    );
}

function DigitalGlobeMenus(props) {
    return (
        <Fragment>
            <div className="slidecontainer form-control form-control-sm">
                <input type="range" min="2000" max="2018" value={props.imageryYearDG} className="slider" id="myRange"
                        onChange={props.setImageryYearDG}/>
                <p>Year: <span id="demo">{props.imageryYearDG}</span></p>
            </div>
            <select className="form-control form-control-sm"
                    id="dg-stacking-profile"
                    name="dg-stacking-profile"
                    size="1"
                    value={props.stackingProfileDG}
                    onChange={props.setStackingProfileDG}>
                {
                    ["Accuracy_Profile","Cloud_Cover_Profile","Global_Currency_Profile","MyDG_Color_Consumer_Profile","MyDG_Consumer_Profile"]
                        .map(profile => <option key={profile} value={profile}>{profile}</option>)
                }
            </select>
        </Fragment>
    );
}

function PlanetMenus(props) {
    return (
        <Fragment>
            <div className="slidecontainer form-control form-control-sm">
                <input type="range" min="2016" max="2018" value={props.imageryYearPlanet} className="slider" id="myRange"
                        onChange={props.setImageryYearPlanet}/>
                <p>Year: <span id="demo">{props.imageryYearPlanet}</span></p>
            </div>
            <div className="slidecontainer form-control form-control-sm">
                <input type="range" min="1" max="12" value={props.imageryMonthPlanet} className="slider" id="myRangemonth"
                        onChange={props.setImageryMonthPlanet}/>
                <p>Month: <span id="demo">{props.imageryMonthNamePlanet}</span></p>
            </div>
        </Fragment>
    );
}


// hideShowAnswers(surveyNodeId) {
//     let surveyAnswersVisible = this.state.surveyAnswersVisible;
//     if (surveyAnswersVisible[surveyNodeId]) {
//         surveyAnswersVisible[surveyNodeId] = false;
//     } else {
//         surveyAnswersVisible[surveyNodeId] = true;
//     }
//     this.setState({surveyAnswersVisible: surveyAnswersVisible});
// }

// showQuestions(surveyNodes) {
//     let surveyQuestionsVisible = this.state.surveyQuestionsVisible;
//     surveyNodes.forEach(surveyNode => surveyQuestionsVisible[surveyNode.id] = true);
//     this.setState({surveyQuestionsVisible: surveyQuestionsVisible});
// }

// hideQuestions(surveyNodes) {
//     let surveyQuestionsVisible = this.state.surveyQuestionsVisible;
//     surveyNodes.forEach(surveyNode => surveyQuestionsVisible[surveyNode.id] = false);
//     this.setState({surveyQuestionsVisible: surveyQuestionsVisible});
// }


// prevSurveyQuestionTree(surveyNodeId, surveyQuestions) {
//     let surveyQuestionsVisible = this.state.surveyQuestionsVisible;
//     let prevSurveyNode = surveyQuestions.sort((a, b) => b.id - a.id).find(node => node.id < surveyNodeId && node.parent_question == -1);
//     if (prevSurveyNode) {
//         surveyQuestionsVisible[surveyNodeId] = false;
//         surveyQuestionsVisible[prevSurveyNode.id] = true;
//         this.setState({surveyQuestionsVisible: surveyQuestionsVisible,
//                        nextQuestionButtonDisabled: false});
//     } else {
//         this.setState({prevQuestionButtonDisabled: true});
//         alert("There are no previous questions.");
//     }
// }

// nextSurveyQuestionTree(surveyNodeId, surveyQuestions) {
//     let surveyQuestionsVisible = this.state.surveyQuestionsVisible;
//     let nextSurveyNode = surveyQuestions.sort((a, b) => a.id - b.id).find(node => node.id > surveyNodeId && node.parent_question == -1);
//     if (nextSurveyNode) {
//         surveyQuestionsVisible[surveyNodeId] = false;
//         surveyQuestionsVisible[nextSurveyNode.id] = true;
//         this.setState({surveyQuestionsVisible: surveyQuestionsVisible,
//                        prevQuestionButtonDisabled: false});
//     } else {
//         this.setState({nextQuestionButtonDisabled: true});
//         alert("There are no more questions.");
//     }
// }


// prevQuestionButtonDisabled: false,
// nextQuestionButtonDisabled: false,
// surveyAnswersVisible: {},
// surveyQuestionsVisible: {},

// this.hideShowAnswers = this.hideShowAnswers.bind(this);
// this.showQuestions = this.showQuestions.bind(this);
// this.hideQuestions = this.hideQuestions.bind(this);
// this.prevSurveyQuestionTree=this.prevSurveyQuestionTree.bind(this);
// this.nextSurveyQuestionTree=this.nextSurveyQuestionTree.bind(this);

// if (this.state.currentProject.sampleValues.length > 0 && Object.keys(this.state.surveyQuestionsVisible).length == 0) {
//     const topLevelNodes = this.state.currentProject.sampleValues.filter(surveyNode => surveyNode.parent_question == -1);
//     const firstNode = topLevelNodes.sort((a, b) => a - b)[0];
//     this.hideQuestions(topLevelNodes);
//     this.showQuestions([firstNode]);
// }

function SurveyQuestions(props) {
    const topLevelNodes = props.surveyQuestions.filter(surveyNode => surveyNode.parent_question == -1);
    return (
        <fieldset className="mb-3 justify-content-center text-center">
            <h3>Survey Questions</h3>
            <i style={{fontSize: "small"}}>(Click on a question to expand)</i>
            {
                topLevelNodes.map((surveyNode, uid) => <SurveyQuestionTree key={uid}
                                                                           surveyNode={surveyNode}
                                                                           surveyQuestions={props.surveyQuestions}
                                                                           surveyAnswersVisible={props.surveyAnswersVisible}
                                                                           surveyQuestionsVisible={props.surveyQuestionsVisible}
                                                                           hideShowAnswers={props.hideShowAnswers}
                                                                           showQuestions={props.showQuestions}
                                                                           hideQuestions={props.hideQuestions}
                                                                           highlightAnswer={props.highlightAnswer}
                                                                           setCurrentValue={props.setCurrentValue}
                                                                           selectedAnswers={props.selectedAnswers}
                                                                           prevSurveyQuestionTree={props.prevSurveyQuestionTree}
                                                                           nextSurveyQuestionTree={props.nextSurveyQuestionTree}
                                                                           prevQuestionButtonDisabled={props.prevQuestionButtonDisabled}
                                                                           nextQuestionButtonDisabled={props.nextQuestionButtonDisabled}/>)
            }
        </fieldset>
    );
}

function SurveyQuestionTree(props) {
    const childNodes = props.surveyQuestions.filter(surveyNode => surveyNode.parent_question == props.surveyNode.id);
    const navButtons = props.surveyNode.parent_question == -1 ?
        <Fragment>
            <button id="prev-survey-question" className="btn btn-outline-lightgreen"  style={{margin:"10px"}}
                    onClick={() => props.prevSurveyQuestionTree(props.surveyNode.id, props.surveyQuestions)}
                    disabled={props.prevQuestionButtonDisabled}>Prev</button>
            <button id="next-survey-question" className="btn btn-outline-lightgreen"
                    onClick={() => props.nextSurveyQuestionTree(props.surveyNode.id, props.surveyQuestions)}
                    disabled={props.nextQuestionButtonDisabled}>Next</button>
        </Fragment>
        : "";
    return (
        <fieldset className={"mb-1 justify-content-center text-center"
                  + (props.surveyQuestionsVisible[props.surveyNode.id] ? "" : " d-none")}>
            { navButtons }
            <button id={props.surveyNode.question + "_" + props.surveyNode.id}
                    className="text-center btn btn-outline-lightgreen btn-sm btn-block"
                    onClick={() => props.hideShowAnswers(props.surveyNode.id)}
                    style={{marginBottom: "10px"}}>
                {props.surveyNode.question}
            </button>
            <ul className={"samplevalue justify-content-center"
                + (props.surveyAnswersVisible[props.surveyNode.id] ? "" : " d-none")}>
                {
                    props.surveyNode.answers.map((ans, uid) => <SurveyAnswer key={uid}
                                                                             question={props.surveyNode.question}
                                                                             id={ans.id}
                                                                             answer={ans.answer}
                                                                             color={ans.color}
                                                                             childNodes={childNodes}
                                                                             showQuestions={props.showQuestions}
                                                                             hideQuestions={props.hideQuestions}
                                                                             highlightAnswer={props.highlightAnswer}
                                                                             setCurrentValue={props.setCurrentValue}
                                                                             selectedAnswers={props.selectedAnswers}/>)
                }
            </ul>
            {
                childNodes.map((surveyNode, uid) => <SurveyQuestionTree key={uid}
                                                                        surveyNode={surveyNode}
                                                                        surveyQuestions={props.surveyQuestions}
                                                                        surveyAnswersVisible={props.surveyAnswersVisible}
                                                                        surveyQuestionsVisible={props.surveyQuestionsVisible}
                                                                        hideShowAnswers={props.hideShowAnswers}
                                                                        showQuestions={props.showQuestions}
                                                                        hideQuestions={props.hideQuestions}
                                                                        highlightAnswer={props.highlightAnswer}
                                                                        setCurrentValue={props.setCurrentValue}
                                                                        selectedAnswers={props.selectedAnswers}
                                                                        prevSurveyQuestionTree={props.prevSurveyQuestionTree}
                                                                        nextSurveyQuestionTree={props.nextSurveyQuestionTree}
                                                                        prevQuestionButtonDisabled={props.prevQuestionButtonDisabled}
                                                                        nextQuestionButtonDisabled={props.nextQuestionButtonDisabled}/>)
            }
        </fieldset>
    );
}

function SurveyAnswer(props) {
    const childNodes = props.childNodes.filter(surveyNode => surveyNode.parent_answer == props.id);
    return (
        <li className="mb-1">
            <button type="button"
                    className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                    id={props.answer + "_" + props.id}
                    name={props.answer + "_" + props.id}
                    style={{boxShadow: (props.selectedAnswers[props.question] == props.answer)
                        ? "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset"
                        : "initial"}}
                    onClick={() => {
                        if (props.setCurrentValue(props.question, props.id, props.answer, props.color)) {
                            props.hideQuestions(props.childNodes);
                            props.showQuestions(childNodes);
                            props.highlightAnswer(props.question, props.answer);
                        }
                    }}>
                <div className="circle"
                     style={{
                         backgroundColor: props.color,
                         border: "1px solid",
                         float: "left",
                         marginTop: "4px"
                     }}>
                </div>
                <span className="small">{props.answer}</span>
            </button>
        </li>
    );
}

class ProjectStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {}
        }
    }

    componentDidMount() {
        this.getProjectStats();
    }

    asPercentage(part, total) {
        return (part && total)
            ? (100.0 * part / total).toFixed(2)
            : "0.00";
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

    render() {
        const { stats } = this.state
        const numPlots = stats.flaggedPlots + stats.analyzedPlots + stats.unanalyzedPlots
        return (
            <Fragment>
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
                                            <td className="small">Plots Analyzed</td>
                                            <td className="small">
                                                {stats.analyzedPlots || ""}
                                                ({this.asPercentage(stats.analyzedPlots, numPlots)}%)
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="small">Plots Flagged</td>
                                            <td className="small">
                                                {stats.flaggedPlots || ""}
                                                ({this.asPercentage(stats.flaggedPlots, numPlots)}%)
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="small">Plots Completed</td>
                                            <td className="small">
                                                {stats.analyzedPlots + stats.flaggedPlots || ""}
                                                ({this.asPercentage(stats.analyzedPlots + stats.flaggedPlots, numPlots)}%)
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="small">Plots Total</td>
                                            <td className="small">
                                                {numPlots || ""}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </fieldset>
                    </div>
                </div>
            </Fragment>
        );
    }
}

function QuitMenu(props) {
    return (
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
                        <button type="button" className="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>
                        <button type="button" className="btn bg-lightgreen btn-sm" id="quit-button"
                                onClick={() => window.location = this.props.documentRoot + "/home"}>OK</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function renderCollectionPage(args) {
    ReactDOM.render(
        <Collection documentRoot={args.documentRoot} userName={args.userName} projectId={args.projectId}/>,
        document.getElementById("collection")
    );
}
