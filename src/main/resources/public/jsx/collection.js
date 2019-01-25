import React from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { utils } from "../js/utils.js";

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
            gotoFirstPlotButtonDisabled:true,
            prevPlotButtonDisabled: true,
            newPlotButtonDisabled: false,
            flagPlotButtonDisabled: false,
            saveValuesButtonDisabled: true,
            prevQuestionButtonDisabled: false,
            nextQuestionButtonDisabled: false,
            surveyAnswersVisible: {},
            surveyQuestionsVisible: {},
            currentPlot: null,
            userSamples: {},
            userImages: {},
            selectedAnswers: {},
            collectionStart: 0
        };
        this.setBaseMapSource = this.setBaseMapSource.bind(this);
        this.setImageryYearDG = this.setImageryYearDG.bind(this);
        this.setStackingProfileDG = this.setStackingProfileDG.bind(this);
        this.setImageryYearPlanet = this.setImageryYearPlanet.bind(this);
        this.setImageryMonthPlanet = this.setImageryMonthPlanet.bind(this);
        this.getPlotData = this.getPlotData.bind(this);
        this.goToFirstPlot = this.goToFirstPlot.bind(this);
        this.prevPlot = this.prevPlot.bind(this);
        this.nextPlot = this.nextPlot.bind(this);
        this.flagPlot = this.flagPlot.bind(this);
        this.saveValues = this.saveValues.bind(this);
        this.hideShowAnswers = this.hideShowAnswers.bind(this);
        this.showQuestions = this.showQuestions.bind(this);
        this.hideQuestions = this.hideQuestions.bind(this);
        this.highlightAnswer = this.highlightAnswer.bind(this);
        this.getImageryAttributes = this.getImageryAttributes.bind(this);
        this.setCurrentValue = this.setCurrentValue.bind(this);
        this.redirectToHomePage = this.redirectToHomePage.bind(this);
        this.prevSurveyQuestionTree=this.prevSurveyQuestionTree.bind(this);
        this.nextSurveyQuestionTree=this.nextSurveyQuestionTree.bind(this);
        this.callMethodsOnChange=this.callMethodsOnChange.bind(this);
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
        if (this.state.projectPlotsShown == true && this.state.gotoFirstPlotButtonDisabled == true) {
            this.setState({gotoFirstPlotButtonDisabled: false});
        }
        if (this.state.mapConfig && this.state.currentImagery == null) {
            this.updateMapImagery(this.state.currentProject.baseMapSource);
        }
        if (this.state.currentProject.sampleValues.length > 0 && Object.keys(this.state.surveyQuestionsVisible).length == 0) {
            const topLevelNodes = this.state.currentProject.sampleValues.filter(surveyNode => surveyNode.parent_question == -1);
            const firstNode = topLevelNodes.sort((a, b) => a - b)[0];
            this.hideQuestions(topLevelNodes);
            this.showQuestions([firstNode]);
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
                    parent_answer: -1,
                    data_type:"Text",
                    component_type:"Button"
                };
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
                                ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        this.setState({mapConfig: mapConfig});
    }

    showProjectPlots() {
        mercator.addPlotLayer(this.state.mapConfig,
                              this.state.plotList,
                              feature => {
                                  this.setState({
                                      navButtonsShown: 2,
                                      prevPlotButtonDisabled: false,
                                      newPlotButtonDisabled: false,
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
        mercator.updateLayerWmsParams(this.state.mapConfig,
                                      "DigitalGlobeWMSImagery",
                                      {
                                          COVERAGE_CQL_FILTER: "(acquisitionDate>='" + imageryYear + "-01-01')"
                                              + "AND(acquisitionDate<='" + imageryYear + "-12-31')",
                                          FEATUREPROFILE: stackingProfile
                                      });
    }

    updatePlanetLayer(imageryMonth, imageryYear) {
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
        fetch(this.props.documentRoot + "/get-unanalyzed-plot-by-id/" + this.props.projectId + "/" + plotId)
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
                    this.setState({
                        currentPlot: null,
                        userSamples: {},
                        userImages: {}
                    });
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        userSamples: {},
                        userImages: {},
                        collectionStart: Date.now(),
                        navButtonsShown: 2,
                        prevPlotButtonDisabled: false,
                        newPlotButtonDisabled: false,
                        flagPlotButtonDisabled: false,
                        saveValuesButtonDisabled: true
                    });
                    this.showProjectPlot(newPlot);
                    this.showGeoDash(newPlot);
                }
            });
    }

    getNextPlotData(plotId) {
        fetch(this.props.documentRoot + "/get-next-unanalyzed-plot/" + this.props.projectId + "/" + plotId)
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
                        this.setState({newPlotButtonDisabled: true});
                        alert("You have reached the end of the plot list.");
                    }
                } else {
                    const newPlot = JSON.parse(data);
                    if (plotId == -1) {
                        this.setState({
                            currentPlot: newPlot,
                            userSamples: {},
                            userImages: {},
                            collectionStart: Date.now(),
                            navButtonsShown: 2
                        });
                    } else {
                        this.setState({
                            currentPlot: newPlot,
                            userSamples: {},
                            userImages: {},
                            collectionStart: Date.now(),
                            prevPlotButtonDisabled: false,
                            saveValuesButtonDisabled: true
                        });
                    }
                    this.showProjectPlot(newPlot);
                    this.showGeoDash(newPlot);
                }
            });
    }

    getPrevPlotData(plotId) {
        fetch(this.props.documentRoot + "/get-prev-unanalyzed-plot/" + this.props.projectId + "/" + plotId)
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
                        userSamples: {},
                        userImages: {},
                        collectionStart: Date.now(),
                        newPlotButtonDisabled: false,
                        saveValuesButtonDisabled: true
                    });
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

    hideShowAnswers(surveyNodeId) {
        let surveyAnswersVisible = this.state.surveyAnswersVisible;
        if (surveyAnswersVisible[surveyNodeId]) {
            surveyAnswersVisible[surveyNodeId] = false;
        } else {
            surveyAnswersVisible[surveyNodeId] = true;
        }
        this.setState({surveyAnswersVisible: surveyAnswersVisible});
    }
    showQuestions(surveyNodes) {
        let surveyQuestionsVisible = this.state.surveyQuestionsVisible;
        surveyNodes.forEach(surveyNode => surveyQuestionsVisible[surveyNode.id] = true);
        this.setState({surveyQuestionsVisible: surveyQuestionsVisible});
    }

    hideQuestions(surveyNodes) {
        let surveyQuestionsVisible = this.state.surveyQuestionsVisible;
        surveyNodes.forEach(surveyNode => surveyQuestionsVisible[surveyNode.id] = false);
        this.setState({surveyQuestionsVisible: surveyQuestionsVisible});
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
            this.highlightSamplesByQuestion(userSamples, questionText);
            this.allowSaveIfSurveyComplete(userSamples);
            return true;
        } else {
            alert("No samples selected. Please click some first.");
            return false;
        }
    }

    highlightSamplesByQuestion(userSamples, questionText) {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples");
        allFeatures.forEach(feature => {
            const sampleId = feature.get("sampleId");
            const answerColor = (userSamples[sampleId] && userSamples[sampleId][questionText])
                ? userSamples[sampleId][questionText]["color"]
                : null;
            mercator.highlightSampleGeometry(feature, answerColor);
        });
    }
    allowSaveIfSurveyComplete(userSamples) {
        const assignedSamples = Object.keys(userSamples);
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
        window.location = this.props.documentRoot + "/home";
    }

    prevSurveyQuestionTree(surveyNodeId, surveyQuestions) {
        let surveyQuestionsVisible = this.state.surveyQuestionsVisible;
        let prevSurveyNode = surveyQuestions.sort((a, b) => b.id - a.id).find(node => node.id < surveyNodeId && node.parent_question == -1);
        if (prevSurveyNode) {
            surveyQuestionsVisible[surveyNodeId] = false;
            surveyQuestionsVisible[prevSurveyNode.id] = true;
            this.setState({surveyQuestionsVisible: surveyQuestionsVisible,
                           nextQuestionButtonDisabled: false});
        } else {
            this.setState({prevQuestionButtonDisabled: true});
            alert("There are no previous questions.");
        }
    }

    nextSurveyQuestionTree(surveyNodeId, surveyQuestions) {
        let surveyQuestionsVisible = this.state.surveyQuestionsVisible;
        let nextSurveyNode = surveyQuestions.sort((a, b) => a.id - b.id).find(node => node.id > surveyNodeId && node.parent_question == -1);
        if (nextSurveyNode) {
            surveyQuestionsVisible[surveyNodeId] = false;
            surveyQuestionsVisible[nextSurveyNode.id] = true;
            this.setState({surveyQuestionsVisible: surveyQuestionsVisible,
                           prevQuestionButtonDisabled: false});
        } else {
            this.setState({nextQuestionButtonDisabled: true});
            alert("There are no more questions.");
        }
    }

    callMethodsOnChange(e,question,childNodes){
        if (this.setCurrentValue(question, e.target.value, e.target.options[e.target.selectedIndex].text, e.target.options[e.target.selectedIndex].id)) {
           // this.hideQuestions(childNodes);
            const childNodes = childNodes.filter(surveyNode => surveyNode.parent_answer == e.target.value);
           // this.showQuestions(childNodes);

        }

    }

    render() {
        return (
            <React.Fragment>
                <ImageAnalysisPane imageryAttribution={this.state.imageryAttribution} projectPlotsShown={this.state.projectPlotsShown}/>
                <SideBar plotId={this.state.currentPlot?(this.state.currentPlot.plotId?this.state.currentPlot.plotId:this.state.currentPlot.id):""}
                         currentProject={this.state.currentProject}
                         navButtonsShown={this.state.navButtonsShown}
                         gotoFirstPlotButtonDisabled={this.state.gotoFirstPlotButtonDisabled}
                         prevPlotButtonDisabled={this.state.prevPlotButtonDisabled}
                         newPlotButtonDisabled={this.state.newPlotButtonDisabled}
                         flagPlotButtonDisabled={this.state.flagPlotButtonDisabled}
                         goToFirstPlot={this.goToFirstPlot}
                         prevPlot={this.prevPlot}
                         nextPlot={this.nextPlot}
                         flagPlot={this.flagPlot}
                         imageryList={this.state.imageryList}
                         setBaseMapSource={this.setBaseMapSource}
                         imageryYearDG={this.state.imageryYearDG}
                         stackingProfileDG={this.state.stackingProfileDG}
                         setImageryYearDG={this.setImageryYearDG}
                         setStackingProfileDG={this.setStackingProfileDG}
                         imageryYearPlanet={this.state.imageryYearPlanet}
                         imageryMonthPlanet={this.state.imageryMonthPlanet}
                         imageryMonthNamePlanet={this.state.imageryMonthNamePlanet}
                         setImageryYearPlanet={this.setImageryYearPlanet}
                         setImageryMonthPlanet={this.setImageryMonthPlanet}
                         stats={this.state.stats}
                         saveValues={this.saveValues}
                         saveValuesButtonDisabled={this.state.saveValuesButtonDisabled}
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
                         callMethodsOnChange={this.callMethodsOnChange}/>
                <QuitMenu redirectToHomePage={this.redirectToHomePage}/>
            </React.Fragment>
        );
    }
}

