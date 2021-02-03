import React from "react";
import {isNumber, arraysSameElements} from "../utils/generalUtils";

import {ProjectContext} from "./constants";

const getNextId = (array) => array.reduce((maxId, obj) => Math.max(maxId, obj.id), 0) + 1;

export class SurveyRuleDesign extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedRuleType: "text-match",
        };
    }


    render() {
        return (
            <SurveyRulesList
                surveyRules={this.context.surveyRules}
                setProjectDetails={this.context.setProjectDetails}
                inDesignMode
            >
                <tr>
                    <td colSpan="6">
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        <label htmlFor="ruletype">Rule Type:</label>
                                    </td>
                                    <td>
                                        <select
                                            className="form-control form-control-sm"
                                            value={this.selectedRuleType}
                                            onChange={e => this.setState({selectedRuleType: e.target.value})}
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
                    {
                        "text-match": <TextMatch/>,
                        "numeric-range": <NumericRange/>,
                        "sum-of-answers": <SumOfAnswers/>,
                        "matching-sums": <MatchingSums/>,
                        "incompatible-answers": <IncompatibleAnswers/>,
                    }[this.state.selectedRuleType]
                }
            </SurveyRulesList>
        );
    }
}
SurveyRuleDesign.contextType = ProjectContext;

export class SurveyRulesList extends React.Component {
    deleteSurveyRule = (ruleId) => {
        const newSurveyRules = this.props.surveyRules.filter(rule => rule.id !== ruleId);
        this.props.setProjectDetails({surveyRules: newSurveyRules});
    };

    // TODO update the remove buttons with SVG
    removeButton = (ruleId) => (
        <button
            type="button"
            className="btn btn-outline-red py-0 px-2 mr-1 font-weight-bold"
            onClick={() => this.deleteSurveyRule(ruleId)}
        >
            X
        </button>
    );

