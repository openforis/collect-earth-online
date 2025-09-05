import React, { useState, useEffect } from "react";
import '../../css/sidebar.css';
import SvgIcon from "./svg/SvgIcon";
import _ from "lodash";
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { stateAtom } from '../utils/constants';
import Modal from "./Modal";
import { LoadingModal } from "./PageComponents";
import { mercator } from "../utils/mercator";
import { SurveyQuestions, DrawingTool } from "./SurveyQuestions.jsx";

export const CollectionSidebar = ({ processModal }) => {
  const {modal, modalMessage, newPlotId} = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);

  return (
    <div className="collection-sidebar-container">
      <div className="collection-sidebar-content">
        <NewPlotNavigation />
        {newPlotId > 0 ?
         (
           <>
             <ExternalTools />
             <DrawingTool />
             <SurveyQuestions />
           </>
         ) : null
     }
      </div>
      <div className="collection-sidebar-footer">
        <SidebarFooter processModal={ processModal }/>
      </div>
      {modal?.alert &&
       <Modal title={modal.alert.alertType}
              onClose={()=>{setAppState(prev => ({ ... prev, modal: null}));}}>
         {modal.alert.alertMessage}
       </Modal>}
      {modalMessage && <LoadingModal message={modalMessage} />}
    </div>
  );
};


export const NewPlotNavigation = () => {
  const setAppState = useSetAtom(stateAtom);
  const {
    currentProject,
    originalUserSamples,
    userSamples,
    currentPlot,
    inReviewMode,
    navigationMode,
    newPlotId
  } = useAtomValue(stateAtom);

  function hasChanged () {
    return !_.isEqual(userSamples, originalUserSamples);}
  
  function confirmUnsaved () {
    return !hasChanged() ||
      confirm(
        "You have unsaved changes. Any unsaved responses will be lost. Are you sure you want to continue?"
      );}

  function navToPlot (direction) {    
    if (confirmUnsaved()) {
      setAppState (s => ({
        ...s,
        getNewPlot: true,
        navDirection: direction
      }));
    }
  };
  
  const navToPlotId = () => {
    if (!isNaN(newPlotId)) {
      if (confirmUnsaved()) {
        setAppState(s => ({...s, getNewPlot: true, navDirection: 'id'}));
      }
    } else {
      setAppState (prev => ({ ... prev, modal: {alert: {alertType: "Plot Navigation Alert", alertMessage: "Please enter a number to go to plot."}}}));
    }
  };
  
  return (
    <div className="collection-sidebar-navigation">
      <div className="collection-sidebar-header">
        <span>
          <span className="collection-sidebar-title">{currentProject?.name}</span>
          <span className="collection-sidebar-subtitle"> ({currentProject?.numPlots} Plots)</span>
        </span>
        <button className="collection-sidebar-info-button">i</button>
      </div>
      <label className="collection-sidebar-label">Navigate</label>
      <select className="collection-sidebar-select"
              selected={navigationMode}        
              onChange={(e) => setAppState(s => ({...s, navigationMode: e.target.value}))}>
          <option value="natural">Default</option>
          <option value="analyzed">Analyzed plots</option>
          <option value="unanalyzed">Unanalyzed plots</option>
          <option value="flagged">Flagged plots</option>
          <option value="similar">Similar Plots</option>
        </select>

      <div className="collection-sidebar-mode">
        <label className="collection-sidebar-switch">
          <input type="checkbox"
                 checked={inReviewMode}
                 onChange={(e) => setAppState(s => ({...s, inReviewMode: !s.inReviewMode}))}/>
          <span className="collection-sidebar-slider round"></span>
          </label>
        <span className="mode-label">Admin Review</span>
        {navigationMode === "similar" &&
         <span>Reference Plot: {currentProject.referencePlotId}</span>}
      </div>

      <div className="collection-sidebar-plot-navigation">
        <input className="flex flex-col-6"
               placeholder={
                 navigationMode === "similar" ? "Reference Plot Id: " +
                 currentProject.referencePlotId
                   : currentPlot?.visibleId ?
                   'Current Plot: ' + currentPlot?.visibleId
                   : 'Select a Plot to begin'}
               value={newPlotId}
               onChange={(e)=>{setAppState(s => ({ ...s, newPlotId: e.target.value}));}}
        ></input>
        <button className="btn outline"
                onClick={()=>{navToPlot('previous');}}>
          <SvgIcon icon="leftArrow" size="0.9rem" />
        </button>
        <button className="btn outline"
                onClick={()=>{navToPlot('next');}}>
          <SvgIcon icon="rightArrow" size="0.9rem" />
        </button>
        <label className="btn filled"
               onClick={()=>{navToPlotId();}}
        >Go To Plot
        </label>
      </div>

    </div>
  );
};

