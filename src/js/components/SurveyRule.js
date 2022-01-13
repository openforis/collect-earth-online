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

function SumOfAnswersRuleBody({questionIds, validSum, surveyQuestions}) {
    return (
        <p className="card-text">
              The answer to&nbsp;
            <b>
                Survey Questions&nbsp;&quot;
                {questionIds.map(q => getSurveyQuestionText(surveyQuestions, q)).join(", ")}
                 &quot;
            </b>
              &nbsp;should sum up to:&nbsp;
            <code style={{color: "black"}}>{validSum}</code>
        </p>
    );
}

function IncompatibleAnswersRuleBody({answerId1, answerId2, questionId1, questionId2, surveyQuestions}) {
    return (
        <div className="card-text">
            The answer&nbsp;
            <Badge text={getSurveyAnswerText(surveyQuestions, questionId1, answerId1)}/>
            &nbsp;from&nbsp;
            <b>
              Survey Question &quot;{getSurveyQuestionText(surveyQuestions, questionId1)}&quot;
            </b>
            &nbsp;is incompatible with&nbsp;
            <Badge text={getSurveyAnswerText(surveyQuestions, questionId2, answerId2)}/>
            &nbsp;from&nbsp;
            <b>
              Survey Question &quot;{getSurveyQuestionText(surveyQuestions, questionId2)}&quot;
            </b>
            .
        </div>
    );
}

function MatchingSumsRuleBody({questionIds1, questionIds2, surveyQuestions}) {
    const [isQuestionIds1Multiple, isQuestionIds2Multiple] = [questionIds1.length > 1, questionIds2.length > 1];
    const surveyQuestionText1 = questionIds1.map(q => getSurveyQuestionText(surveyQuestions, q));
    const surveyQuestionText2 = questionIds2.map(q => getSurveyQuestionText(surveyQuestions, q));
    return (
        <p className="card-text">
            The sum of the {isQuestionIds1Multiple ? "answers" : "answer"} to&nbsp;
            <b>
              Survey Question
                {isQuestionIds1Multiple
                    ? `s "${surveyQuestionText1.join(", ")}"`
                    : ` "${surveyQuestionText1[0]}"`}
            </b>
            &nbsp;should be equl to the sum of the {isQuestionIds1Multiple ? "answers" : "answer"} to &nbsp;
            <b>
            Survey Question
                {isQuestionIds2Multiple
                    ? `s "${surveyQuestionText2.join(", ")}"`
                    : ` "${surveyQuestionText2[0]}"`}
            </b>
            .
        </p>
    );
}

function NumericRangeRuleBody({questionId, min, max, surveyQuestions}) {
    return (
        <p className="card-text">
              The answer to&nbsp;
            <b>
                Survey Question &quot;{getSurveyQuestionText(surveyQuestions, questionId)}&quot;
            </b>
                &nbsp;should be between:&nbsp;
            <code style={{color: "black"}}>{min} and {max}</code>
        </p>
    );
}

function TextMatchRuleBody({questionId, regex, surveyQuestions}) {
    return (
        <p className="card-text">
                The answer to&nbsp;
            <b>
                Survey Question &quot;{getSurveyQuestionText(surveyQuestions, questionId)}&quot;
            </b>
                &nbsp;should match the pattern:&nbsp;
            <code style={{color: "black"}}>{regex}</code>
        </p>
    );
}

function SurveyRuleCard({title, Body}) {
    return (
        <div className="card" style={{width: "100%"}}>
            <div className="card-body pt-2 pb-3">
                <div
                    className="font-weight-bold"
                    style={{fontFamily: "CaviarDreams", fontSize: "1.25rem"}}
                >
                    {title}
                </div>
                <hr style={{margin: "0.5rem 0"}}/>
                <Body/>
            </div>
        </div>
    );
}

export default function SurveyRule({ruleOptions, surveyQuestions}) {
    return (
        <div className="d-flex flex-column mb-1" style={{flex: 1}}>
            {{
                "text-match": <SurveyRuleCard
                    Body={() => <TextMatchRuleBody {...ruleOptions} surveyQuestions={surveyQuestions}/>}
                    title="Text Match"
                />,
                "numeric-range": <SurveyRuleCard
                    Body={() => <NumericRangeRuleBody {...ruleOptions} surveyQuestions={surveyQuestions}/>}
                    title="Numeric Range"
                />,
                "sum-of-answers": <SurveyRuleCard
                    Body={() => <SumOfAnswersRuleBody {...ruleOptions} surveyQuestions={surveyQuestions}/>}
                    title="Sum of Answers"
                />,
                "matching-sums": <SurveyRuleCard
                    Body={() => <MatchingSumsRuleBody {...ruleOptions} surveyQuestions={surveyQuestions}/>}
                    title="Matching Sums"
                />,
                "incompatible-answers": <SurveyRuleCard
                    Body={() => <IncompatibleAnswersRuleBody {...ruleOptions} surveyQuestions={surveyQuestions}/>}
                    title="Incompatible Answers"
                />
            }[ruleOptions.ruleType]}
        </div>
    );
}
