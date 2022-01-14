import React from "react";
import _ from "lodash";

import {truncate} from "../utils/generalUtils";

function truncjoin(qs) {
    return qs.map(q => truncate(q, 15)).join(", ");
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
            The answers to&nbsp;
            <b>
                questions&nbsp;&quot;
                {questionIds.map(q => getSurveyQuestionText(surveyQuestions, q)).join(", ")}
                 &quot;
            </b>
            &nbsp;should sum up to&nbsp;
            <b>{validSum}</b>.
        </p>
    );
}

function IncompatibleAnswersRuleBody({answerId1, answerId2, questionId1, questionId2, surveyQuestions}) {
    return (
        <div className="card-text">
            The answer&nbsp;
            <b>
                {getSurveyAnswerText(surveyQuestions, questionId1, answerId1)}
            </b>
            &nbsp;from&nbsp;
            <b>
                question &quot;{getSurveyQuestionText(surveyQuestions, questionId1)}&quot;
            </b>
            &nbsp;is incompatible with the answer&nbsp;
            <b>
                {getSurveyAnswerText(surveyQuestions, questionId2, answerId2)}
            </b>
            &nbsp;from&nbsp;
            <b>
                question &quot;{getSurveyQuestionText(surveyQuestions, questionId2)}&quot;
            </b>.
        </div>
    );
}

function MatchingSumsRuleBody({questionIds1, questionIds2, surveyQuestions}) {
    const [isQuestionIds1Multiple, isQuestionIds2Multiple] = [questionIds1.length > 1, questionIds2.length > 1];
    const surveyQuestionText1 = questionIds1.map(q => getSurveyQuestionText(surveyQuestions, q));
    const surveyQuestionText2 = questionIds2.map(q => getSurveyQuestionText(surveyQuestions, q));
    return (
        <p className="card-text">
            The {isQuestionIds1Multiple ? "sum of the answers" : "answer"} to&nbsp;
            <b>
                question{isQuestionIds1Multiple ? "s " : " "}
                &quot;{surveyQuestionText1.join(", ")}&quot;
            </b>
            &nbsp;should be equal to the {isQuestionIds2Multiple ? "sum of the answers" : "answer"} to&nbsp;
            <b>
                question{isQuestionIds2Multiple ? "s " : " "}
                &quot;{surveyQuestionText2.join(", ")}&quot;
            </b>.
        </p>
    );
}

function NumericRangeRuleBody({questionId, min, max, surveyQuestions}) {
    return (
        <p className="card-text">
            The answer to&nbsp;
            <b>
                question &quot;{getSurveyQuestionText(surveyQuestions, questionId)}&quot;
            </b>
                &nbsp;should be between:&nbsp;
            <b>{min} and {max}</b>.
        </p>
    );
}

function TextMatchRuleBody({questionId, regex, surveyQuestions}) {
    return (
        <p className="card-text">
            The answer to&nbsp;
            <b>
                question &quot;{getSurveyQuestionText(surveyQuestions, questionId)}&quot;
            </b>
                &nbsp;should match the pattern:&nbsp;
            <b>{regex}</b>.
        </p>
    );
}

function SurveyRuleCard({title, Body}) {
    return (
        <div className="card" style={{width: "100%"}}>
            <div className="card-body pt-2 pb-3">
                <h3>{title}</h3>
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
