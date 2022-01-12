import React, {useContext} from "react";

import SurveyRule from "../components/SurveyRule";
import SvgIcon from "../components/svg/SvgIcon";

import {isNumber} from "../utils/generalUtils";
import {filterObject, getNextInSequence, lengthObject, mapObjectArray, sameContents} from "../utils/sequence";
import {ProjectContext} from "./constants";

export const SurveyRuleDesign = () => {
    const {setProjectDetails, surveyRules, surveyQuestions} = useContext(ProjectContext);
    return (
        <div id="survey-rule-design">
            <SurveyRulesList
                inDesignMode
                setProjectDetails={setProjectDetails}
                surveyQuestions={surveyQuestions}
                surveyRules={surveyRules}
            />
            <SurveyRulesForm/>
        </div>
    );
};

export class SurveyRulesList extends React.Component {
    deleteSurveyRule = ruleId => {
        const newSurveyRules = this.props.surveyRules.filter(rule => rule.id !== ruleId);
        this.props.setProjectDetails({surveyRules: newSurveyRules});
    };

    removeButton = ruleId => (
        <button
            className="btn btn-sm btn-outline-red mt-0 mr-3 mb-3"
            onClick={() => this.deleteSurveyRule(ruleId)}
            title="Delete Rule"
            type="button"
        >
            <SvgIcon icon="trash" size="1.25rem"/>
        </button>
    );

    renderRuleRow = r => {
        const {inDesignMode, surveyQuestions} = this.props;
        return (
            <div key={r.id} style={{display: "flex", alignItems: "center"}}>
                {inDesignMode && this.removeButton(r.id)}
                <SurveyRule ruleOptions={r} surveyQuestions={surveyQuestions}/>
            </div>
        );
    };

    render() {
        const {surveyRules} = this.props;
        return (surveyRules || []).length > 0
            ? (
                <div>{surveyRules.map(this.renderRuleRow)}</div>
            ) : <label className="ml-3">No rules have been created for this survey.</label>;
    }
}

class SurveyRulesForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedRuleType: "text-match"
        };
    }

    render() {
        const {selectedRuleType} = this.state;
        return (
            <div className="mt-3 d-flex justify-content-center">
                <div style={{display: "flex", flexFlow: "column", width: "25rem"}}>
                    <h2>New Rule</h2>
                    <div className="form-group">
                        <label>Rule Type</label>
                        <select
                            className="form-control form-control-sm"
                            onChange={e => this.setState({selectedRuleType: e.target.value})}
                            value={selectedRuleType}
                        >
                            <option value="text-match">Text Regex Match</option>
                            <option value="numeric-range">Numeric Range</option>
                            <option value="sum-of-answers">Sum of Answers</option>
                            <option value="matching-sums">Matching Sums</option>
                            <option value="incompatible-answers">Incompatible Answers</option>
                        </select>
                    </div>
                    {{
                        "text-match": <TextMatchForm/>,
                        "numeric-range": <NumericRangeForm/>,
                        "sum-of-answers": <SumOfAnswersForm/>,
                        "matching-sums": <MatchingSumsForm/>,
                        "incompatible-answers": <IncompatibleAnswersForm/>
                    }[selectedRuleType]}
                </div>
            </div>
        );
    }
}

class TextMatchForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            regex: "",
            questionId: -1
        };
    }

    addSurveyRule = () => {
        const {surveyRules, setProjectDetails} = this.context;
        const {questionId, regex} = this.state;
        const conflictingRule = surveyRules.find(rule => rule.ruleType === "text-match"
            && rule.questionId === questionId);
        const errorMessages = [
            conflictingRule && "A text regex match rule already exists for this question. (Rule " + conflictingRule.id + ")",
            questionId < 0 && "You must select a question.",
            regex.length === 0 && "The regex string is missing."
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [...surveyRules, {
                    id: getNextInSequence(surveyRules),
                    ruleType: "text-match",
                    questionId,
                    regex
                }]
            });
        }
    };

    render() {
        const {questionId, regex} = this.state;
        const {surveyQuestions} = this.context;
        const availableQuestions = filterObject(
            surveyQuestions,
            ([_id, sq]) => sq.componentType === "input" && sq.dataType === "text"
        );
        return lengthObject(availableQuestions) > 0
            ? (
                <>
                    <div className="form-group">
                        <label>Survey Question</label>
                        <select
                            className="form-control form-control-sm"
                            onChange={e => this.setState({questionId: Number(e.target.value)})}
                            value={questionId}
                        >
                            <option value={-1}>- Select Question -</option>
                            {mapObjectArray(availableQuestions, ([aqId, aq]) =>
                                <option key={aqId} value={aqId}>{aq.question}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Enter regular expression</label>
                        <input
                            className="form-control form-control-sm"
                            onChange={e => this.setState({regex: e.target.value})}
                            placeholder="Regular expression"
                            type="text"
                            value={regex}
                        />
                    </div>
                    <div className="d-flex justify-content-end">
                        <input
                            className="btn btn-lightgreen"
                            onClick={this.addSurveyRule}
                            type="button"
                            value="Add Survey Rule"
                        />
                    </div>
                </>
            ) : <label>This rule requires a question of type input-text.</label>;
    }
}
TextMatchForm.contextType = ProjectContext;

class NumericRangeForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            questionId: -1,
            min: 0,
            max: 0
        };
    }

    addSurveyRule = () => {
        const {surveyRules, setProjectDetails} = this.context;
        const {questionId, min, max} = this.state;
        const conflictingRule = surveyRules.find(rule => rule.ruleType === "numeric-range"
            && rule.questionId === questionId);
        const errorMessages = [
            conflictingRule && "A numeric range rule already exists for this question. (Rule " + conflictingRule.id + ")",
            questionId < 0 && "You must select a question.",
            (max <= min) && "Max must be larger than min."
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [...surveyRules, {
                    id: getNextInSequence(surveyRules),
                    ruleType: "numeric-range",
                    questionId,
                    min,
                    max
                }]
            });
        }
    };

    render() {
        const {questionId, min, max} = this.state;
        const {surveyQuestions} = this.context;
        const availableQuestions = filterObject(
            surveyQuestions,
            ([_id, sq]) => sq.componentType === "input" && sq.dataType === "number"
        );
        return lengthObject(availableQuestions) > 0
            ? (
                <>
                    <div className="form-group">
                        <label>Survey Question</label>
                        <select
                            className="form-control form-control-sm"
                            onChange={e => this.setState({questionId: Number(e.target.value)})}
                            value={questionId}
                        >
                            <option value={-1}>- Select Question -</option>
                            {mapObjectArray(availableQuestions, ([aqId, aq]) =>
                                <option key={aqId} value={aqId}>{aq.question}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Enter minimum</label>
                        <input
                            className="form-control form-control-sm"
                            onChange={e => this.setState({min: Number(e.target.value)})}
                            placeholder="Minimum value"
                            type="number"
                            value={min}
                        />
                    </div>
                    <div className="form-group">
                        <label>Enter maximum</label>
                        <input
                            className="form-control form-control-sm"
                            onChange={e => this.setState({max: Number(e.target.value)})}
                            placeholder="Maximum value"
                            type="number"
                            value={max}
                        />
                    </div>
                    <div className="d-flex justify-content-end">
                        <input
                            className="btn btn-lightgreen"
                            onClick={this.addSurveyRule}
                            type="button"
                            value="Add Survey Rule"
                        />
                    </div>
                </>
            ) : <label>This rule requires a question of type input-number.</label>;
    }
}
NumericRangeForm.contextType = ProjectContext;

class SumOfAnswersForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            validSum: 0,
            questionIds: []
        };
    }

    addSurveyRule = () => {
        const {surveyRules, setProjectDetails} = this.context;
        const {questionIds, validSum} = this.state;
        const conflictingRule = surveyRules.find(rule => rule.ruleType === "sum-of-answers"
            && sameContents(questionIds, rule.questionIds));
        const errorMessages = [
            conflictingRule && "A sum of answers rule already exists for these questions. (Rule " + conflictingRule.id + ")",
            (questionIds.length < 2) && "Sum of answers rule requires the selection of two or more questions.",
            !isNumber(validSum) && "You must ender a valid sum number."
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [...surveyRules, {
                    id: getNextInSequence(surveyRules),
                    ruleType: "sum-of-answers",
                    questionIds,
                    validSum
                }]
            });
        }
    };

    render() {
        const {questionIds, validSum} = this.state;
        const {surveyQuestions} = this.context;
        const availableQuestions = filterObject(surveyQuestions, ([_id, sq]) => sq.dataType === "number");
        return lengthObject(availableQuestions) > 1
            ? (
                <>
                    <div className="form-group">
                        <label>Select survey question</label>
                        <select
                            className="form-control form-control-sm overflow-auto"
                            multiple="multiple"
                            onChange={e => this.setState({
                                questionIds: Array.from(e.target.selectedOptions, i => Number(i.value))
                            })}
                            value={questionIds}
                        >
                            {mapObjectArray(availableQuestions, ([aqId, aq]) =>
                                <option key={aqId} value={aqId}>{aq.question}</option>)}
                        </select>
                        <small className="form-text text-muted">Hold ctrl/cmd and select multiple questions</small>
                    </div>
                    <div className="form-group">
                        <label>Enter valid sum</label>
                        <input
                            className="form-control form-control-sm"
                            onChange={e => this.setState({validSum: Number(e.target.value)})}
                            placeholder="Valid sum"
                            type="number"
                            value={validSum}
                        />
                    </div>
                    <div className="d-flex justify-content-end">
                        <input
                            className="btn btn-lightgreen"
                            onClick={this.addSurveyRule}
                            type="button"
                            value="Add Survey Rule"
                        />
                    </div>
                </>
            ) : <label>There must be at least 2 number questions for this rule type.</label>;
    }
}
SumOfAnswersForm.contextType = ProjectContext;

class MatchingSumsForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            questionIds1: [],
            questionIds2: []
        };
    }

    addSurveyRule = () => {
        const {surveyRules, setProjectDetails} = this.context;
        const {questionIds1, questionIds2} = this.state;
        const conflictingRule = surveyRules.find(rule => rule.ruleType === "matching-sums"
            && sameContents(questionIds1, rule.questionIds1)
            && sameContents(questionIds2, rule.questionIds2));
        const errorMessages = [
            conflictingRule && "A matching sums rule already exists for these questions. (Rule " + conflictingRule.id + ")",
            (questionIds1.length < 2 && questionIds2.length < 2)
                && "Matching sums rule requires that at least one of the question sets contain two or more questions.",
            questionIds1.length === 0 && "You must select at least one question from the first set.",
            questionIds2.length === 0 && "You must select at least one question from the second set.",
            questionIds1.some(id => questionIds2.includes(id))
                && "Question set 1 and 2 cannot contain the same question."
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [...surveyRules, {
                    id: getNextInSequence(surveyRules),
                    ruleType: "matching-sums",
                    questionIds1,
                    questionIds2
                }]
            });
        }
    };

    render() {
        const {questionIds1, questionIds2} = this.state;
        const {surveyQuestions} = this.context;
        const availableQuestions = filterObject(surveyQuestions, ([_id, sq]) => sq.dataType === "number");
        return lengthObject(availableQuestions) > 1
            ? (
                <>
                    <div className="form-group">
                        <label>Select first question set</label>
                        <select
                            className="form-control form-control-sm overflow-auto"
                            multiple="multiple"
                            onChange={e => this.setState({
                                questionIds1: Array.from(e.target.selectedOptions, i => Number(i.value))
                            })}
                            value={questionIds1}
                        >
                            {mapObjectArray(availableQuestions, ([aqId, aq]) =>
                                <option key={aqId} value={aqId}>{aq.question}</option>)}
                        </select>
                        <small className="form-text text-muted">Hold ctrl/cmd and select multiple questions</small>
                    </div>
                    <div className="form-group">
                        <label>Select second question set</label>
                        <select
                            className="form-control form-control-sm overflow-auto"
                            multiple="multiple"
                            onChange={e => this.setState({
                                questionIds2: Array.from(e.target.selectedOptions, i => Number(i.value))
                            })}
                            value={questionIds2}
                        >
                            {mapObjectArray(availableQuestions, ([aqId, aq]) =>
                                <option key={aqId} value={aqId}>{aq.question}</option>)}
                        </select>
                        <small className="form-text text-muted">Hold ctrl/cmd and select multiple questions</small>
                    </div>
                    <div className="d-flex justify-content-end">
                        <input
                            className="btn btn-lightgreen"
                            onClick={this.addSurveyRule}
                            type="button"
                            value="Add Survey Rule"
                        />
                    </div>
                </>
            ) : <label>There must be at least 2 number questions for this rule type.</label>;
    }
}
MatchingSumsForm.contextType = ProjectContext;

class IncompatibleAnswersForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            questionId1: -1,
            questionId2: -1,
            answerId1: -1,
            answerId2: -1
        };
    }

    checkPair = (q1, a1, q2, a2) => q1 === q2 && a1 === a2;

    checkEquivalent = (q1, a1, q2, a2, q3, a3, q4, a4) =>
        (this.checkPair(q1, a1, q3, a3) && this.checkPair(q2, a2, q4, a4))
            || (this.checkPair(q1, a1, q4, a4) && this.checkPair(q2, a2, q3, a3));

    addSurveyRule = () => {
        const {surveyRules, setProjectDetails} = this.context;
        const {questionId1, answerId1, questionId2, answerId2} = this.state;
        const conflictingRule = surveyRules.find(rule =>
            rule.ruleType === "incompatible-answers"
            && this.checkEquivalent(
                rule.questionId1,
                rule.answerId1,
                rule.questionId2,
                rule.answerId2,
                questionId1,
                answerId1,
                questionId2,
                answerId2
            ));
        const errorMessages = [
            conflictingRule
                && "An incompatible answers rule already exists for these question / answer pairs. (Rule "
                + conflictingRule.id
                + ")",
            (questionId1 === questionId2) && "You must select two different questions.",
            questionId1 < 1 && "You must select a valid first question.",
            questionId2 < 1 && "You must select a valid second question.",
            (answerId1 < 1 || answerId2 < 1) && "You must select an answer for each question."
        ].filter(m => m);
        if (errorMessages.length > 0) {
            alert(errorMessages.map(s => "- " + s).join("\n"));
        } else {
            setProjectDetails({
                surveyRules: [...surveyRules, {
                    id: getNextInSequence(surveyRules),
                    ruleType: "incompatible-answers",
                    questionId1,
                    questionId2,
                    answerId1,
                    answerId2
                }]
            });
        }
    };

    safeFindAnswers = questionId => {
        const {question} = this.context.surveyQuestions[questionId];
        return question.answers || {};
    };

    render() {
        const {questionId1, answerId1, questionId2, answerId2} = this.state;
        const {surveyQuestions} = this.context;
        const availableQuestions = filterObject(surveyQuestions, ([_id, sq]) => sq.componentType !== "input");
        return lengthObject(availableQuestions) > 1
            ? (
                <>
                    <strong className="mb-2" style={{textAlign: "center"}}>Select the incompatible questions and answers</strong>
                    <div className="form-group">
                        <label>Question 1</label>
                        <select
                            className="form-control form-control-sm"
                            onChange={e => this.setState({
                                questionId1: Number(e.target.value),
                                answerId1: -1
                            })}
                            value={questionId1}
                        >
                            <option value="-1">- Select Question 1 -</option>
                            {mapObjectArray(availableQuestions, ([aqId, aq]) =>
                                <option key={aqId} value={aqId}>{aq.question}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Answer 1</label>
                        <select
                            className="form-control form-control-sm"
                            onChange={e => this.setState({answerId1: Number(e.target.value)})}
                            value={answerId1}
                        >
                            <option value="-1">- Select Answer 1 -</option>
                            {mapObjectArray(this.safeFindAnswers(questionId1), ([ansId, ans]) =>
                                <option key={ansId} value={ansId}>{ans.answer}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Question 2</label>
                        <select
                            className="form-control form-control-sm"
                            onChange={e => this.setState({
                                questionId2: Number(e.target.value),
                                answerId2: -1
                            })}
                            value={questionId2}
                        >
                            <option value="-1">- Select Question 2 -</option>
                            {mapObjectArray(availableQuestions, ([aqId, aq]) =>
                                <option key={aqId} value={aqId}>{aq.question}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Answer 2</label>
                        <select
                            className="form-control form-control-sm"
                            onChange={e => this.setState({answerId2: Number(e.target.value)})}
                            value={answerId2}
                        >
                            <option value="-1">- Select Answer 2 -</option>
                            {mapObjectArray(this.safeFindAnswers(questionId2), ([ansId, ans]) =>
                                <option key={ansId} value={ansId}>{ans.answer}</option>)}
                        </select>
                    </div>
                    <div className="d-flex justify-content-end">
                        <input
                            className="btn btn-lightgreen"
                            onClick={this.addSurveyRule}
                            type="button"
                            value="Add Survey Rule"
                        />
                    </div>
                </>
            ) : <label>There must be at least 2 questions where type is not input for this rule.</label>;
    }
}
IncompatibleAnswersForm.contextType = ProjectContext;