export const ExternalTools = () => {
  const [auxWindow, setAuxWindow] = useState(null);
  const [state, setState] = useAtom(stateAtom);
  const {
    currentPlot,
    currentProject,
    KMLFeatures,
  } = useAtomValue(stateAtom);

  const loadGEEScript = () => {
    let urlParams="";
    if(currentPlot?.plotGeom){
      urlParams = currentPlot?.plotGeom?.includes("Point")
            ? currentProject?.plotShape === "circle"
            ? "center=[" +
            mercator.parseGeoJson(currentPlot?.plotGeom).getCoordinates() +
            "];radius=" +
            currentProject?.plotSize / 2
            : "geoJson=" +
            mercator.geometryToGeoJSON(
              mercator.getPlotPolygon(
                currentPlot?.plotGeom,
                currentProject?.plotSize,
                currentProject?.plotShape
              ),
              "EPSG:4326",
              "EPSG:3857",
              5
            )
            : "geoJson=" + currentPlot?.plotGeom;
    }
    if (auxWindow) auxWindow.close();
    const win = window.open(
      "https://collect-earth-online.projects.earthengine.app/view/ceo-plot-ancillary-hotfix#" + urlParams
    );
    setAuxWindow(win);
  };
  const openInGoogleEarth = () => {
    let plotGeom=[0,0];
    if(currentPlot?.plotGeom){
      plotGeom = mercator.getCentroid((currentPlot?.plotGeom || "{}"), true);
      if (!plotGeom || plotGeom.length < 2) {
        console.warn("Invalid coordinates");
        return;
      }
    }
    const [lng, lat] = plotGeom;
    const url = `https://earth.google.com/web/@${lat},${lng},1000a,100d,35y,0h,0t,0r`;
    window.open(url, "_blank");
  };

  const showGeoDash = () => {
    const plotRadius = currentProject?.plotSize
          ? currentProject?.plotSize / 2.0
          : mercator.getViewRadius(state.mapConfig);
    setState(s => ({...s, usedGeodash: true }));
    window.open(
      "/geo-dash?" +
        `institutionId=${currentProject?.institution}` +
        `&projectId=${currentProject?.id}` +
        `&visiblePlotId=${currentPlot?.visibleId}` +
        `&plotId=${currentPlot?.id}` +
        `&plotExtent=${encodeURIComponent(JSON.stringify(mercator.getViewExtent(state.mapConfig)))}` +
        `&plotShape=${
          currentPlot?.plotGeom?.includes("Point") ? currentProject?.plotShape : "polygon"
        }` +
        `&center=${currentPlot?.plotGeom?.includes("Point") ? currentPlot?.plotGeom : ""}` +
        `&radius=${plotRadius}`,
      `_geo-dash_${currentProject?.id}`
    );
  };

  const downloadKML = () => {
    const blob = new Blob([KMLFeatures], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);

    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: `ceo_projectId-${currentProject?.id}_plotId-${currentPlot?.visibleId}.kml`
    });

    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ext-card">
      <div className="ext-header">
        <span className="ext-title">EXTERNAL TOOLS</span>
        <button className="ext-info" aria-label="Info">i</button>
      </div>

      <div className="ext-grid">
        <button className="ext-btn"
                onClick={downloadKML}
        >
          <span>Download Plot KML</span>
        </button>

        <button className="ext-btn"
                onClick={loadGEEScript}>
          <span>Go To GEE Script</span>
        </button>

        <button className="ext-btn"
                onClick={showGeoDash}>
          <span>Open GeoDash</span>
        </button>

        <button className="ext-btn"
                onClick={openInGoogleEarth}>
          <span>Go To Google Earth Web</span>
        </button>
      </div>
    </div>
  );
};

