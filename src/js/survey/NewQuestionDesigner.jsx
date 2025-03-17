import React from "react";
import _ from "lodash";

import { lengthObject, mapObjectArray, filterObject, getNextInSequence } from "../utils/sequence";
import { removeEnumerator } from "../utils/generalUtils";
import SvgIcon from "../components/svg/SvgIcon";

export default class NewQuestionDesigner extends React.Component {
  constructor(props) {
    super(props);
    this.componentTypes = [
      { componentType: "button", dataType: "text" },
      { componentType: "button", dataType: "number" },
      { componentType: "input", dataType: "number" },
      { componentType: "input", dataType: "text" },
      { componentType: "radiobutton", dataType: "boolean" },
      { componentType: "radiobutton", dataType: "text" },
      { componentType: "radiobutton", dataType: "number" },
      { componentType: "dropdown", dataType: "boolean" },
      { componentType: "dropdown", dataType: "text" },
      { componentType: "dropdown", dataType: "number" },
    ];

    this.state = {
      questionType: "new",
      selectedAnswerIds: [],
      selectedParentId: -1,
      selectedType: 0,
      newQuestionText: "",
      selectedCopyId: -1,
      copyChildren: true,
      hideQuestion: false,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (lengthObject(this.props.surveyQuestions) !== lengthObject(prevProps.surveyQuestions)) {
      if (!this.props.surveyQuestions[this.state.selectedParentId]) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({ selectedParentId: -1 });
      }
    }

    if (this.state.selectedParentId !== prevState.selectedParentId) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ selectedAnswerIds: [] });
    }
  }

  addSurveyQuestion = () => {
    if (this.state.newQuestionText !== "") {
      const { selectedType, newQuestionText, selectedParentId, selectedAnswerIds, hideQuestion } = this.state;
      const { surveyQuestions, setProjectDetails } = this.props;
      const { dataType, componentType } = this.componentTypes[selectedType];
      const repeatedQuestions = lengthObject(
        filterObject(
          surveyQuestions,
          ([_id, sq]) => removeEnumerator(sq.question) === newQuestionText
        )
      );

      if (
        repeatedQuestions === 0 ||
        confirm(
          "Warning: This is a duplicate name.  It will be added as " +
            `${newQuestionText} (${repeatedQuestions}) in design mode.`
        )
      ) {
        const newId = getNextInSequence(Object.keys(surveyQuestions));
        const newCardOrder = getNextInSequence(
          mapObjectArray(surveyQuestions, ([_id, sql]) => sql.cardOrder).filter((c) => c)
        ) || 1;
        const newQuestion = {
          question:
            repeatedQuestions > 0 ? newQuestionText + ` (${repeatedQuestions})` : newQuestionText,
          answers: {},
          parentQuestionId: selectedParentId,
          parentAnswerIds: selectedAnswerIds,
          dataType,
          hideQuestion,
          componentType,
          ...(selectedParentId === -1 && { cardOrder: newCardOrder }),
        };
        setProjectDetails({ surveyQuestions: { ...surveyQuestions, [newId]: newQuestion } });
        this.setState({ selectedAnswerIds: [], newQuestionText: "" });
      }
    } else {
      alert("Please enter a survey question text.");
    }
  };

  getCopy = (idOffset, copyQuestionId, parentId, answerIds = null) => {
    const { copyChildren } = this.state;
    const { surveyQuestions } = this.props;

    const copyQuestion = surveyQuestions[copyQuestionId];
    const surveyQuestionsList = Object.values(surveyQuestions);
    const cardOrder = surveyQuestionsList.reduce((max, q) => q.cardOrder > max ?
                                                 q.cardOrder :
                                                 max, surveyQuestions[0].cardOrder)
    const repeatedQuestions = lengthObject(
      filterObject(
        surveyQuestions,
        ([_id, sq]) => removeEnumerator(sq.question) === copyQuestion.question
      )
    );
    const newQuestion = {
      ...copyQuestion,
      question: `${copyQuestion.question} (${repeatedQuestions})`,
      parentQuestionId: parentId,
      ...(answerIds && { parentAnswerIds: answerIds }),
    };
    const newId = idOffset + copyQuestionId;
    const childQuestionIds = copyChildren
      ? mapObjectArray(
          filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestionId === copyQuestionId),
          ([key, _val]) => Number(key)
        )
      : [];

    if (childQuestionIds.length) {
      return childQuestionIds.reduce(
        (acc, cur) => ({ ...acc, ...this.getCopy(idOffset, cur, newId) }),
        { [newId]: parentId > 0 ? {...newQuestion, cardOrder: null} :
                                  {...newQuestion, cardOrder: cardOrder+1 } }
      );
    } else {
      return {
        [newId]: parentId > 0 ? {...newQuestion, cardOrder: null} :
                                {...newQuestion, cardOrder: cardOrder+1 }
      };
    }
  };

  copySurveyQuestion = () => {
    const { selectedCopyId, selectedParentId, selectedAnswerIds } = this.state;
    const { surveyQuestions, setProjectDetails } = this.props;
    if (selectedCopyId >= 0) {
      const idOffset = getNextInSequence(Object.keys(surveyQuestions)) - selectedCopyId;
      const copies = this.getCopy(idOffset, selectedCopyId, selectedParentId, selectedAnswerIds);
      setProjectDetails({ surveyQuestions: { ...surveyQuestions, ...copies } });
    } else {
      alert("Please select a question to copy");
    }
  };

  renderOptions = () => {
    const { surveyQuestions } = this.props;
    return mapObjectArray(surveyQuestions, ([key, val]) => (
      <option key={key} value={key}>
        {val.question}
      </option>
    ));
  };

  renderNew = (parentAnswers) => {
    const componentTypes = this.props.projectType === "simplified" ?
          this.componentTypes.filter((c) =>
            (c.componentType === "button") ||
              (c.componentType === "input")) :
          this.componentTypes;
    return (
    <>
      <tr>
        <td>
          <label htmlFor="value-component-type">Component Type:</label>
        </td>
        <td>
          <select
            className="form-control form-control-sm"
            id="value-component-type"
            onChange={(e) => this.setState({ selectedType: parseInt(e.target.value) })}
            size="1"
            value={this.state.selectedType}
          >
            {componentTypes.map((type, idx) => (
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
            onChange={(e) => this.setState({ selectedParentId: parseInt(e.target.value) })}
            size="1"
            value={this.state.selectedParentId}
          >
            <option key={-1} value={-1}>
              None
            </option>
            {this.renderOptions()}
          </select>
        </td>
      </tr>
      <tr>
        <td>
          <label htmlFor="value-answer">Parent Answers:</label>
        </td>
        <td>
          <select
            className="form-control form-control-sm overflow-auto"
            multiple="multiple"
            onChange={(e) =>
              this.setState({
                selectedAnswerIds: Array.from(e.target.selectedOptions, (i) => Number(i.value)),
              })
            }
            value={this.state.selectedAnswerIds}
          >
            {mapObjectArray(parentAnswers, ([answerId, answer]) => (
              <option key={answerId} value={answerId}>
                {answer.answer}
              </option>
            ))}
          </select>
        </td>
      </tr>
      <tr>
        <td>
          <label>Question Text:</label>
        </td>
        <td>
          <div id="add-sample-value-group">
            <input
              autoComplete="off"
              maxLength="210"
              onChange={(e) => this.setState({ newQuestionText: e.target.value })}
              type="text"
              value={this.state.newQuestionText}
            />
          </div>
        </td>
      </tr>
      <tr>
        <td />
        <td>
          <button
            className="btn btn-sm btn-lightgreen"
            onClick={this.addSurveyQuestion}
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "center",
            }}
            type="button"
          >
            <SvgIcon icon="plus" size="0.9rem" />
            &nbsp;&nbsp;Add Survey Question
          </button>
        </td>
        <td />
      </tr>
    </>
    );
  }

  renderCopy = (parentAnswers) => (
    <>
      <tr>
        <td>
          <label htmlFor="value-parent">Question to Copy:</label>
        </td>
        <td>
          <select
            className="form-control form-control-sm"
            id="value-parent"
            onChange={(e) => this.setState({ selectedCopyId: parseInt(e.target.value) })}
            size="1"
            value={this.state.selectedCopyId}
          >
            <option key={-1} value={-1}>
              None
            </option>
            {this.renderOptions()}
          </select>
        </td>
      </tr>
      <tr>
        <td>
          <label htmlFor="value-answer">Copy Children:</label>
        </td>
        <td>
          <input
            checked={this.state.copyChildren}
            onChange={() => this.setState({ copyChildren: !this.state.copyChildren })}
            type="checkbox"
          />
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
            onChange={(e) => this.setState({ selectedParentId: parseInt(e.target.value) })}
            size="1"
            value={this.state.selectedParentId}
          >
            <option key={-1} value={-1}>
              None
            </option>
            {this.renderOptions()}
          </select>
        </td>
      </tr>
      <tr>
        <td>
          <label htmlFor="value-answer">Parent Answers:</label>
        </td>
        <td>
          <select
            className="form-control form-control-sm overflow-auto"
            multiple="multiple"
            onChange={(e) =>
              this.setState({
                selectedAnswerIds: Array.from(e.target.selectedOptions, (i) => Number(i.value)),
              })
            }
            value={this.state.selectedAnswerIds}
          >
            {mapObjectArray(parentAnswers, ([answerId, answer]) => (
              <option key={answerId} value={answerId}>
                {answer.answer}
              </option>
            ))}
          </select>
        </td>
      </tr>
      <tr>
        <td />
        <td>
          <div className="d-flex justify-content-end">
            <button
              className="btn btn-sm btn-success"
              onClick={this.copySurveyQuestion}
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "center",
              }}
              type="button"
            >
              <SvgIcon icon="plus" size="0.9rem" />
              &nbsp;&nbsp;Copy Survey Question
            </button>
          </div>
        </td>
        <td />
      </tr>
    </>
  );

  render() {
    const { questionType } = this.state;
    const parentAnswers = _.get(
      this.props,
      ["surveyQuestions", this.state.selectedParentId, "answers"],
      {}
    );
    return (
      <table className="mt-4">
        <tbody>
          <tr>
            <td>
              <label htmlFor="value-component-type">Question Type:</label>
            </td>
            <td>
              <select
                className="form-control form-control-sm"
                id="value-component-type"
                onChange={(e) => this.setState({ questionType: e.target.value })}
                size="1"
                value={questionType}
              >
                <option value="new">New Question</option>
                <option value="copy">Copy Question</option>
              </select>
            </td>
          </tr>
          {questionType === "new" ? this.renderNew(parentAnswers) : this.renderCopy(parentAnswers)}
        </tbody>
      </table>
    );
  }
}
