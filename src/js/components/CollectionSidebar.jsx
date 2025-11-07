import React, { useState, useEffect } from "react";
import '../../css/sidebar.css';
import SvgIcon from "./svg/SvgIcon";
import _ from "lodash";
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { stateAtom } from '../utils/constants';
import { mercator } from "../utils/mercator";
import { SurveyQuestions, DrawingTool } from "./SurveyQuestions.jsx";
import { Sidebar, SidebarCard } from "./Sidebar";
import {
  everyObject,
  safeLength,
  filterObject,
} from "../utils/sequence";
import {
  PlanetMenu,
  PlanetDailyMenu,
  PlanetTFOMenu,
  SecureWatchMenu,
  SentinelMenu,
  GEEImageMenu,
  GEEImageCollectionMenu,
} from "../imagery/collectionMenuControls";

const StatsCard = ({}) => {
  const state = useAtomValue(stateAtom);
  const stats = [{title: 'Total Plots', key: 'totalPlots'},
                 {title: 'Total Contributors', key: 'totalUsers'},
                 {title: 'Analyzed', icon: 'square', color: '⁨⁨#3019FF', key: 'analyzed'},
                 {title: 'Flagged', icon: 'square', color: '#E32312', key: 'flagged'},
                 {title: 'Unanalyzed', icon: 'square', color: '#F3FC4F', key: 'unanalyzed'},
                 {title: 'Average Collection Time', key: 'averageTime'}];

  function percent (part, total) {
    return (part * 100) / total;
  }
  
  function getStat (statKey) {
    switch (statKey) {
    case 'totalPlots': return state.stats.totalPlots;
    case 'totalUsers': return state.stats.userStats.length;
    case 'analyzed' :  return (state.stats.analyzedPlots +
                               " (" + percent(state.stats.analyzedPlots, state.stats.totalPlots).toPrecision(2) + "%)");
    case 'flagged' : return state.stats.flaggedPlots;
    case 'unanalyzed': return (state.stats.unanalyzedPlots +
                               ' (' + percent(state.stats.unanalyzedPlots, state.stats.totalPlots).toPrecision(2) + '%)');
    case 'averageTime': return state.stats.collectionTime + " secs/ plot";    
    }
  };
  
  return (
    <SidebarCard
      title="Plot Statistics"
    >
      <div id="stats-card">
        {state.stats &&
         stats.map(({title, key, icon, color}) => {
           return (<div className="stat">
                     {icon && <span
                                style={{color: color}}
                              > ⯀ </span>}
                     <span
                       style={{color: 'gray'}}
                     >{title}: </span>
                     <span
                   style={{fontWeight: 'bold'}}
                     >{getStat(key)}</span>
                  </div>
                 );})}
      </div>
    
    </SidebarCard>
  );
};

