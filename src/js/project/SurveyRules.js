import React from "react";

import {ProjectContext} from "./constants";

export class SurveyRuleDesign extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedRuleType: "text-match",
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
        };
    }

    setNewRule = (ruleType) => {
        this.setState({selectedRuleType: ruleType});
    };

    updateMin = (min) => {
        this.setState({min: min});
    };

    updateMax = (max) => {
        this.setState({max: max});
    };

    updateRegex = (expression) => {
        this.setState({regex: expression});
    };

    updateMaxSum = (sum) => {
        this.setState({validSum: sum});
    };

    updateOptions = (target, type) => {
        const selection = Array.from(target.options).filter(option => option.selected);
        if (this.state.selectedRuleType === "incompatible-answers") {
            selection.map(option => {
                const questionId = parseInt(option.value);
                if (target.id === "question1") {
                    const dropdownQuestions = this.context.surveyQuestions.filter(question => question.id !== questionId);
                    const currentQuestion = this.context.surveyQuestions.find(ques => ques.id === questionId);
                    const answers = currentQuestion.answers;
                    this.setState({
                        question1: questionId,
                        dropdownQuestions: dropdownQuestions,
                        answers1: answers,
                        questionText1: currentQuestion.question,
                        answers2: [],
                    });
                } else if (target.id === "question2") {
                    const currentQuestion = this.context.surveyQuestions.find(ques => ques.id === questionId);
                    const answers = currentQuestion ? currentQuestion.answers : [];
                    this.setState({
                        question2: questionId,
                        questionText2: currentQuestion.question,
                        answers2: answers,
                    });
                } else if (target.id === "answer1") {
                    const currentQuestion = this.context.surveyQuestions.find(ques => ques.id === this.state.question1);
                    const answer = currentQuestion.answers.find(ans => ans.id === questionId);
                    this.setState({answer1: questionId, answerText1: answer.answer});
                } else if (target.id === "answer2") {
                    const currentQuestion = this.context.surveyQuestions.find(ques => ques.id === this.state.question2);
                    const answer = currentQuestion.answers.find(ans => ans.id === questionId);
                    this.setState({answer2: questionId, answerText2: answer.answer});
                }
            });
        } else if (this.state.selectedRuleType === "matching-sums" && selection.length > 1) {
            const questions = selection.map(option => {
                const question = this.context.surveyQuestions.find(surveyQuestion => surveyQuestion.id === parseInt(option.value));
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
                const question = this.context.surveyQuestions.find(surveyQuestion => surveyQuestion.id === parseInt(option.value));
                return question.question;
            });
            this.setState({questionIds: selection.map(option => parseInt(option.value)), questions: questions});
        }

    };

    getMaxId = (array) => array.reduce((maxId, obj) => Math.max(maxId, obj.id), 0);

    addSurveyRule = (ruleType) => {
        const rules = this.context.surveyRules.map(rule =>
            (rule.ruleType === "numeric-range"
                && rule.questionId === this.state.questionIds[0])
                ? {...rule, min: this.state.min, max: this.state.max}
            : (rule.ruleType === "text-match"
                && rule.questionId === this.state.questionIds[0])
                ? {...rule, regex: this.state.regex}
            : (rule.ruleType === "sum-of-answers"
                && this.state.questionIds.every(qId => rule.questions.includes(qId)))
                ? {...rule, validSum: this.state.validSum}
            : (rule.ruleType === "matching-sums"
                && this.state.questionSetIds1.every(qId => rule.questionSetIds1.includes(qId))
                && this.state.questionSetIds2.every(qId => rule.questionSetIds2.includes(qId)))
                ? {...rule}
            : rule);

        const numExists = this.context.surveyRules.some(rule => rule.ruleType === "numeric-range" && rule.questionId === this.state.questionIds[0]);
        const textExists = this.context.surveyRules.some(rule => rule.ruleType === "text-match" && rule.questionId === this.state.questionIds[0]);
        const sumExists = this.context.surveyRules.some(rule => rule.ruleType === "sum-of-answers"
                && this.state.questionIds.every(qId => rule.questions.includes(qId)));
        const matchingSumsExists = this.context.surveyRules.some(rule => rule.ruleType === "matching-sums"
                && this.state.questionSetIds1.every(qId => rule.questionSetIds1.includes(qId))
                && this.state.questionSetIds2.every(qId => rule.questionSetIds2.includes(qId)));
        const incompatibleExists = this.context.surveyRules.some(rule => rule.ruleType === "incompatible-answers"
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
        this.context.setProjectState({surveyRules: newRule ? [...rules, newRule] : rules});
    };

    render() {
        return (
            <SurveyRulesList
                surveyRules={this.context.surveyRules}
                setProjectState={this.context.setProjectState}
                inDesignMode
            >
                <tr>
                    <td colSpan="2">
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        <label htmlFor="ruletype">Rule Type:</label>
                                    </td>
                                    <td>
                                        <select
                                            className="form-control form-control-sm"
                                            size="1"
                                            onChange={e => this.setNewRule(e.target.value)}
                                        >
                                            <option value="text-match">Text Regex Match</option>
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
                            surveyQuestions={this.context.surveyQuestions}
                            surveyQuestion={this.context.surveyQuestion}
                            updateRegex={this.updateRegex}
                            updateOptions={this.updateOptions}
                        />
                    ) : this.state.selectedRuleType === "numeric-range" ? (
                        <NumericRange
                            surveyQuestions={this.context.surveyQuestions}
                            surveyRules={this.context.surveyRules}
                            updateMin={this.updateMin}
                            updateMax={this.updateMax}
                            surveyQuestion={this.context.surveyQuestion}
                            updateOptions={this.updateOptions}
                        />
                    ) : this.state.selectedRuleType === "sum-of-answers" ? (
                        <SumOfAnswers
                            surveyQuestions={this.context.surveyQuestions}
                            surveyRules={this.context.surveyRules}
                            surveyQuestion={this.context.surveyQuestion}
                            updateMaxSum={this.updateMaxSum}
                            updateOptions={this.updateOptions}
                        />
                    ) : this.state.selectedRuleType === "matching-sums" ? (
                        <MatchingSums
                            surveyQuestions={this.context.surveyQuestions}
                            surveyRules={this.context.surveyRules}
                            surveyQuestion={this.context.surveyQuestion}
                            updateOptions={this.updateOptions}
                        />
                    ) : this.state.selectedRuleType === "incompatible-answers" ? (
                        <IncompatibleAnswers
                            answers1={this.state.answers1}
                            answers2={this.state.answers2}
                            dropdownQuestions={this.state.dropdownQuestions}
                            surveyQuestions={this.context.surveyQuestions}
                            surveyRules={this.context.surveyRules}
                            surveyQuestion={this.context.surveyQuestion}
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
            </SurveyRulesList>
        );
    }
}
SurveyRuleDesign.contextType = ProjectContext;

