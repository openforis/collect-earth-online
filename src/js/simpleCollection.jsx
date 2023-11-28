import React from "react";
import ReactDOM from "react-dom";
import _ from "lodash";

import { LoadingModal } from "./components/PageComponents";
import SvgIcon from "./components/svg/SvgIcon";

import { nicfiLayers } from "./imagery/imageryOptions";
import {
  last,
  everyObject,
  findObject,
  firstEntry,
  lengthObject,
  mapObject,
  safeLength,
  mapObjectArray,
  filterObject,
} from "./utils/sequence";
import { getQueryString, isNumber, getLanguage } from "./utils/generalUtils";
import { mercator } from "./utils/mercator";

const localeLanguages = {
  en: {
    loadingModal: "Loading project details",
    gettingPlot: "Getting plot",
    gettingFirstPlot: "Getting first plot",
    gettingNextPlot: "Getting next plot",
    gettingPrevPlot: "Getting previous plot",
    navPlot: "This plot has already been analyzed.",
    plotNotFound: "Plot {0} not found.",
    navNextEnd: "You have reached the end of the plot list.",
    navPrevEnd: "You have reached the beginning of the plot list.",
    errorNavNum: "Please enter a number to go to plot.",
    postSave: "Saving plot answers",
    errorSelect: "Please select at least one sample before choosing an answer.",
    errorSave: "All questions must be answered to save the collection.",
    saveButton: "Save",
    navLabel: "Navigate through",
    optionUn: "Unanalyzed plots",
    optionMy: "My analyzed plots",
    gotoPlot: "Go to plot",
    gotoFirstPlot: "Go to first plot",
    imageryTitle: "Imagery Options",
    imageryLoading: "Loading imagery data",
    kmlDownload: "Download Plot KML",
    selectTime: "Select time",
    infrared: "Infrared",
    updateMap: "Update Map",
  },
  es: {
    loadingModal: "Cargando detalles del proyecto",
    gettingPlot: "Obtener predicción",
    gettingFirstPlot: "Obtener primera predicción",
    gettingNextPlot: "Obteniendo siguiente predicción",
    gettingPrevPlot: "Obtener predicción anterior",
    navPlot: "Esta predicción ya ha sido analizado.",
    plotNotFound: "Predicción no encontrado.",
    navNextEnd: "Has llegado al final de la lista de predicciones.",
    navPrevEnd: "Has llegado al principio de la lista de predicciones.",
    errorNavNum: "Ingrese un número para ir a la  predicción.",
    postSave: "Guardando respuesta",
    errorSelect: "Seleccionar al menos una muestra antes de elegir una respuesta.",
    errorSave: "Todas las preguntas deben responderse para guardar la colección.",
    saveButton: "Guardar",
    navLabel: "Ir a",
    optionUn: "Predicciones no analizadas",
    optionMy: "Predicciones analizadas",
    gotoPlot: "Ir a la predicción",
    gotoFirstPlot: "Ir a primera predicción",
    imageryTitle: "Opciones de imágenes",
    imageryLoading: "Cargando datos de imágenes",
    kmlDownload: "Descargar predicción (KML)",
    selectTime: "Seleccionar fecha",
    infrared: "Infrarrojo",
    updateMap: "Actualizar mapa",
  },
};

