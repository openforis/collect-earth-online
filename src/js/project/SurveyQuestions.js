import React from "react";

import SurveyCardList from "./SurveyCardList";
import {removeEnumerator} from "../utils/surveyUtils";
import {ProjectContext} from "./constants";
import {SurveyCollection} from "../components/SurveyCollection";

const componentTypes = [
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

export class SurveyQuestionDesign extends React.Component {
    constructor(props) {
        super(props);
    }

    getChildQuestionIds = (questionId) => {
        const childQuestions = this.context.projectDetails.surveyQuestions.filter(sq => sq.parentQuestion === questionId);
        if (childQuestions.length === 0) {
            return [questionId];
        } else {
            return childQuestions.reduce((acc, cur) => (
                [...acc, ...this.getChildQuestionIds(cur.id)]
            ), [questionId]);
        }
    };

    removeQuestion = (questionId) => {
        const questionsToRemove = this.getChildQuestionIds(questionId);

        const newSurveyQuestions = this.context.projectDetails.surveyQuestions
            .filter(sq => !questionsToRemove.includes(sq.id));

        this.context.setProjectDetails({surveyQuestions: newSurveyQuestions});
    };

    removeAnswer = (questionId, answerId) => {
        const {surveyQuestions} = this.context.projectDetails;
        const matchingQuestion = surveyQuestions
            .find(sq => sq.parentQuestion === questionId && sq.parentAnswer === answerId);

        if (matchingQuestion) {
            alert("You cannot remove this answer because a sub question (" +
                matchingQuestion.question
                + ") is referencing it.");
        } else {
            const surveyQuestion = surveyQuestions.find(sq => sq.id === questionId);
            const updatedAnswers = surveyQuestion.answers.filter(ans => ans.id !== answerId);

            const updatedQuestion = {...surveyQuestion, answers: updatedAnswers};

            const newSurveyQuestions = surveyQuestions
                .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);

            this.context.setProjectDetails({surveyQuestions: newSurveyQuestions});
        }
    };

    maxAnswers(componentType, dataType) {
        return (componentType || "").toLowerCase() === "input"
                    ? 1 : (dataType || "").toLowerCase() === "boolean"
                        ? 2 : 1000;
    }

    render() {
        const {projectDetails, setProjectDetails} = this.context;
        return (
            <div id="survey-design">
                <SurveyCardList
                    inDesignMode
                    setProjectDetails={setProjectDetails}
                    setSurveyRules={(newRules) => setProjectDetails({surveyRules: newRules})}
                    projectDetails={projectDetails}
                    removeAnswer={this.removeAnswer}
                    removeQuestion={this.removeQuestion}
                    newAnswerComponent={(surveyQuestion) => surveyQuestion.answers.length
                                < this.maxAnswers(surveyQuestion.componentType, surveyQuestion.dataType)
                                &&
                                <NewAnswerDesigner
                                    setProjectDetails={setProjectDetails}
                                    surveyQuestions={projectDetails.surveyQuestions}
                                    surveyQuestion={surveyQuestion}
                                />
                    }
                />
                <NewQuestionDesigner
                    setProjectDetails={setProjectDetails}
                    surveyQuestions={projectDetails.surveyQuestions}
                    surveyRules = {projectDetails.surveyRules}
                    setSurveyRules = {(newRules) => setProjectDetails({surveyRules: newRules})}
                />
            </div>
        );
    }
}
SurveyQuestionDesign.contextType = ProjectContext;

