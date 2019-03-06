import React from "react";

import { SectionBlock } from "./FormComponents";
import SurveyCardList from "./SurveyCardList";
import { removeEnumerator } from "../utils/surveyUtils";

const componentTypes = [
    { componentType: "button", dataType: "text" },
    { componentType: "input", dataType: "number" },
    { componentType: "input", dataType: "text" },
    { componentType: "radiobutton", dataType: "boolean" },
    { componentType: "radiobutton", dataType: "text" },
    { componentType: "dropdown", dataType: "boolean" },
    { componentType: "dropdown", dataType: "text" },
    // {component: "point", dataType: "dgitizer"},
    // {component: "linestring", dataType: "dgitizer"},
    // {component: "polygon", dataType: "dgitizer"},
];

export class SurveyDesign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            inSimpleMode: true,
        };
    }

    componentDidUpdate = (prevProps, prevState) => {
        if (this.state.inSimpleMode
            && !prevState.inSimpleMode) {

            this.convertToSimple();
        }
    };

    convertToSimple = () => {
        const newSurveyQuestions = this.props.surveyQuestions
            .map(question => ({ ...question, componentType: "button", dataType: "text" }));

        this.props.setSurveyQuestions(newSurveyQuestions);
    };

    toggleSimpleMode = () => {
        this.setState({
            inSimpleMode: this.state.inSimpleMode
                            ? false
                            : this.props.surveyQuestions.every(q => q.componentType === "button")
                                    || confirm("This action will revert all questions to type button.  Would you like to proceed?"),
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
            const {dataType, componentType} = componentTypes[this.props.inSimpleMode ? 0 : this.state.selectedType];
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
                this.setState({selectedAnswer: -1, newQuestionText: ""});
            }
        } else {
            alert("Please enter a survey question first.");
        }
    };

    render() {
        return (
            <React.Fragment>
                <table className="mt-4">
                    <tbody>
                    {!this.props.inSimpleMode &&
                    <React.Fragment>
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
                                        <option
                                            key={index}
                                            value={index}
                                        >
                                            {`${type.componentType} - ${type.dataType}`}
                                        </option>)
                                    }
                                </select>
                            </td>
                        </tr>
                    </React.Fragment>
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
                                onChange={e => this.setState({selectedParent: parseInt(e.target.value)})}
                                value={this.state.selectedParent}
                            >
                                <option key={-1} value={-1}>None</option>
                                {this.props.surveyQuestions.length > 0
                                    ? this.props.surveyQuestions
                                        .filter(question => question.componentType !== "input")
                                        .map(question =>
                                            <option
                                                key={question.id}
                                                value={question.id}
                                            >
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
                {!this.props.inSimpleMode && <SectionBlock title="Survey Rules Design">
                    <table>
                        <tbody>
                        <SurveyRules surveyQuestions={this.props.surveyQuestions}
                                     surveyQuestion={this.props.surveyQuestion}
                                     setSurveyQuestions={this.props.setSurveyQuestions}
                                     setSurveyRules={this.props.setSurveyRules} surveyRules={this.props.surveyRules}
                                     setRules={this.setRules}/>
                        <tr>
                            <td><span className="font-weight-bold">Rules:  </span></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>
                                <div>
                                    <table id="srd">
                                        <tbody>
                                        {
                                            this.props.surveyRules.length > 0 ?
                                                this.props.surveyRules.map((rule, uid) => {
                                                    if (rule.ruleType === "text-match") {
                                                        return <tr id={"rule" + rule.id} key={uid}>
                                                            <td>type:{rule.ruleType}</td>
                                                            <td>regex:{rule.regex}</td>
                                                            <td colSpan="2">questions:{rule.questions.toString()}</td>
                                                        </tr>
                                                    }
                                                    if (rule.ruleType === "numeric-range") {
                                                        return <tr id={"rule" + rule.id} key={uid}>
                                                            <td>type:{rule.ruleType}</td>
                                                            <td>min:{rule.min}</td>
                                                            <td>max:{rule.max}</td>
                                                            <td>questions:{rule.questions.toString()}</td>
                                                        </tr>
                                                    }
                                                    if (rule.ruleType === "sum-of-answers") {
                                                        return <tr id={"rule" + rule.id} key={uid}>
                                                            <td>type:{rule.ruleType}</td>
                                                            <td>validSum:{rule.validSum}</td>
                                                            <td colSpan="2">questions:{rule.questions.toString()}</td>
                                                        </tr>
                                                    }
                                                    if (rule.ruleType === "incompatible-types") {
                                                        return <tr id={"rule" + rule.id} key={uid}>
                                                            <td>type:{rule.ruleType}</td>
                                                            <td colSpan="2">questions:{rule.questions.toString()}</td>
                                                        </tr>
                                                    }
                                                }) :
                                                <tr>
                                                    <td colspan="4"><span>No rules for this survey yet!</span></td>
                                                </tr>
                                        }
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                            <td></td>
                        </tr>
                        </tbody>
                    </table>
                </SectionBlock>
                }
            </React.Fragment>
        )
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
            selectedRuleType:"none",
            regex:"",
            min:0,
            max:0,
            validSum:0,
            questionIds:[],
            questionId:0,
            surveyRules:[],
            existingRule:false
        };
        this.updateQuestionId=this.updateQuestionId.bind(this);
        this.updateMax=this.updateMax.bind(this);
        this.updateMin=this.updateMin.bind(this);
        this.updateRegex=this.updateRegex.bind(this);
        this.updateMaxSum=this.updateMaxSum.bind(this);
        this.updateOptions=this.updateOptions.bind(this);
    };

    setNewRule(ruleType) {
        this.setState({selectedRuleType:ruleType})
    }
    updateMin(min){
        this.setState({min:min});
    }
    updateMax(max){
        this.setState({max:max});
    }
    updateQuestionId(e){
        console.log(e.target.options[e.target.selectedIndex].value);
        this.setState({questionIds:[parseInt(e.target.options[e.target.selectedIndex].value)]});
    }
    updateRegex(expression){
        this.setState({regex:expression});
    }
    updateMaxSum(sum){
        this.setState({validSum:sum});
    }
    updateOptions(options){
        let questionIds = [];
        let selection=Array.from(options);
        selection.map(option => {
            if(option.selected){
                this.props.surveyRules.map(rule => {if(rule.questions.includes(parseInt(option.value))){
                    this.setState({existingRule: true});
                }});

                questionIds.push(parseInt(option.value));}
        });
        this.setState({questionIds:questionIds});
    }
    addSurveyRule(ruleType) {
        let numExists = false, textExists = false, sumExists =false;
        let rules = this.props.surveyRules.map(rule => {
            console.log("b4");
            console.log(rule);
            if (rule.ruleType === "numeric-range" && rule.questions[0] === this.state.questionIds[0]) {
                rule.min = this.state.min;
                rule.max = this.state.max;
                numExists = true;
            }
            else if (rule.ruleType === "text-match" && rule.questions[0] === this.state.questionIds[0]) {
                rule.regex = this.state.regex;
                rule.validSum=this.state.validSum;
                rule.questions = this.state.questionIds;
                textExists = true;
            }
            else if (rule.ruleType === "sum-of-answers" && this.state.questionIds.every(el => rule.questions.includes(el))) {
                rule.regex = this.state.regex;
                rule.validSum = this.state.validSum;
                sumExists = true;
            }
            return rule;
        });
        if (ruleType === "numeric-range" && numExists === false) {
            rules.push({
                id: rules.length + 1,
                ruleType: ruleType,
                questions: this.state.questionIds,
                min: this.state.min,
                max: this.state.max
            });
        }
        if (ruleType === "text-match" && textExists === false) {
            rules.push({
                id: rules.length + 1,
                ruleType: ruleType,
                questions: this.state.questionIds,
                regex: this.state.regex
            });
        }
        if (ruleType === "sum-of-answers" && sumExists === false) {
            rules.push({
                id: rules.length + 1,
                ruleType: ruleType,
                questions: this.state.questionIds,
                validSum: this.state.validSum
            });
        }
        this.props.setSurveyRules(rules);
    }

    render() {
        return (
            <React.Fragment>
                <tr>
                    <td>
                        <label htmlFor="ruletype">Rule Type:</label>
                    </td>
                    <td>
                        <select className="form-control form-control-sm" size="1" onChange={e => this.setNewRule(e.target.value)}>
                            <option value="select">Select</option>
                            <option value="text-match">Text Match</option>
                            <option value="numeric-range">Numeric Range</option>
                            <option value="sum-of-answers">Sum of Answers</option>
                            <option value="incompatible-types">Incompatible Types</option>
                        </select>
                    </td></tr>
                {
                    this.state.selectedRuleType == "text-match" ?
                        <TextMatch surveyQuestions={this.props.surveyQuestions} surveyQuestion={this.props.surveyQuestion} updateRegex={this.updateRegex} updateQuestionId={this.updateQuestionId} updateOptions={this.updateOptions}/> :
                        this.state.selectedRuleType == "numeric-range" ?
                        <NumericRange surveyQuestions={this.props.surveyQuestions} surveyRules={this.props.surveyRules} updateMin={this.updateMin} updateMax={this.updateMax} updateQuestionId={this.updateQuestionId} surveyQuestion={this.props.surveyQuestion} updateOptions={this.updateOptions}/> :
                        this.state.selectedRuleType == "sum-of-answers"?<SumOfAnswers surveyQuestions={this.props.surveyQuestions} surveyRules={this.props.surveyRules} surveyQuestion={this.props.surveyQuestion} updateMaxSum={this.updateMaxSum} updateOptions={this.updateOptions}/>:
                            this.state.selectedRuleType == "incompatible-types"?<IncompatibleTypes surveyQuestions={this.props.surveyQuestions} surveyRules={this.props.surveyRules} surveyQuestion={this.props.surveyQuestion} updateOptions={this.updateOptions}/>:<tr><td></td><td></td></tr>
                }
                <tr>
                    <td><input
                        type="button"
                        className="button"
                        value="Add Survey Rule"
                        onClick={()=>this.addSurveyRule(this.state.selectedRuleType)}/></td>
                    <td></td>
                </tr>
            </React.Fragment>
        );
    }
}

