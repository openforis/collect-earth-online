import React, {useContext, useState} from "react";

import SvgIcon from "../components/svg/SvgIcon";
import SurveyDesignQuestion from "./SurveyDesignQuestion";

import {removeEnumerator} from "../utils/generalUtils";
import {mapObject, replaceNumber} from "../utils/sequence";
import {ProjectContext} from "../project/constants";

export default function SurveyCard({
    cardNumber,
    editMode,
    surveyQuestionId,
    topLevelNodeIds
}) {
    const [showQuestions, setShow] = useState(true);
    const {setProjectDetails, surveyQuestions, surveyRules} = useContext(ProjectContext);

    const swapId = (val, checkVal, swapVal) => (val === checkVal ? swapVal
        : val === swapVal ? checkVal
            : val);

    const swapIdArray = (arr, checkVal, swapVal) => {
        if (arr.includes(checkVal) && !arr.includes(swapVal)) {
            return replaceNumber(arr, checkVal, swapVal);
        } else if (arr.includes(swapVal) && !arr.includes(checkVal)) {
            return replaceNumber(arr, swapVal, checkVal);
        } else return arr;
    };

    const updateRuleQuestionIds = (rule, oldQuestionId, newQuestionId) => {
        if (rule.ruleType === "text-match" || rule.ruleType === "numeric-range") {
            const questionId = swapId(rule.questionId, oldQuestionId, newQuestionId);
            return {...rule, questionId};
        }
        if (rule.ruleType === "incompatible-answers") {
            const questionId1 = swapId(rule.questionId1, oldQuestionId, newQuestionId);
            const questionId2 = swapId(rule.questionId2, oldQuestionId, newQuestionId);
            return {...rule, questionId1, questionId2};
        }
        if (rule.ruleType === "sum-of-answers") {
            const questionIds = swapIdArray(rule.questionIds, oldQuestionId, newQuestionId);
            return {...rule, questionIds};
        }
        if (rule.ruleType === "matching-sums") {
            const questionIds1 = swapIdArray(rule.questionIds1, oldQuestionId, newQuestionId);
            const questionIds2 = swapIdArray(rule.questionIds2, oldQuestionId, newQuestionId);
            return {...rule, questionIds1, questionIds2};
        } else return rule;
    };

    const swapQuestionIds = upOrDown => {
        const newId = topLevelNodeIds[
            topLevelNodeIds.indexOf(surveyQuestionId) + upOrDown
        ];
        setProjectDetails({
            surveyQuestions: mapObject(surveyQuestions, ([key, val]) => [
                swapId(Number(key), surveyQuestionId, newId),
                {...val, parentQuestionId: swapId(val.parentQuestionId, surveyQuestionId, newId)}
            ]),
            surveyRules: surveyRules.map(rule =>
                updateRuleQuestionIds(rule, surveyQuestionId, newId))
        });
    };

    const {question} = surveyQuestions[surveyQuestionId];

    return (
        <div className="border rounded border-dark">
            <div className="container">
                <div className="row">
                    <div className="col-10 d-flex pl-1">
                        <button
                            className="btn btn-outline-lightgreen my-2"
                            onClick={() => setShow(!showQuestions)}
                            type="button"
                        >
                            {showQuestions ? <SvgIcon icon="minus" size="0.9rem"/> : <SvgIcon icon="plus" size="0.9rem"/>}
                        </button>
                        <h2 className="font-weight-bold mt-2 pt-1 ml-2">Survey Card Number {cardNumber}</h2>
                        <h3 className="m-3">
                            {!showQuestions && `-- ${editMode === "review" ? removeEnumerator(question) : question}`}
                        </h3>
                    </div>
                    {editMode !== "review" && (
                        <div className="col-2 d-flex pr-1 justify-content-end">
                            <button
                                className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                disabled={surveyQuestionId === topLevelNodeIds[0]}
                                onClick={() => swapQuestionIds(-1)}
                                style={{opacity: surveyQuestionId === topLevelNodeIds[0] ? "0.25" : "1.0"}}
                                type="button"
                            >
                                <SvgIcon icon="upCaret" size="1rem"/>
                            </button>
                            <button
                                className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                disabled={surveyQuestionId === topLevelNodeIds[topLevelNodeIds.length - 1]}
                                onClick={() => swapQuestionIds(1)}
                                style={{opacity: surveyQuestionId === topLevelNodeIds[topLevelNodeIds.length - 1] ? "0.25" : "1.0"}}
                                type="button"
                            >
                                <SvgIcon icon="downCaret" size="1rem"/>
                            </button>
                        </div>
                    )}
                </div>
                {showQuestions && (
                    <div className="row d-block">
                        <SurveyDesignQuestion
                            key={surveyQuestionId}
                            editMode={editMode}
                            indentLevel={0}
                            surveyQuestionId={surveyQuestionId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
