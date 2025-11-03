import React, { useState, useEffect, useMemo } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { stateAtom } from '../utils/constants';
import { mercator } from '../utils/mercator';
import { SidebarCard } from "./Sidebar";
import SvgIcon from "./svg/SvgIcon";
import {
  lengthObject,
  filterObject,
  mapObjectArray,
} from '../utils/sequence';
import { LearningMaterialModal } from "./PageComponents";

import '../../css/sidebar.css'
import '../../css/survey.css';


export const SurveyQuestions = () => {
  const { currentProject,
          currentPlot,
          mapConfig,
          selectedSampleId,
          userSamples } = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);
  const [openTopId, setOpenTopId] = useState(null);
  const [openByParent, setOpenByParent] = useState({})
  const [showLearningMaterial, setShowLearningMaterial] = useState(false);

  const entries = (obj = {}) => Object.entries(obj || {});
  const visibleAnswers = (q) => entries(q.answers).filter(([, a]) => !a?.hide);


  //EFFECTS
  useEffect(() => {
  }, [currentProject, userSamples]);

  //FUNCTIONS

  // Which samples to write to
  const getSelectedSampleIds = (questionId) => {
    const answered = currentProject?.surveyQuestions?.[questionId]?.answered || [];
    const allFeatures = mercator.getAllFeatures(mapConfig, "currentSamples") || [];
    const unansweredFeatures = keyDifference(answered, allFeatures);
    const selectedSamples = mercator.getSelectedSamples(mapConfig);
    const selectedFeatures = selectedSamples ? selectedSamples.getArray() : [];

    const list =
          ((selectedFeatures.length === 0 && answered.length === 0) ||
           lengthObject(userSamples) === 1)
          ? allFeatures
          : (selectedFeatures.length !== 0 ? selectedFeatures : unansweredFeatures);
    
    return list.map((f) => f.get("sampleId"));
  };
  
  // Validate the selection
  const checkSelection = (sampleIds, questionId) => {
    const q = currentProject?.surveyQuestions?.[questionId];
    const visibleIds = (q?.visible || []).map((v) => v.id);
    if (sampleIds.some((s) => !visibleIds.includes(s))) {
      setAppState((s) => ({
        ...s,
        modal: { alert: {
          alertType: "Selection Error",
          alertMessage: "Invalid Selection. Try selecting the question before answering."
        }}
      }));
      return false;
    }

    if (sampleIds.length === 0) {
      setAppState((s) => ({
        ...s,
        modal: { alert: {
          alertType: "Selection Error",
          alertMessage: "Please select at least one sample before choosing an answer."
        }}
      }));
      return false;
    }

    return true;
  };

  // Save the answers to userSamples and userImages
  const setCurrentValue = (questionId, answerId, answerText) => {
    setAppState((prev) => {
      const sampleIds = getSelectedSampleIds(questionId);
      if (!checkSelection(sampleIds, questionId)) return prev;

      const childQuestionIds = getChildQuestionIds(questionId);

      const newSamples = sampleIds.reduce((acc, sampleId) => {
        if (answerText == null) return acc;

        const prevSampleAnswers = prev.userSamples?.[sampleId] || {};
        const subQuestionsCleared = filterObject(
          prevSampleAnswers,
          ([key]) => !childQuestionIds.includes(Number(key))
        );

        const newQuestion = { answerId };
        if (answerText !== "") newQuestion.answer = answerText;

        acc[sampleId] = {
          ...subQuestionsCleared,
          [questionId]: newQuestion,
        };
        return acc;
      }, {});

      const newUserImages = sampleIds.reduce((acc, sampleId) => {
        acc[sampleId] = {
          id: prev.currentImagery.id,
          attributes:
          prev.currentImagery?.sourceConfig?.type === "PlanetDaily"
            ? {
              ...prev.imageryAttributes,
              imageryDatePlanetDaily: mercator.getTopVisiblePlanetLayerDate(
                prev.mapConfig,
                prev.currentImagery.id
              ),
            }
          : prev.imageryAttributes,
        };
        return acc;
      }, {});

      if (!Object.keys(newSamples).length) return prev;

      return {
        ...prev,
        userSamples: { ...(prev.userSamples || {}), ...newSamples },
        userImages:  { ...(prev.userImages  || {}), ...newUserImages },
      };
    });
  };

  // is this child eligible to show given the parent's current answer?
  const isChildVisible = (child) => {
    const parentId = child.parentQuestionId;
    if (parentId == null || parentId < 0) return false;

    const parent = currentProject?.surveyQuestions?.[parentId];
    if (!parent) return false;

    const parentAns = getCurrentAnswer(parentId);
    if (!parentAns) return false;

    if (parent.componentType === 'input') {
      return String(parentAns.answer ?? '').length > 0;
    }

    const allowed = Array.isArray(child.parentAnswerIds) ? child.parentAnswerIds : [];
    return allowed.length === 0 || allowed.includes(Number(parentAns.answerId));
  };

  const childrenOf = (parentId) =>
    mapObjectArray(
      currentProject?.surveyQuestions || {},
      ([id, q]) => ({ id: Number(id), ...q })
    )
    .filter(q => q.parentQuestionId === parentId && !q.hideQuestion)
    .sort((a, b) => (a.cardOrder ?? 1e9) - (b.cardOrder ?? 1e9));

  const getAnswerForSample = (qId, sampleId) => {
    const us = userSamples?.[sampleId]?.[qId];
    if (us) return { answerId: Number(us.answerId), answer: us.answer };
    const a = (currentProject?.surveyQuestions?.[qId]?.answered || [])
          .find(x => Number(x.sampleId) === Number(sampleId));
    return a ? { answerId: Number(a.answerId), answer: a.answerText } : null;
  };

  const isSampleAnswered = (qId, ansObj) => {
    if (!ansObj) return false;
    const q = currentProject?.surveyQuestions?.[qId];
    if (!q) return false;
    if (q.componentType === 'input') {
      const val = q.dataType === 'number'
            ? (ansObj.answer ?? '').toString().trim()
            : (ansObj.answer ?? '').toString().trim();
      // number: must be non-empty and not NaN; text: non-empty string
      if (q.dataType === 'number') return val !== '' && !Number.isNaN(Number(val));
      return val.length > 0;
    }
    // buttons/radio/dropdown: require a concrete answerId
    return ansObj.answerId !== null && ansObj.answerId !== undefined;
  };

  const getQuestionStatusShallow = (questionId) => {
    const qLive = currentProject?.surveyQuestions?.[questionId];
    const visibleArr = Array.isArray(qLive?.visible) ? qLive.visible : [];
    if (visibleArr.length === 0) return 'none';
    const visibleIds = visibleArr.map(v => Number(v.id));

    let answeredCount = 0;
    for (const sid of visibleIds) {
      const ans = getAnswerForSample(questionId, sid);
      if (isSampleAnswered(questionId, ans)) answeredCount++;
    }
    if (answeredCount === 0) return 'none';
    if (answeredCount === visibleIds.length) return 'complete';
    return 'partial';
  };

  //Check if the answer has been fully answered for all samples to determine its status
  const getQuestionStatus = (questionId) => {
    const base = getQuestionStatusShallow(questionId);

    // if this question itself has no answers yet, it's 'none' regardless of children
    if (base === 'none') return 'none';

    const children = childrenOf(questionId).filter(isChildVisible);
    if (children.length === 0) return base;
    const childStatuses = children.map(child => getQuestionStatus(child.id));
    // complete only if this question AND all visible descendants are complete
    if (base === 'complete' && childStatuses.every(s => s === 'complete')) {
      return 'complete';
    }
    return 'partial';
  };

  // Gets answers for a question depending on the userSample
  const getCurrentAnswer = (questionId) => {
    const toNum = (v) => (v == null ? v : Number(v));
    if (selectedSampleId != null && selectedSampleId >= 0) {
      const us = userSamples?.[selectedSampleId]?.[questionId];
      if (us) return { answerId: toNum(us.answerId), answer: us.answer };
      const fromSurvey = (currentProject?.surveyQuestions?.[questionId]?.answered || [])
            .find(a => a.sampleId === selectedSampleId);
      if (fromSurvey) return { answerId: toNum(fromSurvey.answerId), answer: fromSurvey.answerText };
    }
    const anyAnswers = (currentProject?.surveyQuestions?.[questionId]?.answered || [])[0];
    if (anyAnswers) {
      return {
        answerId: toNum(anyAnswers.answerId), answer: anyAnswers.answerText
      }
    };
    const first = Object.values(userSamples || {}).find(sample => sample?.[questionId]);
    return first ? { answerId: toNum(first[questionId].answerId), answer: first[questionId].answer } : null;
  };

  
  // Get child question ids
  const getChildQuestionIds = (currentQuestionId) => {
    const surveyQuestions = currentProject?.surveyQuestions || {};

    const directChildren = mapObjectArray(
      filterObject(surveyQuestions, ([_id, val]) => val.parentQuestionId === currentQuestionId),
      ([key]) => Number(key)
    );

    if (directChildren.length === 0) {
      return [currentQuestionId];
    }
    return directChildren.reduce(
      (acc, childId) => [...acc, ...getChildQuestionIds(childId)],
      [currentQuestionId]
    );
  };

  const keyDifference = (o1, features) => {
    const objKeys = o1.map(i => i.sampleId);
    const sampleIds = features.map(f => f.get("sampleId"));
    const unansweredKeys = sampleIds.filter(k => !objKeys.includes(k));
    return features.filter(f => unansweredKeys.includes(f.get("sampleId")));
  };

  // RENDERING FUNCTIONS
  const renderQuestionNode = (question, depth = 0) => {
    const isOpen =
          depth === 0
          ? openTopId === question.id
          : openByParent[question.parentQuestionId] === question.id;

    const children = childrenOf(question.id).filter(isChildVisible);
    const status = getQuestionStatus(question.id);

    const handleToggle = () => {
      if (depth === 0) {
        setOpenTopId(prev => (prev === question.id ? null : question.id));
      } else {
        setOpenByParent(prev => ({
          ...prev,
          [question.parentQuestionId]:
          prev[question.parentQuestionId] === question.id ? null : question.id,
        }));
      }
      setAppState(s => ({ ...s, selectedQuestionId: question.id }));
    };

    return (
      <div key={question.id} className={`sq-item ${isOpen ? 'open' : ''} ${depth ? 'sq-item--child' : ''} depth-${depth}`}>
        <button className="sq-item-head" onClick={handleToggle}>
          <span className={`sq-radio sq-radio--${status}`} aria-hidden="true">
            {status === 'complete' && (
              <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
                <path d="M6.5 11.2L3.3 8l1.1-1.1 2.1 2.1 5.1-5.1L12.7 5 6.5 11.2z" fill="currentColor"/>
              </svg>
            )}
            {status === 'partial' && (
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <rect x="4" y="9" width="12" height="2" fill="currentColor" rx="1" />
              </svg>
            )}
          </span>
          <span className="sq-text">{question.question}</span>
          <span className={`sq-chevron ${isOpen ? 'up' : 'down'}`} aria-hidden="true">▾</span>
        </button>

        {isOpen && (
          <>
            <AnswerUI q={question} />
            {children.length > 0 && (
              <div className="sq-children">
                {children.map(child => renderQuestionNode(child, depth + 1))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderers = {
    button: (q) => {
      const current = getCurrentAnswer(q.id);
      const opts = visibleAnswers(q);
      const cols = Math.min(opts.length, 4);
      return (
        <div className="sq-answers" style={{ '--cols': cols }}>
          {opts.map(([id, a]) => {
            const isActive = current && Number(current.answerId) === Number(id);
            return (
              <button
                key={id}
                style={{
                  borderColor: isActive ? a.color : '#2d6f74',
                  borderWidth: isActive ? '5px' : '2px',
                }}
                className={`sq-pill ${isActive ? 'active' : ''}`}
                onClick={() => setCurrentValue(q.id, Number(id), a.answer)}
              >
                <span className="dot" style={{ background: a.color }} />
                {String(a.answer)}
              </button>
            );
          })}
        </div>
      );
    },

    radiobutton: (q) => {
      const current = getCurrentAnswer(q.id);
      return (
        <div className="sq-radio-group">
          {visibleAnswers(q).map(([id, a]) => (
            <label key={id} className="sq-radio-option">
              <input
                type="radio"
                name={`q-${q.id}`}
                checked={current ? Number(current.answerId) === Number(id) : false}
                onChange={() => setCurrentValue(q.id, Number(id), a.answer)}
              />
              <span>{String(a.answer)}</span>
            </label>
          ))}
        </div>
      );
    },

    dropdown: (q) => {
      const current = getCurrentAnswer(q.id);
      const value = current ? String(current.answerId) : '';

      return (
        <div className="sq-dropdown-wrap">
          <select
            className="sq-select"
            value={value}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId === '') return;
              const ans = q.answers[selectedId];
              if (ans) setCurrentValue(q.id, Number(selectedId), ans.answer);
            }}
          >
            <option value="">Select</option>
            {visibleAnswers(q).map(([id, a]) => (
              <option key={id} value={id} style={{color: a.color}}>
                ● {String(a.answer)}
              </option>
            ))}
          </select>
        </div>
      );
    },

    input: (q) => {
      const current = getCurrentAnswer(q.id);
      const val = current?.answer ?? '';
      return (
        <div className="sq-input-wrap">
          <input
            className="sq-input"
            type={q.dataType}
            placeholder={val}
            defaultValue={val}
            onBlur={(e) => setCurrentValue(q.id, 0, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setCurrentValue(q.id, 0, e.currentTarget.value);
            }}
          />
        </div>
      );
    },
  };

  const AnswerUI = ({ q }) => {
    const render = renderers[q.componentType];
    return render ? render(q) : null;
  };

  const toggleLearningMaterial = () => {
    setShowLearningMaterial((prev) => !prev);
  };

  // MEMOIZATION
  const parents = useMemo(
    () =>
    mapObjectArray(
      currentProject?.surveyQuestions || {},
      ([id, q]) => ({ id: Number(id), ...q })
    )
      .filter((q) => (q.parentQuestionId ?? -1) < 0 && !q.hideQuestion)
      .sort(
        (a, b) =>
        (a.cardOrder ?? Number.POSITIVE_INFINITY) -
          (b.cardOrder ?? Number.POSITIVE_INFINITY)
      ),
    [currentProject?.surveyQuestions]
  );

  const { validatedCount, totalTop } = useMemo(() => {
    const total = parents.length;
    let validated = 0;
    for (const p of parents) {
      if (getQuestionStatus(p.id) === 'complete') validated++;
    }
    return { validatedCount: validated, totalTop: total };
  }, [parents, currentProject?.surveyQuestions, userSamples]);

  
  return (
    <SidebarCard
      title={
        <>
          SURVEY{" "}
          <span className="sq-subtitle">
            {`${validatedCount}/${totalTop} questions answered`}
          </span>
        </>
      }
      infoText="View and answer survey questions for this plot"
    >
      {currentPlot?.flagged ? (
        <>
          <h2 style={{ color: "red" }}>
            This plot has been flagged, unflag it to collect data.
          </h2>
          <div className="sq-textarea-wrap">
            <label className="sq-textarea-label">Flagged Reason (optional):</label>
            <textarea
              className="sq-textarea"
              value={currentPlot?.flaggedReason || ""}
              onChange={(e) =>
                setAppState((s) => ({
                  ...s,
                  currentPlot: {
                    ...s.currentPlot,
                    flaggedReason: e.target.value,
                  },
                }))
              }
            />
          </div>
        </>
      ) : (
        <div className="sq-list">
          {parents.map((q) => renderQuestionNode(q, 0))}
          <ConfidenceItem
            isOpen={openTopId === "confidence"}
            onToggle={() =>
              setOpenTopId((prev) => (prev === "confidence" ? null : "confidence"))
            }
          />
        </div>
      )}
      {showLearningMaterial && (
        <LearningMaterialModal
          learningMaterial={currentProject?.learningMaterial}
          onClose={toggleLearningMaterial}
        />
      )}
    </SidebarCard>
  );
};


const ConfidenceItem = ({ isOpen, onToggle }) => {
  const { currentProject, currentPlot } = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);
  const [confidenceStatus, setConfidenceStatus] = useState('none');

  if (!currentProject?.projectOptions?.collectConfidence) return null;

  const calculateConfidenceStatus = () => {
    const { confidence, confidenceComment } = currentPlot;
    if(confidence && confidenceComment) {
      setConfidenceStatus('complete');
    } else if(!confidence && !confidenceComment) {
      setConfidenceStatus('none');
    } else {
      setConfidenceStatus('partial');
    }
  }

  useEffect(() => {
    calculateConfidenceStatus();
  }, [currentPlot?.confidence, currentPlot?.confidenceComment]);
  
  return (
    <div className={`sq-item ${isOpen ? 'open' : ''}`}>
      <button className="sq-item-head" onClick={onToggle}>
        <span className={`sq-radio sq-radio--${confidenceStatus}`} aria-hidden="true" >
          {confidenceStatus === 'complete' && (
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path d="M6.5 11.2L3.3 8l1.1-1.1 2.1 2.1 5.1-5.1L12.7 5 6.5 11.2z" fill="currentColor"/>
            </svg>
          )}
          {confidenceStatus === 'partial' && (
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <rect x="4" y="9" width="12" height="2" fill="currentColor" rx="1" />
            </svg>
            )}
        </span>
        <span className="sq-text">Plot Confidence</span>
        <span className={`sq-chevron ${isOpen ? 'up' : 'down'}`} aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="sq-confidence">
          <label className="sq-range-label">
            Plot Confidence: {currentPlot?.confidence || 0}
          </label>

          <div className="sq-range-wrap">
            <input
              className="sq-range"
              type="range"
              min="0"
              max="100"
              step="1"
              value={currentPlot?.confidence || 0}
              onChange={(e) =>
                setAppState((s) => ({
                  ...s,
                  currentPlot: {
                    ...s.currentPlot,
                    confidence: parseInt(e.target.value, 10),
                  },
                }))
              }
            />
          </div>

          <div className="sq-textarea-wrap">
            <label className="sq-textarea-label">Comment on the confidence (optional):</label>
            <textarea
              className="sq-textarea"
              value={currentPlot?.confidenceComment || ''}
              onChange={(e) =>
                setAppState((s) => ({
                  ...s,
                  currentPlot: {
                    ...s.currentPlot,
                    confidenceComment: e.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const DrawingTool = () => {
  const { currentProject, currentPlot, mapConfig, answerMode } = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);

  const sg = currentProject?.sampleGeometries || {
    points: true,
    lines: true,
    polygons: true,
  };
  const initialDrawTool = sg.polygons ? "Polygon" : sg.lines ? "LineString" : "Point";
  const [drawTool, setDrawToolState] = useState(initialDrawTool);

  const setAnswerMode = (newMode, tool) => {
    setAppState((s) => ({ ...s, answerMode: newMode }));
    if (newMode === "draw") {
      featuresToDrawLayer(tool || drawTool);
    } else {
      featuresToSampleLayer();
    }
  };

  const featuresToDrawLayer = (tool) => {
    const type = currentProject.type;
    const samples = currentPlot?.samples || [];
    const visibleSamples =
          type === "simplified" ? samples.filter((s) => s.visibleId !== 1) : samples;

    mercator.disableDrawing(mapConfig);
    mercator.removeLayerById(mapConfig, "currentSamples");
    mercator.removeLayerById(mapConfig, "drawLayer");

    mercator.addVectorLayer(
      mapConfig,
      "drawLayer",
      mercator.samplesToVectorSource(visibleSamples),
      mercator.ceoMapStyles("draw", "orange"),
      9999
    );

    mercator.enableDrawing(mapConfig, "drawLayer", tool);
  };

  const featuresToSampleLayer = () => {
    mercator.disableDrawing(mapConfig);
    const allFeatures = mercator.getAllFeatures(mapConfig, "drawLayer") || [];
    const existingIds = allFeatures
          .map((f) => f.get("sampleId"))
          .filter((id) => id);

    const getMax = (arr) => Math.max(0, ...existingIds, ...arr.map((s) => s.id));

    const newSamples = allFeatures.reduce((acc, cur) => {
      const nextId = cur.get("sampleId") || getMax(acc) + 1;
      return [
        ...acc,
        {
          id: nextId,
          visibleId: cur.get("visibleId"),
          sampleGeom: mercator.geometryToGeoJSON(
            cur.getGeometry(),
            "EPSG:4326",
            "EPSG:3857"
          ),
        },
      ];
    }, []);

    setAppState((prev) => ({
      ...prev,
      currentPlot: { ...prev.currentPlot, samples: newSamples },
      userSamples: newSamples.reduce(
        (acc, cur) => ({ ...acc, [cur.id]: prev.userSamples?.[cur.id] || {} }),
        {}
      ),
      userImages: newSamples.reduce(
        (acc, cur) => ({ ...acc, [cur.id]: prev.userImages?.[cur.id] || {} }),
        {}
      ),
    }));
  };

  // enter draw mode on mount
  useEffect(() => {
    setAnswerMode("draw", initialDrawTool);
    return () => setAnswerMode("answer");
  }, [mapConfig]);

  const buttonStyle = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    marginRight: "10px",
    borderRadius: "6px",
    border: `2px solid ${active ? "#2d6f74" : "#c9d6d6"}`,
    background: active ? "#e6f4f4" : "#fff",
    color: "#2d6f74",
  });

  const setDrawTool = (type) => {
    setDrawToolState(type);
    setAnswerMode("draw", type);
  };

  const clearAll = (tool = drawTool) => {
    if (answerMode === "draw" && window.confirm("Do you want to clear all samples from the draw area?")) {
      mercator.disableDrawing(mapConfig);
      mercator.removeLayerById(mapConfig, "currentSamples");
      mercator.removeLayerById(mapConfig, "drawLayer");

      // re-add an empty draw layer and re-enable drawing
      mercator.addVectorLayer(
        mapConfig,
        "drawLayer",
        null,
        mercator.ceoMapStyles("draw", "orange"),
        9999
      );
      mercator.enableDrawing(mapConfig, "drawLayer", tool);
    } else if (window.confirm("Do you want to clear all answers?")) {
      if (typeof resetPlotValues === "function") {
        resetPlotValues();
      } else {
        // fallback: clear in-app answers if no handler provided
        setAppState((s) => ({
          ...s,
          userSamples: {},
          userImages: {},
        }));
      }
    }
  };

  const RenderDrawTool = ({ icon, title, type }) => (
    <div
      onClick={() => setDrawTool(type)}
      style={{
        alignItems: "center",
        cursor: "pointer",
        display: "flex",
        padding: "8px 0",
      }}
      title={title}
    >
      <span style={buttonStyle(drawTool === type)}>
        <SvgIcon icon={icon} size="2rem" />
      </span>
      {`${type} tool`}
    </div>
  );

  const RenderDrawTools = () => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {sg.points && (
        <RenderDrawTool
          icon="point"
          title="Click anywhere to add a new point."
          type="Point"
        />
      )}
      {sg.lines && (
        <RenderDrawTool
          icon="lineString"
          title={
            "Click anywhere to start drawing.\n" +
              "A new point along the line string can be added with a single click.\n" +
              "Right click or double click to finish drawing.\n"
          }
          type="LineString"
        />
      )}
      {sg.polygons && (
        <RenderDrawTool
          icon="polygon"
          title={
            "Click anywhere to start drawing.\n" +
              "A new vertex can be added with a single click.\n" +
              "Right click, double click, or complete the polygon to finish drawing.\n"
          }
          type="Polygon"
        />
      )}
      <ul style={{ textAlign: "left", marginTop: "8px" }}>
        How To:
        <li>To modify an existing feature, hold Ctrl and click to drag</li>
        <li>To delete a feature, hold Ctrl and right click on it</li>
        <li>To save changes, click “Save to samples” below</li>
      </ul>
    </div>
  );

  return (
    <SidebarCard
      title="Sample Drawing Tool"
      collapsible
      defaultOpen={true}
      infoText="Draw or edit samples directly on the map"
    >
      <div className="sq-draw-body">
        <RenderDrawTools />
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            className="btn btn-outline-lightgreen"
            onClick={featuresToSampleLayer}
            title="Save drawn features back to sample list"
          >
            Save samples
          </button>
          <button
            className="btn btn-outline-lightgreen"
            onClick={() => clearAll()}
            title="Exit draw mode and return to answering"
          >
            Discard samples
          </button>
        </div>
      </div>
    </SidebarCard>
  );
};