class TextMatch extends React.Component {
    constructor(props) {
        super(props);
    };

    render() {

        const surveyQuestions = this.props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "text");
        return (
            <React.Fragment>
                <tr>
                    <td>
                        <label>Survey Question: </label></td><td><select onChange={e => this.props.updateOptions(e.target.options)}>
                    <option value="-1">-select-</option>
                    {
                        surveyQuestions && surveyQuestions.map((question, uid) =>
                            <option key={uid} value={question.id}>{question.question}</option>)
                    }
                </select>
                </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <input id="text-match" type="text" placeholder="Regular expression" onChange={e => this.props.updateRegex(e.target.value)}/>
                    </td>

                </tr>
            </React.Fragment>
        );
    }
}

class NumericRange extends React.Component {
    constructor(props) {
        super(props);
    };

    render() {
        const surveyQuestions = this.props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "number");
        return (
            <React.Fragment>
                <tr>
                    <td>
                        <label>Survey Question: </label>
                    </td><td><select onChange={e => this.props.updateOptions(e.target.options)}>
                    <option value="-1">-select-</option>
                    {
                        surveyQuestions && surveyQuestions.map((question, uid) =>
                            <option key={uid} value={question.id}>{question.question}</option>)
                    }
                </select>
                </td>
                </tr>
                <tr>
                    <td>
                        <label>Enter min and max values: </label></td><td>
                    <input id="min-val" type="number" placeholder="Minimum value" onChange={e => this.props.updateMin(e.target.value)}/>
                    <input id="max-val" type="number" placeholder="Maximum value" onChange={e => this.props.updateMax(e.target.value)}/>
                </td>
                </tr>
            </React.Fragment>
        );
    }
}