function ImageAnalysisPane(props) {
    return (
        <React.Fragment>
            <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
                <div id="imagery-info" className="row">
                    <p className="col small">{props.imageryAttribution}</p>
                </div>
            </div>
            <div id="spinner" style={{top: "45%", left: "38%", visibility: props.projectPlotsShown ? "hidden" : "visible"}}></div>
        </React.Fragment>
    );
}

function SideBar(props) {
    return (
        <div id="sidebar" className="col-xl-3" style={{overflow: "scroll"}}>
            <ProjectName projectName={props.currentProject.name}/>
            <PlotNavigation plotId={props.plotId}
                            navButtonsShown={props.navButtonsShown}
                            goToFirstPlot={props.goToFirstPlot}
                            prevPlot={props.prevPlot}
                            nextPlot={props.nextPlot}
                            flagPlot={props.flagPlot}
                            prevPlotButtonDisabled={props.prevPlotButtonDisabled}
                            newPlotButtonDisabled={props.newPlotButtonDisabled}
                            flagPlotButtonDisabled={props.flagPlotButtonDisabled}
                            gotoFirstPlotButtonDisabled={props.gotoFirstPlotButtonDisabled}/>
            <ImageryOptions baseMapSource={props.currentProject.baseMapSource}
                            setBaseMapSource={props.setBaseMapSource}
                            imageryList={props.imageryList}
                            imageryYearDG={props.imageryYearDG}
                            stackingProfileDG={props.stackingProfileDG}
                            setImageryYearDG={props.setImageryYearDG}
                            setStackingProfileDG={props.setStackingProfileDG}
                            imageryYearPlanet={props.imageryYearPlanet}
                            imageryMonthPlanet={props.imageryMonthPlanet}
                            imageryMonthNamePlanet={props.imageryMonthNamePlanet}
                            setImageryYearPlanet={props.setImageryYearPlanet}
                            setImageryMonthPlanet={props.setImageryMonthPlanet}/>
            <SurveyQuestions surveyQuestions={props.currentProject.sampleValues}
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
                             nextQuestionButtonDisabled={props.nextQuestionButtonDisabled}
                             callMethodsOnChange={props.callMethodsOnChange}/>
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
            <h3>{(props.plotId==""?"":"Current Plot ID: "+props.plotId)}</h3>

            <div className={props.navButtonsShown == 1 ? "row" : "row d-none"} id="go-to-first-plot">
                <div className="col">
                    <input id="go-to-first-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                           type="button" name="new-plot" value="Go to first plot" onClick={props.goToFirstPlot}
                           style={{opacity: props.gotoFirstPlotButtonDisabled ? "0.5" : "1.0"}}
                           disabled={props.gotoFirstPlotButtonDisabled}/>
                </div>
            </div>
            <div className={props.navButtonsShown == 2 ? "row" : "row d-none"} id="plot-nav" style={{display:"inline-flex"}}>
                <div className="pr-2">
                    <input id="prev-plot-button" className="btn btn-outline-lightgreen"
                           type="button" name="new-plot" value="Prev" onClick={props.prevPlot}
                           style={{opacity: props.prevPlotButtonDisabled ? "0.5" : "1.0"}}
                           disabled={props.prevPlotButtonDisabled}/>
                </div>
                <div className="pr-2">
                    <input id="new-plot-button" className="btn btn-outline-lightgreen"
                           type="button" name="new-plot" value="Next" onClick={props.nextPlot}
                           style={{opacity: props.newPlotButtonDisabled ? "0.5" : "1.0"}}
                           disabled={props.newPlotButtonDisabled}/>
                </div>
                <div className="pr-2">
                    <input id="flag-plot-button" className="btn btn-outline-lightgreen"
                           type="button" name="flag-plot" value="Flag" onClick={props.flagPlot}
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
                    size="1" value={props.baseMapSource || ""}
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
                               setImageryYearDG={props.setImageryYearDG}
                               setStackingProfileDG={props.setStackingProfileDG}/>
            <PlanetMenus baseMapSource={props.baseMapSource}
                         imageryYearPlanet={props.imageryYearPlanet}
                         imageryMonthPlanet={props.imageryMonthPlanet}
                         imageryMonthNamePlanet={props.imageryMonthNamePlanet}
                         setImageryYearPlanet={props.setImageryYearPlanet}
                         setImageryMonthPlanet={props.setImageryMonthPlanet}/>
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
            </React.Fragment>
        );
    } else {
        return "";
    }
}

