import React from "react";
import _ from "lodash";

import SurveyCardList from "./SurveyCardList";
import {SurveyCollection} from "../components/SurveyCollection";
import SvgIcon from "../components/svg/SvgIcon";

import {removeEnumerator} from "../utils/generalUtils";
import {ProjectContext} from "./constants";
import {findObject, lengthObject, mapObjectArray, filterObject, mapObject} from "../utils/sequence";

export class SurveyQuestionDesign extends React.Component {
    getChildQuestionIds = questionId => {
        const {surveyQuestions} = this.context;
        const childQuestionIds = mapObjectArray(
            filterObject(surveyQuestions, ([_sqId, sq]) => sq.parentQuestion === questionId),
            ([key, _val]) => Number(key)
        );
        return childQuestionIds.length === 0
            ? [questionId]
            : childQuestionIds.reduce((acc, cur) => [...acc, ...this.getChildQuestionIds(cur)], [questionId]);
    };

    removeQuestion = questionId => {
        const {surveyQuestions, setProjectDetails} = this.context;
        const childQuestionIds = this.getChildQuestionIds(questionId);
        const newSurveyQuestions = filterObject(surveyQuestions, ([sqId]) => !childQuestionIds.includes(Number(sqId)));
        setProjectDetails({surveyQuestions: newSurveyQuestions});
    };

