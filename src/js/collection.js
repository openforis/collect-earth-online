import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";

import {LoadingModal, NavigationBar} from "./components/PageComponents";
import {SurveyCollection} from "./components/SurveyCollection";
import {
    PlanetMenu,
    PlanetDailyMenu,
    PlanetNICFIMenu,
    SecureWatchMenu,
    SentinelMenu,
    GEEImageMenu,
    GEEImageCollectionMenu
} from "./imagery/collectionMenuControls";
import {CollapsibleTitle} from "./components/FormComponents";
import Modal from "./components/Modal";
import Select from "./components/Select";
import Switch from "./components/Switch";
import {ButtonSvgIcon} from "./components/SvgIcon";

import {UnicodeIcon, getQueryString, safeLength, isNumber, invertColor, asPercentage, isArray} from "./utils/generalUtils";
import {getProjectPreferences, setProjectPreferences} from "./utils/preferences";
import {mercator} from "./utils/mercator";

class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            collectionStart: 0,
            currentProject: {surveyQuestions: [], institution: ""},
            currentImagery: {id: "", sourceConfig: {}},
            currentPlot: {},
            currentUserId: -1,
            // attribution for showing in the map
            imageryAttribution: "",
            // attributes to record when sample is saved
            imageryAttributes: {},
            imageryList: [],
            inReviewMode: false,
            mapConfig: null,
            messageBox: null,
            plotList: [],
            plotters: [],
            unansweredColor: "black",
            selectedQuestion: {id: 0, question: "", answers: []},
            selectedSampleId: -1,
            userSamples: {},
            originalUserSamples: {},
            userImages: {},
            storedInterval: null,
            KMLFeatures: null,
            showSidebar: false,
            showQuitModal: false,
            answerMode: "question",
            modalMessage: null,
            navigationMode: "natural",
            threshold: 90
        };
    }

    componentDidMount() {
        window.name = "_ceo_collection";
        window.addEventListener("beforeunload", this.unsavedWarning, {capture: true});

        fetch(
            `/release-plot-locks?projectId=${this.props.projectId}`,
            {method: "POST"}
        );

        this.getProjectData();
    }

    componentDidUpdate(prevProps, prevState) {
        //
        // Initialize after apis return.
        //

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
            this.showProjectOverview();
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
            if (this.state.currentProject.hasGeoDash
                && this.state.currentProject.projectOptions.autoLaunchGeoDash) {
                this.showGeoDash();
            }
            clearInterval(this.state.storedInterval);
            this.setState({storedInterval: setInterval(this.resetPlotLock, 2.3 * 60 * 1000)});
            //  updateMapImagery is poorly named, this function is detecting if we need to show the "zoom to" overlay
            this.updateMapImagery();
        }

        // Conditions required for samples to be shown
        if (this.state.currentPlot.id
            && this.state.selectedQuestion.visible) {
            // Changing conditions for which samples need to be re-drawn
            if (this.state.selectedQuestion.id !== prevState.selectedQuestion.id
                || this.state.unansweredColor !== prevState.unansweredColor
                || this.state.userSamples !== prevState.userSamples
                || this.state.selectedQuestion.visible !== prevState.selectedQuestion.visible) {
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

        //  updateMapImagery is poorly named, this action is detecting if we need to show the "zoom to" overlay
        if (this.state.mapConfig && this.state.currentImagery.id
            && (this.state.currentImagery.id !== prevState.currentImagery.id
                || this.state.mapConfig !== prevState.mapConfig)) {
            this.updateMapImagery();
        }
    }

    componentWillUnmount() {
        window.removeEventListener("beforeunload", this.unsavedWarning, {capture: true});
    }

    setImageryAttribution = attributionSuffix => this.setState({
        imageryAttribution: this.state.currentImagery.attribution + attributionSuffix
    });

    setImageryAttributes = newImageryAttributes => this.setState({imageryAttributes: newImageryAttributes});

    processModal = (message, callBack) => new Promise(() => Promise.resolve(
        this.setState(
            {modalMessage: message},
            () => callBack().finally(() => this.setState({modalMessage: null}))
        )
    ));

    showAlert = ({title, body, closeText = "Close"}) => this.setState({
        messageBox: {
            body,
            closeText,
            title,
            type: "alert"
        }
    });

    getProjectData = () => this.processModal(
        "Loading project details",
        () => Promise.all([
            this.getProjectById(),
            this.getProjectPlots(),
            this.getImageryList(),
            this.getPlotters()
        ])
            .then(() => {
                const reviewWarning = this.state.inReviewMode ? "You are currently in 'Review Mode.'" : "";
                if (this.state.currentProject.availability === "unpublished") {
                    this.showAlert({
                        title: "Warning: Draft Mode",
                        body: "This project is in draft mode. Only admins can collect. Any plot collections will be erased when the project is published.\n" + reviewWarning,
                        closeText: "OK, I understand"
                    });
                } else if (this.state.currentProject.availability === "closed") {
                    this.showAlert({
                        title: "Project Closed",
                        body: "This project has been closed. Admins can make corrections to any plot.\n " + reviewWarning
                    });
                } else if (this.state.inReviewMode) {
                    this.showAlert({
                        title: "Review Mode",
                        body: reviewWarning
                    });
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            })
    );

    getProjectById = () => fetch(`/get-project-by-id?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(project => {
            // TODO This logic is currently invalid since this route can never return an archived project.
            if (project.id > 0 && project.availability !== "archived") {
                this.setState({currentProject: project});
                const {inReviewMode} = getProjectPreferences(project.id);
                this.setReviewMode(project.isProjectAdmin
                    && (inReviewMode || (project.availability === "closed" && inReviewMode !== false)));
                return Promise.resolve("resolved");
            } else {
                return Promise.reject(
                    project.availability === "archived"
                        ? "This project is archived"
                        : "No project found with ID " + this.props.projectId + "."
                );
            }
        });

    // TODO, this can easily be a part of get-project-by-id
    getProjectPlots = () => fetch(`/get-project-plots?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => {
            if (data.length > 0) {
                this.setState({plotList: data});
                return Promise.resolve("resolved");
            } else {
                return Promise.reject("No plot information found");
            }
        });

    getImageryList = () => fetch(`/get-project-imagery?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => {
            if (data.length > 0) {
                this.setState({imageryList: data});
                return Promise.resolve("resolved");
            } else {
                return Promise.reject("No project imagery found");
            }
        });

    getPlotters = () => fetch(`/get-plotters?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(data => {
            if (isArray(data)) {
                this.setState({plotters: data});
                return Promise.resolve("resolved");
            } else {
                return Promise.reject("Error getting plotter data.");
            }
        });

    initializeProjectMap = () => {
        const mapConfig = mercator.createMap("image-analysis-pane",
                                             [0.0, 0.0],
                                             1,
                                             this.state.imageryList,
                                             this.state.currentProject.boundary);
        mercator.addVectorLayer(
            mapConfig,
            "currentAOI",
            mercator.geometryToVectorSource(
                mercator.parseGeoJson(this.state.currentProject.boundary, true)
            ),
            mercator.ceoMapStyles("geom", "yellow")
        );
        mercator.zoomMapToLayer(mapConfig, "currentAOI", 48);
        this.setState({mapConfig});
    };

    showProjectOverview = () => {
        mercator.addPlotLayer(this.state.mapConfig,
                              this.state.plotList,
                              feature => {
                                  this.getPlotData(feature.get("features")[0].get("plotId"), "id");
                              });
    };

    setBaseMapSource = newBaseMapSource => {
        // remove planet daily layer switcher
        mercator.currentMap.getControls().getArray()
            .filter(control => control.element.classList.contains("planet-layer-switcher"))
            .map(control => mercator.currentMap.removeControl(control));
        this.setState({
            currentImagery: this.getImageryById(newBaseMapSource)
        }, () => {
            // all other than having separate menu components
            if (!["Planet", "PlanetDaily", "SecureWatch", "Sentinel1", "Sentinel2", "GEEImage", "GEEImageCollection"]
                .includes(this.state.currentImagery.sourceConfig.type)) {
                this.setImageryAttribution("");
            }
        });
    };

    updateMapImagery = () => {
        const {currentPlot, mapConfig, currentImagery} = this.state;
        mercator.setVisibleLayer(this.state.mapConfig, this.state.currentImagery.id);
        if (currentPlot && !currentPlot.id && ["PlanetDaily", "SecureWatch"].includes(currentImagery.sourceConfig.type)) {
            mercator.setLayerVisibilityByLayerId(mapConfig, "goToPlot", true);
        } else {
            mercator.setLayerVisibilityByLayerId(mapConfig, "goToPlot", false);
        }
    };

    getImageryById = imageryId => this.state.imageryList.find(imagery => imagery.id === imageryId);

    warnOnNoSamples = plotData => {
        if (plotData.samples.length === 0 && !this.state.currentProject.allowDrawnSamples) {
            alert("This plot has no samples. Please flag the plot.");
            return false;
        } else {
            return true;
        }
    };

    getPlotData = (visibleId, direction, forcedNavMode = null) => {
        const {currentUserId, navigationMode, inReviewMode, threshold} = this.state;
        const {projectId} = this.props;
        this.processModal(
            "Getting plot",
            () => fetch("/get-collection-plot?" + getQueryString({
                visibleId,
                projectId,
                navigationMode: forcedNavMode || navigationMode,
                direction,
                inReviewMode,
                threshold,
                currentUserId
            }))
                .then(response => (response.ok ? response.json() : Promise.reject(response)))
                .then(data => {
                    if (data === "not-found") {
                        alert((direction === "id" ? "Plot not" : "No more plots") + " found for this navigation mode.");
                    } else {
                        this.setState({
                            userPlotList: data,
                            currentPlot: data[0],
                            currentUserId: data[0].userId,
                            ...this.newPlotValues(data[0]),
                            answerMode: "question"
                        });
                        // TODO, this is probably redundant.  Projects are not allowed to be created with no samples.
                        this.warnOnNoSamples(data[0]);
                    }
                })
                .catch(response => {
                    console.error(response);
                    alert("Error retrieving plot data. See console for details.");
                })
        );
    };

    hasChanged = () => !(_.isEqual(this.state.userSamples, this.state.originalUserSamples));

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
    unsavedWarning = e => {
        if (this.hasChanged()) {
            e.preventDefault();
            e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
            return "You have unsaved changes. Are you sure you want to leave?";
        }
    };

    confirmUnsaved = () => !this.hasChanged()
        || confirm("You have unsaved changes. Any unsaved responses will be lost. Are you sure you want to continue?");

    navToFirstPlot = () => this.getPlotData(
        -10000000,
        "next",
        this.state.navigationMode === "natural" && "unanalyzed"
    );

    navToNextPlot = ignoreCheck => {
        if (ignoreCheck || this.confirmUnsaved()) {
            this.getPlotData(this.state.currentPlot.visibleId, "next");
        }
    };

    navToPrevPlot = () => {
        if (this.confirmUnsaved()) {
            this.getPlotData(this.state.currentPlot.visibleId, "previous");
        }
    };

    navToPlot = newPlot => {
        if (!isNaN(newPlot)) {
            if (this.confirmUnsaved()) {
                this.getPlotData(newPlot, "id");
            }
        } else {
            alert("Please enter a number to go to plot.");
        }
    };

    resetPlotLock = () => {
        fetch("/reset-plot-lock",
              {
                  method: "POST",
                  headers: {
                      "Accept": "application/json",
                      "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                      plotId: this.state.currentPlot.id,
                      projectId: this.props.projectId
                  })
              })
            .then(response => {
                if (!response.ok) {
                    console.log(response);
                    alert("Error maintaining plot lock. Your work may get overwritten. See console for details.");
                }
            });
    };

    resetPlotValues = () => {
        this.setState(this.newPlotValues(this.state.currentPlot, false));
        this.resetUnsavedWarning();
    };

    newPlotValues = (newPlot, copyValues = true) => ({
        newPlotInput: newPlot.visibleId,
        userSamples: newPlot.samples
            ? newPlot.samples.reduce((acc, cur) =>
                ({...acc, [cur.id]: copyValues ? (cur.savedAnswers || {}) : {}}), {})
            : {},
        originalUserSamples: newPlot.samples
            ? copyValues
                ? newPlot.samples.reduce((acc, cur) =>
                    ({...acc, [cur.id]: (cur.savedAnswers || {})}), {})
                : this.state.originalUserSamples
            : {},
        userImages: newPlot.samples
            ? newPlot.samples.reduce((acc, cur) =>
                ({...acc, [cur.id]: copyValues ? (cur.userImage || {}) : {}}), {})
            : {},
        selectedQuestion: {
            ...this.state.currentProject.surveyQuestions
                .sort((a, b) => a.id - b.id)
                .find(surveyNode => surveyNode.parentQuestion === -1),
            visible: null
        },
        collectionStart: Date.now(),
        unansweredColor: "black"
    });

    zoomToPlot = () => mercator.zoomMapToLayer(this.state.mapConfig, "currentPlot", 36);

    showProjectPlot = () => {
        const {currentPlot, mapConfig, currentProject} = this.state;

        mercator.disableSelection(mapConfig);
        mercator.removeLayerById(mapConfig, "currentPlots");
        mercator.removeLayerById(mapConfig, "currentPlot");
        mercator.removeLayerById(mapConfig, "currentSamples");
        mercator.removeLayerById(mapConfig, "drawLayer");
        mercator.addVectorLayer(
            mapConfig,
            "currentPlot",
            mercator.geometryToVectorSource(
                currentPlot.plotGeom.includes("Point")
                    ? mercator.getPlotPolygon(currentPlot.plotGeom,
                                              currentProject.plotSize,
                                              currentProject.plotShape)
                    : mercator.parseGeoJson(currentPlot.plotGeom, true)
            ),
            mercator.ceoMapStyles("geom", "yellow")
        );

        this.zoomToPlot();
    };

    showPlotSamples = () => {
        const {mapConfig, unansweredColor, selectedQuestion: {visible}} = this.state;
        mercator.disableSelection(mapConfig);
        mercator.disableDrawing(mapConfig);
        mercator.removeLayerById(mapConfig, "currentSamples");
        mercator.removeLayerById(mapConfig, "drawLayer");
        mercator.addVectorLayer(
            mapConfig,
            "currentSamples",
            mercator.samplesToVectorSource(visible),
            mercator.ceoMapStyles("geom", unansweredColor)
        );
        mercator.enableSelection(
            mapConfig,
            "currentSamples",
            sampleId => this.setState({selectedSampleId: sampleId})
        );
    };

    featuresToDrawLayer = drawTool => {
        const {mapConfig, currentPlot} = this.state;
        mercator.disableDrawing(mapConfig);
        mercator.removeLayerById(mapConfig, "currentSamples");
        mercator.removeLayerById(mapConfig, "drawLayer");
        mercator.addVectorLayer(
            mapConfig,
            "drawLayer",
            mercator.samplesToVectorSource(currentPlot.samples),
            mercator.ceoMapStyles("draw", "orange")
        );
        mercator.enableDrawing(mapConfig, "drawLayer", drawTool);
    };

    featuresToSampleLayer = () => {
        const {mapConfig, userSamples, userImages, currentPlot} = this.state;
        mercator.disableDrawing(mapConfig);
        const allFeatures = mercator.getAllFeatures(mapConfig, "drawLayer") || [];
        const existingIds = allFeatures.map(f => f.get("sampleId")).filter(id => id);
        const getMax = samples => Math.max(0, ...existingIds, ...samples.map(s => s.id));
        const newSamples = allFeatures.reduce((acc, cur) => {
            const sampleId = cur.get("sampleId");
            if (sampleId) {
                return [...acc,
                        {
                            id: sampleId,
                            sampleGeom: mercator.geometryToGeoJSON(cur.getGeometry(), "EPSG:4326", "EPSG:3857")
                        }];
            } else {
                const nextId = getMax(acc) + 1;
                return [...acc,
                        {
                            id: nextId,
                            sampleGeom: mercator.geometryToGeoJSON(cur.getGeometry(), "EPSG:4326", "EPSG:3857")
                        }];
            }
        }, []);

        this.setState({
            currentPlot: {...currentPlot, samples: newSamples},
            userSamples: newSamples.reduce((acc, cur) => {
                acc[cur.id] = userSamples[cur.id] || {};
                return acc;
            }, {}),
            userImages: newSamples.reduce((acc, cur) => {
                acc[cur.id] = userImages[cur.id] || {};
                return acc;
            }, {})
        });
    };

    showGeoDash = () => {
        const {currentPlot, mapConfig, currentProject} = this.state;
        const plotRadius = currentProject.plotSize
            ? currentProject.plotSize / 2.0
            : mercator.getViewRadius(mapConfig);
        window.open("/geo-dash?"
                    + `institutionId=${this.state.currentProject.institution}`
                    + `&projectId=${this.props.projectId}`
                    + `&visiblePlotId=${currentPlot.visibleId}`
                    + `&plotId=${currentPlot.id}`
                    + `&aoi=${encodeURIComponent(`[${mercator.getViewExtent(mapConfig)}]`)}`
                    + `&plotShape=${currentPlot.plotGeom.includes("Point") ? currentProject.plotShape : "polygon"}`
                    + `&center=${currentPlot.plotGeom.includes("Point") ? currentPlot.plotGeom : ""}`
                    + `&radius=${plotRadius}`,
                    `_geo-dash_${this.props.projectId}`);
    };

    createPlotKML = () => {
        const plotFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentPlot");
        const sampleFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples");
        this.setState({
            KMLFeatures: mercator.getKMLFromFeatures([mercator.asPolygonFeature(plotFeatures[0]),
                                                      ...sampleFeatures])
        });
    };

    setNavigationMode = newMode => this.setState({navigationMode: newMode});

    setReviewMode = inReviewMode => {
        const {currentProject} = this.state;
        this.setState({inReviewMode});
        setProjectPreferences(currentProject.id, {inReviewMode});
        if (inReviewMode && this.state.navigationMode === "natural") {
            this.setNavigationMode("analyzed");
        } else if (!inReviewMode && ["qaqc", "user"].includes(this.state.navigationMode)) {
            this.setNavigationMode("natural");
        }
    };

    setThreshold = threshold => this.setState({threshold});

    setCurrentUserId = currentUserId => {
        const {userPlotList} = this.state;
        const newPlot = (userPlotList || []).find(p => p.userId === currentUserId);
        if (newPlot) {
            this.setState({
                currentUserId,
                currentPlot: newPlot,
                ...this.newPlotValues(newPlot)
            });
        } else {
            this.setState({currentUserId});
        }
    };

    hasAnswers = () => _.some(Object.values(this.state.userSamples), sample => !(_.isEmpty(sample)))
        || _.some(Object.values(this.state.userSamples), sample => !(_.isEmpty(sample)));

    confirmFlag = () => !this.hasAnswers() || confirm("Flagging this plot will delete your previous answers. Are you sure you want to continue?");

    postValuesToDB = () => {
        if (this.state.currentPlot.flagged) {
            if (this.confirmFlag()) {
                this.processModal(
                    "Saving flagged plot",
                    () => fetch(
                        "/flag-plot",
                        {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                projectId: this.props.projectId,
                                plotId: this.state.currentPlot.id,
                                collectionStart: this.state.collectionStart,
                                flaggedReason: this.state.currentPlot.flaggedReason,
                                inReviewMode: this.state.inReviewMode,
                                currentUserId: this.state.currentUserId
                            })
                        }
                    )
                        .then(response => {
                            if (response.ok) {
                                return this.navToNextPlot(true);
                            } else {
                                console.log(response);
                                alert("Error flagging plot as bad. See console for details.");
                            }
                        })
                );
            }
        } else {
            this.processModal(
                "Saving plot answers",
                () => fetch(
                    "/add-user-samples",
                    {
                        method: "post",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            projectId: this.props.projectId,
                            plotId: this.state.currentPlot.id,
                            confidence: this.state.currentProject.projectOptions.collectConfidence
                                ? this.state.currentPlot.confidence
                                : -1,
                            collectionStart: this.state.collectionStart,
                            userSamples: this.state.userSamples,
                            userImages: this.state.userImages,
                            plotSamples: this.state.currentProject.allowDrawnSamples
                                && this.state.currentPlot.samples,
                            inReviewMode: this.state.inReviewMode,
                            currentUserId: this.state.currentUserId
                        })
                    }
                )
                    .then(response => {
                        if (response.ok) {
                            return this.navToNextPlot(true);
                        } else {
                            console.log(response);
                            alert("Error saving your assignments to the database. See console for details.");
                        }
                    })
            );
        }
    };

    getChildQuestions = currentQuestionId => {
        const {surveyQuestions} = this.state.currentProject;
        const {question, id} = surveyQuestions.find(sq => sq.id === currentQuestionId);
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

    getSelectedSampleIds = question => {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];
        const selectedSamples = mercator.getSelectedSamples(this.state.mapConfig);
        const selectedFeatures = selectedSamples ? selectedSamples.getArray() : [];
        return (
            (selectedFeatures.length === 0 && question.answered.length === 0)
            || Object.keys(this.state.userSamples).length === 1
                ? allFeatures
                : selectedFeatures
        ).map(sf => sf.get("sampleId"));
    };

    checkSelection = (sampleIds, questionToSet) => {
        if (!this.warnOnNoSamples(this.state.currentPlot)) {
            return false;
        } else if (sampleIds.some(sid => questionToSet.visible.every(vs => vs.id !== sid))) {
            alert("Invalid Selection. Try selecting the question before answering.");
            return false;
        } else if (sampleIds.length === 0) {
            alert("Please select at least one sample before choosing an answer.");
            return false;
        } else {
            return true;
        }
    };

    setCurrentValue = (questionToSet, answerId, answerText) => {
        const sampleIds = this.getSelectedSampleIds(questionToSet);

        if (this.checkSelection(sampleIds, questionToSet)) {
            const newSamples = sampleIds.reduce((acc, sampleId) => {
                const newQuestion = {
                    questionId: questionToSet.id,
                    answer: answerText,
                    answerId
                };

                const childQuestionArray = this.getChildQuestions(questionToSet.id);
                const clearedSubQuestions = Object.entries(this.state.userSamples[sampleId])
                    .filter(entry => !childQuestionArray.includes(entry[0]))
                    .reduce((acc2, cur) => ({...acc2, [cur[0]]: cur[1]}), {});

                return {
                    ...acc,
                    [sampleId]: {
                        ...clearedSubQuestions,
                        [questionToSet.question]: newQuestion
                    }
                };
            }, {});

            const newUserImages = sampleIds
                .reduce((acc, sampleId) => ({
                    ...acc,
                    [sampleId]: {
                        id: this.state.currentImagery.id,
                        attributes: (this.state.currentImagery.sourceConfig.type === "PlanetDaily")
                            ? {
                                ...this.state.imageryAttributes,
                                imageryDatePlanetDaily: mercator.getTopVisiblePlanetLayerDate(
                                    this.state.mapConfig,
                                    this.state.currentImagery.id
                                )
                            }
                            : this.state.imageryAttributes
                    }
                }), {});

            this.setState({
                userSamples: {...this.state.userSamples, ...newSamples},
                userImages: {...this.state.userImages, ...newUserImages},
                selectedQuestion: questionToSet
            });
        }
    };

    setSelectedQuestion = newSelectedQuestion => this.setState({
        selectedQuestion: newSelectedQuestion
    });

    highlightSamplesByQuestion = () => {
        const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];

        const {question} = this.state.selectedQuestion;
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
                        : invertColor(this.state.selectedQuestion.answers[0].color)
                    : matchingAnswer
                        ? matchingAnswer.color
                        : "";

                mercator.highlightSampleGeometry(feature, color);
            });
        this.setState({selectedSampleId: -1});
    };

    calcVisibleSamples = currentQuestionId => {
        const {currentProject : {surveyQuestions}, userSamples} = this.state;
        const {parentQuestion, parentAnswer} = surveyQuestions
            .find(sq => sq.id === currentQuestionId);
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
                    return (parentAnswer === -1 && sampleAnswer)
                        || correctAnswerText === sampleAnswer;
                });
        }
    };

    updateQuestionStatus = () => {
        const newSurveyQuestions = this.state.currentProject.surveyQuestions.map(sq => {
            const visibleSamples = this.calcVisibleSamples(sq.id) || [];
            return ({
                ...sq,
                visible: visibleSamples,
                answered: visibleSamples
                    .filter(vs => this.state.userSamples[vs.id][sq.question])
                    .map(vs => ({
                        sampleId: vs.id,
                        answerId: this.state.userSamples[vs.id][sq.question].answerId,
                        answerText: this.state.userSamples[vs.id][sq.question].answer
                    }))
            });
        });

        this.setState({
            currentProject: {
                ...this.state.currentProject,
                surveyQuestions: newSurveyQuestions
            },
            selectedQuestion: newSurveyQuestions
                .find(sq => sq.id === this.state.selectedQuestion.id)
        });
    };

    toggleQuitModal = () => this.setState({showQuitModal: !this.state.showQuitModal});

    toggleFlagged = () => this.setState({
        currentPlot: {...this.state.currentPlot, flagged: !this.state.currentPlot.flagged}
    });

    setUnansweredColor = newColor => this.setState({unansweredColor: newColor});

    setAnswerMode = (newMode, drawTool) => {
        if (this.state.answerMode !== newMode) {
            if (newMode === "draw") {
                this.featuresToDrawLayer(drawTool);
            } else {
                this.featuresToSampleLayer();
                this.setSelectedQuestion(this.state.currentProject.surveyQuestions[0]);
            }
            this.setState({answerMode: newMode});
        }
    };

    setConfidence = confidence => this.setState({currentPlot: {...this.state.currentPlot, confidence}});

    setFlaggedReason = flaggedReason => this.setState({currentPlot: {...this.state.currentPlot, flaggedReason}});

    render() {
        return (
            <div className="row" style={{height: "-webkit-fill-available"}}>
                {this.state.modalMessage && <LoadingModal message={this.state.modalMessage}/>}
                <ImageAnalysisPane
                    imageryAttribution={this.state.imageryAttribution}
                />
                <div
                    className="d-xl-none btn btn-lightgreen"
                    onClick={() => this.setState({showSidebar: !this.state.showSidebar}, () => {
                        if (this.state.showSidebar) {
                            window.location = "#sidebar";
                        } else {
                            document.body.scrollTop = 0;
                            document.documentElement.scrollTop = 0;
                        }
                    })}
                    style={{
                        position: "fixed",
                        zIndex: 99999,
                        right: "1rem",
                        top: "calc(60px + 1rem)",
                        lineHeight: "1rem"
                    }}
                >
                    <div style={{padding: ".5rem", color: "white"}}>
                        {this.state.showSidebar
                            ? <UnicodeIcon icon="upCaret"/>
                            : <UnicodeIcon icon="downCaret"/>}
                    </div>
                </div>
                <SideBar
                    answerMode={this.state.answerMode}
                    currentPlot={this.state.currentPlot}
                    inReviewMode={this.state.inReviewMode}
                    postValuesToDB={this.postValuesToDB}
                    projectId={this.props.projectId}
                    projectName={this.state.currentProject.name}
                    surveyQuestions={this.state.currentProject.surveyQuestions}
                    toggleQuitModal={this.toggleQuitModal}
                    userName={this.props.userName}
                >
                    <PlotNavigation
                        collectConfidence={this.state.currentProject.projectOptions?.collectConfidence}
                        currentPlot={this.state.currentPlot}
                        currentUserId={this.state.currentUserId}
                        hasAssignedPlots={this.state.currentProject.designSettings?.userAssignment?.userMethod !== "none"}
                        inReviewMode={this.state.inReviewMode}
                        isProjectAdmin={this.state.currentProject.isProjectAdmin}
                        isQAQCEnabled={this.state.currentProject.designSettings?.qaqcAssignment?.qaqcMethod !== "none"}
                        loadingPlots={this.state.plotList.length === 0}
                        navigationMode={this.state.navigationMode}
                        navToFirstPlot={this.navToFirstPlot}
                        navToNextPlot={this.navToNextPlot}
                        navToPlot={this.navToPlot}
                        navToPrevPlot={this.navToPrevPlot}
                        plotters={this.state.plotters}
                        plotUsers={(this.state.userPlotList || []).filter(p => p.userId)}
                        projectId={this.props.projectId}
                        setCurrentUserId={this.setCurrentUserId}
                        setNavigationMode={this.setNavigationMode}
                        setReviewMode={this.setReviewMode}
                        setThreshold={this.setThreshold}
                        threshold={this.state.threshold}
                    />
                    <ExternalTools
                        currentPlot={this.state.currentPlot}
                        currentProject={this.state.currentProject}
                        KMLFeatures={this.state.KMLFeatures}
                        showGeoDash={this.showGeoDash}
                        zoomMapToPlot={this.zoomToPlot}
                    />
                    {this.state.currentPlot.id
                        && this.state.currentProject.projectOptions.showPlotInformation
                        && <PlotInformation extraPlotInfo={this.state.currentPlot.extraPlotInfo}/>}
                    <ImageryOptions
                        currentImageryId={this.state.currentImagery.id}
                        currentPlot={this.state.currentPlot}
                        currentProject={this.state.currentProject}
                        currentProjectBoundary={this.state.currentProject.boundary}
                        imageryList={this.state.imageryList}
                        loadingImages={this.state.imageryList.length === 0}
                        mapConfig={this.state.mapConfig}
                        setBaseMapSource={this.setBaseMapSource}
                        setImageryAttributes={this.setImageryAttributes}
                        setImageryAttribution={this.setImageryAttribution}
                    />
                    {this.state.currentPlot.id
                        ? (
                            <SurveyCollection
                                allowDrawnSamples={this.state.currentProject.allowDrawnSamples}
                                answerMode={this.state.answerMode}
                                collectConfidence={this.state.currentProject.projectOptions.collectConfidence}
                                confidence={this.state.currentPlot.confidence}
                                flagged={this.state.currentPlot.flagged}
                                flaggedReason={this.state.currentPlot.flaggedReason}
                                getSelectedSampleIds={this.getSelectedSampleIds}
                                mapConfig={this.state.mapConfig}
                                resetPlotValues={this.resetPlotValues}
                                sampleGeometries={this.state.currentProject.designSettings.sampleGeometries}
                                selectedQuestion={this.state.selectedQuestion}
                                selectedSampleId={Object.keys(this.state.userSamples).length === 1
                                    ? parseInt(Object.keys(this.state.userSamples)[0])
                                    : this.state.selectedSampleId}
                                setAnswerMode={this.setAnswerMode}
                                setConfidence={this.setConfidence}
                                setCurrentValue={this.setCurrentValue}
                                setFlaggedReason={this.setFlaggedReason}
                                setSelectedQuestion={this.setSelectedQuestion}
                                setUnansweredColor={this.setUnansweredColor}
                                surveyQuestions={this.state.currentProject.surveyQuestions}
                                surveyRules={this.state.currentProject.surveyRules}
                                toggleFlagged={this.toggleFlagged}
                                unansweredColor={this.state.unansweredColor}
                            />
                        ) : (
                            <fieldset className="mb-3 justify-content-center text-center">
                                <CollapsibleTitle showGroup title="Survey Questions"/>
                                <p>Please go to a plot to see survey questions</p>
                            </fieldset>
                        )}
                </SideBar>
                {this.state.messageBox && (
                    <Modal
                        {...this.state.messageBox}
                        onClose={() => this.setState({messageBox: null})}
                    >
                        <p>{this.state.messageBox.body}</p>
                    </Modal>
                )}
                {this.state.showQuitModal && (
                    <QuitMenu
                        projectId={this.props.projectId}
                        toggleQuitModal={this.toggleQuitModal}
                    />
                )}
            </div>
        );
    }
}