    render() {
        const {surveyRules, inDesignMode, children} = this.props;
        return (
            <div id="survey-rule-design">
                <span className="font-weight-bold">Rules:</span>
                <table id="srd">
                    <tbody>
                        {(surveyRules || []).length > 0
                        ?
                            surveyRules.map((rule, uid) => {
                                if (rule.ruleType === "text-match") {
                                    return <tr id={"rule" + rule.id} key={uid}>
                                        {inDesignMode &&
                                        <td>
                                            {this.removeButton(rule.id)}
                                        </td>
                                        }
                                        <td>{"Rule " + rule.id}</td>
                                        <td>Type: Text Regex Match</td>
                                        <td>Regex: {rule.regex}</td>
                                        <td colSpan="2">Questions: {rule.questionsText.toString()}</td>
                                    </tr>;
                                } else if (rule.ruleType === "numeric-range") {
                                    return <tr id={"rule" + rule.id} key={uid}>
                                        {inDesignMode &&
                                        <td>
                                            {this.removeButton(rule.id)}
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
                                        {inDesignMode &&
                                        <td>
                                            {this.removeButton(rule.id)}
                                        </td>
                                        }
                                        <td>{"Rule " + rule.id}</td>
                                        <td>Type: Sum of Answers</td>
                                        <td>Valid Sum: {rule.validSum}</td>
                                        <td colSpan="2">Questions: {rule.questionsText.toString()}</td>
                                    </tr>;
                                } else if (rule.ruleType === "matching-sums") {
                                    return <tr id={"rule" + rule.id} key={uid}>
                                        {inDesignMode &&
                                        <td>
                                            {this.removeButton(rule.id)}
                                        </td>
                                        }
                                        <td>{"Rule " + rule.id}</td>
                                        <td>Type: Matching Sums</td>
                                        <td>Questions Set 1: {rule.questionSetText1.toString()}</td>
                                        <td colSpan="2">Questions Set 2: {rule.questionSetText2.toString()}</td>
                                    </tr>;
                                } else if (rule.ruleType === "incompatible-answers") {
                                    return <tr id={"rule" + rule.id} key={uid}>
                                        {inDesignMode &&
                                        <td>
                                            {this.removeButton(rule.id)}
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
                                <td colSpan="6"><span>No rules set for this survey</span></td>
                            </tr>
                        }
                        {children}
                    </tbody>
                </table>
            </div>
        );
    }
}

export class TextMatch extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            regex: "",
            questionId: -1,
        };
    }

    addSurveyRule = () => {
        const conflictingRule = this.context.surveyRules.find(rule => rule.ruleType === "text-match"
            && rule.questionId === this.state.questionId);
        const errorMessages = [
            conflictingRule && "A Text Regex Match rule already exists for this question. (Rule #" + conflictingRule.id + ")",
            this.state.questionId < 1 && "You must select a question.",
            this.state.regex.length === 0 && "The regex string is missing.",
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            this.context.setProjectDetails({
                surveyRules: [...this.context.surveyRules, {
                    id: getNextId(this.context.surveyRules),
                    ruleType: "text-match",
                    questionId: this.state.questionId,
                    questionsText: [this.context.surveyQuestions.find(q => q.id === this.state.questionId).question],
                    regex: this.state.regex,
                }],
            });
        }
    }

    render() {
        const availableQuestions = this.context.surveyQuestions
            .filter(q => q.componentType === "input" && q.dataType === "text");
        return availableQuestions.length > 0
        ?
            <tr>
                <td colSpan="6">
                    <table>
                        <tbody>
                            <tr>
                                <td><label>Survey Question: </label></td>
                                <td>
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.questionId}
                                        onChange={e => this.setState({questionId: Number(e.target.value)})}
                                    >
                                        <option value={-1}>- Select Question -</option>
                                        {availableQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                        }
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td><label>Enter regular expression: </label></td>
                                <td>
                                    <input
                                        className="form-control form-control-sm"
                                        type="text"
                                        placeholder="Regular expression"
                                        value={this.state.regex}
                                        onChange={e => this.setState({regex: e.target.value})}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td style={{border: "none"}}></td>
                                <td style={{border: "none"}}>
                                    <input
                                        type="button"
                                        className="button mt-2"
                                        value="Add Survey Rule"
                                        onClick={this.addSurveyRule}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        :
            <tr><td colSpan="5"><label>No questions for this rule type</label></td></tr>;
    }
}
TextMatch.contextType = ProjectContext;

export class NumericRange extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            questionId: -1,
            min: 0,
            max: 0,
        };
    }

    addSurveyRule = () => {
        const conflictingRule = this.context.surveyRules.find(rule => rule.ruleType === "numeric-range"
            && rule.questionId === this.state.questionId);
        const errorMessages = [
            conflictingRule && "This numeric range rule already exists. (Rule #" + conflictingRule.id + ")",
            this.state.questionId < 1 && "You must select a question.",
            (this.state.max <= this.state.min) && "Max must be larger than min.",
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            this.context.setProjectDetails({
                surveyRules: [...this.context.surveyRules, {
                    id: getNextId(this.context.surveyRules),
                    ruleType: "numeric-range",
                    questionId: this.state.questionId,
                    questionsText: [this.context.surveyQuestions.find(q => q.id === this.state.questionId).question],
                    min: this.state.min,
                    max: this.state.max,
                }],
            });
        }
    }

    render() {
        const availableQuestions = this.context.surveyQuestions
            .filter(q => q.componentType === "input" && q.dataType === "number");
        return availableQuestions.length > 0
        ?
            <tr>
                <td colSpan="6">
                    <table>
                        <tbody>
                            <tr>
                                <td><label>Survey Question: </label></td>
                                <td colSpan="4">
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.questionId}
                                        onChange={e => this.setState({questionId: Number(e.target.value)})}
                                    >
                                        <option value={-1}>- Select Question -</option>
                                        {availableQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                        }
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td><label>Enter minimum: </label></td>
                                <td>
                                    <input
                                        className="form-control form-control-sm"
                                        type="number"
                                        placeholder="Minimum value"
                                        value={this.state.min}
                                        onChange={e => this.setState({min: Number(e.target.value)})}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td><label>Enter maximum: </label></td>
                                <td>
                                    <input
                                        className="form-control form-control-sm"
                                        type="number"
                                        placeholder="Maximum value"
                                        value={this.state.max}
                                        onChange={e => this.setState({max: Number(e.target.value)})}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td style={{border: "none"}}></td>
                                <td style={{border: "none"}}>
                                    <input
                                        type="button"
                                        className="button mt-2"
                                        value="Add Survey Rule"
                                        onClick={this.addSurveyRule}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        :
            <tr><td colSpan="6"><label>No questions for this rule type</label></td></tr>;
    }
}
NumericRange.contextType = ProjectContext;

