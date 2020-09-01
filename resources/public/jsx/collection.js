import React from "react";
import ReactDOM from "react-dom";
import { mercator, ceoMapStyles } from "../js/mercator.js";
import { NavigationBar } from "./components/PageComponents";
import { SurveyCollection } from "./components/SurveyCollection";
import {
    PlanetMenus,
    PlanetDailyMenus,
    SecureWatchMenus,
    SentinelMenus,
    GEEImageMenus,
    GEEImageCollectionMenus,
} from "./imagery/collectionMenuControls";
import { convertSampleValuesToSurveyQuestions } from "./utils/surveyUtils";
import { UnicodeIcon, getQueryString } from "./utils/textUtils";
import { CollapsibleTitle } from "./components/FormComponents";

class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            collectionStart: 0,
            currentProject: { surveyQuestions: [], institution: "" },
            currentImagery: { id: "", sourceConfig: {}},
            currentPlot: {},
            // attribution for showing in the map
            imageryAttribution: "",
            // attributes to record when sample is saved
            imageryAttributes: {},
            imageryList: [],
            mapConfig: null,
            nextPlotButtonDisabled: false,
            plotList: [],
            prevPlotButtonDisabled: false,
            reviewPlots: false,
            sampleOutlineBlack: true,
            selectedQuestion: { id: 0, question: "", answers: [] },
            selectedSampleId: -1,
            userSamples: {},
            userImages: {},
            storedInterval: null,
            KMLFeatures: null,
            hasGeoDash: false,
            showSidebar: false,
            loading: false,
            showQuitModal: false,
        };
    }

    componentDidMount() {
        window.name = "_ceocollection";
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
                `/release-plot-locks?userId=${this.props.userId}` +
                `&projectId=${this.state.currentProject.id}`,
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
            if (this.getImageryById(this.state.currentProject.imageryId)) {
                this.setBaseMapSource(this.state.currentProject.imageryId);
            } else {
                this.setBaseMapSource(this.state.imageryList[0].id);
            }
        }

        //
        // Update map when state changes
        //

        // Initialize when new plot
        if (this.state.currentPlot.id && this.state.currentPlot.id !== prevState.currentPlot.id) {
            this.showProjectPlot();
            if (this.state.hasGeoDash && this.state.currentProject.projectOptions.autoLaunchGeoDash) {
                this.showGeoDash();
            }
            clearInterval(this.state.storedInterval);
            this.setState({ storedInterval: setInterval(this.resetPlotLock, 2.3 * 60 * 1000) });
        }

        // Conditions required for samples to be shown
        if (this.state.currentPlot.id
            && this.state.selectedQuestion.visible
            && this.state.selectedQuestion.visible.length > 0) {

            // Changing conditions for which samples need to be re-drawn
            if (this.state.selectedQuestion.id !== prevState.selectedQuestion.id
                || this.state.sampleOutlineBlack !== prevState.sampleOutlineBlack
                || this.state.userSamples !== prevState.userSamples
                || !prevState.selectedQuestion.visible) {
                this.showPlotSamples();
                this.highlightSamplesByQuestion();
                this.createPlotKML();
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
    }

    setImageryAttribution = (attributionSuffix) =>
        this.setState({ imageryAttribution: this.state.currentImagery.attribution + attributionSuffix });

    setImageryAttributes = (newImageryAttributes) => this.setState({ imageryAttributes: newImageryAttributes });

    getProjectData = () => {
        Promise.all([this.getProjectById(), this.getProjectPlots(), this.checkForGeodash()])
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    getProjectById = () => fetch(`/get-project-by-id?projectId=${this.props.projectId}`)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(project => {
            if (project.id > 0 && project.availability !== "archived") {
                const surveyQuestions = convertSampleValuesToSurveyQuestions(project.sampleValues);
                this.setState({ currentProject: { ...project, surveyQuestions: surveyQuestions }});
                return Promise.resolve("resolved");
            } else {
                return Promise.reject(project.availability === "archived"
                                      ? "This project is archived"
                                      : "No project found with ID " + this.props.projectId + ".");
            }
        });

    checkForGeodash = () => fetch(`/geo-dash/get-by-projid?projectId=${this.props.projectId}`)
        .then(response => response.ok ? response.json() : Promise.reject(response))
        .then(data => {
            const widgets = Array.isArray(data.widgets)
                ? data.widgets
                : Array.isArray(eval(data.widgets))
                    ? eval(data.widgets)
                    : [];
            this.setState({ hasGeoDash: widgets.length > 0 });
            return Promise.resolve("resolved");
        });

    getProjectPlots = () => fetch(`/get-project-plots?projectId=${this.props.projectId}&max=1000`)
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
        const { id } = this.state.currentProject;
        fetch(`/get-project-imagery?projectId=${id}`)
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({ imageryList: data }))
            .catch(response => {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };

    initializeProjectMap = () => {
        const mapConfig = mercator.createMap("image-analysis-pane",
                                             [0.0, 0.0],
                                             1,
                                             this.state.imageryList,
                                             this.state.currentProject.boundary);
        mercator.addVectorLayer(mapConfig,
                                "currentAOI",
                                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary,
                                                                                      true)),
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
        // remove planet daily layer switcher
        mercator.currentMap.getControls().getArray()
            .filter(control => control.element.classList.contains("planet-layer-switcher"))
            .map(control => mercator.currentMap.removeControl(control));
        this.setState({
            currentImagery: this.getImageryById(newBaseMapSource),
        }, () => {
            // all other than having separate menu components
            if (!["Planet", "PlanetDaily", "SecureWatch", "Sentinel1", "Sentinel2", "GEEImage", "GEEImageCollection"]
                .includes(this.state.currentImagery.sourceConfig.type)) {
                this.setImageryAttribution("");
            }
        });
    }

    updateMapImagery = () => mercator.setVisibleLayer(this.state.mapConfig, this.state.currentImagery.id);

    getImageryById = (imageryId) => this.state.imageryList.find(imagery => imagery.id === imageryId);

    plotHasSamples = (plotData) => {
        if (plotData.samples.length === 0) {
            alert("This plot has no samples. Please flag the plot.");
            return false;
        } else {
            return true;
        }
    };

    getPlotData = (plotId) => {
        fetch("/get-plot-by-id?"
              + getQueryString({
                  getUserPlots: this.state.reviewPlots,
                  plotId: plotId,
                  projectId: this.props.projectId,
                  userId: this.props.userId,
                  userName: this.props.userName,
              }))
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    alert(this.state.reviewPlots
                          ? "This plot was analyzed by someone else. You are logged in as " + this.props.userName + "."
                          : "This plot has already been analyzed.");
                } else if (data === "not found") {
                    alert("Plot " + plotId + " not found.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.newPlotValues(newPlot),
                        prevPlotButtonDisabled: false,
                        nextPlotButtonDisabled: false,
                    });
                    this.plotHasSamples(newPlot);
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    getNextPlotData = (plotId) => {
        fetch("/get-next-plot?"
              + getQueryString({
                  getUserPlots: this.state.reviewPlots,
                  plotId: plotId,
                  projectId: this.props.projectId,
                  institutionId: this.state.currentProject.institution,
                  userId: this.props.userId,
                  userName: this.props.userName,
              }))
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    if (plotId === -1) {
                        alert(this.state.reviewPlots
                              ? "You have not reviewed any plots. You are logged in as " + this.props.userName + "."
                              : "All plots have been analyzed for this project.");
                    } else {
                        this.setState({ nextPlotButtonDisabled: true });
                        alert("You have reached the end of the plot list.");
                    }
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.newPlotValues(newPlot),
                        prevPlotButtonDisabled: plotId === -1,
                    });
                    this.plotHasSamples(newPlot);
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    getPrevPlotData = (plotId) => {
        fetch("/get-prev-plot?"
              + getQueryString({
                  getUserPlots: this.state.reviewPlots,
                  plotId: plotId,
                  projectId: this.props.projectId,
                  institutionId: this.state.currentProject.institution,
                  userId: this.props.userId,
                  userName: this.props.userName,
              }))
            .then(response => response.ok ? response.text() : Promise.reject(response))
            .then(data => {
                if (data === "done") {
                    this.setState({ prevPlotButtonDisabled: true });
                    alert(this.state.reviewPlots
                          ? "No previous plots were analyzed by you. You are logged in as " + this.props.userName + "."
                          : "All previous plots have been analyzed.");
                } else {
                    const newPlot = JSON.parse(data);
                    this.setState({
                        currentPlot: newPlot,
                        ...this.newPlotValues(newPlot),
                        nextPlotButtonDisabled: false,
                    });
                    this.plotHasSamples(newPlot);
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    resetPlotLock = () => {
        fetch("/reset-plot-lock",
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

    resetPlotValues = (newPlot) => this.setState(this.newPlotValues(newPlot));

    newPlotValues = (newPlot) => ({
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
        mercator.removeLayerById(mapConfig, "currentPlots");
        mercator.removeLayerById(mapConfig, "currentPlot");
        mercator.removeLayerById(mapConfig, "currentSamples");

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
        mercator.removeLayerById(mapConfig, "currentSamples");
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
        window.open("/geo-dash?" +
                    `institutionId=${this.state.currentProject.institution}` +
                    `&projectId=${this.props.projectId}` +
                    `&plotId=${(currentPlot.plotId ? currentPlot.plotId : currentPlot.id)}` +
                    `&plotShape=${encodeURIComponent((currentPlot.geom ? "polygon" : currentProject.plotShape))}` +
                    `&aoi=${encodeURIComponent(`[${mercator.getViewExtent(mapConfig)}]`)}` +
                    `&daterange=&bcenter=${currentPlot.center}` +
                    `&bradius=${plotRadius}`,
                    "_geo-dash");
    };

    createPlotKML = () => {
        const plotFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentPlot");
        const sampleFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples");
        this.setState({
            KMLFeatures: mercator.getKMLFromFeatures([mercator.asPolygonFeature(plotFeatures[0]),
                                                      ...sampleFeatures]),
        });
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

    postValuesToDB = () => {
        if (this.state.currentProject.availability === "unpublished") {
            alert("Please publish the project before starting the survey.");
        } else if (this.state.currentProject.availability === "closed") {
            alert("This project has been closed and is no longer accepting survey input.");
        } else {
            if (this.state.currentPlot.flagged) {
                fetch("/flag-plot",
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
            } else {
                fetch("/add-user-samples",
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
            }
        }
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

    intersection = (array1, array2) => array1.filter(value => array2.includes(value));

    getSelectedSampleIds = (question) => {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];
        const selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig) ? mercator.getSelectedSamples(this.state.mapConfig).getArray() : [];

        return (
            (selectedFeatures.length === 0 && question.answered.length === 0)
            || Object.keys(this.state.userSamples).length === 1
                    ? allFeatures
                    : selectedFeatures
        ).map(sf => sf.get("sampleId"));
    };

    checkRuleTextMatch = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.questionId === questionToSet.id &&
            !RegExp(surveyRule.regex).test(answerText)) {
            return "Text match validation failed: Please enter a regular expression that matches " + surveyRule.regex;
        } else {
            return null;
        }
    };

    checkRuleNumericRange = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.questionId === questionToSet.id &&
            (isNaN(parseInt(answerText)) ||
             parseInt(answerText) < surveyRule.min ||
             parseInt(answerText) > surveyRule.max)) {
            return "Numeric range validation failed: Please select a value between " + surveyRule.min + " and " + surveyRule.max;
        } else {
            return null;
        }
    };

    checkRuleSumOfAnswers = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.questions.includes(questionToSet.id)) {
            const answeredQuestions = this.state.currentProject.surveyQuestions
                .filter(q => surveyRule.questions.includes(q.id) && q.answered.length > 0 && q.id !== questionToSet.id);
            if (surveyRule.questions.length === answeredQuestions.length + 1) {
                const sampleIds = this.getSelectedSampleIds(questionToSet);
                const answeredSampleIds = answeredQuestions.map(q => q.answered.map(a => a.sampleId));
                const commonSampleIds = answeredSampleIds.reduce(this.intersection, sampleIds);
                if (commonSampleIds.length > 0) {
                    return commonSampleIds.map(sampleId => {
                        const answeredSum = answeredQuestions
                            .map(q => q.answered.find(ques => ques.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        if (answeredSum + parseInt(answerText) !== surveyRule.validSum) {
                            return "Sum of answers validation failed: Possible sum for questions ["
                                + surveyRule.questionsText.toString()
                                + "] is "
                                + (surveyRule.validSum - answeredSum).toString()
                                + ".";
                        } else {
                            return null;
                        }
                    }).find(res => res !== null);
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    checkRuleMatchingSums = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.questionSetIds1.includes(questionToSet.id) || surveyRule.questionSetIds2.includes(questionToSet.id)) {
            const answeredQuestions1 = this.state.currentProject.surveyQuestions
                .filter(q => surveyRule.questionSetIds1.includes(q.id) && q.answered.length > 0 && q.id !== questionToSet.id);
            const answeredQuestions2 = this.state.currentProject.surveyQuestions
                .filter(q => surveyRule.questionSetIds2.includes(q.id) && q.answered.length > 0 && q.id !== questionToSet.id);
            if (surveyRule.questionSetIds1.length + surveyRule.questionSetIds2.length === answeredQuestions1.length + answeredQuestions2.length + 1) {
                const sampleIds = this.getSelectedSampleIds(questionToSet);
                const answeredSampleIds1 = answeredQuestions1.map(q => q.answered.map(a => a.sampleId));
                const commonSampleIds1 = answeredSampleIds1.reduce(this.intersection, sampleIds);
                const answeredSampleIds2 = answeredQuestions2.map(q => q.answered.map(a => a.sampleId));
                const commonSampleIds2 = answeredSampleIds2.reduce(this.intersection, sampleIds);
                const commonSampleIds = this.intersection(commonSampleIds1, commonSampleIds2);
                if (commonSampleIds.length > 0) {
                    const sampleSums = commonSampleIds.map(sampleId => {
                        const sum1 = answeredQuestions1
                            .map(q => q.answered.find(a => a.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        const sum2 = answeredQuestions2
                            .map(q => q.answered.find(a => a.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        return [sum1, sum2];
                    });
                    const invalidSum = sampleSums.find(sums =>
                        sums[0] + (surveyRule.questionSetIds1.includes(questionToSet.id) ? parseInt(answerText) : 0)
                        !== sums[1] + (surveyRule.questionSetIds2.includes(questionToSet.id) ? parseInt(answerText) : 0)
                    );
                    if (invalidSum) {
                        return "Matching sums validation failed: Totals of the question sets ["
                                + surveyRule.questionSetText1.toString()
                                + "] and ["
                                + surveyRule.questionSetText2.toString()
                                + "] do not match.\n\nValid total is "
                                + Math.abs(invalidSum[0] - invalidSum[1])
                                + ".";
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    };

    checkRuleIncompatibleAnswers = (surveyRule, questionToSet, answerId, answerText) => {
        if (surveyRule.question1 === questionToSet.id && surveyRule.answer1 === answerId) {
            const ques2 = this.state.currentProject.surveyQuestions.find(q => q.id === surveyRule.question2);
            if (ques2.answered.some(ans => ans.answerId === surveyRule.answer2)) {
                const ques1Ids = this.getSelectedSampleIds(questionToSet);
                const ques2Ids = ques2.answered.filter(ans => ans.answerId === surveyRule.answer2).map(a => a.sampleId);
                const commonSampleIds = this.intersection(ques1Ids, ques2Ids);
                if (commonSampleIds.length > 0) {
                    return "Incompatible answer";
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else if (surveyRule.question2 === questionToSet.id && surveyRule.answer2 === answerId) {
            const ques1 = this.state.currentProject.surveyQuestions.find(q => q.id === surveyRule.question1);
            if (ques1.answered.some(ans => ans.answerId === surveyRule.answer1)) {
                const ques2Ids = this.getSelectedSampleIds(questionToSet);
                const ques1Ids = ques1.answered.filter(ans => ans.answerId === surveyRule.answer1).map(a => a.sampleId);
                const commonSampleIds = this.intersection(ques1Ids, ques2Ids);
                if (commonSampleIds.length > 0) {
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
    };

    ruleFunctions = {
        "text-match":           this.checkRuleTextMatch,
        "numeric-range":        this.checkRuleNumericRange,
        "sum-of-answers":       this.checkRuleSumOfAnswers,
        "matching-sums":        this.checkRuleMatchingSums,
        "incompatible-answers": this.checkRuleIncompatibleAnswers,
    };

    rulesViolated = (questionToSet, answerId, answerText) =>
        this.state.currentProject.surveyRules
        && this.state.currentProject.surveyRules
            .map(surveyRule => this.ruleFunctions[surveyRule.ruleType](surveyRule, questionToSet, answerId, answerText))
            .find(msg => msg);

    checkSelection = (sampleIds, ruleError, questionToSet) => {
        if (!this.plotHasSamples(this.state.currentPlot)) {
            return false;
        } else if (sampleIds.some(sid => questionToSet.visible.every(vs => vs.id !== sid))) {
            alert("Invalid Selection. Try selecting the question before answering.");
            return false;
        } else if (sampleIds.length === 0) {
            alert("You must make a selection after some samples have been answered.");
            return false;
        } else if (ruleError) {
            alert(ruleError);
            return false;
        } else {
            return true;
        }
    };

    setCurrentValue = (questionToSet, answerId, answerText) => {
        const sampleIds = this.getSelectedSampleIds(questionToSet);
        const ruleError = this.rulesViolated(questionToSet, answerId, answerText);

        if (this.checkSelection(sampleIds, ruleError, questionToSet)) {
            const newSamples = sampleIds.reduce((acc, sampleId) => {
                const newQuestion = {
                    questionId: questionToSet.id,
                    answer: answerText,
                    answerId: answerId,
                };

                const childQuestionArray = this.getChildQuestions(questionToSet.id);
                const clearedSubQuestions = Object.entries(this.state.userSamples[sampleId])
                    .filter(entry => !childQuestionArray.includes(entry[0]))
                    .reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {});

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
                        attributes: (this.state.currentImagery.sourceConfig.type === "PlanetDaily")
                            ?
                                {
                                    ...this.state.imageryAttributes,
                                    imageryDatePlanetDaily: mercator.getTopVisiblePlanetLayerDate(
                                        this.state.mapConfig,
                                        this.state.currentImagery.id
                                    ),
                                }
                            : this.state.imageryAttributes,
                    },
                }), {});

            this.setState({
                userSamples: { ...this.state.userSamples, ...newSamples },
                userImages: { ...this.state.userImages, ...newUserImages },
                selectedQuestion: questionToSet,
            });
        }
    };

    setSelectedQuestion = (newSelectedQuestion) => this.setState({ selectedQuestion: newSelectedQuestion });

    invertColor(hex) {
        const deHashed = hex.indexOf("#") === 0 ? hex.slice(1) : hex;
        const hexFormatted = deHashed.length === 3
              ? deHashed[0] + deHashed[0] + deHashed[1] + deHashed[1] + deHashed[2] + deHashed[2]
              : deHashed;

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

    calcVisibleSamples = (currentQuestionId) => {
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

            return this.calcVisibleSamples(parentQuestion)
                .filter(sample => {
                    const sampleAnswer = userSamples[sample.id][parentQuestionText]
                          && userSamples[sample.id][parentQuestionText].answer;
                    return (parentAnswer === -1 && sampleAnswer) || correctAnswerText === sampleAnswer;
                });
        }
    };

    updateQuestionStatus = () => {
        const newSurveyQuestions = this.state.currentProject.surveyQuestions.map(sq => {
            const visibleSamples = this.calcVisibleSamples(sq.id);
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

    unansweredColor = () => (
        <div className="PlotNavigation__change-color row justify-content-center mb-2">
            Unanswered Color
            <div className="form-check form-check-inline">
                <input
                    className="form-check-input ml-2"
                    checked={this.state.sampleOutlineBlack}
                    id="radio1"
                    onChange={() => this.setState({ sampleOutlineBlack: true })}
                    type="radio"
                    name="color-radios"
                />
                <label htmlFor="radio1" className="form-check-label">Black</label>
            </div>
            <div className="form-check form-check-inline">
                <input
                    className="form-check-input"
                    checked={!this.state.sampleOutlineBlack}
                    id="radio2"
                    onChange={() => this.setState({ sampleOutlineBlack: false })}
                    type="radio"
                    name="color-radios"
                />
                <label htmlFor="radio2" className="form-check-label">White</label>
            </div>
        </div>
    );

    toggleShowSidebar = () => {
        this.setState(prevState => ({
            showSidebar: !prevState.showSidebar,
        }), () => {
            window.location = this.state.showSidebar ? "#sidebar" : "#image-analysis-pane";
        });
    };

    toggleQuitModal = () => this.setState({ showQuitModal: !this.state.showQuitModal });

    toggleFlagged = () => {
        this.setState({ currentPlot: { ...this.state.currentPlot, flagged: !this.state.currentPlot.flagged }});
    };

    render() {
        const plotId = this.state.currentPlot.plotId ? this.state.currentPlot.plotId : this.state.currentPlot.id;
        return (
            <div className="row" style={{ height: "-webkit-fill-available" }}>
                <ImageAnalysisPane
                    imageryAttribution={this.state.imageryAttribution}
                    projectId={this.props.projectId}
                    plotId={plotId}
                    loader={this.state.loading}
                />
                <div
                    onClick={this.toggleShowSidebar}
                    className="d-xl-none btn bg-lightgreen"
                    style={{ position: "absolute", zIndex: 99999, right: "2rem", lineHeight: "1rem" }}
                >
                    <div style={{ padding: ".5rem", color: "white" }}>
                        {this.state.showSidebar ? <UnicodeIcon icon="upCaret"/> : <UnicodeIcon icon="downCaret"/>}
                    </div>
                </div>
                <SideBar
                    projectId={this.props.projectId}
                    plotId={plotId}
                    postValuesToDB={this.postValuesToDB}
                    projectName={this.state.currentProject.name}
                    clearAnswers={() => this.resetPlotValues(this.state.currentPlot)}
                    surveyQuestions={this.state.currentProject.surveyQuestions}
                    userName={this.props.userName}
                    isFlagged={this.state.currentPlot && this.state.currentPlot.flagged}
                    isAnalyzed={this.state.currentPlot && this.state.currentPlot.analyses > 0}
                    toggleFlagged={this.toggleFlagged}
                    toggleQuitModal={this.toggleQuitModal}
                >
                    <PlotNavigation
                        plotId={plotId}
                        showNavButtons={this.state.currentPlot.id}
                        nextPlotButtonDisabled={this.state.nextPlotButtonDisabled}
                        prevPlotButtonDisabled={this.state.prevPlotButtonDisabled}
                        reviewPlots={this.state.reviewPlots}
                        goToFirstPlot={this.goToFirstPlot}
                        goToPlot={this.goToPlot}
                        nextPlot={this.nextPlot}
                        prevPlot={this.prevPlot}
                        setReviewPlots={this.setReviewPlots}
                        loadingPlots={this.state.plotList.length === 0}
                        currentPlot={this.state.currentPlot}
                    />
                    <ExternalTools
                        zoomMapToPlot={() => mercator.zoomMapToLayer(this.props.mapConfig, "currentPlot")}
                        showGeoDash={this.showGeoDash}
                        currentPlot={this.state.currentPlot}
                        projectOptions={this.state.currentProject.projectOptions}
                        KMLFeatures={this.state.KMLFeatures}
                    />
                    {this.state.currentPlot.id && this.state.currentProject.projectOptions.showPlotInformation &&
                        <PlotInformation extraPlotInfo={this.state.currentPlot.extraPlotInfo}/>
                    }
                    <ImageryOptions
                        mapConfig={this.state.mapConfig}
                        imageryList={this.state.imageryList}
                        setBaseMapSource={this.setBaseMapSource}
                        setImageryAttribution={this.setImageryAttribution}
                        setImageryAttributes={this.setImageryAttributes}
                        currentImageryId={this.state.currentImagery.id}
                        currentPlot={this.state.currentPlot}
                        currentProject={this.state.currentProject}
                        currentProjectBoundary={this.state.currentProject.boundary}
                        showPlanetDaily={this.state.currentPlot.plotId}
                        loadingImages={this.state.imageryList.length === 0}
                    />
                    {this.state.currentPlot.id
                        ?
                            <>
                                <SurveyCollection
                                    selectedQuestion={this.state.selectedQuestion}
                                    surveyQuestions={this.state.currentProject.surveyQuestions}
                                    surveyRules={this.state.currentProject.surveyRules}
                                    isFlagged={this.state.currentPlot && this.state.currentPlot.flagged}
                                    setCurrentValue={this.setCurrentValue}
                                    setSelectedQuestion={this.setSelectedQuestion}
                                    selectedSampleId={Object.keys(this.state.userSamples).length === 1
                                        ? parseInt(Object.keys(this.state.userSamples)[0])
                                        : this.state.selectedSampleId}
                                />
                                {this.unansweredColor()}
                            </>
                        :
                            <fieldset className="mb-3 justify-content-center text-center">
                                <h3>Survey Questions</h3>
                                <p>Please go to a plot to see survey questions</p>
                            </fieldset>
                    }
                </SideBar>
                {this.state.showQuitModal &&
                    <QuitMenu
                        userId={this.props.userId}
                        projectId={this.props.projectId}
                        toggleQuitModal={this.toggleQuitModal}
                    />
                }
                {this.state.plotList.length === 0 &&
                    <div id="spinner" style={{ top: "45%", left: "38%" }}/>
                }
            </div>
        );
    }
}

function ImageAnalysisPane({ loader, imageryAttribution }) {
    return (
        // Mercator hooks into image-analysis-pane
        <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
            {loader ? <div id="spinner" style={{ top: "45%", zIndex: "5000", visibility: "visible" }}></div> : null }
            <div id="imagery-info" className="row" style={{ justifyContent: "center" }}>
                <p style={{ fontSize: ".9rem", marginBottom: "0" }}>{imageryAttribution}</p>
            </div>
        </div>
    );
}

function SideBar(props) {
    const saveValuesButtonEnabled = props.isFlagged || props.surveyQuestions.every(sq => sq.visible && sq.visible.length === sq.answered.length);

    const saveButtonGroup = () => (
        <>
            <input
                className="btn btn-outline-lightgreen btn-sm btn-block"
                type="button"
                value="Save"
                onClick={props.postValuesToDB}
                style={{ opacity: saveValuesButtonEnabled ? "1.0" : ".25" }}
                disabled={!saveValuesButtonEnabled}
            />
            <div className="my-2 d-flex justify-content-between">
                <input
                    className="btn btn-outline-danger btn-sm col mr-1"
                    type="button"
                    value={props.isFlagged ? "Unflag Plot" : "Flag Plot"}
                    onClick={props.toggleFlagged}
                />
                <input
                    className="btn btn-outline-danger btn-sm col"
                    type="button"
                    value={props.isAnalyzed ? "Clear Changes" : "Clear All"}
                    onClick={props.clearAnswers}
                />
            </div>
        </>
    );

    return (
        <div id="sidebar" className="col-xl-3 border-left full-height" style={{ overflowY: "scroll", overflowX: "hidden" }}>
            <ProjectTitle
                projectId={props.projectId}
                plotId={props.plotId}
                userName={props.userName}
                projectName={props.projectName || ""}
            />
            {props.children}

            <div className="row">
                <div className="col-sm-12 btn-block">
                    {props.plotId && saveButtonGroup()}
                    <button
                        id="collection-quit-button"
                        className="btn btn-outline-danger btn-block btn-sm mb-4"
                        type="button"
                        name="collection-quit"
                        onClick={props.toggleQuitModal}
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
        if (this.props.plotId !== prevProps.plotId) this.setState({ newPlotInput: this.props.plotId });
    }

    updateNewPlotId = (value) => this.setState({ newPlotInput: value });

    gotoButton = () => (
        <div className="PlotNavigation__first row mb-2" id="go-to-first-plot">
            <div className="col">
                <input
                    id="go-to-first-plot-button"
                    className="btn btn-outline-lightgreen btn-sm btn-block"
                    type="button"
                    name="new-plot"
                    value="Go to first plot"
                    onClick={this.props.goToFirstPlot}
                />
            </div>
        </div>
    );

    navButtons = () => (
        <div className="PlotNavigation__nav-buttons row justify-content-center" id="plot-nav">
            <button
                className="btn btn-outline-lightgreen btn-sm"
                type="button"
                onClick={this.props.prevPlot}
                style={{ opacity: this.props.prevPlotButtonDisabled ? "0.25" : "1.0" }}
                disabled={this.props.prevPlotButtonDisabled}
            >
                <UnicodeIcon icon="leftCaret"/>
            </button>
            <button
                className="btn btn-outline-lightgreen btn-sm mx-1"
                type="button"
                onClick={this.props.nextPlot}
                style={{ opacity: this.props.nextPlotButtonDisabled ? "0.25" : "1.0" }}
                disabled={this.props.nextPlotButtonDisabled}
            >
                <UnicodeIcon icon="rightCaret"/>
            </button>
            <input
                type="text"
                id="plotId"
                autoComplete="off"
                className="col-4 px-0 ml-2 mr-1"
                value={this.state.newPlotInput}
                onChange={e => this.updateNewPlotId(e.target.value)}
            />
            <button
                className="btn btn-outline-lightgreen btn-sm"
                type="button"
                onClick={() => this.props.goToPlot(this.state.newPlotInput)}
            >
                Go to plot
            </button>
        </div>
    );

    render() {
        const { props } = this;
        return (
            <div className="text-center mt-2">
                {props.loadingPlots
                    ? <h3>Loading plot data...</h3>
                    : this.props.showNavButtons
                        ? this.navButtons()
                        : this.gotoButton()
                }
                <div className="PlotNavigation__review-option row justify-content-center mb-1">
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
            </div>
        );
    }
}

class ExternalTools extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showExternalTools: true,
            auxWindow: null,
        };
    }

    geoButtons = () => (
        <div className="ExternalTools__geo-buttons d-flex justify-content-between mb-2" id="plot-nav">
            <input
                className="btn btn-outline-lightgreen btn-sm col-6 mr-1"
                type="button"
                value="Re-Zoom"
                onClick={this.props.zoomMapToPlot}
            />
            <input
                className="btn btn-outline-lightgreen btn-sm col-6"
                type="button"
                value="Geodash"
                onClick={this.props.showGeoDash}
            />
        </div>
    );

    loadGEEScript = () => {
        const urlParams = this.props.currentPlot.geom
            ? "geoJson=" + this.props.currentPlot.geom
            : this.props.currentProject.plotShape === "circle"
                ?
                    "center=["
                        + mercator.parseGeoJson(this.props.currentPlot.center).getCoordinates()
                        + "];radius=" + this.props.currentProject.plotSize / 2
                :
                    "geoJson=" + mercator.geometryToGeoJSON(
                        mercator.getPlotPolygon(
                            this.props.currentPlot.center,
                            this.props.currentProject.plotSize,
                            this.props.currentProject.plotShape
                        ),
                        "EPSG:4326",
                        "EPSG:3857",
                        5
                    );
        if (this.state.auxWindow) this.state.auxWindow.close();
        this.setState({
            auxWindow: window.open("https://billyz313.users.earthengine.app/view/ceoplotancillary#" + urlParams,
                                   "_ceo-plot-ancillary"),
        });
    };

    geeButton = () => (
        <input
            className="btn btn-outline-lightgreen btn-sm btn-block my-2"
            type="button"
            value="Go to GEE Script"
            onClick={this.loadGEEScript}
        />
    );

    kmlButton = () => (
        <a
            className="btn btn-outline-lightgreen btn-sm btn-block my-2"
            href={"data:earth.kml+xml application/vnd.google-earth.kmz, "
                + encodeURIComponent(this.props.KMLFeatures)}
            download={"ceo_" + this.props.projectId + "_" + this.props.plotId + ".kml"}
        >
            Download Plot KML
        </a>
    );

    render() {
        return this.props.currentPlot.id ? (
            <>
                <CollapsibleTitle
                    title={"External Tools"}
                    showGroup={this.state.showExternalTools}
                    toggleShow={() => this.setState({ showExternalTools: !this.state.showExternalTools })}
                />
                {this.state.showExternalTools &&
                    <div className="mx-1">
                        {this.geoButtons()}
                        {this.props.KMLFeatures && this.kmlButton()}
                        {this.props.projectOptions.showGEEScript && this.geeButton()}
                    </div>
                }
            </>
        ) : null;
    }
}

class PlotInformation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showInfo: false,
        };
    }

    render() {
        const hasExtraInfo = Object.values(this.props.extraPlotInfo)
            .filter(value => value && !(value instanceof Object)).length > 0;
        return (
            <>
                <CollapsibleTitle
                    title="Plot Information"
                    showGroup={this.state.showInfo}
                    toggleShow={() => this.setState({ showInfo: !this.state.showInfo })}
                />
                {this.state.showInfo
                    ? hasExtraInfo
                        ?
                            <ul className="mb-3 mx-1">
                                {Object.entries(this.props.extraPlotInfo)
                                    .filter(([key, value]) => value && !(value instanceof Object))
                                    .map(([key, value]) => <li key={key}>{key} - {value}</li>)}
                            </ul>
                        :
                            <div className="mb-3">There is no extra information for this plot.</div>
                    : null
                }
            </>
        );
    }

}

class ImageryOptions extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showImageryOptions: true,
        };
    }

    render() {
        const { props } = this;
        const commonProps = {
            mapConfig: props.mapConfig,
            setImageryAttribution: props.setImageryAttribution,
            setImageryAttributes: props.setImageryAttributes,
            currentPlot: props.currentPlot,
            currentProjectBoundary: props.currentProjectBoundary,
            extent: props.currentPlot.id && props.currentProject.id
                ? props.currentPlot.geom
                    ? mercator.parseGeoJson(props.currentPlot.geom, true).getExtent()
                    : mercator.getPlotPolygon(props.currentPlot.center,
                                              props.currentProject.plotSize,
                                              props.currentProject.plotShape).getExtent()
                : [],
        };
        const filteredImageryList = props.showPlanetDaily
            ? props.imageryList
            : props.imageryList.filter(layerConfig => layerConfig.sourceConfig.type !== "PlanetDaily");

        return (
            <div className="justify-content-center text-center">
                <CollapsibleTitle
                    title="Imagery Options"
                    showGroup={this.state.showImageryOptions}
                    toggleShow={() => this.setState({ showImageryOptions: !this.state.showImageryOptions })}
                />
                <div className="mx-1">
                    {props.loadingImages && <h3>Loading imagery data...</h3>}
                    {this.state.showImageryOptions && !props.loadingImages && props.currentImageryId &&
                        <select
                            className="form-control form-control-sm mb-2"
                            id="base-map-source"
                            name="base-map-source"
                            size="1"
                            value={props.currentImageryId || ""}
                            onChange={e => props.setBaseMapSource(parseInt(e.target.value))}
                        >
                            {filteredImageryList
                                .map(imagery => <option key={imagery.id} value={imagery.id}>{imagery.title}</option>)}
                        </select>
                    }
                    {props.currentImageryId && filteredImageryList.map(imagery => {
                        const individualProps = {
                            ...commonProps,
                            key: imagery.id,
                            thisImageryId: imagery.id,
                            sourceConfig: imagery.sourceConfig,
                            visible: props.currentImageryId === imagery.id && this.state.showImageryOptions,
                        };
                        return imagery.sourceConfig.type === "Planet" ? <PlanetMenus {...individualProps}/>
                            : imagery.sourceConfig.type === "PlanetDaily" ? <PlanetDailyMenus {...individualProps}/>
                            : imagery.sourceConfig.type === "SecureWatch" ? <SecureWatchMenus {...individualProps}/>
                            : imagery.sourceConfig.type === "Sentinel1" ? <SentinelMenus {...individualProps}/>
                            : imagery.sourceConfig.type === "Sentinel2" ? <SentinelMenus {...individualProps}/>
                            : imagery.sourceConfig.type === "GEEImage" ? <GEEImageMenus {...individualProps}/>
                            : imagery.sourceConfig.type === "GEEImageCollection" ? <GEEImageCollectionMenus {...individualProps}/>
                            : null;
                    })}
                </div>
            </div>
        );
    }
}

class ProjectTitle extends React.Component {
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

    render() {
        const { props } = this;
        return (
            <div style={{ height: "3rem", cursor: "default" }} onClick={() => this.setState({ showStats: !this.state.showStats })}>
                <h2
                    className="header overflow-hidden text-truncate"
                    title={props.projectName}
                    style={{ height: "100%", marginBottom: "0" }}
                >
                    <UnicodeIcon icon="downCaret"/>{" " + props.projectName}
                </h2>
                {this.state.showStats &&
                <ProjectStats
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
        fetch(`/get-project-stats?projectId=${this.props.projectId}`)
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
            <div
                className="row"
                style={{
                    backgroundColor: "#f1f1f1",
                    boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
                    cursor: "default",
                    marginLeft: "2rem",
                    overflow: "auto",
                    position: "absolute",
                    zIndex: "10",
                }}
            >
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
function QuitMenu({ userId, projectId, toggleQuitModal }) {
    return (
        <div
            className="modal fade show"
            style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            id="quitModal"
            onClick={toggleQuitModal}
        >
            <div
                className="modal-dialog modal-dialog-centered"
                role="document"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-content" id="quitModalContent">
                    <div className="modal-header">
                        <h5 className="modal-title" id="quitModalTitle">Confirmation</h5>
                        <button
                            type="button"
                            className="close"
                            aria-label="Close"
                            onClick={toggleQuitModal}
                        >
                            &times;
                        </button>
                    </div>
                    <div className="modal-body">
                        Are you sure you want to stop collecting data?
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={toggleQuitModal}
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            className="btn bg-lightgreen btn-sm"
                            id="quit-button"
                            onClick={() =>
                                fetch(
                                    `/release-plot-locks?userId=${userId}&projectId=${projectId}`,
                                    { method: "POST" }
                                )
                                    .then(() => window.location = "/home")
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
        <NavigationBar userName={args.userName} userId={args.userId}>
            <Collection
                userId={args.userId === "" ? -1 : parseInt(args.userId)}
                userName={args.userName}
                projectId={args.projectId}
            />
        </NavigationBar>,
        document.getElementById("collection")
    );
}
