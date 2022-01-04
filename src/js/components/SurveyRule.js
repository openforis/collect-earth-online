import React from "react";
import _ from "lodash";

import {truncate} from "../utils/generalUtils";

function truncjoin(qs) {
    return qs.map(q => truncate(q, 15)).join(", ");
}

function Badge({text}) {
    return (
        <div className="badge badge-light tooltip_wrapper" style={{color: "black"}}>
            {truncate(text, 10)}
            {text.length > 10 && (<div className="tooltip_content">{text}</div>)}
        </div>
    );
}

function getSurveyQuestionText(surveyQuestions, questionId) {
    return _.get(surveyQuestions, [questionId, "question"], "");
}

function getSurveyAnswerText(surveyQuestions, questionId, answerId) {
    return _.get(surveyQuestions, [questionId, "answers", answerId, "answer"], "");
}

function Question({text}) {
    const textIsArray = Array.isArray(text);
    return (
        <i className="tooltip_wrapper" style={{color: "black"}}>
            &quot;{(textIsArray ? truncjoin(text) : truncate(text, 15))}&quot;
            {(textIsArray || text.length >= 15)
                && (
                    <span className="tooltip_content" style={{fontSize: "0.8rem"}}>
                        {textIsArray ? text.join(", ") : text}
                    </span>
                )}
        </i>
    );
}

function SumOfAnswersRule({surveyQuestions, questionIds, validSum}) {
    return (
        <>
            <div><strong>Sum of Answers</strong></div>
            <div>
                Answers to&nbsp;
                <Question
                    text={questionIds.map(q => getSurveyQuestionText(surveyQuestions, q))}
                />
                &nbsp;should sum up to {validSum}.
            </div>
        </>
    );
}

function IncompatibleAnswersRule({surveyQuestions, answerId1, answerId2, questionId1, questionId2}) {
    return (
        <>
            <div><strong>Incompatible Answers</strong></div>
            <div>
                Answer&nbsp;
                <Badge text={getSurveyAnswerText(surveyQuestions, questionId1, answerId1)}/>
                &nbsp;from&nbsp;
                <Question text={getSurveyQuestionText(surveyQuestions, questionId1)}/>
                &nbsp;is incompatible with&nbsp;
                <Badge text={getSurveyAnswerText(surveyQuestions, questionId2, answerId2)}/>
                &nbsp;from&nbsp;
                <Question text={getSurveyQuestionText(surveyQuestions, questionId2)}/>
            </div>
        </>
    );
}

function MatchingSumsRule({surveyQuestions, questionIds1, questionIds2}) {
    return (
        <>
            <div><strong>Matching Sums</strong></div>
            <div>
                Sum of&nbsp;
                <Question text={questionIds1.map(q => getSurveyQuestionText(surveyQuestions, q))}/>
                &nbsp;should be equal to sum of&nbsp;
                <Question text={questionIds2.map(q => getSurveyQuestionText(surveyQuestions, q))}/>
            </div>
        </>
    );
}

function NumericRangeRule({surveyQuestions, questionId, min, max}) {
    return (
        <>
            <div><strong>Min/Max Values</strong></div>
            <div>
                Answer to&nbsp;
                <Question text={getSurveyQuestionText(surveyQuestions, questionId)}/>
                &nbsp;should be between: {min} and {max}.
            </div>
        </>
    );
}

function TextMatchRule({surveyQuestions, questionId, regex}) {
    return (
        <>
            <div><strong>Text Match</strong></div>
            <div>
                Answer to&nbsp;
                <Question text={getSurveyQuestionText(surveyQuestions, questionId)}/>
                &nbsp;should match the pattern:
                <pre style={{display: "inline"}}>
                    {regex}
                </pre>
            </div>
        </>
    );
}

export default function SurveyRule({ruleOptions, surveyQuestions}) {
    return (
        <div className="d-flex flex-column mb-3">
            {{
                "text-match": <TextMatchRule {...ruleOptions} surveyQuestions={surveyQuestions}/>,
                "numeric-range": <NumericRangeRule {...ruleOptions} surveyQuestions={surveyQuestions}/>,
                "sum-of-answers": <SumOfAnswersRule {...ruleOptions} surveyQuestions={surveyQuestions}/>,
                "matching-sums": <MatchingSumsRule {...ruleOptions} surveyQuestions={surveyQuestions}/>,
                "incompatible-answers": <IncompatibleAnswersRule {...ruleOptions} surveyQuestions={surveyQuestions}/>
            }[ruleOptions.ruleType]}
        </div>
    );
}