class SumOfAnswers extends React.Component {
    constructor(props) {
        super(props);
    };

    render() {
        console.log(this.props.surveyQuestions);
        const surveyQuestions = this.props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "number")
        return (
            <React.Fragment>
                <tr>
                    <td>
                        <label>Survey Question(Hold ctrl/cmd and select multiple questions):</label></td>
                    <td>
                        <select multiple="multiple" onChange={e => this.props.updateOptions(e.target.options)}>
                            {
                                surveyQuestions.length>1 && surveyQuestions.map((question, uid) =>
                                    <option key={uid} value={question.id}>{question.question}</option>)
                            }
                        </select>
                    </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <input id="expected-sum" type="number" placeholder="Valid sum" onChange={e => this.props.updateMaxSum(e.target.value)}/>
                    </td>

                </tr>

            </React.Fragment>
        );
    }
}

class IncompatibleTypes extends React.Component {
    constructor(props) {
        super(props);
    };

    render() {
        console.log(this.props.surveyQuestions);
        const surveyQuestions = this.props.surveyQuestions.filter(question => question.componentType !== "input")
        return (
            <React.Fragment>
                <tr>
                    <td colSpan="2">
                        <label>Select the incompatible questions and answers: </label></td>
                </tr>
                <tr>
                    <td>
                        <select onChange={e => this.props.updateOptions(e.target.options)}>
                            <option value="-1">-question1-</option>
                            {
                                surveyQuestions.length && surveyQuestions.map((question, uid) =>
                                    <option key={uid} value={question.id}>{question.question}</option>)
                            }
                        </select>
                        <select onChange={e => this.props.updateOptions(e.target.options)}>
                            <option value="-1">-answer1-</option>
                            {
                                surveyQuestions.length && surveyQuestions.map((question, uid) =>
                                    <option key={uid} value={question.id}>{question.question}</option>)
                            }
                        </select>
                    </td>
                    <td>
                        <select onChange={e => this.props.updateOptions(e.target.options)}>
                            <option value="-1">-question2-</option>
                            {
                                surveyQuestions.length && surveyQuestions.map((question, uid) =>
                                    <option key={uid} value={question.id}>{question.question}</option>)
                            }
                        </select>
                        <select onChange={e => this.props.updateOptions(e.target.options)}>
                            <option value="-1">-answer2-</option>
                            {
                                surveyQuestions.length && surveyQuestions.map((question, uid) =>
                                    <option key={uid} value={question.id}>{question.question}</option>)
                            }
                        </select>
                    </td>
                </tr>
                <div></div>
            </React.Fragment>
        );
    }
}
