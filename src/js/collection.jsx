import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import _ from "lodash";

import { LoadingModal, NavigationBar, LearningMaterialModal } from "./components/PageComponents";
import SurveyCollection from "./survey/SurveyCollection";
import {
  PlanetMenu,
  PlanetDailyMenu,
  PlanetNICFIMenu,
  SecureWatchMenu,
  SentinelMenu,
  GEEImageMenu,
  GEEImageCollectionMenu,
} from "./imagery/collectionMenuControls";
import { CollapsibleTitle } from "./components/FormComponents";
import Modal from "./components/Modal";
import RadioButton from "./components/RadioButton";
import Select from "./components/Select";
import SvgIcon from "./components/svg/SvgIcon";

import { getQueryString, isNumber, asPercentage, isArray } from "./utils/generalUtils";
import {
  everyObject,
  findObject,
  firstEntry,
  lengthObject,
  mapObject,
  safeLength,
  mapObjectArray,
  filterObject,
} from "./utils/sequence";
import { getProjectPreferences, setProjectPreferences } from "./utils/preferences";
import { mercator } from "./utils/mercator";
import { outlineKML } from "./utils/kml";

class Collection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      collectionStart: 0,
      currentProject: { surveyQuestions: {}, institution: "" },
      currentImagery: { id: "", sourceConfig: {} },
      currentPlot: {},
      currentUserId: -1,
      // attribution for showing in the map
      imageryAttribution: "",
      // attributes to record when sample is saved
      imageryAttributes: {},
      imageryIds: [],
      imageryList: [],
      inReviewMode: false,
      mapConfig: null,
      messageBox: null,
      plotList: [],
      plotters: [],
      userPlotList: [],
      remainingPlotters: [],
      unansweredColor: "black",
      selectedQuestionId: -1,
      selectedSampleId: -1,
      userSamples: {},
      originalUserSamples: {},
      userImages: {},
      storedInterval: null,
      KMLFeatures: null,
      showBoundary: true,
      showSamples: true,
      showSidebar: false,
      showQuitModal: false,
      answerMode: "question",
      modalMessage: null,
      navigationMode: "natural",
      threshold: 90,
    };
  }

  componentDidMount() {
    window.name = "_ceo_collection";
    window.addEventListener("beforeunload", this.unsavedWarning, { capture: true });

    fetch(`/release-plot-locks?projectId=${this.props.projectId}`, { method: "POST" });

    this.getProjectData();
  }

  componentDidUpdate(prevProps, prevState) {
    //
    // Initialize after apis return.
    //

    // Initialize map when imagery list is returned
    if (
      this.state.imageryList.length > 0 &&
      this.state.currentProject.aoiFeatures &&
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
    if (this.state.currentPlot.id && (
      this.state.currentPlot.id !== prevState.currentPlot.id
      || this.state.showBoundary !== prevState.showBoundary
    )
       ) {
      this.showProjectPlot();
      if (
        this.state.currentProject.hasGeoDash &&
        this.state.currentProject.projectOptions.autoLaunchGeoDash
      ) {
        this.showGeoDash();
      }
      clearInterval(this.state.storedInterval);
      this.setState({ storedInterval: setInterval(this.resetPlotLock, 1 * 60 * 1000) });
      //  updateMapImagery is poorly named, this function is detecting if we need to show the "zoom to" overlay
      this.updateMapImagery();
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
        selectedQuestion.visible !== prevSelectedQuestion.visible ||
          this.state.showSamples !== prevState.showSamples ||
          this.state.showBoundary !== prevState.showBoundary
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

    //  updateMapImagery is poorly named, this action is detecting if we need to show the "zoom to" overlay
    if (
      this.state.mapConfig &&
      this.state.currentImagery.id &&
      (this.state.currentImagery.id !== prevState.currentImagery.id ||
        this.state.mapConfig !== prevState.mapConfig)
    ) {
      if (!prevState.imageryIdsArray.includes(this.state.currentImagery.id)) {
        this.setState((prevState) => ({
          imageryIds: [...prevState.imageryIds, this.state.currentImagery.id],
        }));
      }
      this.updateMapImagery();
    }
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.unsavedWarning, { capture: true });
  }

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

  showAlert = ({ title, body, closeText = "Close" }) =>
    this.setState({
      messageBox: {
        body,
        closeText,
        title,
        type: "alert",
      },
    });

  getProjectData = () =>
    this.processModal("Loading project details", () =>
      Promise.all([
        this.getProjectById(),
        this.getProjectPlots(),
        this.getImageryList(),
        this.getPlotters(),
      ])
        .then(() => {
          const reviewWarning = this.state.inReviewMode
            ? "You are currently in 'Review Mode.'"
            : "";
          if (this.state.currentProject.availability === "unpublished") {
            this.showAlert({
              title: "Warning: Draft Mode",
              body:
                "This project is in draft mode. Only admins can collect. Any plot collections will be erased when the project is published.\n" +
                reviewWarning,
              closeText: "OK, I understand",
            });
          } else if (this.state.currentProject.availability === "closed") {
            this.showAlert({
              title: "Project Closed",
              body:
                "This project has been closed. Admins can make corrections to any plot.\n " +
                reviewWarning,
            });
          } else if (this.state.inReviewMode) {
            this.showAlert({
              title: "Review Mode",
              body: reviewWarning,
            });
          }
        })
        .catch((response) => {
          console.log(response);
          alert("Error retrieving the project info. See console for details.");
        })
    );

  getProjectById = () =>
    fetch(`/get-project-by-id?projectId=${this.props.projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((project) => {
        // TODO This logic is currently invalid since this route can never return an archived project.
        if (project.id > 0 && project.availability !== "archived") {
          this.setState({ currentProject: project });
          const { inReviewMode } = getProjectPreferences(project.id);
          this.setReviewMode(
            project.isProjectAdmin &&
              (inReviewMode || (project.availability === "closed" && inReviewMode !== false))
          );
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
          this.setState({ imageryList: data });
          return Promise.resolve("resolved");
        } else {
          return Promise.reject("No project imagery found");
        }
      });

  getPlotters = () =>
    fetch(`/get-plotters?projectId=${this.props.projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (isArray(data)) {
          this.setState({ plotters: data });
          return Promise.resolve("resolved");
        } else {
          return Promise.reject("Error getting plotter data.");
        }
      });

  initializeProjectMap = () => {
    const mapConfig = mercator.createMap(
      "image-analysis-pane",
      [0.0, 0.0],
      1,
      this.state.imageryList
    );
    mercator.addVectorLayer(
      mapConfig,
      "currentAOI",
      mercator.geomArrayToVectorSource(this.state.currentProject.aoiFeatures,),
      mercator.ceoMapStyles("geom", "yellow")
    );
    mercator.zoomMapToLayer(mapConfig, "currentAOI", 48);
    this.setState({ mapConfig });
  };

  showProjectOverview = () => {
    mercator.addPlotLayer(this.state.mapConfig, this.state.plotList, (feature) =>
      this.getPlotData(feature.get("features")[0].get("plotId"), "id")
    );
  };

  setBaseMapSource = (newBaseMapSource) => {
    // remove planet daily layer switcher
    mercator.currentMap
      .getControls()
      .getArray()
      .filter((control) => control.element.classList.contains("planet-layer-switcher"))
      .map((control) => mercator.currentMap.removeControl(control));
    this.setState(
      {
        currentImagery: this.getImageryById(newBaseMapSource),
      },
      () => {
        // all other than having separate menu components
        if (
          ![
            "Planet",
            "PlanetDaily",
            "SecureWatch",
            "Sentinel1",
            "Sentinel2",
            "GEEImage",
            "GEEImageCollection",
          ].includes(this.state.currentImagery.sourceConfig.type)
        ) {
          this.setImageryAttribution("");
        }
      }
    );
  };

  updateMapImagery = () => {
    const { currentPlot, mapConfig, currentImagery } = this.state;
    mercator.setVisibleLayer(this.state.mapConfig, this.state.currentImagery.id);
    if (
      currentPlot &&
      !currentPlot.id &&
      ["PlanetDaily", "SecureWatch"].includes(currentImagery.sourceConfig.type)
    ) {
      mercator.setLayerVisibilityByLayerId(mapConfig, "goToPlot", true);
    } else {
      mercator.setLayerVisibilityByLayerId(mapConfig, "goToPlot", false);
    }
  };

  getImageryById = (imageryId) =>
    this.state.imageryList.find((imagery) => imagery.id === imageryId);

  warnOnNoSamples = (plotData) => {
    if (plotData.samples.length === 0 && !this.state.currentProject.allowDrawnSamples) {
      alert("This plot has no samples. Please flag the plot.");
      return false;
    } else {
      return true;
    }
  };

  getPlotData = (visibleId, direction, forcedNavMode = null) => {
    const { currentUserId, navigationMode, inReviewMode, threshold } = this.state;
    const { projectId } = this.props;
    this.processModal("Getting plot", () =>
      fetch(
        "/get-collection-plot?" +
          getQueryString({
            visibleId,
            projectId,
            navigationMode: forcedNavMode || navigationMode,
            direction,
            inReviewMode,
            threshold,
            currentUserId,
          })
      )
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .then((data) => {
          if (data === "not-found") {
            const err = (direction === "id" ? "Plot not" : "No more plots") +
                  " found for this navigation mode.";
            const reviewModeWarning = "\n If you have just changed navigation modes, please click the “Next” or “Back” arrows in order to see the plots for this navigation mode.";
            alert(
              inReviewMode ? err + reviewModeWarning : err
            );
          } else {
            this.setState({
              userPlotList: data,
              remainingPlotters: data,
              currentPlot: data[0],
              currentUserId: data[0].userId,
              ...this.newPlotValues(data[0]),
              answerMode: "question",
            });
            // TODO, this is probably redundant.  Projects are not allowed to be created with no samples.
            this.warnOnNoSamples(data[0]);
          }
        })
        .catch((response) => {
          console.error(response);
          alert("Error retrieving plot data. See console for details.");
        })
    );
  };

  hasChanged = () => !_.isEqual(this.state.userSamples, this.state.originalUserSamples);

  // https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
  unsavedWarning = (e) => {
    if (this.hasChanged()) {
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return "You have unsaved changes. Are you sure you want to leave?";
    }
  };

  confirmUnsaved = () =>
    !this.hasChanged() ||
    confirm(
      "You have unsaved changes. Any unsaved responses will be lost. Are you sure you want to continue?"
    );

  navToFirstPlot = () =>
    this.getPlotData(-10000000, "next", this.state.navigationMode === "natural" && "unanalyzed");

  navToNextPlot = (ignoreCheck) => {
    if (ignoreCheck || this.confirmUnsaved()) {
      this.getPlotData(this.state.currentPlot.visibleId, "next");
    }
  };

  navToPrevPlot = () => {
    if (this.confirmUnsaved()) {
      this.getPlotData(this.state.currentPlot.visibleId, "previous");
    }
  };

  navToPlot = (newPlot) => {
    if (!isNaN(newPlot)) {
      if (this.confirmUnsaved()) {
        this.getPlotData(newPlot, "id");
      }
    } else {
      alert("Please enter a number to go to plot.");
    }
  };

  resetPlotLock = () => {
    fetch("/reset-plot-lock", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plotId: this.state.currentPlot.id,
        projectId: this.props.projectId,
      }),
    }).then((response) => {
      if (!response.ok) {
        console.log(response);
        alert(
          "Error maintaining plot lock. Your work may get overwritten. See console for details."
        );
      }
    });
  };

  resetPlotValues = () => {
    this.setState(this.newPlotValues(this.state.currentPlot, false));
  };

  newPlotValues = (newPlot, copyValues = true) => ({
    newPlotInput: newPlot.visibleId,
    userSamples: newPlot.samples
      ? newPlot.samples.reduce(
          (acc, cur) => ({ ...acc, [cur.id]: copyValues ? cur.savedAnswers || {} : {} }),
          {}
        )
      : {},
    originalUserSamples: newPlot.samples
      ? copyValues
        ? newPlot.samples.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.savedAnswers || {} }), {})
        : this.state.originalUserSamples
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

  zoomToPlot = () => mercator.zoomMapToLayer(this.state.mapConfig, "currentPlot", 36);

  showProjectPlot = () => {
    const { currentPlot, mapConfig, currentProject, showBoundary} = this.state;
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
          ? mercator.getPlotPolygon(
              currentPlot.plotGeom,
              currentProject.plotSize,
              currentProject.plotShape
            )
          : mercator.parseGeoJson(currentPlot.plotGeom, true)
      ),
      mercator.ceoMapStyles("geom", (showBoundary ? "yellow" : "transparent")
                           )
    );
    this.zoomToPlot();
  };

  showPlotSamples = () => {
    const { mapConfig, unansweredColor, currentProject, selectedQuestionId, showSamples} = this.state;
    const { visible } = currentProject.surveyQuestions[selectedQuestionId];
    mercator.disableSelection(mapConfig);
    mercator.disableDrawing(mapConfig);
    mercator.removeLayerById(mapConfig, "currentSamples");
    mercator.removeLayerById(mapConfig, "drawLayer");
    mercator.addVectorLayer(
      mapConfig,
      "currentSamples",
      mercator.samplesToVectorSource(visible),
      mercator.ceoMapStyles("geom", (showSamples ? unansweredColor : "transparent"))
    );
    mercator.enableSelection(
      mapConfig,
      "currentSamples",
      (sampleId) => sampleId !== -1 && this.setState({ selectedSampleId: sampleId })
    );
  };

  featuresToDrawLayer = (drawTool) => {
    const { mapConfig, currentPlot } = this.state;
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
    const { mapConfig, userSamples, userImages, currentPlot } = this.state;
    mercator.disableDrawing(mapConfig);
    const allFeatures = mercator.getAllFeatures(mapConfig, "drawLayer") || [];
    const existingIds = allFeatures.map((f) => f.get("sampleId")).filter((id) => id);
    const getMax = (samples) => Math.max(0, ...existingIds, ...samples.map((s) => s.id));
    const newSamples = allFeatures.reduce(
      (acc, cur) => [
        ...acc,
        {
          id: cur.get("sampleId") || getMax(acc) + 1,
          visibleId: cur.get("visibleId"),
          sampleGeom: mercator.geometryToGeoJSON(cur.getGeometry(), "EPSG:4326", "EPSG:3857"),
        },
      ],
      []
    );

    this.setState({
      currentPlot: { ...currentPlot, samples: newSamples },
      userSamples: newSamples.reduce(
        (acc, cur) => ({ ...acc, [cur.id]: userSamples[cur.id] || {} }),
        {}
      ),
      userImages: newSamples.reduce(
        (acc, cur) => ({ ...acc, [cur.id]: userImages[cur.id] || {} }),
        {}
      ),
    });
  };

  toggleShowBoundary = () => {
    this.setState ({...this.state,
                    showBoundary: !this.state.showBoundary
                   });
  };

  toggleShowSamples = () => {
    this.setState ({...this.state,
                    showSamples: !this.state.showSamples
                   });
  };

  showGeoDash = () => {
    const { currentPlot, mapConfig, currentProject } = this.state;
    const plotRadius = currentProject.plotSize
      ? currentProject.plotSize / 2.0
      : mercator.getViewRadius(mapConfig);
    window.open(
      "/geo-dash?" +
        `institutionId=${this.state.currentProject.institution}` +
        `&projectId=${this.props.projectId}` +
        `&visiblePlotId=${currentPlot.visibleId}` +
        `&plotId=${currentPlot.id}` +
        `&plotExtent=${encodeURIComponent(JSON.stringify(mercator.getViewExtent(mapConfig)))}` +
        `&plotShape=${
          currentPlot.plotGeom.includes("Point") ? currentProject.plotShape : "polygon"
        }` +
        `&center=${currentPlot.plotGeom.includes("Point") ? currentPlot.plotGeom : ""}` +
        `&radius=${plotRadius}`,
      `_geo-dash_${this.props.projectId}`
    );
  };


  createPlotKML = () => {
    const plotFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentPlot");
    const sampleFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples");
    let KMLFeatures = mercator.getKMLFromFeatures([
      mercator.asPolygonFeature(plotFeatures[0]),
      ...sampleFeatures,
    ]);

    this.setState({
      KMLFeatures: outlineKML(KMLFeatures)
    });
  };

  setNavigationMode = (newMode) => this.setState({ navigationMode: newMode });

  setReviewMode = (inReviewMode) => {
    const { currentProject } = this.state;
    this.setState({ inReviewMode });
    setProjectPreferences(currentProject.id, { inReviewMode });
    if (inReviewMode && this.state.navigationMode === "natural") {
      this.setNavigationMode("analyzed");
    } else if (!inReviewMode && ["qaqc", "user"].includes(this.state.navigationMode)) {
      this.setNavigationMode("natural");
    }
  };

  setThreshold = (threshold) => this.setState({ threshold });

  setCurrentUserId = (currentUserId) => {
    const { userPlotList } = this.state;
    const newPlot = (userPlotList || []).find((p) => p.userId === currentUserId);
    if (newPlot) {
      this.setState({
        currentUserId,
        currentPlot: newPlot,
        ...this.newPlotValues(newPlot),
      });
    } else {
      this.setState({ currentUserId });
    }
  };

  hasAnswers = () =>
    _.some(Object.values(this.state.userSamples), (sample) => !_.isEmpty(sample)) ||
    _.some(Object.values(this.state.userSamples), (sample) => !_.isEmpty(sample));

  confirmFlag = () =>
    !this.hasAnswers() ||
    confirm(
      "Flagging this plot will delete your previous answers. Are you sure you want to continue?"
    );

  flagPlot = () => {
    if (this.confirmFlag()) {
      this.processModal("Saving flagged plot", () =>
        fetch("/flag-plot", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: this.props.projectId,
            plotId: this.state.currentPlot.id,
            collectionStart: this.state.collectionStart,
            flaggedReason: this.state.currentPlot.flaggedReason,
            inReviewMode: this.state.inReviewMode,
            currentUserId: this.state.currentUserId,
          }),
        }).then((response) => {
          if (response.ok) {
            return this.navToNextPlot(true);
          } else {
            console.log(response);
            alert("Error flagging plot as bad. See console for details.");
          }
        })
      );
    }
  };

  savePlotAnswers = () => {
    this.processModal("Saving plot answers", () =>
      fetch("/add-user-samples", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: this.props.projectId,
          plotId: this.state.currentPlot.id,
          confidence: this.state.currentProject.projectOptions.collectConfidence
            ? this.state.currentPlot.confidence
            : -1,
          confidenceComment: this.state.currentProject.projectOptions.collectConfidence
            ? this.state.currentPlot.confidenceComment
            : null,
          collectionStart: this.state.collectionStart,
          userSamples: this.state.userSamples,
          userImages: this.state.userImages,
          newPlotSamples:
            this.state.currentProject.allowDrawnSamples && this.state.currentPlot.samples,
          inReviewMode: this.state.inReviewMode,
          currentUserId: this.state.currentUserId,
          imageryIds: this.state.imageryIds
        }),
      }).then((response) => {
        if (response.ok) {
          if (this.state.inReviewMode) {
            this.setState({ remainingPlotters: this.state.remainingPlotters.filter((plotter) => plotter.userId != this.state.currentUserId) });
            if(this.state.remainingPlotters.length > 0) {
              alert("There are more interpretations for this plot.\nPlease select the user from the user dropdown to review another interpretation.")
              return null;
            }
          }
          return this.navToNextPlot(true);
        } else {
          console.log(response);
          alert("Error saving your assignments to the database. See console for details.");
        }
      })
    );
  };

  postValuesToDB = () => {
    if (this.state.currentPlot.flagged) {
      this.flagPlot();
    } else {
      this.savePlotAnswers();
    }
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

  keyDifference = (o1, features) => {
    const objKeys = o1.map(i => i.sampleId);
    const sampleIds = features.map(f => f.get("sampleId"));
    const unansweredKeys = sampleIds.filter(k => !objKeys.includes(k));
    return features.filter(f => unansweredKeys.includes(f.get("sampleId")));
  };

  getSelectedSampleIds = (questionId) => {
    const { answered } = this.state.currentProject.surveyQuestions[questionId];
    const allFeatures = mercator.getAllFeatures(this.state.mapConfig, "currentSamples") || [];
    const unansweredFeatures = this.keyDifference(answered, allFeatures);
    const selectedSamples = mercator.getSelectedSamples(this.state.mapConfig);
    const selectedFeatures = selectedSamples ? selectedSamples.getArray() : [];
    return (
      (selectedFeatures.length === 0 && answered.length === 0) ||
        lengthObject(this.state.userSamples) === 1
        ? allFeatures
        : selectedFeatures.length !== 0
        ? selectedFeatures
        : unansweredFeatures
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
          answerId,
          ...(answerText !== "" && { answer: answerText }),
        };

        const childQuestionIds = this.getChildQuestionIds(questionId);

        const subQuestionsCleared = filterObject(
          this.state.userSamples[sampleId],
          ([key, _val]) => !childQuestionIds.includes(Number(key))
        );

        return (answerText != null &&
                answerText != undefined) ?
        {
          ...acc,
          [sampleId]: {
            ...subQuestionsCleared,
            [questionId]: newQuestion,
          },
        } : { ...acc };
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
          componentType === "input" && userAnswer >= 0
            ? _.get(firstEntry(answers), [1, "color"], "")
            : _.get(answers, [userAnswer, "color"], "");

        mercator.highlightSampleGeometry(feature, color);
      });
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

  toggleQuitModal = () => this.setState({ showQuitModal: !this.state.showQuitModal });

  toggleFlagged = () =>
    this.setState({
      currentPlot: { ...this.state.currentPlot, flagged: !this.state.currentPlot.flagged },
    });

  setUnansweredColor = (newColor) => this.setState({ unansweredColor: newColor });

  setAnswerMode = (newMode, drawTool) => {
    if (this.state.answerMode !== newMode) {
      if (newMode === "draw") {
        this.featuresToDrawLayer(drawTool);
      } else {
        this.featuresToSampleLayer();
        this.setSelectedQuestion(Number(firstEntry(this.state.currentProject.surveyQuestions)[0]));
      }
      this.setState({ answerMode: newMode });
    }
  };

  setConfidence = (confidence) =>
    this.setState({ currentPlot: { ...this.state.currentPlot, confidence } });

  setFlaggedReason = (flaggedReason) =>
    this.setState({ currentPlot: { ...this.state.currentPlot, flaggedReason } });

  setConfidenceComment = (confidenceComment) =>
    this.setState({ currentPlot: { ...this.state.currentPlot, confidenceComment } });

  render() {
    return (
      <div className="row" style={{ height: "-webkit-fill-available" }}>
        {this.state.modalMessage && <LoadingModal message={this.state.modalMessage} />}
        <ImageAnalysisPane imageryAttribution={this.state.imageryAttribution} />
        <div
          className="d-lg-none btn btn-lightgreen"
          onClick={() =>
            this.setState({ showSidebar: !this.state.showSidebar }, () => {
              if (this.state.showSidebar) {
                window.location = "#sidebar";
              } else {
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
              }
            })
          }
          style={{
            position: "fixed",
            boxShadow: "1px 1px 5px rgba(0, 0, 0, 0.3)",
            zIndex: 99999,
            right: "1rem",
            top: "calc(60px + 1rem)",
            lineHeight: "1rem",
          }}
        >
          <div style={{ padding: ".5rem", color: "white" }}>
            {this.state.showSidebar ? (
              <SvgIcon icon="upCaret" size="1rem" />
            ) : (
              <SvgIcon icon="downCaret" size="1rem" />
            )}
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
          collectConfidence={this.state.currentProject.projectOptions?.collectConfidence}
        >
          <PlotNavigation
            collectConfidence={this.state.currentProject.projectOptions?.collectConfidence}
            currentPlot={this.state.currentPlot}
            currentUserId={this.state.currentUserId}
            hasAssignedPlots={
              this.state.currentProject.designSettings?.userAssignment?.userMethod !== "none"
            }
            inReviewMode={this.state.inReviewMode}
            isProjectAdmin={this.state.currentProject.isProjectAdmin}
            isQAQCEnabled={
              this.state.currentProject.designSettings?.qaqcAssignment?.qaqcMethod !== "none"
            }
            loadingPlots={this.state.plotList.length === 0}
            navigationMode={this.state.navigationMode}
            navToFirstPlot={this.navToFirstPlot}
            navToNextPlot={this.navToNextPlot}
            navToPlot={this.navToPlot}
            navToPrevPlot={this.navToPrevPlot}
            plotters={this.state.plotters}
            plotUsers={(this.state.userPlotList || []).filter((p) => p.userId)}
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
            toggleShowBoundary={this.toggleShowBoundary}
            toggleShowSamples={this.toggleShowSamples}
            state={{showBoundary: this.state.showBoundary,
                    showSamples: this.state.showSamples}}
          />
          {this.state.currentPlot.id &&
            this.state.currentProject.projectOptions.showPlotInformation && (
              <PlotInformation extraPlotInfo={this.state.currentPlot.extraPlotInfo} />
            )}
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
          {this.state.currentPlot.id ? (
            <SurveyCollection
              allowDrawnSamples={this.state.currentProject.allowDrawnSamples}
              answerMode={this.state.answerMode}
              collectConfidence={this.state.currentProject.projectOptions.collectConfidence}
              confidence={this.state.currentPlot.confidence}
              confidenceComment={this.state.currentPlot.confidenceComment}
              flagged={this.state.currentPlot.flagged}
              flaggedReason={this.state.currentPlot.flaggedReason}
              getSelectedSampleIds={this.getSelectedSampleIds}
              mapConfig={this.state.mapConfig}
              resetPlotValues={this.resetPlotValues}
              sampleGeometries={this.state.currentProject.designSettings.sampleGeometries}
              selectedQuestionId={this.state.selectedQuestionId}
              selectedSampleId={
                Object.keys(this.state.userSamples).length === 1
                  ? parseInt(Object.keys(this.state.userSamples)[0])
                  : this.state.selectedSampleId
              }
              setAnswerMode={this.setAnswerMode}
              setConfidence={this.setConfidence}
              setConfidenceComment={this.setConfidenceComment}
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
              <CollapsibleTitle showGroup title="Survey Questions" />
              <p>Please go to a plot to see survey questions</p>
            </fieldset>
          )}
        </SideBar>
        {this.state.messageBox && (
          <Modal {...this.state.messageBox} onClose={() => this.setState({ messageBox: null })}>
            <p>{this.state.messageBox.body}</p>
          </Modal>
        )}
        {this.state.showQuitModal && (
          <QuitMenu projectId={this.props.projectId} toggleQuitModal={this.toggleQuitModal} />
        )}
      </div>
    );
  }
}