    removeAnswer = (questionId, answerId) => {
        console.log(questionId, answerId);
        const {surveyQuestions, setProjectDetails} = this.context;
        const matchingQuestion = findObject(
            surveyQuestions,
            ([_id, sq]) => sq.parentQuestion === questionId && sq.parentAnswer === answerId
        )[1];
        if (matchingQuestion) {
            alert(
                "You cannot remove this answer because a sub question ("
                + matchingQuestion.question
                + ") is referencing it."
            );
        } else {
            const surveyQuestion = surveyQuestions[questionId];
            // FIXME, check if this works with number strings
            const {[answerId]: _id, ...remainingAnswers} = surveyQuestion.answers;
            // const remainingAnswers = filterObject(surveyQuestion.answers, ([ansId]) => ansId !== answerId);
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

    render() {
        return (
            <div id="survey-design">
                <SurveyCardList
                    inDesignMode
                    // TODO, this is odd.  Move max answers and NewAnswerDesigner instead of closure.
                    newAnswerComponent={([surveyQuestionId, surveyQuestion]) => (lengthObject(surveyQuestion.answers)
                                < this.maxAnswers(surveyQuestion.componentType, surveyQuestion.dataType) && (
                        <NewAnswerDesigner
                            setProjectDetails={this.context.setProjectDetails}
                            surveyQuestion={surveyQuestion}
                            surveyQuestionId={surveyQuestionId}
                            surveyQuestions={this.context.surveyQuestions}
                        />
                    ))}
                    removeAnswer={this.removeAnswer}
                    removeQuestion={this.removeQuestion}
                    setProjectDetails={this.context.setProjectDetails}
                    surveyQuestions={this.context.surveyQuestions}
                    surveyRules={this.context.surveyRules}
                />
                <NewQuestionDesigner
                    setProjectDetails={this.context.setProjectDetails}
                    surveyQuestions={this.context.surveyQuestions}
                    surveyRules={this.context.surveyRules}
                />
            </div>
        );
    }
}
SurveyQuestionDesign.contextType = ProjectContext;

class NewQuestionDesigner extends React.Component {
    constructor(props) {
        super(props);
        this.componentTypes = [
            {componentType: "button", dataType: "text"},
            {componentType: "button", dataType: "number"},
            {componentType: "input", dataType: "number"},
            {componentType: "input", dataType: "text"},
            {componentType: "radiobutton", dataType: "boolean"},
            {componentType: "radiobutton", dataType: "text"},
            {componentType: "radiobutton", dataType: "number"},
            {componentType: "dropdown", dataType: "boolean"},
            {componentType: "dropdown", dataType: "text"},
            {componentType: "dropdown", dataType: "number"}
        ];

        this.state = {
            selectedAnswer: -1,
            selectedParent: -1,
            selectedType: 0,
            newQuestionText: ""
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (lengthObject(this.props.surveyQuestions) !== lengthObject(prevProps.surveyQuestions)) {
            if (!this.props.surveyQuestions[this.state.selectedParent]) {
                this.setState({selectedParent: -1});
            }
        }

        if (this.state.selectedParent !== prevState.selectedParent) {
            this.setState({selectedAnswer: -1});
        }
    }

    addSurveyQuestion = () => {
        if (this.state.newQuestionText !== "") {
            const {selectedType, newQuestionText, selectedParent, selectedAnswer} = this.state;
            const {surveyQuestions, setProjectDetails} = this.props;
            const {dataType, componentType} = this.componentTypes[selectedType];
            const repeatedQuestions = lengthObject(filterObject(
                surveyQuestions,
                ([_id, sq]) => removeEnumerator(sq.question) === newQuestionText
            ));

            if (repeatedQuestions === 0
                || confirm("Warning: This is a duplicate name.  It will be added as "
                           + `${newQuestionText} (${repeatedQuestions}) in design mode.`)) {
                const newId = Math.max(...Object.keys(surveyQuestions)) + 1;
                const newQuestion = {
                    question: repeatedQuestions > 0
                        ? newQuestionText + ` (${repeatedQuestions})`
                        : newQuestionText,
                    answers: {},
                    parentQuestion: selectedParent,
                    parentAnswer: selectedAnswer,
                    dataType,
                    componentType
                };
                setProjectDetails({surveyQuestions: {...surveyQuestions, [newId]: newQuestion}});
                this.setState({selectedAnswer: -1, newQuestionText: ""});
            }
        } else {
            alert("Please enter a survey question first.");
        }
    };

    renderOptions = () => {
        const {surveyQuestions} = this.props;
        if (lengthObject(surveyQuestions)) {
            return mapObjectArray(
                filterObject(surveyQuestions, ([_id, sq]) => sq.componentType !== "input"),
                ([key, val]) => (
                    <option key={key} value={key}>
                        {val.question}
                    </option>
                )
            );
        } else {
            return "";
        }
    };

    render() {
        const selectedParent = this.props.surveyQuestions[this.state.selectedParent];
        return (
            <table className="mt-4">
                <tbody>
                    <tr>
                        <td>
                            <label htmlFor="value-component-type">Component Type:</label>
                        </td>
                        <td>
                            <select
                                className="form-control form-control-sm"
                                id="value-component-type"
                                onChange={e => this.setState({selectedType: parseInt(e.target.value)})}
                                size="1"
                                value={this.state.selectedType}
                            >
                                {this.componentTypes.map((type, idx) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <option key={idx} value={idx}>
                                        {`${type.componentType} - ${type.dataType}`}
                                    </option>
                                ))}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="value-parent">Parent Question:</label>
                        </td>
                        <td>
                            <select
                                className="form-control form-control-sm"
                                id="value-parent"
                                onChange={e => this.setState({selectedParent: parseInt(e.target.value)})}
                                size="1"
                                value={this.state.selectedParent}
                            >
                                <option key={-1} value={-1}>None</option>
                                {this.renderOptions()}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="value-answer">Parent Answer:</label>
                        </td>
                        <td>
                            <select
                                className="form-control form-control-sm"
                                id="value-answer"
                                onChange={e => this.setState({selectedAnswer: parseInt(e.target.value)})}
                                size="1"
                                value={this.state.selectedAnswer}
                            >
                                <option key={-1} value={-1}>Any</option>
                                {this.state.selectedParent > 0 && selectedParent
                                    ? mapObjectArray(
                                        selectedParent.answers,
                                        ([answerId, answer]) => (
                                            <option key={answerId} value={answerId}>
                                                {answer.answer}
                                            </option>
                                        )
                                    )
                                    : ""}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label>New Question:</label>
                        </td>
                        <td>
                            <div id="add-sample-value-group">
                                <input
                                    autoComplete="off"
                                    maxLength="210"
                                    onChange={e => this.setState({newQuestionText: e.target.value})}
                                    type="text"
                                    value={this.state.newQuestionText}
                                />
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <button
                                className="btn btn-sm btn-success"
                                onClick={this.addSurveyQuestion}
                                style={{
                                    alignItems: "center",
                                    display: "flex",
                                    justifyContent: "center"
                                }}
                                type="button"
                            >
                                <SvgIcon icon="plus" size="0.9rem"/>
                                &nbsp;&nbsp;Add Survey Question
                            </button>
                        </td>
                        <td/>
                    </tr>
                </tbody>
            </table>
        );
    }
}

export class NewAnswerDesigner extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedColor: "#1527f6",
            newAnswerText: ""
        };
    }

    addSurveyAnswer = () => {
        const {surveyQuestionId, surveyQuestion, surveyQuestions} = this.props;
        const {setProjectDetails} = this.context;
        if (this.state.newAnswerText.length > 0) {
            const newId = Math.max(...Object.keys(surveyQuestion.answers)) + 1;
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

    render() {
        return (
            <div className="NewAnswerDesigner">
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
            </div>
        );
    }
}
NewAnswerDesigner.contextType = ProjectContext;

export class SurveyQuestionHelp extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            answerMode: "question",
            flaggedReason: "",
            isFlagged: false,
            selectedQuestionId: -1,
            userSamples: {1: {}},
            unansweredColor: "black",
            visibleAnswered: {}
        };
    }

    componentDidMount() {
        this.updateQuestionStatus();
    }

    componentDidUpdate(prevProps, prevState) {
        if (lengthObject(this.context.surveyQuestions)
            && this.state.userSamples !== prevState.userSamples) {
            this.updateQuestionStatus();
        }
    }

    getChildQuestionIds = currentQuestionId => {
        const {surveyQuestions} = this.context;
        const childQuestionIds = mapObjectArray(
            filterObject(surveyQuestions, ([_id, val]) => val.parentQuestion === currentQuestionId),
            ([key, _val]) => Number(key)
        );
        return childQuestionIds.length
            ? childQuestionIds.reduce((acc, cur) =>
                [...acc, ...this.getChildQuestionIds(cur)], [currentQuestionId])
            : [currentQuestionId];
    };

    calcVisibleSamples = currentQuestionId => {
        const {surveyQuestions} = this.context;
        const {userSamples} = this.state;
        const {parentQuestion, parentAnswer} = surveyQuestions[currentQuestionId];

        if (parentQuestion === -1) {
            return [{id: 1}];
        } else {
            return this.calcVisibleSamples(parentQuestion)
                .filter(sample => {
                    const sampleAnswerId = _.get(userSamples, [sample.id, parentQuestion, "answerId"]);
                    return sampleAnswerId && (parentAnswer === -1 || parentAnswer === sampleAnswerId);
                });
        }
    };

    updateQuestionStatus = () => {
        const {userSamples} = this.state;
        const {surveyQuestions} = this.context;
        const visibleAnswered = mapObject(
            surveyQuestions,
            ([questionId, _question]) => {
                const visible = this.calcVisibleSamples(Number(questionId)) || [];
                const answered = visible
                    .filter(vs => userSamples[vs.id][questionId])
                    .map(vs => ({
                        sampleId: vs.id,
                        answerId: Number(userSamples[vs.id][questionId].answerId),
                        answerText: userSamples[vs.id][questionId].answer
                    }));
                return ([questionId, {visible, answered}]);
            }
        );

        this.setState({visibleAnswered});
    };

    setCurrentValue = (questionId, answerId, answerText) => {
        const newQuestion = {
            questionId,
            answer: answerText,
            answerId
        };

        const childQuestionIds = this.getChildQuestionIds(questionId);

        const subQuestionsCleared = filterObject(
            this.state.userSamples[1],
            ([key, _val]) => !childQuestionIds.includes(Number(key))
        );

        this.setState({
            userSamples: {
                1: {
                    ...subQuestionsCleared,
                    [questionId]: newQuestion
                }
            },
            selectedQuestionId: questionId
        });
    };

    resetAnswers = () => this.setState({
        isFlagged: false,
        flaggedReason: "",
        userSamples: {1: {}}
    });

    setFlaggedReason = flaggedReason => this.setState({flaggedReason});

    setSelectedQuestion = newId => this.setState({selectedQuestionId: newId});

    toggleFlagged = () => this.setState({isFlagged: !this.state.isFlagged});

    render() {
        return (
            <div className="p-3">
                <SurveyCollection
                    allowDrawnSamples={this.context.allowDrawnSamples}
                    answerMode={this.state.answerMode}
                    flagged={this.state.isFlagged}
                    flaggedReason={this.state.flaggedReason}
                    getSelectedSampleIds={() => [1]}
                    resetPlotValues={this.resetAnswers}
                    sampleGeometries={this.context.designSettings.sampleGeometries}
                    selectedQuestionId={this.state.selectedQuestionId}
                    selectedSampleId={1}
                    setAnswerMode={mode => this.setState({answerMode: mode})}
                    setCurrentValue={this.setCurrentValue}
                    setFlaggedReason={this.setFlaggedReason}
                    setSelectedQuestion={this.setSelectedQuestion}
                    setUnansweredColor={color => this.setState({unansweredColor: color})}
                    surveyQuestions={mapObject(
                        this.context.surveyQuestions,
                        ([sqId, sq]) => (
                            [sqId, {...sq, answered: [], visible: [], ...this.state.visibleAnswered[sqId]}]
                        )
                    )}
                    surveyRules={this.context.surveyRules}
                    toggleFlagged={this.toggleFlagged}
                    unansweredColor={this.state.unansweredColor}
                />
            </div>
        );
    }
}
SurveyQuestionHelp.contextType = ProjectContext;