class PlanetMenus extends React.Component {
    constructor(props) {
        super(props);
        this.state = {value: "2018"};
    }

    render() {
        if (this.props.baseMapSource == "PlanetGlobalMosaic") {
            return (
                <React.Fragment>
                    <div className="slidecontainer form-control form-control-sm">
                        <input type="range" min="2016" max="2018" value={this.props.imageryYearPlanet} className="slider" id="myRange"
                               onChange={this.props.setImageryYearPlanet}/>
                        <p>Year: <span id="demo">{this.props.imageryYearPlanet}</span></p>
                    </div>
                    <div className="slidecontainer form-control form-control-sm">
                        <input type="range" min="1" max="12" value={this.props.imageryMonthPlanet} className="slider" id="myRangemonth"
                               onChange={this.props.setImageryMonthPlanet}/>
                        <p>Month: <span id="demo">{this.props.imageryMonthNamePlanet}</span></p>
                    </div>
                </React.Fragment>
            );
        } else {
            return "";
        }
    }
}

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
                                                                           nextQuestionButtonDisabled={props.nextQuestionButtonDisabled}
                                                                           callMethodsOnChange={props.callMethodsOnChange}/>)
            }
        </fieldset>
    );
}

function SurveyQuestionTree(props) {
    const childNodes = props.surveyQuestions.filter(surveyNode => surveyNode.parent_question == props.surveyNode.id);
    const navButtons = props.surveyNode.parent_question == -1 ?
        <React.Fragment>
            <button id="prev-survey-question" className="btn btn-outline-lightgreen"  style={{margin:"10px"}}
                    onClick={() => props.prevSurveyQuestionTree(props.surveyNode.id, props.surveyQuestions)}
                    disabled={props.prevQuestionButtonDisabled}>Prev</button>
            <button id="next-survey-question" className="btn btn-outline-lightgreen"
                    onClick={() => props.nextSurveyQuestionTree(props.surveyNode.id, props.surveyQuestions)}
                    disabled={props.nextQuestionButtonDisabled}>Next</button>
        </React.Fragment>
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
                    <SurveyAnswer
                                  question={props.surveyNode.question}
                                  componentType={props.surveyNode.component_type}
                                  dataType={props.surveyNode.data_type}
                                 answers={props.surveyNode.answers}
                                  childNodes={childNodes}
                                  showQuestions={props.showQuestions}
                                  hideQuestions={props.hideQuestions}
                                  highlightAnswer={props.highlightAnswer}
                                  setCurrentValue={props.setCurrentValue}
                                  selectedAnswers={props.selectedAnswers}
                                  callMethodsOnChange={props.callMethodsOnChange}/>
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
                                                                        nextQuestionButtonDisabled={props.nextQuestionButtonDisabled}
                                                                        callMethodsOnChange={props.callMethodsOnChange}/>)
            }
        </fieldset>
    );
}
function AnswerButton(props){

    let li=props.answers.map((ans,uid)=> {
        const childNodes = props.childNodes.filter(surveyNode => surveyNode.parent_answer == ans.id);
       return <li key={uid} className="mb-1">
            <button type="button"
                    className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                    id={ans.answer + "_" + ans.id}
                    name={ans.answer + "_" + ans.id}
                    style={{
                        boxShadow: (props.selectedAnswers[props.question] == ans.answer)
                            ? "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset"
                            : "initial"
                    }}
                    onClick={() => {
                        if (props.setCurrentValue(props.question, ans.id, ans.answer, ans.color)) {
                            props.hideQuestions(props.childNodes);
                            props.showQuestions(childNodes);
                            props.highlightAnswer(props.question, ans.answer);
                        }
                    }}>
                <div className="circle"
                     style={{
                         backgroundColor: ans.color,
                         border: "1px solid",
                         float: "left",
                         marginTop: "4px"
                     }}>
                </div>
                <span className="small">{ans.answer}</span>
            </button>
        </li>
    });
    return (<React.Fragment>{li}</React.Fragment>);
}

