import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";

import { SurveyCollection } from "./components/SurveyCollection";
import { convertSampleValuesToSurveyQuestions } from "./utils/surveyUtils";

class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            collectionStart: 0,
            currentProject: { surveyQuestions: [], institution: "" },
            currentImagery: { id: "" },
            currentPlot: null,
            imageryAttribution: "",
            imageryList: [],
            imageryMonthPlanet: 3,
            imageryMonthNamePlanet: "March",
            imageryYearDG: 2009,
            imageryYearPlanet: 2018,
            mapConfig: null,
            nextPlotButtonDisabled: false,
            plotList: [],
            prevPlotButtonDisabled: false,
            reviewPlots: false,
            sampleOutlineBlack: true,
            selectedQuestion: { id: 0, question: "", answers: [] },
            selectedSampleId: -1,
            stackingProfileDG: "Accuracy_Profile",
            userSamples: {},
            userImages: {},
            storedInterval: null
        };
    }

    componentDidMount() {
        this.getProjectData();
    }

    componentDidUpdate(prevProps, prevState) {
        //
        // Initialize after apis return.
        //

        // Wait to get imagery list until project is loaded
        if (this.state.currentProject.institution !== prevState.currentProject.institution) {
            // release any locks in case of user hitting refresh
            fetch(
                this.props.documentRoot
                + "/release-plot-locks/"
                + this.props.userId + "/"
                + this.state.currentProject.id,
                { method: "POST" }
            );
            this.getImageryList();
        }
        // Initialize map when imagery list is returned
        if (this.state.imageryList.length > 0
             && this.state.currentProject.boundary
             && this.state.mapConfig == null) {
            this.initializeProjectMap();
        }
        // Load all project plots initially
        if (this.state.mapConfig && this.state.plotList.length > 0
            && (this.state.mapConfig !== prevState.mapConfig
                || prevState.plotList.length === 0)) {
            this.showProjectPlots();
        }
        // initialize current imagery to project default
        if (this.state.mapConfig && this.state.currentProject
            && this.state.imageryList.length > 0 && !this.state.currentImagery.id) {
            this.setBaseMapSource(this.getImageryByTitle(this.state.currentProject.baseMapSource).id);
        }

        //
        // Update map when state changes
        //

        // Inititialize on new plot
        if (this.state.currentPlot && this.state.currentPlot !== prevState.currentPlot) {
            this.showProjectPlot();
            this.showGeoDash();

            clearInterval(this.state.storedInterval);
            this.setState({ storedInterval: setInterval(() => this.resetPlotLock, 2.3 * 60 * 1000) });
        }

        // Update Samples
        if (this.state.currentPlot && this.state.currentPlot === prevState.currentPlot) {
            // Changing questions shows different set of samples
            if (this.state.selectedQuestion.id !== prevState.selectedQuestion.id
                || this.state.sampleOutlineBlack !== prevState.sampleOutlineBlack
                || this.state.userSamples !== prevState.userSamples
                || !prevState.selectedQuestion.visible) {

                this.showPlotSamples();
                this.highlightSamplesByQuestion();
            }
        }

        // Update user samples calculations for display
        if (this.state.currentProject.surveyQuestions.length > 0
            && this.state.userSamples !== prevState.userSamples) {
            this.updateQuestionStatus();
        }

        //  Update map image stuff
        if (this.state.mapConfig && this.state.currentImagery.id
            && (this.state.currentImagery.id !== prevState.currentImagery.id
                || this.state.mapConfig !== prevState.mapConfig)) {
            this.updateMapImagery();
        }

        if (this.state.imageryYearDG !== prevState.imageryYearDG
            || this.state.stackingProfileDG !== prevState.stackingProfileDG) {
            this.updateDGWMSLayer();
        }

        if (this.state.imageryMonthPlanet !== prevState.imageryMonthPlanet
            || this.state.imageryYearPlanet !== prevState.imageryYearPlanet) {
            this.updatePlanetLayer();
        }
    }

    getProjectData = () => {
        Promise.all([this.getProjectById(), this.getProjectPlots()])
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    getProjectById = () => fetch(this.props.documentRoot + "/get-project-by-id/" + this.props.projectId)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(project => {
            if (project.id > 0) {
                const surveyQuestions = convertSampleValuesToSurveyQuestions(project.sampleValues);
                this.setState({ currentProject: { ...project, surveyQuestions: surveyQuestions }});
                return Promise.resolve("resolved");
            } else {
                return Promise.reject("No project found with ID " + this.props.projectId + ".");
            }
        });

    getProjectPlots = () => fetch(this.props.documentRoot + "/get-project-plots/" + this.props.projectId + "/1000")
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            if (data.length > 0) {
                this.setState({ plotList: data });
                return Promise.resolve("resolved");
            } else {
                return Promise.reject("No plot information found");
            }
        });

    getImageryList = () => {
        const { institution } = this.state.currentProject;
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institution)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ imageryList: data }))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    initializeProjectMap = () => {
        const mapConfig = mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, this.state.imageryList);
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary, true)),
                                ceoMapStyles.yellowPolygon);
        mercator.zoomMapToLayer(mapConfig, "currentAOI");
        this.setState({ mapConfig: mapConfig });
    };

    showProjectPlots = () => {
        mercator.addPlotLayer(this.state.mapConfig,
                              this.state.plotList,
                              feature => {
                                  this.setState({
                                      prevPlotButtonDisabled: false,
                                  });
                                  this.getPlotData(feature.get("features")[0].get("plotId"));
                              });
    };

    setBaseMapSource = (newBaseMapSource) => {
        const newImagery = this.getImageryById(newBaseMapSource);
        const newImageryAttribution = newImagery.title === "DigitalGlobeWMSImagery"
                        ? newImagery.attribution + " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")"
                        : newImagery.title === "PlanetGlobalMosaic"
                            ? newImagery.attribution + " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet
                            : newImagery.attribution;
        this.setState({
            currentImagery: newImagery,
            imageryAttribution: newImageryAttribution,
        });
    };

    setImageryYearDG = (newImageryYearDG) => {
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + newImageryYearDG + " (" + this.state.stackingProfileDG + ")";
        this.setState({
            imageryYearDG: newImageryYearDG,
            imageryAttribution: newImageryAttribution,
        });
    };

    setStackingProfileDG = (newStackingProfileDG) => {
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + this.state.imageryYearDG + " (" + newStackingProfileDG + ")";
        this.setState({
            stackingProfileDG: newStackingProfileDG,
            imageryAttribution: newImageryAttribution,
        });
    };

    setImageryYearPlanet = (newImageryYearPlanet) => {
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + newImageryYearPlanet + "-" + this.state.imageryMonthNamePlanet;
        this.setState({
            imageryYearPlanet: newImageryYearPlanet,
            imageryAttribution: newImageryAttribution,
        });
    };

    setImageryMonthPlanet = (newImageryMonthPlanet) => {
        const monthData = {
            1: "January",
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
            12: "December",
        };
        const newImageryMonthName = monthData[parseInt(newImageryMonthPlanet)];
        const imageryInfo = this.getImageryByTitle(this.state.currentImagery.title);
        const newImageryAttribution = imageryInfo.attribution + " | " + this.state.imageryYearPlanet + "-" + newImageryMonthName;

        this.setState({
            imageryMonthPlanet: newImageryMonthPlanet,
            imageryMonthNamePlanet: newImageryMonthName,
            imageryAttribution: newImageryAttribution,
        });
    };

    updateMapImagery() {
        // FIXME, update mercator to take ID instead of name in cases of duplicate names
        mercator.setVisibleLayer(this.state.mapConfig, this.state.currentImagery.title);

        if (this.state.currentImagery.title === "DigitalGlobeWMSImagery") {
            this.updateDGWMSLayer();
        } else if (this.state.currentImagery.title === "PlanetGlobalMosaic") {
            this.updatePlanetLayer();
        }
    };

    getImageryByTitle = (imageryTitle) => this.state.imageryList.find(imagery => imagery.title === imageryTitle);

    getImageryById = (imageryId) => this.state.imageryList.find(imagery => imagery.id === imageryId);

    updateDGWMSLayer = () => {
        const { imageryYearDG, stackingProfileDG } = this.state;
        mercator.updateLayerWmsParams(this.state.mapConfig,
                                      "DigitalGlobeWMSImagery",
                                      {
                                          COVERAGE_CQL_FILTER: "(acquisitionDate>='" + imageryYearDG + "-01-01')"
                                              + "AND(acquisitionDate<='" + imageryYearDG + "-12-31')",
                                          FEATUREPROFILE: stackingProfileDG,
                                      });
    };

    updatePlanetLayer = () => {
        const { imageryMonthPlanet, imageryYearPlanet } = this.state;
        mercator.updateLayerSource(this.state.mapConfig,
                                   "PlanetGlobalMosaic",
                                   sourceConfig => {
                                       sourceConfig.month = imageryMonthPlanet < 10 ? "0" + imageryMonthPlanet : imageryMonthPlanet;
                                       sourceConfig.year = imageryYearPlanet;
                                       return sourceConfig;
                                   },
                                   this);
    };

    getQueryString = (params) => "?" + Object.keys(params)
        .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
        .join("&");

    getPlotData = (plotId) => {
        fetch(this.props.documentRoot + "/get-plot-by-id"
                + this.getQueryString({
                    getUserPlots: this.state.reviewPlots,
                    plotId: plotId,
                    projectId: this.props.projectId,
                    userId: this.props.userId,
                    userName: this.props.userName,
                })
        )
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    alert(this.state.reviewPlots
                        ? "This plot was analyzed by someone else."
                        : "This plot has already been analyzed.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.resetPlotValues(newPlot),
                        prevPlotButtonDisabled: false,
                        nextPlotButtonDisabled: false,
                    });
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    getNextPlotData = (plotId) => {
        fetch(this.props.documentRoot + "/get-next-plot"
                + this.getQueryString({
                    getUserPlots: this.state.reviewPlots,
                    plotId: plotId,
                    projectId: this.props.projectId,
                    userId: this.props.userId,
                    userName: this.props.userName,
                })
        )
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    if (plotId === -1) {
                        alert(this.state.reviewPlots
                                ? "You have not reviewd any plots"
                                : "All plots have been analyzed for this project.");
                    } else {
                        this.setState({ nextPlotButtonDisabled: true });
                        alert("You have reached the end of the plot list.");
                    }
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.resetPlotValues(newPlot),
                        prevPlotButtonDisabled: plotId === -1,
                    });
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    getPrevPlotData = (plotId) => {
        fetch(this.props.documentRoot + "/get-prev-plot"
                + this.getQueryString({
                    getUserPlots: this.state.reviewPlots,
                    plotId: plotId,
                    projectId: this.props.projectId,
                    userId: this.props.userId,
                    userName: this.props.userName,
                })
        )
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    this.setState({ prevPlotButtonDisabled: true });
                    alert(this.state.reviewPlots
                            ? "No previous plots were analyzed by you."
                            : "All previous plots have been analyzed.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.resetPlotValues(newPlot),
                        nextPlotButtonDisabled: false,
                    });
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    resetPlotLock = () => {
        fetch(this.props.documentRoot + "/reset-plot-lock",
              {
                  method: "POST",
                  body: JSON.stringify({
                      plotId: this.state.currentPlot.id,
                      projectId: this.props.projectId,
                      userId: this.props.userId,
                      userName: this.props.userName,
                  }),
              })
            .then(response => {
                if (!response.ok) {
                    console.log(response);
                    alert("Error maintaining plot lock. Your work may get overwritten. See console for details.");
                }
            });
    };

    resetPlotValues = (newPlot) => ({
        newPlotInput: newPlot.plotId ? newPlot.plotId : newPlot.id,
        userSamples: newPlot.samples
            ? newPlot.samples.reduce((obj, s) => {
                obj[s.id] = s.value || {};
                return obj;
            }, {})
            : {},
        userImages: newPlot.samples
            ? newPlot.samples.reduce((obj, s) => {
                obj[s.id] = s.userImage || {};
                return obj;
            }, {})
            : {},
        selectedQuestion: {
            ...this.state.currentProject.surveyQuestions
                .sort((a, b) => a.id - b.id)
                .find(surveyNode => surveyNode.parentQuestion === -1),
            visible: null,
        },
        collectionStart: Date.now(),
        sampleOutlineBlack: true,
    });

    showProjectPlot = () => {
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
    };

    showPlotSamples = () => {
        const { mapConfig, selectedQuestion: { visible }} = this.state;
        mercator.disableSelection(mapConfig);
        mercator.removeLayerByTitle(mapConfig, "currentSamples");
        mercator.addVectorLayer(mapConfig,
                                "currentSamples",
                                mercator.samplesToVectorSource(visible),
                                this.state.sampleOutlineBlack
                                    ? visible[0].geom
                                        ? ceoMapStyles.blackPolygon
                                        : ceoMapStyles.blackCircle
                                    : visible[0].geom
                                        ? ceoMapStyles.whitePolygon
                                        : ceoMapStyles.whiteCircle);
        mercator.enableSelection(mapConfig,
                                 "currentSamples",
                                 (sampleId) => this.setState({ selectedSampleId: sampleId }));
    };

    showGeoDash = () => {
        const { currentPlot, mapConfig, currentProject } = this.state;
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
    };

    goToFirstPlot = () => this.getNextPlotData(-1);

    prevPlot = () => this.getPrevPlotData(this.state.currentPlot.plotId
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
    };

    setReviewPlots = () => this.setState({
        reviewPlots: !this.state.reviewPlots,
        prevPlotButtonDisabled: false,
        nextPlotButtonDisabled: false,
    });

    flagPlotInDB = () => {
        if (this.state.currentPlot != null) {
            fetch(this.props.documentRoot + "/flag-plot",
                  {
                      method: "POST",
                      body: JSON.stringify({
                          projectId: this.props.projectId,
                          plotId: this.state.currentPlot.id,
                          userId: this.props.userId,
                          userName: this.props.userName,
                      }),
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
    };

    postValuesToDB = () => {
        fetch(this.props.documentRoot + "/add-user-samples",
              {
                  method: "post",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                      projectId: this.props.projectId,
                      plotId: this.state.currentPlot.id,
                      userName: this.props.userName,
                      userId: this.props.userId,
                      confidence: -1,
                      collectionStart: this.state.collectionStart,
                      userSamples: this.state.userSamples,
                      userImages: this.state.userImages,
                  }),
              })
            .then(response => {
                if (response.ok) {
                    this.nextPlot();
                } else {
                    console.log(response);
                    alert("Error saving your assignments to the database. See console for details.");
                }
            });
    };

    getImageryAttributes = () => {
        if (this.state.currentImagery.title === "DigitalGlobeWMSImagery") {
            return { imageryYearDG: this.state.imageryYearDG, stackingProfileDG: this.state.stackingProfileDG };
        } else if (this.state.currentImagery.title === "PlanetGlobalMosaic") {
            return { imageryMonthPlanet: this.state.imageryMonthPlanet, imageryYearPlanet: this.state.imageryYearPlanet };
        } else {
            return {};
        }
    };

    validateCurrentSelection = (selectedFeatures, questionId) => {
        const visibleSamples = this.getVisibleSamples(questionId);

        return selectedFeatures.getArray()
            .map(sf => sf.get("sampleId"))
            .every(sid => visibleSamples.some(vs => vs.id === sid));
    };

    getChildQuestions = (currentQuestionId) => {
        const { surveyQuestions } = this.state.currentProject;
        const { question, id } = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const childQuestions = surveyQuestions.filter(sq => sq.parentQuestion === id);

        if (childQuestions.length === 0) {
            return [question];
        } else {
            return childQuestions
                .reduce((prev, acc) => (
                    [...prev, ...this.getChildQuestions(acc.id)]
                ), [question]);
        }
    };

    rulesViolated = (questionToSet, answerId, answerText) => {
        if (!this.state.currentProject.surveyRules) {
            return null;
        }
        const errorMessages = this.state.currentProject.surveyRules.map(surveyRule => {
            if (surveyRule.ruleType === "text-match" &&
                surveyRule.questionId === questionToSet.id &&
                !RegExp(surveyRule.regex).test(answerText)) {
                return "Please enter a regular expression that matches " + surveyRule.regex;
            } else if (surveyRule.ruleType === "numeric-range" &&
                       surveyRule.questionId === questionToSet.id &&
                       (isNaN(parseInt(answerText)) ||
                        parseInt(answerText) < surveyRule.min ||
                        parseInt(answerText) > surveyRule.max)) {
                return "Please select a value between " + surveyRule.min + " and " + surveyRule.max;
            } else if (surveyRule.ruleType === "sum-of-answers" &&
                       surveyRule.questions.includes(questionToSet.id)) {
                const answeredQuestions = this.state.currentProject.surveyQuestions.filter(q => surveyRule.questions.includes(q.id)
                                                                                           && q.answered.length > 0);
                // FIXME: This won't catch the case in which a valid sum is entered by the user and then changed to an invalid one.
                if (surveyRule.questions.length === answeredQuestions.length + 1 &&
                    answeredQuestions.every(ques => ques.id !== questionToSet.id)) {
                    // FIXME: We need to actually compare the sums for every sample individually across questions.
                    const answeredSum = answeredQuestions.reduce((sum, q) => sum + parseInt(q.answered[0].answerText), 0);
                    if (answeredSum + parseInt(answerText) !== surveyRule.validSum) {
                        return "Check your input. Possible value is " + (surveyRule.validSum - answeredSum).toString();
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } else if (surveyRule.ruleType === "incompatible-answers") {
                if (surveyRule.question1 === questionToSet.id && surveyRule.answer1 === answerId) {
                    const ques2 = this.state.currentProject.surveyQuestions.find(q => q.id === surveyRule.question2);
                    // FIXME: We need to restrict this test to any samples shared between question1 and question2.
                    if (ques2.answered.some(ans => ans.answerId === surveyRule.answer2)) {
                        return "Incompatible answer";
                    } else {
                        return null;
                    }
                } else if (surveyRule.question2 === questionToSet.id && surveyRule.answer2 === answerId) {
                    const ques1 = this.state.currentProject.surveyQuestions.find(q => q.id === surveyRule.question1);
                    // FIXME: We need to restrict this test to any samples shared between question1 and question2.
                    if (ques1.answered.some(ans => ans.answerId === surveyRule.answer1)) {
                        return "Incompatible answer";
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } else {
                return null;
            }
        });

        return errorMessages.find(msg => msg !== null);
    };

    setCurrentValue = (questionToSet, answerId, answerText) => {
        const ruleError = this.rulesViolated(questionToSet, answerId, answerText);
        const selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig);

        if (ruleError) {
            alert(ruleError);
            return false;
        } else if (Object.keys(this.state.userSamples).length === 1
            || (selectedFeatures && selectedFeatures.getLength()
                && this.validateCurrentSelection(selectedFeatures, questionToSet.id))) {

            const sampleIds = Object.keys(this.state.userSamples).length === 1
                ? [Object.keys(this.state.userSamples)[0]]
                : selectedFeatures.getArray().map(sf => sf.get("sampleId"));

            const newSamples = sampleIds.reduce((acc, sampleId) => {
                const newQuestion = {
                    questionId: questionToSet.id,
                    answer: answerText,
                    answerId: answerId,
                };

                const childQuestionArray = this.getChildQuestions(questionToSet.id);
                const clearedSubQuestions = Object.entries(this.state.userSamples[sampleId])
                    .filter(entry => !childQuestionArray.includes(entry[0]))
                    .reduce((acc, cur) => ({...acc, [cur[0]]: cur[1]}), {});

                return {
                    ...acc,
                    [sampleId]: {
                        ...clearedSubQuestions,
                        [questionToSet.question]: newQuestion,
                    },
                };

            }, {});

            const newUserImages = sampleIds
                .reduce((acc, sampleId) => ({
                    ...acc,
                    [sampleId]: {
                        id: this.state.currentImagery.id,
                        attributes: this.getImageryAttributes(),
                    },
                }), {});

            this.setState({
                userSamples: {...this.state.userSamples, ...newSamples},
                userImages: {...this.state.userImages, ...newUserImages},
                selectedQuestion: questionToSet,
            });
            return true;
        } else if (selectedFeatures && selectedFeatures.getLength() === 0) {
            alert("No samples selected. Please click some first.");
            return false;
        } else {
            alert("Invalid Selection. Try selecting the question before answering.");
            return false;
        }
    };

    setSelectedQuestion = (newselectedQuestion) => this.setState({ selectedQuestion: newselectedQuestion });

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
        const padZero = (str) => (new Array(2).join("0") + str).slice(-2);
        return "#" + padZero(r) + padZero(g) + padZero(b);
    }

    highlightSamplesByQuestion = () => {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];

        const { question } = this.state.selectedQuestion;
        allFeatures
            .filter(feature => {
                const sampleId = feature.get("sampleId");
                return this.state.userSamples[sampleId]
                                && this.state.userSamples[sampleId][question];
            })
            .forEach(feature => {
                const sampleId = feature.get("sampleId");
                const userAnswer = this.state.userSamples[sampleId][question].answer;
                const matchingAnswer = this.state.selectedQuestion.answers
                    .find(ans => ans.answer === userAnswer);

                const color = this.state.selectedQuestion.componentType === "input"
                                ? userAnswer.length > 0
                                    ? this.state.selectedQuestion.answers[0].color
                                    : this.invertColor(this.state.selectedQuestion.answers[0].color)
                                : matchingAnswer
                                    ? matchingAnswer.color
                                    : "";

                mercator.highlightSampleGeometry(feature, color);
            });
    };

    toggleSampleBW = () => this.setState({ sampleOutlineBlack: !this.state.sampleOutlineBlack });

    getVisibleSamples = (currentQuestionId) => {
        const { currentProject : { surveyQuestions }, userSamples } = this.state;
        const { parentQuestion, parentAnswer } = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const parentQuestionText = parentQuestion === -1
                ? ""
                : surveyQuestions.find(sq => sq.id === parentQuestion).question;

        if (parentQuestion === -1) {
            return this.state.currentPlot.samples;
        } else {
            const correctAnswerText = surveyQuestions
                .find(sq => sq.id === parentQuestion).answers
                .find(ans => parentAnswer === -1 || ans.id === parentAnswer).answer;

            return this.getVisibleSamples(parentQuestion)
                .filter(sample => {
                    const sampleAnswer = userSamples[sample.id][parentQuestionText]
                                             && userSamples[sample.id][parentQuestionText].answer;
                    return (parentAnswer === -1 && sampleAnswer) || correctAnswerText === sampleAnswer;
                });
        }
    };

    updateQuestionStatus = () => {
        const newSurveyQuestions = this.state.currentProject.surveyQuestions.map(sq => {
            const visibleSamples = this.getVisibleSamples(sq.id);
            return ({
                ...sq,
                visible: visibleSamples,
                answered: visibleSamples
                    .filter(vs => this.state.userSamples[vs.id][sq.question])
                    .map(vs => ({
                        sampleId: vs.id,
                        answerId: this.state.userSamples[vs.id][sq.question].answerId,
                        answerText: this.state.userSamples[vs.id][sq.question].answer,
                    })),
            });
        });

        this.setState({
            currentProject: {
                ...this.state.currentProject,
                surveyQuestions: newSurveyQuestions,
            },
            selectedQuestion: newSurveyQuestions.find(sq => sq.id === this.state.selectedQuestion.id),
        });
    };

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
                    postValuesToDB={this.postValuesToDB}
                    projectName={this.state.currentProject.name}
                    surveyQuestions={this.state.currentProject.surveyQuestions}
                    userName={this.props.userName}
                >
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
                        loadingPlots={this.state.plotList.length === 0}
                    />
                    <ImageryOptions
                        baseMapSource={this.state.currentImagery.id}
                        imageryTitle={this.state.currentImagery.title}
                        imageryList={this.state.imageryList}
                        imageryYearDG={this.state.imageryYearDG}
                        imageryYearPlanet={this.state.imageryYearPlanet}
                        imageryMonthPlanet={this.state.imageryMonthPlanet}
                        imageryMonthNamePlanet={this.state.imageryMonthNamePlanet}
                        stackingProfileDG={this.state.stackingProfileDG}
                        setBaseMapSource={this.setBaseMapSource}
                        setImageryYearDG={this.setImageryYearDG}
                        setImageryYearPlanet={this.setImageryYearPlanet}
                        setImageryMonthPlanet={this.setImageryMonthPlanet}
                        setStackingProfileDG={this.setStackingProfileDG}
                        loadingImages={this.state.imageryList.length === 0}
                    />
                    {this.state.currentPlot
                        ?
                            <SurveyCollection
                                selectedQuestion={this.state.selectedQuestion}
                                surveyQuestions={this.state.currentProject.surveyQuestions}
                                surveyRules={this.state.currentProject.surveyRules}
                                setCurrentValue={this.setCurrentValue}
                                setSelectedQuestion={this.setSelectedQuestion}
                                selectedSampleId={Object.keys(this.state.userSamples).length === 1
                                    ? parseInt(Object.keys(this.state.userSamples)[0])
                                    : this.state.selectedSampleId}
                            />
                        :
                            <fieldset className="mb-3 justify-content-center text-center">
                                <h3>Survey Questions</h3>
                                <p>Please go to a plot to see survey questions</p>
                            </fieldset>
                    }
                </SideBar>
                <QuitMenu
                    documentRoot={this.props.documentRoot}
                    userId={this.props.userId}
                    projectId={this.props.projectId}
                />
                {this.state.plotList.length === 0 &&
                    <div id="spinner" style={{ top: "45%", left: "38%" }}></div>
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
    const saveValuesButtonEnabled = props.surveyQuestions
        .every(sq => sq.visible && sq.visible.length === sq.answered.length);

    return (
        <div id="sidebar" className="col-xl-3 border-left full-height" style={{ overflowY: "scroll", overflowX: "hidden" }}>
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
                        style={{ opacity: saveValuesButtonEnabled ? "1.0" : ".25" }}
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

class PlotNavigation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newPlotInput: "",
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.plotId !== prevProps.plotId) {
            this.setState({ newPlotInput: this.props.plotId });
        }
    }

    updateNewPlotId = (value) => this.setState({ newPlotInput: value });

    render() {
        const { props } = this;
        return (
            <fieldset className="mb-3 text-center">
                <h3 className="mb-2">Plot Navigation</h3>
                {props.loadingPlots
                    ? <h3>Loading plot data...</h3>
                    : <Fragment>
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
                                        style={{ opacity: props.prevPlotButtonDisabled ? "0.25" : "1.0" }}
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
                                        style={{ opacity: props.nextPlotButtonDisabled ? "0.25" : "1.0" }}
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
                    </Fragment>
                }
            </fieldset>
        );
    }
}

function ImageryOptions(props) {
    return (
        <fieldset className="mb-3 justify-content-center text-center">
            <h3 className="mb-2">Imagery Options</h3>
            {props.loadingImages
                ? <h3>Loading imagery data...</h3>
                : <Fragment>
                    <select
                        className="form-control form-control-sm"
                        id="base-map-source"
                        name="base-map-source"
                        size="1"
                        value={props.baseMapSource || ""}
                        onChange={e => props.setBaseMapSource(parseInt(e.target.value))}
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
                </Fragment>
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
                    onChange={e => props.setImageryYearDG(parseInt(e.target.value))}
                />
                <p>Year: <span id="demo">{props.imageryYearDG}</span></p>
            </div>
            <select
                className="form-control form-control-sm"
                id="dg-stacking-profile"
                name="dg-stacking-profile"
                size="1"
                value={props.stackingProfileDG}
                onChange={e => props.setStackingProfileDG(e.target.value)}
            >
                {
                    ["Accuracy_Profile", "Cloud_Cover_Profile", "Global_Currency_Profile", "MyDG_Color_Consumer_Profile", "MyDG_Consumer_Profile"]
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
                    className="slider"
                    id="myRange"
                    onChange={e => props.setImageryYearPlanet(parseInt(e.target.value))}
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
                    onChange={e => props.setImageryMonthPlanet(parseInt(e.target.value))}
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
            showStats: false,
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.plotId !== this.props.plotId) {
            this.setState({ showStats: false });
        }
    }

    updateShown = () => this.setState({ showStats: !this.state.showStats });

    render() {
        return (
            <div className="ProjectStatsGroup">
                <button
                    type="button"
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
            stats: {},
        };
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
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ stats: data }))
            .catch(response => {
                console.log(response);
                alert("Error getting project stats. See console for details.");
            });
    }

    render() {
        const { stats } = this.state;
        const userStats = stats.userStats && stats.userStats.find(user => user.user === this.props.userName);
        const numPlots = stats.flaggedPlots + stats.analyzedPlots + stats.unanalyzedPlots;
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
                                        {stats.userStats && stats.userStats.reduce((p, c) => p + c.timedPlots, 0) > 0
                                                ? `${(stats.userStats.reduce((p, c) => p + c.seconds, 0)
                                                    / stats.userStats.reduce((p, c) => p + c.timedPlots, 0)
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
function QuitMenu({ userId, projectId, documentRoot }) {

    return (
        <div
            className="modal fade"
            id="confirmation-quit"
            tabIndex="-1"
            role="dialog"
            aria-labelledby="exampleModalCenterTitle"
            aria-hidden="true"
        >
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
                            onClick={() =>
                                fetch(documentRoot + "/release-plot-locks/" + userId + "/" + projectId, { method: "POST" })
                                    .then(() => window.location = documentRoot + "/home")
                            }
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
        <Collection
            documentRoot={args.documentRoot}
            userId={args.userId === "" ? -1 : parseInt(args.userId)}
            userName={args.userName}
            projectId={args.projectId}
        />,
        document.getElementById("collection")
    );
}