function ImageAnalysisPane({ imageryAttribution }) {
  return (
    // Mercator hooks into image-analysis-pane
    <div className="col-lg-9 col-md-12 pl-0 pr-0 full-height" id="image-analysis-pane">
      <div className="row" id="imagery-info" style={{ justifyContent: "center" }}>
        <p style={{ fontSize: ".9rem", marginBottom: "0" }}>{imageryAttribution}</p>
      </div>
    </div>
  );
}

class SideBar extends React.Component {
  checkCanSave = () => {
    const { answerMode, currentPlot, inReviewMode, surveyQuestions, collectConfidence } = this.props;
    const { confidence } = currentPlot;
    const visibleSurveyQuestions = filterObject(surveyQuestions, ([_id, val]) => val.hideQuestion != true);
    const noneAnswered = everyObject(visibleSurveyQuestions, ([_id, sq]) => safeLength(sq.answered) === 0);
    const hasSamples = safeLength(currentPlot.samples) > 0;
    const allAnswered = everyObject(
      visibleSurveyQuestions,
      ([_id, sq]) => safeLength(sq.visible) === safeLength(sq.answered));
    if (answerMode !== "question") {
      alert("You must be in question mode to save the collection.");
      return false;
    } else if (currentPlot.flagged) {
      return true;
    } else if (inReviewMode) {
      if (!(noneAnswered || allAnswered)) {
        alert(
          "In review mode, plots can only be saved if all questions are answered or the answers are cleared."
        );
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
    } else if (collectConfidence && !confidence) {
      alert("You must input the confidence before saving the interpretation.");
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
        className="col-lg-3 border-left full-height"
        id="sidebar"
        style={{ overflowY: "auto", overflowX: "hidden" }}
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
      newPlotInput: "",
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.currentPlot.visibleId !== prevProps.currentPlot.visibleId) {
      this.setState({ newPlotInput: this.props.currentPlot.visibleId });
    }
  }

  updateNewPlotId = (value) => this.setState({ newPlotInput: value });

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
        <SvgIcon icon="leftArrow" size="0.9rem" />
      </button>
      <button
        className="btn btn-outline-lightgreen btn-sm mx-1"
        onClick={() => this.props.navToNextPlot()}
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
        className="btn btn-outline-lightgreen btn-sm"
        onClick={() => this.props.navToPlot(this.state.newPlotInput)}
        type="button"
      >
        {this.state.newPlotInput === this.props.currentPlot.visibleId && this.props.inReviewMode
          ? "Refresh"
          : "Go to plot"}
      </button>
    </div>
  );

