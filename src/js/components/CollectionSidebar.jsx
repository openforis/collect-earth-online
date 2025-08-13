import React, { useState, useEffect } from "react";
import '../../css/sidebar.css';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import SvgIcon from "./svg/SvgIcon";
import _ from "lodash";
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { stateAtom } from '../utils/constants';
import Modal from "./Modal";
import { LoadingModal } from "./PageComponents";
import { getQueryString,  } from "../utils/generalUtils";
import { mercator } from "../utils/mercator";
import {
  firstEntry,
  findObject,
} from "../utils/sequence";


export const CollectionSidebar = () => {  
  const {modal, modalMessage} = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);

  return (
    <div className="collection-sidebar-container">
      <div className="collection-sidebar-content">
        <NewPlotNavigationMode />
        <NewPlotNavigation />

      </div>
      <div className="collection-sidebar-footer">
        <SidebarFooter/>
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


export const NewPlotNavigation = ({ projectId }) => {
  const [navPlot, setNavPlot] = useState('');
  const setAppState = useSetAtom(stateAtom);
  const {threshold,
         currentUserId,
         currentProject,
         navigationMode,
         inReviewMode,
         originalUserSamples,
         mapConfig,
         userSamples,
         currentPlot,
        } = useAtomValue(stateAtom);
  console.log(currentProject);
  const appState = useAtomValue(stateAtom);
  useEffect(()=>{
    console.log('appState changed', appState);
  }, [appState]);

  function processModal (message, callBack){
    setAppState(prev => ({ ... prev, modalMessage: message }));
    return Promise.resolve()
      .then(() => callBack())
      .finally(() => setAppState(prev => ({... prev,  modalMessage: null })));}

  function newPlotValues (newPlot, copyValues = true) {
    return ({
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
        : originalUserSamples
      : {},
      userImages: newPlot.samples
        ? newPlot.samples.reduce(
          (acc, cur) => ({ ...acc, [cur.id]: copyValues ? cur.userImage || {} : {} }),
          {}
        )
        : {},
      selectedQuestionId: Number(
        findObject(
          currentProject.surveyQuestions,
          ([_id, sq]) => sq.parentQuestionId === -1
        )[0]
      ),
      collectionStart: Date.now(),
      unansweredColor: "black",
    });
  };

  function featuresToSampleLayer () {
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

    setAppState(prev => ({
      ... prev,
      currentPlot: { ...currentPlot, samples: newSamples },
      userSamples: newSamples.reduce(
        (acc, cur) => ({ ...acc, [cur.id]: userSamples[cur.id] || {} }),
        {}
      ),
      userImages: newSamples.reduce(
        (acc, cur) => ({ ...acc, [cur.id]: userImages[cur.id] || {} }),
        {}
      ),
    }));
  };

  function warnOnNoSamples (plotData) {
    if (plotData.samples.length === 0&& !currentProject.allowDrawnSamples) {
      setAppState (prev => ({... prev,
                             modal: {alert: {alertType: "Plot Collection Alert", alertMessage: "This plot has no samples. Please flag the plot."}}}));
      return false;
    } else {
      return true;
    }
  };
    
  function getPlotData (visibleId=1, direction, forcedNavMode = null, reviewMode = null) {       
    processModal("Getting plot", () =>{      
      return fetch(
        "/get-collection-plot?" +
          getQueryString({
            visibleId,            
            projectId,
            navigationMode: forcedNavMode || navigationMode,
            direction,
            inReviewMode: reviewMode || inReviewMode,
            threshold,
            currentUserId,
            projectType: currentProject.type,
          })
      )
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .then((data) => {
          if (data === "not-found") {
            const err = (direction === "id" ? "Plot not" : "No more plots") +
                  " found for this navigation mode.";
            const reviewModeWarning = "\n If you have just changed navigation modes, please click the “Next” or “Back” arrows in order to see the plots for this navigation mode.";
            setAppState (prev => ({... prev, modal: {alert: {alertType: "Plot Data Error", alertMessage: inReviewMode ? err + reviewModeWarning : err}}}));
          } else {
            setAppState (prev=> ({
              ... prev,
	      userPlotList: data,
	      remainingPlotters: data,
	      currentPlot: data[0],
	      currentUserId: data[0].userId,
	      ...newPlotValues(data[0]),
	      answerMode: "question",
	      inReviewMode: reviewMode || inReviewMode,
	    }));
            if(type === "simplified")
            warnOnNoSamples(data[0]);
          }
        })
        .catch((response) => {
          console.error(response);
          setAppState (prev => ({... prev, modal: {alert: {alertType: "Plot Data Retrieval Error", alertMessage: "Error retrieving plot data. See console for details."}}}));
        });}
    );
  };

  
  function hasChanged () {
    return !_.isEqual(userSamples, originalUserSamples);}
  
  function confirmUnsaved () {
    return !hasChanged() ||
      confirm(
        "You have unsaved changes. Any unsaved responses will be lost. Are you sure you want to continue?"
      );}

  function navToPlot (direction) {    
    if (confirmUnsaved()) {
      getPlotData(currentPlot.visibleId, direction);
    }
  };
  
  function navToPlotId (newPlot, adminReview = null) {
   
    if (!isNaN(newPlot)) {
      if (confirmUnsaved()) {
        return adminReview ? getPlotData(newPlot, "id", 'analyzed', true)
          : getPlotData(newPlot, "id");
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
      <div className="collection-sidebar-plot-navigation">
        <input className="flex flex-col-6"
               value={navPlot}
               onChange={(e)=>{setNavPlot(e.target.value);}}
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
               onClick={()=>{navToPlotId(navPlot);}}
        >Go To Plot
        </label>
      </div>

    </div>
  );
};

export const NewPlotNavigationMode = ({projectTitle}) => {  
  return (
    <div className="collection-sidebar-navigation">
      <div className="collection-sidebar-header">
        <span className="collection-sidebar-title">{projectTitle}</span>        
        <button className="collection-sidebar-info-button">i</button>
      </div>

      <label className="collection-sidebar-label">Navigate</label>
      <select className="collection-sidebar-select">
        <option>Default</option>
        <option>Analyzed plots</option>
        <option>Unanalyzed plots</option>
        <option>Flagged plots</option>
      </select>

      <div className="collection-sidebar-mode">
        <label className="collection-sidebar-switch">
          <input type="checkbox" />
          <span className="collection-sidebar-slider round"></span>
        </label>
        <span className="mode-label">Admin Review</span>
      </div>      
    </div>
  );
};

export const SidebarFooter = () => {
  return (
    <div className="collection-sidebar-footer-buttons">
      <button className="btn outline">Clear All</button>
      <button className="btn outline">Flag Plot</button>
      <button className="btn filled">Quit</button>
      <button className="btn filled">Save & Continue</button>
    </div>
  );
};
