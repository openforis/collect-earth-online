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

export function Collection ({ projectId, acceptedTerms, plotId, userEmail }) {
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
        const [projectRes, plotsRes, imageryRes, plottersRes, statsRes] = await Promise.all([
          fetch(`/get-project-by-id?projectId=${projectId}`),
          fetch(`/get-project-plots?projectId=${projectId}`),
          fetch(`/get-project-imagery?projectId=${projectId}`),
          fetch(`/get-plotters?projectId=${projectId}`),
          fetch(`/get-project-stats?projectId=${projectId}`)
        ]);
        if (cancelled) return;
        if (!projectRes.ok) throw projectRes;
        if (!plotsRes.ok) throw plotsRes;
        if (!imageryRes.ok) throw imageryRes;
        if (!plottersRes.ok) throw plottersRes;
        if (!statsRes.ok) throw statsRes;
        const project = await projectRes.json();
        const plotList = await plotsRes.json();
        const imageryListRaw = await imageryRes.json();
        const plotters = await plottersRes.json();
        const stats = await statsRes.json();
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
        const firstQuestionId = Object.keys(project.surveyQuestions).reduce((minId, currentId) => {
          const currentOrder = project.surveyQuestions[currentId].cardOrder ?? Infinity;
          const minOrder = project.surveyQuestions[minId].cardOrder ?? Infinity;
          return currentOrder < minOrder ? currentId : minId;
        });
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
          selectedQuestionId: parseInt(firstQuestionId),
          plotList,
          plotters: Array.isArray(plotters) ? plotters : [],
          imageryList,
          mapConfig: mapConf,
          currentImagery: defaultImagery || s.currentImagery,
          showAcceptTermsModal: !!acceptedTerms,
          modalMessage: null,
          stats
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

  const newPlotValues = (newPlot, copyValues = true) => {
    const surveyQs = state.currentProject?.surveyQuestions || {};
    const firstQuestionId = Object.keys(surveyQs).length > 0
      ? Object.keys(surveyQs).reduce((minId, currentId) => {
        const currentOrder = surveyQs[currentId].cardOrder ?? Infinity;
        const minOrder = surveyQs[minId].cardOrder ?? Infinity;
        return currentOrder < minOrder ? currentId : minId;
      })
      : -1;

    return {
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
      selectedQuestionId: state.selectedQuestionId > 0
        ? state.selectedQuestionId
        : parseInt(firstQuestionId),
      collectionStart: Date.now(),
      unansweredColor: "black",
    };
  };
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
          console.log(data[0]);          
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
              usedKML: data[0]?.usedKML ?? false,
              usedGeodash: data[0]?.usedGeodash ?? false,
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
    const sortedQuestions = Object.values(currentProject.surveyQuestions || {})
      .sort((a, b) => (a.cardOrder ?? Infinity) - (b.cardOrder ?? Infinity));

    const selectedQuestion = sortedQuestions[0];
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
              left: state.isImageryLayersExpanded ? "0px" : "-236.183px",
              width: "236.183px",
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
        <div className="col-lg-4 col-md-4 d-flex flex-column border-left full-height">
          <CollectionSidebar processModal={processModal} userEmail={userEmail}></CollectionSidebar>
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
                   bottom: '3.5em',
                   right: '2vw',
                   zIndex: 1}}>
        <div className="ExternalTools__geo-buttons d-flex flex-column" id="plot-nav" style={{ gap: '0.8rem' }}>
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
        crumbs={[
          {display: "Institution",
           id: "institution",
           query: ["institution", params.institutionId],
           onClick: (e)=>{
             window.location.assign(`/review-institution?institutionId=${params.institutionId}`);
           }},
          {display: "Collection",
           id: "project",
           query: ["project", params.projectId],
           onClick: (e)=>{
             console.log("go to collection");
           }}
        ]}        
      />
      <Collection
        userEmail={session.userName}
        projectId={params.projectId}
        plotId={params.plotId || null}
        userName={session.userName || "guest"}
        acceptedTerms={session.acceptedTerms || false} />
    </NavigationBar>,
    document.getElementById("app")
  );
}