function TextMatch(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "text");
    return (
        <>
            {surveyQuestions.length > 0
            ?
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
                                            {surveyQuestions && surveyQuestions.map((question, uid) =>
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
            :
                <tr><td><label>No questions for this rule type</label></td></tr>
            }
        </>
    );
}

function NumericRange(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "number");
    return (
        <>
            {surveyQuestions.length > 0
            ?
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
                                            {surveyQuestions && surveyQuestions.map((question, uid) =>
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
            :
                <tr><td><label>No questions for this rule type</label></td></tr>
            }
        </>

    );
}

function SumOfAnswers(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.dataType === "number");
    return (
        <>
            {surveyQuestions.length > 0
            ?
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
                                            {surveyQuestions.length > 1 && surveyQuestions.map((question, uid) =>
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
            :
                <tr><td><label>No questions for this rule type</label></td></tr>
            }
        </>
    );
}

function MatchingSums(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.dataType === "number");
    return (
        <>
            {surveyQuestions.length > 1
            ?
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
                                            {surveyQuestions.length > 1 && surveyQuestions.map((question, uid) =>
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
                                            {surveyQuestions.length > 1 && surveyQuestions.map((question, uid) =>
                                                <option key={uid} value={question.id}>{question.question}</option>)
                                            }
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            :
                <tr><td><label>There must be at least 2 matching questions for this rule type</label></td></tr>
            }
        </>

    );
}

function IncompatibleAnswers(props) {
    const surveyQuestions = props.surveyQuestions.filter(question => question.componentType !== "input");
    const dropdownQuestions = props.dropdownQuestions.filter(question => question.componentType !== "input");
    return (
        <>
            {surveyQuestions.length > 1
            ?
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
                                            {surveyQuestions && surveyQuestions.map((question, uid) =>
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
                                            {props.answers1 && props.answers1.map((answer, uid) =>
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
                                            {dropdownQuestions && dropdownQuestions.map((question, uid) =>
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
                                            {props.answers2 && props.answers2.map((answer, uid) =>
                                                <option key={uid} value={answer.id}>{answer.answer}</option>)
                                            }
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            :
                <tr><td><label>There must be at least 2 matching questions for this rule type</label></td></tr>
            }
        </>
    );
}

export function SurveyRulesList(props) {

    const deleteSurveyRule = (event) => {
        const newSurveyRules = props.surveyRules.filter(rule => rule.id !== parseInt(event.target.id));
        props.setProjectState({surveyRules: newSurveyRules});
    };

    // TODO update the remove buttons with SVG
    const removeButton = (ruleId) => (
        <button
            type="button"
            className="btn btn-outline-red py-0 px-2 mr-1"
            onClick={e => deleteSurveyRule(e)}
        >
            <span
                id={ruleId}
                className="font-weight-bold"
            >
                X
            </span>
        </button>
    );

    return (
        <div id="survey-rule-design">
            <span className="font-weight-bold">Rules:</span>
            <table id="srd">
                <tbody>
                    {props.surveyRules && props.surveyRules.length > 0
                    ?
                        props.surveyRules.map((rule, uid) => {
                            if (rule.ruleType === "text-match") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    {props.inDesginMode &&
                                        <td>
                                            {removeButton(rule.id)}
                                        </td>
                                    }
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: Text Regex Match</td>
                                    <td>Regex: {rule.regex}</td>
                                    <td colSpan="2">Questions: {rule.questionsText.toString()}</td>
                                </tr>;
                            } else if (rule.ruleType === "numeric-range") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    {props.inDesginMode &&
                                        <td>
                                            {removeButton(rule.id)}
                                        </td>
                                    }
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: Numeric Range</td>
                                    <td>Min: {rule.min}</td>
                                    <td>Max: {rule.max}</td>
                                    <td>Questions: {rule.questionsText.toString()}</td>
                                </tr>;
                            } else if (rule.ruleType === "sum-of-answers") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    {props.inDesginMode &&
                                        <td>
                                            {removeButton(rule.id)}
                                        </td>
                                    }
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: Sum of Answers</td>
                                    <td>Valid Sum: {rule.validSum}</td>
                                    <td colSpan="2">Questions: {rule.questionsText.toString()}</td>
                                </tr>;
                            } else if (rule.ruleType === "matching-sums") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    {props.inDesginMode &&
                                        <td>
                                            {removeButton(rule.id)}
                                        </td>
                                    }
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: Matching Sums</td>
                                    <td>Questions Set 1: {rule.questionSetText1.toString()}</td>
                                    <td colSpan="2">Questions Set 2: {rule.questionSetText2.toString()}</td>
                                </tr>;
                            } else if (rule.ruleType === "incompatible-answers") {
                                return <tr id={"rule" + rule.id} key={uid}>
                                    {props.inDesginMode &&
                                        <td>
                                            {removeButton(rule.id)}
                                        </td>
                                    }
                                    <td>{"Rule " + rule.id}</td>
                                    <td>Type: Incompatible Answers</td>
                                    <td>Question 1: {rule.questionText1}, Answer 1: {rule.answerText1}</td>
                                    <td colSpan="2">Question 2: {rule.questionText2}, Answer 2: {rule.answerText2}</td>
                                </tr>;
                            }
                        })
                    :
                        <tr>
                            <td colSpan="5"><span>No rules set for this survey</span></td>
                        </tr>
                    }
                    {props.children}
                </tbody>
            </table>
        </div>
    );
}
