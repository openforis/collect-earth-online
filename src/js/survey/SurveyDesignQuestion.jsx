import React, { useContext, useState, useEffect } from "react";

import AnswerDesigner from "./AnswerDesigner";
import BulkAddAnswers from "./BulkAddAnswers";
import SurveyRule from "./SurveyRule";
import SvgIcon from "../components/svg/SvgIcon";

import { removeEnumerator } from "../utils/generalUtils";
import {
  mapObjectArray,
  filterObject,
  lengthObject,
  findObject,
  last,
  mapObject
} from "../utils/sequence";
import { ProjectContext } from "../project/constants";
import Modal from "../components/Modal";

export default function SurveyDesignQuestion({ indentLevel, editMode, surveyQuestionId, question }) {
  const { setProjectDetails, surveyQuestions, surveyRules, isProjectAdmin } = useContext(ProjectContext);

  const surveyQuestion = question;
  const parentQuestion = surveyQuestions[surveyQuestion.parentQuestionId];
  const childNodeIds = mapObjectArray(
    filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestionId === surveyQuestionId),
    ([key, _val]) => Number(key)
  );

  const [hideQuestion, setHideQuestion] = useState(surveyQuestions[surveyQuestionId].hideQuestion);
  const [showBulkAdd, setBulkAdd] = useState(false);
  const [newQuestionText, setText] = useState(surveyQuestions[surveyQuestionId].question);
  const [state, setState] = useState({modal: null});
  useEffect(() => {
    setText(surveyQuestions[surveyQuestionId].question);
    setHideQuestion(surveyQuestions[surveyQuestionId].hideQuestion);
  }, [surveyQuestionId, surveyQuestions]);

  const getSameLevelQuestions = () => filterObject(surveyQuestions, ([_id, sq]) =>
    sq.parentQuestionId === surveyQuestion.parentQuestionId);

  const getChildQuestionIds = (questionId) => {
    const childQuestionIds = mapObjectArray(
      filterObject(surveyQuestions, ([_sqId, sq]) => sq.parentQuestionId === questionId),
      ([key, _val]) => Number(key)
    );
    return childQuestionIds.length === 0
      ? [questionId]
      : childQuestionIds.reduce((acc, cur) => [...acc, ...getChildQuestionIds(cur)], [questionId]);
  };

  const maxAnswers = ({ componentType, dataType, answers }) =>
    lengthObject(answers) >=
    ((componentType || "").toLowerCase() === "input"
      ? 1
      : (dataType || "").toLowerCase() === "boolean"
      ? 2
     : 1000);

  const isFirst = (questionId) => parseInt(Object.keys(getSameLevelQuestions())[0]) === questionId;
  const isLast = (questionId) =>  parseInt(last(Object.keys(getSameLevelQuestions()))) === questionId;

  const updateRuleSingleQuestion = (rule, questionId, swappedQuestionId) => {
    const qId = (rule.questionId === questionId) ?
          swappedQuestionId : (rule.questionId === swappedQuestionId) ?
          questionId : rule.questionId;
    return {...rule,
            questionId: qId};
  };

  const updateRuleEnumQuestions = (rule, questionId, swappedQuestionId) => {
    const qId1 = (rule.questionId1 === questionId) ?
          swappedQuestionId : (rule.questionId1 === swappedQuestionId) ?
          questionId : rule.questionId1;
    const qId2 = (rule.questionId2 === questionId) ?
          swappedQuestionId : (rule.questionId2 === swappedQuestionId) ?
          questionId : rule.questionId2;
    return {...rule,
            questionId1: qId1,
            questionId2: qId2};
  };

  const updateRuleListQuestions = (rule, questionId, swappedQuestionId) => {
    const updatedQuestionIds = rule.questionIds.map((qId) => qId === swappedQuestionId ?
                                                    questionId : qId === questionId ?
                                                    swappedQuestionId : qId);
    return {...rule,
            questionIds: updatedQuestionIds};
  };

  const updateRuleEnumListQuestions = (rule, questionId, swappedQuestionId) => {
    const updatedQuestionIds1 = rule.questionIds1.map((qId) => qId === swappedQuestionId ?
                                                      questionId : qId === questionId ?
                                                      swappedQuestionId : qId);
    const updatedQuestionIds2 = rule.questionIds2.map((qId) => qId === swappedQuestionId ?
                                                      questionId : qId === questionId ?
                                                      swappedQuestionId : qId);
    return {...rule,
            questionIds1: updatedQuestionIds1,
            questionIds2: updatedQuestionIds2,};
  };

  const updateRuleMultipleQuestions = (rule, questionId, swappedQuestionId) => {
    const updatedQuestionsMap = mapObject(rule.answers, ([k,v]) =>
      [k === swappedQuestionId ? questionId : k === questionId ? swappedQuestionId : k,
       v]);
    const qId = (rule.incompatQuestionId === questionId) ?
          swappedQuestionId : (rule.incompatQuestionId === swappedQuestionId) ?
          questionId : rule.incompatQuestionId;

    return {...rule,
            answers: updatedQuestionsMap,
            incompatQuestionId: qId};
  };

  const updateRules = (questionId, swappedQuestionId) => {
    const ruleUpdateFunctions = {
      "text-match": updateRuleSingleQuestion,
      "numeric-range": updateRuleSingleQuestion,
      "sum-of-answers": updateRuleListQuestions,
      "matching-sums": updateRuleEnumListQuestions,
      "incompatible-answers": updateRuleEnumQuestions,
      "multiple-incompatible-answers": updateRuleMultipleQuestions,
    };
    const newRules = surveyRules.map((rule) =>
      ruleUpdateFunctions[rule.ruleType](rule, questionId, swappedQuestionId)
    );
    return newRules;
  };

  const updateParentQuestions = (questionId, swappedQuestionId, surveyQuestions) =>{
    const teste = Object.entries(surveyQuestions).reduce((acc, cur) => {
      const [key, val] = cur;
      if(val.parentQuestionId === questionId) {
        return {...acc, [key]: {...val, parentQuestionId: swappedQuestionId}};
      } else if(val.parentQuestionId === swappedQuestionId) {
        return {...acc, [key]: {...val, parentQuestionId: questionId}};
      } else {
        return acc;
      }
    }, {});
    return teste;
  };

  const reorderQuestions = (questionId, direction) => {
    //
    const qId = questionId.toString();
    // get questions that are in the same level as this one as a map.
    const questions = getSameLevelQuestions();
    // create a list of questionIds and retrieve the idx of the one in hand
    const questionsIds = Object.keys(questions);
    const idx = questionsIds.indexOf(qId);
    const questionToBeSwapped = questions[questionId];
    // grab question that will be swapped with this one.
    const swappedQuestionId = questionsIds[idx + direction];
    const swappedQuestion = questions[swappedQuestionId];

    const newRules = updateRules(parseInt(questionId), parseInt(swappedQuestionId));
    const newQuestions = {...questions,
                          [qId]: swappedQuestion,
                          [swappedQuestionId]: questionToBeSwapped};
    const updatedParents = updateParentQuestions(questionId, parseInt(swappedQuestionId), surveyQuestions);
    const updatedProjectDetails = {
      surveyQuestions: {...surveyQuestions, ...newQuestions, ...updatedParents},
      surveyRules: newRules,
    };
    setProjectDetails(updatedProjectDetails);
    return qId;
  };

  const removeQuestion = () => {
    const childQuestionIds = getChildQuestionIds(surveyQuestionId);
    const questionHasRules = checkQuestionRules(surveyQuestionId);
    if(questionHasRules) {
      setState ({modal: {alert: {alertType: "Question Designer Error", alertMessage: "This question is being used in a rule. Please either delete or update the rule before removing the question"}}});
      return null;
    }
    const newSurveyQuestions = filterObject(
      surveyQuestions,
      ([sqId]) => !childQuestionIds.includes(Number(sqId))
    );
    setProjectDetails({ surveyQuestions: newSurveyQuestions });
  };

  const checkQuestionRules = (questionId) => {
    const matchingRule = findObject(
      surveyRules,
      ([_id, rl]) => (
        // Rules for matching sums
        (rl.questionIds1?.includes(questionId) ||
         rl.questionIds2?.includes(questionId)) ||
        // Rules for Incompatible Answers
        (rl.questionId1 === questionId ||
         rl.questionId2 === questionId) ||
        // Rules for Sums of answers
        (rl.questionIds?.includes(questionId)) ||
        // Rules for Regex Matching or Number Range
        (rl.questionId === questionId)
      ));
    return matchingRule;
  }

  const updateQuestion = () => {
    const questionHasRules = checkQuestionRules(surveyQuestionId);
    if (hideQuestion && questionHasRules) {
      setState ({modal: {alert: {alertType: "Question Designer Error", alertMessage: "This question is being used in a rule. Please either delete or update the rule before hiding the question"}}});
      return null;
    }
    if (newQuestionText !== "") {
      const newQuestion = {
        ...surveyQuestion,
        question: newQuestionText,
        hideQuestion,
      };
      setProjectDetails({
        surveyQuestions: { ...surveyQuestions, [surveyQuestionId]: newQuestion },
      });
    } else {
      setState ({modal: {alert: {alertType: "Question Designer Error", alertMessage: "Please enter a text for survey question."}}});
    }
  };

  const filteredRules = surveyRules
    ? surveyRules.filter((rule) =>
        [rule.questionId, rule.questionId1, rule.questionId2]
          .concat(rule.questionIds)
          .concat(rule.questionIds1)
          .concat(rule.questionIds2)
          .includes(surveyQuestionId)
      )
    : [];

  return (
    <>
      {showBulkAdd && (
        <BulkAddAnswers
          closeDialog={() => setBulkAdd(false)}
          surveyQuestion={surveyQuestion}
          surveyQuestionId={surveyQuestionId}
        />
      )}
      {state.modal?.alert &&
         <Modal title={state.modal.alert.alertType}
                onClose={()=>{setState({modal: null});}}>
           {state.modal.alert.alertMessage}
         </Modal>}
      <div className="d-flex border-top pt-3 pb-1">
        {[...Array(indentLevel)].map((l, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={idx} className="pl-5" style={{ cursor: "default" }}>
            <SvgIcon icon="downRightArrow" size="1.4rem" />
          </div>
        ))}
        <div className="container mb-2">
          <div className="pb-1 d-flex">
            {editMode === "review" ? (
              <h3 className="font-weight-bold">{removeEnumerator(surveyQuestion.question)}</h3>
            ) : (
              <>
                {editMode === "full" && (
                  <button
                    className="btn btn-outline-red py-0 px-2 mr-1"
                    onClick={removeQuestion}
                    type="button"
                  >
                    <SvgIcon icon="trash" size="1rem" />
                  </button>
                )}
                <button
                  className="btn btn-lightgreen py-0 px-2 mr-1"
                  onClick={updateQuestion}
                  type="button"
                >
                  <SvgIcon icon="save" size="1rem" />
                </button>
                <input
                  autoComplete="off"
                  maxLength="210"
                  onChange={(e) => setText(e.target.value)}
                  value={newQuestionText}
                />
              </>
            )}
            {surveyQuestion.parentQuestionId > 0 && (
              <>
                <div className="col-2 d-flex pr-1 justify-content-end">
                  <button
                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                    disabled={isFirst(surveyQuestionId)}
                    onClick={() => {
                      return reorderQuestions(surveyQuestionId, -1);
                      }}
                    style={{ opacity: isFirst(surveyQuestionId) ? "0.25" : "1.0" }}
                    type="button"
                  >
                    <SvgIcon icon="upCaret" size="1rem" transform="rotate(180deg)"/>
                  </button>
                  <button
                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                    disabled={isLast(surveyQuestionId)}
                    onClick={() => {
                      return reorderQuestions(surveyQuestionId, +1);
                    }}
                    style={{ opacity: isLast(surveyQuestionId) ? "0.25" : "1.0" }}
                    type="button"
                  >
                  <SvgIcon icon="downCaret" size="1rem" />
                  </button>
                </div>
              </>
            )}
        </div>

          <div className="pb-1">
            <ul className="mb-1 pl-3">
              <li>
                <span className="font-weight-bold"> Hide Question: </span>
                <input
                  checked={hideQuestion || false}
                  id="hide"
                  type="checkbox"
                  onChange={(e) => setHideQuestion(!hideQuestion)}
                />
              </li>
              <li>
                <span className="font-weight-bold">Component Type: </span>
                {surveyQuestion.componentType + " - " + surveyQuestion.dataType}
              </li>
              {filteredRules.length > 0 && (
                <li>
                  <b>Rules:</b>
                  <ul>
                    {filteredRules.map((rule) => (
                      <li key={rule.id}>
                        <div className="tooltip_wrapper">
                          {`Rule ${rule.id + 1}: ${rule.ruleType}`}
                          <div className="tooltip_content survey_rule">
                            <SurveyRule
                              inDesignMode={editMode === "full"}
                              rule={rule}
                              setProjectDetails={setProjectDetails}
                              surveyQuestions={surveyQuestions}
                              surveyRules={surveyRules}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
              {parentQuestion && (
                <>
                  <li>
                    <span className="font-weight-bold">Parent Question: </span>
                    {editMode !== "review"
                      ? parentQuestion.question
                      : removeEnumerator(parentQuestion.question)}
                  </li>
                  <li>
                    <span className="font-weight-bold">Parent Answers: </span>
                    {surveyQuestion.parentAnswerIds?.length === 0
                      ? "Any"
                      : surveyQuestion.parentAnswerIds?.map((paId) => parentQuestion.answers[paId]?.answer)
                          .join(", ")}
                  </li>
                </>
              )}
              <li>
                <span className="font-weight-bold">
                  {surveyQuestion.componentType === "input" ? "Placeholder" : "Answers"}:
                </span>
              </li>
            </ul>
          </div>
          <div className="ml-3">
            {mapObjectArray(question.answers, ([answerId, surveyAnswer]) => (
              <AnswerDesigner
                key={`${surveyQuestionId}-${answerId}`}
                answer={surveyAnswer.answer}
                answerId={answerId}
                color={surveyAnswer.color}
                editMode={editMode}
                required={surveyAnswer.required}
                hide={surveyAnswer.hide}
                surveyQuestion={question}
                surveyQuestionId={surveyQuestionId}
              />
            ))}
            {(editMode === "full" || isProjectAdmin) && !maxAnswers(surveyQuestion) && (
              <AnswerDesigner
                editMode={editMode}
                surveyQuestion={question}
                surveyQuestionId={surveyQuestionId}
              />
            )}
            {editMode === "full" && surveyQuestion.componentType !== "input" && (
              <button
                className="btn btn-sm btn-lightgreen"
                onClick={() => setBulkAdd(true)}
                type="button"
              >
                Bulk Add
              </button>
            )}
          </div>
        </div>
      </div>
      {childNodeIds.map((childId) => (
        <SurveyDesignQuestion
          key={childId}
          editMode={editMode}
          indentLevel={indentLevel + 1}
          surveyQuestionId={childId}
          question={surveyQuestions[childId]}
        />
      ))}
    </>
  );
}
