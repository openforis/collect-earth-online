import React from "react";

import SvgIcon from "../components/svg/SvgIcon";

import {ProjectContext} from "../project/constants";
import {findObject, getNextInSequence} from "../utils/sequence";

export default class NewAnswerDesigner extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedColor: "#1527f6",
            newAnswerText: ""
        };
    }

    removeAnswer = (questionId, answerId) => {
        const {surveyQuestions, setProjectDetails} = this.context;
        const matchingQuestion = findObject(
            surveyQuestions,
            ([_id, sq]) => sq.parentQuestionId === questionId && sq.parentAnswerId === answerId
        );
        if (matchingQuestion) {
            alert(
                "You cannot remove this answer because a sub question ("
                + matchingQuestion[1].question
                + ") is referencing it."
            );
        } else {
            const surveyQuestion = surveyQuestions[questionId];
            // eslint-disable-next-line no-unused-vars
            const {[answerId]: _id, ...remainingAnswers} = surveyQuestion.answers;
            setProjectDetails({
                surveyQuestions: {
                    ...surveyQuestions,
                    [questionId]: {...surveyQuestion, answers: remainingAnswers}
                }
            });
        }
    };

    maxAnswers = (componentType, dataType) => ((componentType || "").toLowerCase() === "input" ? 1
        : (dataType || "").toLowerCase() === "boolean" ? 2
            : 1000);

    addSurveyAnswer = () => {
        const {surveyQuestionId, surveyQuestion} = this.props;
        const {surveyQuestions, setProjectDetails} = this.context;
        if (this.state.newAnswerText.length > 0) {
            const newId = getNextInSequence(Object.keys(surveyQuestion.answers));
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
            this.setState({selectedColor: "#1527f6", newAnswerText: ""});
        } else {
            alert("Please enter a value for the answer.");
        }
    };

    renderExisting = () => {
        const {answer, color, inDesignMode, surveyQuestionId, answerId} = this.props;
        return (
            <div className="col d-flex">
                {inDesignMode && (
                    <button
                        className="btn btn-outline-red py-0 px-2 mr-1"
                        onClick={() => this.removeAnswer(surveyQuestionId, answerId)}
                        type="button"
                    >
                        <SvgIcon icon="trash" size="1rem"/>
                    </button>
                )}
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

    renderNew = () => (
        <div className="col d-flex">
            <button
                className="btn btn-success py-0 px-2 mr-1"
                onClick={this.addSurveyAnswer}
                type="button"
            >
                <SvgIcon icon="plus" size="0.9rem"/>
            </button>
            <input
                className="value-color mx-2 mt-1"
                onChange={e => this.setState({selectedColor: e.target.value})}
                type="color"
                value={this.state.selectedColor}
            />
            <input
                autoComplete="off"
                className="value-name"
                maxLength="120"
                onChange={e => this.setState({newAnswerText: e.target.value})}
                onKeyDown={e => {
                    if (e.key === "e" && this.props.surveyQuestion.dataType === "number") e.preventDefault();
                }}
                type={this.props.surveyQuestion.dataType === "number" ? "number" : "text"}
                value={this.state.newAnswerText}
            />
        </div>
    );

    render() {
        return (
            <div id="new-answer-designer">
                {this.props.answer
                    ? this.renderExisting()
                    : this.renderNew()}
            </div>
        );
    }
}
NewAnswerDesigner.contextType = ProjectContext;
