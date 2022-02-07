import React, {useContext, useState} from "react";

import AnswerDesigner from "./AnswerDesigner";
import BulkAddAnswers from "./BulkAddAnswers";
import SurveyRule from "./SurveyRule";
import SvgIcon from "../components/svg/SvgIcon";

import {removeEnumerator} from "../utils/generalUtils";
import {mapObjectArray, filterObject, lengthObject} from "../utils/sequence";
import {ProjectContext} from "../project/constants";

export default function SurveyDesignQuestion({indentLevel, inDesignMode, surveyQuestionId}) {
    const {setProjectDetails, surveyQuestions, surveyRules} = useContext(ProjectContext);

    const surveyQuestion = surveyQuestions[surveyQuestionId];
    const parentQuestion = surveyQuestions[surveyQuestion.parentQuestionId];
    const childNodeIds = mapObjectArray(
        filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestionId === surveyQuestionId),
        ([key, _val]) => Number(key)
    );

    const [newQuestionText, setText] = useState(surveyQuestion.question);
    const [showBulkAdd, setBulkAdd] = useState(false);

    const getChildQuestionIds = questionId => {
        const childQuestionIds = mapObjectArray(
            filterObject(surveyQuestions, ([_sqId, sq]) => sq.parentQuestionId === questionId),
            ([key, _val]) => Number(key)
        );
        return childQuestionIds.length === 0
            ? [questionId]
            : childQuestionIds.reduce((acc, cur) => [...acc, ...getChildQuestionIds(cur)], [questionId]);
    };

    const maxAnswers = ({componentType, dataType, answers}) =>
        lengthObject(answers) >= ((componentType || "").toLowerCase() === "input" ? 1
            : (dataType || "").toLowerCase() === "boolean" ? 2
                : 1000);

    const removeQuestion = () => {
        const childQuestionIds = getChildQuestionIds(surveyQuestionId);
        const newSurveyQuestions = filterObject(surveyQuestions, ([sqId]) => !childQuestionIds.includes(Number(sqId)));
        setProjectDetails({surveyQuestions: newSurveyQuestions});
    };

    const updateQuestion = () => {
        if (newQuestionText !== "") {
            const newQuestion = {
                ...surveyQuestion,
                question: newQuestionText
            };
            setProjectDetails({surveyQuestions: {...surveyQuestions, [surveyQuestionId]: newQuestion}});
        } else {
            alert("Please enter a text for survey question.");
        }
    };

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
                    <div key={idx} className="pl-5" style={{cursor: "default"}}>
                        <SvgIcon icon="downRightArrow" size="1.4rem"/>
                    </div>
                ))}
                <div className="container mb-2">
                    <div className="pb-1 d-flex">
                        {inDesignMode
                            ? (
                                <>
                                    <button
                                        className="btn btn-outline-red py-0 px-2 mr-1"
                                        onClick={removeQuestion}
                                        type="button"
                                    >
                                        <SvgIcon icon="trash" size="1rem"/>
                                    </button>
                                    <button
                                        className="btn btn-success py-0 px-2 mr-1"
                                        onClick={updateQuestion}
                                        type="button"
                                    >
                                        <SvgIcon icon="save" size="1rem"/>
                                    </button>
                                    <input
                                        autoComplete="off"
                                        maxLength="210"
                                        onChange={e => setText(e.target.value)}
                                        value={newQuestionText}
                                    />
                                </>
                            ) : (
                                <h3 className="font-weight-bold">
                                    {removeEnumerator(surveyQuestion.question)}
                                </h3>
                            )}
                    </div>
                    <div className="pb-1">
                        <ul className="mb-1 pl-3">
                            <li>
                                <span className="font-weight-bold">Component Type: </span>
                                {surveyQuestion.componentType + " - " + surveyQuestion.dataType}
                            </li>
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
                                        {inDesignMode
                                            ? parentQuestion.question
                                            : removeEnumerator(parentQuestion.question)}
                                    </li>
                                    <li>
                                        <span className="font-weight-bold">Parent Answers: </span>
                                        {surveyQuestion.parentAnswerIds.length === 0
                                            ? "Any"
                                            : surveyQuestion.parentAnswerIds
                                                .map(paId => parentQuestion.answers[paId].answer)
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
                                inDesignMode={inDesignMode}
                                required={surveyAnswer.required}
                                surveyQuestion={surveyQuestion}
                                surveyQuestionId={surveyQuestionId}
                            />
                        ))}
                        {inDesignMode && !maxAnswers(surveyQuestion) && (
                            <AnswerDesigner
                                inDesignMode={inDesignMode}
                                surveyQuestion={surveyQuestion}
                                surveyQuestionId={surveyQuestionId}
                            />
                        )}
                        {inDesignMode && surveyQuestion.componentType !== "input" && (
                            <button
                                className="btn btn-sm btn-success"
                                onClick={() => setBulkAdd(true)}
                                type="button"
                            >
                                Bulk Add
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {childNodeIds.map(childId => (
                <SurveyDesignQuestion
                    key={childId}
                    indentLevel={indentLevel + 1}
                    inDesignMode={inDesignMode}
                    surveyQuestionId={childId}
                />
            ))}
        </>
    );
}