export const CollectionSidebar = ({ processModal }) => {
  const { currentPlot, currentProject } = useAtomValue(stateAtom);

  const content = (
    <>
      <NewPlotNavigation />
      <StatsCard/>
      {currentPlot.id > 0 && (
        <>
          <ExternalTools />
          {currentProject?.type !== "simplified" && <ImageryOptions />}
          <SurveyQuestions />
          {currentProject.allowDrawnSamples && <DrawingTool />}
        </>
      )}
    </>
  );

  const footer = <SidebarFooter processModal={processModal} />;

  return (
    <Sidebar
      stateAtom={stateAtom}
      processModal={processModal}
      children={content}
      footer={footer}
      style={{"right": 0, "width": "35vw"}}
    />
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
    newPlotId,
    userPlotList
  } = useAtomValue(stateAtom);
  const [selectedEmail, setSelectedEmail] = useState(currentPlot?.email || "");

  useEffect(() => {
    const currentEmail = currentPlot?.email || "";
    const emails = Array.from(new Set(userPlotList.map((p) => p.email))).filter(Boolean);

    if (!emails.includes(currentEmail)) {
      setSelectedEmail(emails[0] || "");
      if (emails.length > 0) {
        const firstPlot = userPlotList.find((p) => p.email === emails[0]);
        if (firstPlot) {
          setAppState((s) => ({ ...s, currentPlot: firstPlot }));
        }
      }
    } else {
      setSelectedEmail(currentEmail);
    }
  }, [userPlotList, currentPlot]);

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

  const emails = Array.from(new Set(userPlotList.map((p) => p.email))).filter(Boolean);

  const handleEmailSelect = (e) => {
    const newEmail = e.target.value;
    setSelectedEmail(newEmail);
    const selectedPlot = userPlotList.find((p) => p.email === newEmail);
    if (selectedPlot) {
      const newUserSamples = {};
      for (const sample of selectedPlot.samples || []) {
        newUserSamples[sample.id] = {};
        for (const [qId, val] of Object.entries(sample.savedAnswers || {})) {
          newUserSamples[sample.id][Number(qId)] = {
            answerId: Number(val.answerId),
            answer: val.answer,
          };
        }
      }
      setAppState((s) => ({
        ...s,
        userSamples: newUserSamples
      }));
    }
  };
  
  return (
    <SidebarCard
      title={
        <>
          {currentProject?.name}
          <span className="sidebar-subtitle"> ({currentProject?.numPlots} Plots)</span>
        </>
      }
      infoText="Navigate between plots and manage review mode"
    >
      <label className="sidebar-label">Navigate</label>
      <select
        className="sidebar-select"
        value={navigationMode}
        onChange={(e) => setAppState((s) => ({ ...s, navigationMode: e.target.value }))}
      >
        <option value="natural">Default</option>
        <option value="analyzed">Analyzed plots</option>
        <option value="unanalyzed">Unanalyzed plots</option>
        <option value="flagged">Flagged plots</option>
        <option value="similar">Similar Plots</option>
      </select>

      {currentProject?.isProjectAdmin && (
        <>
          <div className="sidebar-mode">
            <label className="sidebar-switch">
              <input
                type="checkbox"
                checked={inReviewMode}
                onChange={() => setAppState((s) => ({ ...s, inReviewMode: !s.inReviewMode }))}
              />
              <span className="sidebar-slider round"></span>
            </label>
            <span className="mode-label">Admin Review</span>
          </div>
        </>
      )}

      {currentPlot?.id > 0 ? (
        <>
          <div className="sidebar-plot-navigation">
            <input
              className="flex flex-col-6"
              placeholder={
                navigationMode === "similar"
                  ? "Reference Plot Id: " + currentProject?.plotSimilarityDetails?.referencePlotId
                  : currentPlot?.visibleId
                  ? "Current Plot: " + currentPlot?.visibleId
                  : "Select a Plot to begin"
              }
              value={newPlotId}
              onChange={(e) => setAppState((s) => ({ ...s, newPlotId: e.target.value }))}
            />
            <button className="btn outline" onClick={() => navToPlot("previous")}>
              <SvgIcon icon="leftArrow" size="0.9rem" />
            </button>
            <button className="btn outline" onClick={() => navToPlot("next")}>
              <SvgIcon icon="rightArrow" size="0.9rem" />
            </button>
            <label className="btn filled" onClick={navToPlotId}>
              Go To Plot
            </label>
          </div>
          <br />
          {navigationMode === "similar" && (
            <div className="sidebar-mode">
              <span>Reference Plot: {currentProject?.plotSimilarityDetails?.referencePlotId}</span>
              <span>{" "}Reference Year: {currentProject?.plotSimilarityDetails?.years?.[0] ?? "N/A"}</span>
            </div>
          )}
        </>
      ) : (
        <div className="sidebar-plot-navigation">
          <button
            className="btn filled"
            style={{ width: "max-content" }}
            onClick={() => navToPlot("next")}
          >
            Go to first plot
          </button>
        </div>
      )}
      {inReviewMode && emails.length > 0 && (
        <div style={{ margin: "10px 0" }}>
          <label className="sidebar-label">Select User:</label>
          <select
            className="sidebar-select"
            onChange={handleEmailSelect}
            value={selectedEmail}
          >
            <option value="" disabled>
              Choose an email
            </option>
            {emails.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>
      )}
    </SidebarCard>
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
    setState(s => ({...s, usedKML: true}));

    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SidebarCard
      title="External Tools"
      infoText="Access external applications like GeoDash, Google Earth, and GEE Script"
    >
      <div className="ext-grid">
        <button className="ext-btn" onClick={downloadKML}>
          <span>Download Plot KML</span>
        </button>

        <button className="ext-btn" onClick={loadGEEScript}>
          <span>Go To GEE Script</span>
        </button>

        <button className="ext-btn" onClick={showGeoDash}>
          <span>Open GeoDash</span>
        </button>

        <button className="ext-btn" onClick={openInGoogleEarth}>
          <span>Go To Google Earth Web</span>
        </button>
      </div>
    </SidebarCard>
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
    mapConfig,
    userImages,
    remainingPlotters,
    usedKML,
    usedGeodash,
    inReviewMode,
    answerMode,
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
            setAppState(s => ({...s,
                               remainingPlotters: remainingPlotters.filter((plotter) => plotter.userId != currentUserId) }));
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

  const resetPlotValues = () => {
    setAppState((prev) => {
      const newPlot = prev.currentPlot;
      const copyValues = false;
      const samples = newPlot?.samples || [];

      const bySample = (pick, copy) =>
            Object.fromEntries(samples.map((s) => [s.id, copy ? (pick(s) || {}) : {}]));

      const selectedQuestionId = Number(
        (Object.entries(prev.currentProject?.surveyQuestions || {}).find(
          ([_id, sq]) => sq.parentQuestionId === -1
        )?.[0]) ?? -1
      );

      return {
        ...prev,
        newPlotInput: newPlot.visibleId,
        userSamples: bySample((s) => s.savedAnswers, copyValues),
        originalUserSamples: copyValues
          ? bySample((s) => s.savedAnswers, true)
          : prev.originalUserSamples,
        userImages: bySample((s) => s.userImage, copyValues),
        selectedQuestionId,
        collectionStart: Date.now(),
        unansweredColor: "black",
      };
    });
  };

  const clearAll = (drawTool) => {
    if (
      answerMode === "draw" &&
        confirm("Do you want to clear all samples from the draw area?")
    ) {
      mercator.disableDrawing(mapConfig);
      mercator.removeLayerById(mapConfig, "currentSamples");
      mercator.removeLayerById(mapConfig, "drawLayer");
      mercator.addVectorLayer(
        mapConfig,
        "drawLayer",
        null,
        mercator.ceoMapStyles("draw", "orange")
      );
      mercator.enableDrawing(mapConfig, "drawLayer", drawTool);
    } else if (confirm("Do you want to clear all answers?")) {
      resetPlotValues();
    }
  };

  const checkCanSave = () => {
    const { surveyQuestions, collectConfidence } = currentProject;
    const { confidence } = currentPlot;
    const visibleSurveyQuestions = filterObject(surveyQuestions, ([_id, val]) => val.hideQuestion != true);
    const noneAnswered = everyObject(visibleSurveyQuestions, ([_id, sq]) => safeLength(sq.answered) === 0);
    const hasSamples = safeLength(currentPlot.samples) > 0;
    const allAnswered = everyObject(
      visibleSurveyQuestions,
      ([_id, sq]) => safeLength(sq.visible) === safeLength(sq.answered));
    if(currentPlot.flagged) {
      return true;
    } else if (inReviewMode) {
      if (!(noneAnswered || allAnswered)) {
        setAppState((prev) => ({
          ...prev,
          modal: {
            alert: {
              alertType: "Review Mode Alert",
              alertMessage:
              "In review mode, plots can only be saved if all questions are answered or the answers are cleared.",
            },
          },
        }));
        return false;
      } else {
        return true;
      }
    } else if (!hasSamples) {
      setAppState((prev) => ({
        ...prev,
        modal: {
          alert: {
            alertType: "Review Mode Alert",
            alertMessage:
            "The collection must have samples to be saved. Enter draw mode to add more samples.",
          },
        },
      }));
      return false;
    } else if (!allAnswered) {
      setAppState((prev) => ({
        ...prev,
        modal: {
          alert: {
            alertType: "Review Mode Alert",
            alertMessage:
            "All questions must be answered to save the collection.",
          },
        },
      }));
      return false;
    } else if (collectConfidence && !confidence) {
      setAppState((prev) => ({
        ...prev,
        modal: {
          alert: {
            alertType: "Review Mode Alert",
            alertMessage:
            "You must input the confidence before saving the interpretation.",
          },
        },
      }));
      return false;
    } else {
      return true;
    }
  };

  const postValuesToDB = () => {
    if(!checkCanSave()) {
      return false;
    };
    if (currentPlot.flagged) {
      flagPlot();
    } else {
      savePlotAnswers();
    }
  };

  const toggleFlagged = () => setAppState(s => ({...s, currentPlot: {...s.currentPlot, flagged: !s.currentPlot.flagged}}))

  return (
    <div className="sidebar-footer-buttons">
      <button className="btn outline"
              onClick={clearAll}>
        Clear All
      </button>
      <button className="btn outline"
              onClick={toggleFlagged}>
        {currentPlot.flagged ? "Unflag Plot" : "Flag Plot"}
      </button>
      <button className="btn filled"
              onClick={() => setAppState(s => ({...s, showQuitModal: !s.showQuitModal}))}
      >Quit</button>
      <button className="btn filled"
              onClick={postValuesToDB}>
        Save & Continue
      </button>
    </div>
  );
};

export const ImageryOptions = () => {
  const {
    mapConfig,
    currentPlot,
    currentProject,
    loadingImages,
    currentImagery,
    imageryList = [],
    imagery,
  } = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);

  const [open, setOpen] = useState(true);
  const [enableGrid, setEnableGrid] = useState(false);

  const setBaseMapSource = (id) => {
    const img = imageryList.find((i) => Number(i.id) === Number(id)) || null;
    setAppState((s) => ({
      ...s,
      currentImageryId: id,
      currentImagery: img,
    }));
  };

  const setImageryAttributes = (attrs) => {
    setAppState((s) => ({
      ...s,
      imageryAttributes: { ...(s.imageryAttributes || {}), ...(attrs || {}) },
    }));
  };

  const setImageryAttribution = (attr) => {
    setAppState((s) => ({
      ...s,
      imageryAttribution: attr,
    }));
  };

  const toggleGrid = () => {
    const next = !enableGrid;
    setEnableGrid(next);
    mercator.addGridLayer(mapConfig, next);
  };

  const extent = (() => {
    if (!(currentPlot?.id && currentProject?.id)) return [];
    const geom = currentPlot.plotGeom || "";
    if (geom.includes("Point")) {
      return mercator
        .getPlotPolygon(geom, currentProject.plotSize, currentProject.plotShape)
        .getExtent();
    }
    return mercator.parseGeoJson(geom, true).getExtent();
  })();

  const commonProps = {
    mapConfig,
    setImageryAttribution,
    setImageryAttributes,
    currentPlot,
    currentProjectBoundary: currentProject?.boundary,
    extent,
  };

  return (
    <SidebarCard
      title="Imagery Options"
      collapsible
      defaultOpen={open}
      infoText="Configure the imagery sources, visualization, and grid overlay"
    >
      {loadingImages && <h3 className="sq-muted">Loading imagery data...</h3>}

      {currentImagery.id && (
        <div className="sq-field">
          <label htmlFor="base-map-source" className="sq-label">
            Base imagery
          </label>
          <select
            className="sq-select"
            id="base-map-source"
            name="base-map-source"
            onChange={(e) => setBaseMapSource(parseInt(e.target.value, 10))}
            value={currentImagery.id}
          >
            {imageryList.map((imagery) => (
              <option key={imagery.id} value={imagery.id}>
                {imagery.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {currentImagery.id &&
       imageryList.map((imagery) => {
         const visible = currentImagery.id === imagery.id && open;
         if (!imagery.sourceConfig) return null;

         const propsForMenu = {
           ...commonProps,
           key: imagery.id,
           thisImageryId: imagery.id,
           sourceConfig: imagery.sourceConfig,
           visible,
         };

         const byType = {
           Planet: <PlanetMenu {...propsForMenu} />,
           PlanetDaily: <PlanetDailyMenu {...propsForMenu} />,
           PlanetTFO: <PlanetTFOMenu {...propsForMenu} />,
           SecureWatch: <SecureWatchMenu {...propsForMenu} />,
           Sentinel1: <SentinelMenu {...propsForMenu} />,
           Sentinel2: <SentinelMenu {...propsForMenu} />,
           GEEImage: <GEEImageMenu {...propsForMenu} />,
           GEEImageCollection: <GEEImageCollectionMenu {...propsForMenu} />,
         };

         return byType[imagery.sourceConfig.type] || null;
       })}

      <div className="sq-field" style={{ marginTop: 12 }}>
        <label className="sq-switch">
          <input
            type="checkbox"
            checked={enableGrid}
            onChange={toggleGrid}
          />
          <span className="sq-switch-slider" />
          <span className="sq-switch-label">Enable map grid</span>
        </label>
      </div>
    </SidebarCard>
  );
};
