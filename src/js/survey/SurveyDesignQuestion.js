import React, { useContext, useState } from "react";

import AnswerDesigner from "./AnswerDesigner";
import BulkAddAnswers from "./BulkAddAnswers";
import SurveyRule from "./SurveyRule";
import SvgIcon from "../components/svg/SvgIcon";

import { removeEnumerator } from "../utils/generalUtils";
import { mapObjectArray, filterObject, lengthObject, findObject } from "../utils/sequence";
import { ProjectContext } from "../project/constants";

export default function SurveyDesignQuestion({ indentLevel, editMode, surveyQuestionId }) {
  const { setProjectDetails, surveyQuestions, surveyRules } = useContext(ProjectContext);

  const surveyQuestion = surveyQuestions[surveyQuestionId];
  const parentQuestion = surveyQuestions[surveyQuestion.parentQuestionId];
  const childNodeIds = mapObjectArray(
    filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestionId === surveyQuestionId),
    ([key, _val]) => Number(key)
  );

  const [newQuestionText, setText] = useState(surveyQuestion.question);
  const [hideQuestion, setHideQuestion] = useState(surveyQuestion.hideQuestion);
  const [showBulkAdd, setBulkAdd] = useState(false);

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

  const removeQuestion = () => {
    const childQuestionIds = getChildQuestionIds(surveyQuestionId);
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
        rl.questionIds1?.includes(questionId) ||
          rl.questionIds2?.includes(questionId)
      ));
    return matchingRule;
  }

  const updateQuestion = () => {
    const questionHasRules = checkQuestionRules(surveyQuestionId);
    if (hideQuestion && questionHasRules) {
      alert("This question is being used in a rule. Please either delete or update the rule before hiding the question");
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
      alert("Please enter a text for survey question.");
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
                    {surveyQuestion.parentAnswerIds.length === 0
                      ? "Any"
                      : surveyQuestion.parentAnswerIds
                          .map((paId) => parentQuestion.answers[paId]?.answer)
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
            {mapObjectArray(surveyQuestion.answers, ([answerId, surveyAnswer]) => (
              <AnswerDesigner
                key={`${surveyQuestionId}-${answerId}`}
                answer={surveyAnswer.answer}
                answerId={answerId}
                color={surveyAnswer.color}
                editMode={editMode}
                required={surveyAnswer.required}
                hide={surveyAnswer.hide}
                surveyQuestion={surveyQuestion}
                surveyQuestionId={surveyQuestionId}
              />
            ))}
            {editMode === "full" && !maxAnswers(surveyQuestion) && (
              <AnswerDesigner
                editMode={editMode}
                surveyQuestion={surveyQuestion}
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
        />
      ))}
    </>
  );
}