  reviewMode = (inReviewMode, setReviewMode) => (
    <div className="row my-2">
      <div className="col-5 text-right">
        <label htmlFor="review-mode">Mode:</label>
      </div>
      <div className="col-6 px-0">
        <RadioButton
          id="collect-mode"
          label="Collect"
          onChange={() => setReviewMode(false)}
          selected={!inReviewMode}
        />
        <RadioButton
          id="review-mode"
          label="Admin Review"
          onChange={() => setReviewMode(true)}
          selected={inReviewMode}
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
          onChange={(e) => setThreshold(parseInt(e.target.value))}
          step="5"
          style={{ width: "80%" }}
          type="range"
          value={threshold}
        />
        <div className="ml-2" style={{ fontSize: "0.8rem", width: "20%" }}>
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
        onChange={(e) => onChange(parseInt(e.target.value))}
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
      threshold,
    } = this.props;
    return (
      <div className="mt-2">
        <div
          className="p-1"
          style={{
            border: "1px solid lightgray",
            borderRadius: "6px",
            boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div className="row my-2">
            <div className="col-5 text-right">
              <label htmlFor="navigate">Navigate:</label>
            </div>
            <select
              className="form-control form-control-sm mr-2 col-6"
              id="navigate"
              onChange={(e) => setNavigationMode(e.target.value)}
              style={{ flex: "1 1 auto" }}
              value={navigationMode}
            >
              {!inReviewMode && (
                <option value="natural">{hasAssignedPlots ? "Assigned" : "Default"}</option>
              )}
              <option value="unanalyzed">Unanalyzed plots</option>
              <option value="analyzed">Analyzed plots</option>
              <option value="flagged">Flagged plots</option>
              {collectConfidence && <option value="confidence">Low Confidence</option>}
              {inReviewMode && <option value="user">By User</option>}
              {inReviewMode && isQAQCEnabled && <option value="qaqc">Disagreement</option>}
            </select>
          </div>
          {isProjectAdmin && this.reviewMode(inReviewMode, setReviewMode)}
          {navigationMode === "confidence" &&
            this.thresholdSlider("Confidence", threshold, setThreshold)}
          {navigationMode === "qaqc" &&
            this.thresholdSlider("Disagreement", threshold, setThreshold)}
          {navigationMode === "qaqc" && currentPlot.id && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: ".5rem",
                width: "100%",
              }}
            >
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  window.open(
                    `/user-disagreement?projectId=${projectId}&plotId=${currentPlot.id}&threshold=${threshold}`,
                    `disagreement_${projectId}`
                  )
                }
                type="button"
              >
                View Disagreements
              </button>
            </div>
          )}
          {inReviewMode &&
            this.selectUser(
              navigationMode === "user" ? plotters : plotUsers,
              currentUserId,
              setCurrentUserId
            )}
        </div>
        <div className="mt-2">
          {loadingPlots ? (
            <h3>Loading plot data...</h3>
          ) : currentPlot?.id ? (
            this.navButtons()
          ) : (
            this.gotoButton()
          )}
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
      showLearningMaterial: false,
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

  toggleViewButtons = () => (
    <div className="ExternalTools__geo-buttons d-flex justify-content-between mb-2" id="plot-nav">
      <input
        className={`btn btn-outline-${this.props.state.showSamples ? "red" : "lightgreen"} btn-sm col-6 mr-1`}
        onClick={this.props.toggleShowSamples}
        type="button"
        value={`${this.props.state.showSamples ? "Hide" : "Show"} Samples`}
      />
      <input
        className={`btn btn-outline-${this.props.state.showBoundary ? "red" : "lightgreen"} btn-sm col-6`}
        onClick={this.props.toggleShowBoundary}
        type="button"
        value={`${this.props.state.showBoundary ? "Hide" : "Show"} Boundary`}
      />
    </div>
  );

  loadGEEScript = () => {
    const { currentPlot, currentProject } = this.props;
    const urlParams = currentPlot.plotGeom.includes("Point")
      ? currentProject.plotShape === "circle"
        ? "center=[" +
          mercator.parseGeoJson(currentPlot.plotGeom).getCoordinates() +
          "];radius=" +
          currentProject.plotSize / 2
        : "geoJson=" +
          mercator.geometryToGeoJSON(
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
        "https://collect-earth-online.projects.earthengine.app/view/ceo-plot-ancillary-hotfix#" + urlParams
      ),
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
      download={
        "ceo_projectId-" +
        this.props.currentProject.id +
        "_plotId-" +
        this.props.currentPlot.visibleId +
        ".kml"
      }
      href={
        "data:earth.kml+xml application/vnd.google-earth.kmz, " +
          encodeURIComponent(this.props.KMLFeatures)
      }
    >
      Download Plot KML
    </a>
  );

  learningMaterialButton = () => (
    <input
      className="btn btn-outline-lightgreen btn-sm btn-block my-2"
      onClick={this.toggleLearningMaterial}
      type="button"
      value="Interpretation Instructions"
    />
  );

  toggleLearningMaterial = () => {
    this.setState(prevState => ({
      showLearningMaterial: !prevState.showLearningMaterial
    }));
  };

  render() {
    return this.props.currentPlot.id ? (
      <>
        <CollapsibleTitle
          showGroup={this.state.showExternalTools}
          title="External Tools"
          toggleShow={() => this.setState({ showExternalTools: !this.state.showExternalTools })}
        />
        {this.state.showExternalTools && (
          <div className="mx-1">
            {this.geoButtons()}
            {this.toggleViewButtons()}
            {this.props.KMLFeatures && this.kmlButton()}
            {this.props.currentProject.projectOptions.showGEEScript && this.geeButton()}
            {this.learningMaterialButton()}
          </div>
        )}
        {this.state.showLearningMaterial && (
          <LearningMaterialModal
            learningMaterial={this.props.currentProject.learningMaterial}
            onClose={this.toggleLearningMaterial}
          />
        )}
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
    const hasExtraInfo =
      Object.values(this.props.extraPlotInfo || {}).filter(
        (value) => value && !(value instanceof Object)
      ).length > 0;
    return (
      <>
        <CollapsibleTitle
          showGroup={this.state.showInfo}
          title="Plot Information"
          toggleShow={() => this.setState({ showInfo: !this.state.showInfo })}
        />
        {this.state.showInfo ? (
          hasExtraInfo ? (
            <ul className="plot-info__list mb-3 mx-1">
              {Object.entries(this.props.extraPlotInfo)
                .filter(([_key, value]) => value && !(value instanceof Object))
                .sort((a, b) => a[0].localeCompare(b[0])) // Sorting the array by keys alphabetically
                .map(([key, value]) => (
                  <li key={key} className="plot-info__item">
                  <span className="plot-info__key">{key}</span>
                  <span className="plot-info__value">{value}</span>
                </li>
                ))}
            </ul>
          ) : (
            <div className="mb-3">There is no extra information for this plot.</div>
          )
        ) : null}
      </>
    );
  }
}

