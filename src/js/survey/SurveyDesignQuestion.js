import React from "react";

import SurveyRule from "./SurveyRule";
import SvgIcon from "../components/svg/SvgIcon";
import NewAnswerDesigner from "./NewAnswerDesigner";

import {removeEnumerator} from "../utils/generalUtils";
import {mapObjectArray, filterObject} from "../utils/sequence";

export default function SurveyDesignQuestion({
    indentLevel,
    inDesignMode,
    setProjectDetails,
    surveyQuestionId,
    surveyQuestions,
    surveyRules
}) {
    const deleteSurveyRule = ruleId => {
        const newSurveyRules = surveyRules.filter(rule => rule.id !== ruleId);
        setProjectDetails({surveyRules: newSurveyRules});
    };

    const getChildQuestionIds = questionId => {
        const childQuestionIds = mapObjectArray(
            filterObject(surveyQuestions, ([_sqId, sq]) => sq.parentQuestionId === questionId),
            ([key, _val]) => Number(key)
        );
        return childQuestionIds.length === 0
            ? [questionId]
            : childQuestionIds.reduce((acc, cur) => [...acc, ...getChildQuestionIds(cur)], [questionId]);
    };

    const removeQuestion = questionId => {
        const childQuestionIds = getChildQuestionIds(questionId);
        const newSurveyQuestions = filterObject(surveyQuestions, ([sqId]) => !childQuestionIds.includes(Number(sqId)));
        setProjectDetails({surveyQuestions: newSurveyQuestions});
    };

    const surveyQuestion = surveyQuestions[surveyQuestionId];
    const parentQuestion = surveyQuestions[surveyQuestion.parentQuestionId];
    const childNodeIds = mapObjectArray(
        filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestionId === surveyQuestionId),
        ([key, _val]) => Number(key)
    );

    return (
        <>
            <div className="d-flex border-top pt-3 pb-1">
                {[...Array(indentLevel)].map((l, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={idx} className="pl-5" style={{cursor: "default"}}>
                        <SvgIcon icon="downRightArrow" size="1.4rem"/>
                    </div>
                ))}
                <div className="container mb-2">
                    <div className="pb-1 d-flex">
                        {inDesignMode && (
                            <button
                                className="btn btn-outline-red py-0 px-2 mr-1"
                                onClick={() => removeQuestion(surveyQuestionId)}
                                type="button"
                            >
                                <SvgIcon icon="trash" size="1rem"/>
                            </button>
                        )}
                        <h3 className="font-weight-bold">
                            {inDesignMode ? surveyQuestion.question : removeEnumerator(surveyQuestion.question)}
                        </h3>
                    </div>
                    <div className="pb-1">
                        <ul className="mb-1">
                            {surveyQuestion.componentType && (
                                <li>
                                    <span className="font-weight-bold">Component Type:  </span>
                                    {surveyQuestion.componentType + " - " + surveyQuestion.dataType}
                                </li>
                            )}
                            {surveyRules && surveyRules.length > 0 && (
                                <li>
                                    <b>Rules:</b>
                                    <ul>
                                        {surveyRules.map(rule =>
                                            [rule.questionId, rule.questionId1, rule.questionId2]
                                                .concat(rule.questionIds)
                                                .concat(rule.questionIds1)
                                                .concat(rule.questionIds2)
                                                .includes(surveyQuestionId)
                                                && (
                                                    <li key={rule.id}>
                                                        <div className="tooltip_wrapper">
                                                            {`Rule ${rule.id + 1}: ${rule.ruleType}`}
                                                            <div className="tooltip_content survey_rule">
                                                                <SurveyRule
                                                                    inDesignMode={inDesignMode}
                                                                    removeRule={() => deleteSurveyRule(rule.id)}
                                                                    ruleOptions={rule}
                                                                    surveyQuestions={surveyQuestions}
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
                                        {inDesignMode
                                            ? parentQuestion.question
                                            : removeEnumerator(parentQuestion.question)}
                                    </li>
                                    <li>
                                        <span className="font-weight-bold">Parent Answer: </span>
                                        {surveyQuestion.parentAnswerId === -1
                                            ? "Any"
                                            : parentQuestion.answers[surveyQuestion.parentAnswerId].answer}
                                    </li>
                                </>
                            )}
                        </ul>
                        <h3 className="font-weight-bold ml-3">
                            {surveyQuestion.componentType === "input" ? "Placeholder" : "Answers"}:
                        </h3>
                    </div>
                    <div>
                        {mapObjectArray(surveyQuestion.answers, ([answerId, surveyAnswer]) => (
                            <NewAnswerDesigner
                                key={`${surveyQuestionId}-${answerId}`}
                                answer={surveyAnswer.answer}
                                answerId={answerId}
                                color={surveyAnswer.color}
                                inDesignMode={inDesignMode}
                                surveyQuestion={surveyQuestion}
                                surveyQuestionId={surveyQuestionId}
                            />
                        ))}
                        {inDesignMode && (
                            <NewAnswerDesigner
                                inDesignMode={inDesignMode}
                                surveyQuestion={surveyQuestion}
                                surveyQuestionId={surveyQuestionId}
                            />
                        )}
                    </div>
                </div>
            </div>
            {childNodeIds.map(childId => (
                <SurveyDesignQuestion
                    key={childId}
                    indentLevel={indentLevel + 1}
                    inDesignMode={inDesignMode}
                    setProjectDetails={setProjectDetails}
                    surveyQuestionId={childId}
                    surveyQuestions={surveyQuestions}
                    surveyRules={surveyRules}
                />
            ))}
        </>
    );
}
