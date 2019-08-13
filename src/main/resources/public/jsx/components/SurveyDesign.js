import React from "react";

import { SectionBlock } from "./FormComponents";
import SurveyCardList from "./SurveyCardList";
import { removeEnumerator } from "../utils/surveyUtils";

const componentTypes = [
    { componentType: "button", dataType: "text" },
    { componentType: "button", dataType: "number" },
    { componentType: "input", dataType: "number" },
    { componentType: "input", dataType: "text" },
    { componentType: "radiobutton", dataType: "boolean" },
    { componentType: "radiobutton", dataType: "text" },
    { componentType: "radiobutton", dataType: "number" },
    { componentType: "dropdown", dataType: "boolean" },
    { componentType: "dropdown", dataType: "text" },
    { componentType: "dropdown", dataType: "number" },
    // {componentType: "digitizer", dataType: "point"}
    // {componentType: "digitizer", dataType: "linestring"}
    // {componentType: "digitizer", dataType: "polygon"}
];

export class SurveyDesign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inSimpleMode: true,
        };
    }

    componentDidUpdate = (prevProps, prevState) => {
        if (this.state.inSimpleMode && !prevState.inSimpleMode) {
            this.convertToSimple();
        }

        // Change to advanced/simple mode when changing project templates
        if (prevProps.templateProject !== this.props.templateProject) {
            this.setState({ inSimpleMode: this.onlySimpleFeatures() });
        }
    };

    onlySimpleFeatures = () => this.props.surveyQuestions.every(q => q.componentType === "button" && q.dataType === "text")
                                && this.props.surveyRules.length === 0;

    convertToSimple = () => {
        const newSurveyQuestions = this.props.surveyQuestions
            .map(question => ({ ...question, componentType: "button", dataType: "text" }));

        this.props.setSurveyQuestions(newSurveyQuestions);
        this.props.setSurveyRules([]);
    };

    toggleSimpleMode = () => {
        this.setState({
            inSimpleMode: this.state.inSimpleMode
                            ? false
                            : this.onlySimpleFeatures()
                                || confirm("This action will revert all questions to type 'button - text' and erase rules.\n\nWould you like to proceed?"),
        });
    };

    getChildQuestionIds = (questionId) => {
        const childQuestions = this.props.surveyQuestions.filter(sq => sq.parentQuestion === questionId);
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

        const newSurveyQuestions = this.props.surveyQuestions
            .filter(sq => !questionsToRemove.includes(sq.id));

        this.props.setSurveyQuestions(newSurveyQuestions);
    };

    removeAnswer = (questionId, answerId) => {
        const matchingQuestion = this.props.surveyQuestions
            .find(sq => sq.parentQuestion === questionId && sq.parentAnswer === answerId);

        if (matchingQuestion) {
            alert("You cannot remove this answer because a sub question (" +
                matchingQuestion.question
                + ") is referencing it.");
        } else {
            const surveyQuestion = this.props.surveyQuestions.find(sq => sq.id === questionId);
            const updatedAnswers = surveyQuestion.answers.filter(ans => ans.id !== answerId);

            const updatedQuestion = { ...surveyQuestion, answers: updatedAnswers };

            const newSurveyQuestions = this.props.surveyQuestions
                .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);

            this.props.setSurveyQuestions(newSurveyQuestions);
        }
    };

    maxAnswers(componentType, dataType) {
        return (componentType || "").toLowerCase() === "input"
                    ? 1 : (dataType || "").toLowerCase() === "boolean"
                        ? 2 : 1000;
    }

    render() {
        return (
            <SectionBlock title="Survey Design">
                <ModeButtons inSimpleMode={this.state.inSimpleMode} toggleSimpleMode={this.toggleSimpleMode} />
                <div id="survey-design">
                    <SurveyCardList
                        inSimpleMode={this.state.inSimpleMode}
                        inDesignMode
                        setSurveyQuestions={this.props.setSurveyQuestions}
                        setSurveyRules={this.props.setSurveyRules}
                        surveyQuestions={this.props.surveyQuestions}
                        surveyRules={this.props.surveyRules}
                        removeAnswer={this.removeAnswer}
                        removeQuestion={this.removeQuestion}
                        newAnswerComponent={(surveyQuestion) => surveyQuestion.answers.length
                                < this.maxAnswers(surveyQuestion.componentType, surveyQuestion.dataType)
                                &&
                                <NewAnswerDesigner
                                    setSurveyQuestions={this.props.setSurveyQuestions}
                                    surveyQuestions={this.props.surveyQuestions}
                                    surveyQuestion={surveyQuestion}
                                />
                        }
                    />

                    <NewQuestionDesigner
                        inSimpleMode={this.state.inSimpleMode}
                        setSurveyQuestions={this.props.setSurveyQuestions}
                        surveyQuestions={this.props.surveyQuestions}
                        surveyRules = {this.props.surveyRules}
                        setSurveyRules = {this.props.setSurveyRules}
                    />
                </div>
            </SectionBlock>
        );
    }
}

