import React from "react";

import SvgIcon, {ButtonSvgIcon} from "../components/svg/SvgIcon";
import {removeEnumerator} from "../utils/generalUtils";

export default function SurveyCardList(props) {
    const topLevelNodes = props.surveyQuestions
        .filter(sq => sq.parentQuestion === -1)
        .sort((a, b) => a.id - b.id);

    return topLevelNodes.map((sq, index) => (
        <SurveyCard
            key={sq.id}
            cardNumber={index + 1}
            inDesignMode={props.inDesignMode}
            newAnswerComponent={props.newAnswerComponent}
            removeAnswer={props.removeAnswer}
            removeQuestion={props.removeQuestion}
            setProjectDetails={props.setProjectDetails}
            surveyQuestion={sq}
            surveyQuestions={props.surveyQuestions}
            surveyRules={props.surveyRules}
            topLevelNodeIds={topLevelNodes.map(tln => tln.id)}
        />
    ));
}

class SurveyCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showQuestions: true
        };
    }

    swapId = (val, checkVal, swapVal) => (val === checkVal ? swapVal
        : val === swapVal ? checkVal
            : val);

    swapQuestionIds = upOrDown => {
        const myId = this.props.surveyQuestion.id;
        const swapId = this.props.topLevelNodeIds[
            this.props.topLevelNodeIds.indexOf(this.props.surveyQuestion.id) + upOrDown
        ];
        this.props.setProjectDetails({
            surveyQuestions: this.props.surveyQuestions
                .map(sq => ({
                    ...sq,
                    id: this.swapId(sq.id, myId, swapId),
                    parentQuestion: this.swapId(sq.parentQuestion, myId, swapId)
                }))
        });
    };

    getRulesById = id => (this.props.surveyRules || [])
        .filter(r => r.id === id)
        .map(r => (r.ruleType === "text-match"
            ? "Question '" + r.questionsText + "' should match the pattern: " + r.regex + "."
            : r.ruleType === "numeric-range"
                ? "Question '" + r.questionsText + "' should be between " + r.min + " and " + r.max + "."
                : r.ruleType === "sum-of-answers"
                    ? "Questions '" + r.questionsText + "' should sum up to " + r.validSum + "."
                    : r.ruleType === "matching-sums"
                        ? "Sum of '" + r.questionSetText1 + "' should be equal to sum of  '" + r.questionSetText2 + "'."
                        : "'Question1: " + r.questionText1 + ", Answer1: " + r.answerText1 + "' is not compatible with 'Question2: " + r.questionText2 + ", Answer2: " + r.answerText2 + "'."));

    render() {
        const {cardNumber, surveyQuestion, inDesignMode, topLevelNodeIds} = this.props;
        return (
            <div className="SurveyCard border rounded border-dark">
                <div className="container">
                    <div className="SurveyCard__card-description row">
                        <div className="col-10 d-flex pl-1">
                            <button
                                className="btn btn-outline-lightgreen my-2"
                                onClick={() => this.setState({showQuestions: !this.state.showQuestions})}
                                type="button"
                            >
                                {this.state.showQuestions ? <ButtonSvgIcon icon="minus" size="0.9rem"/> : <ButtonSvgIcon icon="plus" size="0.9rem"/>}
                            </button>
                            <h2 className="font-weight-bold mt-2 pt-1 ml-2">Survey Card Number {cardNumber}</h2>
                            <h3 className="m-3">
                                {!this.state.showQuestions
                                    && `-- ${inDesignMode
                                        ? surveyQuestion.question
                                        : removeEnumerator(surveyQuestion.question)}`}
                            </h3>
                        </div>
                        {inDesignMode && (
                            <div className="col-2 d-flex pr-1 justify-content-end">
                                <button
                                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                    disabled={surveyQuestion.id === topLevelNodeIds[0]}
                                    onClick={() => this.swapQuestionIds(-1)}
                                    style={{opacity: surveyQuestion.id === topLevelNodeIds[0] ? "0.25" : "1.0"}}
                                    type="button"
                                >
                                    <ButtonSvgIcon icon="upCaret" size="1rem"/>
                                </button>
                                <button
                                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                    disabled={surveyQuestion.id === topLevelNodeIds[topLevelNodeIds.length - 1]}
                                    onClick={() => this.swapQuestionIds(1)}
                                    style={{opacity: surveyQuestion.id === topLevelNodeIds[topLevelNodeIds.length - 1] ? "0.25" : "1.0"}}
                                    type="button"
                                >
                                    <ButtonSvgIcon icon="downCaret" size="1rem"/>
                                </button>
                            </div>
                        )}
                    </div>
                    {this.state.showQuestions && (
                        <div className="SurveyCard__question-tree row d-block">
                            <SurveyQuestionTree
                                getRulesById={this.getRulesById}
                                indentLevel={0}
                                inDesignMode={this.props.inDesignMode}
                                newAnswerComponent={this.props.newAnswerComponent}
                                removeAnswer={this.props.removeAnswer}
                                removeQuestion={this.props.removeQuestion}
                                surveyQuestion={this.props.surveyQuestion}
                                surveyQuestions={this.props.surveyQuestions}
                                surveyRules={this.props.surveyRules}
                            />
                        </div>
                    )}
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
    getRulesById
}) {
    const childNodes = surveyQuestions.filter(sq => sq.parentQuestion === surveyQuestion.id);
    const parentQuestion = surveyQuestions.find(sq => sq.id === surveyQuestion.parentQuestion);
    return (
        <>
            <div className="SurveyQuestionTree__question d-flex border-top pt-3 pb-1">
                {[...Array(indentLevel)].map(l => (
                    <div key={l} className="pl-5" style={{cursor: "default"}}>
                        <SvgIcon icon="downRightArrow" size="1.4rem"/>
                    </div>
                ))}
                <div className="Question__answers container mb-2">
                    <div className="SurveyQuestionTree__question-description pb-1 d-flex">
                        {inDesignMode && (
                            <button
                                className="btn btn-outline-red py-0 px-2 mr-1"
                                onClick={() => removeQuestion(surveyQuestion.id)}
                                type="button"
                            >
                                <ButtonSvgIcon icon="trash" size="1rem"/>
                            </button>
                        )}
                        <h3 className="font-weight-bold">
                            {inDesignMode ? surveyQuestion.question : removeEnumerator(surveyQuestion.question)}
                        </h3>
                    </div>
                    <div className="SurveyQuestionTree__question-information pb-1">
                        <ul className="mb-1">
                            {surveyQuestion.componentType && (
                                <li>
                                    <span className="font-weight-bold">Component Type:  </span>
                                    {surveyQuestion.componentType + " - " + surveyQuestion.dataType}
                                </li>
                            )}
                            {surveyRules && surveyRules.length > 0 && (
                                <li>
                                    <span className="font-weight-bold">Rules:  </span>
                                    <ul>
                                        {surveyRules.map(rule =>
                                            [rule.questionId, rule.question1, rule.question2]
                                                .concat(rule.questions)
                                                .concat(rule.questionSetIds1)
                                                .concat(rule.questionSetIds2)
                                                .includes(surveyQuestion.id)
                                                && (
                                                    <li key={rule.id}>
                                                        <div className="tooltip_wrapper">
                                                            {"Rule " + rule.id + ": " + rule.ruleType}
                                                            <span className="tooltip_content">
                                                                {getRulesById(rule.id)}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))}
                                    </ul>
                                </li>
                            )}
                            {surveyQuestion.parentQuestion > -1 && (
                                <>
                                    <li>
                                        <span className="font-weight-bold">Parent Question:  </span>
                                        {inDesignMode
                                            ? parentQuestion.question
                                            : removeEnumerator(parentQuestion.question)}
                                    </li>
                                    <li>
                                        <span className="font-weight-bold">Parent Answer:  </span>
                                        {surveyQuestion.parentAnswer === -1
                                            ? "Any"
                                            : parentQuestion.answers
                                                .find(ans => ans.id === surveyQuestion.parentAnswer).answer}
                                    </li>
                                </>
                            )}
                        </ul>
                        <h3 className="font-weight-bold ml-3">
                            {surveyQuestion.componentType === "input" ? "Placeholder" : "Answers"}:
                        </h3>
                    </div>
                    <div className="SurveyQuestionTree__answers">
                        {surveyQuestion.answers.map(surveyAnswer => (
                            <ExistingAnswer
                                key={surveyAnswer.id}
                                answer={surveyAnswer.answer}
                                color={surveyAnswer.color}
                                inDesignMode={inDesignMode}
                                removeAnswer={() => inDesignMode && removeAnswer(surveyQuestion.id, surveyAnswer.id)}
                            />
                        ))}
                        {inDesignMode && newAnswerComponent(surveyQuestion)}
                    </div>
                </div>
            </div>
            {childNodes.map(childQuestion => (
                <SurveyQuestionTree
                    key={childQuestion.id}
                    getRulesById={getRulesById}
                    indentLevel={indentLevel + 1}
                    inDesignMode={inDesignMode}
                    newAnswerComponent={newAnswerComponent}
                    removeAnswer={removeAnswer}
                    removeQuestion={removeQuestion}
                    surveyQuestion={childQuestion}
                    surveyQuestions={surveyQuestions}
                    surveyRules={surveyRules}
                />
            ))}
        </>
    );
}

function ExistingAnswer({answer, color, inDesignMode, removeAnswer}) {
    return (
        <div className="ExistingAnswer">
            <div className="col d-flex">
                {removeAnswer && inDesignMode && (
                    <button
                        className="btn btn-outline-red py-0 px-2 mr-1"
                        onClick={removeAnswer}
                        type="button"
                    >
                        <ButtonSvgIcon icon="trash" size="1rem"/>
                    </button>
                )}
                <div className="ExistingAnswer__circle">
                    <div
                        className="circle mt-1 mr-3"
                        style={{backgroundColor: color, border: "solid 1px"}}
                    />
                </div>
                <div className="ExistingAnswer__answer">
                    {answer}
                </div>
            </div>
        </div>
    );
}
