import React from "react";
import _ from "lodash";

import SvgIcon from "../components/svg/SvgIcon";

function getSurveyQuestionText(surveyQuestions, questionId) {
    return _.get(surveyQuestions, [questionId, "question"], "");
}

function getSurveyAnswerText(surveyQuestions, questionId, answerId) {
    return _.get(surveyQuestions, [questionId, "answers", answerId, "answer"], "");
}

function SumOfAnswersRuleBody({questionIds, validSum, surveyQuestions}) {
    return (
        <p className="card-text">
            The answers to questions&nbsp;
            <b>
                &quot;
                {questionIds.map(q => getSurveyQuestionText(surveyQuestions, q)).join("\", \"")}
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
                &quot;{getSurveyAnswerText(surveyQuestions, questionId1, answerId1)}&quot;
            </b>
            &nbsp;from question&nbsp;
            <b>
               &quot;{getSurveyQuestionText(surveyQuestions, questionId1)}&quot;
            </b>
            &nbsp;is incompatible with the answer&nbsp;
            <b>
                &quot;{getSurveyAnswerText(surveyQuestions, questionId2, answerId2)}&quot;
            </b>
            &nbsp;from question&nbsp;
            <b>
                &quot;{getSurveyQuestionText(surveyQuestions, questionId2)}&quot;
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
            The {isQuestionIds1Multiple ? "sum of the answers" : "answer"} to question{isQuestionIds1Multiple ? "s " : " "}
            <b>
                &quot;{surveyQuestionText1.join("\", \"")}&quot;
            </b>
            &nbsp;should be equal to the {isQuestionIds2Multiple ? "sum of the answers" : "answer"} to question{isQuestionIds2Multiple ? "s " : " "}
            <b>
                &quot;{surveyQuestionText2.join("\", \"")}&quot;
            </b>.
        </p>
    );
}

function NumericRangeRuleBody({questionId, min, max, surveyQuestions}) {
    return (
        <p className="card-text">
            The answer to question&nbsp;
            <b>
                &quot;{getSurveyQuestionText(surveyQuestions, questionId)}&quot;
            </b>
                &nbsp;should be between&nbsp;
            <b>{min} and {max}</b>.
        </p>
    );
}

function TextMatchRuleBody({questionId, regex, surveyQuestions}) {
    return (
        <p className="card-text">
            The answer to question&nbsp;
            <b>
                &quot;{getSurveyQuestionText(surveyQuestions, questionId)}&quot;
            </b>
                &nbsp;should match the pattern&nbsp;
            <b>{regex}</b>.
        </p>
    );
}

export default function SurveyRule({inDesignMode, rule, surveyQuestions, setProjectDetails, surveyRules}) {
    const removeRule = () => {
        const newSurveyRules = surveyRules.filter(r => r.id !== rule.id);
        setProjectDetails({surveyRules: newSurveyRules});
    };
    const {RuleBody, title} = {
        "text-match": {
            RuleBody: () => <TextMatchRuleBody {...rule} surveyQuestions={surveyQuestions}/>,
            title: "Text Match"
        },
        "numeric-range": {
            RuleBody:() => <NumericRangeRuleBody {...rule} surveyQuestions={surveyQuestions}/>,
            title:"Numeric Range"
        },
        "sum-of-answers": {
            RuleBody: () => <SumOfAnswersRuleBody {...rule} surveyQuestions={surveyQuestions}/>,
            title: "Sum of Answers"
        },
        "matching-sums": {
            RuleBody: () => <MatchingSumsRuleBody {...rule} surveyQuestions={surveyQuestions}/>,
            title: "Matching Sums"
        },
        "incompatible-answers": {
            RuleBody: () => <IncompatibleAnswersRuleBody {...rule} surveyQuestions={surveyQuestions}/>,
            title: "Incompatible Answers"
        }
    }[rule.ruleType];

    return (
        <div className="d-flex flex-column mb-1" style={{flex: 1}}>
            <div className="card" style={{width: "100%"}}>
                <div className="card-body pt-2 pb-2">
                    <div
                        style={{
                            alignItems: "baseline",
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "start"
                        }}
                    >
                        {inDesignMode && (
                            <button
                                className="btn btn-sm btn-outline-red"
                                onClick={removeRule}
                                title="Delete Rule"
                                type="button"
                            >
                                <SvgIcon icon="trash" size="1rem"/>
                            </button>
                        )}
                        <h3 style={{marginBottom: 0, marginLeft: 6}}>{rule.id + 1}. {title}</h3>
                    </div>
                    <hr style={{margin: "0.5rem 0"}}/>
                    <RuleBody/>
                </div>
            </div>
        </div>
    );
}
