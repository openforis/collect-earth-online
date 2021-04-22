import React from "react";
import ReactDOM from "react-dom";

import {LoadingModal, NavigationBar} from "./components/PageComponents";
import SvgIcon from "./components/SvgIcon";
import {PlanetNICFIMenu} from "./imagery/collectionMenuControls";

import {UnicodeIcon, getQueryString, safeLength, isNumber, invertColor, getLanguage} from "./utils/generalUtils";
import {mercator} from "./utils/mercator";

const localeLanguages = {
    "en": {
        "loadingModal": "Loading project details",
        "gettingPlot": "Getting plot",
        "gettingFirstPlot": "Getting first plot",
        "gettingNextPlot": "Getting next plot",
        "gettingPrevPlot": "Getting previous plot",
        "navPlot": "This plot has already been analyzed.",
        "plotNotFound": "Plot {0} not found.",
        "navNextUn": "You have not reviewed any plots.",
        "navNextAn": "All plots have been analyzed for this project.",
        "navNextDone": "You have reached the end of the plot list.",
        "navPrevUn": "No previous plots were analyzed by you.",
        "navPrevAn": "All previous plots have been analyzed.",
        "errorNavNum": "Please enter a number to go to plot.",
        "postSave": "Saving plot answers",
        "errorSelect": "Please select at least one sample before choosing an answer.",
        "errorSave": "All questions must be answered to save the collection.",
        "saveButton": "Save",
        "navLabel": "Navigate through",
        "optionUn": "Unanalyzed plots",
        "optionMy": "My analyzed plots",
        "gotoPlot": "Go to plot",
        "gotoFirstPlot": "Go to first plot",
        "imageryTitle": "Imagery Options",
        "imageryLoading": "Loading imagery data",
        "kmlTitle": "Plot KML",
        "kmlDownload": "Download Plot KML"
    },
    "es": {
        "loadingModal": "Cargando detalles del proyecto",
        "gettingPlot": "Obtener parcela",
        "gettingFirstPlot": "Obtener primera parcela",
        "gettingNextPlot": "Obtener siguiente parcela",
        "gettingPrevPlot": "Obtener parcela anterior",
        "navPlot": "Esta parcela ya ha sido analizado.",
        "plotNotFound": "Parcela {0} no encontrado.",
        "navNextUn": "No ha revisado ninguna parcela.",
        "navNextAn": "Todas las parcelas han sido analizadas para este proyecto.",
        "navNextDone": "Ha llegado al final de la lista de parcelas..",
        "navPrevUn": "Usted no analizó ninguna parcela anterior.",
        "navPrevAn": "Todas las parcelas anteriores han sido analizadas..",
        "errorNavNum": "Ingrese un número para ir a la parcela.",
        "postSave": "Guardar respuestas de la parcela",
        "errorSelect": "Seleccionar al menos una muestra antes de elegir una respuesta.",
        "errorSave": "Todas las preguntas deben responderse para guardar la colección.",
        "saveButton": "Guardar",
        "navLabel": "Navegar por",
        "optionUn": "Parcelas no analizadas",
        "optionMy": "Mis parcelas analizadas",
        "gotoPlot": "Ir a la parcela",
        "gotoFirstPlot": "Ir a la parcela primera",
        "imageryTitle": "Opciones de imágenes",
        "imageryLoading": "Cargando datos de imágenes",
        "kmlTitle": "Parcela KML",
        "kmlDownload": "Descargar parcela KML"
    }
};