function ModeButtons({ inSimpleMode, toggleSimpleMode }) {
    return (
        <div
            className="my-3"
            style={{ overflow: "hidden", border: "1px solid #31BAB0", backgroundColor: "#f1f1f1" }}
        >
            <input
                type="button"
                className="SimpleButton border"
                onClick={toggleSimpleMode}
                value="Simple"
                style={{
                    backgroundColor: inSimpleMode ? "#31BAB0" : "transparent",
                    float: "left",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    padding: "14px 16px",
                    transition: "0.3s",
                    fontSize: "17px",
                }}
            />
            <input
                type="button"
                className="AdvancedButton border"
                onClick={toggleSimpleMode}
                value="Advanced"
                style={{
                    backgroundColor: !inSimpleMode ? "#31BAB0" : "transparent",
                    float: "left",
                    outline: "none",
                    cursor: "pointer",
                    padding: "14px 16px",
                    transition: "0.3s",
                    fontSize: "17px",
                }}
            />
        </div>
    );
}

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
                this.setState({ selectedParent: -1 });
            }
        }

        if (this.state.selectedParent !== prevState.selectedParent) {
            this.setState({ selectedAnswer: -1 });
        }
    };

    addSurveyQuestion = () => {
        if (this.state.newQuestionText !== "") {
            const { surveyQuestions } = this.props;
            const { dataType, componentType } = componentTypes[this.props.inSimpleMode ? 0 : this.state.selectedType];
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
                this.props.setSurveyQuestions([...surveyQuestions, newQuestion]);
                this.setState({ selectedAnswer: -1, newQuestionText: "" });
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
            className="btn btn-outline-danger py-0 px-2 mr-1"
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
            <React.Fragment>
                <table className="mt-4">
                    <tbody>
                        {!this.props.inSimpleMode &&
                        <tr>
                            <td>
                                <label htmlFor="value-componenttype">Component Type:</label>
                            </td>
                            <td>
                                <select
                                    id="value-componenttype"
                                    className="form-control form-control-sm"
                                    size="1"
                                    onChange={e => this.setState({ selectedType: parseInt(e.target.value) })}
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
                        }
                        <tr>
                            <td>
                                <label htmlFor="value-parent">Parent Question:</label>
                            </td>
                            <td>
                                <select
                                    id="value-parent"
                                    className="form-control form-control-sm"
                                    size="1"
                                    onChange={e => this.setState({ selectedParent: parseInt(e.target.value) })}
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
                                    onChange={e => this.setState({ selectedAnswer: parseInt(e.target.value) })}
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
                                        onChange={e => this.setState({ newQuestionText: e.target.value })}
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
                {!this.props.inSimpleMode &&
                <SectionBlock title="Survey Rules Design">
                    <table>
                        <tbody>
                            <SurveyRules
                                surveyQuestions={this.props.surveyQuestions}
                                surveyQuestion={this.props.surveyQuestion}
                                setSurveyQuestions={this.props.setSurveyQuestions}
                                setSurveyRules={this.props.setSurveyRules}
                                surveyRules={this.props.surveyRules}
                            />
                            <tr>
                                <td colSpan="2"><span className="font-weight-bold">Rules:  </span></td>
                            </tr>
                            <tr>
                                <td colSpan="2">
                                    <table id="srd">
                                        <tbody>
                                            {
                                        this.props.surveyRules && this.props.surveyRules.length > 0 ?
                                            this.props.surveyRules.map((rule, uid) => {
                                                if (rule.ruleType === "text-match") {
                                                    return <tr id={"rule" + rule.id} key={uid}>
                                                        <td>
                                                            {this.removeButton(rule.id)}
                                                        </td>
                                                        <td>{"Rule " + rule.id}</td>
                                                        <td>Type: {rule.ruleType}</td>
                                                        <td>Regex: {rule.regex}</td>
                                                        <td colSpan="2">Questions: {rule.questionsText.toString()}</td>
                                                    </tr>;
                                                } else if (rule.ruleType === "numeric-range") {
                                                    return <tr id={"rule" + rule.id} key={uid}>
                                                        <td>
                                                            {this.removeButton(rule.id)}
                                                        </td>
                                                        <td>{"Rule " + rule.id}</td>
                                                        <td>Type: {rule.ruleType}</td>
                                                        <td>Min: {rule.min}</td>
                                                        <td>Max: {rule.max}</td>
                                                        <td>Questions: {rule.questionsText.toString()}</td>
                                                    </tr>;
                                                } else if (rule.ruleType === "sum-of-answers") {
                                                    return <tr id={"rule" + rule.id} key={uid}>
                                                        <td>
                                                            {this.removeButton(rule.id)}
                                                        </td>
                                                        <td>{"Rule " + rule.id}</td>
                                                        <td>Type: {rule.ruleType}</td>
                                                        <td>Valid Sum: {rule.validSum}</td>
                                                        <td colSpan="2">Questions: {rule.questionsText.toString()}</td>
                                                    </tr>;
                                                } else if (rule.ruleType === "matching-sums") {
                                                    return <tr id={"rule" + rule.id} key={uid}>
                                                        <td>
                                                            {this.removeButton(rule.id)}
                                                        </td>
                                                        <td>{"Rule " + rule.id}</td>
                                                        <td>Type: {rule.ruleType}</td>
                                                        <td>Questions Set 1: {rule.questionSetText1.toString()}</td>
                                                        <td colSpan="2">Questions Set 2: {rule.questionSetText2.toString()}</td>
                                                    </tr>;
                                                } else if (rule.ruleType === "incompatible-answers") {
                                                    return <tr id={"rule" + rule.id} key={uid}>
                                                        <td>
                                                            {this.removeButton(rule.id)}
                                                        </td>
                                                        <td>{"Rule " + rule.id}</td>
                                                        <td>Type: {rule.ruleType}</td>
                                                        <td>Question 1: {rule.questionText1}, Answer
                                                            1: {rule.answerText1}</td>
                                                        <td colSpan="2">Question 2: {rule.questionText2}, Answer
                                                            2: {rule.answerText2}</td>
                                                    </tr>;
                                                }
                                            }) :
                                            <tr>
                                                <td colSpan="6"><span>No rules for this survey yet!</span></td>
                                            </tr>
                                            }
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </SectionBlock>
                }
            </React.Fragment>
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
        const { surveyQuestion } = this.props;
        if (this.state.newAnswerText.length > 0) {
            const newAnswer = {
                id: surveyQuestion.answers.reduce((a, c) => Math.max(a, c.id), 0) + 1,
                answer: this.state.newAnswerText,
                color: this.state.selectedColor,
            };
            const updatedAnswers = [...surveyQuestion.answers, newAnswer];
            const updatedQuestion = { ...surveyQuestion, answers: updatedAnswers };
            const newSurveyQuestions = this.props.surveyQuestions
                .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);

            this.props.setSurveyQuestions(newSurveyQuestions);
            this.setState({ selectedColor: "#1527F6", newAnswerText: "" });
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
                    onChange={e => this.setState({ selectedColor: e.target.value })}
                />
                <input
                    type="text"
                    className="value-name"
                    autoComplete="off"
                    value={this.state.newAnswerText}
                    onChange={e => this.setState({ newAnswerText: e.target.value })}
                />
            </div>
        </div>;
    }
}

