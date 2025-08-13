import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

import { useAtom } from 'jotai';
import { stateAtom } from './utils/constants';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import _ from "lodash";

import {
  LoadingModal,
  NavigationBar,
  LearningMaterialModal,
  AcceptTermsModal,
  ImageryLayerOptions
} from "./components/PageComponents";
import SurveyCollection from "./survey/SurveyCollection";
import {
  PlanetMenu,
  PlanetDailyMenu,
  PlanetTFOMenu,
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
import { CollectionSidebar, NewPlotNavigation, NewPlotNavigationMode } from "./components/CollectionSidebar";

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

export const Collection = ({ projectId, acceptedTerms, plotId }) => {
  const [state, setState] = useAtom(stateAtom);

  // INIT COLLECTION EFFECT
  useEffect(() => {
    window.name = "_ceo_collection";
    const beforeUnload = (e) => {};
    window.addEventListener("beforeunload", beforeUnload, { capture: true });
    fetch(`/release-plot-locks?projectId=${projectId}`, { method: "POST" }).catch(() => {});
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, modalMessage: "Loading project details" }));
      try {
        const [projectRes, plotsRes, imageryRes, plottersRes] = await Promise.all([
          fetch(`/get-project-by-id?projectId=${projectId}`),
          fetch(`/get-project-plots?projectId=${projectId}`),
          fetch(`/get-project-imagery?projectId=${projectId}`),
          fetch(`/get-plotters?projectId=${projectId}`),
        ]);
        if (cancelled) return;
        if (!projectRes.ok) throw projectRes;
        if (!plotsRes.ok) throw plotsRes;
        if (!imageryRes.ok) throw imageryRes;
        if (!plottersRes.ok) throw plottersRes;
        const project = await projectRes.json();
        const plotList = await plotsRes.json();
        const imageryListRaw = await imageryRes.json();
        const plotters = await plottersRes.json();
        const imageryList = Array.isArray(imageryListRaw)
          ? imageryListRaw.map((im, i) => ({ ...im, visible: i === 0 }))
          : [];
        setState((s) => ({
          ...s,
          currentProject: project,
          plotList,
          plotters: Array.isArray(plotters) ? plotters : [],
          imageryList,
          showAcceptTermsModal: !!acceptedTerms,
          modalMessage: null,
        }));
        if (plotId) {}
      } catch (err) {
        console.error(err);
        setState((s) => ({
          ...s,
          modalMessage: null,
          modal: {
            alert: {
              alertType: "Project Info Alert",
              alertMessage: "Error retrieving the project info. See console for details.",
            },
          },
        }));
      }
    })();
    return () => {
      window.removeEventListener("beforeunload", beforeUnload, { capture: true });
      cancelled = true;
    };
  }, [projectId, acceptedTerms, plotId, setState]);

  // MAP EFFECT
  useEffect(() => {
    const { imageryList, currentProject, mapConfig, currentImagery, currentPlot, showBoundary } =
      state;
    if (!mapConfig && imageryList.length > 0 && currentProject?.aoiFeatures) {
      const mc = mercator.createMap("image-analysis-pane", [0, 0], 1, imageryList);
      mercator.addVectorLayer(
        mc,
        "currentAOI",
        mercator.geomArrayToVectorSource(currentProject.aoiFeatures),
        mercator.ceoMapStyles("geom", "yellow"),
        9999
      );
      mercator.zoomMapToLayer(mc, "currentAOI", 48);
      setState((s) => ({ ...s, mapConfig: mc }));
      return;
    }
    if (state.mapConfig && state.imageryList.length > 0 && !state.currentImagery?.id) {
      const preferred =
        state.imageryList.find((i) => i.id === state.currentProject?.imageryId) ||
        state.imageryList[0];
      setState((s) => ({ ...s, currentImagery: preferred }));
    }
    if (state.mapConfig && state.currentPlot?.id) {
      ["currentPlots", "currentPlot", "currentSamples", "drawLayer"].forEach((id) =>
        mercator.removeLayerById(state.mapConfig, id)
      );
      mercator.addVectorLayer(
        state.mapConfig,
        "currentPlot",
        mercator.geometryToVectorSource(
          state.currentPlot.plotGeom?.includes("Point")
            ? mercator.getPlotPolygon(
                state.currentPlot.plotGeom,
                state.currentProject.plotSize,
                state.currentProject.plotShape
              )
            : mercator.parseGeoJson(state.currentPlot.plotGeom, true)
        ),
        mercator.ceoMapStyles("geom", state.showBoundary ? "yellow" : "transparent")
      );
      mercator.zoomMapToLayer(state.mapConfig, "currentPlot", 36);
    }
    if (state.mapConfig && state.currentImagery?.id) {
      mercator.setVisibleLayer(state.mapConfig, state.currentImagery.id);
      const needsOverlay =
        !state.currentPlot?.id &&
        ["PlanetDaily", "SecureWatch"].includes(state.currentImagery?.sourceConfig?.type);
      mercator.setLayerVisibilityByLayerId(state.mapConfig, "goToPlot", !!needsOverlay);
    }
  }, [
    state.imageryList,
    state.currentProject?.aoiFeatures,
    state.mapConfig,
    state.currentImagery?.id,
    state.currentImagery?.sourceConfig?.type,
    state.currentPlot?.id,
    state.currentPlot?.plotGeom,
    state.currentProject?.plotSize,
    state.currentProject?.plotShape,
    state.showBoundary,
    setState,
  ]);

  // PLOT LOCK EFFECT
  useEffect(() => {
    if (!state.currentPlot?.id) return;
    if (state.currentProject?.type !== "regular") return;
    const id = setInterval(() => {
      fetch("/reset-plot-lock", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ plotId: state.currentPlot.id, projectId }),
      }).catch(() => {});
    }, 60 * 1000);
    setState((s) => ({ ...s, storedInterval: id }));
    return () => clearInterval(id);
  }, [state.currentPlot?.id, state.currentProject?.type, projectId, setState]);

  // RENDER
  return (
    <div className="container-fluid collection-page">
      <div className="row no-gutters">
        {state?.modal?.alert && (
          <Modal title={state.modal.alert.alertType} onClose={() => setState((s) => ({ ...s, modal: null }))}>
            {state.modal.alert.alertMessage}
          </Modal>
        )}
        {state.currentProject?.type === "simplified" && (
          <div
            className="d-flex flex-column position-absolute full-height"
            style={{
              top: 0,
              left: state.isImageryLayersExpanded ? "0px" : "-550px",
              width: "550px",
              height: "100%",
              backgroundColor: "#fff",
              boxShadow: "2px 0 5px rgba(0,0,0,.2)",
              transition: "left .3s ease",
              zIndex: 10,
            }}
          >
            <ImageryLayerOptions imageryList={state.imageryList} />
            <button
              className="toggle-sidebar position-absolute"
              onClick={() => setState((s) => ({ ...s, isImageryLayersExpanded: !s.isImageryLayersExpanded }))}
            >
              {state.isImageryLayersExpanded ? <FaChevronLeft /> : <FaChevronRight />}
            </button>
          </div>
        )}
        <div className="d-flex flex-column flex-grow-1">
          <ImageAnalysisPane imageryAttribution={state.imageryAttribution} />
        </div>
        <div className="col-lg-3 col-md-3 d-flex flex-column border-left full-height">
          <CollectionSidebar>
          </CollectionSidebar>
        </div>
        {state.messageBox && (
          <Modal {...state.messageBox} onClose={() => setState((s) => ({ ...s, messageBox: null }))}>
            <p>{state.messageBox.body}</p>
          </Modal>
        )}
        {!acceptedTerms && state.currentProject?.type === "simplified" && (
          <AcceptTermsModal
            institutionId={state.currentProject.institution}
            projectId={projectId}
            toggleAcceptTermsModal={() =>
              setState((s) => ({ ...s, showAcceptTermsModal: !s.showAcceptTermsModal }))
            }
          />
        )}
        {state.showQuitModal && (
          <QuitMenu
            institutionId={state.currentProject.institution}
            projectId={projectId}
            toggleQuitModal={() => setState((s) => ({ ...s, showQuitModal: !s.showQuitModal }))}
          />
        )}
      </div>
    </div>
  )
};
    