export const SidebarFooter = ({ processModal }) => {

  const {
    currentProject,
    currentPlot,
    collectionStart,
    userSamples,
    currentUserId,
    imageryIds,
    userImages,
    remainingPlotters,
    usedKML,
    usedGeodash,
    inReviewMode,
  } = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);

  const hasAnswers = () =>
        _.some(Object.values(userSamples), (sample) => !_.isEmpty(sample)) ||
        _.some(Object.values(userSamples), (sample) => !_.isEmpty(sample));

  const confirmFlag = () =>
        hasAnswers() ||
        confirm(
          "Flagging this plot will delete your previous answers. Are you sure you want to continue?"
        );

  const navToNextPlot = () => {
    return setAppState(s => ({
      ...s,
      getNewPlot: true,
      navDirection: 'next'
    }));
  }

  const savePlotAnswers = () => {
    processModal("Saving plot answers", () =>
      fetch("/add-user-samples", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          plotId: currentPlot.id,
          confidence: currentProject.projectOptions.collectConfidence
            ? currentPlot.confidence
            : -1,
          confidenceComment: currentProject.projectOptions.collectConfidence
            ? currentPlot.confidenceComment
            : null,
          collectionStart: collectionStart,
          userImages: userImages,
          userSamples,
          newPlotSamples: currentProject.allowDrawnSamples && currentPlot.samples,
          inReviewMode: inReviewMode,
          currentUserId: currentUserId,
          imageryIds: imageryIds,
          projectType: currentProject.type,
          usedKML: usedKML,
          usedGeodash: usedGeodash,
        }),
      }).then((response) => {
        if (response.ok) {
          if (inReviewMode) {
            setAppState(s => ({...s, remainingPlotters: remainingPlotters.filter((plotter) => plotter.userId != currentUserId) }));
            if(remainingPlotters.length > 0) {
              setAppState(s => ({...s, modal: {alert: {alertType: "Plot Interpretation Alert", alertMessage: "There are more interpretations for this plot.\nPlease select the user from the user dropdown to review another interpretation."}}}));
              return null;
            }
          }
          if(currentProject.type !== "simplified") {
            return navToNextPlot();
          } else {
            alert("Answers saved successfully!");
          }
        } else {
          console.log(response);
          setAppState(s => ({...s, modal: {alert: {alertType: "Assignment Error", alertMessage: "Error saving your assignments to the database. See console for details."}}}));
        }
      })
    );
  };

  const flagPlot = () => {
    if (confirmFlag()) {
      processModal("Saving flagged plot", () =>
        fetch("/flag-plot", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: currentProject.id,
            plotId: currentPlot.id,
            collectionStart: collectionStart,
            flaggedReason: currentPlot.flaggedReason,
            currentUserId: currentUserId,
          }),
        }).then((response) => {
          if (response.ok) {
            return navToNextPlot();
          } else {
            console.log(response);
            setAppState(s => ({...s, modal: {alert: {alertType: "Plot Flagging Error", alertMessage: "Error flagging plot as bad. See console for details."}}}));
          }
        })
      )
    }
  };

  const postValuesToDB = () => {
    if (currentPlot.flagged) {
      flagPlot();
    } else {
      savePlotAnswers();
    }
  };

  const toggleFlagged = () => setAppState(s => ({...s, currentPlot: {...s.currentPlot, flagged: !s.currentPlot.flagged}}))

  return (
    <div className="collection-sidebar-footer-buttons">
      <button className="btn outline">Clear All</button>
      <button className="btn outline"
              onClick={toggleFlagged}>
        {currentPlot.flagged ? "Unflag Plot" : "Flag Plot"}
      </button>
      <button className="btn filled">Quit</button>
      <button className="btn filled"
              onClick={postValuesToDB}
      >Save & Continue</button>
    </div>
  );
};