class SimpleCollection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      collectionStart: 0,
      currentProject: { surveyQuestions: {}, institution: "" },
      currentImagery: { id: "", sourceConfig: {} },
      currentPlot: {},
      // attribution for showing in the map
      imageryAttribution: "",
      // attributes to record when sample is saved
      imageryAttributes: {},
      imageryList: [],
      mapConfig: null,
      unansweredColor: "black",
      selectedQuestionId: -1,
      selectedSampleId: -1,
      userSamples: {},
      userImages: {},
      showSidebar: false,
      modalMessage: null,
      navigationMode: "unanalyzed",
      myHeight: 0,
      isMobile: false,
      localeText:
        localeLanguages[
          ["en", "es"].includes(this.props.locale) ? this.props.locale : getLanguage(["en", "es"])
        ],
      KMLFeatures: null,
      plotList: [],
    };
  }

  componentDidMount() {
    window.name = "_ceo_collection";

    fetch(`/release-plot-locks?projectId=${this.props.projectId}`, { method: "POST" });

    this.updateWindow();
    this.getProjectData();
    window.addEventListener("touchend", this.updateWindow); // deepscan-disable-line REACT_MISSING_CLEANUP_IN_LIFECYCLE
    window.addEventListener("resize", this.updateWindow); // deepscan-disable-line REACT_MISSING_CLEANUP_IN_LIFECYCLE
  }

  componentDidUpdate(prevProps, prevState) {
    //
    // Initialize after apis return.
    //

    // Initialize map when imagery list is returned
    if (
      this.state.imageryList.length > 0 &&
      this.state.currentProject.boundary &&
      this.state.mapConfig == null
    ) {
      this.initializeProjectMap();
    }
    // Load all project plots initially
    if (
      this.state.mapConfig &&
      this.state.plotList.length > 0 &&
      (this.state.mapConfig !== prevState.mapConfig || prevState.plotList.length === 0)
    ) {
      this.showProjectOverview();
    }
    // initialize current imagery to project default
    if (
      this.state.mapConfig &&
      this.state.currentProject &&
      this.state.imageryList.length > 0 &&
      !this.state.currentImagery.id
    ) {
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
    const selectedQuestion =
      this.state.currentProject.surveyQuestions[this.state.selectedQuestionId];
    const prevSelectedQuestion =
      prevState.currentProject.surveyQuestions[prevState.selectedQuestionId];
    if (this.state.currentPlot.id && selectedQuestion.visible) {
      // Changing conditions for which samples need to be re-drawn
      if (
        this.state.selectedQuestionId !== prevState.selectedQuestionId ||
        this.state.unansweredColor !== prevState.unansweredColor ||
        this.state.userSamples !== prevState.userSamples ||
        selectedQuestion.visible !== prevSelectedQuestion.visible
      ) {
        this.showPlotSamples();
        this.highlightSamplesByQuestion();
        this.createPlotKML();
      }
    }

    // Update user samples calculations for display
    if (
      lengthObject(this.state.currentProject.surveyQuestions) &&
      this.state.userSamples !== prevState.userSamples
    ) {
      this.updateQuestionStatus();
    }
  }

  updateWindow = () => {
    window.scrollTo(0, 0);
    this.setState(
      {
        myHeight: window.innerHeight - 60,
        isMobile: window.innerWidth < 992, // Not sure where 992 came from but it matches the media query.
      },
      () => setTimeout(() => mercator.resize(this.state.mapConfig), 50)
    );
  };

  setImageryAttribution = (attributionSuffix) =>
    this.setState({
      imageryAttribution: this.state.currentImagery.attribution + attributionSuffix,
    });

  setImageryAttributes = (newImageryAttributes) =>
    this.setState({ imageryAttributes: newImageryAttributes });

  processModal = (message, callBack) =>
    new Promise(() =>
      Promise.resolve(
        this.setState({ modalMessage: message }, () =>
          callBack().finally(() => this.setState({ modalMessage: null }))
        )
      )
    );

  getProjectData = () =>
    this.processModal(this.state.localeText.loadingModal, () =>
      Promise.all([this.getProjectById(), this.getImageryList(), this.getProjectPlots()]).catch(
        (response) => {
          console.log(response);
          alert("Error retrieving the project info. See console for details.");
        }
      )
    );

  getProjectById = () =>
    fetch(`/get-project-by-id?projectId=${this.props.projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((project) => {
        if (project.id > 0) {
          this.setState({ currentProject: project });
          return Promise.resolve("resolved");
        } else {
          return Promise.reject("No project found with ID " + this.props.projectId + ".");
        }
      });

  getProjectPlots = () =>
    fetch(`/get-project-plots?projectId=${this.props.projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          this.setState({ plotList: data });
          return Promise.resolve("resolved");
        } else {
          return Promise.reject("No plot information found");
        }
      });

  getImageryList = () =>
    fetch(`/get-project-imagery?projectId=${this.props.projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          this.setState({
            imageryList: this.state.isMobile
              ? data.filter(
                  (i) =>
                    ![
                      "Planet",
                      "PlanetDaily",
                      "SecureWatch",
                      "Sentinel1",
                      "Sentinel2",
                      "GEEImage",
                      "GEEImageCollection",
                    ].includes(i.sourceConfig.type)
                )
              : data,
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
      this.state.imageryList
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
    this.setState({ mapConfig });
  };

  getImageryById = (imageryId) =>
    this.state.imageryList.find((imagery) => imagery.id === imageryId);

  showProjectOverview = () => {
    mercator.addPlotLayer(this.state.mapConfig, this.state.plotList, (feature) => {
      this.getPlotData(feature.get("features")[0].get("plotId"));
    });
  };

  setBaseMapSource = (newBaseMapSource) => {
    const currentImagery = this.getImageryById(newBaseMapSource);
    mercator.setVisibleLayer(this.state.mapConfig, currentImagery.id);
    this.setState({ currentImagery, imageryAttribution: currentImagery.attribution });
  };

  getPlotData = (visibleId, direction) => {
    const { navigationMode } = this.state;
    const { projectId } = this.props;
    this.processModal("Getting plot", () =>
      fetch(
        "/get-collection-plot?" +
          getQueryString({
            visibleId,
            projectId,
            navigationMode,
            direction,
          })
      )
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .then((data) => {
          if (data === "not-found") {
            alert(
              direction === "id"
                ? this.localeText.plotNotFound
                : direction === "next"
                ? this.localeText.navNextEnd
                : this.localeText.navPrevEnd
            );
          } else {
            this.setState({
              currentPlot: data[0],
              ...this.newPlotValues(data[0]),
            });
          }
        })
        .catch((response) => {
          console.error(response);
          alert("Error retrieving plot data. See console for details.");
        })
    );
  };

  navToFirstPlot = () => this.getPlotData(-10000000, "next");

  navToNextPlot = () => this.getPlotData(this.state.currentPlot.visibleId, "next");

  navToPrevPlot = () => this.getPlotData(this.state.currentPlot.visibleId, "previous");

  navToPlot = (newPlot) => {
    if (!isNaN(newPlot)) {
      this.getPlotData(newPlot, "id");
    } else {
      alert(this.state.localeText.errorNavNum);
    }
  };

  resetPlotValues = () => this.setState(this.newPlotValues(this.state.currentPlot, false));

  newPlotValues = (newPlot, copyValues = true) => ({
    newPlotInput: isNumber(newPlot.visibleId) ? newPlot.visibleId : newPlot.id,
    userSamples: newPlot.samples
      ? newPlot.samples.reduce(
          (acc, cur) => ({ ...acc, [cur.id]: copyValues ? cur.savedAnswers || {} : {} }),
          {}
        )
      : {},
    userImages: newPlot.samples
      ? newPlot.samples.reduce(
          (acc, cur) => ({ ...acc, [cur.id]: copyValues ? cur.userImage || {} : {} }),
          {}
        )
      : {},
    selectedQuestionId: Number(
      findObject(
        this.state.currentProject.surveyQuestions,
        ([_id, sq]) => sq.parentQuestionId === -1
      )[0]
    ),
    collectionStart: Date.now(),
    unansweredColor: "black",
  });

  zoomToPlot = () => mercator.zoomMapToLayer(this.state.mapConfig, "currentPlot", [36, 36, 84, 36]);

  showProjectPlot = () => {
    const { currentPlot, mapConfig, currentProject } = this.state;

    mercator.disableSelection(mapConfig);
    mercator.removeLayerById(mapConfig, "currentPlot");
    mercator.removeLayerById(mapConfig, "currentPlots");
    mercator.removeLayerById(mapConfig, "currentSamples");
    mercator.removeLayerById(mapConfig, "drawLayer");
    mercator.addVectorLayer(
      mapConfig,
      "currentPlot",
      mercator.geometryToVectorSource(
        currentPlot.plotGeom.includes("Point")
          ? mercator.getPlotPolygon(
              currentPlot.plotGeom,
              currentProject.plotSize,
              currentProject.plotShape
            )
          : mercator.parseGeoJson(currentPlot.plotGeom, true)
      ),
      mercator.ceoMapStyles("geom", "yellow")
    );

    this.zoomToPlot();
  };

  showPlotSamples = () => {
    const { mapConfig, unansweredColor, currentProject, selectedQuestionId } = this.state;
    const { visible } = currentProject.surveyQuestions[selectedQuestionId];
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
    mercator.enableSelection(mapConfig, "currentSamples", (sampleId) =>
      this.setState({ selectedSampleId: sampleId })
    );
  };

  createPlotKML = () => {
    const plotFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentPlot");
    const sampleFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples");
    this.setState({
      KMLFeatures: mercator.getKMLFromFeatures([
        mercator.asPolygonFeature(plotFeatures[0]),
        ...sampleFeatures,
      ]),
    });
  };

  setNavigationMode = (newMode) => this.setState({ navigationMode: newMode });

  postValuesToDB = () => {
    this.processModal(this.state.localeText.postSave, () =>
      fetch("/add-user-samples", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: this.props.projectId,
          plotId: this.state.currentPlot.id,
          confidence: -1,
          collectionStart: this.state.collectionStart,
          userSamples: this.state.userSamples,
          userImages: this.state.userImages,
        }),
      }).then((response) => {
        if (response.ok) {
          return this.navToNextPlot();
        } else {
          console.log(response);
          alert("Error saving your assignments to the database. See console for details.");
        }
      })
    );
  };

  getChildQuestionIds = (currentQuestionId) => {
    const { surveyQuestions } = this.state.currentProject;
    const childQuestionIds = mapObjectArray(
      filterObject(surveyQuestions, ([_id, val]) => val.parentQuestionId === currentQuestionId),
      ([key, _val]) => Number(key)
    );

    return childQuestionIds.length
      ? childQuestionIds.reduce(
          (acc, cur) => [...acc, ...this.getChildQuestionIds(cur)],
          [currentQuestionId]
        )
      : [currentQuestionId];
  };

  getSelectedSampleIds = (questionId) => {
    const { answered } = this.state.currentProject.surveyQuestions[questionId];
    const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];
    const selectedSamples = mercator.getSelectedSamples(this.state.mapConfig);
    const selectedFeatures = selectedSamples ? selectedSamples.getArray() : [];
    return (
      (selectedFeatures.length === 0 && answered.length === 0) ||
      lengthObject(this.state.userSamples) === 1
        ? allFeatures
        : selectedFeatures
    ).map((sf) => sf.get("sampleId"));
  };

  checkSelection = (sampleIds, questionId) => {
    const questionToSet = this.state.currentProject.surveyQuestions[questionId];
    const visibleIds = questionToSet.visible.map((v) => v.id);
    if (!this.warnOnNoSamples(this.state.currentPlot)) {
      return false;
    } else if (sampleIds.some((s) => !visibleIds.includes(s))) {
      alert("Invalid Selection. Try selecting the question before answering.");
      return false;
    } else if (sampleIds.length === 0) {
      alert("Please select at least one sample before choosing an answer.");
      return false;
    } else {
      return true;
    }
  };

  setCurrentValue = (questionId, answerId, answerText) => {
    const sampleIds = this.getSelectedSampleIds(questionId);

    if (this.checkSelection(sampleIds, questionId)) {
      const newSamples = sampleIds.reduce((acc, sampleId) => {
        const newQuestion = {
          questionId,
          answer: answerText,
          answerId,
        };

        const childQuestionIds = this.getChildQuestionIds(questionId);

        const subQuestionsCleared = filterObject(
          this.state.userSamples[sampleId],
          ([key, _val]) => !childQuestionIds.includes(Number(key))
        );

        return {
          ...acc,
          [sampleId]: {
            ...subQuestionsCleared,
            [questionId]: newQuestion,
          },
        };
      }, {});
      const newUserImages = sampleIds.reduce(
        (acc, sampleId) => ({
          ...acc,
          [sampleId]: {
            id: this.state.currentImagery.id,
            attributes:
              this.state.currentImagery.sourceConfig.type === "PlanetDaily"
                ? {
                    ...this.state.imageryAttributes,
                    imageryDatePlanetDaily: mercator.getTopVisiblePlanetLayerDate(
                      this.state.mapConfig,
                      this.state.currentImagery.id
                    ),
                  }
                : this.state.imageryAttributes,
          },
        }),
        {}
      );
      this.setState({
        userSamples: { ...this.state.userSamples, ...newSamples },
        userImages: { ...this.state.userImages, ...newUserImages },
        selectedQuestionId: questionId,
      });
    }
  };

  setSelectedQuestion = (newId) => this.setState({ selectedQuestionId: newId });

  highlightSamplesByQuestion = () => {
    const { selectedQuestionId, currentProject } = this.state;
    const { answers, componentType } = currentProject.surveyQuestions[selectedQuestionId];
    const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];

    allFeatures
      .filter((feature) => {
        const sampleId = feature.get("sampleId");
        return (
          this.state.userSamples[sampleId] && this.state.userSamples[sampleId][selectedQuestionId]
        );
      })
      .forEach((feature) => {
        const sampleId = feature.get("sampleId");
        const userAnswer = _.get(
          this.state,
          ["userSamples", sampleId, selectedQuestionId, "answerId"],
          -1
        );
        const color =
          componentType === "input"
            ? _.get(firstEntry(answers), [1, "color"], "")
            : _.get(answers, [userAnswer, "color"], "");

        mercator.highlightSampleGeometry(feature, color);
      });
    this.setState({ selectedSampleId: -1 });
  };

  calcVisibleSamples = (currentQuestionId) => {
    const {
      currentProject: { surveyQuestions },
      userSamples,
    } = this.state;
    const { parentQuestionId, parentAnswerIds } = surveyQuestions[currentQuestionId];

    if (parentQuestionId === -1) {
      return this.state.currentPlot.samples;
    } else {
      return this.calcVisibleSamples(parentQuestionId).filter((sample) => {
        const sampleAnswerId = _.get(userSamples, [sample.id, parentQuestionId, "answerId"]);
        return (
          sampleAnswerId != null &&
          (parentAnswerIds.length === 0 || parentAnswerIds.includes(sampleAnswerId))
        );
      });
    }
  };

  updateQuestionStatus = () => {
    const { userSamples } = this.state;
    const newSurveyQuestions = mapObject(
      this.state.currentProject.surveyQuestions,
      ([questionId, question]) => {
        const visible = this.calcVisibleSamples(Number(questionId)) || [];
        const answered = visible
          .filter((vs) => userSamples[vs.id][questionId])
          .map((vs) => ({
            sampleId: vs.id,
            answerId: Number(userSamples[vs.id][questionId].answerId),
            answerText: userSamples[vs.id][questionId].answer,
          }));
        return [questionId, { ...question, visible, answered }];
      }
    );

    this.setState({
      currentProject: {
        ...this.state.currentProject,
        surveyQuestions: newSurveyQuestions,
      },
    });
  };

  setUnansweredColor = (newColor) => this.setState({ unansweredColor: newColor });

  render() {
    const { imageryAttribution } = this.state;
    const infoStyle = {
      position: "absolute",
      top: "0px",
      textAlign: "center",
      height: "auto",
      width: "100%",
      padding: "0.25rem",
      color: "white",
      backgroundColor: "rgba(75,75,150,1.0)",
      zIndex: "100",
    };

    return (
      <div className="row" style={{ height: this.state.myHeight }}>
        {this.state.modalMessage && <LoadingModal message={this.state.modalMessage} />}
        <div className="w-100 position-relative overflow-hidden" id="mobile-analysis-pane">
          <div style={infoStyle}>
            <p style={{ fontSize: ".9rem", marginBottom: "0" }}>{imageryAttribution}</p>
          </div>
          <MiniQuestions
            isMobile={this.state.isMobile}
            localeText={this.state.localeText}
            navToFirstPlot={this.navToFirstPlot}
            postValuesToDB={this.postValuesToDB}
            selectedSampleId={
              Object.keys(this.state.userSamples).length === 1
                ? parseInt(Object.keys(this.state.userSamples)[0])
                : this.state.selectedSampleId
            }
            setCurrentValue={this.setCurrentValue}
            showQuestions={this.state.currentPlot.id}
            surveyQuestions={this.state.currentProject.surveyQuestions}
          />
          {/* Side Bar */}
          <div
            className="border-left h-100"
            id="simple-sidebar"
            style={{
              background: "white",
              right: this.state.showSidebar ? 0 : "max(-25rem, -100%)",
              zIndex: 101,
              width: "min(25rem, 100%)",
              position: "absolute",
              transition: "all 200ms ease-in",
            }}
          >
            <div
              onClick={() => this.setState({ showSidebar: !this.state.showSidebar })}
              style={{
                borderRadius: "10% 0 0 10%",
                position: "absolute",
                padding: ".5rem .5rem",
                width: "2.5rem",
                left: "-2.5rem",
                top: "3rem",
                background: "white",
              }}
            >
              <SvgIcon
                color="black"
                icon={this.state.showSidebar ? "rightDouble" : "leftDouble"}
                size="1.5rem"
              />
            </div>
            <div
              onClick={() => this.setState({ showSidebar: false })}
              style={{ position: "absolute", right: "1rem", top: "1rem" }}
            >
              <SvgIcon color="black" icon="close" size="1.5rem" />
            </div>
            <h2
              className="header overflow-hidden text-truncate w-100 m-0"
              style={{ marginBottom: "0" }}
              title={this.state.currentProject.name}
            >
              {this.state.currentProject.name}
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "1rem 2rem",
                textAlign: "center",
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
                setNavigationMode={this.setNavigationMode}
                visibleId={this.state.currentPlot.visibleId}
              />
              <div className="my-3" />
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
                <a
                  className="btn btn-outline-lightgreen btn-sm btn-block my-2"
                  download={
                    "ceo_projectId-" +
                    this.state.currentProject.id +
                    "_plotId-" +
                    this.state.currentPlot.visibleId +
                    ".kml"
                  }
                  href={
                    "data:earth.kml+xml application/vnd.google-earth.kmz, " +
                    encodeURIComponent(this.state.KMLFeatures)
                  }
                >
                  {this.state.localeText.kmlDownload}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function AnswerButtons({ surveyNodeId, surveyNode, selectedSampleId, setCurrentValue }) {
  const { answers, answered } = surveyNode;
  return mapObjectArray(answers, ([strId, ans]) => {
    const ansId = Number(strId);
    return (
      <button
        key={ansId}
        className="btn btn-outline-darkgray mr-3 px-1 py-2"
        onClick={() => setCurrentValue(surveyNodeId, ansId, ans.answer)}
        style={{
          boxShadow: (answered || []).some(
            (a) => a.answerId === ansId && a.sampleId === selectedSampleId
          )
            ? "0px 0px 8px 3px black inset"
            : "initial",
          width: "fit-content",
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
            marginTop: "4px",
          }}
        />
        {ans.answer}
      </button>
    );
  });
}

class MiniQuestions extends React.Component {
  checkCanSave = () => {
    const { surveyQuestions, localeText } = this.props;
    const allAnswered = everyObject(
      surveyQuestions,
      ([_id, sq]) => safeLength(sq.visible) === safeLength(sq.answered)
    );
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
      navToFirstPlot,
    } = this.props;

    const questionStyle = {
      marginLeft: "auto",
      marginRight: "auto",
      left: 0,
      right: 0,
      position: "absolute",
      bottom: isMobile ? "48px" : "24px",
      maxWidth: "fit-content",
      zIndex: 100,
    };
    return (
      <div id="MiniQuestions" style={questionStyle}>
        <div className="d-flex justify-content-between">
          {showQuestions ? (
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
            <button className="btn btn-lightgreen" onClick={navToFirstPlot} type="button">
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
      newPlotInput: "",
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.visibleId !== prevProps.visibleId)
      this.setState({ newPlotInput: this.props.visibleId });
  }

  updateNewPlotId = (value) => this.setState({ newPlotInput: value });

  render() {
    const {
      setNavigationMode,
      navigationMode,
      isProjectAdmin,
      navToPrevPlot,
      navToNextPlot,
      navToPlot,
      localeText,
    } = this.props;
    return (
      <>
        <div className="d-flex flex-column align-items-center my-2">
          <h3 className="w-100">{localeText.navLabel}:</h3>
          <select
            className="form-control form-control-sm mr-2"
            onChange={(e) => setNavigationMode(e.target.value)}
            style={{ flex: "1 1 auto" }}
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
            onClick={navToPrevPlot}
            type="button"
          >
            <SvgIcon icon="leftArrow" size="0.9rem" />
          </button>
          <button
            className="btn btn-outline-lightgreen btn-sm mx-1"
            onClick={navToNextPlot}
            type="button"
          >
            <SvgIcon icon="rightArrow" size="0.9rem" />
          </button>
          <input
            autoComplete="off"
            className="col-4 px-0 ml-2 mr-1"
            id="plotId"
            onChange={(e) => this.updateNewPlotId(e.target.value)}
            type="number"
            value={this.state.newPlotInput}
          />
          <button
            className="btn btn-lightgreen btn-sm"
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
        onChange={(e) => props.setBaseMapSource(parseInt(e.target.value))}
        size="1"
        value={props.currentImageryId}
      >
        {props.imageryList.map((imagery) => (
          <option key={imagery.id} value={imagery.id}>
            {imagery.title}
          </option>
        ))}
      </select>
      {props.currentImageryId &&
        props.imageryList.map(
          (imagery) =>
            imagery.sourceConfig &&
            imagery.sourceConfig.type === "PlanetNICFI" && (
              <PlanetNICFIMenu
                key={imagery.id}
                currentPlot={props.currentPlot}
                currentProjectBoundary={props.currentProjectBoundary}
                localeText={props.localeText}
                mapConfig={props.mapConfig}
                setImageryAttributes={props.setImageryAttributes}
                setImageryAttribution={props.setImageryAttribution}
                sourceConfig={imagery.sourceConfig}
                thisImageryId={imagery.id}
                visible={props.currentImageryId === imagery.id}
              />
            )
        )}
    </>
  );
}

export class PlanetNICFIMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedTime:
        this.props.sourceConfig.time === "newest"
          ? last(nicfiLayers)
          : this.props.sourceConfig.time,
      selectedBand: this.props.sourceConfig.band,
    };
  }

  componentDidMount() {
    this.updatePlanetLayer();
  }

  componentDidUpdate(prevProps) {
    if (this.props.visible && prevProps.visible !== this.props.visible) {
      this.updateImageryInformation();
    }
  }

  updateImageryInformation = () => {
    if (this.props.visible) {
      this.props.setImageryAttribution(` | ${this.state.selectedTime} Mosaic`);
      this.props.setImageryAttributes({
        time: this.state.selectedTime,
      });
    }
  };

  updatePlanetLayer = () => {
    this.updateImageryInformation();
    mercator.updateLayerSource(
      this.props.mapConfig,
      this.props.thisImageryId,
      this.props.currentProjectBoundary,
      (sourceConfig) => ({
        ...sourceConfig,
        time: this.state.selectedTime,
        band: this.state.selectedBand,
      })
    );
  };

  render() {
    const { localeText } = this.props;
    return (
      <div className="my-2" style={{ display: this.props.visible ? "block" : "none" }}>
        <div className="slide-container">
          <label className="mb-0 mr-3" htmlFor="time-selection">
            {localeText.selectTime}
          </label>
          <select
            id="time-selection"
            onChange={(e) => this.setState({ selectedTime: e.target.value })}
            value={this.state.selectedTime}
          >
            {nicfiLayers.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        <div className="slide-container">
          <div id="radio-group">
            <div className="form-check form-check-inline">
              <input
                checked={this.state.selectedBand === "rgb"}
                className="form-check-input"
                id="visible"
                onChange={() => this.setState({ selectedBand: "rgb" })}
                type="radio"
              />
              <label className="form-check-label" htmlFor="visible">
                Visible
              </label>
            </div>
            <div className="form-check form-check-inline">
              <input
                checked={this.state.selectedBand === "cir"}
                className="form-check-input"
                id="infrared"
                onChange={() => this.setState({ selectedBand: "cir" })}
                type="radio"
              />
              <label className="form-check-label" htmlFor="infrared">
                {localeText.infrared}
              </label>
            </div>
          </div>
        </div>
        <div className="slide-container">
          <button
            className="btn btn-lightgreen btn-sm"
            onClick={this.updatePlanetLayer}
            type="button"
          >
            {localeText.updateMap}
          </button>
        </div>
      </div>
    );
  }
}

function NavigationBar({ children }) {
  return (
    <>
      <nav
        className="navbar navbar-expand-lg navbar-light fixed-top py-0"
        id="main-nav"
        style={{ backgroundColor: "white", borderBottom: "1px solid black" }}
      >
        <a className="navbar-brand pt-1 pb-1" href="/home">
          <img alt="Home" className="img-fluid" id="ceo-site-logo" src="/img/ceo-logo.png" />
        </a>
        {/* <a className="nav-link" href="/collection">Desktop</a> */}
      </nav>
      {children}
    </>
  );
}

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar version={session.versionDeployed}>
      <SimpleCollection locale={params.locale} projectId={params.projectId} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
