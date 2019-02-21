import React, {Fragment} from "react";

import { SectionBlock } from "./FormComponents";
import SurveyCardList from "./SurveyCardList";
import { removeEnumerator } from "../utils/SurveyUtils";

const componentTypes = [
    {componentType: "button", dataType: "text"},
    {componentType: "input", dataType: "number"},
    {componentType: "input", dataType: "text"},
    {componentType: "radiobutton", dataType: "boolean"},
    {componentType: "radiobutton", dataType: "text"},
    {componentType: "dropdown", dataType: "boolean"},
    {componentType: "dropdown", dataType: "text"},
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
    };

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
        this.setState({ inSimpleMode: 
                        this.state.inSimpleMode
                        ? false
                        : this.props.surveyQuestions.every(q => q.componentType === "button")
                                || confirm("This action will revert all questions to type button.  Would you like to proceed?")
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
        const surveyQuestion = this.props.surveyQuestions.find(sq => sq.id === questionId);
        const updatedAnswers = surveyQuestion.answers.filter(ans => ans.id !== answerId);

        const updatedQuestion = {...surveyQuestion, answers: updatedAnswers};

        const newSurveyQuestions = this.props.surveyQuestions
                                    .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);

        this.props.setSurveyQuestions(newSurveyQuestions);
    };

    maxAnswers(componentType, dataType) { 
        return (componentType || "").toLowerCase() === "input"
                    ? 1 : (dataType || "").toLowerCase() === "boolean"
                        ? 2 : 1000;
    };

    render() {
        return (
            <SectionBlock title="Survey Design">
                <ModeButtons inSimpleMode={this.state.inSimpleMode} toggleSimpleMode={this.toggleSimpleMode} />
                <div id="survey-design">
                    <SurveyCardList
                        inSimpleMode={this.state.inSimpleMode}
                        inDesignMode={true}
                        setSurveyQuestions={this.props.setSurveyQuestions}
                        surveyQuestions={this.props.surveyQuestions}
                        removeAnswer={this.removeAnswer}
                        removeQuestion={this.removeQuestion}
                        newAnswerComponent={(surveyQuestion) => surveyQuestion.answers.length 
                                < this.maxAnswers(surveyQuestion.componentType, surveyQuestion.dataType) 
                                 && <NewAnswerDesigner
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
            style={{overflow: "hidden", border: "1px solid #31BAB0",backgroundColor: "#f1f1f1"}}
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
                    fontSize: "17px"
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
                    fontSize: "17px"
                }}
            />
        </div>
    );
}

class NewQuestionDesigner extends React.Component {
    constructor(props) {
        super(props);

        this.state ={
            selectedAnswer: -1,
            selectedParent: -1,
            selectedType: 0,
            newQuestionText: "",
        };

    };

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
                                        id: surveyQuestions.reduce((p,c) => Math.max(p,c.id), 0) + 1,
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
                                            {`${type.componentType}-${type.dataType}`}
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
                {/*{!this.props.inSimpleMode && <SectionBlock title="Survey Rules Design">*/}
                    {/*<table>*/}
                        {/*<tbody>*/}

                    {/*<SurveyRules surveyQuestions={this.props.surveyQuestions}/>*/}
                        {/*<tr>  <td></td><td><input*/}
                            {/*type="button"*/}
                            {/*className="button"*/}
                            {/*value="Add Survey Rule"*/}
                            {/*onClick={this.addSurveyQuestion}*/}
                        {/*/></td>*/}
                      {/*</tr>*/}
                        {/*</tbody>*/}
                    {/*</table>*/}
                {/*</SectionBlock>*/}
                {/*}*/}
            </React.Fragment>
        )
    }
}

class NewAnswerDesigner extends React.Component {
    constructor(props) {
        super(props);

        this.state ={
            selectedColor: "#1527F6",
            newAnswerText: "",
        };
    };
    
    addSurveyAnswer = () => {
        const { surveyQuestion } = this.props
        if (this.state.newAnswerText.length > 0) {
            const newAnswer = {
                                id: surveyQuestion.answers.reduce((a,c) => Math.max(a,c.id), 0) + 1,
                                answer: this.state.newAnswerText,
                                color: this.state.selectedColor
                                };
            const updatedAnswers = [...surveyQuestion.answers, newAnswer];
            const updatedQuestion = { ...surveyQuestion, answers: updatedAnswers };
            const newSurveyQuestions = this.props.surveyQuestions
                    .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);

            this.props.setSurveyQuestions(newSurveyQuestions);
            this.setState({selectedColor: "#1527F6", newAnswerText: ""})
        } else {
            alert("A survey answer must possess both an answer and a color.")
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
                </div>
    }
}

class SurveyRules extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentRules: [],
            selectedRuleType:"",
        };
    };

    setNewRule(ruleType) {
        this.setState({selectedRuleType:ruleType})
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
                </select>
                </td></tr>
                {
                    this.state.selectedRuleType == "text-match" ?
                        <TextMatch surveyQuestions={this.props.surveyQuestions} /> : (this.state.selectedRuleType == "numeric-range" ? <NumericRange surveyQuestions={this.props.surveyQuestions}/> :
                        (this.state.selectedRuleType == "sum-of-answers"?<SumOfAnswers surveyQuestions={this.props.surveyQuestions}/>:"nothing is selected"))
                }
            </React.Fragment>
        );
    }
}

class TextMatch extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentRules: [],
        };
    };

    render() {
        const surveyQuestions = this.props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "text");
        console.log("from text natch");
        console.log(surveyQuestions);
        return (
            <React.Fragment>
                <tr>
                <td>
                    <label>Survey Question: </label></td><td><select>
                    {
                        surveyQuestions && surveyQuestions.map((question, uid) =>
                            <option key={uid}>{question.question}</option>)
                    }
                </select>
                </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                    <input id="text-match" type="text" placeholder="Regular expression"/>
                </td>

                </tr>
            </React.Fragment>
        );
    }
}

class NumericRange extends React.Component {
    constructor(props) {
        super(props);

        this.state ={
            currentRules: [],
        };
    };
    render() {
        const surveyQuestions = this.props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "number")

        return (
            <React.Fragment>
                <tr>
                <td>
                    <label>Survey Question: </label>
                </td><td><select>
                    {
                        surveyQuestions && surveyQuestions.map((question, uid) =>
                            <option key={uid}>{question.question}</option>)
                    }
                </select>
                </td>
                </tr>
                <tr>
                <td>
                    <label>Enter min and max values: </label></td><td>
                    <input id="min-val" type="number" placeholder="Minimum value"/>
                    <input id="max-val" type="number" placeholder="Maximum value"/>
                </td>
                </tr>
            </React.Fragment>
        );
    }
}

class SumOfAnswers extends React.Component {
    constructor(props) {
        super(props);

        this.state ={
            currentRules: [],
        };
    };
    render() {
        const surveyQuestions = this.props.surveyQuestions.filter(question => question.componentType === "input" && question.dataType === "number")

        return (
            <React.Fragment>
                <tr>
                <td>
                    <label>Survey Question(Hold ctrl/cmd and select multiple questions):</label></td><td>
                    <select multiple="true">
                        {
                            surveyQuestions && surveyQuestions.map((question, uid) =>
                                <option key={uid}>{question.question}</option>)
                        }
                    </select>
                </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <input id="expected-sum" type="number" placeholder="Expected sum"/>
                    </td>

                </tr>

            </React.Fragment>
        );
    }
}