function ImageAnalysisPane({imageryAttribution}) {
    return (
        // Mercator hooks into image-analysis-pane
        <div className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height" id="image-analysis-pane">
            <div className="row" id="imagery-info" style={{justifyContent: "center"}}>
                <p style={{fontSize: ".9rem", marginBottom: "0"}}>{imageryAttribution}</p>
            </div>
        </div>
    );
}

class SideBar extends React.Component {
    checkCanSave = () => {
        const {answerMode, currentPlot, inReviewMode, surveyQuestions} = this.props;
        const noneAnswered = surveyQuestions.every(sq => safeLength(sq.answered) === 0);
        const hasSamples = safeLength(currentPlot.samples) > 0;
        const allAnswered = surveyQuestions.every(sq => safeLength(sq.visible) === safeLength(sq.answered));
        if (answerMode !== "question") {
            alert("You must be in question mode to save the collection.");
            return false;
        } else if (currentPlot.flagged) {
            return true;
        } else if (inReviewMode) {
            if (!(noneAnswered || allAnswered)) {
                alert("In review mode, plots can only be saved if all questions are answered or the answers are cleared.");
                return false;
            } else {
                return true;
            }
        } else if (!hasSamples) {
            alert("The collection must have samples to be saved. Enter draw mode to add more samples.");
            return false;
        } else if (!allAnswered) {
            alert("All questions must be answered to save the collection.");
            return false;
        } else {
            return true;
        }
    };

