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
            return visible > 0 && visible === answered;
        }
        else {

            return  child_questions.reduce((prev, cur) => {
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
                                {`O`}
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
