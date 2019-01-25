import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";

import {SurveyQuestions } from "./components/SurveyQuestions"
class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentProject: {sampleValues: [], institution: ""},
            plotList: [],
            imageryList: [],
            mapConfig: null,
            currentImagery: {id: ""},
            imageryAttribution: "",
            imageryYearDG: 2009,
            stackingProfileDG: "Accuracy_Profile",
            imageryYearPlanet: "2018",
            imageryMonthPlanet: "03",
            imageryMonthNamePlanet: "March",

            prevPlotButtonDisabled: false,
            nextPlotButtonDisabled: false,
            saveValuesButtonDisabled: true,
            currentPlot: null,
            userSamples: {},
            userImages: {},
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
        this.setSelectedQuestion = this.setSelectedQuestion.bind(this);
        this.setCurrentValue = this.setCurrentValue.bind(this);
    }

    componentDidMount() {
        this.getProjectById();
        this.getProjectPlots();
    }

    componentDidUpdate(prevProps, prevState) {
        // console.log('previous', prevState);
        // console.log('current', this.state);

        // Wait to get imagery list until project is loaded
        if (this.state.currentProject.institution !== prevState.currentProject.institution) {
            this.getImageryList();
        }
        // Initialize map when imagery list is returned
        if (this.state.imageryList.length > 0 && this.state.mapConfig == null) {
            this.initializeProjectMap();
        }
        // Load all project plots initially
        if (this.state.mapConfig && this.state.plotList.length > 0 
            && (this.state.mapConfig !== prevState.mapConfig 
                || prevState.plotList.length === 0)) 
            {
            this.showProjectPlots();
        }
        // initiallize current imagery to project default
        if (this.state.mapConfig && this.state.currentProject && this.state.imageryList.length > 0 && !this.state.currentImagery.id) {
            this.setBaseMapState(this.getImageryByTitle(this.state.currentProject.baseMapSource).id);
        }

        // Update map when state changes
        if (this.state.currentPlot && (this.state.currentPlot !== prevState.currentPlot)) {
            this.showProjectPlot();
            this.showGeoDash();
        }
        if (this.state.selectedQuestion !== prevState.selectedQuestion 
            || this.state.userSamples !== prevState.userSamples
            ) {
            this.highlightSamplesByQuestion();
        }
        if (this.state.mapConfig && this.state.currentImagery.id 
            && (this.state.currentImagery.id !== prevState.currentImagery.id 
                || this.state.mapConfig !== prevState.mapConfig)) 
            {
            this.updateMapImagery();
        }
        if (this.state.imageryYearDG !== prevState.imageryYearDG || this.state.stackingProfileDG !== prevState.stackingProfileDG) {
            this.updateDGWMSLayer();
        }
        if (this.state.imageryMonthPlanet !== prevState.imageryMonthPlanet || this.state.imageryYearPlanet !== prevState.imageryYearPlanet) {
            this.updatePlanetLayer();
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
                    const surveyQuestions = this.convertSampleValuesToSurveyQuestions(project.sampleValues || {});
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

    getImageryList() {
        const { institution } = this.state.currentProject
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

    initializeProjectMap() {

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
                                      prevPlotButtonDisabled: false,
                                  });
                                  this.getPlotData(feature.get("features")[0].get("plotId"));
                              });
    }

    setBaseMapSource(event) {
        console.log(event)
        const dropdown = event.target;
        console.log(dropdown)
        console.log(dropdown.value)
        const newBaseMapSource = dropdown.options[dropdown.selectedIndex].value;
        // let proj = this.state.currentProject;
        // proj.baseMapSource = newBaseMapSource;
        this.setBaseMapState(newBaseMapSource);
        
    }

    setBaseMapState(newBaseMapSource) {
        const newImagery = this.getImageryById(newBaseMapSource);
        
        const newImageryAttribution = newImagery.title == "DigitalGlobeWMSImagery" 
                        ? newImagery.attribution + " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")"
                        : newImagery.title == "PlanetGlobalMosaic" 
                            ? newImagery.attribution + " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet
                            :  newImagery.attribution
            // currentProject: proj,
        this.setState({
                        currentImagery: newImagery,
                        imageryAttribution: newImageryAttribution
                    });
    }
    
    setImageryYearDG(event) {
        const slider = event.target;
        const newImageryYearDG = slider.value;
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + newImageryYearDG + " (" + this.state.stackingProfileDG + ")";
        this.setState({
            imageryYearDG: newImageryYearDG,
            imageryAttribution: newImageryAttribution
        });
    }

    setStackingProfileDG(event) {
        const dropdown = event.target;
        const newStackingProfileDG = dropdown.options[dropdown.selectedIndex].value;
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + this.state.imageryYearDG + " (" + newStackingProfileDG + ")";
        this.setState({
            stackingProfileDG: newStackingProfileDG,
            imageryAttribution: newImageryAttribution
        });
    }

    setImageryYearPlanet(event) {
        const slider = event.target;
        const newImageryYearPlanet = slider.value;
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + newImageryYearPlanet + "-" + this.state.imageryMonthPlanet;
        this.setState({
            imageryYearPlanet: newImageryYearPlanet,
            imageryAttribution: newImageryAttribution
        });
    }

    setImageryMonthPlanet(event) {
        const slider = event.target;
        const newImageryMonth =  slider.value;
        const monthData = { 1: "January", 
                            2: "February", 
                            3: "March", 
                            4: "April", 
                            5: "May", 
                            6: "June", 
                            7: "July", 
                            8: "August", 
                            9:  "September", 
                            10: "October", 
                            11: "November", 
                            12: "December"
                           }
        const newImageryMonthPlanet = monthData[parseInt(newImageryMonth)];
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + this.state.imageryYearPlanet + "-" + newImageryMonthPlanet;
        
        this.setState({
            imageryMonthPlanet: newImageryMonth,
            imageryMonthNamePlanet: newImageryMonthPlanet,
            imageryAttribution: newImageryAttribution
        });
    }

    updateMapImagery() {
        console.log("update imagery")
        // FIXME, update mercator to take ID instead of name in cases of duplicate names
        mercator.setVisibleLayer(this.state.mapConfig, this.state.currentImagery.title);

        if (this.state.currentImagery.title == "DigitalGlobeWMSImagery") {
            this.updateDGWMSLayer();
        } else if (this.state.currentImagery.title == "PlanetGlobalMosaic") {
            this.updatePlanetLayer();
        }
    }

    getImageryByTitle(imageryTitle) {
        return this.state.imageryList.find(imagery => imagery.title == imageryTitle);
    }

    getImageryById(imageryId) {
        return this.state.imageryList.find(imagery => imagery.id == imageryId);
    }

    updateDGWMSLayer() {
        const { imageryYearDG, stackingProfileDG } = this.state;
        mercator.updateLayerWmsParams(this.state.mapConfig,
                                      "DigitalGlobeWMSImagery",
                                      {
                                          COVERAGE_CQL_FILTER: "(acquisitionDate>='" + imageryYearDG + "-01-01')"
                                              + "AND(acquisitionDate<='" + imageryYearDG + "-12-31')",
                                          FEATUREPROFILE: stackingProfileDG
                                      });
    }

    updatePlanetLayer() {
        const { imageryMonthPlanet, imageryYearPlanet} = this.state
        mercator.updateLayerSource(this.state.mapConfig,
                                   "PlanetGlobalMosaic",
                                   sourceConfig => {
                                       sourceConfig.month = imageryMonthPlanet < 10 ? "0" + imageryMonthPlanet : imageryMonthPlanet;
                                       sourceConfig.year = imageryYearPlanet;
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
                        ...this.resetPlotValues(newPlot),
                        prevPlotButtonDisabled: false,
                        nextPlotButtonDisabled: false,
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
                        window.location = this.props.documentRoot + "/home";
                    } else {
                        this.setState({nextPlotButtonDisabled: true});
                        alert("You have reached the end of the plot list.");
                    }
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.resetPlotValues(newPlot),
                        prevPlotButtonDisabled: plotId == -1,
                        saveValuesButtonDisabled: true
                    });
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
                        ...this.resetPlotValues(newPlot),
                        nextPlotButtonDisabled: false,
                        saveValuesButtonDisabled: true
                    });
                }
            });
    }

    resetPlotValues(newPlot) {
        return { 
            newPlotInput: newPlot.plotId ? newPlot.plotId : newPlot.id,
            userSamples: newPlot.samples ? this.samplesToValues(newPlot.samples) : {},
            userImages: newPlot.samples ? this.samplesToImages(newPlot.samples) : {},
            selectedQuestion: this.state.currentProject.sampleValues.sort((a, b) => b.id - a.id).filter(surveyNode => surveyNode.parent_question == -1)[0].question || "",
            collectionStart: Date.now() 
        }
    }

    samplesToValues(samples) {
        return samples.reduce((obj, s) => {
            var newObj = obj
            newObj[s.id] = s.value || {}
            return newObj;
            }
        , {})   
    }

    samplesToImages(samples) {
        return samples.reduce((obj, s) => {
            var newObj = obj
            newObj[s.id] = s.userImage || {}
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

    showProjectPlot() {
        console.log("project plot")
        const { currentPlot, mapConfig, currentProject } = this.state
        mercator.disableSelection(mapConfig);
        mercator.removeLayerByTitle(mapConfig, "currentPlots");
        mercator.removeLayerByTitle(mapConfig, "currentPlot");
        mercator.removeLayerByTitle(mapConfig, "currentSamples");
        mercator.addVectorLayer(mapConfig,
                                "currentPlot",
                                mercator.geometryToVectorSource(
                                    currentPlot.geom
                                        ? mercator.parseGeoJson(currentPlot.geom, true)
                                        : mercator.getPlotPolygon(currentPlot.center,
                                                                  currentProject.plotSize,
                                                                  currentProject.plotShape)
                                ),
                                ceoMapStyles.yellowPolygon);
        mercator.addVectorLayer(mapConfig,
                                "currentSamples",
                                mercator.samplesToVectorSource(currentPlot.samples),
                                currentPlot.samples[0].geom
                                    ? ceoMapStyles.blackPolygon
                                    : ceoMapStyles.blackCircle);
        mercator.enableSelection(mapConfig, "currentSamples");
        mercator.zoomMapToLayer(mapConfig, "currentPlot");
    }

    showGeoDash() {
        const { currentPlot, mapConfig, currentProject } = this.state
        const plotRadius = currentProject.plotSize
                           ? currentProject.plotSize / 2.0
                           : mercator.getViewRadius(mapConfig);
        window.open(this.props.documentRoot + "/geo-dash?"
                    + "&pid=" + this.props.projectId
                    + "&plotid=" + currentPlot.id
                    + "&plotshape=" + encodeURIComponent((currentPlot.geom ? "polygon" : currentProject.plotShape))
                    + "&aoi=" + encodeURIComponent("[" + mercator.getViewExtent(mapConfig) + "]")
                    + "&daterange=&bcenter=" + currentPlot.center
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
            newPlotInput: value
        })
    }

    setReviewPlots() {
        this.setState({
            reviewPlots: !this.state.reviewPlots,
            prevPlotButtonDisabled: false,
            nextPlotButtonDisabled: false
        })
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
                      confidence: -1,
                      collectionStart: this.state.collectionStart,
                      userSamples: this.state.userSamples,
                      userImages: this.state.userImages
                  })
              })
            .then(response => {
                if (response.ok) {
                    this.nextPlot();
                } else {
                    console.log(response);
                    alert("Error saving your assignments to the database. See console for details.");
                }
            });
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
            // JSON.parse is a fast way to do a deep copy
            let userSamples = JSON.parse(JSON.stringify(this.state.userSamples));
            let userImages = JSON.parse(JSON.stringify(this.state.userImages));
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
            this.setState({
                        userSamples: userSamples,
                        userImages: userImages,
                        selectedQuestion: questionText
                    });
            this.allowSaveIfSurveyComplete(userSamples);
            return true;
        } else {
            alert("No samples selected. Please click some first.");
            return false;
        }
    }

    setSelectedQuestion(newSelectedQuestion) {
        this.setState({selectedQuestion: newSelectedQuestion})
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
            && assignedSamples.every(sampleId => this.surveyQuestionTreeComplete(this.state.userSamples[sampleId], -1))) {
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

    render() {
        const plotId = this.state.currentPlot && (this.state.currentPlot.plotId ? this.state.currentPlot.plotId : this.state.currentPlot.id);
        return (
            <Fragment>
                <ImageAttributionBar imageryAttribution={this.state.imageryAttribution}/>
                <SideBar 
                    projectId={this.props.projectId}
                    plotId={plotId}
                    documentRoot={this.props.documentRoot}
                    saveValues={this.saveValues}
                    saveValuesButtonDisabled={this.state.saveValuesButtonDisabled}
                    projectName={this.state.currentProject.name}
                >
                    {this.state.plotList.length > 0
                        ?
                            <PlotNavigation 
                                plotId={plotId}
                                navButtonsShown={this.state.currentPlot != null}
                                newPlotInput={this.state.newPlotInput}
                                nextPlotButtonDisabled={this.state.nextPlotButtonDisabled}
                                prevPlotButtonDisabled={this.state.prevPlotButtonDisabled}
                                reviewPlots={this.state.reviewPlots}
                                flagPlot={this.flagPlot}
                                goToFirstPlot={this.goToFirstPlot}
                                goToPlot={this.goToPlot}
                                nextPlot={this.nextPlot}
                                prevPlot={this.prevPlot}
                                setReviewPlots={this.setReviewPlots}
                                updateNewPlotId={this.updateNewPlotId}
                            />
                        :
                        <h3>Loading project data...</h3>
                    }
                    {this.state.imageryList.length > 0
                        ?
                            <ImageryOptions 
                                baseMapSource={this.state.currentImagery.id}
                                imageryTitle={this.state.currentImagery.title}
                                imageryList={this.state.imageryList}
                                setBaseMapSource={this.setBaseMapSource}
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
                        :
                            <h3>Loading imagery data...</h3>
                    }
                    {this.state.currentPlot && 
                        <SurveyQuestions 
                            selectedQuestion={this.state.selectedQuestion}
                            surveyQuestions={this.state.currentProject.sampleValues}
                            setCurrentValue={this.setCurrentValue}
                            setSelectedQuestion={this.setSelectedQuestion}
                        />
                    }
                </SideBar>
                <QuitMenu documentRoot={this.props.documentRoot}/>
                {this.state.plotList.length === 0 && 
                    <div id="spinner" style={{top: "45%", left: "38%"}}></div>
                }
            </Fragment>
        );
    }
}

