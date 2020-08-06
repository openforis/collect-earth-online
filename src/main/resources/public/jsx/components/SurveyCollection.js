import React, { Fragment } from "react";

import { removeEnumerator } from "../utils/surveyUtils";
import { UnicodeIcon } from "../utils/textUtils";
import { CollapsibleTitle } from "./FormComponents";

export class SurveyCollection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentNodeIndex: 0,
            topLevelNodeIds: [],
            showSurveyQuestions: true,
        };
    }

    componentDidMount() {
        const topLevelNodeIds = this.props.surveyQuestions
            .filter(sq => sq.parentQuestion === -1)
            .sort((a, b) => a.id - b.id)
            .map(sq => sq.id);
        this.setState({
            topLevelNodeIds: topLevelNodeIds,
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.currentNodeIndex !== prevState.currentNodeIndex) {
            this.props.setSelectedQuestion(this.getNodeById(this.state.topLevelNodeIds[this.state.currentNodeIndex]));

        } else if (this.props.selectedQuestion.id !== prevProps.selectedQuestion.id
            && this.props.selectedQuestion.parentQuestion === -1) {

            this.setState({ currentNodeIndex: this.state.topLevelNodeIds.indexOf(this.props.selectedQuestion.id) });
        }
    }

    prevSurveyQuestionTree = () => {
        if (this.state.currentNodeIndex > 0) {
            this.setState({ currentNodeIndex: this.state.currentNodeIndex - 1 });
        } else {
            alert("There are no previous questions.");
        }
    };

    nextSurveyQuestionTree = () => {
        if (this.state.currentNodeIndex < this.state.topLevelNodeIds.length - 1) {
            this.setState({ currentNodeIndex: this.state.currentNodeIndex + 1 });
        } else {
            alert("There are no more questions.");
        }
    };

    setSurveyQuestionTree = (index) => this.setState({ currentNodeIndex: index });

    checkAllSubAnswers = (currentQuestionId) => {
        const { surveyQuestions } = this.props;
        const { visible, answered } = surveyQuestions.find(sq => sq.id === currentQuestionId);
        const childQuestions = surveyQuestions.filter(sq => sq.parentQuestion === currentQuestionId);

        return visible.length === answered.length
                    && (childQuestions.length === 0
                    || childQuestions.every(cq => this.checkAllSubAnswers(cq.id)));
    };

    getTopColor = (node) => this.checkAllSubAnswers(node.id)
                                ? "0px 0px 6px 4px #3bb9d6 inset"
                                : node.answered.length > 0
                                    ? "0px 0px 6px 4px yellow inset"
                                    : "0px 0px 6px 4px red inset";

    getNodeById = (id) => this.props.surveyQuestions.find(sq => sq.id === id);

    getRulesById = (id) =>
        (this.props.surveyRules || [])
            .filter(rule =>
                (rule.questionId && rule.questionId === id)
                    || (rule.questions && rule.questions.includes(id))
                    || (rule.questionSetIds1 && (rule.questionSetIds1.includes(id) || rule.questionSetIds2.includes(id)))
                    || (rule.question1 && (rule.question1 === id || rule.question2 === id)))
            .map(r =>
                r.questionId
                    ? r.regex
                        ? "Rule: " + r.ruleType + " | Question '" + r.questionsText + "' should match the pattern: " + r.regex + "."
                        : "Rule: " + r.ruleType + " | Question '" + r.questionsText + "' should be between " + r.min + " and " + r.max + "."
                    : r.questions
                        ? "Rule: " + r.ruleType + " | Questions '" + r.questionsText + "' should sum up to " + r.validSum + "."
                        : r.questionSetIds1
                            ? "Rule: " + r.ruleType + " | Sum of '" + r.questionSetText1 + "' should be equal to sum of  '" + r.questionSetText2 + "'."
                            : "Rule: " + r.ruleType + " | 'Question1: " + r.questionText1 + ", Answer1: " + r.answerText1 + "' is not compatible with 'Question2: " + r.questionText2 + ", Answer2: " + r.answerText2 + "'.")
            .join("\n");

    render() {
        return (
            <fieldset className="justify-content-center text-center">
                <CollapsibleTitle
                    title="Survey Questions"
                    showGroup={this.state.showSurveyQuestions}
                    toggleShow={() => this.setState({ showSurveyQuestions: !this.state.showSurveyQuestions })}
                />
                {this.state.showSurveyQuestions
                ? this.props.surveyQuestions.length > 0
                    ?
                        <div className="SurveyQuestions__questions">
                            <div className="SurveyQuestions__top-questions">
                                <button
                                    type="button"
                                    id="prev-survey-question"
                                    className="btn btn-outline-lightgreen m-2"
                                    onClick={this.prevSurveyQuestionTree}
                                    disabled={this.state.currentNodeIndex === 0}
                                    style={{ opacity: this.state.currentNodeIndex === 0 ? "0.25" : "1.0" }}
                                >
                                    {"<"}
                                </button>
                                {this.state.topLevelNodeIds.map((node, i) =>
                                    <button
                                        type="button"
                                        id="top-select"
                                        key={i}
                                        className="btn btn-outline-lightgreen m-2"
                                        title={removeEnumerator(this.getNodeById(node).question)}
                                        onClick={() => this.setSurveyQuestionTree(i)}
                                        style={{
                                            boxShadow: `${(i === this.state.currentNodeIndex)
                                                ? "0px 0px 2px 2px black inset,"
                                                : ""}
                                                    ${this.getTopColor(this.getNodeById(node))}
                                                    `,
                                        }}
                                    >
                                        {i + 1}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    id="next-survey-question"
                                    className="btn btn-outline-lightgreen"
                                    onClick={this.nextSurveyQuestionTree}
                                    disabled={this.state.currentNodeIndex === this.state.topLevelNodeIds.length - 1}
                                    style={{ opacity: this.state.currentNodeIndex === this.state.topLevelNodeIds.length - 1 ? "0.25" : "1.0" }}
                                >
                                    {">"}
                                </button>
                            </div>
                            {this.state.topLevelNodeIds.length > 0 &&
                            <SurveyQuestionTree
                                hierarchyLabel=""
                                surveyNode={this.getNodeById(this.state.topLevelNodeIds[this.state.currentNodeIndex])}
                                surveyQuestions={this.props.surveyQuestions}
                                surveyRules={this.props.surveyRules}
                                setCurrentValue={this.props.setCurrentValue}
                                selectedQuestion={this.props.selectedQuestion}
                                selectedSampleId={this.props.selectedSampleId}
                                setSelectedQuestion={this.props.setSelectedQuestion}
                                getRulesById={this.getRulesById}
                            />
                            }
                        </div>
                    :
                        <h3>This project is missing survey questions!</h3>
                : ""
                }
            </fieldset>
        );
    }
}

class SurveyQuestionTree extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showAnswers: true,
        };
    }

    toggleShowAnswers = () => this.setState({ showAnswers: !this.state.showAnswers });

    render() {
        const childNodes = this.props.surveyQuestions.filter(surveyNode => surveyNode.parentQuestion === this.props.surveyNode.id);

        const shadowColor = this.props.surveyNode.answered.length === 0
                            ? "0px 0px 6px 4px red inset"
                            : this.props.surveyNode.answered.length === this.props.surveyNode.visible.length
                                ? "0px 0px 6px 5px #3bb9d6 inset"
                                : "0px 0px 6px 4px yellow inset";
        return (
            <fieldset className={"mb-1 justify-content-center text-center"}>
                <div className="SurveyQuestionTree__question-buttons btn-block my-2 d-flex">
                    <button
                        type="button"
                        id={this.props.surveyNode.question + "_" + this.props.surveyNode.id}
                        className="text-center btn btn-outline-lightgreen btn-sm text-bold px-3 py-2 mr-1"
                        onClick={this.toggleShowAnswers}
                    >
                        {this.state.showAnswers ? <span>-</span> : <span>+</span>}
                    </button>
                    <button
                        type="button"
                        id={this.props.surveyNode.question + "_" + this.props.surveyNode.id}
                        className="text-center btn btn-outline-lightgreen btn-sm col overflow-hidden text-truncate"
                        title={this.props.getRulesById(this.props.surveyNode.id).length > 0 ? this.props.getRulesById(this.props.surveyNode.id) : "No rules apply to this question."}
                        style={{
                            boxShadow: `${(this.props.surveyNode.id === this.props.selectedQuestion.id)
                                    ? "0px 0px 2px 2px black inset,"
                                    : ""}
                                    ${shadowColor}`,
                        }}
                        onClick={() => this.props.setSelectedQuestion(this.props.surveyNode)}
                    >
                        {this.props.hierarchyLabel + removeEnumerator(this.props.surveyNode.question)}
                    </button>
                </div>

                {this.state.showAnswers &&
                    <SurveyAnswers
                        surveyNode={this.props.surveyNode}
                        selectedSampleId={this.props.selectedSampleId}
                        setCurrentValue={this.props.setCurrentValue}
                        surveyRules={this.props.surveyRules}
                        surveyQuestions={this.props.surveyQuestions}
                    />
                }
                {
                    childNodes.map((childNode, uid) =>
                        <Fragment key={uid}>
                            {this.props.surveyQuestions.find(sq => sq.id === childNode.id).visible.length > 0 &&
                                <SurveyQuestionTree
                                    key={uid}
                                    surveyNode={childNode}
                                    surveyQuestions={this.props.surveyQuestions}
                                    setCurrentValue={this.props.setCurrentValue}
                                    selectedQuestion={this.props.selectedQuestion}
                                    selectedSampleId={this.props.selectedSampleId}
                                    setSelectedQuestion={this.props.setSelectedQuestion}
                                    hierarchyLabel={this.props.hierarchyLabel + "- "}
                                    getRulesById={this.props.getRulesById}
                                />
                            }
                        </Fragment>
                    )
                }
            </fieldset>
        );
    }
}

