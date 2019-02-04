import React, {Fragment} from "react";

import { SectionBlock } from "./FormComponents"

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
    }

    convertToSimple = () => {
         const newSurveyQuestions = this.props.surveyQuestions
            .map((question) => [{...question, componentType: "button", dataType: "text"}]);

        this.props.setSurveyQuestions(newSurveyQuestions);
    }

    toggleSimpleMode = () => {
        const newMode = this.state.inSimpleMode
            ? false
            : !this.props.surveyQuestions.every(q => q.componentType !== "button")
                    || confirm("This action will revert all questions to type button.  Would you like to proceed?");

            this.setState({inSimpleMode: newMode});
    }

    render() {
        return (
            <SectionBlock title="Survey Design">
                <ModeButtons inSimpleMode={this.state.inSimpleMode} toggleSimpleMode={this.toggleSimpleMode} />
                <div id="survey-design">
                    <SurveyQuestionTree
                        inSimpleMode={this.state.inSimpleMode}
                        setSurveyQuestions={this.props.setSurveyQuestions}
                        surveyQuestions={this.props.surveyQuestions}
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

function ModeButtons({inSimpleMode, toggleSimpleMode}) {
    return (
        <div style={{overflow: "hidden", border: "1px solid #31BAB0",backgroundColor: "#f1f1f1",margin:"10px"}}>
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
                this.setState({ selectedParent: -1});
            }
        }

        if (this.state.selectedParent !== prevState.selectedParent) {
            this.setState({ selectedAnswer: -1});
        }
    }

    addSurveyQuestion = () => {
        if (this.state.newQuestionText != "") {
            const { surveyQuestions } = this.props;
            const { dataType, componentType } = componentTypes[this.props.inSimpleMode ? 0 : this.state.selectedType];
            const newQuestion = {
                                id: surveyQuestions.reduce((p,c) => Math.max(p,c.id), 0) + 1,
                                question: this.state.newQuestionText,
                                answers: [],
                                parent_question: this.state.selectedParent,
                                parent_answer: this.state.selectedAnswer,
                                dataType: dataType,
                                componentType: componentType,
                                }; 
            this.props.setSurveyQuestions([...surveyQuestions, newQuestion]);
            this.setState({selectedAnswer: -1, newQuestionText: ""});
        } else {
            alert("Please enter a survey question first.");
        }
    }

    render() {
        return (
            <table>
                <tbody>
                <tr>
                    <td>
                        <label htmlFor="value-parent">Parent Question:</label>
                    </td>
                    <td>
                        <select
                            id="value-parent" 
                            className="form-control form-control-sm" 
                            size="1"
                            onChange={(e) => this.setState({selectedParent: parseInt(e.target.value)})}
                            value={this.state.selectedParent}
                        >
                            <option key={-1} value={-1}>None</option>
                            {this.props.surveyQuestions.length > 0
                                ? this.props.surveyQuestions
                                    .filter(question => question.componentType !== "input")
                                    .map((question) =>
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
                                onChange={(e) => this.setState({selectedType: parseInt(e.target.value)})}
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
                }

                <tr>
                    <td>
                        <label htmlFor="value-answer">Parent Answer:</label>
                    </td>
                    <td>
                        <select 
                            id="value-answer" 
                            className="form-control form-control-sm" 
                            size="1"
                            onChange={(e) => this.setState({selectedAnswer: parseInt(e.target.value)})}
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
                                onChange={(e) => this.setState({newQuestionText: e.target.value})}
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
        )
    }
}

class SurveyQuestionTree extends React.Component {
    constructor(props) {
        super(props);
    };

    getChildQuestionIds = (questionId) => {
        const childQuestions = this.props.surveyQuestions.filter(sv => sv.parent_question === questionId);
        if (childQuestions.length === 0) {
            return [questionId];
        } else {
            return childQuestions.reduce((prev, cur) => {
                            return [...prev, ...this.getChildQuestionIds(cur.id)];
                        }, [questionId])
        }
    }

    removeQuestion = (removalId) => {
        const questionsToRemove = this.getChildQuestionIds(removalId)

        const newSurveyQuestions = this.props.surveyQuestions
                .filter(sq => !questionsToRemove.includes(sq.id) && sq.id !== removalId)
        
        this.props.setSurveyQuestions(newSurveyQuestions)
    }

    removeAnswer = (questionId, removalId) => {
        const surveyQuestion = this.props.surveyQuestions.find(sq => sq.id === questionId)
        const updatedAnswers = surveyQuestion.answers.filter(ans => ans.id !== removalId);

        const updatedQuestion = {...surveyQuestion, answers: updatedAnswers}

        const newSurveyQuestions = this.props.surveyQuestions
                                    .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq)

        this.props.setSurveyQuestions(newSurveyQuestions)
    }

    

    getCurrent = (nodeId) =>
        this.props.surveyQuestions.filter(cNode =>
            cNode.parent_question === nodeId).map((cNode,uid) => (
            <ul  key={`node_${uid}`} style={{listStyleType:"none"}}>
                <li>
                    <SurveyQuestion 
                        setSurveyQuestions={this.props.setSurveyQuestions} 
                        inSimpleMode={this.props.inSimpleMode}
                        surveyQuestion={cNode}
                        surveyQuestions={this.props.surveyQuestions}
                        removeAnswer={this.removeAnswer}
                        removeQuestion={this.removeQuestion}
                    />
                    {this.getCurrent(cNode.id)}
                </li>

            </ul>
        ))

    render() {
        return this.getCurrent(-1);
    }
}


