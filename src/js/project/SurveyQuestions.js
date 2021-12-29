import React from "react";

import SurveyCardList from "./SurveyCardList";
import {SurveyCollection} from "../components/SurveyCollection";
import SvgIcon from "../components/svg/SvgIcon";

import {removeEnumerator} from "../utils/generalUtils";
import {ProjectContext} from "./constants";

export class SurveyQuestionDesign extends React.Component {
    getChildQuestionIds = questionId => {
        const childQuestions = this.context.surveyQuestions.filter(sq => sq.parentQuestion === questionId);
        return childQuestions.length === 0
            ? [questionId]
            : childQuestions.reduce((acc, cur) => [...acc, ...this.getChildQuestionIds(cur.id)], [questionId]);
    };

    removeQuestion = questionId => {
        const questionsToRemove = this.getChildQuestionIds(questionId);
        const newSurveyQuestions = this.context.surveyQuestions
            .filter(sq => !questionsToRemove.includes(sq.id));
        this.context.setProjectDetails({surveyQuestions: newSurveyQuestions});
    };

    removeAnswer = (questionId, answerId) => {
        const matchingQuestion = this.context.surveyQuestions
            .find(sq => sq.parentQuestion === questionId && sq.parentAnswer === answerId);
        if (matchingQuestion) {
            alert("You cannot remove this answer because a sub question ("
                + matchingQuestion.question
                + ") is referencing it.");
        } else {
            const surveyQuestion = this.context.surveyQuestions.find(sq => sq.id === questionId);
            const updatedAnswers = surveyQuestion.answers.filter(ans => ans.id !== answerId);
            const updatedQuestion = {...surveyQuestion, answers: updatedAnswers};
            const newSurveyQuestions = this.context.surveyQuestions
                .map(sq => (sq.id === updatedQuestion.id ? updatedQuestion : sq));
            this.context.setProjectDetails({surveyQuestions: newSurveyQuestions});
        }
    };

    maxAnswers = (componentType, dataType) => ((componentType || "").toLowerCase() === "input" ? 1
        : (dataType || "").toLowerCase() === "boolean" ? 2
            : 1000);

    render() {
        return (
            <div id="survey-design">
                <SurveyCardList
                    inDesignMode
                    newAnswerComponent={surveyQuestion => surveyQuestion.answers.length
                                < this.maxAnswers(surveyQuestion.componentType, surveyQuestion.dataType)
                                && (
                                    <NewAnswerDesigner
                                        setProjectDetails={this.context.setProjectDetails}
                                        surveyQuestion={surveyQuestion}
                                        surveyQuestions={this.context.surveyQuestions}
                                    />
                                )}
                    removeAnswer={this.removeAnswer}
                    removeQuestion={this.removeQuestion}
                    setProjectDetails={this.context.setProjectDetails}
                    surveyQuestions={this.context.surveyQuestions}
                    surveyRules={this.context.surveyRules}
                />
                <NewQuestionDesigner
                    setProjectDetails={this.context.setProjectDetails}
                    surveyQuestions={this.context.surveyQuestions}
                    surveyRules={this.context.surveyRules}
                />
            </div>
        );
    }
}
SurveyQuestionDesign.contextType = ProjectContext;

class NewQuestionDesigner extends React.Component {
    constructor(props) {
        super(props);
        this.componentTypes = [
            {componentType: "button", dataType: "text"},
            {componentType: "button", dataType: "number"},
            {componentType: "input", dataType: "number"},
            {componentType: "input", dataType: "text"},
            {componentType: "radiobutton", dataType: "boolean"},
            {componentType: "radiobutton", dataType: "text"},
            {componentType: "radiobutton", dataType: "number"},
            {componentType: "dropdown", dataType: "boolean"},
            {componentType: "dropdown", dataType: "text"},
            {componentType: "dropdown", dataType: "number"}
        ];

        this.state = {
            selectedAnswer: -1,
            selectedParent: -1,
            selectedType: 0,
            newQuestionText: ""
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.surveyQuestions.length !== prevProps.surveyQuestions.length) {
            if (!this.props.surveyQuestions.find(question => question.id === this.state.selectedParent)) {
                this.setState({selectedParent: -1});
            }
        }

        if (this.state.selectedParent !== prevState.selectedParent) {
            this.setState({selectedAnswer: -1});
        }
    }

    addSurveyQuestion = () => {
        if (this.state.newQuestionText !== "") {
            const {surveyQuestions, setProjectDetails} = this.props;
            const {dataType, componentType} = this.componentTypes[this.state.selectedType];
            const repeatedQuestions = surveyQuestions.filter(sq =>
                removeEnumerator(sq.question) === this.state.newQuestionText).length;

            if (repeatedQuestions === 0
                || confirm("Warning: This is a duplicate name.  It will be added as "
                           + `${this.state.newQuestionText} (${repeatedQuestions}) in design mode.`)) {
                const newQuestion = {
                    id: surveyQuestions.reduce((p, c) => Math.max(p, c.id), 0) + 1,
                    question: repeatedQuestions > 0
                        ? this.state.newQuestionText + ` (${repeatedQuestions})`
                        : this.state.newQuestionText,
                    answers: [],
                    parentQuestion: this.state.selectedParent,
                    parentAnswer: this.state.selectedAnswer,
                    dataType,
                    componentType
                };
                setProjectDetails({surveyQuestions: [...surveyQuestions, newQuestion]});
                this.setState({selectedAnswer: -1, newQuestionText: ""});
            }
        } else {
            alert("Please enter a survey question first.");
        }
    };