function AnswerButton({ surveyNode, surveyNode: { answers, answered }, selectedSampleId, setCurrentValue }) {
    return <ul className={"samplevalue justify-content-center"}>
        {answers.map((ans, uid) =>
            <li key={uid} className="mb-1">
                <button
                    type="button"
                    className="btn btn-outline-darkgray btn-sm btn-block pl-1 overflow-hidden text-truncate"
                    title={ans.answer}
                    id={ans.answer + "_" + ans.id}
                    name={ans.answer + "_" + ans.id}
                    style={{
                        boxShadow: answered.some(a => a.answerId === ans.id && a.sampleId === selectedSampleId)
                            ? "0px 0px 8px 3px black inset"
                            : answered.some(a => a.answerId === ans.id)
                                ? "0px 0px 8px 3px grey inset"
                                : "initial",
                    }}
                    onClick={() => setCurrentValue(surveyNode, ans.id, ans.answer)}
                >
                    <div
                        className="circle mr-2"
                        style={{
                            backgroundColor: ans.color,
                            border: "1px solid",
                            float: "left",
                            marginTop: "4px",
                        }}
                    />
                    <span className="small">{ans.answer}</span>
                </button>
            </li>
        )}
    </ul>;
}

function AnswerRadioButton({ surveyNode, surveyNode: { answers, answered }, selectedSampleId, setCurrentValue }) {
    return <ul className={"samplevalue justify-content-center"}>
        {answers.map((ans, uid) =>
            <li key={uid} className="mb-1">
                <button
                    type="button"
                    className="btn btn-outline-darkgray btn-sm btn-block pl-1 overflow-hidden text-truncate"
                    title={ans.answer}
                    id={ans.answer + "_" + ans.id}
                    name={ans.answer + "_" + ans.id}
                    onClick={() => setCurrentValue(surveyNode, ans.id, ans.answer)}
                >
                    <div
                        className="circle ml-1"
                        style={{
                            border: "1px solid black",
                            float: "left",
                            marginTop: "4px",
                            boxShadow: "0px 0px 0px 3px " + ans.color,
                            backgroundColor: answered.some(a => a.answerId === ans.id && a.sampleId === selectedSampleId)
                                                ? "black"
                                                : answered.some(a => a.answerId === ans.id)
                                                    ? "#e8e8e8"
                                                    : "white",
                        }}
                    />
                    <span className="small">{ans.answer}</span>
                </button>
            </li>
        )}
    </ul>;
}

class AnswerInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newInput: "",
        };
    }

    componentDidMount() {
        this.resetInputText();
    }

    componentDidUpdate(prevProps) {
        if (this.props.surveyNode.id !== prevProps.surveyNode.id) {
            const matchingNode = this.props.surveyNode.answered
                .find(a => a.answerId === this.props.surveyNode.answers[0].id);
            this.setState({ newInput: matchingNode ? matchingNode.answerText : "" });
        }
        if (this.props.selectedSampleId !== prevProps.selectedSampleId) {
            this.resetInputText();
        }
    }

    resetInputText = () => {
        const matchingNode = this.props.surveyNode.answered
            .find(a => a.answerId === this.props.surveyNode.answers[0].id
                  && a.sampleId === this.props.selectedSampleId);
        this.setState({
            newInput: matchingNode ? matchingNode.answerText : "",
        });
    }

    updateInputValue = (value) => this.setState({ newInput: value });

    render() {
        const { surveyNode, surveyNode: { answers, dataType }, setCurrentValue } = this.props;
        return (
            <div className="d-inline-flex">
                <div className="pr-2 pt-2">
                    <div
                        className="circle"
                        style={{
                            backgroundColor: answers[0].color,
                            border: "1px solid",
                        }}
                    />
                </div>
                <input
                    type={dataType}
                    className="form-control mr-2"
                    placeholder={answers[0].answer}
                    id={answers[0].answer + "_" + answers[0].id}
                    name={answers[0].answer + "_" + answers[0].id}
                    value={this.state.newInput}
                    onChange={e => this.updateInputValue(e.target.value)}
                />
                <input
                    id="save-input"
                    className="text-center btn btn-outline-lightgreen btn-sm"
                    type="button"
                    name="save-input"
                    value="Save"
                    onClick={() => setCurrentValue(surveyNode, answers[0].id, this.state.newInput)}
                />
            </div>
        );
    }
}

