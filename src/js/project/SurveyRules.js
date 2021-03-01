import React from "react";

import {isNumber, sameContents} from "../utils/generalUtils";
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
            <div id="survey-rule-design">
                <SurveyRulesList
                    surveyRules={this.context.surveyRules}
                    setProjectDetails={this.context.setProjectDetails}
                    inDesignMode
                />
                <table id="ruleDesigner">
                    <caption style={{color: "black", captionSide: "top", fontWeight: "bold"}}>
                        New Rule:
                    </caption>
                    <tbody className="srd">
                        <tr>
                            <td>
                                <div style={{display: "flex"}}>
                                    <label className="text-nowrap m-2">Rule Type:</label>
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.selectedRuleType}
                                        onChange={(e) =>
                                            this.setState({selectedRuleType: e.target.value})
                                        }
                                    >
                                        <option value="text-match">Text Regex Match</option>
                                        <option value="numeric-range">Numeric Range</option>
                                        <option value="sum-of-answers">Sum of Answers</option>
                                        <option value="matching-sums">Matching Sums</option>
                                        <option value="incompatible-answers">
                                            Incompatible Answers
                                        </option>
                                    </select>
                                </div>
                            </td>
                        </tr>
                        {
                            {
                                "text-match": <TextMatch />,
                                "numeric-range": <NumericRange />,
                                "sum-of-answers": <SumOfAnswers />,
                                "matching-sums": <MatchingSums />,
                                "incompatible-answers": <IncompatibleAnswers />,
                            }[this.state.selectedRuleType]
                        }
                    </tbody>
                </table>
            </div>
        );
    }
}
SurveyRuleDesign.contextType = ProjectContext;