    render() {
        const selectedParent = this.props.surveyQuestions.find(question => question.id === this.state.selectedParent);
        return (
            <table className="mt-4">
                <tbody>
                    <tr>
                        <td>
                            <label htmlFor="value-component-type">Component Type:</label>
                        </td>
                        <td>
                            <select
                                className="form-control form-control-sm"
                                id="value-component-type"
                                onChange={e => this.setState({selectedType: parseInt(e.target.value)})}
                                size="1"
                                value={this.state.selectedType}
                            >
                                {this.componentTypes.map((type, idx) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <option key={idx} value={idx}>
                                        {`${type.componentType} - ${type.dataType}`}
                                    </option>
                                ))}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="value-parent">Parent Question:</label>
                        </td>
                        <td>
                            <select
                                className="form-control form-control-sm"
                                id="value-parent"
                                onChange={e => this.setState({selectedParent: parseInt(e.target.value)})}
                                size="1"
                                value={this.state.selectedParent}
                            >
                                <option key={-1} value={-1}>None</option>
                                {this.props.surveyQuestions.length > 0
                                    ? this.props.surveyQuestions
                                        .filter(question => question.componentType !== "input")
                                        .map(question => (
                                            <option key={question.id} value={question.id}>
                                                {question.question}
                                            </option>
                                        ))
                                    : ""}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="value-answer">Parent Answer:</label>
                        </td>
                        <td>
                            <select
                                className="form-control form-control-sm"
                                id="value-answer"
                                onChange={e => this.setState({selectedAnswer: parseInt(e.target.value)})}
                                size="1"
                                value={this.state.selectedAnswer}
                            >
                                <option key={-1} value={-1}>Any</option>
                                {this.state.selectedParent > 0 && selectedParent
                                    ? selectedParent
                                        .answers
                                        .map(answer => (
                                            <option key={answer.id} value={answer.id}>
                                                {answer.answer}
                                            </option>
                                        ))
                                    : ""}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label>New Question:</label>
                        </td>
                        <td>
                            <div id="add-sample-value-group">
                                <input
                                    autoComplete="off"
                                    maxLength="210"
                                    onChange={e => this.setState({newQuestionText: e.target.value})}
                                    type="text"
                                    value={this.state.newQuestionText}
                                />
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <button
                                className="btn btn-sm btn-success"
                                onClick={this.addSurveyQuestion}
                                style={{
                                    alignItems: "center",
                                    display: "flex",
                                    justifyContent: "center"
                                }}
                                type="button"
                            >
                                <SvgIcon icon="plus" size="0.9rem"/>
                                &nbsp;&nbsp;Add Survey Question
                            </button>
                        </td>
                        <td/>
                    </tr>
                </tbody>
            </table>
        );
    }
}

class NewAnswerDesigner extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedColor: "#1527f6",
            newAnswerText: ""
        };
    }

    addSurveyAnswer = () => {
        const {surveyQuestion, surveyQuestions, setProjectDetails} = this.props;
        if (this.state.newAnswerText.length > 0) {
            const newAnswer = {
                id: surveyQuestion.answers.reduce((a, c) => Math.max(a, c.id), 0) + 1,
                answer: this.state.newAnswerText,
                color: this.state.selectedColor
            };
            const updatedAnswers = [...surveyQuestion.answers, newAnswer];
            const updatedQuestion = {...surveyQuestion, answers: updatedAnswers};
            const newSurveyQuestions = surveyQuestions
                .map(sq => (sq.id === updatedQuestion.id ? updatedQuestion : sq));
            setProjectDetails({surveyQuestions: newSurveyQuestions});
            this.setState({selectedColor: "#1527f6", newAnswerText: ""});
        } else {
            alert("Please enter a value for the answer.");
        }
    };

    render() {
        return (
            <div className="NewAnswerDesigner">
                <div className="col d-flex">
                    <button
                        className="btn btn-success py-0 px-2 mr-1"
                        onClick={this.addSurveyAnswer}
                        type="button"
                    >
                        <SvgIcon icon="plus" size="0.9rem"/>
                    </button>
                    <input
                        className="value-color mx-2 mt-1"
                        onChange={e => this.setState({selectedColor: e.target.value})}
                        type="color"
                        value={this.state.selectedColor}
                    />
                    <input
                        autoComplete="off"
                        className="value-name"
                        maxLength="120"
                        onChange={e => this.setState({newAnswerText: e.target.value})}
                        onKeyDown={e => {
                            if (e.key === "e" && this.props.surveyQuestion.dataType === "number") e.preventDefault();
                        }}
                        type={this.props.surveyQuestion.dataType === "number" ? "number" : "text"}
                        value={this.state.newAnswerText}
                    />
                </div>
            </div>
        );
    }
}

