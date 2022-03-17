import React from "react";

import SvgIcon from "../components/svg/SvgIcon";

import {ProjectContext} from "../project/constants";
import {findObject, getNextInSequence} from "../utils/sequence";

export default class AnswerDesigner extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedColor: this.props.color || "#1527f6",
            newAnswerText: this.props.answer || "",
            required: this.props.required || false
        };
    }

    removeAnswer = () => {
        const {surveyQuestionId, answerId} = this.props;
        const {surveyQuestions, setProjectDetails} = this.context;
        const matchingQuestion = findObject(
            surveyQuestions,
            ([_id, sq]) => sq.parentQuestionId === surveyQuestionId && sq.parentAnswerIds.includes(answerId)
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
                color: this.state.selectedColor,
                ...surveyQuestion.componentType === "input" && {required: this.state.required}
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
        const {answer, color, required, surveyQuestion} = this.props;
        return (
            <div className="d-flex flex-column">
                <div className="d-flex">
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
                {surveyQuestion.componentType === "input" && required && (
                    <div>Required</div>
                )}
            </div>
        );
    };

    renderNew = () => {
        const {surveyQuestion, answerId, editMode} = this.props;
        const {newAnswerText, selectedColor} = this.state;
        return (
            <div className="d-flex flex-column">
                <div className="d-flex mb-1 align-items-center">
                    {answerId != null
                        ? (
                            <>
                                {editMode === "full" && (
                                    <button
                                        className="btn btn-outline-red py-0 px-2 mr-1"
                                        onClick={this.removeAnswer}
                                        type="button"
                                    >
                                        <SvgIcon icon="trash" size="0.9rem"/>
                                    </button>
                                )}
                                <button
                                    className="btn btn-lightgreen py-0 px-2 mr-1"
                                    onClick={this.saveSurveyAnswer}
                                    type="button"
                                >
                                    <SvgIcon icon="save" size="0.9rem"/>
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn btn-lightgreen py-0 px-2 mr-1"
                                onClick={this.saveSurveyAnswer}
                                type="button"
                            >
                                <SvgIcon icon="plus" size="0.9rem"/>
                            </button>
                        )}
                    <input
                        className="mr-1"
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
                {surveyQuestion.componentType === "input" && (
                    <div className="d-flex ml-4 align-items-center">
                        <input
                            id="required"
                            onChange={() => this.setState({required: !this.state.required})}
                            type="checkbox"
                            value={this.state.required}
                        />
                        <label className="mb-0 ml-1" htmlFor="required">Text Required?</label>
                    </div>
                )}
            </div>
        );
    };

    render() {
        const {editMode} = this.props;
        return (
            <div id="new-answer-designer">
                {editMode === "review"
                    ? this.renderExisting()
                    : this.renderNew()}
            </div>
        );
    }
}
AnswerDesigner.contextType = ProjectContext;