function ImageAnalysisPane({ imageryAttribution }) {
  return (
    <div className="pl-0 pr-0 full-height" id="image-analysis-pane">
      <div className="row" id="imagery-info" style={{ justifyContent: "center" }}>
        <p style={{ fontSize: ".9rem", marginBottom: "0" }}>{imageryAttribution}</p>
      </div>
    </div>
  );
}

class SideBar extends React.Component {
  checkCanSave = () => {
    const { answerMode, currentPlot, inReviewMode, surveyQuestions, collectConfidence, userRole } = this.props;
    const { confidence } = currentPlot;
    const visibleSurveyQuestions = filterObject(surveyQuestions, ([_id, val]) => val.hideQuestion != true);
    const noneAnswered = everyObject(visibleSurveyQuestions, ([_id, sq]) => safeLength(sq.answered) === 0);
    const hasSamples = safeLength(currentPlot.samples) > 0;
    const allAnswered = everyObject(
      visibleSurveyQuestions,
      ([_id, sq]) => safeLength(sq.visible) === safeLength(sq.answered));    
    if (answerMode !== "question") {
      this.setState ({modal: {alert: {alertType: "Collection Alert", alertMessage: "You must be in question mode to save the collection."}}});
      return false;
    } else if (currentPlot.flagged) {
      return true;
    } else if (inReviewMode) {
      if (!(noneAnswered || allAnswered)) {
        this.setState ({modal: {alert: {alertType: "Review Mode Alert", alertMessage: "In review mode, plots can only be saved if all questions are answered or the answers are cleared."}}});
        return false;
      } else {
        return true;
      }
    } else if (!hasSamples) {
      this.setState ({modal: {alert: {alertType: "Review Mode Alert", alertMessage: "The collection must have samples to be saved. Enter draw mode to add more samples."}}});
      return false;
    } else if (!allAnswered) {
      this.setState ({modal: {alert: {alertType: "Review Mode Alert", alertMessage: "All questions must be answered to save the collection."}}});
      return false;
    } else if (collectConfidence && !confidence) {
      this.setState ({modal: {alert: {alertType: "Review Mode Alert", alertMessage: "You must input the confidence before saving the interpretation."}}});
      return false;
    } else if (userRole === 1){
      this.setState ({modal: {alert: {alertType: "Collection Error", alertMessage: "Administrators must be in Admin Review to collect data. Please select Admin Review to collect data on this plot"}}}) ;
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
        className="d-flex flex-column border-left"
        id="sidebar"
        style={{ overflowY: "auto", overflowX: "hidden"}}
      >
        {this.state?.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}
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
  projectType = this.props.projectType;

  gotoButton = () => (
    <div className="row mb-2" id="go-to-first-plot">
      <div className="col">
        <input
          className="btn btn-outline-lightgreen btn-sm btn-block"
          id="go-to-first-plot-button"
          name="new-plot"
          onClick={this.props.navToFirstPlot}
          type="button"
          value={this.projectType === "simplified" ? "Start collecting" : "Go to first plot"}
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
      projectType,
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
            projectType !== "simplified" && this.navButtons()
          ) : (
            this.gotoButton()
          )}
        </div>
      </div>
    );
  }
}

