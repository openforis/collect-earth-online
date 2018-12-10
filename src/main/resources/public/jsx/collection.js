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
            prevPlotButtonDisabled: false,
            newPlotButtonDisabled: false,
            flagPlotButtonDisabled: false,
            saveValuesButtonDisabled: true,
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
        this.prevPlot = this.prevPlot.bind(this);
        this.nextPlot = this.nextPlot.bind(this);
        this.flagPlot = this.flagPlot.bind(this);
        this.saveValues = this.saveValues.bind(this);
        this.hideShowAnswers = this.hideShowAnswers.bind(this);
        this.showQuestions = this.showQuestions.bind(this);
        this.hideQuestions = this.hideQuestions.bind(this);
        this.highlightAnswer = this.highlightAnswer.bind(this);
        this.getImageryAttributes  = this.getImageryAttributes.bind(this);
        this.setCurrentValue = this.setCurrentValue.bind(this);
        this.redirectToHomePage = this.redirectToHomePage.bind(this);
        this.findPrevPlot = this.findPrevPlot.bind(this)
        this.findNextPlot=this.findNextPlot.bind(this);
    }

    componentDidMount() {
        utils.show_element("spinner");

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
        if(this.state.projectPlotsShown == true){
            console.log(this.state.plotList);
           utils.enable_element("go-to-first-plot-button");
           utils.hide_element("spinner");
        }
        else{
            utils.disable_element("go-to-first-plot-button");
        }
        if (this.state.mapConfig && this.state.currentImagery == null) {
            this.updateMapImagery(this.state.currentProject.baseMapSource);
        }
        if (this.state.currentProject.sampleValues.length > 0 && Object.keys(this.state.surveyQuestionsVisible).length == 0) {
            const topLevelNodes = this.state.currentProject.sampleValues.filter(surveyNode => surveyNode.parent_question == -1);
            this.showQuestions(topLevelNodes);
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
                    parent_answer: -1
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

        let newImageryMonth=slider.value;

        if(parseInt(newImageryMonth)==1){
            newImageryMonthPlanet="January";

        }
        if(parseInt(newImageryMonth)==2){
            newImageryMonthPlanet="February";
        }
        else if(parseInt(newImageryMonth)==3){
            newImageryMonthPlanet="March";
        }
        else if(parseInt(newImageryMonth)==4){
            newImageryMonthPlanet="April";
        }
        else if(parseInt(newImageryMonth)==5){
            newImageryMonthPlanet="May";
        }
        else if(parseInt(newImageryMonth)==6){
            newImageryMonthPlanet="June";
        }
        else if(parseInt(newImageryMonth)==7){
            newImageryMonthPlanet="July";
        }
        else if(parseInt(newImageryMonth)==8){
            newImageryMonthPlanet="August";
        }
        else if(parseInt(newImageryMonth)==9){
            newImageryMonthPlanet="September";
        }
        else if(parseInt(newImageryMonth)==10){
            newImageryMonthPlanet="October";
        }
        else if(parseInt(newImageryMonth)==11){
            newImageryMonthPlanet="November";
        }
        else if(parseInt(newImageryMonth)==12){
            newImageryMonthPlanet="December";
        }


        const currentImagery = this.getImageryByTitle(this.state.currentProject.baseMapSource);
        const newImageryAttribution = currentImagery.attribution + " | " + this.state.imageryYearPlanet + "-" + newImageryMonthPlanet;
        this.setState({
            imageryMonthPlanet: newImageryMonth,
            imageryMonthNamePlanet:newImageryMonthPlanet,
            imageryAttribution: newImageryAttribution
        });
        if(parseInt(slider.value)<10){
            newImageryMonth="0"+slider.value;
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
        const url =  this.props.documentRoot + "/get-unanalyzed-plot-by-id/" + this.props.projectId+ "/" + plotId;
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
                    this.setState({
                        currentPlot: null,
                        userSamples: {},
                        userImages: {}
                    });
                    const msg = (plotId == "random")
                        ? "All plots have been analyzed for this project."
                        : "This plot has already been analyzed.";
                    alert(msg);
                } else if (data == "not found") {
                    this.setState({
                        currentPlot: null,
                        userSamples: {},
                        userImages: {}
                    });
                    alert("No plot with ID " + plotId + " found.");
                } else if (data == "error") {
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
                        collectionStart: Date.now()
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
        window.open(this.props.documentRoot + "/geo-dash?editable=false&"
            + encodeURIComponent("title=" + this.state.currentProject.name
                + "&pid=" + this.props.projectId
                + "&plotid=" + plot.id
                + "&plotshape=" + (plot.geom ? "polygon" : this.state.currentProject.plotShape)
                + "&aoi=[" + mercator.getViewExtent(this.state.mapConfig)
                + "]&daterange=&bcenter=" + plot.center
                + "&bradius=" + plotRadius),
            "_geo-dash");
    }

    prevPlot() {
        this.setState({
            navButtonsShown: 2,
            prevPlotButtonDisabled: false,
            newPlotButtonDisabled: false,
            flagPlotButtonDisabled: false,
            saveValuesButtonDisabled: true
        });
        let sortedPlotList = this.state.plotList;
        let plotListIds = [];
        sortedPlotList.map(pl => {
            if (pl.analyses == 0 && pl.flagged == false) plotListIds.push(pl.plotId ? parseInt(pl.plotId) : pl.id);
        });
        plotListIds.sort(function (a, b) {
            return a - b
        });
        if (this.state.currentPlot) {
            //to go to previous plot
            let newPlotId = this.findPrevPlot(plotListIds, this.state.currentPlot.plotId ? parseInt(this.state.currentPlot.plotId) : this.state.currentPlot.id);
            if (newPlotId == 1) {
                this.setState({prevPlotButtonDisabled: true});
                let newPlot = sortedPlotList.filter(pl => (pl.plotId ? parseInt(pl.plotId) : pl.id) == plotListIds[0])[0];
                this.getPlotData(newPlot.id);
            }
            else if (newPlotId > 1) {
                this.setState({prevPlotButtonDisabled: false});
                let newPlot = sortedPlotList.filter(s => (s.plotId ? parseInt(s.plotId) : s.id) == newPlotId)[0];
                this.getPlotData(newPlot.id);
            }
            else {
                this.setState({prevPlotButtonDisabled: true});
                alert("No previous plots available!");
            }
        }
    }

    findPrevPlot(plotListIds, plotId) {
        return plotListIds.indexOf(plotId) - 1 == 0 ? 1 : plotListIds[plotListIds.indexOf(plotId) - 1];
    }

    findNextPlot(plotListIds, plotId) {
        let nextPlotId = plotListIds.filter(i => (i > plotId))[0];
        return plotListIds.indexOf(nextPlotId) == plotListIds.length - 1 ? 1 : nextPlotId;
    }

    nextPlot() {
        this.setState({
            navButtonsShown: 2,
            prevPlotButtonDisabled: false,
            newPlotButtonDisabled: false,
            flagPlotButtonDisabled: false,
            saveValuesButtonDisabled: true
        });
        let sortedPlotList = this.state.plotList;
        let plotListIds = [];
        sortedPlotList.map(pl => {
            if (pl.analyses == 0 && pl.flagged == false) plotListIds.push(pl.plotId ? parseInt(pl.plotId) : pl.id);
        });
        plotListIds.sort(function (a, b) {
            return a - b
        });
        if (this.state.currentPlot) {
            //to go to next plot
            let newPlotId = this.findNextPlot(plotListIds, this.state.currentPlot.plotId ? parseInt(this.state.currentPlot.plotId) : this.state.currentPlot.id);
            if (newPlotId == 1) {
                this.setState({newPlotButtonDisabled: true});
                let newPlot = sortedPlotList.filter(pl => (pl.plotId ? parseInt(pl.plotId) : pl.id) == plotListIds[plotListIds.length - 1])[0];
                this.getPlotData(newPlot.id);
            }
            else if (newPlotId > 1) {
                this.setState({newPlotButtonDisabled: false});
                let newPlot = sortedPlotList.filter(s => (s.plotId ? parseInt(s.plotId) : s.id) == newPlotId)[0];
                this.getPlotData(newPlot.id);
            }
        }
        else {
            //to go to the first plot
            let newPlot = sortedPlotList.filter(pl => (pl.plotId ? parseInt(pl.plotId) : pl.id) == plotListIds[0])[0];
            if (newPlot) {
                this.getPlotData(newPlot.id);
                this.setState({prevPlotButtonDisabled: true});
            }
            else {
                this.setState({
                    navButtonsShown: 2,
                    prevPlotButtonDisabled: true,
                    newPlotButtonDisabled: true,
                    flagPlotButtonDisabled: true,
                    saveValuesButtonDisabled: true
                });
                alert("All plots have been analyzed for this project.");
                utils.disable_element("go-to-first-plot-button");
            }
        }
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
                    this.setState({stats: statistics});
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
            return {}
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

    render() {

        return (
            <React.Fragment>
                <ImageAnalysisPane imageryAttribution={this.state.imageryAttribution}/>
                <SideBar plotId={this.state.currentPlot?(this.state.currentPlot.plotId?this.state.currentPlot.plotId:this.state.currentPlot.id):""}
                         currentProject={this.state.currentProject}
                         navButtonsShown={this.state.navButtonsShown}
                         prevPlotButtonDisabled={this.state.prevPlotButtonDisabled}
                         newPlotButtonDisabled={this.state.newPlotButtonDisabled}
                         flagPlotButtonDisabled={this.state.flagPlotButtonDisabled}
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
                         selectedAnswers={this.state.selectedAnswers}/>
                <QuitMenu redirectToHomePage={this.redirectToHomePage}/>
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
            <div id="spinner" style={{top:"45%"}}></div>

        </div>

    );
}

function SideBar(props) {
    return (
        <div id="sidebar" className="col-xl-3" style={{overflow: "scroll"}}>
            <ProjectName projectName={props.currentProject.name}/>
            <PlotNavigation plotId={props.plotId}
                            navButtonsShown={props.navButtonsShown}
                            prevPlot={props.prevPlot}
                            nextPlot={props.nextPlot}
                            flagPlot={props.flagPlot}
                            prevPlotButtonDisabled={props.prevPlotButtonDisabled}
                            newPlotButtonDisabled={props.newPlotButtonDisabled}
                            flagPlotButtonDisabled={props.flagPlotButtonDisabled}/>
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
                             selectedAnswers={props.selectedAnswers}/>
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
                           type="button" name="new-plot" value="Go to first plot" onClick={props.nextPlot}/>
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
        this.state = {value:"2018"}
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
                                                                           selectedAnswers={props.selectedAnswers}/>)
            }
        </fieldset>
    );
}

function SurveyQuestionTree(props) {
    const childNodes = props.surveyQuestions.filter(surveyNode => surveyNode.parent_question == props.surveyNode.id);
    return (
        <fieldset className={"mb-1 justify-content-center text-center"
        + (props.surveyQuestionsVisible[props.surveyNode.id] ? "" : " d-none")}>
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
                                                                        selectedAnswers={props.selectedAnswers}/>)
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
