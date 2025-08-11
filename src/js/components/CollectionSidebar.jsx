import React, { useState } from "react";
import '../../css/sidebar.css';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import SvgIcon from "./svg/SvgIcon";
import _ from "lodash";
import { useAtom } from 'jotai';

import { stateAtom } from '../utils/constants';


export function CollectionSidebar ({ children, state }) {
  const [appState, setAppState] = useAtom(stateAtom);
  setAppState(state);
  return (
    <div className="collection-sidebar-container">
      <div className="collection-sidebar-content">
        {children}
      </div>
      <div className="collection-sidebar-footer">
        <SidebarFooter/>
      </div>
    </div>
  );
};

export function NewPlotNavigation  ()  {

  const [appState, setAppState] = useAtom(stateAtom);

  const [navPlot, setNavPlot] = useState('');

  function processModal (message, callBack){
    new Promise(() =>
      Promise.resolve(
        setAppState({ modalMessage: message }, () =>
          callBack().finally(() => setAppState({ modalMessage: null }))
        )
      )
    );}

  function getPlotData (visibleId, direction, forcedNavMode = null, reviewMode = null) {

    setAppState ({...appState, modal: {alert: {alertType: "Plot Navigation Alert", alertMessage: "Please enter a number to go to plot."}}});

    console.log(appState);

    console.log('getting plot data', _.isEqual(appState, {...appState, modal: {alert: {alertType: "Plot Navigation Alert", alertMessage: "Please enter a number to go to plot."}}}));
    /*
      this.processModal("Getting plot", () =>
      fetch(
      "/get-collection-plot?" +
      getQueryString({
      visibleId,
      projectId,
      navigationMode: forcedNavMode || navigationMode,
      direction,
      inReviewMode: reviewMode || inReviewMode,
      threshold,
      currentUserId,
      projectType: type,
      })
      )
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
      if (data === "not-found") {
      const err = (direction === "id" ? "Plot not" : "No more plots") +
      " found for this navigation mode.";
      const reviewModeWarning = "\n If you have just changed navigation modes, please click the “Next” or “Back” arrows in order to see the plots for this navigation mode.";
      this.setState ({modal: {alert: {alertType: "Plot Data Error", alertMessage: inReviewMode ? err + reviewModeWarning : err}}});
      } else {
      this.setState({
      userPlotList: data,
      remainingPlotters: data,
      currentPlot: data[0],
      currentUserId: data[0].userId,
      ...this.newPlotValues(data[0]),
      answerMode: "question",
      inReviewMode: reviewMode ? reviewMode : inReviewMode,
      });
      if(type === "simplified")
      this.setDrawTool();
      // TODO, this is probably redundant.  Projects are not allowed to be created with no samples.
      this.warnOnNoSamples(data[0]);
      }
      })
      .catch((response) => {
      console.error(response);
      this.setState ({modal: {alert: {alertType: "Plot Data Retrieval Error", alertMessage: "Error retrieving plot data. See console for details."}}});
      })
      );*/
  };

  
  function hasChanged () {
    return !_.isEqual(appState.userSamples, appState.originalUserSamples);}
  
  function confirmUnsaved () {
    return !hasChanged() ||
      confirm(
        "You have unsaved changes. Any unsaved responses will be lost. Are you sure you want to continue?"
      );}

  function navToPlot (direction) {
    if (confirmUnsaved()) {
      getPlotData(appState.currentPlot.visibleId, direction);
    }
  };
  
  function navToPlotId (newPlot, adminReview = null) {
    if (!isNaN(newPlot)) {
      if (confirmUnsaved()) {
        return adminReview ? getPlotData(newPlot, "id", 'analyzed', true)
          : getPlotData(newPlot, "id");
      }
    } else {
      setAppState ({modal: {alert: {alertType: "Plot Navigation Alert", alertMessage: "Please enter a number to go to plot."}}});
    }
  };
  
  return (
    <div className="collection-sidebar-navigation">
      <div className="collection-sidebar-header">
        <span>
          <span className="collection-sidebar-title">{appState.currentProject.name}</span>
          <span className="collection-sidebar-subtitle"> ({appState.currentProject.numPlots} Plots)</span>
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