function ImageAttributionBar(props) {
    return (
        <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
            <div id="imagery-info" className="row">
                <p className="col small">{props.imageryAttribution}</p>
            </div>
        </div>
    );
}

function SideBar(props) {
    // style={{overflow: "scroll"}}
    return (
        <div id="sidebar" className="col-xl-3 border-left overflow-auto" >
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
                        style={{opacity: props.saveValuesButtonDisabled ? "0.25" : "1.0"}}
                        disabled={props.saveValuesButtonDisabled}
                    />
                    <ProjectStatsGroup 
                        documentRoot={props.documentRoot}
                        projectId={props.projectId}
                        plotId={props.plotId}
                    />
                    <button 
                        id="collection-quit-button" 
                        className="btn btn-outline-danger btn-block btn-sm mb-4"
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

            {!props.navButtonsShown 
            ?
                <div className="row" id="go-to-first-plot">
                    <div className="col">
                        <input 
                            id="go-to-first-plot-button" 
                            className="btn btn-outline-lightgreen btn-sm btn-block"
                            type="button" 
                            name="new-plot" 
                            value="Go to first plot" 
                            onClick={props.goToFirstPlot}
                        />
                    </div>
                </div>
            :
                <div className="row justify-content-center py-2" id="plot-nav">
                    <div className="px-1">
                        <input 
                            id="prev-plot-button" 
                            className="btn btn-outline-lightgreen"
                            type="button" 
                            name="new-plot" 
                            value="Prev" 
                            onClick={props.prevPlot}
                            style={{opacity: props.prevPlotButtonDisabled ? "0.25" : "1.0"}}
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
                            style={{opacity: props.nextPlotButtonDisabled ? "0.25" : "1.0"}}
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
                size="1" 
                value={props.baseMapSource || ""}
                onChange={props.setBaseMapSource}
            >
                {
                    props.imageryList.map(
                        (imagery, uid) =>
                            <option key={uid} value={imagery.id}>{imagery.title}</option>
                    )
                }
            </select>
            {props.imageryTitle === "DigitalGlobeWMSImagery" &&
                <DigitalGlobeMenus 
                    imageryYearDG={props.imageryYearDG}
                    stackingProfileDG={props.stackingProfileDG}
                    setImageryYearDG={props.setImageryYearDG}
                    setStackingProfileDG={props.setStackingProfileDG}
                />
            }
            {props.imageryTitle === "PlanetGlobalMosaic" && 
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
        <div className="DG-Menu my-2">
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
        </div>
    );
}

function PlanetMenus(props) {
    return (
        <div className="PlanetsMenu my-2">
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
        </div>
    );
}

class ProjectStatsGroup extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showStats: false
        }
        this.updateShown = this.updateShown.bind(this);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.plotId !== this.props.plotId) {
            this.setState({ showStats: false })
        }
    }

    updateShown() {
        this.setState({showStats: !this.state.showStats})
    }

    render() {
        return (
            <div className="ProjectStatsGroup">
                <button 
                    className="btn btn-outline-lightgreen btn-sm btn-block my-2" 
                    onClick={this.updateShown}
                >
                    Project Stats
                </button>
                {this.state.showStats && 
                    <ProjectStats 
                        documentRoot={this.props.documentRoot}
                        projectId={this.props.projectId} 
                    />
                }
            </div>

        );
    }
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
            <div className="row justify-content-center mb-1 text-center">
                <div className="col-lg-12">
                    <fieldset id="projStats" className="text-center projNoStats">
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
                    </fieldset>
                </div>
            </div>
        );
    }
}

// remains hidden, shows a styled menu when the quit button is clicked
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
                        <button 
                            type="button" 
                            className="btn bg-lightgreen btn-sm" 
                            id="quit-button"
                            onClick={() => window.location = props.documentRoot + "/home"}
                        >
                            OK
                        </button>
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
