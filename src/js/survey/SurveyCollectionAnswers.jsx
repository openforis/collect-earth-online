import React, { Fragment } from "react";

import SvgIcon from "../components/svg/SvgIcon";
import RequiredInput from "../components/RequiredInput";

import { firstEntry, mapObjectArray } from "../utils/sequence";

function AnswerButton({ surveyNodeId, surveyNode, selectedSampleId, validateAndSetCurrentValue }) {
  const { answers, answered, dataType } = surveyNode;
  return (
    <ul className="samplevalue justify-content-center my-1">
      {mapObjectArray(answers, ([strId, ans]) => {
        const ansId = Number(strId);
        if (!ans.hide) {
          return (
            <li key={ansId} className="mb-1">
              <button
                className="btn btn-outline-darkgray btn-sm btn-block pl-1 text-truncate"
                id={ans.answer + "_" + ansId}
                onClick={() => {
                  const value = dataType === "number" ? Number(ans.answer) : ans.answer;
                  validateAndSetCurrentValue(surveyNodeId, ansId, value);
                }}
                style={{
                  boxShadow: answered.some(
                    (a) => a.answerId === ansId && a.sampleId === selectedSampleId
                  )
                    ? "0px 0px 8px 3px black inset"
                    : answered.some((a) => a.answerId === ansId)
                      ? "0px 0px 8px 3px grey inset"
                      : "initial",
                }}
                title={ans.answer}
                type="button"
              >
                <div
                  className="circle mr-2"
                  style={{
                    backgroundColor: ans.color,
                    border: "1px solid",
                    float: "left",
                    marginTop: "4px",
                  }}
                />
                <span className="small">{ans.answer}</span>
              </button>
            </li>
          );
        }
      })}
    </ul>
  );
}

