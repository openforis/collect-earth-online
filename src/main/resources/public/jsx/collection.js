import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";

import { SurveyQuestions } from "./components/SurveyQuestions"

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
            saveValuesButtonEnabled: false,
            currentPlot: null,
            userSamples: {},
            userImages: {},
            collectionStart: 0,
            reviewPlots: false,
            selectedQuestionText: "",
            sampleOutlineBlack: true
        };
    }

    componentDidMount() {
        this.getProjectById();
        this.getProjectPlots();
    }

    componentDidUpdate(prevProps, prevState) {
        //
        // Initialize after apis return.  This could also be done with Promise.all
        //

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
            this.setBaseMapSource(this.getImageryByTitle(this.state.currentProject.baseMapSource).id);
        }

        //
        // Update map when state changes
        //

        // Update all when plot changes
        if (this.state.currentPlot && (this.state.currentPlot !== prevState.currentPlot)) {
            this.showProjectPlot();
            this.showGeoDash();
            this.showPlotSamples();
            this.highlightSamplesByQuestion();
        }

        // Selective sample updates when not a new plot
        if (this.state.currentPlot && this.state.currentPlot === prevState.currentPlot) {
            // Changing questions shows different set of samples
            if (this.state.selectedQuestionText !== prevState.selectedQuestionText 
                        || this.state.sampleOutlineBlack !== prevState.sampleOutlineBlack
                        || this.state.userSamples !== prevState.userSamples) {
                this.showPlotSamples();
                this.highlightSamplesByQuestion();
            }
        }

        if (this.state.currentProject.sampleValues.length > 0 && this.state.userSamples !== prevState.userSamples) {
            this.updateQuestionStatus();
        }

        //  Update map image stuff
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

    getProjectById = () => {
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
                } else {
                    const surveyQuestions = this.convertSampleValuesToSurveyQuestions(project.sampleValues || {});
                    this.setState({currentProject: { ...project, sampleValues: surveyQuestions }});
                }
            });
    }

    getProjectPlots = () => {
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

    getImageryList = () => {
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

    initializeProjectMap = () => {
        const mapConfig = mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, this.state.imageryList);
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary, true)),
                                ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        this.setState({mapConfig: mapConfig});
    }

    showProjectPlots = () => {
        mercator.addPlotLayer(this.state.mapConfig,
                              this.state.plotList,
                              feature => {
                                  this.setState({
                                      prevPlotButtonDisabled: false,
                                  });
                                  this.getPlotData(feature.get("features")[0].get("plotId"));
                              });
    }

    setBaseMapSource = (newBaseMapSource) => {
        const newImagery = this.getImageryById(newBaseMapSource);
        
        const newImageryAttribution = newImagery.title == "DigitalGlobeWMSImagery" 
                        ? newImagery.attribution + " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")"
                        : newImagery.title == "PlanetGlobalMosaic" 
                            ? newImagery.attribution + " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet
                            :  newImagery.attribution;
        this.setState({
                        currentImagery: newImagery,
                        imageryAttribution: newImageryAttribution
                    });
    }
    
    setImageryYearDG = (evenewImageryYearDGnt) => {
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + newImageryYearDG + " (" + this.state.stackingProfileDG + ")";
        this.setState({
            imageryYearDG: newImageryYearDG,
            imageryAttribution: newImageryAttribution
        });
    }

    setStackingProfileDG = (newStackingProfileDG) => {
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + this.state.imageryYearDG + " (" + newStackingProfileDG + ")";
        this.setState({
            stackingProfileDG: newStackingProfileDG,
            imageryAttribution: newImageryAttribution
        });
    }

    setImageryYearPlanet = (newImageryYearPlanet) => {
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + newImageryYearPlanet + "-" + this.state.imageryMonthPlanet;
        this.setState({
            imageryYearPlanet: newImageryYearPlanet,
            imageryAttribution: newImageryAttribution
        });
    }

    setImageryMonthPlanet = (newImageryMonth) => {
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
                           };
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
        const userParam = this.state.reviewPlots ? "?userName=" + this.props.userName : "";
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
                    alert(this.state.reviewPlots 
                        ? "This plot was analyzed by someone else."
                        : "This plot has already been analyzed.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.resetPlotValues(newPlot),
                        prevPlotButtonDisabled: false,
                        nextPlotButtonDisabled: false
                    });
                }
            });
    }

    getNextPlotData(plotId) {
        const userParam = this.state.reviewPlots ? "?userName=" + this.props.userName : "";
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
                        alert(this.state.reviewPlots 
                                ? "You have not reviewd any plots" 
                                : "All plots have been analyzed for this project.");
                    } else {
                        this.setState({nextPlotButtonDisabled: true});
                        alert("You have reached the end of the plot list.");
                    }
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.resetPlotValues(newPlot),
                        prevPlotButtonDisabled: plotId == -1
                    });
                }
            });
    }

    getPrevPlotData(plotId) {
        const userParam = this.state.reviewPlots ? "?userName=" + this.props.userName : "";
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
                    alert(this.state.reviewPlots 
                            ? "No previous plots were analyzed by you."
                            : "All previous plots have been analyzed.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.resetPlotValues(newPlot),
                        nextPlotButtonDisabled: false
                    });
                }
            });
    }

    resetPlotValues(newPlot) {
        return { 
            newPlotInput: newPlot.plotId ? newPlot.plotId : newPlot.id,
            userSamples: newPlot.samples 
                ? newPlot.samples.reduce((obj, s) => {
                    obj[s.id] = s.value || {}
                    return obj;
                    }, {})  
                : {},
            userImages: newPlot.samples 
                ? newPlot.samples.reduce((obj, s) => {
                    obj[s.id] = s.userImage || {}
                    return obj;
                    }, {}) 
                : {},
            selectedQuestionText: this.state.currentProject.sampleValues.sort((a, b) => b.id - a.id).find(surveyNode => surveyNode.parent_question == -1).question || "",
            collectionStart: Date.now(),
            sampleOutlineBlack: true
        };
    }

    // FIXME, used in project review, move to common functions file
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
        const { currentPlot, mapConfig, currentProject } = this.state;

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

        mercator.zoomMapToLayer(mapConfig, "currentPlot");
    }

    showPlotSamples() {
        const { mapConfig, selectedQuestionText, currentProject : { sampleValues} } = this.state;
        const shownSamples = this.getVisibleSamples(sampleValues.find(sv => sv.question === selectedQuestionText).id);
        mercator.disableSelection(mapConfig);
        mercator.removeLayerByTitle(mapConfig, "currentSamples");
        mercator.addVectorLayer(mapConfig,
            "currentSamples",
            mercator.samplesToVectorSource(shownSamples),
            this.state.sampleOutlineBlack 
            ? shownSamples[0].geom
                ? ceoMapStyles.blackPolygon
                : ceoMapStyles.blackCircle
            : shownSamples[0].geom
                ? ceoMapStyles.whitePolygon
                : ceoMapStyles.whiteCircle);
        mercator.enableSelection(mapConfig, "currentSamples");
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

    goToFirstPlot = () => this.getNextPlotData(-1);

    prevPlot = () =>  this.getPrevPlotData(this.state.currentPlot.plotId 
                            ? parseInt(this.state.currentPlot.plotId) 
                            : this.state.currentPlot.id);

    nextPlot = () => this.getNextPlotData(this.state.currentPlot.plotId 
                        ? parseInt(this.state.currentPlot.plotId) 
                        : this.state.currentPlot.id);

    goToPlot = (newPlot) => {
        if (!isNaN(newPlot)) {
            this.getPlotData(newPlot);
        } else {
            alert("Please enter a number to go to plot.");
        }
    }

    setReviewPlots = () => this.setState({ reviewPlots: !this.state.reviewPlots, 
                                            prevPlotButtonDisabled: false,
                                            nextPlotButtonDisabled: false});
    
    flagPlotInDB = () => {
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

    postValuesToDB = () => {
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

    getImageryAttributes() {
        if (this.state.currentImagery.title == "DigitalGlobeWMSImagery") {
            return {imageryYearDG: this.state.imageryYearDG, stackingProfileDG: this.state.stackingProfileDG};
        } else if (this.state.currentImagery.title == "PlanetGlobalMosaic") {
            return {imageryMonthPlanet: this.state.imageryMonthPlanet, imageryYearPlanet: this.state.imageryYearPlanet};
        } else {
            return {};
        }
    }

    validateCurrentSelection(selectedFeatures, questionText) {
        const visibleSamples = this.getVisibleSamples(
                                    this.state.currentProject.sampleValues
                                    .find(sv => sv.question === questionText).id);

        return selectedFeatures.getArray()
            .map(sf => sf.get("sampleId"))
            .every(sid => visibleSamples.some(vs => vs.id === sid));
    }

    getChildQuestions(currentQuestionText) {
        const { sampleValues } = this.state.currentProject;
        const { question, id } = sampleValues.find(sv => sv.question === currentQuestionText);
        const childQuestions = sampleValues.filter(sv => sv.parent_question === id);

        if (childQuestions.length === 0) {
            return [question];
        } else {
            return childQuestions.reduce((prev, cur) => {
                return [...prev, ...this.getChildQuestions(cur.question)];
            }, [question])
        }
    }

    setCurrentValue = (questionText, answerId, answerText, answerColor) => {
        const selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig);
        
        if (Object.keys(this.state.userSamples).length === 1 
            || (selectedFeatures && selectedFeatures.getArray().length 
                    && this.validateCurrentSelection(selectedFeatures, questionText))) {
                
            const sampleIds = Object.keys(this.state.userSamples).length === 1  
                                ? [Object.keys(this.state.userSamples)[0]]
                                : selectedFeatures.getArray().map(sf => sf.get("sampleId"))

            const newSamples = sampleIds.reduce((prev, sampleId) => {
                const newQuestion = { answer: answerText, color: answerColor};
                const clearedSubQuestions = this.getChildQuestions(questionText)
                                            .reduce((prev, question) => {
                                                const { [question]: value, ...rest} = prev
                                                return {...rest};
                                            }, {...this.state.userSamples[sampleId]});
                                            
                return {...prev, [sampleId]: {...clearedSubQuestions,
                                        [questionText]: newQuestion}};
            }, {}); 
            
            const newUserImages = sampleIds.reduce((prev, sampleId) => {
                return {...prev, [sampleId]: 
                                    { id: this.state.currentImagery.id,
                                    attributes: this.getImageryAttributes() }
                        }
            }, {});

            const questionId = this.state.currentProject.sampleValues.find(sv => sv.question === questionText).id;
            const subQuestion = this.state.currentProject.sampleValues
                    .find(sv => sv.parent_question === questionId && sv.parent_answer === answerId);

            this.setState({
                        userSamples: {...this.state.userSamples, ...newSamples},
                        userImages: {...this.state.userImages, ...newUserImages},
                        selectedQuestionText: (subQuestion && this.state.userSamples.length === 1) 
                                                    ? subQuestion.question 
                                                    : questionText
                    });
            return true;
        } else if(selectedFeatures && selectedFeatures.getLength() == 0 ) {
            alert("No samples selected. Please click some first.");
            return false;
        } else {
            alert("Invalid Selection. Try selecting the question before answering.");
            return false;
        }
    }

    setSelectedQuestionText = (newselectedQuestionText) => this.setState({selectedQuestionText: newselectedQuestionText});

    invertColor(hex) {
        const dehashed = hex.indexOf("#") === 0 ? hex.slice(1) : hex;
        const hexFormatted = dehashed.length === 3 
                            ? dehashed[0] + dehashed[0] + dehashed[1] + dehashed[1] + dehashed[2] + dehashed[2] 
                            : dehashed;

        // invert color components
        const r = (255 - parseInt(hexFormatted.slice(0, 2), 16)).toString(16);
        const g = (255 - parseInt(hexFormatted.slice(2, 4), 16)).toString(16);
        const b = (255 - parseInt(hexFormatted.slice(4, 6), 16)).toString(16);
        // pad each with zeros and return
        return "#" + this.padZero(r) + this.padZero(g) + this.padZero(b);
    }

    padZero(str) {
        const zeros = new Array(2).join("0");
        return (zeros + str).slice(-2);
    }

    highlightSamplesByQuestion() {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];
        allFeatures.filter(feature => {
            const sampleId = feature.get("sampleId");
            return this.state.userSamples[sampleId] && this.state.userSamples[sampleId][this.state.selectedQuestionText];
        } ).forEach(feature => {
            const sampleId = feature.get("sampleId");

            const answeredQuestion = this.state.currentProject.sampleValues
                             .find(sv => sv.question === this.state.selectedQuestionText);
            const userAnswer = this.state.userSamples[sampleId][this.state.selectedQuestionText].answer;
            const matchingAnswer = answeredQuestion.answers.find(ans => ans.answer === userAnswer);
            
            const color = answeredQuestion.componentType === "input"
                            ? userAnswer.length > 0 
                                ? answeredQuestion.answers[0].color
                                : this.invertColor(answeredQuestion.answers[0].color)
                            : matchingAnswer
                                ? matchingAnswer.color
                                : ""

            mercator.highlightSampleGeometry(feature, color);
        });
    }

    toggleSampleBW = () => this.setState({ sampleOutlineBlack: !this.state.sampleOutlineBlack });
    
    getVisibleSamples(currentQuestionId) {
        const { currentProject : { sampleValues}, userSamples } = this.state;
        const {parent_question, parent_answer} = sampleValues.find(sv => sv.id === currentQuestionId);
        const parentQuestionText = parent_question === -1 
                ? "" 
                : sampleValues.find(sv => sv.id === parent_question).question;
        
        if (parent_question === -1) {
            return this.state.currentPlot.samples;
        }
        else {
            const correctAnswerText = sampleValues
                                    .find(sv => sv.id === parent_question).answers
                                    .find(ans => parent_answer === -1 || ans.id === parent_answer).answer;

            return this.getVisibleSamples(parent_question)
                    .filter(sample => {
                        const sampleAnswer = userSamples[sample.id][parentQuestionText] 
                                             && userSamples[sample.id][parentQuestionText].answer;
                        return (parent_answer === -1 && sampleAnswer) || correctAnswerText === sampleAnswer;
                    });
        }
    }

    getAnsweredSamples(currentQuestionId) {
        const { currentProject : { sampleValues}, userSamples } = this.state;
        const { parent_question, parent_answer, question } = sampleValues.find(sv => sv.id === currentQuestionId);
        const parentQuestionText = parent_question === -1 ? "" : sampleValues.find(sv => sv.id === parent_question).question;
        
        if (parent_question === -1) {
            return this.state.currentPlot.samples.filter(s => userSamples[s.id][question]);
        } else {
            const correctAnswerText = sampleValues
                                    .find(sv => sv.id === parent_question).answers
                                    .find(ans => parent_answer === -1 || ans.id === parent_answer).answer;

            return this.getVisibleSamples(parent_question)
                    .filter(sample => {
                        const sampleAnswer = userSamples[sample.id][parentQuestionText] 
                                                && userSamples[sample.id][parentQuestionText].answer;
                        return (parent_answer === -1 && sampleAnswer) || correctAnswerText === sampleAnswer;
                    })
                    .filter(s => userSamples[s.id][question]);
        }
    }

    updateQuestionStatus() {
        const { currentProject: { sampleValues }} = this.state;

        const newSampleValues = sampleValues.map(value => ({
                                    ...value,
                                    visible: this.getVisibleSamples(value.id).length,
                                    answered: this.getAnsweredSamples(value.id).length
                                }));

        this.setState({currentProject: {...this.state.currentProject, sampleValues: newSampleValues}});
    }

    render() {
        const plotId = this.state.currentPlot 
                        && (this.state.currentPlot.plotId ? this.state.currentPlot.plotId : this.state.currentPlot.id);
        return (
            <Fragment>
                <ImageAnalysisPane imageryAttribution={this.state.imageryAttribution}/>
                <SideBar 
                    projectId={this.props.projectId}
                    plotId={plotId}
                    documentRoot={this.props.documentRoot}
                    userName={this.props.userName}
                    postValuesToDB={this.postValuesToDB}
                    surveyQuestions={this.state.currentProject.sampleValues}
                    projectName={this.state.currentProject.name}
                >
                    {this.state.plotList.length > 0
                        ?
                            <PlotNavigation 
                                plotId={plotId}
                                navButtonsShown={this.state.currentPlot != null}
                                nextPlotButtonDisabled={this.state.nextPlotButtonDisabled}
                                prevPlotButtonDisabled={this.state.prevPlotButtonDisabled}
                                sampleOutlineBlack={this.state.sampleOutlineBlack}
                                reviewPlots={this.state.reviewPlots}
                                flagPlotInDB={this.flagPlotInDB}
                                goToFirstPlot={this.goToFirstPlot}
                                goToPlot={this.goToPlot}
                                nextPlot={this.nextPlot}
                                prevPlot={this.prevPlot}
                                setReviewPlots={this.setReviewPlots}
                                toggleSampleBW={this.toggleSampleBW}
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
                    {this.state.currentPlot 
                    ? 
                        <SurveyQuestions 
                            selectedQuestionText={this.state.selectedQuestionText}
                            surveyQuestions={this.state.currentProject.sampleValues}
                            setCurrentValue={this.setCurrentValue}
                            setSelectedQuestionText={this.setSelectedQuestionText}
                        />
                    :
                        <fieldset className="mb-3 justify-content-center text-center">
                            <h3>Survey Questions</h3>
                            <p>Please go to a plot to see survey questions</p>
                        </fieldset>
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

function ImageAnalysisPane(props) {
    return (
        // Mercator hooks into image-analysis-pane
        <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
            <div id="imagery-info" className="row">
                <p className="col small">{props.imageryAttribution}</p>
            </div>
        </div>
    );
}

function SideBar(props) {
    const saveValuesButtonEnabled = props.surveyQuestions.reduce((prev, cur) => {
            return prev && cur.visible === cur.answered;
        }, true);
    return (
        <div id="sidebar" className="col-xl-3 border-left" style={{overflow: "scroll"}}>
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
                        onClick={props.postValuesToDB}
                        style={{opacity: saveValuesButtonEnabled ? "1.0" : ".25"}}
                        disabled={!saveValuesButtonEnabled}
                    />
                    <ProjectStatsGroup 
                        documentRoot={props.documentRoot}
                        projectId={props.projectId}
                        plotId={props.plotId}
                        userName={props.userName}
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

class PlotNavigation extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            newPlotInput: "",
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.plotId !== prevProps.plotId) {
            this.setState({newPlotInput: this.props.plotId})
        }
    }

    updateNewPlotId = (value) => this.setState({newPlotInput: value});
    
    render() {
        const { props } = this;
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
                                value={this.state.newPlotInput}
                                onChange={e => this.updateNewPlotId(e.target.value)}
                            />
                            <input
                                id="goto-plot-button"
                                className="text-center btn btn-outline-lightgreen btn-sm"
                                type="button"
                                name="goto-plot"
                                value="Go to plot"
                                onClick={() => props.goToPlot(this.state.newPlotInput)}
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
                                onClick={props.flagPlotInDB}
                            />
                        </div>
                    </div>
                }

                <div className="PlotNavigation__review-option row justify-content-center">
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

                <div className="PlotNavigation__change-color row justify-content-center">
                    Unanswered Color
                    <div className="form-check form-check-inline">
                        <input 
                            className="form-check-input ml-2"
                            checked={props.sampleOutlineBlack}
                            id="radio1"
                            onChange={props.toggleSampleBW}
                            type="radio"
                            name="color-radios"
                        />
                        <label htmlFor="radio1" className="form-check-label">Black</label>
                    </div>                
                    <div className="form-check form-check-inline">
                        <input 
                            className="form-check-input"
                            checked={!props.sampleOutlineBlack}
                            id="radio2"
                            onChange={props.toggleSampleBW}
                            type="radio"
                            name="color-radios"
                        />
                        <label htmlFor="radio2" className="form-check-label">White</label>
                    </div>
                </div>
            </fieldset>
        );
    }
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
                onChange={(e) => props.setBaseMapSource(e.target.value)}
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
                <input 
                    type="range" 
                    min="2000" 
                    max="2018" 
                    value={props.imageryYearDG} 
                    className="slider" 
                    id="myRange"
                    onChange={(e) => props.setImageryYearDG(e.target.value)}
                />
                <p>Year: <span id="demo">{props.imageryYearDG}</span></p>
            </div>
            <select className="form-control form-control-sm"
                    id="dg-stacking-profile"
                    name="dg-stacking-profile"
                    size="1"
                    value={props.stackingProfileDG}
                    onChange={(e) => props.setStackingProfileDG(e.target.value)}>
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
                <input 
                    type="range" 
                    min="2016" 
                    max="2018" 
                    value={props.imageryYearPlanet} 
                    className="slider" id="myRange"
                    onChange={(e) => props.setImageryYearPlanet(e.target.event)}
                />
                <p>Year: <span id="demo">{props.imageryYearPlanet}</span></p>
            </div>
            <div className="slidecontainer form-control form-control-sm">
                <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    value={props.imageryMonthPlanet} 
                    className="slider" 
                    id="myRangemonth"
                    onChange={(e) => props.setImageryMonthPlanet(e.target.event)}
                />
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
    }

    componentDidUpdate(prevProps) {
        if (prevProps.plotId !== this.props.plotId) {
            this.setState({ showStats: false });
        }
    }

    updateShown = () => this.setState({showStats: !this.state.showStats});

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
                        userName={this.props.userName}
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
        const userStats = stats.userStats && stats.userStats.find(user => user.user === this.props.userName)
        const numPlots = stats.flaggedPlots + stats.analyzedPlots + stats.unanalyzedPlots
        return (
            <div className="row mb-1">
                <div className="col-lg-12">
                    <fieldset id="projStats" className="projNoStats">
                            <table className="table table-sm">
                                <tbody>
                                    <tr>
                                        <td className="small pl-4">My Plots Completed</td>
                                        <td className="small">
                                            {userStats && userStats.plots || "0"}
                                            ({this.asPercentage(userStats && userStats.plots || 0, numPlots)}%)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="small pl-4">-- My Average Time</td>
                                        <td className="small">
                                            {userStats && userStats.timedPlots ? `${(userStats.seconds / userStats.timedPlots / 1.0).toFixed(2)} secs` : "untimed"} 
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="small pl-4">Project Plots Completed</td>
                                        <td className="small">
                                            {stats.analyzedPlots + stats.flaggedPlots || ""}
                                            ({this.asPercentage(stats.analyzedPlots + stats.flaggedPlots, numPlots)}%)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="small pl-4">-- Analyzed</td>
                                        <td className="small">
                                            {stats.analyzedPlots || ""}
                                            ({this.asPercentage(stats.analyzedPlots, numPlots)}%)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="small pl-4">-- Flagged</td>
                                        <td className="small">
                                            {stats.flaggedPlots || ""}
                                            ({this.asPercentage(stats.flaggedPlots, numPlots)}%)
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="small pl-4">-- Total contributors</td>
                                        <td className="small">
                                            {stats.userStats ? stats.userStats.length : 0}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="small pl-4">-- Users Average time</td>
                                        <td className="small">
                                            {stats.userStats && stats.userStats.reduce((p, c) => {return p + c.timedPlots}, 0) > 0
                                                ? `${(stats.userStats.reduce((p, c) => {return p + c.seconds}, 0) 
                                                    / stats.userStats.reduce((p, c) => {return p + c.timedPlots}, 0)
                                                    / 1.0).toFixed(2)} secs`
                                                : "untimed"}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="small pl-4">Project Plots Total</td>
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