const maxAnswers = (componentType, dataType) => (componentType || "").toLowerCase() === "input"
                                            ? 1 : (dataType || "").toLowerCase() === "boolean"
                                                ? 2 : 1000

function SurveyQuestion({ surveyQuestion,
                            surveyQuestions,
                            setSurveyQuestions,
                            inSimpleMode,
                            removeAnswer, 
                            removeQuestion }) {
    return (
        <div className="sample-value-info">
            <h3 className="header px-0">
                <input 
                    type="button" 
                    className="button" 
                    value="-"
                    onClick={() => removeQuestion(surveyQuestion.id)}
                />
                <label> Survey Question: {surveyQuestion.question}</label>
            </h3>
            {surveyQuestion.parent_question > 0 &&
                <Fragment>
                    <h3>Parent Question: {surveyQuestions.find(sq => sq.id === surveyQuestion.parent_question).question}</h3>
                    <h3>Parent Answer: {surveyQuestion.parent_answer === -1 
                        ? "Any" 
                        : surveyQuestions
                            .find(sq => sq.id === surveyQuestion.parent_question).answers
                            .find(sa => sa.id === surveyQuestion.parent_answer)
                            .answer}
                    </h3>
                </Fragment>
            }            
            {!inSimpleMode && <h3>{` Question Type: ${surveyQuestion.componentType} - ${surveyQuestion.dataType}`}</h3>}
            <table className="table table-sm">
                <thead>
                <tr>
                    <th scope="col"></th>
                    <th scope="col">Answer</th>
                    <th scope="col">Color</th>
                    <th scope="col">&nbsp;</th>
                </tr>
                </thead>
                <tbody>
                {(surveyQuestion.answers)
                        .map((surveyAnswer, uid) => 
                                <ExistingAnswer 
                                    key={uid} 
                                    answer={surveyAnswer.answer} 
                                    color={surveyAnswer.color} 
                                    removeAnswer={() => removeAnswer(surveyQuestion.id, surveyAnswer.id)}
                                />
                            )
                }
                {surveyQuestion.answers.length < maxAnswers(surveyQuestion.componentType, surveyQuestion.dataType) &&
                    <NewAnswerDesigner
                        surveyQuestion={surveyQuestion}
                        surveyQuestions={surveyQuestions}
                        setSurveyQuestions={setSurveyQuestions}
                    />
                }
                </tbody>
            </table>
        </div>
    );
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
                                id: surveyQuestion.answers.reduce((p,c) => Math.max(p,c.id), 0) + 1,
                                answer: this.state.newAnswerText,
                                color: this.state.selectedColor
                                };
            const updatedAnswers = [...surveyQuestion.answers, newAnswer];
            const updatedQuestion = {...surveyQuestion, answers: updatedAnswers};
            const newSurveyQuestions = this.props.surveyQuestions
                    .map(sq => sq.id === updatedQuestion.id ? updatedQuestion : sq);

            this.props.setSurveyQuestions(newSurveyQuestions);
            this.setState({selectedColor: "#1527F6", newAnswerText: ""})
        } else {
            alert("A survey answer must possess both an answer and a color.")
        }
    }

    render() {
        return (
                <tr>
                    <td>
                        <input 
                            type="button" 
                            className="button" value="+"
                            onClick={this.addSurveyAnswer}
                        />
                    </td>
                    <td>
                        <input 
                            type="text" 
                            className="value-name" 
                            autoComplete="off"
                            value={this.state.newAnswerText} 
                            onChange={(e) => this.setState({newAnswerText: e.target.value})}
                        />
                    </td>
                    <td>
                        <input 
                            type="color"
                            className="value-color"
                            value={this.state.selectedColor}
                            onChange={(e) => this.setState({selectedColor: e.target.value})}
                        />
                    </td>
                </tr>
            );
    }
}

function ExistingAnswer({ answer, color, removeAnswer }) {
    return (
        <tr>
            <td>
                <input 
                    id="remove-sample-value-group" 
                    type="button" 
                    className="button" 
                    value="-"
                    onClick={removeAnswer}
                />
            </td>
            <td>
                {answer}
            </td>
            <td>
                <div className="circle"
                    style={{backgroundColor: color, border: "solid 1px"}}>
                </div>
            </td>
            <td>
                &nbsp;
            </td>
        </tr>
    );
}




