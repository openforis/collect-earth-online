import React from "react";

import { isNumber } from "../utils/generalUtils";
import SvgIcon from "../components/svg/SvgIcon";
import {
  filterObject,
  getNextInSequence,
  lengthObject,
  mapObjectArray,
  sameContents,
} from "../utils/sequence";
import { ProjectContext } from "../project/constants";
import Modal from "../components/Modal";

class TextMatchForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      regex: "",
      questionId: -1,
      modal: null
    };
  }

  addSurveyRule = () => {
    const { surveyRules, setProjectDetails } = this.context;
    const { questionId, regex } = this.state;
    const conflictingRule = surveyRules.find(
      (rule) => rule.ruleType === "text-match" && rule.questionId === questionId
    );
    const errorMessages = [
      conflictingRule &&
        "A text regex match rule already exists for this question. (Rule " +
          conflictingRule.id +
          ")",
      questionId < 0 && "You must select a question.",
      regex.length === 0 && "The regex string is missing.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      this.setState ({modal: {alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "text-match",
            questionId,
            regex,
          },
        ],
      });
    }
  };

  render() {
    const { questionId, regex } = this.state;
    const { surveyQuestions } = this.context;
    const availableQuestions = filterObject(
      surveyQuestions,
      ([_id, sq]) => sq.componentType === "input" && sq.dataType === "text"
    );
    return lengthObject(availableQuestions) > 0 ? (
      <>
        {this.state.modal?.alert &&
         <Modal title={this.state.modal.alert.alertType}
                onClose={()=>{this.setState({modal: null});}}>
           {this.state.modal.alert.alertMessage}
         </Modal>}
        <div className="form-group">
          <label>Survey Question</label>
          <select
            className="form-control form-control-sm"
            onChange={(e) => this.setState({ questionId: Number(e.target.value) })}
            value={questionId}
          >
            <option value={-1}>- Select Question -</option>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Enter regular expression</label>
          <input
            className="form-control form-control-sm"
            onChange={(e) => this.setState({ regex: e.target.value })}
            placeholder="Regular expression"
            type="text"
            value={regex}
          />
        </div>
        <div className="d-flex justify-content-end">
          <input
            className="btn btn-lightgreen"
            onClick={this.addSurveyRule}
            type="button"
            value="Add Survey Rule"
          />
        </div>
      </>
    ) : (
      <label>This rule requires a question of type input-text.</label>
    );
  }
}
TextMatchForm.contextType = ProjectContext;

class NumericRangeForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      questionId: -1,
      min: 0,
      max: 0,
    };
  }

  addSurveyRule = () => {
    const { surveyRules, setProjectDetails } = this.context;
    const { questionId, min, max } = this.state;
    const conflictingRule = surveyRules.find(
      (rule) => rule.ruleType === "numeric-range" && rule.questionId === questionId
    );
    const errorMessages = [
      conflictingRule &&
        "A numeric range rule already exists for this question. (Rule " + conflictingRule.id + ")",
      questionId < 0 && "You must select a question.",
      max <= min && "Max must be larger than min.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      this.setState ({modal: {alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "numeric-range",
            questionId,
            min,
            max,
          },
        ],
      });
    }
  };

  render() {
    const { questionId, min, max } = this.state;
    const { surveyQuestions } = this.context;
    const availableQuestions = filterObject(
      surveyQuestions,
      ([_id, sq]) => sq.componentType === "input" && sq.dataType === "number"
    );
    return lengthObject(availableQuestions) > 0 ? (
      <>
        <div className="form-group">
          <label>Survey Question</label>
          <select
            className="form-control form-control-sm"
            onChange={(e) => this.setState({ questionId: Number(e.target.value) })}
            value={questionId}
          >
            <option value={-1}>- Select Question -</option>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Enter minimum</label>
          <input
            className="form-control form-control-sm"
            onChange={(e) => this.setState({ min: Number(e.target.value) })}
            placeholder="Minimum value"
            type="number"
            value={min}
          />
        </div>
        <div className="form-group">
          <label>Enter maximum</label>
          <input
            className="form-control form-control-sm"
            onChange={(e) => this.setState({ max: Number(e.target.value) })}
            placeholder="Maximum value"
            type="number"
            value={max}
          />
        </div>
        <div className="d-flex justify-content-end">
          <input
            className="btn btn-lightgreen"
            onClick={this.addSurveyRule}
            type="button"
            value="Add Survey Rule"
          />
        </div>
      </>
    ) : (
      <label>This rule requires a question of type input-number.</label>
    );
  }
}
NumericRangeForm.contextType = ProjectContext;

class SumOfAnswersForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      validSum: 0,
      questionIds: [],
    };
  }

  addSurveyRule = () => {
    const { surveyRules, setProjectDetails } = this.context;
    const { questionIds, validSum } = this.state;
    const conflictingRule = surveyRules.find(
      (rule) => rule.ruleType === "sum-of-answers" && sameContents(questionIds, rule.questionIds)
    );
    const errorMessages = [
      conflictingRule &&
        "A sum of answers rule already exists for these questions. (Rule " +
          conflictingRule.id +
          ")",
      questionIds.length < 2 &&
        "Sum of answers rule requires the selection of two or more questions.",
      !isNumber(validSum) && "You must ender a valid sum number.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      this.setState ({modal: {alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "sum-of-answers",
            questionIds,
            validSum,
          },
        ],
      });
    }
  };

  render() {
    const { questionIds, validSum } = this.state;
    const { surveyQuestions } = this.context;
    const availableQuestions = filterObject(
      surveyQuestions,
      ([_id, sq]) => sq.dataType === "number"
    );
    return lengthObject(availableQuestions) > 1 ? (
      <>
        <div className="form-group">
          <label>Select survey question</label>
          <select
            className="form-control form-control-sm overflow-auto"
            multiple="multiple"
            onChange={(e) =>
              this.setState({
                questionIds: Array.from(e.target.selectedOptions, (i) => Number(i.value)),
              })
            }
            value={questionIds}
          >
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Hold ctrl/cmd and select multiple questions
          </small>
        </div>
        <div className="form-group">
          <label>Enter valid sum</label>
          <input
            className="form-control form-control-sm"
            onChange={(e) => this.setState({ validSum: Number(e.target.value) })}
            placeholder="Valid sum"
            type="number"
            value={validSum}
          />
        </div>
        <div className="d-flex justify-content-end">
          <input
            className="btn btn-lightgreen"
            onClick={this.addSurveyRule}
            type="button"
            value="Add Survey Rule"
          />
        </div>
      </>
    ) : (
      <label>There must be at least 2 number questions for this rule type.</label>
    );
  }
}
SumOfAnswersForm.contextType = ProjectContext;

class MatchingSumsForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      questionIds1: [],
      questionIds2: [],
    };
  }

  addSurveyRule = () => {
    const { surveyRules, setProjectDetails } = this.context;
    const { questionIds1, questionIds2 } = this.state;
    const conflictingRule = surveyRules.find(
      (rule) =>
        rule.ruleType === "matching-sums" &&
        sameContents(questionIds1, rule.questionIds1) &&
        sameContents(questionIds2, rule.questionIds2)
    );
    const errorMessages = [
      conflictingRule &&
        "A matching sums rule already exists for these questions. (Rule " +
          conflictingRule.id +
          ")",
      questionIds1.length < 2 &&
        questionIds2.length < 2 &&
        "Matching sums rule requires that at least one of the question sets contain two or more questions.",
      questionIds1.length === 0 && "You must select at least one question from the first set.",
      questionIds2.length === 0 && "You must select at least one question from the second set.",
      questionIds1.some((id) => questionIds2.includes(id)) &&
        "Question set 1 and 2 cannot contain the same question.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      this.setState ({modal: {alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "matching-sums",
            questionIds1,
            questionIds2,
          },
        ],
      });
    }
  };

  render() {
    const { questionIds1, questionIds2 } = this.state;
    const { surveyQuestions } = this.context;
    const availableQuestions = filterObject(
      surveyQuestions,
      ([_id, sq]) => sq.dataType === "number"
    );
    return lengthObject(availableQuestions) > 1 ? (
      <>
        <div className="form-group">
          <label>Select first question set</label>
          <select
            className="form-control form-control-sm overflow-auto"
            multiple="multiple"
            onChange={(e) =>
              this.setState({
                questionIds1: Array.from(e.target.selectedOptions, (i) => Number(i.value)),
              })
            }
            value={questionIds1}
          >
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Hold ctrl/cmd and select multiple questions
          </small>
        </div>
        <div className="form-group">
          <label>Select second question set</label>
          <select
            className="form-control form-control-sm overflow-auto"
            multiple="multiple"
            onChange={(e) =>
              this.setState({
                questionIds2: Array.from(e.target.selectedOptions, (i) => Number(i.value)),
              })
            }
            value={questionIds2}
          >
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Hold ctrl/cmd and select multiple questions
          </small>
        </div>
        <div className="d-flex justify-content-end">
          <input
            className="btn btn-lightgreen"
            onClick={this.addSurveyRule}
            type="button"
            value="Add Survey Rule"
          />
        </div>
      </>
    ) : (
      <label>There must be at least 2 number questions for this rule type.</label>
    );
  }
}
MatchingSumsForm.contextType = ProjectContext;

class IncompatibleAnswersForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      questionId1: -1,
      questionId2: -1,
      answerId1: -1,
      answerId2: -1,
    };
  }

  checkPair = (q1, a1, q2, a2) => q1 === q2 && a1 === a2;

  checkEquivalent = (q1, a1, q2, a2, q3, a3, q4, a4) =>
    (this.checkPair(q1, a1, q3, a3) && this.checkPair(q2, a2, q4, a4)) ||
    (this.checkPair(q1, a1, q4, a4) && this.checkPair(q2, a2, q3, a3));

  addSurveyRule = () => {
    const { surveyRules, setProjectDetails } = this.context;
    const { questionId1, answerId1, questionId2, answerId2 } = this.state;
    const conflictingRule = surveyRules.find(
      (rule) =>
        rule.ruleType === "incompatible-answers" &&
        this.checkEquivalent(
          rule.questionId1,
          rule.answerId1,
          rule.questionId2,
          rule.answerId2,
          questionId1,
          answerId1,
          questionId2,
          answerId2
        )
    );
    const errorMessages = [
      conflictingRule &&
        "An incompatible answers rule already exists for these question / answer pairs. (Rule " +
          conflictingRule.id +
          ")",
      questionId1 === questionId2 && "You must select two different questions.",
      questionId1 < 0 && "You must select a valid first question.",
      questionId2 < 0 && "You must select a valid second question.",
      (answerId1 < 0 || answerId2 < 0) && "You must select an answer for each question.",
    ].filter((m) => m);
    if (errorMessages.length > 0) {
      this.setState ({modal: {alert: {alertType: "Rule Designer Error", alertMessage: errorMessages.map((s) => "- " + s).join("\n")}}});
    } else {
      setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "incompatible-answers",
            questionId1,
            questionId2,
            answerId1,
            answerId2,
          },
        ],
      });
    }
  };

  safeFindAnswers = (questionId) => {
    const { surveyQuestions } = this.context;
    return questionId in surveyQuestions ? surveyQuestions[questionId].answers : {};
  };

  render() {
    const { questionId1, answerId1, questionId2, answerId2 } = this.state;
    const { surveyQuestions } = this.context;
    const availableQuestions = filterObject(
      surveyQuestions,
      ([_id, sq]) => sq.componentType !== "input"
    );
    return lengthObject(availableQuestions) > 1 ? (
      <>
        <strong className="mb-2" style={{ textAlign: "center" }}>
          Select the incompatible questions and answers
        </strong>
        <div className="form-group">
          <label>Question 1</label>
          <select
            className="form-control form-control-sm"
            onChange={(e) =>
              this.setState({
                questionId1: Number(e.target.value),
                answerId1: -1,
              })
            }
            value={questionId1}
          >
            <option value="-1">- Select Question 1 -</option>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Answer 1</label>
          <select
            className="form-control form-control-sm"
            onChange={(e) => this.setState({ answerId1: Number(e.target.value) })}
            value={answerId1}
          >
            <option value="-1">- Select Answer 1 -</option>
            {mapObjectArray(this.safeFindAnswers(questionId1), ([ansId, ans]) => (
              <option key={ansId} value={ansId}>
                {ans.answer}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Question 2</label>
          <select
            className="form-control form-control-sm"
            onChange={(e) =>
              this.setState({
                questionId2: Number(e.target.value),
                answerId2: -1,
              })
            }
            value={questionId2}
          >
            <option value="-1">- Select Question 2 -</option>
            {mapObjectArray(availableQuestions, ([aqId, aq]) => (
              <option key={aqId} value={aqId}>
                {aq.question}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Answer 2</label>
          <select
            className="form-control form-control-sm"
            onChange={(e) => this.setState({ answerId2: Number(e.target.value) })}
            value={answerId2}
          >
            <option value="-1">- Select Answer 2 -</option>
            {mapObjectArray(this.safeFindAnswers(questionId2), ([ansId, ans]) => (
              <option key={ansId} value={ansId}>
                {ans.answer}
              </option>
            ))}
          </select>
        </div>
        <div className="d-flex justify-content-end">
          <input
            className="btn btn-lightgreen"
            onClick={this.addSurveyRule}
            type="button"
            value="Add Survey Rule"
          />
        </div>
      </>
    ) : (
      <label>There must be at least 2 questions where type is not input for this rule.</label>
    );
  }
}
IncompatibleAnswersForm.contextType = ProjectContext;

class MultipleIncompatibleAnswersForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tempQuestionId: -1,
      tempAnswerId: -1,
      answers: {},
      incompatQuestionId: -1,
      incompatAnswerId: -1,
    };
  }

  removeRule = (questionId) => {
    const rules = this.state.answers;
    delete rules[questionId];
    this.setState({ answers: rules });
  }

  addRule = (questionId, answerId) => {
    this.setState({ answers: {...this.state.answers,
                              [questionId]: answerId}});
  }

  resetTempVars = () => {
    this.setState({ tempQuestionId: -1 });
    this.setState({ tempAnswerId: -1 });
  }

  addSurveyRule = () => {
    const { surveyRules, setProjectDetails } = this.context;
    const { answers, incompatQuestionId, incompatAnswerId } = this.state;
    setProjectDetails({
        surveyRules: [
          ...surveyRules,
          {
            id: getNextInSequence(surveyRules.map((rule) => rule.id)),
            ruleType: "multiple-incompatible-answers",
            answers: answers,
            incompatQuestionId: incompatQuestionId,
            incompatAnswerId: incompatAnswerId
          },
        ],
    });
  };

  safeFindAnswers = (questionId) => {
    const { surveyQuestions } = this.context;
    return questionId in surveyQuestions ? surveyQuestions[questionId].answers : {};
  };

  renderRuleRow = (surveyQuestions, questionId, answerId) => {
    const questionText = surveyQuestions[questionId]?.question;
    const answerText = surveyQuestions[questionId].answers[answerId].answer;
    return (
      <>
        <div className="form-row mt-1">
          <div className="font-italic medium ml-2">
            {`Answer ${answerText} from question ${questionText}`}
          </div>
          <div className="col-1">
            <button
              className="btn btn-sm btn-danger"
              onClick={() => this.removeRule(questionId)}
              title="Remove question"
              type="button"
            >
              <SvgIcon icon="minus" size="0.5rem" />
            </button>
          </div>
        </div>
      </>
    )};

  render() {
    const { answers, incompatQuestionId, incompatAnswerId } = this.state;
    const { surveyQuestions } = this.context;
    const availableQuestions = filterObject(
      surveyQuestions,
      ([_id, sq]) => sq.componentType !== "input"
    );

    return lengthObject(availableQuestions) > 2 ? (
      <>
        <strong className="mb-2" style={{ textAlign: "center" }}>
          Select and add questions and answers to the rule
        </strong>
        <div className="row" style={{ display: "flex", alignItems: "center"}}>
          <label>Question </label>
          <select
            style={{ display: "inline-block"}}
            className="form-inline form-control-sm ml-2 mr-2"
            onChange={(e) =>
              this.setState({
                tempQuestionId: e.target.value
              })
            }
            value={this.state.tempQuestionId}
          >
            <option value="-1">- Select Question -</option>
            {mapObjectArray(surveyQuestions, ([aqId, aq]) => {
              if(this.state.answers[aqId] === undefined) {
                return (
                  <option key={aqId} value={aqId}>
                    {aq.question}
                  </option>
                )
              }})}
          </select>
          <label>Answer </label>
          <select
            style={{ display: "inline-block"}}
            className="form-inline form-control-sm ml-2 mr-2"
            onChange={(e) => this.setState({ tempAnswerId: e.target.value })}
            value={this.state.tempAnswerId}
          >
            <option value="-1">- Select Answer -</option>
            {mapObjectArray(this.safeFindAnswers(this.state.tempQuestionId), ([ansId, ans]) => (
              <option key={ansId} value={ansId}>
                {ans.answer}
              </option>
            ))}
          </select>
          <div className="col-1">
            <button
              style={{ display: "inline-block"}}
              className="btn btn-sm btn-success"
              disabled={this.state.tempAnswerId === -1 || this.state.tempQuestionId === -1}
              onClick={() => {
                this.addRule(this.state.tempQuestionId, this.state.tempAnswerId);
                this.resetTempVars();
              }}
              title="Add Rule"
              type="button"
            >
              <SvgIcon icon="plus" size="0.9rem" />
            </button>
          </div>

        </div>
        {Object.entries(answers)?.map(([question, answer]) =>
          this.renderRuleRow(surveyQuestions, question, answer))}
        <br/>
        <strong className="mb-2" style={{ textAlign: "center" }}>
          If the answers above are selected, then the following answer is incompatible
        </strong>

        <div className="form-row" style={{ display: "flex", alignItems: "center"}}>
          <label>Question </label>
          <select
            style={{ display: "inline-block"}}
            className="form-inline form-control-sm ml-2 mr-2"
            onChange={(e) =>
              this.setState({
                incompatQuestionId: e.target.value
              })
            }
            value={incompatQuestionId}
          >
            <option value="-1">- Select Question -</option>
            {mapObjectArray(surveyQuestions, ([aqId, aq]) => {
              if(this.state.answers[aqId] === undefined) {
               return (
                  <option key={aqId} value={aqId}>
                    {aq.question}
                  </option>
               );
              }
            })}
          </select>
          <label>Answer </label>
          <select
            style={{ display: "inline-block"}}
            className="form-inline form-control-sm ml-2 mr-2"
            onChange={(e) => this.setState({ incompatAnswerId: e.target.value })}
            value={incompatAnswerId}
          >
            <option value="-1">- Select Answer -</option>
            {mapObjectArray(this.safeFindAnswers(incompatQuestionId), ([ansId, ans]) => (
              <option key={ansId} value={ansId}>
                {ans.answer}
              </option>
            ))}
          </select>
        </div>
        <div className="d-flex justify-content-end">
          <input
            className="btn btn-lightgreen"
            onClick={this.addSurveyRule}
            type="button"
            value="Add Survey Rule"
          />
        </div>
      </>
    ) : (
      <label>There must be at least 3 questions where type is not input for this rule.</label>
    );
  }
}
MultipleIncompatibleAnswersForm.contextType = ProjectContext;

export default class NewRuleDesigner extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedRuleType: "text-match",
    };
  }

  render() {
    const { selectedRuleType } = this.state;
    return (
      <div className="mt-3 d-flex justify-content-center">
        <div style={{ display: "flex", flexFlow: "column", width: "50rem" }}>
          <h2>New Rule</h2>
          <div className="form-group">
            <label>Rule Type</label>
            <select
              className="form-control form-control-sm"
              onChange={(e) => this.setState({ selectedRuleType: e.target.value })}
              value={selectedRuleType}
            >
              <option value="text-match">Text Regex Match</option>
              <option value="numeric-range">Numeric Range</option>
              <option value="sum-of-answers">Sum of Answers</option>
              <option value="matching-sums">Matching Sums</option>
              <option value="incompatible-answers">Incompatible Answers</option>
              <option value="multiple-incompatible-answers">Multiple Incompatible Answers</option>
            </select>
          </div>
          {
            {
              "text-match": <TextMatchForm />,
              "numeric-range": <NumericRangeForm />,
              "sum-of-answers": <SumOfAnswersForm />,
              "matching-sums": <MatchingSumsForm />,
              "incompatible-answers": <IncompatibleAnswersForm />,
              "multiple-incompatible-answers": <MultipleIncompatibleAnswersForm />,

            }[selectedRuleType]
          }
        </div>
      </div>
    );
  }
}