export class SurveyQuestionHelp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            answerMode: "question",
            flaggedReason: "",
            isFlagged: false,
            selectedQuestion: {id: 0, question: "", answers: [], answered: [], visible: [1]},
            userSamples: {1: {}},
            unansweredColor: "black",
            visibleAnswered: {}
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.context.surveyQuestions.length > 0
            && this.state.userSamples !== prevState.userSamples) {
            this.updateQuestionStatus();
        }
    }

    getChildQuestions = currentQuestionId => {
        const {surveyQuestions} = this.context;
        const {question, id} = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const childQuestions = surveyQuestions.filter(sq => sq.parentQuestion === id);

        return childQuestions.length === 0
            ? [question]
            : childQuestions.reduce((acc, cur) => [...acc, ...this.getChildQuestions(cur.id)], [question]);
    };

    calcVisibleSamples = currentQuestionId => {
        const {surveyQuestions} = this.context;
        const {userSamples} = this.state;
        const {parentQuestion, parentAnswer} = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const parentQuestionText = parentQuestion === -1
            ? ""
            : surveyQuestions.find(sq => sq.id === parentQuestion).question;

        if (parentQuestion === -1) {
            return [{id: 1}];
        } else {
            const correctAnswerText = surveyQuestions
                .find(sq => sq.id === parentQuestion).answers
                .find(ans => parentAnswer === -1 || ans.id === parentAnswer).answer;

            return this.calcVisibleSamples(parentQuestion)
                .filter(sample => {
                    const sampleAnswer = userSamples[sample.id][parentQuestionText]
                          && userSamples[sample.id][parentQuestionText].answer;
                    return (parentAnswer === -1 && sampleAnswer) || correctAnswerText === sampleAnswer;
                });
        }
    };

    updateQuestionStatus = () => {
        const visibleAnswered = this.context.surveyQuestions.reduce((acc, sq) => {
            const visibleSamples = this.calcVisibleSamples(sq.id);
            return ({
                ...acc,
                [sq.id]: {
                    visible: visibleSamples,
                    answered: visibleSamples
                        .filter(vs => this.state.userSamples[vs.id][sq.question])
                        .map(vs => ({
                            sampleId: vs.id,
                            answerId: this.state.userSamples[vs.id][sq.question].answerId,
                            answerText: this.state.userSamples[vs.id][sq.question].answer
                        }))
                }
            });
        }, {});

        this.setState({
            visibleAnswered,
            selectedQuestion: {...this.state.selectedQuestion, ...visibleAnswered[this.state.selectedQuestion.id]}
        });
    };

    setCurrentValue = (questionToSet, answerId, answerText) => {
        const sampleIds = [1];

        const newSamples = sampleIds.reduce((acc, sampleId) => {
            const newQuestion = {
                questionId: questionToSet.id,
                answer: answerText,
                answerId
            };

            const childQuestionArray = this.getChildQuestions(questionToSet.id);
            const clearedSubQuestions = Object.entries(this.state.userSamples[sampleId])
                .filter(entry => !childQuestionArray.includes(entry[0]))
                .reduce((acc2, cur) => ({...acc2, [cur[0]]: cur[1]}), {});

            return {
                ...acc,
                [sampleId]: {
                    ...clearedSubQuestions,
                    [questionToSet.question]: newQuestion
                }
            };
        }, {});

        this.setState({
            userSamples: {...this.state.userSamples, ...newSamples},
            selectedQuestion: questionToSet
        });
    };

    resetAnswers = () => this.setState({
        isFlagged: false,
        flaggedReason: "",
        userSamples: {1: {}}
    });

    setFlaggedReason = flaggedReason => this.setState({flaggedReason});

    toggleFlagged = () => this.setState({isFlagged: !this.state.isFlagged});

    render() {
        return (
            <div className="p-3">
                <SurveyCollection
                    allowDrawnSamples={this.context.allowDrawnSamples}
                    answerMode={this.state.answerMode}
                    flagged={this.state.isFlagged}
                    flaggedReason={this.state.flaggedReason}
                    getSelectedSampleIds={() => [1]}
                    resetPlotValues={this.resetAnswers}
                    sampleGeometries={this.context.designSettings.sampleGeometries}
                    selectedQuestion={this.state.selectedQuestion}
                    selectedSampleId={1}
                    setAnswerMode={mode => this.setState({answerMode: mode})}
                    setCurrentValue={this.setCurrentValue}
                    setFlaggedReason={this.setFlaggedReason}
                    setSelectedQuestion={newSelectedQuestion => this.setState({selectedQuestion: newSelectedQuestion})}
                    setUnansweredColor={color => this.setState({unansweredColor: color})}
                    surveyQuestions={this.context.surveyQuestions
                        .map(q => ({...q, answered: [], visible: [], ...this.state.visibleAnswered[q.id]}))}
                    surveyRules={this.context.surveyRules}
                    toggleFlagged={this.toggleFlagged}
                    unansweredColor={this.state.unansweredColor}
                />
            </div>
        );
    }
}
SurveyQuestionHelp.contextType = ProjectContext;
