import React, { useState } from "react";

import RulesCollectionModal from "./SurveyCollectionRulesModal";
import SurveyCollectionAnswers from "./SurveyCollectionAnswers";

import { removeEnumerator } from "../utils/generalUtils";
import { filterObject, mapObjectArray } from "../utils/sequence";

export default function SurveyCollectionQuestion({
  hierarchyLabel,
  surveyNodeId,
  surveyQuestions,
  surveyRules,
  selectedQuestionId,
  selectedSampleId,
  setSelectedQuestion,
  validateAndSetCurrentValue,
}) {
  const [showAnswers, setShow] = useState(true);
  const childNodes = filterObject(
    surveyQuestions,
    ([_id, sq]) => sq.parentQuestionId === surveyNodeId
  );
  const nodeQuestion = surveyQuestions[surveyNodeId];
  return nodeQuestion ? (
    <>
      <fieldset
        className="justify-content-center text-center"
        onClick={() => setSelectedQuestion(surveyNodeId)}
        style={{
          border: "1px solid rgba(0, 0, 0, 0.2)",
          borderRadius: "6px",
          boxShadow:
            surveyNodeId === selectedQuestionId
              ? "0 0 4px 2px rgba(0, 0, 0, 1)"
              : "0 0 2px 1px rgba(0, 0, 0, 0.15)",
          margin: "1rem 0",
          padding: ".5rem",
        }}
      >
        <div className="btn-block my-2 d-flex">
          <button
            className="text-center btn btn-outline-lightgreen btn-sm text-bold px-3 py-2 mr-1"
            onClick={() => setShow(!showAnswers)}
            type="button"
          >
            {showAnswers ? <span>-</span> : <span>+</span>}
          </button>
          <RulesCollectionModal
            surveyNodeId={surveyNodeId}
            surveyQuestions={surveyQuestions}
            surveyRules={surveyRules}
          />
          <button
            className="text-center btn btn-outline-lightgreen btn-sm col text-truncate"
            style={{
              boxShadow:
                nodeQuestion?.answered.length === 0
                  ? "0px 0px 6px 4px red inset"
                  : nodeQuestion?.answered.length === nodeQuestion?.visible.length
                  ? "0px 0px 6px 5px #3bb9d6 inset"
                  : "0px 0px 6px 4px yellow inset",
            }}
            title={removeEnumerator(nodeQuestion?.question)}
            type="button"
          >
            {hierarchyLabel + removeEnumerator(nodeQuestion?.question)}
          </button>
        </div>

        {showAnswers && (
          <SurveyCollectionAnswers
            selectedSampleId={selectedSampleId}
            surveyNode={nodeQuestion}
            surveyNodeId={surveyNodeId}
            surveyQuestions={surveyQuestions}
            validateAndSetCurrentValue={validateAndSetCurrentValue}
          />
        )}
      </fieldset>
      {mapObjectArray(childNodes, ([strId]) => {
        const nodeId = Number(strId);
        return (
          surveyQuestions[nodeId].visible.length > 0 && (
            <SurveyCollectionQuestion
              key={nodeId}
              hierarchyLabel={hierarchyLabel + "- "}
              selectedQuestionId={selectedQuestionId}
              selectedSampleId={selectedSampleId}
              setSelectedQuestion={setSelectedQuestion}
              surveyNodeId={nodeId}
              surveyQuestions={surveyQuestions}
              surveyRules={surveyRules}
              validateAndSetCurrentValue={validateAndSetCurrentValue}
            />
          )
        );
      })}
    </>
  ) : null;
}
