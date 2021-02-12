import React from "react";

import {UnicodeIcon, removeEnumerator} from "../utils/generalUtils";

export default function SurveyCardList(props) {
    const topLevelNodes = props.surveyQuestions
        .filter(sq => sq.parentQuestion === -1)
        .sort((a, b) => a.id - b.id);

    return topLevelNodes.map((sq, index) =>
        <SurveyCard
            key={index}
            topLevelNodeIds={topLevelNodes.map(tln => tln.id)}
            cardNumber={index + 1}
            inDesignMode={props.inDesignMode}
            setProjectDetails={props.setProjectDetails}
            surveyQuestion={sq}
            surveyQuestions={props.surveyQuestions}
            surveyRules={props.surveyRules}
            removeAnswer={props.removeAnswer}
            removeQuestion={props.removeQuestion}
            newAnswerComponent={props.newAnswerComponent}
        />
    );
}

class SurveyCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showQuestions: true,
        };
    }

    swapId = (val, checkVal, swapVal) =>
        val === checkVal ? swapVal
            : val === swapVal ? checkVal
                : val;

    swapQuestionIds = (upOrDown) => {
        const myId = this.props.surveyQuestion.id;
        const swapId = this.props.topLevelNodeIds[
            this.props.topLevelNodeIds.indexOf(this.props.surveyQuestion.id) + upOrDown
        ];
        this.props.setProjectDetails({
            surveyQuestions: this.props.surveyQuestions
                .map(sq => ({
                    ...sq,
                    id: this.swapId(sq.id, myId, swapId),
                    parentQuestion: this.swapId(sq.parentQuestion, myId, swapId),
                })),
        });
    };

    getRulesById = (id) =>
        (this.props.surveyRules || [])
            .filter(r => r.id === id)
            .map(r => r.ruleType === "text-match"
                ? "Question '" + r.questionsText + "' should match the pattern: " + r.regex + "."
                : r.ruleType === "numeric-range"
                    ? "Question '" + r.questionsText + "' should be between " + r.min + " and " + r.max + "."
                    : r.ruleType === "sum-of-answers"
                        ? "Questions '" + r.questionsText + "' should sum up to " + r.validSum + "."
                        : r.ruleType === "matching-sums"
                            ? "Sum of '" + r.questionSetText1 + "' should be equal to sum of  '" + r.questionSetText2 + "'."
                            : "'Question1: " + r.questionText1 + ", Answer1: " + r.answerText1 + "' is not compatible with 'Question2: " + r.questionText2 + ", Answer2: " + r.answerText2 + "'.");

    render() {
        const {cardNumber, surveyQuestion, inDesignMode, topLevelNodeIds} = this.props;
        return (
            <div className="SurveyCard border rounded border-dark">
                <div className="container">
                    <div className="SurveyCard__card-description row">
                        <div className="col-10 d-flex pl-1">
                            <button
                                type="button"
                                className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                onClick={() => this.setState({showQuestions: !this.state.showQuestions})}
                            >
                                <span className="font-weight-bold">{this.state.showQuestions ? "-" : "+"}</span>
                            </button>
                            <h2 className="font-weight-bold mt-2 pt-1 ml-2">Survey Card Number {cardNumber}</h2>
                            <h3 className="m-3">
                                {!this.state.showQuestions &&
                                    `-- ${inDesignMode
                                        ? surveyQuestion.question
                                        : removeEnumerator(surveyQuestion.question)}`
                                }
                            </h3>
                        </div>
                        {inDesignMode &&
                            <div className="col-2 d-flex pr-1 justify-content-end">
                                <button
                                    type="button"
                                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                    onClick={() => this.swapQuestionIds(-1)}
                                    disabled={surveyQuestion.id === topLevelNodeIds[0]}
                                    style={{opacity: surveyQuestion.id === topLevelNodeIds[0] ? "0.25" : "1.0"}}
                                >
                                    <UnicodeIcon icon="upCaret"/>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                    onClick={() => this.swapQuestionIds(1)}
                                    disabled={surveyQuestion.id === topLevelNodeIds[topLevelNodeIds.length - 1]}
                                    style={{opacity: surveyQuestion.id === topLevelNodeIds[topLevelNodeIds.length - 1] ? "0.25" : "1.0"}}
                                >
                                    <UnicodeIcon icon="downCaret"/>
                                </button>
                            </div>
                        }
                    </div>
                    {this.state.showQuestions &&
                        <div className="SurveyCard__question-tree row d-block">
                            <SurveyQuestionTree
                                indentLevel={0}
                                inDesignMode={this.props.inDesignMode}
                                newAnswerComponent={this.props.newAnswerComponent}
                                removeAnswer={this.props.removeAnswer}
                                removeQuestion={this.props.removeQuestion}
                                surveyQuestion={this.props.surveyQuestion}
                                surveyQuestions={this.props.surveyQuestions}
                                surveyRules={this.props.surveyRules}
                                getRulesById={this.getRulesById}
                            />
                        </div>
                    }
                </div>
            </div>
        );
    }
}