class AnswerDropDown extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showDropdown: false,
        };
    }

    componentDidUpdate (prevProps) {
        if (this.props.surveyNode !== prevProps.surveyNode) {
            this.setState({ showDropdown: false });
        }
    }

    toggleDropDown = () => this.setState({ showDropdown: !this.state.showDropdown });

    render () {
        const { surveyNode, surveyNode: { answers, answered }, selectedSampleId, setCurrentValue } = this.props;
        const options = answers.map((ans, uid) =>
            <div
                key={uid}
                onMouseDown={() => setCurrentValue(surveyNode, ans.id, ans.answer)}
                className="d-inline-flex py-2 border-bottom"
                style={{ backgroundColor: answered.some(a => a.answerId === ans.id) ? "#e8e8e8" : "#f1f1f1" }}
            >
                <div className="col-1">
                    <span
                        className="dot"
                        style={{
                            height: "15px",
                            width: "15px",
                            backgroundColor: ans.color,
                            borderRadius: "50%",
                            display: "inline-block",
                        }}
                    />
                </div>
                <div className="col-11 text-left">
                    {ans.answer}
                </div>
            </div>
        );

        return (
            <div className="mb-1 d-flex flex-column align-items-start">
                <div className="dropdown-selector ml-3 d-flex pl-0 col-12">
                    <div className="SelectedItem d-inline-flex border col-8">
                        {answers.map(ans =>
                            answered.some(a => a.answerId === ans.id && a.sampleId === selectedSampleId) &&
                            <Fragment>
                                <div className="col-1 mt-2">
                                    <span
                                        className="dot"
                                        style={{
                                            height: "15px",
                                            width: "15px",
                                            backgroundColor: ans.color,
                                            borderRadius: "50%",
                                            display: "inline-block",
                                        }}
                                    />
                                </div>
                                <div className="col-11 text-left mt-1">
                                    {ans.answer}
                                </div>
                            </Fragment>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={this.toggleDropDown}
                        onBlur={() => this.setState({ showDropdown: false })}
                        className="dropbtn"
                        style={{
                            backgroundColor: "#31BAB0",
                            color: "white",
                            padding: "8px 16px",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        <UnicodeIcon icon="downCaret"/>
                    </button>
                </div>
                <div
                    id="dropdown-placeholder"
                    className={"dropdown-content col-8"}
                >
                    <div
                        id="myDropdown"
                        className="dropdown-content flex-column container"
                        style={{
                            display: this.state.showDropdown ? "flex" : "none",
                            position: "absolute",
                            backgroundColor: "#f1f1f1",
                            overflow: "auto",
                            boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
                            zIndex: "10",
                            cursor: "pointer",
                        }}
                    >
                        {options}
                    </div>
                </div>
            </div>
        );
    }
}

function SurveyAnswers(props) {
    if (props.surveyNode.componentType.toLowerCase() === "radiobutton") {
        return (<AnswerRadioButton {...props} />);
    } else if (props.surveyNode.componentType.toLowerCase() === "input") {
        return (<AnswerInput {...props} />);
    } else if (props.surveyNode.componentType.toLowerCase() === "dropdown") {
        return (<AnswerDropDown {...props} />);
    } else {
        return (<AnswerButton {...props} />);
    }
}
