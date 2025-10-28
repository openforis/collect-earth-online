import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

import { useAtom, useSetAtom } from 'jotai';
import { stateAtom } from './utils/constants';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import _ from "lodash";

import {
  LoadingModal,
  NavigationBar,
  LearningMaterialModal,
  AcceptTermsModal,
  ImageryLayerOptions,
  BreadCrumbs
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
import { CollectionSidebar } from "./components/CollectionSidebar";

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
        const imageryList = Array.isArray(imageryListRaw) ?
              imageryListRaw.map((image, i) => ({ ...image, visible: i === 0 })) :
              [];
        // Initialize map on HTML ID
        const mapConf = mercator.createMap(
          "image-analysis-pane",
          [0, 0],
          1,
          Array.isArray(imageryList) ? imageryList : []
        );

        // add AOI Polygon Layer
        if (project?.aoiFeatures) {
          mercator.addVectorLayer(
            mapConf,
            "currentAOI",
            mercator.geomArrayToVectorSource(project.aoiFeatures),
            mercator.ceoMapStyles("geom", "yellow"),
            9999
          );
          mercator.zoomMapToLayer(mapConf, "currentAOI", 48);
        }

        // select Imagery and make it render on the map
        const defaultImagery =
              (project?.imageryId && imageryList.find(im => im.id === project.imageryId)) ||
              imageryList[0] || null;

        if (defaultImagery?.id) {
          try {
            mercator.setVisibleLayer(mapConf, defaultImagery.id);
            const t = defaultImagery?.sourceConfig?.type;
            const needsOverlay =
                  Boolean(state.currentPlot) &&
                  ["PlanetDaily", "SecureWatch"].includes(t);
            mercator.setLayerVisibilityByLayerId(mapConf, "goToPlot", !!needsOverlay);
          } catch (e) {
            console.error("setVisibleLayer failed", e);
          }
        }

        // set state
        setState(s => ({
          ...s,
          currentProject: project,
          plotList,
          plotters: Array.isArray(plotters) ? plotters : [],
          imageryList,
          mapConfig: mapConf,
          currentImagery: defaultImagery || s.currentImagery,
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

  // INIT PROJECT — show project overview when ready
  useEffect(() => {
    if (state.mapConfig && Array.isArray(state.plotList) && state.plotList.length > 0) {
      showProjectOverview();
      if(state.currentProject?.projectOptions?.plotSimilarity){
        reprocessPlotSimilarity();
      }
    }
  }, [state.mapConfig, state.plotList]);

  // UPDATE MAP WHEN STATE CHANGES — Auto launch geodash
  useEffect(() => {
    if (!state.currentPlot?.id) return;

    showProjectPlot();

    if (state.currentProject?.hasGeoDash && state.currentProject?.projectOptions?.autoLaunchGeoDash) {
      showGeoDash();
    }

    if (state.storedInterval) clearInterval(state.storedInterval);
    if (state.currentProject?.type === "regular") {
      const id = setInterval(resetPlotLock, 60 * 1000);
      setState((s) => ({ ...s, storedInterval: id }));
    }

    updateMapImagery();
  }, [state.currentPlot?.id, state.showBoundary, state.currentProject?.hasGeoDash, state.currentProject?.projectOptions?.autoLaunchGeoDash, state.currentProject?.type]);

  // GET PLOT DATA WHEN NEEDED - When getNewPlot changes to true, request plot data
  useEffect(() => {
    if(state.getNewPlot) {
      getPlotData(state.newPlotId || -999, state.navDirection);
      setState(s => ({...s, getNewPlot: false}));
    }
  }, [state.getNewPlot]);

  // UPDATE MAP WHEN STATE CHANGES — samples redraw (question/answers/visibility)
  useEffect(() => {    
    if (!state.currentPlot?.id) return;

    const selectedQuestion = state.currentProject?.surveyQuestions?.[state.selectedQuestionId];
    if (selectedQuestion?.visible) {
      showPlotSamples();
      highlightSamplesByQuestion();
      createPlotKML();
    }
  }, [
    state.currentPlot?.id,
    state.selectedQuestionId,
    state.unansweredColor,
    state.userSamples,
    state.currentProject?.surveyQuestions?.[state.selectedQuestionId]?.visible,
    state.showSamples,
    state.showBoundary,
  ]);

  // UPDATE QUESTION STATUS
  useEffect(() => {
    if (state.currentProject?.surveyQuestions && lengthObject(state.currentProject.surveyQuestions)) {
      updateQuestionStatus();
    }
  }, [state.userSamples]);

  // IMAGERY OVERLAY — when imagery or mapConfig changes; record imageryIds; update overlay
  useEffect(() => {
    if (!state.mapConfig || !state.currentImagery?.id) return;

    if (!state.imageryIds?.includes(state.currentImagery.id)) {
      setState((s) => ({ ...s, imageryIds: [...(s.imageryIds || []), state.currentImagery.id] }));
    }

    updateMapImagery();
  }, [state.mapConfig, state.currentImagery?.id]);

  useEffect(()=> {
    state.navigationMode === 'similar' &&
      setState((s)=> ({ ...s, referencePlotId: state.currentProject.referencePlotId}));
  }, [state.navigationMode]);

  // API CALLS
  const getPlotData = (visibleId=1, direction, forcedNavMode = null, reviewMode = null) => {       
    processModal("Getting plot", () => {
      return fetch(
        "/get-collection-plot?" +
          getQueryString({
            visibleId,            
            projectId,
            navigationMode: forcedNavMode || state.navigationMode,
            direction,
            inReviewMode: reviewMode || state.inReviewMode,
            threshold: state.threshold,
            currentUserId: state.currentUserId,
            projectType: state.currentProject.type,
            referencePlotId: state.referencePlotId || 0
          })
      )
        .then((response) => (response.ok ? response.json() : Promise.reject(response)))
        .then((data) => {
          if (data === "not-found") {
            const err = (direction === "id" ? "Plot not" : "No more plots") +
                  " found for this navigation mode.";
            const reviewModeWarning = "\n If you have just changed navigation modes, please click the “Next” or “Back” arrows in order to see the plots for this navigation mode.";
            setState (prev => ({... prev, modal: {alert: {alertType: "Plot Data Error", alertMessage: state.inReviewMode ? err + reviewModeWarning : err}}}));
          } else {
            setState (prev=> ({
              ... prev,
	      userPlotList: data,
	      remainingPlotters: data,
	      currentPlot: data[0],
	      currentUserId: data[0].userId,
	      ...newPlotValues(data[0]),
	      answerMode: "question",
	      inReviewMode: reviewMode || state.inReviewMode,
              newPlotId: data[0].visibleId,
	    }));
          }
        })
        .catch((response) => {
          console.error(response);
          setState (prev => ({... prev, modal: {alert: {alertType: "Plot Data Retrieval Error", alertMessage: "Error retrieving plot data. See console for details."}}}));
        });}
    );
  };
  

  // Functions

  const newPlotValues = (newPlot, copyValues = true) => ({	
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
      : state.originalUserSamples	
    : {},	
    userImages: newPlot.samples	
      ? newPlot.samples.reduce(	
        (acc, cur) => ({ ...acc, [cur.id]: copyValues ? cur.userImage || {} : {} }),	
        {}	
      )	
      : {},	
    selectedQuestionId: Number(	
      findObject(	
        state.currentProject.surveyQuestions,	
        ([_id, sq]) => sq.parentQuestionId === -1	
      )[0]	
    ),	
    collectionStart: Date.now(),	
    unansweredColor: "black",	
  });

  const processModal = (message, callBack) => {
     setState(prev => ({ ... prev, modalMessage: message }));
     return Promise.resolve()
       .then(() => callBack())
      .finally(() => setState(prev => ({... prev,  modalMessage: null })));};

  const reprocessPlotSimilarity = () => {
    fetch(`/recalculate-plot-similarity`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        projectId: state.currentProject.id,
        referencePlotId: state.currentProject.plotSimilarityDetails.referencePlotId,
        similarityYears: state.currentProject.plotSimilarityDetails.years,
      })
    })
      .then((response) => {
        if (response.ok) {
          null;
        } else {
          this.setState({modal: {alert: {alertType: "Recalculate Similarity Error", alertMessage: "Error recalculating plot similarity. See console for details."}}});
        }
      }
  )};

  const showPlotSamples = () => {
    const {
      mapConfig,
      unansweredColor,
      currentProject,
      selectedQuestionId,
      showSamples,
    } = state;

    if (!mapConfig || !currentProject || selectedQuestionId == null) return;

    const selectedQuestion = currentProject.surveyQuestions?.[selectedQuestionId];
    if (!selectedQuestion) return;

    const type = currentProject.type;
    const baseVisible = Array.isArray(selectedQuestion.visible) ? selectedQuestion.visible : [];
    const visibleSamples = type === "simplified"
          ? baseVisible.filter((s) => s.visibleId !== 1)
          : baseVisible;

    mercator.disableSelection(mapConfig);
    mercator.disableDrawing(mapConfig);
    mercator.removeLayerById(mapConfig, "currentSamples");
    mercator.removeLayerById(mapConfig, "drawLayer");

    mercator.addVectorLayer(
      mapConfig,
      "currentSamples",
      mercator.samplesToVectorSource(visibleSamples),
      mercator.ceoMapStyles("geom", showSamples ? unansweredColor : "transparent"),
      9999
    );

    mercator.enableSelection(
      mapConfig,
      "currentSamples",
      (sampleId) => {
        if (sampleId === -1) return;
        setState((s) => ({ ...s, selectedSampleId: sampleId }));
      }
    );
  };
  
  const zoomToPlot = () => mercator.zoomMapToLayer(state.mapConfig, "currentPlot", 36);

  const showProjectPlot = () => {
    const { currentPlot, mapConfig, currentProject, showBoundary} = state;
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
    zoomToPlot();
  };
  
  const showProjectOverview = () => {
    mercator.addPlotLayer(state.mapConfig, state.plotList, (feature) =>
      getPlotData(feature.get("features")[0].get("plotId"), "id")
    );
  };

  const featuresToSampleLayer = () => {
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

  const resetPlotLock = () => {
    fetch("/reset-plot-lock", {
      method: "POST",	
      headers: {	
        Accept: "application/json",	
        "Content-Type": "application/json",	
      },	
      body: JSON.stringify({	
        plotId: state.currentPlot.id,	
        projectId: state.currentProject.id,
      }),
    }).then((response) => {	
      if (!response.ok) {	
        console.log(response);	
        setState (s => ({...s, modal: {alert: {alertType: "Plot Lock Error", alertMessage: "Error maintaining plot lock. Your work may get overwritten. See console for details."}}}));	
      }	
    });	
  };
  
  const setImageryAttribution = (attributionSuffix) =>
        setState(s => ({
          ...s,
          imageryAttribution: state.currentImagery.attribution + attributionSuffix,
        }));

  const setImageryAttributes = (newImageryAttributes) =>
        setState(s => ({...s, imageryAttributes: newImageryAttributes }));

  const updateMapImagery = () => {
    const { currentPlot, mapConfig, currentImagery } = state;
    mercator.setVisibleLayer(state.mapConfig, state.currentImagery.id);
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

  const updateQuestionStatus = () => {
    const { userSamples } = state;
    const newSurveyQuestions = mapObject(
      state.currentProject.surveyQuestions,
      ([questionId, question]) => {
        const visible = calcVisibleSamples(Number(questionId)) || [];
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
    
    setState(s => ({
      ...s,
      currentProject: {
        ...state.currentProject,
        surveyQuestions: newSurveyQuestions,
      },
    }));
  };

  const calcVisibleSamples = (currentQuestionId) => {
    const {
      currentProject: { surveyQuestions },
      userSamples,
    } = state;
    const { parentQuestionId, parentAnswerIds } = surveyQuestions[currentQuestionId];

    if (parentQuestionId === -1) {
      return state.currentPlot?.samples;
    } else {
      return calcVisibleSamples(parentQuestionId)?.filter((sample) => {
        const sampleAnswerId = _.get(userSamples, [sample.id, parentQuestionId, "answerId"]);
        return (
          sampleAnswerId != null &&
            (parentAnswerIds.length === 0 || parentAnswerIds.includes(sampleAnswerId))
        );
      });
    }
  };

  const highlightSamplesByQuestion = () => {
    const { selectedQuestionId, currentProject } = state;
    const { answers, componentType } = currentProject.surveyQuestions[selectedQuestionId];
    const allFeatures = mercator.getAllFeatures(state.mapConfig, "currentSamples") || [];

    allFeatures
      .filter((feature) => {
        const sampleId = feature.get("sampleId");
        return (
          state.userSamples[sampleId] && state.userSamples[sampleId][selectedQuestionId]
        );
      })
      .forEach((feature) => {
        const sampleId = feature.get("sampleId");
        const userAnswer = _.get(
          state,
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

  const createPlotKML = () => {
    const plotFeatures = mercator.getAllFeatures(state.mapConfig, "currentPlot");
    const sampleFeatures = mercator.getAllFeatures(state.mapConfig, "currentSamples");
    let KMLFeatures = mercator.getKMLFromFeatures([
      mercator.asPolygonFeature(plotFeatures[0]),
      ...sampleFeatures,
    ]);
    
    setState(s => ({
      ...s,
      KMLFeatures: outlineKML(KMLFeatures)
    }));
  };
  
  const showGeoDash = () => {
    const { currentPlot, mapConfig, currentProject } = state;
    const plotRadius = currentProject.plotSize
          ? currentProject.plotSize / 2.0
          : mercator.getViewRadius(mapConfig);
    setState(s => ({...s, usedGeodash: true }));
    window.open(
      "/geo-dash?" +
        `institutionId=${state.currentProject.institution}` +
        `&projectId=${projectId}` +
        `&visiblePlotId=${currentPlot.visibleId}` +
        `&plotId=${currentPlot.id}` +
        `&plotExtent=${encodeURIComponent(JSON.stringify(mercator.getViewExtent(mapConfig)))}` +
        `&plotShape=${
          currentPlot.plotGeom.includes("Point") ? currentProject.plotShape : "polygon"
        }` +
        `&center=${currentPlot.plotGeom.includes("Point") ? currentPlot.plotGeom : ""}` +
        `&radius=${plotRadius}`,
      `_geo-dash_${projectId}`
    );
  };

  // Layers panel functions
  const setImageryList = (newList) =>
        setState((s) => ({ ...s, imageryList: newList }));

  const resetLayers = () =>
        setState((prev) => {
          const updated = prev.imageryList.map((layer) =>
            layer.title === "Mapbox Satellite"
              ? { ...layer, visible: true }
            : { ...layer, visible: false }
          );

          updated.forEach((layer) => {
            mercator.setLayerVisibilityByLayerId(
              prev.mapConfig,
              layer.id,
              layer.visible
            );
          });

          return { ...prev, imageryList: updated };
        });

  const toggleLayer = (layerId) =>
        setState((prev) => {
          const updated = prev.imageryList.map((layer) =>
            layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
          );

          const maxZ = updated.length - 1;
          updated.forEach((layer, index) => {
            const z = maxZ - index;
            mercator.setLayerVisibilityByLayerId(
              prev.mapConfig,
              layer.id,
              layer.visible,
              z
            );
          });

          return { ...prev, imageryList: updated };
        });

  const changeOpacity = (layerId, opacity) => {
    const { mapConfig } = state;
    const olLayer = mercator.getLayerById(mapConfig, layerId);
    if (olLayer) {
      olLayer.setOpacity(opacity);
      setState((prev) => ({
        ...prev,
        imageryList: prev.imageryList.map((l) =>
          l.id === layerId ? { ...l, opacity } : l
        ),
      }));
    }
  };

  const dragEnd = (result) => {
    if (!result?.destination) return;

    const { mapConfig, imageryList } = state;
    const reordered = [...imageryList];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    const maxZ = reordered.length - 1;
    reordered.forEach((layer, index) => {
      const olLayer = mercator.getLayerById(mapConfig, layer.id);
      if (olLayer) olLayer.setZIndex(maxZ - index);
    });

    setImageryList(reordered);
  };

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
            <ImageryLayerOptions
              imageryList={state.imageryList}
              setImageryList={setImageryList}
              onDragEnd={dragEnd}
              onToggleLayer={toggleLayer}
              onChangeOpacity={changeOpacity}
              onReset={resetLayers}
              isImageryLayersExpanded={state.isImageryLayersExpanded}
            />
            <button
              className="toggle-sidebar position-absolute"
              onClick={() => setState((s) => ({ ...s, isImageryLayersExpanded: !s.isImageryLayersExpanded }))}
            >
              {state.isImageryLayersExpanded ? <FaChevronLeft /> : <FaChevronRight />}
            </button>
          </div>
        )}
        <div className="d-flex flex-column flex-grow-1">
          <ImageAnalysisPane />
        </div>
        <div className="col-lg-3 col-md-3 d-flex flex-column border-left full-height">
          <CollectionSidebar processModal={processModal}>
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
  );
};
    
function ImageAnalysisPane({}) {
  const [state, setState] = useAtom(stateAtom);
  
  const toggleShowBoundary = () => {
  setState (s => ({...s, showBoundary: !state.showBoundary}));
  };
  
  const toggleShowSamples = () =>  {
    setState (s=> ({...s, showSamples: !state.showSamples}));
  };

  const zoomToPlot = () => {
    state.mapConfig &&
    mercator.zoomMapToLayer(state.mapConfig, "currentPlot", 36);
  };

  const zoom = (level) => {
    state.mapConfig &&
    mercator.setMapZoom(state.mapConfig, level);
  };
  
  return (
    <div className="pl-0 pr-0 full-height" id="image-analysis-pane" style={{position: 'relative'}}>
      <div className="row" id="imagery-info" style={{ justifyContent: "center" }}>
        <p style={{ fontSize: ".9rem", marginBottom: "0" }}>{state.imageryAttribution}</p>
      </div>
      
      <div className="map-controls"
           style={{position: 'absolute',
                   bottom: '2em',
                   right: '10vw',
                   zIndex: 1}}>
        <div className="ExternalTools__geo-buttons d-flex flex-column" id="plot-nav" style={{ gap: '1rem' }}>
          <input
            className="btn btn-outline-lightgreen btn-sm"
            onClick={zoomToPlot}
            type="button"
            value="Re-Zoom"
          />
          <input
    className={`btn btn-outline-${state.showSamples ? "red" : "lightgreen"} btn-sm`}

            onClick={toggleShowSamples}
            type="button"
            value={`${state.showSamples ? "Hide" : "Show"} Samples`}
          />
          <input
    className={`btn btn-outline-${state.showBoundary ? "red" : "lightgreen"} btn-sm`} 
            onClick={toggleShowBoundary}
            type="button"
            value={`${state.showBoundary ? "Hide" : "Show"} Boundary`}
          />
          <div className="d-flex flex-column">
            <button className="btn btn-sm"
                  style={{backgroundColor: 'white',
                          borderRadius: '25%',
                          margin: 'auto 0 auto auto'}}
                    onClick={() => zoom(1)}
            >
		  <SvgIcon icon="plus" size="0.9rem" /></button>
          <button className="btn btn-sm"
                  style={{backgroundColor: 'white',
                          borderRadius: '25%',
                          margin: 'auto 0 auto auto'}}
                  onClick={() => zoom(-1)}
          >
            <SvgIcon icon="minus" size="0.9rem" /></button>
          </div>
             </div>
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
      <BreadCrumbs
        crumb={{display: "Collection",
                id: "collection",
                onClick: (e)=>{
                  console.log("go to collection");
                }}}
      />
      <Collection projectId={params.projectId} plotId={params.plotId || null} userName={session.userName || "guest"} acceptedTerms={session.acceptedTerms || false} />
      </NavigationBar>,
    document.getElementById("app")
  );
}