function SurveyQuestionTree({
    indentLevel,
    inDesignMode,
    newAnswerComponent,
    removeAnswer,
    removeQuestion,
    surveyQuestion,
    surveyQuestions,
    surveyRules,
    getRulesById,
}) {
    const childNodes = surveyQuestions.filter(sq => sq.parentQuestion === surveyQuestion.id);
    const parentQuestion = surveyQuestions.find(sq => sq.id === surveyQuestion.parentQuestion);
    return (
        <>
            <div className="SurveyQuestionTree__question d-flex border-top pt-3 pb-1">
                {[...Array(indentLevel)].map((e, i) =>
                    <div key={i} className="pl-4">
                        <UnicodeIcon icon="rightArrow"/>
                    </div>
                )}
                <div className="Question__answers container mb-2">
                    <div className="SurveyQuestionTree__question-description pb-1 d-flex">
                        {inDesignMode &&
                            <button
                                type="button"
                                className="btn btn-outline-red py-0 px-2 mr-1"
                                onClick={() => removeQuestion(surveyQuestion.id)}
                            >
                                <span className="font-weight-bold">X</span>
                            </button>
                        }
                        <h3 className="font-weight-bold">
                            {inDesignMode ? surveyQuestion.question : removeEnumerator(surveyQuestion.question)}
                        </h3>
                    </div>
                    <div className="SurveyQuestionTree__question-information pb-1">
                        <ul className="mb-1">
                            {surveyQuestion.componentType &&
                                <li>
                                    <span className="font-weight-bold">Component Type:  </span>
                                    {surveyQuestion.componentType + " - " + surveyQuestion.dataType}
                                </li>
                            }
                            {surveyRules && surveyRules.length > 0 &&
                                <li>
                                    <span className="font-weight-bold">Rules:  </span>
                                    <ul>
                                        {surveyRules.map((rule, uid) =>
                                            [rule.questionId, rule.question1, rule.question2]
                                                .concat(rule.questions)
                                                .concat(rule.questionSetIds1)
                                                .concat(rule.questionSetIds2)
                                                .includes(surveyQuestion.id)
                                                && (
                                                    <li key={uid}>
                                                        <div className="tooltip_wrapper">
                                                            {"Rule " + rule.id + ": " + rule.ruleType}
                                                            <span className="tooltip_content">
                                                                {getRulesById(rule.id)}
                                                            </span>
                                                        </div>
                                                    </li>
                                                )
                                        )}
                                    </ul>
                                </li>
                            }
                            {surveyQuestion.parentQuestion > -1 &&
                                <>
                                    <li>
                                        <span className="font-weight-bold">Parent Question:  </span>
                                        {inDesignMode
                                            ? parentQuestion.question
                                            : removeEnumerator(parentQuestion.question)
                                        }
                                    </li>
                                    <li>
                                        <span className="font-weight-bold">Parent Answer:  </span>
                                        {surveyQuestion.parentAnswer === -1
                                            ? "Any"
                                            : parentQuestion.answers
                                                .find(ans => ans.id === surveyQuestion.parentAnswer).answer
                                        }
                                    </li>
                                </>
                            }
                        </ul>
                        <h3 className="font-weight-bold ml-3">Answers:  </h3>
                    </div>
                    <div className="SurveyQuestionTree__answers">
                        {surveyQuestion.answers.map((surveyAnswer, uid) =>
                            <ExistingAnswer
                                key={uid}
                                answer={surveyAnswer.answer}
                                color={surveyAnswer.color}
                                removeAnswer={() => inDesignMode && removeAnswer(surveyQuestion.id, surveyAnswer.id)}
                            />
                        )}
                        {inDesignMode && newAnswerComponent(surveyQuestion)}
                    </div>
                </div>
            </div>
            {childNodes.map((surveyQuestion, uid) =>
                <SurveyQuestionTree
                    key={uid}
                    indentLevel={indentLevel + 1}
                    inDesignMode={inDesignMode}
                    newAnswerComponent={newAnswerComponent}
                    removeAnswer={removeAnswer}
                    removeQuestion={removeQuestion}
                    surveyQuestion={surveyQuestion}
                    surveyQuestions={surveyQuestions}
                    surveyRules={surveyRules}
                    getRulesById={getRulesById}
                />
            )}
        </>
    );
}

function ExistingAnswer({answer, color, removeAnswer}) {
    return (
        <div className="ExistingAnswer">
            <div className="col d-flex">
                {removeAnswer &&
                    <button
                        type="button"
                        className="btn btn-outline-red py-0 px-2 mr-1"
                        onClick={removeAnswer}
                    >
                        <span className="font-weight-bold">X</span>
                    </button>
                }
                <div className="ExistingAnswer__circle">
                    <div
                        className="circle mt-1 mr-3"
                        style={{backgroundColor: color, border: "solid 1px"}}
                    >
                    </div>
                </div>
                <div className="ExistingAnswer__answer">
                    {answer}
                </div>
            </div>
        </div>
    );
}
