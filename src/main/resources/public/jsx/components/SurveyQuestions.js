import React, { Fragment } from "react";

export class SurveyQuestions extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            topLevelNodes: [],
            currentNodeIndex: 0
        }
        this.prevSurveyQuestionTree=this.prevSurveyQuestionTree.bind(this);
        this.nextSurveyQuestionTree=this.nextSurveyQuestionTree.bind(this);
    }  

    componentDidMount() {
        const topLevelNodes = this.props.surveyQuestions.sort((a, b) => b.id - a.id).filter(surveyNode => surveyNode.parent_question == -1);

        this.setState({
            topLevelNodes: topLevelNodes
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.currentNodeIndex !== prevState.currentNodeIndex) {
            this.props.setSelectedQuestionText(this.state.topLevelNodes[this.state.currentNodeIndex].question);
        }
    }

    prevSurveyQuestionTree() {
        if (this.state.currentNodeIndex > 0) {
            this.setState({currentNodeIndex: this.state.currentNodeIndex - 1});
        } else {
            alert("There are no previous questions.");
        }
    }

    nextSurveyQuestionTree() {
        if (this.state.currentNodeIndex < this.state.topLevelNodes.length - 1) {
            this.setState({currentNodeIndex: this.state.currentNodeIndex + 1});
        } else {
            alert("There are no more questions.");
        }
    }

    setSurveyQuestionTree(index) {
        this.setState({currentNodeIndex: index});
    }

    checkAllSelected(currentQuestionId){
        const { surveyQuestions } = this.props;
        const { visible, answered } = surveyQuestions.filter((sv => sv.id === currentQuestionId))[0];
        const child_questions = surveyQuestions.filter((sv => sv.parent_question === currentQuestionId));

        if (child_questions.length === 0) {
            return visible === answered;
        } else {
            return visible === answered && child_questions.reduce((prev, cur) => {
                return prev && this.checkAllSelected(cur.id);
            }, true);
        }   
    }

    getTopColor(node) {
        return this.checkAllSelected(node.id)
                ? "0px 0px 15px 4px green inset"
                : node.answered > 0
                    ? "0px 0px 15px 4px yellow inset"
                    : "0px 0px 15px 4px red inset";
    }

    render() {
    
        return (
            <fieldset className="mb-3 justify-content-center text-center">
                <h3>Survey Questions</h3>
                {this.props.surveyQuestions
                ?
                    <div className="SurveyQuestions__questions">
                        <div className="SurveyQuestions__top-questions">
                            <button 
                                id="prev-survey-question" 
                                className="btn btn-outline-lightgreen m-2"
                                onClick={this.prevSurveyQuestionTree}
                                disabled={this.state.currentNodeIndex === 0}
                                style={{opacity: this.state.currentNodeIndex === 0 ? "0.25" : "1.0"}}
                            >
                                {`<`}
                            </button>
                            {this.state.topLevelNodes.map((node, i) => 
                                <button 
                                    id="top-select" 
                                    key={i}
                                    className="btn btn-outline-lightgreen m-2"
                                    onClick={() => this.setSurveyQuestionTree(i)}
                                    style={{boxShadow: `${(i === this.state.currentNodeIndex)
                                        ? "0px 0px 2px 2px black inset,"
                                        : ""}
                                        ${this.getTopColor(node)}
                                    `}}
                                >
                                {i+1}
                                </button>
                            )}
                            <button 
                                id="next-survey-question" 
                                className="btn btn-outline-lightgreen"
                                onClick={this.nextSurveyQuestionTree}
                                disabled={this.state.currentNodeIndex === this.state.topLevelNodes.length - 1}
                                style={{opacity: this.state.currentNodeIndex === this.state.topLevelNodes.length - 1 ? "0.25" : "1.0"}}
                            >
                                {`>`}
                            </button>
                        </div>
                        {this.state.topLevelNodes.length > 0 &&
                            <SurveyQuestionTree
                                surveyNode={this.state.topLevelNodes[this.state.currentNodeIndex]}
                                surveyQuestions={this.props.surveyQuestions}
                                setCurrentValue={this.props.setCurrentValue}
                                selectedQuestionText={this.props.selectedQuestionText}
                                setSelectedQuestionText={this.props.setSelectedQuestionText}
                                higharcyLabel=""
                            />
                        }
                    </div>
                :
                    <h3>This project is missing survey questions!</h3>
                }
            </fieldset>
        );
    }
}