class SurveyRules extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedRuleType: "none",
            regex: "",
            min: -1,
            max: -1,
            validSum: 0,
            questionIds: [],
            dropdownQuestions: [],
            answers1: [],
            answers2: [],
            question1: 0,
            question2: 0,
            answer1: 0,
            answer2: 0,
            questionText1: "",
            questionText2: "",
            answerText1: "",
            answerText2: "",
            questions: [],
            questionsSet1:[],
            questionsSet2:[],
            questionSetIds1:[],
            questionSetIds2:[],
            questionId: 0,
        };
    }

    setNewRule = (ruleType) => {
        this.setState({ selectedRuleType: ruleType });
    };

    updateMin = (min) => {
        this.setState({ min: min });
    };

    updateMax = (max) => {
        this.setState({ max: max });
    };

    updateRegex = (expression) => {
        this.setState({ regex: expression });
    };

    updateMaxSum = (sum) => {
        this.setState({ validSum: sum });
    };

    updateOptions = (target, type) => {
        const selection = Array.from(target.options).filter(option => option.selected);
        if (this.state.selectedRuleType === "incompatible-answers") {
            selection.map(option => {
                const questionId = parseInt(option.value);
                if (target.id === "question1") {
                    const dropdownQuestions = this.props.surveyQuestions.filter(question => question.id !== questionId);
                    const currentQuestion = this.props.surveyQuestions.find(ques => ques.id === questionId);
                    const answers = currentQuestion.answers;
                    this.setState({
                        question1: questionId,
                        dropdownQuestions: dropdownQuestions,
                        answers1: answers,
                        questionText1: currentQuestion.question,
                        answers2: [],
                    });
                } else if (target.id === "question2") {
                    const currentQuestion = this.props.surveyQuestions.find(ques => ques.id === questionId);
                    const answers = currentQuestion ? currentQuestion.answers : [];
                    this.setState({
                        question2: questionId,
                        questionText2: currentQuestion.question,
                        answers2: answers,
                    });
                } else if (target.id === "answer1") {
                    const currentQuestion = this.props.surveyQuestions.find(ques => ques.id === this.state.question1);
                    const answer = currentQuestion.answers.find(ans => ans.id === questionId);
                    this.setState({ answer1: questionId, answerText1: answer.answer });
                } else if (target.id === "answer2") {
                    const currentQuestion = this.props.surveyQuestions.find(ques => ques.id === this.state.question2);
                    const answer = currentQuestion.answers.find(ans => ans.id === questionId);
                    this.setState({ answer2: questionId, answerText2: answer.answer });
                }
            });
        } else if (this.state.selectedRuleType === "matching-sums" && selection.length > 1) {
            const questions = selection.map(option => {
                const question = this.props.surveyQuestions.find(surveyQuestion => surveyQuestion.id === parseInt(option.value));
                return question.question;
            });
            if (type === "questionSet1") {
                this.setState({
                    questionSetIds1: selection.map(option => parseInt(option.value)),
                    questionsSet1: questions,
                });
            } else if (type === "questionSet2") {
                this.setState({
                    questionSetIds2: selection.map(option => parseInt(option.value)),
                    questionsSet2: questions,
                });
            }
        } else if ((this.state.selectedRuleType === "sum-of-answers" && selection.length > 1) || (this.state.selectedRuleType !== "sum-of-answers" && selection.length > 0)) {
            const questions = selection.map(option => {
                const question = this.props.surveyQuestions.find(surveyQuestion => surveyQuestion.id === parseInt(option.value));
                return question.question;
            });
            this.setState({ questionIds: selection.map(option => parseInt(option.value)), questions: questions });
        }

    };

    getMaxId = (array) => array.reduce((maxId, obj) => Math.max(maxId, obj.id), 0);

    addSurveyRule = (ruleType) => {
        const rules = this.props.surveyRules.map(rule =>
            (rule.ruleType === "numeric-range"
                && rule.questionId === this.state.questionIds[0])
                ? { ...rule, min: this.state.min, max: this.state.max }
            : (rule.ruleType === "text-match"
                && rule.questionId === this.state.questionIds[0])
                ? { ...rule, regex: this.state.regex }
            : (rule.ruleType === "sum-of-answers"
                && this.state.questionIds.every(qId => rule.questions.includes(qId)))
                ? { ...rule, validSum: this.state.validSum }
            : (rule.ruleType === "matching-sums"
                && this.state.questionSetIds1.every(qId => rule.questionSetIds1.includes(qId))
                && this.state.questionSetIds2.every(qId => rule.questionSetIds2.includes(qId)))
                ? { ...rule }
            : rule);

        const numExists = this.props.surveyRules.some(rule => rule.ruleType === "numeric-range" && rule.questionId === this.state.questionIds[0]);
        const textExists = this.props.surveyRules.some(rule => rule.ruleType === "text-match" && rule.questionId === this.state.questionIds[0]);
        const sumExists = this.props.surveyRules.some(rule => rule.ruleType === "sum-of-answers"
                && this.state.questionIds.every(qId => rule.questions.includes(qId)));
        const matchingSumsExists = this.props.surveyRules.some(rule => rule.ruleType === "matching-sums"
                && this.state.questionSetIds1.every(qId => rule.questionSetIds1.includes(qId))
                && this.state.questionSetIds2.every(qId => rule.questionSetIds2.includes(qId)));
        const incompatibleExists = this.props.surveyRules.some(rule => rule.ruleType === "incompatible-answers"
                && rule.question1 === this.state.question1
                && rule.question2 === this.state.question2
                && rule.answer1 === this.state.answer1
                && rule.answer2 === this.state.answer2);

        const newRule =
            (ruleType === "numeric-range" && numExists === false && this.state.min >= 0 && this.state.max >= 0) ? {
                id: rules.length > 0 ? this.getMaxId(rules) + 1 : 1,
                ruleType: ruleType,
                questionId: this.state.questionIds[0],
                questionsText: this.state.questions,
                min: this.state.min,
                max: this.state.max,
            } : (ruleType === "text-match" && textExists === false && this.state.regex.length > 0) ? {
                id: rules.length > 0 ? this.getMaxId(rules) + 1 : 1,
                ruleType: ruleType,
                questionId: this.state.questionIds[0],
                questionsText: this.state.questions,
                regex: this.state.regex,
            } : (ruleType === "sum-of-answers" && sumExists === false && this.state.questions.length > 1) ? {
                id: rules.length > 0 ? this.getMaxId(rules) + 1 : 1,
                ruleType: ruleType,
                questions: this.state.questionIds,
                questionsText: this.state.questions,
                validSum: this.state.validSum,
            } : (ruleType === "matching-sums" && matchingSumsExists === false && this.state.questionSetIds1.length > 1 && this.state.questionSetIds2.length > 1) ? {
                id: rules.length > 0 ? this.getMaxId(rules) + 1 : 1,
                ruleType: ruleType,
                questionSetIds1: this.state.questionSetIds1,
                questionSetIds2: this.state.questionSetIds2,
                questionSetText1: this.state.questionsSet1,
                questionSetText2: this.state.questionsSet2,
            } : (ruleType === "incompatible-answers" && incompatibleExists === false
                    && this.state.question1 > 0 && this.state.question2 > 0
                    && this.state.answer1 > 0 && this.state.answer2 > 0)
            ? {
                id: rules.length > 0 ? this.getMaxId(rules) + 1 : 1,
                ruleType: ruleType,
                question1: this.state.question1,
                question2: this.state.question2,
                answer1: this.state.answer1,
                answer2: this.state.answer2,
                questionText1: this.state.questionText1,
                questionText2: this.state.questionText2,
                answerText1: this.state.answerText1,
                answerText2: this.state.answerText2,
            } : null;
        this.props.setSurveyRules(newRule ? [...rules, newRule] : rules);
    };

    render() {
        return (
            <React.Fragment>
                <tr>
                    <td colSpan="2">
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        <label htmlFor="ruletype">Rule Type:</label>
                                    </td>
                                    <td>
                                        <select className="form-control form-control-sm" size="1" onChange={e => this.setNewRule(e.target.value)}>
                                            <option value="select">None</option>
                                            <option value="text-match">Text Match</option>
                                            <option value="numeric-range">Numeric Range</option>
                                            <option value="sum-of-answers">Sum of Answers</option>
                                            <option value="matching-sums">Matching Sums</option>
                                            <option value="incompatible-answers">Incompatible Answers</option>
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
                {
                    this.state.selectedRuleType === "text-match" ? (
                        <TextMatch
                            surveyQuestions={this.props.surveyQuestions}
                            surveyQuestion={this.props.surveyQuestion}
                            updateRegex={this.updateRegex}
                            updateOptions={this.updateOptions}
                        />
                    ) : this.state.selectedRuleType === "numeric-range" ? (
                        <NumericRange
                            surveyQuestions={this.props.surveyQuestions}
                            surveyRules={this.props.surveyRules}
                            updateMin={this.updateMin}
                            updateMax={this.updateMax}
                            surveyQuestion={this.props.surveyQuestion}
                            updateOptions={this.updateOptions}
                        />
                    ) : this.state.selectedRuleType === "sum-of-answers" ? (
                        <SumOfAnswers
                            surveyQuestions={this.props.surveyQuestions}
                            surveyRules={this.props.surveyRules}
                            surveyQuestion={this.props.surveyQuestion}
                            updateMaxSum={this.updateMaxSum}
                            updateOptions={this.updateOptions}
                        />
                    ) : this.state.selectedRuleType === "matching-sums" ? (
                        <MatchingSums
                            surveyQuestions={this.props.surveyQuestions}
                            surveyRules={this.props.surveyRules}
                            surveyQuestion={this.props.surveyQuestion}
                            updateOptions={this.updateOptions}
                        />
                    ) : this.state.selectedRuleType === "incompatible-answers" ? (
                        <IncompatibleAnswers
                            answers1={this.state.answers1}
                            answers2={this.state.answers2}
                            dropdownQuestions={this.state.dropdownQuestions}
                            surveyQuestions={this.props.surveyQuestions}
                            surveyRules={this.props.surveyRules}
                            surveyQuestion={this.props.surveyQuestion}
                            updateOptions={this.updateOptions}
                        />
                    ) : <tr><td></td><td></td></tr>
                }
                <tr>
                    <td>
                        <input
                            type="button"
                            className="button"
                            value="Add Survey Rule"
                            onClick={() => this.addSurveyRule(this.state.selectedRuleType)}
                        />
                    </td>
                    <td></td>
                </tr>
            </React.Fragment>
        );
    }
}