export class SumOfAnswers extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            validSum: 0,
            questionIds: [],
        };
    }

    addSurveyRule = () => {
        const conflictingRule = this.context.surveyRules.find(rule => rule.ruleType === "sum-of-answers"
            && arraysSameElements(this.state.questionIds, rule.questions));
        const errorMessages = [
            conflictingRule && "This sum of answers rule already exists. (Rule #" + conflictingRule.id + ")",
            (this.state.questionIds.length < 2) && "Sum of answers rule requires the selection of two or more questions.",
            !isNumber(this.state.validSum) && "You must ender a valid sum number.",
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            this.context.setProjectDetails({
                surveyRules: [...this.context.surveyRules, {
                    id: getNextId(this.context.surveyRules),
                    ruleType: "sum-of-answers",
                    questions: this.state.questionIds,
                    questionsText: this.context.surveyQuestions
                        .filter(q => this.state.questionIds.includes(q.id))
                        .map(q => q.question),
                    validSum: this.state.validSum,
                }],
            });
        }
    }

    render() {
        const availableQuestions = this.context.surveyQuestions.filter(q => q.dataType === "number");
        return availableQuestions.length > 1
        ?
            <tr>
                <td colSpan="6">
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <label>
                                        <p>Select survey question:</p>
                                        <p>(Hold ctrl/cmd and select multiple questions)</p>
                                    </label>
                                </td>
                                <td colSpan="3">
                                    <select
                                        className="form-control form-control-sm overflow-auto"
                                        multiple="multiple"
                                        value={this.state.questionIds}
                                        onChange={e => this.setState({
                                            questionIds: Array.from(e.target.selectedOptions, i => Number(i.value)),
                                        })}
                                    >
                                        {availableQuestions.map((question, uid) =>
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
                                        type="number"
                                        placeholder="Valid sum"
                                        value={this.state.validSum}
                                        onChange={e => this.setState({validSum: Number(e.target.value)})}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td style={{border: "none"}}></td>
                                <td style={{border: "none"}}>
                                    <input
                                        type="button"
                                        className="button mt-2"
                                        value="Add Survey Rule"
                                        onClick={this.addSurveyRule}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        :
            <tr><td colSpan="6"><label>There must be at least 2 number questions for this rule type</label></td></tr>;
    }
}
SumOfAnswers.contextType = ProjectContext;

export class MatchingSums extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            questionSetIds1: [],
            questionSetIds2: [],
        };
    }

    addSurveyRule = () => {
        const conflictingRule = this.context.surveyRules.find(rule => rule.ruleType === "matching-sums"
            && arraysSameElements(this.state.questionSetIds1, rule.questionSetIds1)
            && arraysSameElements(this.state.questionSetIds2, rule.questionSetIds2));
        const errorMessages = [
            conflictingRule && "This matching sums rule already exists. (Rule #" + conflictingRule.id + ")",
            (this.state.questionSetIds1.length < 2 && this.state.questionSetIds2.length < 2)
                && "Matching sums rule requires that of the selections contain two or more questions.",
            this.state.questionSetIds1.length === 0 && "You must select at least one question from the first set",
            this.state.questionSetIds2.length === 0 && "You must select at least one question from the second set",
            this.state.questionSetIds1.some(id => this.state.questionSetIds2.includes(id))
                && "Question set 1 and 2 cannot contain the same question.",
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            this.context.setProjectDetails({
                surveyRules: [...this.context.surveyRules, {
                    id: getNextId(this.context.surveyRules),
                    ruleType: "matching-sums",
                    questionSetIds1: this.state.questionSetIds1,
                    questionSetIds2: this.state.questionSetIds2,
                    questionSetText1: this.context.surveyQuestions
                        .filter(q => this.state.questionSetIds1.includes(q.id))
                        .map(q => q.question),
                    questionSetText2: this.context.surveyQuestions
                        .filter(q => this.state.questionSetIds2.includes(q.id))
                        .map(q => q.question),
                }],
            });
        }
    }

    render() {
        const availableQuestions = this.context.surveyQuestions.filter(q => q.dataType === "number");
        return availableQuestions.length > 1
        ?
            <tr>
                <td colSpan="6">
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <label>
                                        <p>Select first question set:</p>
                                        <p>(Hold ctrl/cmd and select multiple questions)</p>
                                    </label>
                                </td>
                                <td colSpan="4">
                                    <select
                                        className="form-control form-control-sm overflow-auto"
                                        multiple="multiple"
                                        value={this.state.questionSetIds1}
                                        onChange={e => this.setState({
                                            questionSetIds1: Array.from(e.target.selectedOptions, i => Number(i.value)),
                                        })}
                                    >
                                        {availableQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                        }
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label>
                                        <p>Select second question set:</p>
                                        <p>(Hold ctrl/cmd and select multiple questions)</p>
                                    </label>
                                </td>
                                <td>
                                    <select
                                        className="form-control form-control-sm overflow-auto"
                                        multiple="multiple"
                                        value={this.state.questionSetIds2}
                                        onChange={e => this.setState({
                                            questionSetIds2: Array.from(e.target.selectedOptions, i => Number(i.value)),
                                        })}
                                    >
                                        {availableQuestions.map((question, uid) =>
                                            <option key={uid} value={question.id}>{question.question}</option>)
                                        }
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td style={{border: "none"}}></td>
                                <td style={{border: "none"}}>
                                    <input
                                        type="button"
                                        className="button mt-2"
                                        value="Add Survey Rule"
                                        onClick={this.addSurveyRule}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        :
            <tr><td colSpan="6"><label>There must be at least 2 number questions for this rule type</label></td></tr>;
    }
}
MatchingSums.contextType = ProjectContext;