    renderQuitButton = () => (
        <input
            className="btn btn-outline-lightgreen btn-sm col"
            id="collection-quit-button"
            onClick={this.props.toggleQuitModal}
            type="button"
            value="Quit"
        />
    );

    renderSaveButtonGroup = () => (
        <div className="mb-5 d-flex justify-content-between">
            <input
                className="btn btn-outline-lightgreen btn-sm col mr-1"
                onClick={() => this.checkCanSave() && this.props.postValuesToDB()}
                type="button"
                value="Save"
            />
            {this.renderQuitButton()}
        </div>
    );

    render() {
        return (
            <div
                className="col-xl-3 border-left full-height"
                id="sidebar"
                style={{overflowY: "scroll", overflowX: "hidden"}}
            >
                <ProjectTitle
                    inReviewMode={this.props.inReviewMode}
                    projectId={this.props.projectId}
                    projectName={this.props.projectName || ""}
                    userName={this.props.userName}
                    visibleId={this.props.currentPlot.visibleId}
                />
                {this.props.children}

                <div className="row">
                    <div className="col-sm-12 btn-block">
                        {isNumber(this.props.currentPlot.id)
                            ? this.renderSaveButtonGroup()
                            : this.renderQuitButton()}
                    </div>
                </div>
            </div>
        );
    }
}