class SurveyQuestionTree extends React.Component  {
    constructor(props) {
        super(props);
        this.state = {
            showAnswers: true
        }
        this.toggleShowAnswers = this.toggleShowAnswers.bind(this);
    }  

    toggleShowAnswers() {
        this.setState({ showAnswers: !this.state.showAnswers });
    }

    render() {
        const childNodes = this.props.surveyQuestions.filter(surveyNode => surveyNode.parent_question == this.props.surveyNode.id);
        const shadowColor = this.props.surveyNode.answered === 0 
                            ? "0px 0px 15px 4px red inset"
                            : this.props.surveyNode.answered === this.props.surveyNode.visible
                                ? "0px 0px 15px 4px green inset"
                                : "0px 0px 15px 4px yellow inset";
        return (
            <fieldset className={"mb-1 justify-content-center text-center"}>
                <div className="SurveyQuestionTree__question-buttons btn-block my-2">
                    <button
                        id={this.props.surveyNode.question + "_" + this.props.surveyNode.id}
                        className="text-center btn btn-outline-lightgreen btn-sm col-2 text-bold"
                        onClick={this.toggleShowAnswers}
                    >
                        {this.state.showAnswers ? <span>-</span> : <span>+</span>}
                    </button>
                    <button
                        id={this.props.surveyNode.question + "_" + this.props.surveyNode.id}
                        className="text-center btn btn-outline-lightgreen btn-sm col-10"
                        style={{boxShadow: `${(this.props.surveyNode.question === this.props.selectedQuestionText)
                                    ? "0px 0px 2px 2px black inset,"
                                    : ""}
                                    ${shadowColor}
                                `}}
                        onClick={() => this.props.setSelectedQuestionText(this.props.surveyNode.question)}
                    >
                    {this.props.higharcyLabel + this.props.surveyNode.question}
                    </button>
                </div>

                {this.state.showAnswers &&
                    <ul className={"samplevalue justify-content-center"}>
                        {
                            <SurveyAnswers
                                componentType={this.props.surveyNode.component_type}
                                dataType={this.props.surveyNode.data_type}
                                question={this.props.surveyNode.question}
                                answers={this.props.surveyNode.answers}
                                setCurrentValue={this.props.setCurrentValue}
                            />
                        }
                    </ul>
                }
                {
                    childNodes.map((surveyNode, uid) =>
                        <Fragment key={uid}>
                            {this.props.surveyQuestions.filter(sq => sq.id === surveyNode.id)[0].visible > 0 &&
                            <SurveyQuestionTree 
                                key={uid}
                                surveyNode={surveyNode}
                                surveyQuestions={this.props.surveyQuestions}
                                setCurrentValue={this.props.setCurrentValue}
                                selectedQuestionText={this.props.selectedQuestionText}
                                setSelectedQuestionText={this.props.setSelectedQuestionText}
                                higharcyLabel={this.props.higharcyLabel + "- "}
                            />
                            }
                        </Fragment>
                    )
                }
            </fieldset>
        );
    }
}

function AnswerButton(props){
    return props.answers.map((ans, uid) => {
        return (
            <li key={uid} className="mb-1">
                <button 
                    type="button"
                    className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                    id={ans.answer + "_" + ans.id}
                    name={ans.answer + "_" + ans.id}
                    // style={{
                    //     boxShadow: (props.selectedAnswers[props.question] == ans.answer)
                    //         ? "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset"
                    //         : "initial"
                    // }}
                    onClick={() => props.setCurrentValue(props.question, ans.id, ans.answer, ans.color) }
                >
                    <div className="circle"
                        style={{
                            backgroundColor: ans.color,
                            border: "1px solid",
                            float: "left",
                            marginTop: "4px"
                        }}>
                    </div>
                    <span className="small">{ans.answer}</span>
                </button>
            </li>
        );
    }); 
}

function AnswerRadioButton(props) {
    return props.answers.map((ans, uid) => {
        return (
            <li key={uid} className="mb-1 form-control">
                <div className="circle"
                    style={{
                        backgroundColor: ans.color,
                        border: "1px solid",
                        float: "left",
                        marginTop: "4px",
                        margin: "5px"
                    }}>
                </div>
                <span className="small" style={{float: "left", paddingLeft: "10px"}}>{ans.answer}</span>
                <input 
                    type="radio" name="radiogroup"
                    className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                    id={ans.answer + "_" + ans.id}
                    style={{
                        display: "inline",
                        width: "1rem",
                        height: "1rem",
                        margin: "5px"
                    }}
                    onChange={() =>props.setCurrentValue(props.question, ans.id, ans.answer, ans.color)}
                />
            </li>
        );
    });
}

