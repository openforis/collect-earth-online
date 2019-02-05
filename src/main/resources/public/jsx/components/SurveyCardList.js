import React, { Fragment }  from 'react';

export default function SurveyCardList(props) {
    const topLevelNodes = props.surveyQuestions
                            .filter(sq => sq.parent_question == -1)
                            .sort((a, b) => a.id - b.id)
    return topLevelNodes.map((sq, index) =>  
                    <SurveyCard 
                        key={index}
                        topLevelNodeIds={topLevelNodes.map(tln => tln.id)} 
                        cardNumber={index +1}
                        inDesignMode={true || props.inDesignMode}
                        inSimpleMode={false && props.inSimpleMode}
                        setSurveyQuestions={props.setSurveyQuestions} 
                        surveyQuestion={sq}
                        surveyQuestions={props.surveyQuestions}
                        removeAnswer={props.removeAnswer}
                        removeQuestion={props.removeQuestion}
                        newAnswerComponent={props.newAnswerComponent}
                    />
                );
}

class SurveyCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showQuestions: true
        }
    }  

    moveCardUp = () => {

    }

    moveCardDown = () => {

    }

    render() {
        const { cardNumber, surveyQuestion, inDesignMode, topLevelNodeIds } = this.props
        return (
            <div className="SurveyCard border rounded border-dark">
                <div className="container">
                    <div className="SurveyCard__card-description row">
                        <div className="col-10 d-flex">
                            <button 
                                className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                onClick={() => this.setState({showQuestions: !this.state.showQuestions})}
                            >
                                {this.state.showQuestions ? "-" : "+"}
                            </button>
                            <h2 className="font-weight-bold mt-2 pt-1 ml-2">Survey Card Number {cardNumber}</h2>
                            <h3 className="m-3">{this.state.showQuestions ? "" : `-- ${surveyQuestion.question}`}</h3>
                        </div>
                        {inDesignMode && 
                            <div className="col-2 d-flex">
                                <button 
                                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                    onClick={this.moveCardUp}
                                    disabled={surveyQuestion.id === topLevelNodeIds[0]}
                                >
                                    <i className={"fa fa-caret-up"} />
                                </button>
                                <button 
                                    className="btn btn-outline-lightgreen my-1 px-3 py-0"
                                    onClick={this.moveCardDown}
                                    disabled={surveyQuestion.id === topLevelNodeIds[topLevelNodes.length -1]}
                                >
                                    <i className={"fa fa-caret-down"} />
                                </button>
                            </div>
                        }
                    </div>
                    {this.state.showQuestions &&
                        <div className="SurveyCard__question-tree row d-block">
                            <SurveyQuestionTree
                                indentLevel={0}
                                inDesignMode={this.props.inDesignMode}
                                inSimpleMode={this.props.inSimpleMode}
                                newAnswerComponent={this.props.newAnswerComponent}
                                removeAnswer={this.removeAnswer}
                                removeQuestion={this.removeQuestion}
                                surveyQuestion={this.props.surveyQuestion}
                                surveyQuestions={this.props.surveyQuestions}
                                setSurveyQuestions={this.props.setSurveyQuestions} 
                            />
                        </div>
                    }
                </div>
            </div>

        )
    }
}

function SurveyQuestionTree({ 
    indentLevel,
    inDesignMode,
    inSimpleMode,
    newAnswerComponent,
    removeAnswer,
    removeQuestion,
    surveyQuestion,
    surveyQuestions,
    setSurveyQuestions }) {

    const childNodes = surveyQuestions.filter(sq => sq.parent_question == surveyQuestion.id);
    const parentQuestion = surveyQuestions.find(sq => sq.id === surveyQuestion.parent_question);
    return (
        <Fragment>
            <div className="SurveyQuestionTree__question d-flex border-top pt-3 pb-1">
                {[...Array(indentLevel)].map((e, i) => 
                        <div className="pl-4">
                            <i className={"fa fa-arrow-right"} />
                        </div>
                )}
                
                <div className="Question__answers">
                    <div className="container">
                        <div className="SurveyQuestionTree__question-description pb-1">
                            <h3 className="font-weight-bold">{surveyQuestion.question}</h3>
                        </div>
                        <div className="SurveyQuestionTree__question-information pb-1">
                            <ul>
                                {surveyQuestion.componentType && 
                                    <li>
                                        <span className="font-weight-bold">Component Type:  </span> 
                                        {surveyQuestion.componentType + " - " + surveyQuestion.dataType}
                                    </li>
                                }
                                {surveyQuestion.parent_question > -1 &&
                                    <Fragment>
                                        <li>
                                            <span className="font-weight-bold">Parent Question:  </span> {parentQuestion.question}
                                        </li>
                                        <li>
                                            <span className="font-weight-bold">Parent Answer:  </span>{surveyQuestion.parent_answer === -1 
                                                ? "Any" 
                                                : parentQuestion.answers
                                                    .find(ans => ans.id = surveyQuestion.parent_answer ).answer}
                                        </li>
                                    </Fragment>
                                }
                                <li className="font-weight-bold">Answers:  </li>
                            </ul>
                        </div>
                        <div className="SurveyQuestionTree__answers">
                            {surveyQuestion.answers.map((surveyAnswer, uid) => 
                                <ExistingAnswer 
                                    key={uid} 
                                    answer={surveyAnswer.answer} 
                                    color={surveyAnswer.color} 
                                    removeAnswer={inDesignMode ? () => removeAnswer(surveyQuestion.id, surveyAnswer.id) : null}
                                />
                            )}
                            {inDesignMode && surveyQuestion.answers.length < maxAnswers(surveyQuestion.componentType, surveyQuestion.dataType) &&
                                {newAnswerComponent}
                            }
                        </div>
                    </div>
                </div>
            </div>
            {childNodes.map((surveyQuestion, uid) =>
                    <SurveyQuestionTree 
                        key={uid}
                        indentLevel={indentLevel + 1}
                        inSimpleMode={inSimpleMode}
                        inDesignMode={inDesignMode}
                        newAnswerComponent={newAnswerComponent}
                        removeAnswer={removeAnswer}
                        removeQuestion={removeQuestion}
                        setSurveyQuestions={setSurveyQuestions} 
                        surveyQuestion={surveyQuestion}
                        surveyQuestions={surveyQuestions}
                    />
            )}
        </Fragment>
    );
}


function ExistingAnswer({ answer, color, removeAnswer }) {
    return (
        <div className="ExistingAnswer">
            <div className="col d-flex">
                {removeAnswer &&
                    <button 
                        type="button" 
                        className="button" 
                        value="-"
                        onClick={removeAnswer}
                    />
                }
                <div className="ExistingAnswer__circle">
                    <div className="circle mt-1 mr-3"
                        style={{backgroundColor: color, border: "solid 1px"}}>
                    </div>
                </div>
                <div className="ExistingAnswer__answer">
                    {answer}
                </div>
            </div>
        </div>
    );
}