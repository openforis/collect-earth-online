import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import _ from "lodash";
import { stateAtom } from '../utils/constants';
import { previewSelectedSampleIdAtom, previewUserSamplesAtom } from '../state/projectWizard';
import { mercator } from '../utils/mercator';
import { SidebarCard } from "./Sidebar";
import SvgIcon from "./svg/SvgIcon";
import {
  lengthObject,
  filterObject,
  mapObjectArray,
  intersection,
} from '../utils/sequence';

import '../../css/sidebar.css';
import '../../css/survey.css';


export function SurveyQuestions ({
  preview = false,
  surveyQuestions = null,
  showHeader
}) {
  const {
    currentProject,
    currentPlot,
    mapConfig,
    selectedQuestionId,
    selectedSampleId: globalSelectedId,
    userSamples: globalUserSamples,
    selectedSampleIds
  } = useAtomValue(stateAtom);
  const setAppState = useSetAtom(stateAtom);

  // PREVIEW STATE HOOKS
  const [previewUserSamples, setPreviewUserSamples] = useAtom(previewUserSamplesAtom);
  const previewSelectedId = useAtomValue(previewSelectedSampleIdAtom);

  // SWITCH DATA SOURCES BASED ON PREVIEW FLAG
  const surveyData = useMemo(() => {
    return preview ? surveyQuestions : currentProject?.surveyQuestions;
  }, [preview, surveyQuestions, currentProject?.surveyQuestions]);
  const userSamples = preview
        ? previewUserSamples
        : globalUserSamples;
  const selectedSampleId = preview
        ? previewSelectedId
        : globalSelectedId;
  const [openTopId, setOpenTopId] = useState(1);
  // Children are expanded by default once visible (parent answered);
  // this only tracks the ones the user collapsed.
  const [collapsedChildIds, setCollapsedChildIds] = useState({});
  const [scrollToChildrenOf, setScrollToChildrenOf] = useState(null);
  // note on where the last answer went
  const [answerNotice, setAnswerNotice] = useState(null);
  const childrenRefs = useRef({});

  const entries = (obj = {}) => Object.entries(obj || {});
  const visibleAnswers = (q) => entries(q.answers).filter(([, a]) => !a?.hide);


  useEffect(() => {
    setCollapsedChildIds({});
  }, [currentPlot?.id]);

  useEffect(() => {
    setAnswerNotice(null);
  }, [selectedSampleIds, currentPlot?.id]);

  useEffect(() => {
    if (scrollToChildrenOf == null) return;
    childrenRefs.current[scrollToChildrenOf]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    setScrollToChildrenOf(null);
  }, [scrollToChildrenOf]);

  /*
  function getParent (questionId) {
    let {parentQuestionId} = surveyData?.[questionId];
    if ([-1, "-1"].includes(parentQuestionId)) {
      return questionId;
    } else {
      return getParent(parentQuestionId);
    }
  }
  */
  /*
  const getSelectedSampleIds = (questionId = selectedQuestionId) => 
        !selectedQuestionId ? [] :
    selectedSampleIds[getParent(selectedQuestionId)] || [];
*/
  // sample answers with questionId set and clearedIds removed
  const answerSample = (answers, questionId, answerId, answerText, clearedIds) => ({
    ...filterObject(answers || {}, ([key]) => !clearedIds.includes(Number(key))),
    [questionId]: answerText === "" ? { answerId } : { answerId, answer: answerText },
  });

  // imagery recorded with an answer
  const answerImagery = (state) => ({
    id: state.currentImagery.id,
    attributes: state.currentImagery?.sourceConfig?.type === "PlanetDaily"
      ? {
        ...state.imageryAttributes,
        imageryDatePlanetDaily: mercator.getTopVisiblePlanetLayerDate(
          state.mapConfig,
          state.currentImagery.id
        ),
      }
      : state.imageryAttributes,
  });

  // sampleIds from resolveTargetSampleIds
  const setCurrentValue = (questionId, answerId, answerText, sampleIds) => {
    if (answerText == null || sampleIds.length === 0) return;

    const clearedIds = getChildQuestionIds(questionId);
    const answered = (allAnswers) => Object.fromEntries(
      sampleIds.map((sampleId) => [
        sampleId,
        answerSample(allAnswers?.[sampleId], questionId, answerId, answerText, clearedIds),
      ])
    );

    if (preview) {
      setPreviewUserSamples((prev) => ({ ...prev, ...answered(prev) }));
    } else {
      setAppState((prev) => ({
        ...prev,
        // select the answered question so the map recolors by it
        selectedQuestionId: questionId,
        userSamples: { ...(prev.userSamples || {}), ...answered(prev.userSamples) },
        userImages: {
          ...(prev.userImages || {}),
          ...Object.fromEntries(sampleIds.map((sampleId) => [sampleId, answerImagery(prev)])),
        },
      }));
    }

    syncOpenChildren(questionId, answerId, answerText);
  };

  const getOpenChildren = (questionId, answerId, answerText) => {
    const parent = surveyData?.[questionId];
    if (!parent) return [];

    return childrenOf(questionId, surveyData).filter((child) => {
      if (parent.componentType === 'input') {
        return String(answerText ?? '').length > 0;
      }
      const allowed = Array.isArray(child.parentAnswerIds) ? child.parentAnswerIds : [];
      return allowed.length === 0 || allowed.includes(Number(answerId));
    });
  };

  const getDescendantIds = (questionId) =>
        childrenOf(questionId, surveyData).reduce(
          (acc, child) => [...acc, child.id, ...getDescendantIds(child.id)],
          []
        );

  const syncOpenChildren = (questionId, answerId, answerText) => {
    if (answerText == null) return;

    const descendants = getDescendantIds(questionId);
    setCollapsedChildIds((prev) => _.omit(prev, descendants));

    if (getOpenChildren(questionId, answerId, answerText).length > 0) {
      setScrollToChildrenOf(questionId);
    }
  };

  const plotSampleIds = () => (currentPlot?.samples || []).map((s) => Number(s.id));

  // selected samples in the current plot
  const selectedInPlot = () => {
    const inPlot = new Set(plotSampleIds());
    return (Array.isArray(selectedSampleIds) ? selectedSampleIds : [])
      .map(Number)
      .filter((id) => inPlot.has(id));
  };

  // preview sample, map selection, or whole plot if nothing is selected
  const relevantSampleIds = () => {
    if (preview) return selectedSampleId != null ? [Number(selectedSampleId)] : [];
    const selected = selectedInPlot();
    return selected.length > 0 ? selected : plotSampleIds();
  };

  // is sample elegible to answer the question
  const isSampleEligible = (questionId, sampleId) => {
    const q = surveyData?.[questionId];
    if (!q) return false;
    const pid = q.parentQuestionId;
    if (pid == null || Number(pid) < 0) return true;

    const parentId = Number(pid);
    const parent = surveyData?.[parentId];
    const parentAns = userSamples?.[sampleId]?.[parentId];
    if (!parent || !parentAns || !isSampleEligible(parentId, sampleId)) return false;

    if (parent.componentType === 'input') {
      return String(parentAns.answer ?? '').length > 0;
    }

    const allowed = Array.isArray(q.parentAnswerIds) ? q.parentAnswerIds : [];
    return allowed.length === 0 || allowed.includes(Number(parentAns.answerId));
  };

  // visible if any of the samples can answer it
  const isChildVisible = (child, sampleIds = relevantSampleIds()) =>
        sampleIds.some((sampleId) => isSampleEligible(child.id, sampleId));

  const showSelectionError = (alertMessage) =>
        setAppState((s) => ({ ...s, modal: { alert: { alertType: "Selection Error", alertMessage } } }));

  // samples an answer goes to: { sampleIds } or { error }
  const resolveTargetSampleIds = (questionId) => {
    if (preview) return { sampleIds: [selectedSampleId] };

    const question = surveyData?.[questionId];
    const parent = surveyData?.[question?.parentQuestionId];
    const noneSelected = selectedInPlot().length === 0;
    const pool = relevantSampleIds();
    const eligible = pool.filter((sampleId) => isSampleEligible(questionId, sampleId));
    const targets = noneSelected && pool.length > 1
      ? eligible.filter((sampleId) => !isSampleAnswered(questionId, getAnswerForSample(questionId, sampleId)))
      : eligible;

    if (pool.length === 0) {
      return { error: "There are no samples in this plot to answer." };
    }
    if (eligible.length === 0) {
      const where = noneSelected ? "samples in this plot" : "selected samples";
      return {
        error: `None of the ${where} have the question "${question?.question}".`
          + (parent ? ` It only applies to samples with a matching answer to "${parent.question}".` : ""),
      };
    }
    if (targets.length === 0) {
      return {
        error: `All samples with the question "${question?.question}" already have an answer.`
          + " Select the samples you want to change.",
      };
    }
    return { sampleIds: targets };
  };

  // "N of M selected" badge when only some samples have the question
  const selectionScope = (questionId) => {
    if (preview) return null;
    const pool = relevantSampleIds();
    if (pool.length === 0) return null;
    const eligible = pool.filter((sampleId) => isSampleEligible(questionId, sampleId)).length;
    if (eligible === pool.length) return null;
    return `${eligible} of ${pool.length} ${selectedInPlot().length > 0 ? "selected" : "samples"}`;
  };

  // note text for where an answer went, null if nothing to say
  const describeWhereApplied = (questionId, targetCount) => {
    if (preview || plotSampleIds().length <= 1) return null;

    const pool = relevantSampleIds();
    const poolCount = pool.length;
    const skipped = poolCount - targetCount;

    if (selectedInPlot().length > 0) {
      return skipped > 0
        ? `Applied to ${targetCount} of ${poolCount} selected samples. `
          + `${skipped} ${skipped === 1 ? "doesn't" : "don't"} have this question.`
        : null;
    }

    const prefix = "No samples were selected, so this was applied to";
    const eligibleCount = pool.filter((sampleId) => isSampleEligible(questionId, sampleId)).length;
    if (targetCount === poolCount) return `${prefix} all ${poolCount} samples.`;
    if (targetCount === eligibleCount) {
      return `${prefix} the ${targetCount} of ${poolCount} samples that have this question.`;
    }
    // some samples already had an answer
    const which = targetCount === 1 ? "1 sample" : `${targetCount} samples`;
    const condition = eligibleCount < poolCount
      ? `that ${targetCount === 1 ? "has" : "have"} this question and no answer yet`
      : "with no answer yet";
    return `${prefix} the ${which} ${condition}. Select samples to change existing answers.`;
  };

  const childrenOf = (parentId, data) =>
        mapObjectArray(
          data || {},
          ([id, q]) => ({ id: Number(id), ...q })
        )
        .filter(q => q.parentQuestionId === parentId && !q.hideQuestion)
        .sort((a, b) => (a.cardOrder ?? 1e9) - (b.cardOrder ?? 1e9));

  const getAnswerForSample = (qId, sampleId) => {
    const us = userSamples?.[sampleId]?.[qId];
    return us ? { answerId: Number(us.answerId), answer: us.answer } : null;
  };

  // every sample's answer to a question
  const sampleAnswers = (questionId) =>
        Object.entries(userSamples || {})
        .filter(([, answers]) => answers?.[questionId])
        .map(([sampleId, answers]) => ({
          sampleId: Number(sampleId),
          answerId: Number(answers[questionId].answerId),
          answerText: answers[questionId].answer,
        }));

  const isSampleAnswered = (qId, ansObj) => {
    if (!ansObj) return false;
    const q = currentProject?.surveyQuestions?.[qId];
    if (!q) return false;
    if (q.componentType === 'input') {
      const val = q.dataType === 'number'
            ? (ansObj.answer ?? '').toString().trim()
            : (ansObj.answer ?? '').toString().trim();
      if (q.dataType === 'number') return val !== '' && !Number.isNaN(Number(val));
      return val.length > 0;
    }
    return ansObj.answerId !== null && ansObj.answerId !== undefined;
  };

  const getQuestionStatusShallow = (questionId) => {
    const qLive = currentProject?.surveyQuestions?.[questionId];
    const visibleArr = Array.isArray(qLive?.visible) ? qLive.visible : [];
    if (visibleArr.length === 0) return 'none';
    const visibleIds = visibleArr.map(v => Number(v.id));

    const answeredCount = visibleIds
          .filter((sid) => isSampleAnswered(questionId, getAnswerForSample(questionId, sid)))
          .length;
    if (answeredCount === 0) return 'none';
    if (answeredCount === visibleIds.length) return 'complete';
    return 'partial';
  };

  //Check if the answer has been fully answered for all samples to determine its status
  const getQuestionStatus = (questionId) => {
    const base = getQuestionStatusShallow(questionId);

    // if this question itself has no answers yet, it's 'none' regardless of children
    if (base === 'none') return 'none';

    // status is plot-wide, not selection-based
    const statusSampleIds = preview ? relevantSampleIds() : plotSampleIds();
    const children = childrenOf(questionId, surveyData)
          .filter((child) => isChildVisible(child, statusSampleIds));
    if (children.length === 0) return base;
    const childStatuses = children.map(child => getQuestionStatus(child.id));
    // complete only if this question AND all visible descendants are complete
    if (base === 'complete' && childStatuses.every(s => s === 'complete')) {
      return 'complete';
    }
    return 'partial';
  };

  // answer shared by all relevant eligible samples, else null
  const getCurrentAnswer = (questionId) => {
    const sampleIds = relevantSampleIds()
          .filter((sampleId) => isSampleEligible(questionId, sampleId));
    const answers = sampleIds.map((sampleId) => userSamples?.[sampleId]?.[questionId]);
    const [first] = answers;
    if (!first) return null;

    const allSame = answers.every((a) =>
      a
        && Number(a.answerId) === Number(first.answerId)
        && (a.answer ?? '') === (first.answer ?? ''));
    return allSame ? { answerId: Number(first.answerId), answer: first.answer } : null;
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
  const renderQuestionNode = (question, depth = 0, parentId = null) => {
    const isOpen =
          depth === 0
          ? openTopId === question.id
          : !collapsedChildIds[question.id];

    const children = childrenOf(question.id, surveyData).filter((child) => isChildVisible(child));
    const status = getQuestionStatus(question.id);
    const scope = selectionScope(question.id);

    const handleToggle = () => {
      
      if (depth === 0) {
        setOpenTopId(prev => (prev === question.id ? null : question.id));
      } else {
        setCollapsedChildIds(prev => ({ ...prev, [question.id]: !prev[question.id] }));
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
          <span className="sq-text">{question.question}{question.required && (
            <span style={{ color: 'red' }}>*</span>)}</span>
          {scope && (
            <span className="sq-scope" title="Answers skip samples that don't have this question">
              {scope}
            </span>
          )}
          <SvgIcon icon={isOpen ? "upCaret" : "downCaret"} size="1rem" />
        </button>

        {isOpen && (
          <>
            <AnswerUI q={question} />
            {answerNotice?.questionId === question.id && (
              <div className="sq-notice" role="status">{answerNotice.text}</div>
            )}
            {children.length > 0 && (
              <div
                className="sq-children"
                ref={(el) => { childrenRefs.current[question.id] = el; }}
              >
                {children.map(child => renderQuestionNode(child, depth + 1, question.id))}
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
      return (
        <div className="sq-answers">
          {opts.map(([id, a]) => {
            const isActive = current && Number(current.answerId) === Number(id);
            return (
              <button
                key={id}
                style={{
                  borderColor: isActive ? a.color : '#3d7f7a',
                  borderWidth: '2px',
                  boxShadow: isActive ? `0 0 0 2px ${a.color}` : 'none',
                  fontWeight: isActive ? 'bold' : 'normal'
                }}
                className={`sq-pill ${isActive ? 'active' : ''}`}
                onClick={() => validateAndSetCurrentValue(q.id, Number(id), a.answer, q)}
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
                onChange={() => validateAndSetCurrentValue(q.id, Number(id), a.answer, q)}
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
              if (ans) validateAndSetCurrentValue(q.id, Number(selectedId), ans.answer, q);
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
      // only write edited text, a bare blur would overwrite the targets
      const submit = (value) => {
        if (value !== String(val)) validateAndSetCurrentValue(q.id, 0, value, q);
      };
      return (
        <div className="sq-input-wrap">
          <input
            className="sq-input"
            type={q.dataType}
            placeholder={val || q.questionLabel}
            defaultValue={val}
            onBlur={(e) => submit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit(e.currentTarget.value);
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

  // MEMOIZATION
  const parents = useMemo(() => {
    return Object.entries(surveyData)
      .map(([id, q]) => ({ id: Number(id), ...q }))
      .filter(q => (q.parentQuestionId === -1 || q.parentQuestionId === "-1") && !q.hideQuestion)
      .sort((a, b) => (a.cardOrder ?? 1e9) - (b.cardOrder ?? 1e9));
  }, [surveyData]);

  const { validatedCount, totalTop } = useMemo(() => ({
    validatedCount: parents.filter((p) => getQuestionStatus(p.id) === 'complete').length,
    totalTop: parents.length,
  }), [parents, currentProject?.surveyQuestions, userSamples, currentPlot?.samples, selectedSampleId]);


  // SURVEY RULES
  const getSurveyQuestionText = (questionId) => {
    const { surveyQuestions } = currentProject;
    const visibleSurveyQuestions = filterObject(surveyQuestions, ([_id, val]) => val.hideQuestion != true);
    return _.get(visibleSurveyQuestions, [questionId, "question"], "");
  };

  const getSurveyAnswerText = (questionId, answerId) => {
    const { surveyQuestions } = currentProject;
    return _.get(surveyQuestions, [questionId, "answers", answerId, "answer"], "");
  };

  const checkRuleTextMatch = (surveyRule, questionIdToSet, _answerId, answerText) => {
    if (surveyRule.questionId === questionIdToSet && !RegExp(surveyRule.regex).test(answerText)) {
      return `Text match validation failed.\r\n\nPlease enter an answer that matches the expression: ${surveyRule.regex}`;
    } else {
      return null;
    }
  };

  const checkRuleNumericRange = (surveyRule, questionIdToSet, _answerId, answerText) => {
    if (
      surveyRule.questionId === questionIdToSet &&
        (answerText < surveyRule.min || answerText > surveyRule.max)
    ) {
      return `Numeric range validation failed.\r\n\n Please select a value between ${surveyRule.min} and ${surveyRule.max}`;
    } else {
      return null;
    }
  };

  const sumAnsweredQuestionsPerSample = (answeredQuestions, sampleId) =>
        Object.entries(answeredQuestions).reduce((acc, [qId, aq]) => {
          const answer = userSamples?.[sampleId]?.[qId];
          const answeredVal = Number(answer?.answer || aq.answers?.[answer?.answerId]?.answer || 0);
          return acc + answeredVal;
        }, 0);

  const getAnsweredQuestions = (ruleQuestions, questionIdToSet) =>
        filterObject(currentProject?.surveyQuestions, ([sqId]) => {
          const numSqId = Number(sqId);
          return (
            ruleQuestions.includes(numSqId)
              && sampleAnswers(numSqId).length > 0
              && numSqId !== questionIdToSet
          );
        });

  const getAnsweredSampleIds = (answeredQuestions) =>
        mapObjectArray(answeredQuestions, ([sqId]) => sampleAnswers(Number(sqId)).map((a) => a.sampleId));

  const checkRuleSumOfAnswers = (surveyRule, questionIdToSet, answerId, answerText, targetSampleIds) => {
    const answerVal = !isNaN(Number(answerText)) ?
          Number(answerText) : Number(getSurveyAnswerText(questionIdToSet, answerId));
    if (surveyRule.questionIds.includes(questionIdToSet)) {
      const answeredQuestions = getAnsweredQuestions(surveyRule.questionIds, questionIdToSet);
      if (surveyRule.questionIds.length === lengthObject(answeredQuestions) + 1) {
        const sampleIds = targetSampleIds;
        // const sampleIds = getSelectedSampleIds(questionIdToSet);
        const answeredSampleIds = getAnsweredSampleIds(answeredQuestions);
        const commonSampleIds = answeredSampleIds.reduce(intersection, sampleIds);
        if (commonSampleIds.length > 0) {
          const invalidSum = commonSampleIds
                .map((sampleId) => sumAnsweredQuestionsPerSample(answeredQuestions, sampleId))
                .find((s) => s + answerVal !== surveyRule.validSum);
          if (invalidSum || invalidSum === 0) {
            const { question } = currentProject?.surveyQuestions[questionIdToSet];
            return `Sum of answers validation failed.\r\n\nSum for questions [${surveyRule.questionIds
              .map((q) => getSurveyQuestionText(q))
              .toString()}] must be ${surveyRule.validSum.toString()}.\r\n\nAn acceptable answer for "${question}" is ${(
                surveyRule.validSum - invalidSum
              ).toString()}.`;
          } else {
            return null;
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  const checkRuleMatchingSums = (surveyRule, questionIdToSet, answerId, answerText, targetSampleIds) => {
    const answerVal =
          Number(answerText) || Number(getSurveyAnswerText(questionIdToSet, answerId));
    if (surveyRule.questionIds1.concat(surveyRule.questionIds2).includes(questionIdToSet)) {
      const answeredQuestions1 = getAnsweredQuestions(
        surveyRule.questionIds1,
        questionIdToSet
      );
      const answeredQuestions2 = getAnsweredQuestions(
        surveyRule.questionIds2,
        questionIdToSet
      );
      const ansLen1 = lengthObject(answeredQuestions1);
      const ansLen2 = lengthObject(answeredQuestions2);
      const ruleLen1 = lengthObject(surveyRule.questionIds1);
      const ruleLen2 = lengthObject(surveyRule.questionIds2);
      const ready = (al1, rl1, al2, rl2) => al1 > 1 && rl1 === al1 && rl2 === al2 + 1;
      if (
        ready(ansLen1, ruleLen1, ansLen2, ruleLen2) ||
          ready(ansLen2, ruleLen2, ansLen1, ruleLen1)
      ) {
        const sampleIds = targetSampleIds;
        // const sampleIds = getSelectedSampleIds(questionIdToSet);
        const answeredSampleIds1 = getAnsweredSampleIds(answeredQuestions1);
        const commonSampleIds1 = answeredSampleIds1.reduce(intersection, sampleIds);
        const answeredSampleIds2 = getAnsweredSampleIds(answeredQuestions2);
        const commonSampleIds2 = answeredSampleIds2.reduce(intersection, sampleIds);
        const commonSampleIds = intersection(commonSampleIds1, commonSampleIds2);
        if (commonSampleIds.length > 0) {
          const q1Value = surveyRule.questionIds1.includes(questionIdToSet) ? answerVal : 0;
          const q2Value = surveyRule.questionIds2.includes(questionIdToSet) ? answerVal : 0;
          const invalidSum = commonSampleIds
                .map((sampleId) => {
                  const sum1 = sumAnsweredQuestionsPerSample(answeredQuestions1, sampleId);
                  const sum2 = sumAnsweredQuestionsPerSample(answeredQuestions2, sampleId);
                  return [sum1, sum2];
                })
                .find((sums) => sums[0] + q1Value !== sums[1] + q2Value);
          if (invalidSum) {
            const { question } = currentProject?.surveyQuestions[questionIdToSet];
            return (
              "Matching sums validation failed.\r\n\n" +
                `Totals of the question sets [${surveyRule.questionIds1
                  .map((q) => getSurveyQuestionText(q))
                  .toString()}] and [${surveyRule.questionIds2
                    .map((q) => getSurveyQuestionText(q))
                    .toString()}] do not match.\r\n\n` +
                `An acceptable answer for "${question}" is ${Math.abs(
                  invalidSum[0] - invalidSum[1]
                )}.`
            );
          } else {
            return null;
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  const checkRuleIncompatibleAnswers = (surveyRule, questionIdToSet, answerId, _answerText, targetSampleIds) => {
    if (surveyRule.questionId1 === questionIdToSet && surveyRule.answerId1 === answerId) {
      const ques2Answers = sampleAnswers(surveyRule.questionId2);
      if (ques2Answers.some((ans) => ans.answerId === surveyRule.answerId2)) {
        const ques1Ids = targetSampleIds;
        // const ques1Ids = getSelectedSampleIds(questionIdToSet);
        const ques2Ids = ques2Answers
              .filter((ans) => ans.answerId === surveyRule.answerId2)
              .map((a) => a.sampleId);
        const commonSampleIds = intersection(ques1Ids, ques2Ids);
        if (commonSampleIds.length > 0) {
          return `Incompatible answers validation failed.\r\n\nAnswer "${getSurveyAnswerText(
            surveyRule.questionId1,
            surveyRule.answerId1
          )}" from question "${getSurveyQuestionText(
            surveyRule.questionId1
          )}" is incompatible with\r\n answer "${getSurveyAnswerText(
            surveyRule.questionId2,
            surveyRule.answerId2
          )}" from question "${getSurveyQuestionText(surveyRule.questionId2)}".\r\n\n`;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else if (surveyRule.questionId2 === questionIdToSet && surveyRule.answerId2 === answerId) {
      const ques1Answers = sampleAnswers(surveyRule.questionId1);
      if (ques1Answers.some((ans) => ans.answerId === surveyRule.answerId1)) {
        const ques2Ids = targetSampleIds;
        // const ques2Ids = getSelectedSampleIds();

        const ques1Ids = ques1Answers
              .filter((ans) => ans.answerId === surveyRule.answerId1)
              .map((a) => a.sampleId);
        const commonSampleIds = intersection(ques1Ids, ques2Ids);
        if (commonSampleIds.length > 0) {
          return `Incompatible answers validation failed.\r\n\nAnswer "${getSurveyAnswerText(
            surveyRule.questionId2,
            surveyRule.answerId2
          )}" from question "${getSurveyQuestionText(
            surveyRule.questionId2
          )}" is incompatible with\r\nanswer "${getSurveyAnswerText(
            surveyRule.questionId1,
            surveyRule.answerId1
          )}" from question "${getSurveyQuestionText(surveyRule.questionId1)}".\r\n\n`;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  const formatErrorText = (answerList) =>
        answerList.map((ans, idx, arr) => `answer "${getSurveyAnswerText(ans[0], ans[1])}" for question "${getSurveyQuestionText(ans[0])}"`);

  const checkRuleMultipleIncompatibleAnswers = (surveyRule, questionIdToSet, answerId, _answerText) => {
    const surveyQuestions = currentProject?.surveyQuestions;
    const { answers, incompatQuestionId, incompatAnswerId } = surveyRule;
    const ruleAnswerList = Object.entries(answers);

    const answeredQuestionsList = ruleAnswerList.filter((answer) =>
      sampleAnswers(Number(answer[0])).some((a) => a.answerId == answer[1]));
    const incompatAnswer = (sampleAnswers(Number(incompatQuestionId)).some((a) => a.answerId == incompatAnswerId) ||
                            (incompatQuestionId == questionIdToSet && incompatAnswerId == answerId));

    if (ruleAnswerList.length === answeredQuestionsList.length && incompatAnswer) {
      const answerText = surveyQuestions[questionIdToSet].answers[answerId].answer;
      const questionText = getSurveyQuestionText(questionIdToSet);
      const answerTextList = formatErrorText(ruleAnswerList);
      return `Answer "${answerText}" for question "${questionText}" is incompatible in case ${answerTextList} are selected.`;
    } else {
      return null;
    }
  };

  // targetSampleIds: samples receiving the answer
  const rulesViolated = (questionIdToSet, answerId, answerText, targetSampleIds) => {
    const ruleFunctions = {
      "text-match": checkRuleTextMatch,
      "numeric-range": checkRuleNumericRange,
      "sum-of-answers": checkRuleSumOfAnswers,
      "matching-sums": checkRuleMatchingSums,
      "incompatible-answers": checkRuleIncompatibleAnswers,
      "multiple-incompatible-answers": checkRuleMultipleIncompatibleAnswers,
    };
    return (
      currentProject?.surveyRules &&
        currentProject?.surveyRules
        .map((surveyRule) =>
          ruleFunctions[surveyRule.ruleType](surveyRule, questionIdToSet, answerId, answerText, targetSampleIds)
        )
        .find((msg) => msg)
    );
  };

  const validateAndSetCurrentValue = (questionIdToSet, answerId, answerText = null, previousAnswer = null) => {
    const { sampleIds, error } = resolveTargetSampleIds(questionIdToSet);
    if (error) return showSelectionError(error);
    const ruleError = rulesViolated(questionIdToSet, answerId, answerText, sampleIds);
    if (ruleError) {
      setCurrentValue(questionIdToSet, answerId, previousAnswer, sampleIds);
      setAppState((s) => ({
        ...s,
        modal: {alert: {alertType: "Collection Error", alertMessage: ruleError}}
      }));
    } else {
      setCurrentValue(questionIdToSet, answerId, answerText, sampleIds);
      if (answerText != null) {
        const text = describeWhereApplied(questionIdToSet, sampleIds.length);
        setAnswerNotice(text ? { questionId: questionIdToSet, text } : null);
      }
    }
  };

  function InvertSelectionButton () {
    const selectedSamples = selectedSampleIds;
    const allIds = (mercator.getAllFeatures(mapConfig, "currentSamples") || []).map(f => f.get("sampleId")) ;
    function invertHandler () {
      const inverted = allIds.reduce((coll, f) => {
        return selectedSamples.includes(f) ? coll :  [... coll, f];
      }, []);

      setAppState((s)=>({...s, selectedSampleIds: inverted}));
      // setAppState((s)=>({...s, selectedSampleIds: {... s.selectedSampleIds, [parentId]: inverted}}));
      mercator.selectFeatures(mapConfig, inverted);
    };
    return (
      <>
        <button
          onClick={invertHandler}
          className={'btn filled'}>
          {
            selectedSampleIds.length === allIds.length ? "Clear Selection"
           : selectedSampleIds.length ? "Invert Sample Selection"
           : "Select All Samples"}
        </button>
      </>);
  }
  
  return (
    <SidebarCard
      showHeader={showHeader}      
      title={
        <>
          SURVEY{" "}
          <span className="sq-subtitle">
            {`${validatedCount}/${totalTop} questions answered`}
          </span>          
        </>
      }
      headerBtn={ !preview && <InvertSelectionButton/> }
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
    const hasConfidence = Number.isInteger(confidence);
    const hasComment = String(confidenceComment ?? '').trim() !== '';
    if(hasConfidence && hasComment) {
      setConfidenceStatus('complete');
    } else if(!hasConfidence && !hasComment) {
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
        <SvgIcon icon={isOpen ? "upCaret" : "downCaret"} size="1rem" />
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
            <label className="sq-textarea-label">
              Comment on the confidence<span style={{ color: 'red' }}>*</span>
            </label>
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
  const isDrawing = answerMode === "draw";

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
      answerMode: 'answer',
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

    if (answerMode === "draw") {
      mercator.disableDrawing(mapConfig);
      mercator.enableDrawing(mapConfig, "drawLayer", type);
    } else {
      // First time entering draw mode: build the layer from saved samples
      setAnswerMode("draw", type);
    }
  };

  const discardDrawnSamples = () => {
    if (!window.confirm("Discard all samples drawn in this session? Samples from the database will be kept.")) return;

    mercator.disableDrawing(mapConfig);
    mercator.removeLayerById(mapConfig, "drawLayer");

    setAppState((prev) => {
      const dbSamples = (prev.currentPlot?.samples || []).filter((s) => s.visibleId != null);
      const keep = new Set(dbSamples.map((s) => s.id));
      const pick = (obj) =>
            Object.fromEntries(Object.entries(obj || {}).filter(([id]) => keep.has(Number(id))));

      return {
        ...prev,
        answerMode: "answer",
        currentPlot: { ...prev.currentPlot, samples: dbSamples },
        userSamples: pick(prev.userSamples),
        userImages: pick(prev.userImages),
      };
    });
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
            className="btn btn-outline-darkgreen"
            onClick={featuresToSampleLayer}
            disabled={!isDrawing}
            title={
              isDrawing
                ? "Save drawn features back to sample list"
                : "Select a drawing tool to enable"
            }
          >
            Save samples
          </button>
          <button
            className="btn btn-outline-darkgreen"
            onClick={discardDrawnSamples}
            disabled={!isDrawing}
            title={
              isDrawing
                ? "Exit draw mode and return to answering"
                : "Select a drawing tool to enable"
            }
          >
            Discard samples
          </button>
        </div>
      </div>
    </SidebarCard>
  );
};