class PlotNavigation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newPlotInput: ""
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.currentPlot.visibleId !== prevProps.currentPlot.visibleId) {
            this.setState({newPlotInput: this.props.currentPlot.visibleId});
        }
    }

    updateNewPlotId = value => this.setState({newPlotInput: value});

    gotoButton = () => (
        <div className="row mb-2" id="go-to-first-plot">
            <div className="col">
                <input
                    className="btn btn-outline-lightgreen btn-sm btn-block"
                    id="go-to-first-plot-button"
                    name="new-plot"
                    onClick={this.props.navToFirstPlot}
                    type="button"
                    value="Go to first plot"
                />
            </div>
        </div>
    );

    navButtons = () => (
        <div className="row justify-content-center mb-2" id="plot-nav">
            <button
                className="btn btn-outline-lightgreen btn-sm"
                onClick={this.props.navToPrevPlot}
                type="button"
            >
                <ButtonSvgIcon icon="leftArrow" size="0.9rem"/>
            </button>
            <button
                className="btn btn-outline-lightgreen btn-sm mx-1"
                onClick={() => this.props.navToNextPlot()}
                type="button"
            >
                <ButtonSvgIcon icon="rightArrow" size="0.9rem"/>
            </button>
            <input
                autoComplete="off"
                className="col-4 px-0 ml-2 mr-1"
                id="plotId"
                onChange={e => this.updateNewPlotId(e.target.value)}
                type="number"
                value={this.state.newPlotInput}
            />
            <button
                className="btn btn-outline-lightgreen btn-sm"
                onClick={() => this.props.navToPlot(this.state.newPlotInput)}
                type="button"
            >
                {this.state.newPlotInput === this.props.currentPlot.visibleId
                    && this.props.inReviewMode
                    ? "Refresh"
                    : "Go to plot"}
            </button>
        </div>
    );

    reviewMode = (inReviewMode, setReviewMode) => (
        <div className="row my-2">
            <div className="col-5 text-right">
                <label htmlFor="review-mode">Review Mode:</label>
            </div>
            <div className="col-6 px-0">
                <Switch
                    checked={inReviewMode}
                    id="review-mode"
                    onChange={() => setReviewMode(!inReviewMode)}
                />
            </div>
        </div>
    );

    thresholdSlider = (label, threshold, setThreshold) => (
        <div className="row my-2">
            <div className="col-5 text-right">
                <label htmlFor="threshold">{label}:</label>
            </div>
            <div className="col-6 px-0 d-flex align-items-center">
                <input
                    id="threshold"
                    max="100"
                    min="0"
                    onChange={e => setThreshold(parseInt(e.target.value))}
                    step="5"
                    style={{width: "80%"}}
                    type="range"
                    value={threshold}
                />
                <div className="ml-2" style={{fontSize: "0.8rem", width: "20%"}}>
                    {`${threshold}%`}
                </div>
            </div>
        </div>
    );

    selectUser = (users, currentUserId, onChange) => (
        <div className="row my-2 text-right">
            <Select
                disabled={users.length <= 1}
                label="User:"
                labelKey="email"
                onChange={e => onChange(parseInt(e.target.value))}
                options={users.length > 0 ? users : ["No users to select"]}
                value={currentUserId}
                valueKey="userId"
            />
        </div>
    );

    render() {
        const {
            currentUserId,
            currentPlot,
            collectConfidence,
            inReviewMode,
            hasAssignedPlots,
            isProjectAdmin,
            isQAQCEnabled,
            loadingPlots,
            navigationMode,
            plotters,
            plotUsers,
            projectId,
            setReviewMode,
            setCurrentUserId,
            setNavigationMode,
            setThreshold,
            threshold
        } = this.props;
        return (
            <div className="mt-2">
                <div
                    className="p-1"
                    style={{
                        border: "1px solid lightgray",
                        borderRadius: "6px",
                        boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.15)"
                    }}
                >
                    <div className="row my-2">
                        <div className="col-5 text-right">
                            <label htmlFor="navigate">Navigate:</label>
                        </div>
                        <select
                            className="form-control form-control-sm mr-2 col-6"
                            id="navigate"
                            onChange={e => setNavigationMode(e.target.value)}
                            style={{flex: "1 1 auto"}}
                            value={navigationMode}
                        >
                            {!inReviewMode && (<option value="natural">{hasAssignedPlots ? "Assigned" : "Default"}</option>)}
                            <option value="unanalyzed">Unanalyzed plots</option>
                            <option value="analyzed">Analyzed plots</option>
                            <option value="flagged">Flagged plots</option>
                            {collectConfidence && (<option value="confidence">Low Confidence</option>)}
                            {inReviewMode && (<option value="user">By User</option>)}
                            {inReviewMode && isQAQCEnabled && (<option value="qaqc">Disagreement</option>)}
                        </select>
                    </div>
                    {isProjectAdmin && this.reviewMode(inReviewMode, setReviewMode)}
                    {navigationMode === "confidence" && this.thresholdSlider("Confidence", threshold, setThreshold)}
                    {navigationMode === "qaqc" && this.thresholdSlider("Disagreement", threshold, setThreshold)}
                    {navigationMode === "qaqc" && currentPlot.id && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                padding: ".5rem",
                                width: "100%"
                            }}
                        >
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() =>
                                    window.open(
                                        `/user-disagreement?projectId=${projectId}&plotId=${currentPlot.id}&threshold=${threshold}`,
                                        `disagreement_${projectId}`
                                    )}
                                type="button"
                            >
                                View Disagreements
                            </button>
                        </div>
                    )}
                    {inReviewMode && this.selectUser(
                        navigationMode === "user" ? plotters : plotUsers,
                        currentUserId,
                        setCurrentUserId
                    )}
                </div>
                <div className="mt-2">
                    {loadingPlots
                        ? <h3>Loading plot data...</h3>
                        : currentPlot?.id
                            ? this.navButtons()
                            : this.gotoButton()}
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
            auxWindow: null
        };
    }

    geoButtons = () => (
        <div className="ExternalTools__geo-buttons d-flex justify-content-between mb-2" id="plot-nav">
            <input
                className="btn btn-outline-lightgreen btn-sm col-6 mr-1"
                onClick={this.props.zoomMapToPlot}
                type="button"
                value="Re-Zoom"
            />
            <input
                className="btn btn-outline-lightgreen btn-sm col-6"
                onClick={this.props.showGeoDash}
                type="button"
                value="GeoDash"
            />
        </div>
    );

    loadGEEScript = () => {
        const {currentPlot, currentProject} = this.props;
        const urlParams = currentPlot.plotGeom.includes("Point")
            ? currentProject.plotShape === "circle"
                ? "center=["
                        + mercator.parseGeoJson(currentPlot.plotGeom).getCoordinates()
                        + "];radius=" + currentProject.plotSize / 2
                : "geoJson=" + mercator.geometryToGeoJSON(
                    mercator.getPlotPolygon(
                        currentPlot.plotGeom,
                        currentProject.plotSize,
                        currentProject.plotShape
                    ),
                    "EPSG:4326",
                    "EPSG:3857",
                    5
                )
            : "geoJson=" + currentPlot.plotGeom;
        if (this.state.auxWindow) this.state.auxWindow.close();
        this.setState({
            auxWindow: window.open(
                "https://billyz313.users.earthengine.app/view/ceoplotancillary#" + urlParams,
                "_ceo-plot-ancillary"
            )
        });
    };

    geeButton = () => (
        <input
            className="btn btn-outline-lightgreen btn-sm btn-block my-2"
            onClick={this.loadGEEScript}
            type="button"
            value="Go to GEE Script"
        />
    );

    kmlButton = () => (
        <a
            className="btn btn-outline-lightgreen btn-sm btn-block my-2"
            download={"ceo_projectId-" + this.props.currentProject.id + "_plotId-" + this.props.currentPlot.visibleId + ".kml"}
            href={"data:earth.kml+xml application/vnd.google-earth.kmz, "
                + encodeURIComponent(this.props.KMLFeatures)}
        >
            Download Plot KML
        </a>
    );

    render() {
        return this.props.currentPlot.id ? (
            <>
                <CollapsibleTitle
                    showGroup={this.state.showExternalTools}
                    title="External Tools"
                    toggleShow={() => this.setState({showExternalTools: !this.state.showExternalTools})}
                />
                {this.state.showExternalTools && (
                    <div className="mx-1">
                        {this.geoButtons()}
                        {this.props.KMLFeatures && this.kmlButton()}
                        {this.props.currentProject.projectOptions.showGEEScript && this.geeButton()}
                    </div>
                )}
            </>
        ) : null;
    }
}

