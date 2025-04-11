import React, { useState, useContext, useEffect } from "react";

import SvgIcon from "../components/svg/SvgIcon";
import { ProjectContext } from "../project/constants";
import { findObject, getNextInSequence } from "../utils/sequence";
import Modal from "../components/Modal";

const AnswerDesigner = ({
  answer,
  answerId,
  color,
  editMode,
  required,
  hide,
  surveyQuestion,
  surveyQuestionId }) => {
    const { surveyQuestions, setProjectDetails, surveyRules } = useContext(ProjectContext);

    const [selectedColor, setSelectedColor] = useState( surveyQuestion.answers[answerId]?.color || "#1527f6");
    const [newAnswerText, setNewAnswerText] = useState(surveyQuestion.answers[answerId]?.answer || "");
    const [req, setReq] = useState(surveyQuestion.answers[answerId]?.required || false);
    const [hideAnswer, setHideAnswer] = useState(surveyQuestion.answers[answerId]?.hide || false);
    const [state, setState] = useState({modal: null});
    const removeAnswer = () => {
      const answerHasRule = answerRule(surveyQuestionId, parseInt(answerId));
      if (answerHasRule) {
        setState ({modal: {alert: {alertType: "Answer Designer Error", alertMessage: "This answer is being used in a rule. Please either delete or update the rule before removing the answer."}}});
        return null;
      }
      const matchingQuestion = findObject(
        surveyQuestions,
        ([_id, sq]) => sq.parentQuestionId === surveyQuestionId && sq.parentAnswerIds.includes(answerId)
      );
      if (matchingQuestion) {
        setState ({modal: {alert: {alertType: "Answer Designer Error", alertMessage: "You cannot remove this answer because a sub question (" + matchingQuestion[1].question + ") is referencing it."}}});
      } else {
        const surveyQuestion = surveyQuestions[surveyQuestionId];
        const { [answerId]: _id, ...remainingAnswers } = surveyQuestion.answers;
        setProjectDetails({
          surveyQuestions: {
            ...surveyQuestions,
            [surveyQuestionId]: { ...surveyQuestion, answers: remainingAnswers },
          },
        });
      }
    };

    const answerRule = (questionId, answerId) => {
      const matchingAnswer = findObject(
        surveyRules,
        ([_id, rl]) =>
        (rl.questionId1 === questionId &&
         (rl.answerId1 === answerId || rl.answerId2 === answerId)) ||
          (rl.questionId2 === questionId &&
           (rl.answerId1 === answerId || rl.answerId2 === answerId))
      );
      return matchingAnswer;
    };

    const saveSurveyAnswer = () => {
      if (newAnswerText.length > 0) {
        const newId = answerId || getNextInSequence(Object.keys(surveyQuestion.answers));
        const newAnswer = {
          answer: newAnswerText,
          color: selectedColor,
          hide: hideAnswer,
          ...(surveyQuestion.componentType === "input" && { required: req }),
        };
        const answerHasRule = answerRule(surveyQuestionId, parseInt(answerId));
        if (hide && answerHasRule) {
          setState ({modal: {alert: {alertType: "Answer Designer Error", alertMessage: "This answer is being used in a rule. Please either delete or update the rule before hiding the answer"}}});
          return null;
        }
        setProjectDetails({
          surveyQuestions: {
            ...surveyQuestions,
            [surveyQuestionId]: {
              ...surveyQuestion,
              answers: {
                ...surveyQuestion.answers,
                [newId]: newAnswer,
              },
            },
          },
        });
        if (answerId == null) {
          setSelectedColor("#1527f6");
          setNewAnswerText("");
        }
      } else {
        setState ({modal: {alert: {alertType: "Answer Designer Error", alertMessage: "Please enter a value for the answer."}}});
      }
    };

    const renderExisting = () => {
      return (
        <div className="d-flex flex-column">
          <div className="d-flex">
            <div>
              <div
                className="circle mt-1 mr-3"
                style={{ backgroundColor: color, border: "solid 1px" }}
              />
            </div>
            <div>{answer}</div>
          </div>
          {surveyQuestion.componentType === "input" && required && <div>Required</div>}
        </div>
      );
    };

    const renderNew = () => {
      return (
        <div className="d-flex flex-column">
          <div className="d-flex mb-1 align-items-center">
            {answerId != null ? (
              <>
                {editMode === "full" && (
                  <button
                    className="btn btn-outline-red py-0 px-2 mr-1"
                    onClick={removeAnswer}
                    type="button"
                  >
                    <SvgIcon icon="trash" size="0.9rem" />
                  </button>
                )}
                <button
                  className="btn btn-lightgreen py-0 px-2 mr-1"
                  onClick={saveSurveyAnswer}
                  type="button"
                >
                  <SvgIcon icon="save" size="0.9rem" />
                </button>
              </>
            ) : (
              <button
                className="btn btn-lightgreen py-0 px-2 mr-1"
                onClick={saveSurveyAnswer}
                type="button"
              >
                <SvgIcon icon="plus" size="0.9rem" />
              </button>
            )}
            <input
              className="mr-1"
              onChange={(e) => setSelectedColor(e.target.value)}
              type="color"
              value={selectedColor}
            />
            <input
              autoComplete="off"
              maxLength="120"
              onChange={(e) => setNewAnswerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "e" && surveyQuestion.dataType === "number") e.preventDefault();
              }}
              type={surveyQuestion.dataType === "number" ? "number" : "text"}
              value={newAnswerText}
            />
          </div>
          {surveyQuestion.componentType != "input" && (
            <div className="d-flex ml-4 mb-1 align-items-center">
              <input
                type="checkbox"
                checked={hideAnswer}
                id="hideAnswer"
                onChange={() => setHideAnswer(!hideAnswer)}
              />
              <label className="mb-0 ml-1 mr-1" htmlFor="hideAnswer">
                Hide Answer?
              </label>
            </div>
          )}
          {surveyQuestion.componentType === "input" && (
            <div className="d-flex ml-4 align-items-center">
              <input
                checked={req}
                id="required"
                onChange={() => setReq(!req)}
                type="checkbox"
              />
              <label className="mb-0 ml-1" htmlFor="required">
                Text Required?
              </label>
            </div>
          )}
        </div>
      );
    };

    return (
      <div id="new-answer-designer">
        {state.modal?.alert &&
         <Modal title={state.modal.alert.alertType}
                onClose={()=>{setState({modal: null});}}>
           {state.modal.alert.alertMessage}
         </Modal>}
        {editMode === "review" ? renderExisting() : renderNew()}
      </div>
    );
  };

export default AnswerDesigner;
