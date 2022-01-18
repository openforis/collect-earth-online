import React from "react";
import _ from "lodash";

import SurveyRule from "../components/SurveyRule";
import SvgIcon from "../components/svg/SvgIcon";
import {removeEnumerator} from "../utils/generalUtils";
import {mapObject, mapObjectArray, filterObject} from "../utils/sequence";

export default function SurveyCardList(props) {
    const topLevelNodes = mapObjectArray(
        filterObject(props.surveyQuestions, ([_id, sq]) => sq.parentQuestionId === -1),
        ([id, _sq]) => Number(id)
    );
    return topLevelNodes.map((nodeId, idx) => (
        <SurveyCard
            key={nodeId}
            cardNumber={idx + 1}
            inDesignMode={props.inDesignMode}
            newAnswerComponent={props.newAnswerComponent}
            removeAnswer={props.removeAnswer}
            removeQuestion={props.removeQuestion}
            setProjectDetails={props.setProjectDetails}
            surveyQuestionId={nodeId}
            surveyQuestions={props.surveyQuestions}
            surveyRules={props.surveyRules}
            topLevelNodeIds={topLevelNodes}
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
        const {surveyQuestions, surveyQuestionId, topLevelNodeIds} = this.props;
        const newId = topLevelNodeIds[
            this.props.topLevelNodeIds.indexOf(surveyQuestionId) + upOrDown
        ];
        this.props.setProjectDetails({
            surveyQuestions: mapObject(surveyQuestions, ([key, val]) => [
                this.swapId(Number(key), surveyQuestionId, newId),
                {...val, parentQuestionId: this.swapId(val.parentQuestionId, surveyQuestionId, newId)}
            ])
        });
    };

    getSurveyQuestionText = questionId => {
        const {surveyQuestions} = this.props;
        return _.get(surveyQuestions, [questionId, "question"], "");
    };

    getSurveyAnswerText = (questionId, answerId) => {
        const {surveyQuestions} = this.props;
        return _.get(surveyQuestions, [questionId, "answers", answerId, "answer"], "");
    };

    render() {
        const {cardNumber, surveyQuestions, surveyQuestionId, inDesignMode, topLevelNodeIds} = this.props;
        const {question} = surveyQuestions[surveyQuestionId];
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
                                {this.state.showQuestions ? <SvgIcon icon="minus" size="0.9rem"/> : <SvgIcon icon="plus" size="0.9rem"/>}
                            </button>
                            <h2 className="font-weight-bold mt-2 pt-1 ml-2">Survey Card Number {cardNumber}</h2>
                            <h3 className="m-3">
                                {!this.state.showQuestions
                                    && `-- ${inDesignMode
                                        ? question
                                        : removeEnumerator(question)}`}
                            </h3>
                        </div>
                        {inDesignMode && (
                            <div className="col-2 d-flex pr-1 justify-content-end">
                                <button
                                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                    disabled={surveyQuestionId === topLevelNodeIds[0]}
                                    onClick={() => this.swapQuestionIds(-1)}
                                    style={{opacity: surveyQuestionId === topLevelNodeIds[0] ? "0.25" : "1.0"}}
                                    type="button"
                                >
                                    <SvgIcon icon="upCaret" size="1rem"/>
                                </button>
                                <button
                                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                    disabled={surveyQuestionId === topLevelNodeIds[topLevelNodeIds.length - 1]}
                                    onClick={() => this.swapQuestionIds(1)}
                                    style={{opacity: surveyQuestionId === topLevelNodeIds[topLevelNodeIds.length - 1] ? "0.25" : "1.0"}}
                                    type="button"
                                >
                                    <SvgIcon icon="downCaret" size="1rem"/>
                                </button>
                            </div>
                        )}
                    </div>
                    {this.state.showQuestions && (
                        <div className="SurveyCard__question-tree row d-block">
                            <SurveyQuestionTree
                                key={this.props.surveyQuestionId}
                                indentLevel={0}
                                inDesignMode={this.props.inDesignMode}
                                newAnswerComponent={this.props.newAnswerComponent}
                                removeAnswer={this.props.removeAnswer}
                                removeQuestion={this.props.removeQuestion}
                                setProjectDetails={this.props.setProjectDetails}
                                surveyQuestionId={this.props.surveyQuestionId}
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
    setProjectDetails,
    surveyQuestionId,
    surveyQuestions,
    surveyRules
}) {
    const surveyQuestion = surveyQuestions[surveyQuestionId];
    const childNodeIds = mapObjectArray(
        filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestionId === surveyQuestionId),
        ([key, _val]) => Number(key)
    );
    const parentQuestion = surveyQuestions[surveyQuestion.parentQuestionId];
    const deleteSurveyRule = ruleId => {
        const newSurveyRules = surveyRules.filter(rule => rule.id !== ruleId);
        setProjectDetails({surveyRules: newSurveyRules});
    };
    return (
        <>
            <div className="SurveyQuestionTree__question d-flex border-top pt-3 pb-1">
                {[...Array(indentLevel)].map((l, idx) => (
                    <div key={idx} className="pl-5" style={{cursor: "default"}}>
                        <SvgIcon icon="downRightArrow" size="1.4rem"/>
                    </div>
                ))}
                <div className="Question__answers container mb-2">
                    <div className="SurveyQuestionTree__question-description pb-1 d-flex">
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
                                        <span className="font-weight-bold">Parent Question:  </span>
                                        {inDesignMode
                                            ? parentQuestion.question
                                            : removeEnumerator(parentQuestion.question)}
                                    </li>
                                    <li>
                                        <span className="font-weight-bold">Parent Answer:  </span>
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
                    <div className="SurveyQuestionTree__answers">
                        {mapObjectArray(surveyQuestion.answers, ([answerId, surveyAnswer]) => (
                            <ExistingAnswer
                                key={`${surveyQuestionId}-${answerId}`}
                                answer={surveyAnswer.answer}
                                color={surveyAnswer.color}
                                inDesignMode={inDesignMode}
                                removeAnswer={() => removeAnswer(surveyQuestionId, Number(answerId))}
                            />
                        ))}
                        {inDesignMode && newAnswerComponent([surveyQuestionId, surveyQuestion])}
                    </div>
                </div>
            </div>
            {childNodeIds.map(childId => (
                <SurveyQuestionTree
                    key={childId}
                    indentLevel={indentLevel + 1}
                    inDesignMode={inDesignMode}
                    newAnswerComponent={newAnswerComponent}
                    removeAnswer={removeAnswer}
                    removeQuestion={removeQuestion}
                    surveyQuestionId={childId}
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
                {inDesignMode && (
                    <button
                        className="btn btn-outline-red py-0 px-2 mr-1"
                        onClick={removeAnswer}
                        type="button"
                    >
                        <SvgIcon icon="trash" size="1rem"/>
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
