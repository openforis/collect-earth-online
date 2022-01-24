import React from "react";
import _ from "lodash";

import {lengthObject, mapObjectArray, filterObject, getNextInSequence} from "../utils/sequence";
import {removeEnumerator} from "../utils/generalUtils";
import SvgIcon from "../components/svg/SvgIcon";

export default class NewQuestionDesigner extends React.Component {
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
            selectedAnswerId: -1,
            selectedParentId: -1,
            selectedType: 0,
            newQuestionText: ""
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (lengthObject(this.props.surveyQuestions) !== lengthObject(prevProps.surveyQuestions)) {
            if (!this.props.surveyQuestions[this.state.selectedParentId]) {
                // eslint-disable-next-line react/no-did-update-set-state
                this.setState({selectedParentId: -1});
            }
        }

        if (this.state.selectedParentId !== prevState.selectedParentId) {
            // eslint-disable-next-line react/no-did-update-set-state
            this.setState({selectedAnswerId: -1});
        }
    }

    addSurveyQuestion = () => {
        if (this.state.newQuestionText !== "") {
            const {selectedType, newQuestionText, selectedParentId, selectedAnswerId} = this.state;
            const {surveyQuestions, setProjectDetails} = this.props;
            const {dataType, componentType} = this.componentTypes[selectedType];
            const repeatedQuestions = lengthObject(filterObject(
                surveyQuestions,
                ([_id, sq]) => removeEnumerator(sq.question) === newQuestionText
            ));

            if (repeatedQuestions === 0
                || confirm("Warning: This is a duplicate name.  It will be added as "
                           + `${newQuestionText} (${repeatedQuestions}) in design mode.`)) {
                const newId = getNextInSequence(Object.keys(surveyQuestions));
                const newQuestion = {
                    question: repeatedQuestions > 0
                        ? newQuestionText + ` (${repeatedQuestions})`
                        : newQuestionText,
                    answers: {},
                    parentQuestionId: selectedParentId,
                    parentAnswerId: selectedAnswerId,
                    dataType,
                    componentType
                };
                setProjectDetails({surveyQuestions: {...surveyQuestions, [newId]: newQuestion}});
                this.setState({selectedAnswerId: -1, newQuestionText: ""});
            }
        } else {
            alert("Please enter a survey question first.");
        }
    };

    renderOptions = () => {
        const {surveyQuestions} = this.props;
        return mapObjectArray(
            filterObject(surveyQuestions, ([_id, sq]) => sq.componentType !== "input"),
            ([key, val]) => (
                <option key={key} value={key}>
                    {val.question}
                </option>
            )
        );
    };

    render() {
        const parentAnswers = _.get(this.props, ["surveyQuestions", this.state.selectedParentId, "answers"], {});
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
                                onChange={e => this.setState({selectedParentId: parseInt(e.target.value)})}
                                size="1"
                                value={this.state.selectedParentId}
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
                                onChange={e => this.setState({selectedAnswerId: parseInt(e.target.value)})}
                                size="1"
                                value={this.state.selectedAnswerId}
                            >
                                <option key={-1} value={-1}>Any</option>
                                {mapObjectArray(
                                    parentAnswers,
                                    ([answerId, answer]) => (
                                        <option key={answerId} value={answerId}>
                                            {answer.answer}
                                        </option>
                                    )
                                )}
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
