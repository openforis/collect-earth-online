import React from "react";

import SurveyCardList from "./SurveyCardList";
import {SurveyCollection} from "../components/SurveyCollection";

import {removeEnumerator} from "../utils/generalUtils";
import {ProjectContext} from "./constants";

export class SurveyQuestionDesign extends React.Component {
    constructor(props) {
        super(props);
    }

    getChildQuestionIds = (questionId) => {
        const childQuestions = this.context.surveyQuestions.filter(sq => sq.parentQuestion === questionId);
        return childQuestions.length === 0
            ? [questionId]
            : childQuestions.reduce((acc, cur) => [...acc, ...this.getChildQuestionIds(cur.id)], [questionId]);
    };

    removeQuestion = (questionId) => {
        const questionsToRemove = this.getChildQuestionIds(questionId);
        const newSurveyQuestions = this.context.surveyQuestions
            .filter(sq => !questionsToRemove.includes(sq.id));
        this.context.setProjectDetails({surveyQuestions: newSurveyQuestions});
    };

    removeAnswer = (questionId, answerId) => {
        const matchingQuestion = this.context.surveyQuestions
            .find(sq => sq.parentQuestion === questionId && sq.parentAnswer === answerId);
        if (matchingQuestion) {
            alert("You cannot remove this answer because a sub question (" +
                matchingQuestion.question
                + ") is referencing it.");
        } else {
            const surveyQuestion = this.context.surveyQuestions.find(sq => sq.id === questionId);
            const updatedAnswers = surveyQuestion.answers.filter(ans => ans.id !== answerId);
            const updatedQuestion = {...surveyQuestion, answers: updatedAnswers};
            const newSurveyQuestions = this.context.surveyQuestions
                .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);
            this.context.setProjectDetails({surveyQuestions: newSurveyQuestions});
        }
    };

    maxAnswers = (componentType, dataType) =>
        (componentType || "").toLowerCase() === "input" ? 1
        : (dataType || "").toLowerCase() === "boolean" ? 2
        : 1000;

    render() {
        return (
            <div id="survey-design">
                <SurveyCardList
                    inDesignMode
                    setProjectDetails={this.context.setProjectDetails}
                    surveyQuestions={this.context.surveyQuestions}
                    surveyRules={this.context.surveyRules}
                    removeAnswer={this.removeAnswer}
                    removeQuestion={this.removeQuestion}
                    newAnswerComponent={(surveyQuestion) => surveyQuestion.answers.length
                                < this.maxAnswers(surveyQuestion.componentType, surveyQuestion.dataType)
                                &&
                                <NewAnswerDesigner
                                    setProjectDetails={this.context.setProjectDetails}
                                    surveyQuestions={this.context.surveyQuestions}
                                    surveyQuestion={surveyQuestion}
                                />
                    }
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
            {componentType: "dropdown", dataType: "number"},
        ];

        this.state = {
            selectedAnswer: -1,
            selectedParent: -1,
            selectedType: 0,
            newQuestionText: "",
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
            const repeatedQuestions = surveyQuestions.filter(sq => removeEnumerator(sq.question) === this.state.newQuestionText).length;

            if (repeatedQuestions === 0
                || confirm("Warning: This is a duplicate name.  It will be added as "
                           + this.state.newQuestionText + ` (${repeatedQuestions})` + " in design mode.")) {
                const newQuestion = {
                    id: surveyQuestions.reduce((p, c) => Math.max(p, c.id), 0) + 1,
                    question: repeatedQuestions > 0
                        ? this.state.newQuestionText + ` (${repeatedQuestions})`
                        : this.state.newQuestionText,
                    answers: [],
                    parentQuestion: this.state.selectedParent,
                    parentAnswer: this.state.selectedAnswer,
                    dataType: dataType,
                    componentType: componentType,
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
                                id="value-component-type"
                                className="form-control form-control-sm"
                                size="1"
                                onChange={e => this.setState({selectedType: parseInt(e.target.value)})}
                                value={this.state.selectedType}
                            >
                                {this.componentTypes.map((type, index) =>
                                    <option key={index} value={index}>
                                        {`${type.componentType} - ${type.dataType}`}
                                    </option>)
                                }
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="value-parent">Parent Question:</label>
                        </td>
                        <td>
                            <select
                                id="value-parent"
                                className="form-control form-control-sm"
                                size="1"
                                onChange={e => this.setState({selectedParent: parseInt(e.target.value)})}
                                value={this.state.selectedParent}
                            >
                                <option key={-1} value={-1}>None</option>
                                {this.props.surveyQuestions.length > 0
                                ? this.props.surveyQuestions
                                    .filter(question => question.componentType !== "input")
                                    .map(question =>
                                        <option key={question.id} value={question.id}>
                                            {question.question}
                                        </option>)
                                : ""
                                }
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="value-answer">Parent Answer:</label>
                        </td>
                        <td>
                            <select
                                id="value-answer"
                                className="form-control form-control-sm"
                                size="1"
                                onChange={e => this.setState({selectedAnswer: parseInt(e.target.value)})}
                                value={this.state.selectedAnswer}
                            >
                                <option key={-1} value={-1}>Any</option>
                                {this.state.selectedParent > 0 && selectedParent
                                ? selectedParent
                                    .answers
                                    .map(answer =>
                                        <option key={answer.id} value={answer.id}>
                                            {answer.answer}
                                        </option>)
                                : ""
                                }
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
                                    type="text"
                                    autoComplete="off"
                                    value={this.state.newQuestionText}
                                    onChange={e => this.setState({newQuestionText: e.target.value})}
                                    maxLength="210"
                                />
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input
                                type="button"
                                className="button"
                                value="Add Survey Question"
                                onClick={this.addSurveyQuestion}
                            />
                        </td>
                        <td></td>
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
            newAnswerText: "",
        };
    }

    addSurveyAnswer = () => {
        const {surveyQuestion, surveyQuestions, setProjectDetails} = this.props;
        if (this.state.newAnswerText.length > 0) {
            const newAnswer = {
                id: surveyQuestion.answers.reduce((a, c) => Math.max(a, c.id), 0) + 1,
                answer: this.state.newAnswerText,
                color: this.state.selectedColor,
            };
            const updatedAnswers = [...surveyQuestion.answers, newAnswer];
            const updatedQuestion = {...surveyQuestion, answers: updatedAnswers};
            const newSurveyQuestions = surveyQuestions
                .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);
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
                        type="button"
                        className="btn btn-outline-success py-0 px-2 mr-1"
                        onClick={this.addSurveyAnswer}
                    >
                        <span className="font-weight-bold">+</span>
                    </button>
                    <input
                        type="color"
                        className="value-color mx-2 mt-1"
                        value={this.state.selectedColor}
                        onChange={e => this.setState({selectedColor: e.target.value})}
                    />
                    <input
                        type={this.props.surveyQuestion.dataType === "number" ? "number" : "text"}
                        className="value-name"
                        autoComplete="off"
                        value={this.state.newAnswerText}
                        onKeyDown={e => {
                            if (e.key === "e" && this.props.surveyQuestion.dataType === "number") e.preventDefault();
                        }}
                        onChange={e => this.setState({newAnswerText: e.target.value})}
                        maxLength="120"
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
            selectedQuestion: {id: 0, question: "", answers: [], answered: [], visible: [1]},
            userSamples: {1: {}},
            unansweredColor: "black",
            visibleAnswered: {},
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.context.surveyQuestions.length > 0
            && this.state.userSamples !== prevState.userSamples) {
            this.updateQuestionStatus();
        }
    }

    getChildQuestions = (currentQuestionId) => {
        const {surveyQuestions} = this.context;
        const {question, id} = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const childQuestions = surveyQuestions.filter(sq => sq.parentQuestion === id);

        return childQuestions.length === 0
            ? [question]
            : childQuestions.reduce((acc, cur) => [...acc, ...this.getChildQuestions(cur.id)], [question]);
    };

    calcVisibleSamples = (currentQuestionId) => {
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
                            answerText: this.state.userSamples[vs.id][sq.question].answer,
                        })),
                },
            });
        }, {});

        this.setState({
            visibleAnswered: visibleAnswered,
            selectedQuestion: {...this.state.selectedQuestion, ...visibleAnswered[this.state.selectedQuestion.id]},
        });
    };

    setCurrentValue = (questionToSet, answerId, answerText) => {
        const sampleIds = [1];

        const newSamples = sampleIds.reduce((acc, sampleId) => {
            const newQuestion = {
                questionId: questionToSet.id,
                answer: answerText,
                answerId: answerId,
            };

            const childQuestionArray = this.getChildQuestions(questionToSet.id);
            const clearedSubQuestions = Object.entries(this.state.userSamples[sampleId])
                .filter(entry => !childQuestionArray.includes(entry[0]))
                .reduce((acc, cur) => ({...acc, [cur[0]]: cur[1]}), {});

            return {
                ...acc,
                [sampleId]: {
                    ...clearedSubQuestions,
                    [questionToSet.question]: newQuestion,
                },
            };

        }, {});

        this.setState({
            userSamples: {...this.state.userSamples, ...newSamples},
            selectedQuestion: questionToSet,
        });
    };

    render() {
        return (
            <div className="p-3">
                <SurveyCollection
                    surveyQuestions={this.context.surveyQuestions
                        .map(q => ({...q, answered: [], visible: [], ...this.state.visibleAnswered[q.id]}))}
                    surveyRules={this.context.surveyRules}
                    getSelectedSampleIds={(question) => [1]}
                    allowDrawnSamples={this.context.allowDrawnSamples}
                    answerMode={this.state.answerMode}
                    selectedQuestion={this.state.selectedQuestion}
                    unansweredColor={this.state.unansweredColor}
                    setAnswerMode={(mode) => this.setState({answerMode: mode})}
                    setSelectedQuestion={(newSelectedQuestion) => this.setState({selectedQuestion: newSelectedQuestion})}
                    setUnansweredColor={(color) => this.setState({unansweredColor: color})}
                    setCurrentValue={this.setCurrentValue}
                    isFlagged={false}
                    selectedSampleId={1}
                />
            </div>
        );
    }
}
SurveyQuestionHelp.contextType = ProjectContext;