class AnswerInput extends React.Component{
    constructor(props) {
        super(props);
        this.state = {
            newInput: "",
        };
        this.updateInputValue = this.updateInputValue.bind(this);
    }

    componentDidUpdate (prevProps) {
        if (this.props.question !== prevProps.question) {
            this.setState({newInput: ""})
        }
    }

    updateInputValue(value) {
        this.setState({newInput: value});
    }
    
    render() {
        const { props } = this;
        // fix me, should not need map
        return props.answers.map((ans, uid) => {
            return (
                <li key={uid} className="mb-1" style={{display: "inline-flex"}}>
                    <div className="circle"
                        style={{
                            backgroundColor: ans.color,
                            border: "1px solid",
                            float: "left",
                            marginTop: "4px",
                            marginRight: "5px"
                        }}>
                    </div>
                    <input 
                        type={this.props.dataType}
                        className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                        placeholder={ans.answer}
                        id={ans.answer + "_" + ans.id}
                        name={ans.answer + "_" + ans.id}
                        value={this.state.newInput}
                        onChange={e => this.updateInputValue(e.target.value)}
                    />
                    <input
                        id="save-input"
                        className="text-center btn btn-outline-lightgreen btn-sm"
                        type="button"
                        name="save-input"
                        value="Save"
                        onClick={() => props.setCurrentValue(props.question, ans.id, this.state.newInput, ans.color)}
                    />
                </li>
            );
        });
    }
}

class AnswerDropDown extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showDropdown: false
        }
        this.toggleDropDown = this.toggleDropDown.bind(this);
    }  

    componentDidUpdate (prevProps) {
        if (this.props.question !== prevProps.question) {
            this.setState({showDropdown: false})
        }
    }
    
    toggleDropDown () {
        this.setState({showDropdown: !this.state.showDropdown});
    }
    
    render () {
        const options = this.props.answers.map((ans,uid) => {
            <div key={uid}>
                <span 
                    className="dot" 
                    style={{  
                        height: "15px",
                        width: "15px", 
                        backgroundColor: ans.color, 
                        borderRadius: "50%", 
                        display: "inline-block"
                    }} 
                />
                <a id={ans.color} 
                    href="#home" 
                    onClick={() => this.props.setCurrentValue(this.props.question, ans.id, ans.answer, ans.color)} 
                    style={{
                        color: "black", 
                        padding: "12px 16px", 
                        textDecoration: "none", 
                        display: "inline-block"
                    }}
                >
                    {ans.answer}
                </a>
            </div>
        });
        return (
            <li className="mb-1"> 
                <div className="dropdown" style={{ position: "relative",display: "inline-block"}}>
                    <button 
                        onClick={this.toggleDropDown} 
                        className="dropbtn" 
                        style={{
                            backgroundColor: "#31BAB0",
                            color: "white",
                            padding: "16px",
                            fontSize: "16px", 
                            border: "none", 
                            cursor: "pointer"
                        }}
                    >
                        -Select-
                    </button>
                <div 
                    id="myDropdown" 
                    className="dropdown-content" 
                    style={{ 
                        display: this.state.showDropdown ? "block" : "none", 
                        position: "absolute", 
                        backgroundColor: "#f1f1f1", 
                        minWidth: "160px", 
                        overflow: "auto", 
                        boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)"
                    }}
                >
                    {options}
                </div>
            </div>
        </li>
        );
    }
}

function SurveyAnswers(props) {
  if (props.componentType && props.componentType.toLowerCase() == "radiobutton") {
        return (<AnswerRadioButton 
                    answers={props.answers} 
                    question={props.question}
                    dataType={props.dataType}
                    setCurrentValue={props.setCurrentValue}
                />);
    } else if (props.componentType && props.componentType.toLowerCase() == "input") {
        return (<AnswerInput
                    answers={props.answers} 
                    question={props.question}
                    dataType={props.dataType}
                    setCurrentValue={props.setCurrentValue}
                />);
    } else if (props.componentType && props.componentType.toLowerCase() == "dropdown") {
        return (<AnswerDropDown 
                    answers={props.answers} 
                    question={props.question} 
                    childNodes={props.childNodes}  
                    setCurrentValue={props.setCurrentValue}
                />);
    } else {
        return (<AnswerButton 
                    answers={props.answers} 
                    question={props.question}
                    dataType={props.dataType}
                    setCurrentValue={props.setCurrentValue}
                />);
    }
}