class SimpleCollection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            collectionStart: 0,
            currentProject: {surveyQuestions: [], institution: ""},
            currentImagery: {id: "", sourceConfig: {}},
            currentPlot: {},
            // attribution for showing in the map
            imageryAttribution: "",
            // attributes to record when sample is saved
            imageryAttributes: {},
            imageryList: [],
            mapConfig: null,
            nextPlotButtonDisabled: false,
            prevPlotButtonDisabled: false,
            unansweredColor: "black",
            selectedQuestion: {id: 0, question: "", answers: []},
            selectedSampleId: -1,
            userSamples: {},
            userImages: {},
            showSidebar: false,
            modalMessage: null,
            navigationMode: "unanalyzed",
            myHeight: 0,
            isMobile: false,
            localeText: localeLanguages[getLanguage(["en", "es"])],
            KMLFeatures: null
        };
    }

    componentDidMount() {
        window.name = "_ceocollection";

        fetch(
            `/release-plot-locks?projectId=${this.props.projectId}`,
            {method: "POST"}
        );

        this.updateWindow();
        this.getProjectData();
        window.addEventListener("touchend", this.updateWindow);
        window.addEventListener("resize", this.updateWindow);
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
        if (this.state.currentPlot.id && prevState.currentPlot.id !== this.state.currentPlot.id) {
            this.showProjectPlot();
        }

        // Conditions required for samples to be shown
        if (this.state.currentPlot.id
            && this.state.selectedQuestion.visible) {
            // Changing conditions for which samples need to be re-drawn
            if (prevState.selectedQuestion.id !== this.state.selectedQuestion.id
                || prevState.unansweredColor !== this.state.unansweredColor
                || prevState.userSamples !== this.state.userSamples
                || prevState.selectedQuestion.visible !== this.state.selectedQuestion.visible) {
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
    }

    updateWindow = () => {
        window.scrollTo(0, 0);
        this.setState(
            {
                myHeight: window.innerHeight - 60,
                isMobile: window.innerWidth < 992 // Not sure where 992 came from but it matches the media query.
            },
            () => setTimeout(() => mercator.resize(this.state.mapConfig), 50)
        );
    };

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

    getProjectData = () => this.processModal(
        this.state.localeText.loadingModal,
        () => Promise.all([
            this.getProjectById(),
            this.getImageryList(),
            this.getProjectPlots()
        ])
            .catch(response => {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            })
    );

    getProjectById = () => fetch(`/get-project-by-id?projectId=${this.props.projectId}`)
        .then(response => (response.ok ? response.json() : Promise.reject(response)))
        .then(project => {
            if (project.id > 0) {
                this.setState({currentProject: project});
                return Promise.resolve("resolved");
            } else {
                return Promise.reject("No project found with ID " + this.props.projectId + ".");
            }
        });

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
                this.setState({
                    imageryList: this.state.isMobile
                        ? data.filter(i =>
                            !["Planet", "PlanetDaily", "SecureWatch", "Sentinel1", "Sentinel2", "GEEImage", "GEEImageCollection"]
                                .includes(i.sourceConfig.type))
                        : data
                });
                return Promise.resolve("resolved");
            } else {
                return Promise.reject("No project imagery found");
            }
        });

    initializeProjectMap = () => {
        const mapConfig = mercator.createMap(
            "mobile-analysis-pane",
            [0.0, 0.0],
            1,
            this.state.imageryList,
            this.state.currentProject.boundary
        );
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

    getImageryById = imageryId => this.state.imageryList.find(imagery => imagery.id === imageryId);

    showProjectOverview = () => {
        mercator.addPlotLayer(
            this.state.mapConfig,
            this.state.plotList,
            feature => {
                this.setState({
                    prevPlotButtonDisabled: false
                });
                this.getPlotData(feature.get("features")[0].get("plotId"));
            }
        );
    };

    setBaseMapSource = newBaseMapSource => {
        const currentImagery = this.getImageryById(newBaseMapSource);
        mercator.setVisibleLayer(this.state.mapConfig, currentImagery.id);
        this.setState({currentImagery, imageryAttribution: currentImagery.attribution});
    };

    getPlotData = plotId => this.processModal(
        `${this.state.localeText.gettingPlot} ${plotId}`,
        () => fetch("/get-plot-by-id?" + getQueryString({
            plotId,
            projectId: this.props.projectId,
            navigationMode: this.state.navigationMode
        }))
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                if (data === "done") {
                    alert(this.state.localeText.navPlot);
                } else if (data === "not-found") {
                    alert(this.state.localeText.plotNotFound.replace("{0}", plotId));
                } else {
                    this.setState({
                        currentPlot: data,
                        ...this.newPlotValues(data),
                        prevPlotButtonDisabled: false,
                        nextPlotButtonDisabled: false
                    });
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            })
    );

    getNextPlotData = plotId => this.processModal(
        plotId >= 0 ? this.state.localeText.gettingNextPlot : this.state.localeText.gettingFirstPlot,
        () => fetch("/get-next-plot?" + getQueryString({
            plotId,
            projectId: this.props.projectId,
            navigationMode: this.state.navigationMode
        }))
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                if (data === "done") {
                    if (plotId === -1) {
                        alert(this.state.navigationMode !== "unanalyzed"
                            ? this.state.localeText.navNextUn
                            : this.state.localeText.navNextAn);
                    } else {
                        this.setState({nextPlotButtonDisabled: true});
                        alert(this.state.localeText.navNextDone);
                    }
                } else {
                    this.setState({
                        currentPlot: data,
                        ...this.newPlotValues(data),
                        prevPlotButtonDisabled: plotId === -1
                    });
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            })
    );

    getPrevPlotData = plotId => this.processModal(
        this.state.localeText.gettingPrevPlot,
        () => fetch("/get-prev-plot?" + getQueryString({
            plotId,
            projectId: this.props.projectId,
            navigationMode: this.state.navigationMode
        }))
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                if (data === "done") {
                    this.setState({prevPlotButtonDisabled: true});
                    alert(this.state.navigationMode !== "unanalyzed"
                        ? this.state.localeText.navPrevUn
                        : this.state.localeText.navPrevAn);
                } else {
                    this.setState({
                        currentPlot: data,
                        ...this.newPlotValues(data),
                        nextPlotButtonDisabled: false
                    });
                }
            })
            .catch(response => {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            })
    );

    resetPlotValues = () => this.setState(this.newPlotValues(this.state.currentPlot, false));

    newPlotValues = (newPlot, copyValues = true) => ({
        newPlotInput: isNumber(newPlot.plotId) ? newPlot.plotId : newPlot.id,
        userSamples: newPlot.samples
            ? newPlot.samples.reduce((obj, s) => {
                obj[s.id] = copyValues ? (s.savedAnswers || {}) : {};
                return obj;
            }, {})
            : {},
        userImages: newPlot.samples
            ? newPlot.samples.reduce((obj, s) => {
                obj[s.id] = copyValues ? (s.userImage || {}) : {};
                return obj;
            }, {})
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

    zoomToPlot = () => mercator.zoomMapToLayer(this.state.mapConfig, "currentPlot", [36, 36, 84, 36]);

    showProjectPlot = () => {
        const {currentPlot, mapConfig, currentProject} = this.state;

        mercator.disableSelection(mapConfig);
        mercator.removeLayerById(mapConfig, "currentPlot");
        mercator.removeLayerById(mapConfig, "currentPlots");
        mercator.removeLayerById(mapConfig, "currentSamples");
        mercator.removeLayerById(mapConfig, "drawLayer");
        mercator.addVectorLayer(
            mapConfig,
            "currentPlot",
            mercator.geometryToVectorSource(
                currentPlot.geom
                    ? mercator.parseGeoJson(currentPlot.geom, true)
                    : mercator.getPlotPolygon(currentPlot.center,
                                              currentProject.plotSize,
                                              currentProject.plotShape)
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

    createPlotKML = () => {
        const plotFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentPlot");
        const sampleFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples");
        this.setState({
            KMLFeatures: mercator.getKMLFromFeatures([mercator.asPolygonFeature(plotFeatures[0]),
                                                      ...sampleFeatures])
        });
    };

    navToFirstPlot = () => this.getNextPlotData(-10000000);

    getPlotId = () => (isNumber(this.state.currentPlot.plotId)
        ? this.state.currentPlot.plotId
        : this.state.currentPlot.id);

    navToNextPlot = () => this.getNextPlotData(this.getPlotId());

    navToPrevPlot = () => this.getPrevPlotData(this.getPlotId());

    navToPlot = newPlot => {
        if (!isNaN(newPlot)) {
            this.getPlotData(newPlot);
        } else {
            alert(this.state.localeText.errorNavNum);
        }
    };

    setNavigationMode = newMode => this.setState({
        navigationMode: newMode,
        prevPlotButtonDisabled: false,
        nextPlotButtonDisabled: false
    });

    postValuesToDB = () => {
        this.processModal(
            this.state.localeText.postSave,
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
                        confidence: -1,
                        collectionStart: this.state.collectionStart,
                        userSamples: this.state.userSamples,
                        userImages: this.state.userImages
                    })
                }
            )
                .then(response => {
                    if (response.ok) {
                        return this.navToNextPlot();
                    } else {
                        console.log(response);
                        alert("Error saving your assignments to the database. See console for details.");
                    }
                })
        );
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
        if (sampleIds.some(sid => questionToSet.visible.every(vs => vs.id !== sid))) {
            // This should never be reached with 1 sample plots.
            alert("Invalid Selection. Try selecting the question before answering.");
            return false;
        } else if (sampleIds.length === 0) {
            alert(this.state.localeText.errorSelect);
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

    setUnansweredColor = newColor => this.setState({unansweredColor: newColor});

    render() {
        const {imageryAttribution} = this.state;
        const plotId = this.getPlotId();

        const infoStyle = {
            position: "absolute",
            top: "0px",
            textAlign: "center",
            height: "auto",
            width: "100%",
            padding: "0.25rem",
            color: "white",
            backgroundColor: "rgba(75,75,150,1.0)",
            zIndex: "100"
        };

        return (
            <div className="row" style={{height: this.state.myHeight}}>
                {this.state.modalMessage && <LoadingModal message={this.state.modalMessage}/>}
                <div className="w-100 position-relative overflow-hidden" id="mobile-analysis-pane">
                    <div style={infoStyle}>
                        <p style={{fontSize: ".9rem", marginBottom: "0"}}>{imageryAttribution}</p>
                    </div>
                    <MiniQuestions
                        isMobile={this.state.isMobile}
                        localeText={this.state.localeText}
                        navToFirstPlot={this.navToFirstPlot}
                        postValuesToDB={this.postValuesToDB}
                        selectedSampleId={Object.keys(this.state.userSamples).length === 1
                            ? parseInt(Object.keys(this.state.userSamples)[0])
                            : this.state.selectedSampleId}
                        setCurrentValue={this.setCurrentValue}
                        showQuestions={this.state.currentPlot.id}
                        surveyQuestions={this.state.currentProject.surveyQuestions}
                    />
                    {/* Side Bar */}
                    <div
                        className="border-left full-height"
                        id="simple-sidebar"
                        style={{
                            background: "white",
                            right: this.state.showSidebar ? 0 : "max(-25rem, -100%)",
                            zIndex: 101,
                            width: "min(25rem, 100%)",
                            position: "absolute",
                            transition: "all 200ms ease-in"
                        }}
                    >
                        <div
                            onClick={() => this.setState({showSidebar: !this.state.showSidebar})}
                            style={{
                                borderRadius: "10% 0 0 10%",
                                position: "absolute",
                                padding: ".5rem .5rem",
                                width: "2.5rem",
                                left: "-2.5rem",
                                top: "3rem",
                                background: "white"
                            }}
                        >
                            <SvgIcon
                                color="black"
                                icon={this.state.showSidebar ? "rightDouble" : "leftDouble"}
                                size="1.5rem"
                            />
                        </div>
                        <div
                            onClick={() => this.setState({showSidebar: false})}
                            style={{position: "absolute", right: "1rem", top: "1rem"}}
                        >
                            <SvgIcon color="black" icon="close" size="1.5rem"/>
                        </div>
                        <h2
                            className="header overflow-hidden text-truncate w-100 m-0"
                            style={{marginBottom: "0"}}
                            title={this.state.currentProject.name}
                        >
                            {this.state.currentProject.name}
                        </h2>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                padding: "1rem 2rem",
                                textAlign: "center"
                            }}
                        >
                            <PlotNavigation
                                isProjectAdmin={this.state.currentProject.isProjectAdmin}
                                localeText={this.state.localeText}
                                navigationMode={this.state.navigationMode}
                                navToFirstPlot={this.navToFirstPlot}
                                navToNextPlot={this.navToNextPlot}
                                navToPlot={this.navToPlot}
                                navToPrevPlot={this.navToPrevPlot}
                                nextPlotButtonDisabled={this.state.nextPlotButtonDisabled}
                                plotId={plotId}
                                prevPlotButtonDisabled={this.state.prevPlotButtonDisabled}
                                setNavigationMode={this.setNavigationMode}
                            />
                            <div className="my-3"/>
                            <ImageryOptions
                                currentImageryId={this.state.currentImagery.id}
                                currentPlot={this.state.currentPlot}
                                currentProject={this.state.currentProject}
                                currentProjectBoundary={this.state.currentProject.boundary}
                                imageryList={this.state.imageryList}
                                loadingImages={this.state.imageryList.length === 0}
                                localeText={this.state.localeText}
                                mapConfig={this.state.mapConfig}
                                setBaseMapSource={this.setBaseMapSource}
                                setImageryAttributes={this.setImageryAttributes}
                                setImageryAttribution={this.setImageryAttribution}
                            />
                            {!this.state.isMobile && this.state.KMLFeatures && (
                                <KMLGenerator
                                    KMLFeatures={this.state.KMLFeatures}
                                    localeText={this.state.localeText}
                                    plotId={plotId}
                                    projectId={this.state.currentProject.id}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

function AnswerButtons({surveyNode, surveyNode: {answers, answered}, selectedSampleId, setCurrentValue}) {
    return answers.map(ans => (
        <button
            key={ans.id}
            className="btn btn-outline-darkgray mr-3 px-1 py-2"
            onClick={() => setCurrentValue(surveyNode, ans.id, ans.answer)}
            style={{
                boxShadow: (answered || []).some(a => a.answerId === ans.id && a.sampleId === selectedSampleId)
                    ? "0px 0px 8px 3px black inset"
                    : "initial",
                width: "fit-content"
            }}
            title={ans.answer}
            type="button"
        >
            <div
                className="circle mr-2"
                style={{
                    backgroundColor: ans.color,
                    border: "1px solid",
                    float: "left",
                    marginTop: "4px"
                }}
            />
            {ans.answer}
        </button>
    ));
}

class MiniQuestions extends React.Component {
    checkCanSave = () => {
        const {surveyQuestions, localeText} = this.props;
        const allAnswered = surveyQuestions.every(sq => safeLength(sq.visible) === safeLength(sq.answered));
        if (!allAnswered) {
            alert(localeText.errorSave);
            return false;
        } else {
            return true;
        }
    };

    render() {
        const {
            postValuesToDB,
            selectedSampleId,
            surveyQuestions,
            setCurrentValue,
            localeText,
            isMobile,
            showQuestions,
            navToFirstPlot
        } = this.props;

        const questionStyle = {
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            position: "absolute",
            bottom: isMobile ? "48px" : "24px",
            maxWidth: "fit-content",
            zIndex: 100
        };
        return (
            <div id="MiniQuestions" style={questionStyle}>
                <div className="d-flex justify-content-between">
                    {showQuestions
                        ? (
                            <>
                                {surveyQuestions.length > 0 && (
                                    <AnswerButtons
                                        selectedSampleId={selectedSampleId}
                                        setCurrentValue={setCurrentValue}
                                        surveyNode={surveyQuestions[0]}
                                        surveyQuestions={surveyQuestions}
                                    />
                                )}
                                <button
                                    className="btn btn-lightgreen"
                                    onClick={() => this.checkCanSave() && postValuesToDB()}
                                    type="button"
                                >
                                    {localeText.saveButton}
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn btn-lightgreen"
                                onClick={navToFirstPlot}
                                type="button"
                            >
                                {localeText.gotoFirstPlot}
                            </button>
                        )}
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
        if (this.props.plotId !== prevProps.plotId) this.setState({newPlotInput: this.props.plotId});
    }

    updateNewPlotId = value => this.setState({newPlotInput: value});

    render() {
        const {
            setNavigationMode,
            navigationMode,
            isProjectAdmin,
            prevPlotButtonDisabled,
            navToPrevPlot,
            nextPlotButtonDisabled,
            navToNextPlot,
            navToPlot,
            localeText
        } = this.props;
        return (
            <>
                <div className="d-flex flex-column align-items-center my-2">
                    <h3 className="w-100">{localeText.navLabel}:</h3>
                    <select
                        className="form-control form-control-sm mr-2"
                        onChange={e => setNavigationMode(e.target.value)}
                        style={{flex: "1 1 auto"}}
                        value={navigationMode}
                    >
                        <option value="unanalyzed">{localeText.optionUn}</option>
                        <option value="analyzed">{localeText.optionMy}</option>
                        {/* This should be un reachable */}
                        {isProjectAdmin && <option value="all">All analyzed plots</option>}
                    </select>
                </div>
                <div className="row justify-content-center mb-2">
                    <button
                        className="btn btn-outline-lightgreen btn-sm"
                        disabled={prevPlotButtonDisabled}
                        onClick={navToPrevPlot}
                        style={{opacity: prevPlotButtonDisabled ? "0.25" : "1.0"}}
                        type="button"
                    >
                        <UnicodeIcon icon="leftCaret"/>
                    </button>
                    <button
                        className="btn btn-outline-lightgreen btn-sm mx-1"
                        disabled={nextPlotButtonDisabled}
                        onClick={navToNextPlot}
                        style={{opacity: nextPlotButtonDisabled ? "0.25" : "1.0"}}
                        type="button"
                    >
                        <UnicodeIcon icon="rightCaret"/>
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
                        onClick={() => navToPlot(this.state.newPlotInput)}
                        type="button"
                    >
                        {localeText.gotoPlot}
                    </button>
                </div>
            </>
        );
    }
}

function ImageryOptions(props) {
    return (
        <>
            <h3>{props.localeText.imageryTitle}</h3>
            {props.loadingImages && <h3>{props.localeText.imageryLoading}...</h3>}
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
            {props.currentImageryId && props.imageryList.map(imagery =>
                imagery.sourceConfig && imagery.sourceConfig.type === "PlanetNICFI" && (
                    <PlanetNICFIMenu
                        key={imagery.id}
                        currentPlot={props.currentPlot}
                        currentProjectBoundary={props.currentProjectBoundary}
                        mapConfig={props.mapConfig}
                        setImageryAttributes={props.setImageryAttributes}
                        setImageryAttribution={props.setImageryAttribution}
                        sourceConfig={imagery.sourceConfig}
                        thisImageryId={imagery.id}
                        visible={props.currentImageryId === imagery.id}
                    />
                ))}
        </>
    );
}

function KMLGenerator({projectId, plotId, localeText, KMLFeatures}) {
    return (
        <>
            <h3 className="mt-2">{localeText.kmlTitle}</h3>
            <a
                className="btn btn-outline-lightgreen btn-sm btn-block my-2"
                download={"ceo_projectId-" + projectId + "_plotId-" + plotId + ".kml"}
                href={"data:earth.kml+xml application/vnd.google-earth.kmz, "
                    + encodeURIComponent(KMLFeatures)}
            >
                {localeText.kmlDownload}
            </a>
        </>
    );
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userId={args.userId} userName={args.userName}>
            <SimpleCollection projectId={args.projectId}/>
        </NavigationBar>,
        document.getElementById("app")
    );
}