export class SurveyRulesList extends React.Component {
    deleteSurveyRule = (ruleId) => {
        const newSurveyRules = this.props.surveyRules.filter((rule) => rule.id !== ruleId);
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

    ruleTypeLabel = {
        "text-match": "Text Regex Match",
        "numeric-range": "Numeric Range",
        "sum-of-answers": "Sum of Answers",
        "matching-sums": "Matching Sums",
        "incompatible-answers": "Incompatible Answers",
    };

    ruleSpecificColumns = {
        "text-match": ({regex, questionsText}) => (
            <>
                <td>Regex: {regex}</td>
                <td>Questions: {questionsText.toString()}</td>
            </>
        ),

        "numeric-range": ({min, max, questionsText}) => (
            <>
                <td>
                    Min: {min}, Max: {max}
                </td>
                <td>Questions: {questionsText.toString()}</td>
            </>
        ),

        "sum-of-answers": ({validSum, questionsText}) => (
            <>
                <td>Valid Sum: {validSum}</td>
                <td>Questions: {questionsText.toString()}</td>
            </>
        ),

        "matching-sums": ({questionSetText1, questionSetText2}) => (
            <>
                <td>Questions Set 1: {questionSetText1.toString()}</td>
                <td>Questions Set 2: {questionSetText2.toString()}</td>
            </>
        ),

        "incompatible-answers": ({questionText1, answerText1, questionText2, answerText2}) => (
            <>
                <td>
                    Question 1: {questionText1}, Answer 1: {answerText1}
                </td>
                <td>
                    Question 2: {questionText2}, Answer 2: {answerText2}
                </td>
            </>
        ),
    };

    renderRuleRow = (rule, uid) => {
        const {id, ruleType} = rule;
        return (
            <tr id={"rule" + id} key={uid}>
                {this.props.inDesignMode && <td>{this.removeButton(id)}</td>}
                <td>{"Rule " + id}</td>
                <td>Type: {this.ruleTypeLabel[ruleType]}</td>
                {this.ruleSpecificColumns[ruleType].call(null, rule)}
            </tr>
        );
    };

    render() {
        const {surveyRules} = this.props;
        return (
            <>
                <label className="font-weight-bold">Rules:</label>
                {(surveyRules || []).length > 0 ? (
                    <table id="rules" className="srd" style={{width: "100%"}}>
                        <tbody>{surveyRules.map(this.renderRuleRow)}</tbody>
                    </table>
                ) : (
                    <label className="ml-3">No rules have been created for this survey.</label>
                )}
            </>
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
        const {surveyRules, surveyQuestions, setProjectDetails} = this.context;
        const {questionId, regex} = this.state;
        const conflictingRule = surveyRules.find(
            (rule) => rule.ruleType === "text-match" && rule.questionId === questionId
        );
        const errorMessages = [
            conflictingRule &&
                "A text regex match rule already exists for this question. (Rule " +
                    conflictingRule.id +
                    ")",
            questionId < 1 && "You must select a question.",
            regex.length === 0 && "The regex string is missing.",
        ].filter((m) => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map((s) => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [
                    ...surveyRules,
                    {
                        id: getNextId(surveyRules),
                        ruleType: "text-match",
                        questionId: questionId,
                        questionsText: [surveyQuestions.find((q) => q.id === questionId).question],
                        regex: regex,
                    },
                ],
            });
        }
    };

    render() {
        const availableQuestions = this.context.surveyQuestions.filter(
            (q) => q.componentType === "input" && q.dataType === "text"
        );
        return availableQuestions.length > 0 ? (
            <tr>
                <td>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <label>Survey Question: </label>
                                </td>
                                <td>
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.questionId}
                                        onChange={(e) =>
                                            this.setState({questionId: Number(e.target.value)})
                                        }
                                    >
                                        <option value={-1}>- Select Question -</option>
                                        {availableQuestions.map((question, uid) => (
                                            <option key={uid} value={question.id}>
                                                {question.question}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label>Enter regular expression: </label>
                                </td>
                                <td>
                                    <input
                                        className="form-control form-control-sm"
                                        type="text"
                                        placeholder="Regular expression"
                                        value={this.state.regex}
                                        onChange={(e) => this.setState({regex: e.target.value})}
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
        ) : (
            <tr>
                <td>
                    <label>This rule requires a question of type input-text.</label>
                </td>
            </tr>
        );
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
        const {surveyRules, surveyQuestions, setProjectDetails} = this.context;
        const {questionId, min, max} = this.state;
        const conflictingRule = surveyRules.find(
            (rule) => rule.ruleType === "numeric-range" && rule.questionId === questionId
        );
        const errorMessages = [
            conflictingRule &&
                "A numeric range rule already exists for this question. (Rule " +
                    conflictingRule.id +
                    ")",
            questionId < 1 && "You must select a question.",
            max <= min && "Max must be larger than min.",
        ].filter((m) => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map((s) => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [
                    ...surveyRules,
                    {
                        id: getNextId(surveyRules),
                        ruleType: "numeric-range",
                        questionId: questionId,
                        questionsText: [surveyQuestions.find((q) => q.id === questionId).question],
                        min: min,
                        max: max,
                    },
                ],
            });
        }
    };

    render() {
        const availableQuestions = this.context.surveyQuestions.filter(
            (q) => q.componentType === "input" && q.dataType === "number"
        );
        return availableQuestions.length > 0 ? (
            <tr>
                <td>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <label>Survey Question: </label>
                                </td>
                                <td>
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.questionId}
                                        onChange={(e) =>
                                            this.setState({questionId: Number(e.target.value)})
                                        }
                                    >
                                        <option value={-1}>- Select Question -</option>
                                        {availableQuestions.map((question, uid) => (
                                            <option key={uid} value={question.id}>
                                                {question.question}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label>Enter minimum: </label>
                                </td>
                                <td>
                                    <input
                                        className="form-control form-control-sm"
                                        type="number"
                                        placeholder="Minimum value"
                                        value={this.state.min}
                                        onChange={(e) =>
                                            this.setState({min: Number(e.target.value)})
                                        }
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label>Enter maximum: </label>
                                </td>
                                <td>
                                    <input
                                        className="form-control form-control-sm"
                                        type="number"
                                        placeholder="Maximum value"
                                        value={this.state.max}
                                        onChange={(e) =>
                                            this.setState({max: Number(e.target.value)})
                                        }
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
        ) : (
            <tr>
                <td>
                    <label>This rule requires a question of type input-number.</label>
                </td>
            </tr>
        );
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
        const {surveyRules, surveyQuestions, setProjectDetails} = this.context;
        const {questionIds, validSum} = this.state;
        const conflictingRule = surveyRules.find(
            (rule) =>
                rule.ruleType === "sum-of-answers" && sameContents(questionIds, rule.questions)
        );
        const errorMessages = [
            conflictingRule &&
                "A sum of answers rule already exists for these questions. (Rule " +
                    conflictingRule.id +
                    ")",
            questionIds.length < 2 &&
                "Sum of answers rule requires the selection of two or more questions.",
            !isNumber(validSum) && "You must ender a valid sum number.",
        ].filter((m) => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map((s) => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [
                    ...surveyRules,
                    {
                        id: getNextId(surveyRules),
                        ruleType: "sum-of-answers",
                        questions: questionIds,
                        questionsText: surveyQuestions
                            .filter((q) => questionIds.includes(q.id))
                            .map((q) => q.question),
                        validSum: validSum,
                    },
                ],
            });
        }
    };

    render() {
        const availableQuestions = this.context.surveyQuestions.filter(
            (q) => q.dataType === "number"
        );
        return availableQuestions.length > 1 ? (
            <tr>
                <td>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <label>
                                        <p>Select survey question:</p>
                                        <p>(Hold ctrl/cmd and select multiple questions)</p>
                                    </label>
                                </td>
                                <td>
                                    <select
                                        className="form-control form-control-sm overflow-auto"
                                        multiple="multiple"
                                        value={this.state.questionIds}
                                        onChange={(e) =>
                                            this.setState({
                                                questionIds: Array.from(
                                                    e.target.selectedOptions,
                                                    (i) => Number(i.value)
                                                ),
                                            })
                                        }
                                    >
                                        {availableQuestions.map((question, uid) => (
                                            <option key={uid} value={question.id}>
                                                {question.question}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label>Enter valid sum: </label>
                                </td>
                                <td>
                                    <input
                                        className="form-control form-control-sm"
                                        type="number"
                                        placeholder="Valid sum"
                                        value={this.state.validSum}
                                        onChange={(e) =>
                                            this.setState({validSum: Number(e.target.value)})
                                        }
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
        ) : (
            <tr>
                <td>
                    <label>There must be at least 2 number questions for this rule type.</label>
                </td>
            </tr>
        );
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
        const {surveyRules, surveyQuestions, setProjectDetails} = this.context;
        const {questionSetIds1, questionSetIds2} = this.state;
        const conflictingRule = surveyRules.find(
            (rule) =>
                rule.ruleType === "matching-sums" &&
                sameContents(questionSetIds1, rule.questionSetIds1) &&
                sameContents(questionSetIds2, rule.questionSetIds2)
        );
        const errorMessages = [
            conflictingRule &&
                "A matching sums rule already exists for these questions. (Rule " +
                    conflictingRule.id +
                    ")",
            questionSetIds1.length < 2 &&
                questionSetIds2.length < 2 &&
                "Matching sums rule requires that at least one of the question sets contain two or more questions.",
            questionSetIds1.length === 0 &&
                "You must select at least one question from the first set.",
            questionSetIds2.length === 0 &&
                "You must select at least one question from the second set.",
            questionSetIds1.some((id) => questionSetIds2.includes(id)) &&
                "Question set 1 and 2 cannot contain the same question.",
        ].filter((m) => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map((s) => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [
                    ...surveyRules,
                    {
                        id: getNextId(surveyRules),
                        ruleType: "matching-sums",
                        questionSetIds1: questionSetIds1,
                        questionSetIds2: questionSetIds2,
                        questionSetText1: surveyQuestions
                            .filter((q) => questionSetIds1.includes(q.id))
                            .map((q) => q.question),
                        questionSetText2: surveyQuestions
                            .filter((q) => questionSetIds2.includes(q.id))
                            .map((q) => q.question),
                    },
                ],
            });
        }
    };

    render() {
        const availableQuestions = this.context.surveyQuestions.filter(
            (q) => q.dataType === "number"
        );
        return availableQuestions.length > 1 ? (
            <tr>
                <td>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <label>
                                        <p>Select first question set:</p>
                                        <p>(Hold ctrl/cmd and select multiple questions)</p>
                                    </label>
                                </td>
                                <td>
                                    <select
                                        className="form-control form-control-sm overflow-auto"
                                        multiple="multiple"
                                        value={this.state.questionSetIds1}
                                        onChange={(e) =>
                                            this.setState({
                                                questionSetIds1: Array.from(
                                                    e.target.selectedOptions,
                                                    (i) => Number(i.value)
                                                ),
                                            })
                                        }
                                    >
                                        {availableQuestions.map((question, uid) => (
                                            <option key={uid} value={question.id}>
                                                {question.question}
                                            </option>
                                        ))}
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
                                        onChange={(e) =>
                                            this.setState({
                                                questionSetIds2: Array.from(
                                                    e.target.selectedOptions,
                                                    (i) => Number(i.value)
                                                ),
                                            })
                                        }
                                    >
                                        {availableQuestions.map((question, uid) => (
                                            <option key={uid} value={question.id}>
                                                {question.question}
                                            </option>
                                        ))}
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
        ) : (
            <tr>
                <td>
                    <label>There must be at least 2 number questions for this rule type.</label>
                </td>
            </tr>
        );
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
        (this.checkPair(q1, a1, q3, a3) && this.checkPair(q2, a2, q4, a4)) ||
        (this.checkPair(q1, a1, q4, a4) && this.checkPair(q2, a2, q3, a3));

    addSurveyRule = () => {
        const {surveyRules, surveyQuestions, setProjectDetails} = this.context;
        const {questionId1, answerId1, questionId2, answerId2} = this.state;
        const conflictingRule = surveyRules.find(
            ({question1, answer1, question2, answer2, ruleType}) =>
                ruleType === "incompatible-answers" &&
                this.checkEquivalent(
                    question1,
                    answer1,
                    question2,
                    answer2,
                    questionId1,
                    answerId1,
                    questionId2,
                    answerId2
                )
        );
        const errorMessages = [
            conflictingRule &&
                "An incompatible answers rule already exists for these question / answer pairs. (Rule " +
                    conflictingRule.id +
                    ")",
            questionId1 === questionId2 && "You must select two different questions.",
            questionId1 < 1 && "You must select a valid first question.",
            questionId2 < 1 && "You must select a valid second question.",
            (answerId1 < 1 || answerId2 < 1) && "You must select an answer for each question.",
        ].filter((m) => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map((s) => "- " + s).join("\n"));
        } else {
            const q1 = surveyQuestions.find((q) => q.id === questionId1);
            const q2 = surveyQuestions.find((q) => q.id === questionId2);
            setProjectDetails({
                surveyRules: [
                    ...surveyRules,
                    {
                        id: getNextId(surveyRules),
                        ruleType: "incompatible-answers",
                        question1: questionId1,
                        question2: questionId2,
                        answer1: answerId1,
                        answer2: answerId2,
                        questionText1: q1.question,
                        questionText2: q2.question,
                        answerText1: q1.answers.find((a) => a.id === answerId1).answer,
                        answerText2: q2.answers.find((a) => a.id === answerId2).answer,
                    },
                ],
            });
        }
    };

    safeFindAnswers = (questionId) => {
        const question = this.context.surveyQuestions.find((q) => q.id === questionId);
        const answers = question && question.answers;
        return answers || [];
    };

    render() {
        const availableQuestions = this.context.surveyQuestions.filter(
            (q) => q.componentType !== "input"
        );
        return availableQuestions.length > 1 ? (
            <tr>
                <td>
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    <label>Select the incompatible questions and answers: </label>
                                </td>
                            </tr>
                            <tr>
                                <td>Question 1:</td>
                                <td>
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.questionId1}
                                        onChange={(e) =>
                                            this.setState({
                                                questionId1: Number(e.target.value),
                                                answerId1: -1,
                                            })
                                        }
                                    >
                                        <option value="-1">- Select Question 1 -</option>
                                        {availableQuestions.map((question, uid) => (
                                            <option key={uid} value={question.id}>
                                                {question.question}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>Answer 1:</td>
                                <td>
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.answerId1}
                                        onChange={(e) =>
                                            this.setState({answerId1: Number(e.target.value)})
                                        }
                                    >
                                        <option value="-1">- Select Answer 1 -</option>
                                        {this.safeFindAnswers(this.state.questionId1).map(
                                            (answer, uid) => (
                                                <option key={uid} value={answer.id}>
                                                    {answer.answer}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>Question 2:</td>
                                <td>
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.questionId2}
                                        onChange={(e) =>
                                            this.setState({
                                                questionId2: Number(e.target.value),
                                                answerId2: -1,
                                            })
                                        }
                                    >
                                        <option value="-1">- Select Question 2 -</option>
                                        {availableQuestions.map((question, uid) => (
                                            <option key={uid} value={question.id}>
                                                {question.question}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td>Answer 2:</td>
                                <td>
                                    <select
                                        className="form-control form-control-sm"
                                        value={this.state.answerId2}
                                        onChange={(e) =>
                                            this.setState({answerId2: Number(e.target.value)})
                                        }
                                    >
                                        <option value="-1">- Select Answer 2 -</option>
                                        {this.safeFindAnswers(this.state.questionId2).map(
                                            (answer, uid) => (
                                                <option key={uid} value={answer.id}>
                                                    {answer.answer}
                                                </option>
                                            )
                                        )}
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
        ) : (
            <tr>
                <td>
                    <label>
                        There must be at least 2 questions where type is not input for this rule.
                    </label>
                </td>
            </tr>
        );
    }
}
IncompatibleAnswers.contextType = ProjectContext;