class ImageryOptions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showImageryOptions: true,
      enableGrid: false,
    };
  }

  enableGrid() {
    this.setState({ enableGrid: !this.state.enableGrid });
    return mercator.addGridLayer(this.props.mapConfig, !this.state.enableGrid);
  }

  render() {
    const { props } = this;
    const commonProps = {
      mapConfig: props.mapConfig,
      setImageryAttribution: props.setImageryAttribution,
      setImageryAttributes: props.setImageryAttributes,
      currentPlot: props.currentPlot,
      currentProjectBoundary: props.currentProjectBoundary,
      extent:
        props.currentPlot.id && props.currentProject.id
          ? props.currentPlot.plotGeom.includes("Point")
            ? mercator
                .getPlotPolygon(
                  props.currentPlot.plotGeom,
                  props.currentProject.plotSize,
                  props.currentProject.plotShape
                )
                .getExtent()
            : mercator.parseGeoJson(props.currentPlot.plotGeom, true).getExtent()
          : [],
    };

    return (
      <div className="justify-content-center text-center">
        <CollapsibleTitle
          showGroup={this.state.showImageryOptions}
          title="Imagery Options"
          toggleShow={() => this.setState({ showImageryOptions: !this.state.showImageryOptions })}
        />
        <div className="mx-1">
          {props.loadingImages && <h3>Loading imagery data...</h3>}
          {this.state.showImageryOptions && !props.loadingImages && props.currentImageryId && (
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
          )}
          {props.currentImageryId &&
            props.imageryList.map((imagery) => {
              const individualProps = {
                ...commonProps,
                key: imagery.id,
                thisImageryId: imagery.id,
                sourceConfig: imagery.sourceConfig,
                visible: props.currentImageryId === imagery.id && this.state.showImageryOptions,
              };
              return (
                imagery.sourceConfig &&
                {
                  Planet: <PlanetMenu {...individualProps} />,
                  PlanetDaily: <PlanetDailyMenu {...individualProps} />,
                  PlanetNICFI: <PlanetNICFIMenu {...individualProps} />,
                  SecureWatch: <SecureWatchMenu {...individualProps} />,
                  Sentinel1: <SentinelMenu {...individualProps} />,
                  Sentinel2: <SentinelMenu {...individualProps} />,
                  GEEImage: <GEEImageMenu {...individualProps} />,
                  GEEImageCollection: <GEEImageCollectionMenu {...individualProps} />,
                }[imagery.sourceConfig.type]
              );
            })}
          <input
            checked={this.state.enableGrid}
            className="form-check-input"
            id="grid-check"
            onChange={() => this.enableGrid()}
            type="checkbox"
          />
          <label className="form-check-label" htmlFor="grid-check">
            Enable Map Grid
          </label>
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
    if (this.props.visibleId !== prevProps.visibleId) {
      this.setState({ showStats: false });
    }
  }

  render() {
    const { projectName, projectId, userName } = this.props;
    return (
      <div
        style={{
          alignItems: "center",
          background: "var(--lightgreen)",
          display: "flex",
          marginLeft: "-15px",
          marginRight: "-15px",
        }}
      >
        <div>
          <div
            onClick={() => this.setState({ showStats: !this.state.showStats })}
            style={{ flex: 0, marginLeft: "1rem" }}
          >
            <SvgIcon color="#ffffff" cursor="pointer" icon="info" size="1.25rem" />
          </div>
          {this.state.showStats && <ProjectStats projectId={projectId} userName={userName} />}
        </div>
        <div style={{ cursor: "default", flex: 1, height: "3rem", minWidth: 0 }}>
          <h2
            className="header text-truncate"
            style={{ height: "100%", margin: "0" }}
            title={projectName}
          >
            {projectName}
          </h2>
        </div>
      </div>
    );
  }
}
class ProjectStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stats: null,
    };
  }

  componentDidMount() {
    this.getProjectStats();
  }

  getProjectStats() {
    fetch(`/get-project-stats?projectId=${this.props.projectId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => this.setState({ stats: data }))
      .catch((response) => {
        console.error(response);
        alert("Error getting project stats. See console for details.");
      });
  }

  renderPercent = (val, total) => <span>{`${val} (${asPercentage(val, total)}%)`}</span>;

  renderHeader = (title) => (
    <tr>
      <td className="small pl-4 font-weight-bold">{title}</td>
    </tr>
  );

  renderRow = (title, val, total = null) => (
    <tr>
      <td className="small pl-4">{`-- ${title}`}</td>
      <td className="small">{total ? this.renderPercent(val, total) : val}</td>
    </tr>
  );

  renderStats = () => {
    const { stats } = this.state;
    const { userName } = this.props;
    // Totals
    const numTimedPlots = stats.userStats
      ? stats.userStats.reduce((acc, cur) => acc + cur.timedPlots, 0)
      : 0;
    const aveTime =
      numTimedPlots > 0
        ? stats.userStats.reduce((acc, cur) => acc + cur.seconds, 0) / numTimedPlots / 1.0
        : 0;

    // This user
    const thisUser = stats.userStats.find((u) => u.email === userName);
    const { flagged, analyzed, assigned, timedPlots, seconds } = thisUser || {};
    const userAveTime = timedPlots > 0 ? seconds / timedPlots / 1.0 : 0;
    const userPlots = assigned > 0 ? assigned : null;

    return (
      <table className="table table-sm mb-0">
        <tbody>
          {this.renderHeader("Project Statistics")}
          {this.renderRow("Total", stats.totalPlots)}
          {stats.plotAssignments > stats.totalPlots &&
            this.renderRow("Plot Assignments", stats.plotAssignments)}
          {this.renderRow("Analyzed", stats.analyzedPlots, stats.totalPlots)}
          {stats.plotAssignments > 0 &&
            this.renderRow("Partial", stats.partialPlots, stats.totalPlots)}
          {this.renderRow("Unanalyzed", stats.unanalyzedPlots, stats.totalPlots)}
          {this.renderRow("Flagged", stats.flaggedPlots, stats.totalPlots)}
          {stats.usersAssigned > 0
            ? this.renderRow("Users Assigned", stats.usersAssigned)
            : this.renderRow("Total Contributors", stats.userStats?.length)}
          {this.renderRow(
            "Average Collection Time",
            aveTime > 0 ? `${aveTime.toFixed(2)} secs` : "untimed"
          )}
          {this.renderHeader("My Statistics")}
          {thisUser ? (
            <>
              {stats.userAssigned > 0 && this.renderRow("Assigned to Me", userPlots)}
              {this.renderRow("Analyzed", analyzed, userPlots)}
              {assigned > 0 && this.renderRow("Unanalyzed", assigned - analyzed, userPlots)}
              {this.renderRow("Flagged", flagged, userPlots)}
              {this.renderRow(
                "My Average Time",
                userAveTime > 0 ? `${userAveTime.toFixed(2)} secs` : "untimed"
              )}
            </>
          ) : (
            this.renderRow("You have not collected on this project.")
          )}
        </tbody>
      </table>
    );
  };

  render() {
    const { stats } = this.state;
    return (
      <div
        style={{
          backgroundColor: "#f1f1f1",
          boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
          cursor: "default",
          margin: ".75rem 1rem 0 1rem",
          overflow: "auto",
          padding: "0 .5rem .5rem .5rem",
          position: "absolute",
          zIndex: "10",
        }}
      >
        {stats ? this.renderStats() : <label className="p-3">Loading...</label>}
      </div>
    );
  }
}

// remains hidden, shows a styled menu when the quit button is clicked
function QuitMenu({ projectId, toggleQuitModal }) {
  return (
    <div
      className="modal fade show"
      id="quitModal"
      onClick={toggleQuitModal}
      style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.4)" }}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="modal-content" id="quitModalContent">
          <div className="modal-header">
            <h5 className="modal-title" id="quitModalTitle">
              Unsaved Changes
            </h5>
            <button aria-label="Close" className="close" onClick={toggleQuitModal} type="button">
              &times;
            </button>
          </div>
          <div className="modal-body">
            <p>
              Are you sure you want to stop collecting data? Any unsaved responses will be lost.
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={toggleQuitModal} type="button">
              Close
            </button>
            <button
              className="btn btn-danger btn-sm"
              id="quit-button"
              onClick={() =>
                fetch(`/release-plot-locks?projectId=${projectId}`, { method: "POST" }).then(() =>
                  window.location.assign("/home")
                )
              }
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

export function pageInit(params, session) {
  ReactDOM.render(
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}>
      <Collection projectId={params.projectId} userName={session.userName || "guest"} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