class NewQuestionDesigner extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedAnswer: -1,
            selectedParent: -1,
            selectedType: 0,
            newQuestionText: "",
        };
    }

    componentDidUpdate = (prevProps, prevState) => {
        if (this.props.surveyQuestions.length !== prevProps.surveyQuestions.length) {
            if (!this.props.surveyQuestions.find(question => question.id === this.state.selectedParent)) {
                this.setState({selectedParent: -1});
            }
        }

        if (this.state.selectedParent !== prevState.selectedParent) {
            this.setState({selectedAnswer: -1});
        }
    };

    addSurveyQuestion = () => {
        if (this.state.newQuestionText !== "") {
            const {surveyQuestions} = this.props;
            const {dataType, componentType} = componentTypes[this.state.selectedType];
            const repeatedQuestions = surveyQuestions.filter(sq => removeEnumerator(sq.question) === this.state.newQuestionText).length;

            if (repeatedQuestions === 0
                || confirm("Warning: this is a duplicate name.  This will save as "
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
                this.props.setProjectDetails({surveyQuestions: [...surveyQuestions, newQuestion]});
                this.setState({selectedAnswer: -1, newQuestionText: ""});
            }
        } else {
            alert("Please enter a survey question first.");
        }
    };

    deleteSurveyRule = (event) => {
        const surveyRules = this.props.surveyRules.filter(rule => rule.id !== parseInt(event.target.id));
        this.props.setSurveyRules(surveyRules);
    };

    //   Render Functions //

    removeButton = (ruleId) => (
        <button
            type="button"
            className="btn btn-outline-red py-0 px-2 mr-1"
            onClick={e => this.deleteSurveyRule(e)}
        >
            <span
                id={ruleId}
                className="font-weight-bold"
            >
                X
            </span>
        </button>
    );

    render() {
        return (
            <>
                <table className="mt-4">
                    <tbody>
                        <tr>
                            <td>
                                <label htmlFor="value-componenttype">Component Type:</label>
                            </td>
                            <td>
                                <select
                                    id="value-componenttype"
                                    className="form-control form-control-sm"
                                    size="1"
                                    onChange={e => this.setState({selectedType: parseInt(e.target.value)})}
                                    value={this.state.selectedType}
                                >
                                    {componentTypes.map((type, index) =>
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
                                    {this.state.selectedParent > 0
                                    && this.props.surveyQuestions
                                        .find(question => question.id === this.state.selectedParent)
                                    ? this.props.surveyQuestions
                                        .find(question => question.id === this.state.selectedParent)
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
                            <td><label htmlFor="value-SQ">New Question:</label></td>
                            <td>
                                <div id="add-sample-value-group">
                                    <input
                                        type="text"
                                        autoComplete="off"
                                        value={this.state.newQuestionText}
                                        onChange={e => this.setState({newQuestionText: e.target.value})}
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
            </>
        );
    }
}

class NewAnswerDesigner extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedColor: "#1527F6",
            newAnswerText: "",
        };
    }

    addSurveyAnswer = () => {
        const {surveyQuestion} = this.props;
        if (this.state.newAnswerText.length > 0) {
            const newAnswer = {
                id: surveyQuestion.answers.reduce((a, c) => Math.max(a, c.id), 0) + 1,
                answer: this.state.newAnswerText,
                color: this.state.selectedColor,
            };
            const updatedAnswers = [...surveyQuestion.answers, newAnswer];
            const updatedQuestion = {...surveyQuestion, answers: updatedAnswers};
            const newSurveyQuestions = this.props.surveyQuestions
                .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);

            this.props.setProjectDetails({surveyQuestions: newSurveyQuestions});
            this.setState({selectedColor: "#1527F6", newAnswerText: ""});
        } else {
            alert("A survey answer must possess both an answer and a color.");
        }
    };

    render() {
        return <div className="NewAnswerDesigner">
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
                    onChange={e => this.setState({newAnswerText: e.target.value})}
                />
            </div>
        </div>;
    }
}

export class SurveyQuestionHelp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            answerMode: "question",
            selectedQuestion: {id: 0, question: "", answers: [], visible: [1]},
            userSamples: {1: {}},
            unansweredColor: "black",
            visibleAnswered: {},
            drawTool: "Point",
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.context.projectDetails.surveyQuestions.length > 0
            && this.state.userSamples !== prevState.userSamples) {
            this.updateQuestionStatus();
        }
    }

    getChildQuestions = (currentQuestionId) => {
        const {surveyQuestions} = this.context.projectDetails;
        const {question, id} = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const childQuestions = surveyQuestions.filter(sq => sq.parentQuestion === id);

        if (childQuestions.length === 0) {
            return [question];
        } else {
            return childQuestions
                .reduce((prev, acc) => (
                    [...prev, ...this.getChildQuestions(acc.id)]
                ), [question]);
        }
    };

    calcVisibleSamples = (currentQuestionId) => {
        const {surveyQuestions} = this.context.projectDetails;
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
        const visibleAnswered = this.context.projectDetails.surveyQuestions.reduce((acc, sq) => {
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
        // Move rules check into SurveyCollection so it can be accessed here
        // const ruleError = rulesViolated(questionToSet, answerId, answerText);

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

    // This is need for when a top level question is deleted.
    getSelectedQuestion = () => {
        if (this.state.selectedQuestion.id === 0
            || this.context.projectDetails.surveyQuestions.find(sq => sq.id === this.state.selectedQuestion.id)) {
            return this.state.selectedQuestion;
        } else {
            return this.context.projectDetails.surveyQuestions[0];
        }
    }

    render() {
        return (
            <div className="p-3">
                <SurveyCollection
                    surveyQuestions={this.context.projectDetails.surveyQuestions
                        .map(q => ({...q, answered: [], visible: [], ...this.state.visibleAnswered[q.id]}))}
                    surveyRules={this.context.projectDetails.surveyRules}
                    allowDrawnSamples={this.context.projectDetails.allowDrawnSamples}
                    answerMode={this.state.answerMode}
                    selectedQuestion={this.getSelectedQuestion()}
                    unansweredColor={this.state.unansweredColor}
                    drawTool={this.state.drawTool}
                    setDrawTool={(newTool) => this.setState({drawTool: newTool})}
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