function TextMatch(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "text");
    return (
        <tr>
            <td colSpan="2">
                <table>
                    <tbody>
                        <tr>
                            <td><label>Survey Question: </label></td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    onChange={e => props.updateOptions(e.target, "")}
                                >
                                    <option value="-1">-select-</option>
                                    {
                                        surveyQuestions && surveyQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td><label>Enter regular expression: </label></td>
                            <td>
                                <input
                                    id="text-match"
                                    className="form-control form-control-sm"
                                    type="text"
                                    placeholder="Regular expression"
                                    onChange={e => props.updateRegex(e.target.value)}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    );
}

function NumericRange(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "number");
    return (
        <tr>
            <td colSpan="2">
                <table>
                    <tbody>
                        <tr>
                            <td><label>Survey Question: </label></td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    onChange={e => props.updateOptions(e.target, "")}
                                >
                                    <option value="-1">-select-</option>
                                    {
                                        surveyQuestions && surveyQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td><label>Enter minimum: </label></td>
                            <td>
                                <input
                                    id="min-val"
                                    className="form-control form-control-sm"
                                    type="number"
                                    placeholder="Minimum value"
                                    onChange={e => props.updateMin(parseInt(e.target.value))}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td><label>Enter maximum: </label></td>
                            <td>
                                <input
                                    id="max-val"
                                    className="form-control form-control-sm"
                                    type="number"
                                    placeholder="Maximum value"
                                    onChange={e => props.updateMax(parseInt(e.target.value))}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    );
}