export class IncompatibleAnswers extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            questionId1: -1,
            questionId2: -1,
            answerId1: -1,
            answerId2: -1,
        };
    }

    checkPair = (q1, a1, q2, a2) => q1 === q2 && a1 === a2;

    checkEquivalent = (q1, a1, q2, a2, q3, a3, q4, a4) =>
        (this.checkPair(q1, a1, q3, a3) && this.checkPair(q2, a2, q4, a4))
        || (this.checkPair(q1, a1, q4, a4) && this.checkPair(q2, a2, q3, a3));

    addSurveyRule = () => {
        const conflictingRule = this.context.surveyRules.find(rule => rule.ruleType === "incompatible-answers"
            && this.checkEquivalent(
                rule.question1,
                rule.answer1,
                rule.question2,
                rule.answer2,
                this.state.questionId1,
                this.state.answerId1,
                this.state.questionId2,
                this.state.answerId2
            ));
        const errorMessages = [
            conflictingRule && "This incompatible answers rule already exists. (Rule #" + conflictingRule.id + ")",
            (this.state.questionId1 === this.state.questionId2) && "You must select two different questions.",
            this.state.questionId1 < 1 && "You must select a valid first question.",
            this.state.questionId2 < 1 && "You must select a valid second question.",
            (this.state.answerId1 < 1 || this.state.answerId2 < 1) && "You must select an answer for each question.",
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            const q1 = this.context.surveyQuestions.find(q => q.id === this.state.questionId1);
            const q2 = this.context.surveyQuestions.find(q => q.id === this.state.questionId2);
            this.context.setProjectDetails({
                surveyRules: [...this.context.surveyRules, {
                    id: getNextId(this.context.surveyRules),
                    ruleType: "incompatible-answers",
                    question1: this.state.questionId1,
                    question2: this.state.questionId2,
                    answer1: this.state.answerId1,
                    answer2: this.state.answerId2,
                    questionText1: q1.question,
                    questionText2: q2.question,
                    answerText1: q1.answers.find(a => a.id === this.state.answerId1).answer,
                    answerText2: q2.answers.find(a => a.id === this.state.answerId2).answer,
                }],
            });
        }
    }

    safeFindAnswers = (questionId) => {
        const question = this.context.surveyQuestions.find(q => q.id === questionId);
        const answers = question && question.answers;
        return answers || [];
    }

    render() {
        const availableQuestions = this.context.surveyQuestions.filter(q => q.componentType !== "input");
        return availableQuestions.length > 1
        ?
            <tr>
                <td colSpan="6">
                    <table>
                        <tbody>
                            <tr>
                                <td colSpan="4"><label>Select the incompatible questions and answers: </label></td>
                            </tr>
                            <tr>
                                <td>Question 1:</td>
                                <td colSpan="3">
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.questionId1}
                                        onChange={e => this.setState({
                                            questionId1: Number(e.target.value),
                                            answerId1: -1,
                                        })}
                                    >
                                        <option value="-1">- Select Question 1 -</option>
                                        {availableQuestions.map((question, uid) =>
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
                                        value={this.state.answerId1}
                                        onChange={e => this.setState({answerId1: Number(e.target.value)})}
                                    >
                                        <option value="-1">- Select Answer 1 -</option>
                                        {this.safeFindAnswers(this.state.questionId1).map((answer, uid) =>
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
                                        value={this.state.questionId2}
                                        onChange={e => this.setState({
                                            questionId2: Number(e.target.value),
                                            answerId2: -1,
                                        })}
                                    >
                                        <option value="-1">- Select Question 2 -</option>
                                        {availableQuestions.map((question, uid) =>
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
                                        value={this.state.answerId2}
                                        onChange={e => this.setState({answerId2: Number(e.target.value)})}
                                    >
                                        <option value="-1">- Select Answer 2 -</option>
                                        {this.safeFindAnswers(this.state.questionId2).map((answer, uid) =>
                                            <option key={uid} value={answer.id}>{answer.answer}</option>)
                                        }
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td style={{border: "none"}}></td>
                                <td style={{border: "none"}}>
                                    <input
                                        type="button"
                                        className="button mt-2"
                                        value="Add Survey Rule"
                                        onClick={this.addSurveyRule}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        :
            <tr>
                <td colSpan="6">
                    <label>
                        There must be at least 2 questions where type is not input for this rule
                    </label>
                </td>
            </tr>;
    }
}
IncompatibleAnswers.contextType = ProjectContext;