class PlotInformation extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showInfo: false
        };
    }

    render() {
        const hasExtraInfo = Object.values(this.props.extraPlotInfo || {})
            .filter(value => value && !(value instanceof Object)).length > 0;
        return (
            <>
                <CollapsibleTitle
                    showGroup={this.state.showInfo}
                    title="Plot Information"
                    toggleShow={() => this.setState({showInfo: !this.state.showInfo})}
                />
                {this.state.showInfo
                    ? hasExtraInfo
                        ? (
                            <ul className="mb-3 mx-1">
                                {Object.entries(this.props.extraPlotInfo)
                                    .filter(([_key, value]) => value && !(value instanceof Object))
                                    .map(([key, value]) => <li key={key}>{key} - {value}</li>)}
                            </ul>
                        ) : (
                            <div className="mb-3">There is no extra information for this plot.</div>
                        )
                    : null}
            </>
        );
    }
}

class ImageryOptions extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showImageryOptions: true
        };
    }

    render() {
        const {props} = this;
        const commonProps = {
            mapConfig: props.mapConfig,
            setImageryAttribution: props.setImageryAttribution,
            setImageryAttributes: props.setImageryAttributes,
            currentPlot: props.currentPlot,
            currentProjectBoundary: props.currentProjectBoundary,
            extent: props.currentPlot.id && props.currentProject.id
                ? props.currentPlot.plotGeom.includes("Point")
                    ? mercator.getPlotPolygon(props.currentPlot.plotGeom,
                                              props.currentProject.plotSize,
                                              props.currentProject.plotShape).getExtent()
                    : mercator.parseGeoJson(props.currentPlot.plotGeom, true).getExtent()
                : []
        };

        return (
            <div className="justify-content-center text-center">
                <CollapsibleTitle
                    showGroup={this.state.showImageryOptions}
                    title="Imagery Options"
                    toggleShow={() => this.setState({showImageryOptions: !this.state.showImageryOptions})}
                />
                <div className="mx-1">
                    {props.loadingImages && <h3>Loading imagery data...</h3>}
                    {this.state.showImageryOptions && !props.loadingImages && props.currentImageryId && (
                        <select
                            className="form-control form-control-sm mb-2"
                            id="base-map-source"
                            name="base-map-source"
                            onChange={e => props.setBaseMapSource(parseInt(e.target.value))}
                            size="1"
                            value={props.currentImageryId}
                        >
                            {props.imageryList
                                .map(imagery => (
                                    <option key={imagery.id} value={imagery.id}>
                                        {imagery.title}
                                    </option>
                                ))}
                        </select>
                    )}
                    {props.currentImageryId && props.imageryList.map(imagery => {
                        const individualProps = {
                            ...commonProps,
                            key: imagery.id,
                            thisImageryId: imagery.id,
                            sourceConfig: imagery.sourceConfig,
                            visible: props.currentImageryId === imagery.id && this.state.showImageryOptions
                        };
                        return imagery.sourceConfig && {
                            "Planet": <PlanetMenu {...individualProps}/>,
                            "PlanetDaily": <PlanetDailyMenu {...individualProps}/>,
                            "PlanetNICFI": <PlanetNICFIMenu {...individualProps}/>,
                            "SecureWatch": <SecureWatchMenu {...individualProps}/>,
                            "Sentinel1": <SentinelMenu {...individualProps}/>,
                            "Sentinel2": <SentinelMenu {...individualProps}/>,
                            "GEEImage": <GEEImageMenu {...individualProps}/>,
                            "GEEImageCollection": <GEEImageCollectionMenu {...individualProps}/>
                        }[imagery.sourceConfig.type];
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
            showStats: false
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.visibleId !== prevProps.visibleId) {
            this.setState({showStats: false});
        }
    }

    render() {
        const {projectName, inReviewMode, projectId, userName} = this.props;
        return (
            <div
                onClick={() => this.setState({showStats: !this.state.showStats})}
                style={{height: "3rem", cursor: "default"}}
            >
                <h2
                    className="header overflow-hidden text-truncate"
                    style={{height: "100%", marginBottom: "0"}}
                    title={projectName}
                >
                    <UnicodeIcon icon="downCaret"/>{" " + projectName}
                </h2>
                {this.state.showStats && (inReviewMode
                    ? (
                        <ProjectStats
                            projectId={projectId}
                            userName={userName}
                        />
                    ) : (
                        <UserProjectStats
                            projectId={projectId}
                            userName={userName}
                        />
                    )

                )}
            </div>
        );
    }
}

class UserProjectStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {}
        };
    }

    componentDidMount() {
        this.getProjectStats();
    }

    getProjectStats() {
        fetch(`/get-project-user-stats?projectId=${this.props.projectId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({stats: data}))
            .catch(response => {
                console.error(response);
                alert("Error getting project stats. See console for details.");
            });
    }

    renderPercent = (val, total) => (
        <span>
            {`${val} (${asPercentage(val, total)}%)`}
        </span>
    );

    render() {
        const {stats} = this.state;
        const aveTime = stats.userStats?.timedPlots > 0
            ? (stats.userStats?.seconds
                / stats.userStats?.timedPlots
                / 1.0)
            : 0;
        const numPlots = stats.userAssigned > 0 ? stats.userAssigned : stats.totalPlots;

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
                    zIndex: "10"
                }}
            >
                <div className="col-lg-12">
                    <fieldset className="projNoStats" id="projStats">
                        <table className="table table-sm">
                            <tbody>
                                <tr>
                                    <td className="small pl-4">My Plots Completed</td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- {stats.userAssigned > 0
                                        ? "Assigned to Me" : "Total Project Plots"}
                                    </td>
                                    <td className="small">
                                        {numPlots}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Analyzed</td>
                                    <td className="small">
                                        {this.renderPercent(stats.analyzedPlots, numPlots)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Unanalyzed</td>
                                    <td className="small">
                                        {this.renderPercent(numPlots - stats.analyzedPlots, numPlots)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Flagged</td>
                                    <td className="small">
                                        {this.renderPercent(stats.flaggedPlots, numPlots)}
                                    </td>
                                </tr>

                                <tr>
                                    <td className="small pl-4">-- My Average Time</td>
                                    <td className="small">
                                        {aveTime > 0
                                            ? `${aveTime.toFixed(2)} secs`
                                            : "untimed"}
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

class ProjectStats extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {}
        };
    }

    componentDidMount() {
        this.getProjectStats();
    }

    getProjectStats() {
        fetch(`/get-project-stats?projectId=${this.props.projectId}`)
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({stats: data}))
            .catch(response => {
                console.error(response);
                alert("Error getting project stats. See console for details.");
            });
    }

    renderPercent = (val, total) => (
        <span>
            {`${val} (${asPercentage(val, total)}%)`}
        </span>
    );

    render() {
        const {stats} = this.state;
        const numTimedPlots = stats.userStats ? stats.userStats.reduce((p, c) => p + c.timedPlots, 0) : 0;
        const aveTime = numTimedPlots > 0
            ? (stats.userStats.reduce((p, c) => p + c.seconds, 0)
                / stats.userStats.reduce((p, c) => p + c.timedPlots, 0)
                / 1.0)
            : 0;

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
                    zIndex: "10"
                }}
            >
                <div className="col-lg-12">
                    <fieldset className="projNoStats" id="projStats">
                        <table className="table table-sm">
                            <tbody>
                                <tr>
                                    <td className="small pl-4">Project Plots</td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Total</td>
                                    <td className="small">
                                        {stats.totalPlots}
                                    </td>
                                </tr>
                                {stats.plotAssignments > 0 && (
                                    <tr>
                                        <td className="small pl-4">-- Plot Assignments</td>
                                        <td className="small">
                                            {stats.plotAssignments}
                                        </td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="small pl-4">-- Analyzed</td>
                                    <td className="small">
                                        {this.renderPercent(stats.analyzedPlots, stats.totalPlots)}
                                    </td>
                                </tr>
                                {stats.plotAssignments > 0 && (
                                    <tr>
                                        <td className="small pl-4">-- Partial</td>
                                        <td className="small">
                                            {this.renderPercent(stats.partialPlots, stats.totalPlots)}
                                        </td>
                                    </tr>
                                )}
                                <tr>
                                    <td className="small pl-4">-- Unanalyzed</td>
                                    <td className="small">
                                        {this.renderPercent(stats.unanalyzedPlots, stats.totalPlots)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="small pl-4">-- Flagged</td>
                                    <td className="small">
                                        {this.renderPercent(stats.flaggedPlots, stats.totalPlots)}
                                    </td>
                                </tr>
                                {stats.usersAssigned > 0
                                    ? (
                                        <tr>
                                            <td className="small pl-4">-- Users Assigned</td>
                                            <td className="small">
                                                {stats.usersAssigned}
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <td className="small pl-4">-- Total Contributors</td>
                                            <td className="small">
                                                {stats.userStats?.length}
                                            </td>
                                        </tr>
                                    )}
                                <tr>
                                    <td className="small pl-4">-- Users Average Time</td>
                                    <td className="small">
                                        {aveTime > 0
                                            ? `${aveTime.toFixed(2)} secs`
                                            : "untimed"}
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
function QuitMenu({projectId, toggleQuitModal}) {
    return (
        <div
            className="modal fade show"
            id="quitModal"
            onClick={toggleQuitModal}
            style={{display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)"}}
        >
            <div
                className="modal-dialog modal-dialog-centered"
                onClick={e => e.stopPropagation()}
                role="document"
            >
                <div className="modal-content" id="quitModalContent">
                    <div className="modal-header">
                        <h5 className="modal-title" id="quitModalTitle">Unsaved Changes</h5>
                        <button
                            aria-label="Close"
                            className="close"
                            onClick={toggleQuitModal}
                            type="button"
                        >
                            &times;
                        </button>
                    </div>
                    <div className="modal-body">
                        <p>Are you sure you want to stop collecting data? Any unsaved responses will be lost.</p>
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={toggleQuitModal}
                            type="button"
                        >
                            Close
                        </button>
                        <button
                            className="btn btn-danger btn-sm"
                            id="quit-button"
                            onClick={() => fetch(`/release-plot-locks?projectId=${projectId}`,
                                                 {method: "POST"})
                                .then(() => window.location.assign("/home"))}
                            type="button"
                        >
                            Yes, I&apos;m sure
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar
            userId={args.userId}
            userName={args.userName}
            version={args.version}
        >
            <Collection
                projectId={args.projectId}
                userName={args.userName || "guest"}
            />
        </NavigationBar>,
        document.getElementById("app")
    );
}
