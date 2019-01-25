import React, { Fragment } from "react";

export class SurveyQuestions extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            topLevelNodes: {},
            currentNode: 0
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
        if (this.state.currentNode !== prevState.currentNode) {
            this.props.setSelectedQuestion(this.state.topLevelNodes[this.state.currentNode].question);
        }
    }

    prevSurveyQuestionTree() {
        if (this.state.currentNode > 0) {
            this.setState({currentNode: this.state.currentNode - 1});
        } else {
            alert("There are no previous questions.");
        }
    }

    nextSurveyQuestionTree() {
        if (this.state.currentNode < this.state.topLevelNodes.length - 1) {
            this.setState({currentNode: this.state.currentNode + 1});
        } else {
            alert("There are no more questions.");
        }
    }

    render() {
    
        return (
            <fieldset className="mb-3 justify-content-center text-center">
                <h3>Survey Questions</h3>
                {this.props.surveyQuestions
                ?
                    <Fragment>
                        <button 
                            id="prev-survey-question" 
                            className="btn btn-outline-lightgreen m-2"
                            onClick={this.prevSurveyQuestionTree}
                            disabled={this.state.currentNode === 0}
                            style={{opacity: this.state.currentNode === 0 ? "0.25" : "1.0"}}
                        >
                            Prev
                        </button>
                        <button 
                            id="next-survey-question" 
                            className="btn btn-outline-lightgreen"
                            onClick={this.nextSurveyQuestionTree}
                            disabled={this.state.currentNode === this.state.topLevelNodes.length - 1}
                            style={{opacity: this.state.currentNode === this.state.topLevelNodes.length - 1 ? "0.25" : "1.0"}}
                        >
                            Next
                        </button>
                        {this.state.topLevelNodes.length > 0 &&
                            <SurveyQuestionTree
                                surveyNode={this.state.topLevelNodes[this.state.currentNode]}
                                surveyQuestions={this.props.surveyQuestions}
                                setCurrentValue={this.props.setCurrentValue}
                                selectedQuestion={this.props.selectedQuestion}
                                setSelectedQuestion={this.props.setSelectedQuestion}
                            />
                        }
                    </Fragment>
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
        this.setState({ showAnswers: !this.state.showAnswers })
    }

    render() {
        const childNodes = this.props.surveyQuestions.filter(surveyNode => surveyNode.parent_question == this.props.surveyNode.id);
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
                        style={{boxShadow: (this.props.surveyNode.question === this.props.selectedQuestion)
                                    ? "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset"
                                    : "initial"}}
                        onClick={() => this.props.setSelectedQuestion(this.props.surveyNode.question)}
                    >
                    {this.props.surveyNode.question}
                    </button>
                </div>

                {this.state.showAnswers &&
                    <ul className={"samplevalue justify-content-center"}>
                        {
                            this.props.surveyNode.answers.map((ans, uid) => 
                                <SurveyAnswer
                                    key={uid}
                                    question={this.props.surveyNode.question}
                                    id={ans.id}
                                    answer={ans.answer}
                                    color={ans.color}
                                    setCurrentValue={this.props.setCurrentValue}
                                />
                            )
                        }
                    </ul>
                }
                {
                    childNodes.map((surveyNode, uid) => 
                        <SurveyQuestionTree 
                            key={uid}
                            surveyNode={surveyNode}
                            surveyQuestions={this.props.surveyQuestions}
                            setCurrentValue={this.props.setCurrentValue}
                            selectedQuestion={this.props.selectedQuestion}
                            setSelectedQuestion={this.props.setSelectedQuestion}
                        />
                    )
                }
            </fieldset>
        );
    }
}

function SurveyAnswer(props) {
    return (
        <li className="mb-1">
            <button type="button"
                    className="btn btn-outline-darkgray btn-sm btn-block pl-1 overflow-auto"
                    id={props.answer + "_" + props.id}
                    name={props.answer + "_" + props.id}
                    // FIXME does this even make sense when multiple options can be selected?  
                    // At best this is a local value that only represents the most recently selected
                    // style={{boxShadow: (props.selectedAnswers[props.question] == props.answer)
                    //     ? "0px 0px 4px 4px black inset, 0px 0px 4px 4px white inset"
                    //     : "initial"}}
                    onClick={() => props.setCurrentValue(props.question, props.id, props.answer, props.color) }>
                <div className="circle"
                     style={{
                         backgroundColor: props.color,
                         border: "1px solid",
                         float: "left",
                         marginTop: "4px"
                     }}>
                </div>
                <span className="small">{props.answer}</span>
            </button>
        </li>
    );
}