export const ExternalTools = ({
  zoomMapToPlot,
  showGeoDash,
  toggleShowSamples,
  toggleShowBoundary,
  state,
  currentPlot,
  currentProject,
  KMLFeatures,
  projectType,
  setUsedKML
}) => {
  const [showExternalTools, setShowExternalTools] = useState(true);
  const [auxWindow, setAuxWindow] = useState(null);
  const [showLearningMaterial, setShowLearningMaterial] = useState(false);

  const geoButtons = () => (
    <div className="ExternalTools__geo-buttons d-flex justify-content-between mb-2" id="plot-nav">
      <input
        className="btn btn-outline-lightgreen btn-sm col-6 mr-1"
        onClick={zoomMapToPlot}
        type="button"
        value="Re-Zoom"
      />
      <input
        className="btn btn-outline-lightgreen btn-sm col-6"
        onClick={showGeoDash}
        type="button"
        value="GeoDash"
      />
    </div>
  );

  const toggleViewButtons = () => (
    <div className="ExternalTools__geo-buttons d-flex justify-content-between mb-2" id="plot-nav">
      <input
        className={`btn btn-outline-${state.showSamples ? "red" : "lightgreen"} btn-sm col-6 mr-1`}
        onClick={toggleShowSamples}
        type="button"
        value={`${state.showSamples ? "Hide" : "Show"} Samples`}
      />
      <input
        className={`btn btn-outline-${state.showBoundary ? "red" : "lightgreen"} btn-sm col-6`}
        onClick={toggleShowBoundary}
        type="button"
        value={`${state.showBoundary ? "Hide" : "Show"} Boundary`}
      />
    </div>
  );

  const loadGEEScript = () => {
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

    if (auxWindow) auxWindow.close();
    const win = window.open(
      "https://collect-earth-online.projects.earthengine.app/view/ceo-plot-ancillary-hotfix#" + urlParams
    );
    setAuxWindow(win);
  };

  const geeButton = () => (
    <input
      className="btn btn-outline-lightgreen btn-sm btn-block my-2"
      onClick={loadGEEScript}
      type="button"
      value="Go to GEE Script"
    />
  );

  const kmlButton = () => (
    <a
      className="btn btn-outline-lightgreen btn-sm btn-block my-2"
      download={`ceo_projectId-${currentProject.id}_plotId-${currentPlot.visibleId}.kml`}
      href={
        "data:earth.kml+xml application/vnd.google-earth.kmz," +
          encodeURIComponent(KMLFeatures)
      }
    >
      onClick={() => setUsedKML(true)}
      Download Plot KML
    </a>
  );

  const learningMaterialButton = () => (
    <input
      className="btn btn-outline-lightgreen btn-sm btn-block my-2"
      onClick={() => setShowLearningMaterial(prev => !prev)}
      type="button"
      value="Interpretation Instructions"
    />
  );

  const openInGoogleEarth = () => {
    const plotGeom = mercator.getCentroid((currentPlot?.plotGeom || "{}"), true);
    if (!plotGeom || plotGeom.length < 2) {
      console.warn("Invalid coordinates");
      return;
    }
    const [lng, lat] = plotGeom;
    const url = `https://earth.google.com/web/@${lat},${lng},1000a,100d,35y,0h,0t,0r`;
    window.open(url, "_blank");
  };

  const renderGoogleEarthButton = () => (
    <input
      className="btn btn-outline-lightgreen btn-sm btn-block my-2"
      type="button"
      value="Go to Google Earth Web"
      onClick={openInGoogleEarth}
    />
  );

  if (!currentPlot.id) return null;

  return (
    <>
      <CollapsibleTitle
        showGroup={showExternalTools}
        title="External Tools"
        toggleShow={() => setShowExternalTools(prev => !prev)}
      />
      {showExternalTools && (
        <div className="mx-1">
          {geoButtons()}
          {projectType !== "simplified" && toggleViewButtons()}
          {KMLFeatures && kmlButton()}
          {currentProject.projectOptions.showGEEScript && geeButton()}
          {learningMaterialButton()}
          {renderGoogleEarthButton()}
        </div>
      )}
      {showLearningMaterial && (
        <LearningMaterialModal
          learningMaterial={currentProject.learningMaterial}
          onClose={() => setShowLearningMaterial(false)}
        />
      )}
    </>
  );
};

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
                   PlanetTFO: <PlanetTFOMenu {...individualProps} />,
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
            id="grid-check"
            onChange={() => this.enableGrid()}
            type="checkbox"
            style={{"margin-right": "10px"}}
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
        this.setState ({modal: {alert: {alertType: "Project Stats Error", alertMessage: "Error getting project stats. See console for details."}}});
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
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}

        {stats ? this.renderStats() : <label className="p-3">Loading...</label>}
      </div>
    );
  }
}

// remains hidden, shows a styled menu when the quit button is clicked
function QuitMenu({ institutionId, projectId, toggleQuitModal }) {
  console.log(institutionId);
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
                  window.location.assign(`/review-institution?institutionId=${institutionId}`)
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
      <Collection projectId={params.projectId} plotId={params.plotId || null} userName={session.userName || "guest"} acceptedTerms={session.acceptedTerms || false} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