function AnswerRadioButton(props) {
    let li = props.answers.map((ans,uid) => {
        const childNodes = props.childNodes.filter(surveyNode => surveyNode.parent_answer == ans.id);
        return <div key={uid} className="mb-1" style={{display: "inline-grid",paddingRight:"30px"}}>
                <div className="circle"
                     style={{
                         backgroundColor: ans.color,
                         border: "1px solid",
                         float: "left",
                         marginTop: "4px"
                     }}>
                </div>
                <span className="small">{ans.answer}</span>
                <input type="radio" name="radiogroup"
                       className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                       id={ans.answer + "_" + ans.id}
                       style={{
                           boxShadow: (props.selectedAnswers[props.question] == ans.answer)
                               ? "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset"
                               : "initial"
                       }}
                       onChange={() => {
                           if (props.setCurrentValue(props.question, ans.id, ans.answer, ans.color)) {
                               props.hideQuestions(props.childNodes);
                               props.showQuestions(childNodes);

                           }
                       }}/>


            </div>
    });
    return (<li className="mb-1" style={{display: "inline",paddingRight:"30px"}}>{li}</li>);
}

function AnswerInputNumber(props) {
    let li = props.answers.map((ans,uid) => {
        const childNodes = props.childNodes.filter(surveyNode => surveyNode.parent_answer == ans.id);
        return <li key={uid} className="mb-1" style={{display: "inline-flex"}}>
            <div className="circle"
                 style={{
                     backgroundColor: ans.color,
                     border: "1px solid",
                     float: "left",
                     marginTop: "4px",
                     marginRight: "5px"
                 }}>
            </div>
            <input type="number"
                   className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                   placeholder={ans.answer}
                   id={ans.answer + "_" + ans.id}
                   name={ans.answer + "_" + ans.id}
                   style={{
                       boxShadow: (props.selectedAnswers[props.question] == ans.answer)
                           ? "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset"
                           : "initial"
                   }}
                   onChange={() => {
                       if (props.setCurrentValue(props.question, ans.id, ans.answer, ans.color)) {
                           props.hideQuestions(props.childNodes);
                           props.showQuestions(childNodes);

                       }
                   }}/>
        </li>
    });
    return (<React.Fragment>{li}</React.Fragment>);
}