function SumOfAnswers(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.dataType === "number");
    return (
        <tr>
            <td>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <label>
                                    <p>Select survey question:</p><p>(Hold ctrl/cmd and select multiple questions)</p>
                                </label>
                            </td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    multiple="multiple"
                                    onChange={e => props.updateOptions(e.target, "")}
                                >
                                    {
                                        surveyQuestions.length > 1 && surveyQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td><label>Enter valid sum: </label></td>
                            <td>
                                <input
                                    className="form-control form-control-sm"
                                    id="expected-sum"
                                    type="number"
                                    placeholder="Valid sum"
                                    onChange={e => props.updateMaxSum(parseInt(e.target.value))}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    );
}

function MatchingSums(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.dataType === "number");
    return (
        <tr>
            <td>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <label>
                                    <p>Select first question set:</p><p>(Hold ctrl/cmd and select multiple questions)</p>
                                </label>
                            </td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    multiple="multiple"
                                    onChange={e => props.updateOptions(e.target, "questionSet1")}
                                >
                                    {
                                        surveyQuestions.length > 1 && surveyQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label>
                                    <p>Select second question set:</p><p>(Hold ctrl/cmd and select multiple questions)</p>
                                </label>
                            </td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    multiple="multiple"
                                    onChange={e => props.updateOptions(e.target, "questionSet2")}
                                >
                                    {
                                        surveyQuestions.length > 1 && surveyQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    );
}

function IncompatibleAnswers(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.componentType !== "input");
    const dropdownQuestions = props.dropdownQuestions.filter(question => question.componentType !== "input");
    return (
        <tr>
            <td colSpan="2">
                <table>
                    <tbody>
                        <tr>
                            <td colSpan="2"><label>Select the incompatible questions and answers: </label></td>
                        </tr>
                        <tr>
                            <td>Question 1:</td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    id="question1"
                                    onChange={e => props.updateOptions(e.target, "")}
                                >
                                    <option value="-1">None</option>
                                    {
                                        surveyQuestions && surveyQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>Answer 1:</td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    id="answer1"
                                    onChange={e => props.updateOptions(e.target, "")}
                                >
                                    <option value="-1">None</option>
                                    {
                                        props.answers1 && props.answers1.map((answer, uid) =>
                                            <option key={uid} value={answer.id}>{answer.answer}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>Question 2:</td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    id="question2"
                                    onChange={e => props.updateOptions(e.target, "")}
                                >
                                    <option value="-1">None</option>
                                    {
                                        dropdownQuestions && dropdownQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>Answer 2:</td>
                            <td>
                                <select
                                    className="form-control form-control-sm"
                                    id="answer2"
                                    onChange={e => props.updateOptions(e.target, "")}
                                >
                                    <option value="-1">None</option>
                                    {
                                        props.answers2 && props.answers2.map((answer, uid) =>
                                            <option key={uid} value={answer.id}>{answer.answer}</option>)
                                    }
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </td>
        </tr>
    );
}


