import React from "react";

import SvgIcon from "../components/svg/SvgIcon";

import {ProjectContext} from "../project/constants";
import {findObject, getNextInSequence} from "../utils/sequence";

export default class AnswerDesigner extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedColor: this.props.color || "#1527f6",
            newAnswerText: this.props.answer || ""
        };
    }

    removeAnswer = () => {
        const {surveyQuestionId, answerId} = this.props;
        const {surveyQuestions, setProjectDetails} = this.context;
        const matchingQuestion = findObject(
            surveyQuestions,
            ([_id, sq]) => sq.parentQuestionId === surveyQuestionId && sq.parentAnswerId === answerId
        );
        if (matchingQuestion) {
            alert(
                "You cannot remove this answer because a sub question ("
                + matchingQuestion[1].question
                + ") is referencing it."
            );
        } else {
            const surveyQuestion = surveyQuestions[surveyQuestionId];
            // eslint-disable-next-line no-unused-vars
            const {[answerId]: _id, ...remainingAnswers} = surveyQuestion.answers;
            setProjectDetails({
                surveyQuestions: {
                    ...surveyQuestions,
                    [surveyQuestionId]: {...surveyQuestion, answers: remainingAnswers}
                }
            });
        }
    };

    saveSurveyAnswer = () => {
        const {surveyQuestionId, surveyQuestion, answerId} = this.props;
        const {surveyQuestions, setProjectDetails} = this.context;
        if (this.state.newAnswerText.length > 0) {
            const newId = answerId || getNextInSequence(Object.keys(surveyQuestion.answers));
            const newAnswer = {
                answer: this.state.newAnswerText,
                color: this.state.selectedColor
            };
            setProjectDetails({
                surveyQuestions: {
                    ...surveyQuestions,
                    [surveyQuestionId]: {
                        ...surveyQuestion,
                        answers: {
                            ...surveyQuestion.answers,
                            [newId]: newAnswer
                        }
                    }
                }
            });
            if (answerId == null) this.setState({selectedColor: "#1527f6", newAnswerText: ""});
        } else {
            alert("Please enter a value for the answer.");
        }
    };

    renderExisting = () => {
        const {answer, color} = this.props;
        return (
            <div className="col d-flex">
                <div>
                    <div
                        className="circle mt-1 mr-3"
                        style={{backgroundColor: color, border: "solid 1px"}}
                    />
                </div>
                <div>
                    {answer}
                </div>
            </div>
        );
    };

    renderNew = () => {
        const {surveyQuestion, answerId} = this.props;
        const {newAnswerText, selectedColor} = this.state;
        return (
            <div className="col d-flex">
                {answerId != null
                    ? (
                        <>

                            <button
                                className="btn btn-outline-red py-0 px-2 mr-1"
                                onClick={this.removeAnswer}
                                type="button"
                            >
                                <SvgIcon icon="trash" size="0.9rem"/>
                            </button>
                            <button
                                className="btn btn-success py-0 px-2 mr-1"
                                onClick={this.saveSurveyAnswer}
                                type="button"
                            >
                                <SvgIcon icon="save" size="0.9rem"/>
                            </button>
                        </>
                    ) : (
                        <button
                            className="btn btn-success py-0 px-2 mr-1"
                            onClick={this.saveSurveyAnswer}
                            type="button"
                        >
                            <SvgIcon icon="plus" size="0.9rem"/>
                        </button>
                    )}
                <input
                    className="value-color mx-2 mt-1"
                    onChange={e => this.setState({selectedColor: e.target.value})}
                    type="color"
                    value={selectedColor}
                />
                <input
                    autoComplete="off"
                    maxLength="120"
                    onChange={e => this.setState({newAnswerText: e.target.value})}
                    onKeyDown={e => {
                        if (e.key === "e" && surveyQuestion.dataType === "number") e.preventDefault();
                    }}
                    type={surveyQuestion.dataType === "number" ? "number" : "text"}
                    value={newAnswerText}
                />
            </div>
        );
    };

    render() {
        const {inDesignMode} = this.props;
        return (
            <div id="new-answer-designer">
                {inDesignMode
                    ? this.renderNew()
                    : this.renderExisting()}
            </div>
        );
    }
}
AnswerDesigner.contextType = ProjectContext;