function AnswerInputText(props) {
    let li = props.answers.map((ans,uid) => {
        const childNodes = props.childNodes.filter(surveyNode => surveyNode.parent_answer == ans.id);
        return <li key={uid} className="mb-1" style={{display: "inline-flex"}}>
            <div className="circle"
                 style={{
                     backgroundColor: ans.color,
                     border: "1px solid",
                     float: "left",
                     marginTop: "4px",
                     marginRight: "5px"
                 }}>
            </div>
            <input type="text"
                   className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                   placeholder={ans.answer}
                   id={ans.answer + "_" + ans.id}
                   name={ans.answer + "_" + ans.id}
                   style={{
                       boxShadow: (props.selectedAnswers[props.question] == ans.answer)
                           ? "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset"
                           : "initial"
                   }}
                   onChange={() => {
                       if (props.setCurrentValue(props.question, ans.id, ans.answer, ans.color)) {
                           props.hideQuestions(props.childNodes);
                           props.showQuestions(childNodes);

                       }
                   }}/>
        </li>
    });
    return (<React.Fragment>{li}</React.Fragment>);
}
function AnswerDropDown(props) {
    let options = props.answers.map((ans,uid) => {
        return <option key={uid} value={ans.id} id={ans.color} style={{background:ans.color, color:(ans.color=="black" || ans.color=="#000000")?"white":"black"}}>{ans.answer}</option>
    });
    return (<React.Fragment> <option value="none">-Select-</option>{options}</React.Fragment>);
}