// TODO, do we really need radio button?
function AnswerRadioButton({
  surveyNode,
  surveyNodeId,
  selectedSampleId,
  validateAndSetCurrentValue,
}) {
  const { answers, answered, dataType } = surveyNode;
  return (
    <ul className="samplevalue justify-content-center">
      {mapObjectArray(answers, ([strId, ans]) => {
        const ansId = Number(strId);
        return (
          <li key={ansId} className="mb-1">
            <button
              className="btn btn-outline-darkgray btn-sm btn-block pl-1 text-truncate"
              onClick={() => {
                const value = dataType === "number" ? Number(ans.answer) : ans.answer;
                validateAndSetCurrentValue(surveyNodeId, ansId, value);
              }}
              title={ans.answer}
              type="button"
            >
              <div
                className="circle ml-1"
                style={{
                  border: "1px solid black",
                  float: "left",
                  marginTop: "4px",
                  boxShadow: "0px 0px 0px 3px " + ans.color,
                  backgroundColor: answered.some(
                    (a) => a.answerId === ansId && a.sampleId === selectedSampleId
                  )
                    ? "black"
                    : answered.some((a) => a.answerId === ansId)
                      ? "#e8e8e8"
                      : "white",
                }}
              />
              <span className="small">{ans.answer}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

class AnswerInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      newInput: "",
    };
  }

  componentDidMount() {
    this.resetInputText();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.selectedSampleId !== prevProps.selectedSampleId ||
      this.props.surveyNode.answered !== prevProps.surveyNode.answered
    ) {
      this.resetInputText();
    }
  }

  resetInputText = () => {
    const answerId = Number(firstEntry(this.props.surveyNode.answers)[0]);
    const answerText = this.props.surveyNode.answered[0]?.answerText;
    const allSamplesMatch = this.props.surveyNode.answered.every(
      (a) => {
        return (a.answerId === answerId && (a.answerText === answerText && a.answerText != undefined))}
    );
    const matchingNode = this.props.surveyNode.answered.find(
      (a) => a.answerId === answerId && a.sampleId === this.props.selectedSampleId
    );
    if(allSamplesMatch) {
      this.setState ({
        newInput: this.props.surveyNode.answered[0] ? answerText : ""});
    } else {
      this.setState({
        newInput: matchingNode?.answerText ? matchingNode.answerText : ""
      });
    }
  };

  updateInputValue = (value) => this.setState({ newInput: value });

  render() {
    const { newInput } = this.state;
    const { surveyNode, surveyNodeId, validateAndSetCurrentValue } = this.props;
    const { answers, dataType } = surveyNode;
    const [answerId, answer] = firstEntry(answers);
    return answer ? (
      <div className="d-inline-flex">
        <div className="pr-2 pt-2">
          <div
            className="circle"
            style={{
              backgroundColor: answer.color,
              border: "1px solid",
            }}
          />
        </div>
        <RequiredInput
          className="form-control mr-2"
          id={answer.answer + "_" + answerId}
          onChange={(e) =>
            this.updateInputValue(dataType === "number" ? Number(e.target.value) : e.target.value)
          }
          placeholder={answer.answer}
          required={answer.required}
          type={dataType}
          value={newInput}
        />
        <button
          className="text-center btn btn-outline-lightgreen btn-sm ml-2"
          disabled={(answer.required && newInput === "")}
          id="save-input"
          name="save-input"
          onClick={() => {
            if (!answer.required || newInput || newInput === 0) {
              validateAndSetCurrentValue(surveyNodeId, answerId, newInput, answer.answer);
            }
          }}
          style={{ height: "2.5rem" }}
          type="button"
        >
          Save
        </button>
      </div>
    ) : null;
  }
}

class AnswerDropDown extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showDropdown: false,
    };
  }

  toggleDropDown = () => this.setState({ showDropdown: !this.state.showDropdown });

  render() {
    const {
      surveyNodeId,
      surveyNode: { answers, answered },
      selectedSampleId,
      validateAndSetCurrentValue,
    } = this.props;
    const { showDropdown } = this.state;
    const answerOptions = mapObjectArray(answers, ([strId, ans]) => {
      const ansId = Number(strId);
      return (
        <div
          key={ansId}
          className="d-inline-flex py-2 border-bottom"
          onMouseDown={() => {
            this.toggleDropDown();
            return validateAndSetCurrentValue(surveyNodeId, ansId, ans.answer);
          }}
          style={{
            backgroundColor: answered.some((a) => a.answerId === ansId) ? "#e8e8e8" : "#f1f1f1",
          }}
        >
          <div className="col-1">
            <span
              className="dot"
              style={{
                height: "15px",
                width: "15px",
                backgroundColor: ans.color,
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
          </div>
          <div className="col-11 text-left">{ans.answer}</div>
        </div>
      );
    });

    return (
      <div className="mb-1 d-flex flex-column align-items-start">
        <div
          className="dropdown-selector ml-3 d-flex pl-0 col-12"
          onClick={this.toggleDropDown}
          style={{ cursor: "pointer" }}
        >
          <div className="SelectedItem d-inline-flex border col-8">
            {/* TODO, why are we mapping twice? This looks wrong, should be `find -> lookup answer`, I think. */}
            {mapObjectArray(answers, ([strId, ans]) => {
              const ansId = Number(strId);
              return (
                answered.some((a) => a.answerId === ansId &&
                              (a.sampleId === selectedSampleId || selectedSampleId === -1)) && (
                  <Fragment key={ansId}>
                    <div className="col-1 mt-2">
                      <span
                        className="dot"
                        style={{
                          height: "15px",
                          width: "15px",
                          backgroundColor: ans.color,
                          borderRadius: "50%",
                          display: "inline-block",
                        }}
                      />
                    </div>
                    <div className="col-11 text-left mt-1">{ans.answer}</div>
                  </Fragment>
                )
              );
            })}
          </div>
          <button
            className="btn btn-lightgreen btn-sm"
            onBlur={() => this.setState({ showDropdown: false })}
            type="button"
          >
            <SvgIcon icon="downCaret" size="1rem" />
          </button>
        </div>
        <div className="dropdown-content col-8" id="dropdown-placeholder">
          <div
            className="dropdown-content flex-column container"
            id="myDropdown"
            style={{
              display: showDropdown ? "flex" : "none",
              position: "absolute",
              backgroundColor: "#f1f1f1",
              overflow: "auto",
              boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
              zIndex: "10",
              cursor: "pointer",
            }}
          >
            {answerOptions}
          </div>
        </div>
      </div>
    );
  }
}

export default function SurveyCollectionAnswers(props) {
  const type = (props.surveyNode.componentType || "button").toLowerCase();
  return {
    radiobutton: <AnswerRadioButton {...props} />,
    input: <AnswerInput {...props} />,
    dropdown: <AnswerDropDown {...props} />,
    button: <AnswerButton {...props} />,
  }[type];
}