function SurveyAnswer(props) {
  if (props.componentType&&props.componentType.toLowerCase() == "radiobutton") {
        return (<AnswerRadioButton answers={props.answers} childNodes={props.childNodes}   question={props.question}
                              componentType={props.componentType}
                              dataType={props.dataType}
                              answers={props.answers}
                              showQuestions={props.showQuestions}
                              hideQuestions={props.hideQuestions}
                              highlightAnswer={props.highlightAnswer}
                              setCurrentValue={props.setCurrentValue}
                              selectedAnswers={props.selectedAnswers}
                              />);
    }
    else if (props.componentType&&props.componentType.toLowerCase() == "input" && props.dataType.toLowerCase() == "number") {
        return (<AnswerInputNumber answers={props.answers} childNodes={props.childNodes}   question={props.question}
                                   componentType={props.componentType}
                                   dataType={props.dataType}
                                   answers={props.answers}
                                   showQuestions={props.showQuestions}
                                   hideQuestions={props.hideQuestions}
                                   highlightAnswer={props.highlightAnswer}
                                   setCurrentValue={props.setCurrentValue}
                                   selectedAnswers={props.selectedAnswers}
                                   />);
    }
    else if (props.componentType&&props.componentType.toLowerCase() == "input" && props.dataType.toLowerCase() == "text") {
        return (<AnswerInputText answers={props.answers} childNodes={props.childNodes}   question={props.question}
                                   componentType={props.componentType}
                                   dataType={props.dataType}
                                   answers={props.answers}
                                   showQuestions={props.showQuestions}
                                   hideQuestions={props.hideQuestions}
                                   highlightAnswer={props.highlightAnswer}
                                   setCurrentValue={props.setCurrentValue}
                                   selectedAnswers={props.selectedAnswers}
                                   />);

    }
    else if (props.componentType&&props.componentType.toLowerCase() == "dropdown") {
        return (<li className="mb-1">
                <select id="dropd" className="btn-outline-darkgray btn-sm btn-block" onChange={(e) => {
                    props.callMethodsOnChange(e,props.question,props.childNodes)
                }}>
                    <AnswerDropDown answers={props.answers} childNodes={props.childNodes} question={props.question}
                                    componentType={props.componentType}
                                    dataType={props.dataType}
                                    answers={props.answers}
                                    showQuestions={props.showQuestions}
                                    hideQuestions={props.hideQuestions}
                                    highlightAnswer={props.highlightAnswer}
                                    setCurrentValue={props.setCurrentValue}
                                    selectedAnswers={props.selectedAnswers}
                                    />
                </select>
            </li>
        );
    }
    else
    {
        return (<AnswerButton answers={props.answers} childNodes={props.childNodes}   question={props.question}
                              componentType={props.componentType}
                              dataType={props.dataType}
                              answers={props.answers}
                              showQuestions={props.showQuestions}
                              hideQuestions={props.hideQuestions}
                              highlightAnswer={props.highlightAnswer}
                              setCurrentValue={props.setCurrentValue}
                              selectedAnswers={props.selectedAnswers}
                          />);
    }
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
                                onClick={props.redirectToHomePage}>OK</button>
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
