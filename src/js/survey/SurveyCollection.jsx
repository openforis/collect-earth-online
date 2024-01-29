import React from "react";
import _ from "lodash";

import { CollapsibleTitle } from "../components/FormComponents";
import SvgIcon from "../components/svg/SvgIcon";
import SurveyCollectionQuestion from "./SurveyCollectionQuestion";

import { mercator } from "../utils/mercator";
import { removeEnumerator, isNumber } from "../utils/generalUtils";
import { filterObject, intersection, lengthObject, mapObjectArray } from "../utils/sequence";

export default class SurveyCollection extends React.Component {
  constructor(props) {
    let {polygons, lines, points} = props.sampleGeometries;
    super(props);
    this.state = {
      currentNodeIndex: 0,
      topLevelNodeIds: [],
      showSurveyQuestions: true,
      drawTool: polygons ? "Polygon" : lines? "LineString" : "Point"
    };
  }

  componentDidMount() {
    this.calculateTopLevelNodes();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.currentNodeIndex !== prevState.currentNodeIndex) {
      this.props.setSelectedQuestion(this.state.topLevelNodeIds[this.state.currentNodeIndex]);
    }

    // This happens when the selected question is set back to the beginning after switching from draw to question mode.
    if (
      this.props.selectedQuestionId !== prevProps.selectedQuestionId &&
      this.props.selectedQuestionId >= 0
    ) {
      const { parentQuestionId } = this.props.surveyQuestions[this.props.selectedQuestionId];
      if (parentQuestionId === -1) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({
          currentNodeIndex: this.state.topLevelNodeIds.indexOf(this.props.selectedQuestionId),
        });
      }
    }

    if (prevProps.surveyQuestions !== this.props.surveyQuestions) {
      this.calculateTopLevelNodes();
    }
  }

  calculateTopLevelNodes = () => {
    const { surveyQuestions } = this.props;
    const visibleSurveyQuestions = filterObject(surveyQuestions, ([_id, val]) => val.hideQuestion != true);
    this.setState({
      topLevelNodeIds: mapObjectArray(visibleSurveyQuestions, ([id, sq]) => ({
        nodeId: id,
        cardOrder: sq.cardOrder,
      }))
        .filter(({ cardOrder }) => isNumber(cardOrder))
        .sort((a, b) => a.cardOrder - b.cardOrder)
        .map(({ nodeId }) => Number(nodeId)),
    });
  };

  prevSurveyQuestionTree = () => {
    if (this.state.currentNodeIndex > 0) {
      this.setState({ currentNodeIndex: this.state.currentNodeIndex - 1 });
    } else {
      alert("There are no previous questions.");
    }
  };

  nextSurveyQuestionTree = () => {
    if (this.state.currentNodeIndex < this.state.topLevelNodeIds.length - 1) {
      this.setState({ currentNodeIndex: this.state.currentNodeIndex + 1 });
    } else {
      alert("There are no more questions.");
    }
  };

  setSurveyQuestionTree = (index) => this.setState({ currentNodeIndex: index });

  getNodeById = (id) =>
    this.props.surveyQuestions[id] || { question: "", answers: [], answered: [], visible: [] };

  checkAllSubAnswers = (currentQuestionId) => {
    const { surveyQuestions } = this.props;
    const visibleSurveyQuestions = filterObject(surveyQuestions, ([_id, val]) => val.hideQuestion != true);
    const { visible, answered, hideQuestion } = this.getNodeById(currentQuestionId);
    const childQuestionIds = mapObjectArray(
      filterObject(visibleSurveyQuestions, ([_id, sq]) =>
        (sq.parentQuestionId === currentQuestionId) && !hideQuestion),
      ([key, _val]) => Number(key)
    );
    return (
      visible.length === answered.length &&
      childQuestionIds.every((cqId) => this.checkAllSubAnswers(cqId))
    );
  };

  getTopColor = (nodeId) => {
    if (this.checkAllSubAnswers(nodeId)) {
      return "0px 0px 6px 4px #3bb9d6 inset";
    } else {
      const { surveyQuestions } = this.props;
      const { answered } = surveyQuestions[nodeId];
      if (answered.length) {
        return "0px 0px 6px 4px yellow inset";
      } else {
        return "0px 0px 6px 4px red inset";
      }
    }
  };

  setDrawTool = (newTool) => {
    this.setState({ drawTool: newTool });
    if (this.props.mapConfig) mercator.changeDrawTool(this.props.mapConfig, "drawLayer", newTool);
  };

  clearAll = (drawTool) => {
    if (
      this.props.answerMode === "draw" &&
      confirm("Do you want to clear all samples from the draw area?")
    ) {
      const { mapConfig } = this.props;
      mercator.disableDrawing(mapConfig);
      mercator.removeLayerById(mapConfig, "currentSamples");
      mercator.removeLayerById(mapConfig, "drawLayer");
      mercator.addVectorLayer(
        mapConfig,
        "drawLayer",
        null,
        mercator.ceoMapStyles("draw", "orange")
      );
      mercator.enableDrawing(mapConfig, "drawLayer", drawTool);
    } else if (confirm("Do you want to clear all answers?")) {
      this.props.resetPlotValues();
    }
  };

  buttonStyle = (selected) => ({
    padding: "4px",
    margin: ".25rem",
    ...(selected ? { border: "2px solid black", borderRadius: "4px" } : {}),
  });

  unansweredColor = () => (
    <div className="PlotNavigation__change-color d-flex justify-content-center mb-2">
      Unanswered Color
      <div className="form-check form-check-inline">
        <input
          checked={this.props.unansweredColor === "black"}
          className="form-check-input ml-2"
          id="radio1"
          name="color-radios"
          onChange={() => this.props.setUnansweredColor("black")}
          type="radio"
        />
        <label className="form-check-label" htmlFor="radio1">
          Black
        </label>
      </div>
      <div className="form-check form-check-inline">
        <input
          checked={this.props.unansweredColor === "white"}
          className="form-check-input"
          id="radio2"
          name="color-radios"
          onChange={() => this.props.setUnansweredColor("white")}
          type="radio"
        />
        <label className="form-check-label" htmlFor="radio2">
          White
        </label>
      </div>
    </div>
  );

  getSurveyQuestionText = (questionId) => {
    const { surveyQuestions } = this.props;
    const visibleSurveyQuestions = filterObject(surveyQuestions, ([_id, val]) => val.hideQuestion != true);
    return _.get(visibleSurveyQuestions, [questionId, "question"], "");
  };

  getSurveyAnswerText = (questionId, answerId) => {
    const { surveyQuestions } = this.props;
    return _.get(surveyQuestions, [questionId, "answered", answerId, "answerText"], "");
  };

  checkRuleTextMatch = (surveyRule, questionIdToSet, _answerId, answerText) => {
    if (surveyRule.questionId === questionIdToSet && !RegExp(surveyRule.regex).test(answerText)) {
      return `Text match validation failed.\r\n\nPlease enter an answer that matches the expression: ${surveyRule.regex}`;
    } else {
      return null;
    }
  };

  checkRuleNumericRange = (surveyRule, questionIdToSet, _answerId, answerText) => {
    if (
      surveyRule.questionId === questionIdToSet &&
      (!isNumber(answerText) || answerText < surveyRule.min || answerText > surveyRule.max)
    ) {
      return `Numeric range validation failed.\r\n\n Please select a value between ${surveyRule.min} and ${surveyRule.max}`;
    } else {
      return null;
    }
  };

  sumAnsweredQuestionsPerSample = (answeredQuestions, sampleId) =>
    Object.entries(answeredQuestions).reduce((acc, [qId, aq]) => {
      const answer = aq.answered.find((ans) => ans.sampleId === sampleId);
      const answeredVal = Number(answer.answerText || aq.answers[answer.answerId].answer || 0);
      return acc + answeredVal;
    }, 0);

  getAnsweredQuestions = (ruleQuestions, questionIdToSet) =>
    filterObject(this.props.surveyQuestions, ([sqId, sq]) => {
      const numSqId = Number(sqId);
      return (
        ruleQuestions.includes(numSqId) && sq.answered.length > 0 && numSqId !== questionIdToSet
      );
    });

  getAnsweredQuestions = (ruleQuestions, questionIdToSet) =>
    filterObject(this.props.surveyQuestions, ([sqId, sq]) => {
      const numSqId = Number(sqId);
      return (
        ruleQuestions.includes(numSqId) && sq.answered.length > 0 && numSqId !== questionIdToSet
      );
    });

  getAnsweredSampleIds = (answeredQuestions) =>
    mapObjectArray(answeredQuestions, ([_sqId, aq]) => aq.answered.map((a) => a.sampleId));

  checkRuleSumOfAnswers = (surveyRule, questionIdToSet, answerId, answerText) => {
    const answerVal =
      Number(answerText) || Number(this.getSurveyAnswerText(questionIdToSet, answerId));
    if (surveyRule.questionIds.includes(questionIdToSet)) {
      const answeredQuestions = this.getAnsweredQuestions(surveyRule.questionIds, questionIdToSet);
      if (surveyRule.questionIds.length === lengthObject(answeredQuestions) + 1) {
        const sampleIds = this.props.getSelectedSampleIds(questionIdToSet);
        const answeredSampleIds = this.getAnsweredSampleIds(answeredQuestions);
        const commonSampleIds = answeredSampleIds.reduce(intersection, sampleIds);
        if (commonSampleIds.length > 0) {
          const invalidSum = commonSampleIds
            .map((sampleId) => this.sumAnsweredQuestionsPerSample(answeredQuestions, sampleId))
            .find((s) => s + answerVal !== surveyRule.validSum);
          if (invalidSum || invalidSum === 0) {
            const { question } = this.props.surveyQuestions[questionIdToSet];
            return `Sum of answers validation failed.\r\n\nSum for questions [${surveyRule.questionIds
              .map((q) => this.getSurveyQuestionText(q))
              .toString()}] must be ${surveyRule.validSum.toString()}.\r\n\nAn acceptable answer for "${question}" is ${(
              surveyRule.validSum - invalidSum
            ).toString()}.`;
          } else {
            return null;
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  checkRuleMatchingSums = (surveyRule, questionIdToSet, answerId, answerText) => {
    const answerVal =
      Number(answerText) || Number(this.getSurveyAnswerText(questionIdToSet, answerId));
    if (surveyRule.questionIds1.concat(surveyRule.questionIds2).includes(questionIdToSet)) {
      const answeredQuestions1 = this.getAnsweredQuestions(
        surveyRule.questionIds1,
        questionIdToSet
      );
      const answeredQuestions2 = this.getAnsweredQuestions(
        surveyRule.questionIds2,
        questionIdToSet
      );
      const ansLen1 = lengthObject(answeredQuestions1);
      const ansLen2 = lengthObject(answeredQuestions2);
      const ruleLen1 = lengthObject(surveyRule.questionIds1);
      const ruleLen2 = lengthObject(surveyRule.questionIds2);
      const ready = (al1, rl1, al2, rl2) => al1 > 1 && rl1 === al1 && rl2 === al2 + 1;
      if (
        ready(ansLen1, ruleLen1, ansLen2, ruleLen2) ||
        ready(ansLen2, ruleLen2, ansLen1, ruleLen1)
      ) {
        const sampleIds = this.props.getSelectedSampleIds(questionIdToSet);
        const answeredSampleIds1 = this.getAnsweredSampleIds(answeredQuestions1);
        const commonSampleIds1 = answeredSampleIds1.reduce(intersection, sampleIds);
        const answeredSampleIds2 = this.getAnsweredSampleIds(answeredQuestions2);
        const commonSampleIds2 = answeredSampleIds2.reduce(intersection, sampleIds);
        const commonSampleIds = intersection(commonSampleIds1, commonSampleIds2);
        if (commonSampleIds.length > 0) {
          const q1Value = surveyRule.questionIds1.includes(questionIdToSet) ? answerVal : 0;
          const q2Value = surveyRule.questionIds2.includes(questionIdToSet) ? answerVal : 0;
          const invalidSum = commonSampleIds
            .map((sampleId) => {
              const sum1 = this.sumAnsweredQuestionsPerSample(answeredQuestions1, sampleId);
              const sum2 = this.sumAnsweredQuestionsPerSample(answeredQuestions2, sampleId);
              return [sum1, sum2];
            })
            .find((sums) => sums[0] + q1Value !== sums[1] + q2Value);
          if (invalidSum) {
            const { question } = this.props.surveyQuestions[questionIdToSet];
            return (
              "Matching sums validation failed.\r\n\n" +
              `Totals of the question sets [${surveyRule.questionIds1
                .map((q) => this.getSurveyQuestionText(q))
                .toString()}] and [${surveyRule.questionIds2
                .map((q) => this.getSurveyQuestionText(q))
                .toString()}] do not match.\r\n\n` +
              `An acceptable answer for "${question}" is ${Math.abs(
                invalidSum[0] - invalidSum[1]
              )}.`
            );
          } else {
            return null;
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  checkRuleIncompatibleAnswers = (surveyRule, questionIdToSet, answerId, _answerText) => {
    if (surveyRule.questionId1 === questionIdToSet && surveyRule.answerId1 === answerId) {
      const ques2 = this.props.surveyQuestions[surveyRule.questionId2];
      if (ques2.answered.some((ans) => ans.answerId === surveyRule.answerId2)) {
        const ques1Ids = this.props.getSelectedSampleIds(questionIdToSet);
        const ques2Ids = ques2.answered
          .filter((ans) => ans.answerId === surveyRule.answerId2)
          .map((a) => a.sampleId);
        const commonSampleIds = intersection(ques1Ids, ques2Ids);
        if (commonSampleIds.length > 0) {
          return `Incompatible answers validation failed.\r\n\nAnswer "${this.getSurveyAnswerText(
            surveyRule.questionId1,
            surveyRule.answerId1
          )}" from question "${this.getSurveyQuestionText(
            surveyRule.questionId1
          )}" is incompatible with\r\n answer "${this.getSurveyAnswerText(
            surveyRule.questionId2,
            surveyRule.answerId2
          )}" from question "${this.getSurveyQuestionText(surveyRule.questionId2)}".\r\n\n`;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else if (surveyRule.questionId2 === questionIdToSet && surveyRule.answerId2 === answerId) {
      const ques1 = this.props.surveyQuestions[surveyRule.questionId1];
      if (ques1.answered.some((ans) => ans.answerId === surveyRule.answerId1)) {
        const ques2Ids = this.props.getSelectedSampleIds(questionIdToSet);
        const ques1Ids = ques1.answered
          .filter((ans) => ans.answerId === surveyRule.answerId1)
          .map((a) => a.sampleId);
        const commonSampleIds = intersection(ques1Ids, ques2Ids);
        if (commonSampleIds.length > 0) {
          return `Incompatible answers validation failed.\r\n\nAnswer "${this.getSurveyAnswerText(
            surveyRule.questionId2,
            surveyRule.answerId2
          )}" from question "${this.getSurveyQuestionText(
            surveyRule.questionId2
          )}" is incompatible with\r\nanswer "${this.getSurveyAnswerText(
            surveyRule.questionId1,
            surveyRule.answerId1
          )}" from question "${this.getSurveyQuestionText(surveyRule.questionId1)}".\r\n\n`;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  };

  formatErrorText = (answerList) =>
    answerList.map((ans, idx, arr) => `answer "${this.getSurveyAnswerText(ans[0], ans[1])}" for question "${this.getSurveyQuestionText(ans[0])}"`);

  checkRuleMultipleIncompatibleAnswers = (surveyRule, questionIdToSet, answerId, _answerText) => {
    const surveyQuestions = this.props.surveyQuestions;
    const { answers, incompatQuestionId, incompatAnswerId } = surveyRule;
    const ruleAnswerList = Object.entries(answers);

    const answeredQuestionsList = ruleAnswerList.filter((answer) => {
      const question = surveyQuestions[answer[0]];
      return question.answered.some((a) => a.answerId == answer[1])
    });
    const incompatQuestion = surveyQuestions[incompatQuestionId];
    const incompatAnswer = (incompatQuestion.answered.some((a) => a.answerId == incompatAnswerId) ||
                            (incompatQuestionId == questionIdToSet && incompatAnswerId == answerId));

    if (ruleAnswerList.length === answeredQuestionsList.length && incompatAnswer) {
      const answerText = surveyQuestions[questionIdToSet].answers[answerId].answer;
      const questionText = this.getSurveyQuestionText(questionIdToSet);
      const answerTextList = this.formatErrorText(ruleAnswerList);
      return `Answer "${answerText}" for question "${questionText}" is incompatible in case ${answerTextList} are selected.`
    } else {
      return null;
    }
  }

  rulesViolated = (questionIdToSet, answerId, answerText) => {
    const ruleFunctions = {
      "text-match": this.checkRuleTextMatch,
      "numeric-range": this.checkRuleNumericRange,
      "sum-of-answers": this.checkRuleSumOfAnswers,
      "matching-sums": this.checkRuleMatchingSums,
      "incompatible-answers": this.checkRuleIncompatibleAnswers,
      "multiple-incompatible-answers": this.checkRuleMultipleIncompatibleAnswers,
    };
    return (
      this.props.surveyRules &&
      this.props.surveyRules
        .map((surveyRule) =>
          ruleFunctions[surveyRule.ruleType](surveyRule, questionIdToSet, answerId, answerText)
        )
        .find((msg) => msg)
    );
  };

  validateAndSetCurrentValue = (questionIdToSet, answerId, answerText = null, previousAnswer = null) => {
    const ruleError = this.rulesViolated(questionIdToSet, answerId, answerText);
    if (ruleError) {
      this.props.setCurrentValue(questionIdToSet, answerId, previousAnswer);
      alert(ruleError);
    } else {
      this.props.setCurrentValue(questionIdToSet, answerId, answerText);
    }
  };

  renderQuestions = () => (
    <div className="mx-1">
      {this.unansweredColor()}
      {this.props.flagged ? (
        <>
          <div style={{ color: "red", fontSize: "1.5rem" }}>This plot has been flagged.</div>
          <div className="my-2">
            <div className="slide-container">
              <label>Flagged Reason</label>
              <textarea
                className="form-control"
                onChange={(e) => this.props.setFlaggedReason(e.target.value)}
                value={this.props.flaggedReason}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <button
              className="btn btn-outline-lightgreen m-2"
              disabled={this.state.currentNodeIndex === 0}
              id="prev-survey-question"
              onClick={this.prevSurveyQuestionTree}
              style={{ opacity: this.state.currentNodeIndex === 0 ? "0.25" : "1.0" }}
              type="button"
            >
              {"<"}
            </button>
            {this.state.topLevelNodeIds.map((nodeId, i) => (
              <button
                key={nodeId}
                className="btn btn-outline-lightgreen m-2"
                id="top-select"
                onClick={() => this.setSurveyQuestionTree(i)}
                style={{
                  boxShadow: `${
                    i === this.state.currentNodeIndex
                      ? "0 0 4px 2px rgba(0, 0, 0, 1), "
                      : "0 0 2px 1px rgba(0, 0, 0, 0.1), "
                  }
                                        ${this.getTopColor(nodeId)}`,
                }}
                title={removeEnumerator(this.getNodeById(nodeId).question)}
                type="button"
              >
                {i + 1}
              </button>
            ))}
            <button
              className="btn btn-outline-lightgreen"
              disabled={this.state.currentNodeIndex === this.state.topLevelNodeIds.length - 1}
              id="next-survey-question"
              onClick={this.nextSurveyQuestionTree}
              style={{
                opacity:
                  this.state.currentNodeIndex === this.state.topLevelNodeIds.length - 1
                    ? "0.25"
                    : "1.0",
              }}
              type="button"
            >
              {">"}
            </button>
          </div>
          {this.state.topLevelNodeIds.length > 0 && (
            <SurveyCollectionQuestion
              key={this.state.topLevelNodeIds[this.state.currentNodeIndex]}
              hierarchyLabel=""
              selectedQuestionId={this.props.selectedQuestionId}
              selectedSampleId={this.props.selectedSampleId}
              setSelectedQuestion={this.props.setSelectedQuestion}
              surveyNodeId={this.state.topLevelNodeIds[this.state.currentNodeIndex]}
              surveyQuestions={this.props.surveyQuestions}
              surveyRules={this.props.surveyRules}
              validateAndSetCurrentValue={this.validateAndSetCurrentValue}
              hideQuestion={this.hideQuestion}
            />
          )}
        </>
      )}
    </div>
  );

  renderDrawTool = ({ icon, title, type, state }) => (
    <div
      onClick={() => this.setDrawTool(type)}
      style={{ alignItems: "center", cursor: "pointer", display: "flex" }}
      title={title}
    >
      <span style={this.buttonStyle(state.drawTool === type)}>
        <SvgIcon icon={icon} size="2rem" />
      </span>
      {`${type} tool`}
    </div>
  );

  renderDrawTools = () => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {this.props.sampleGeometries.points &&
        this.renderDrawTool({
          icon: "point",
          state: this.state,
          title: "Click anywhere to add a new point.",
          type: "Point",
        })}
      {this.props.sampleGeometries.lines &&
        this.renderDrawTool({
          icon: "lineString",
          state: this.state,
          title:
            "Click anywhere to start drawing.\n" +
            "A new point along the line string can be added with a single click.\n" +
            "Right click or double click to finish drawing.\n",
          type: "LineString",
        })}
      {this.props.sampleGeometries.polygons &&
        this.renderDrawTool({
          icon: "polygon",
          state: this.state,
          title:
            "Click anywhere to start drawing.\n" +
            "A new vertex can be added with a single click.\n" +
            "Right click, double click, or complete the polygon to finish drawing.\n",
          type: "Polygon",
        })}
      <ul style={{ textAlign: "left" }}>
        How To:
        <li>To modify an existing feature, hold ctrl and click to drag</li>
        <li>To delete a feature, hold ctrl and right click on it</li>
        <li>To save changes, switch back to question mode and answer remaining questions</li>
      </ul>
    </div>
  );

  renderFlagClearButtons = () => (
    <div className="mb-2 d-flex justify-content-between">
      <input
        className="btn btn-outline-red btn-sm col mr-1"
        onClick={this.props.toggleFlagged}
        type="button"
        value={this.props.flagged ? "Un-flag Plot" : "Flag Plot"}
      />
      <input
        className="btn btn-outline-red btn-sm col"
        onClick={this.clearAll}
        type="button"
        value="Clear All"
      />
    </div>
  );

  render() {
    return (
      <fieldset className="justify-content-center text-center">
        <CollapsibleTitle
          showGroup={this.state.showSurveyQuestions}
          title="Survey Questions"
          toggleShow={() => this.setState({ showSurveyQuestions: !this.state.showSurveyQuestions })}
        />
        {this.props.allowDrawnSamples && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span
              onClick={() => this.props.setAnswerMode("question", this.state.drawTool)}
              style={this.buttonStyle(this.props.answerMode === "question")}
              title="Answer questions"
            >
              <SvgIcon cursor="pointer" icon="question" size="2rem" />
            </span>
            <span
              onClick={() => this.props.setAnswerMode("draw", this.state.drawTool)}
              style={this.buttonStyle(this.props.answerMode === "draw")}
              title="Draw sample points"
            >
              <SvgIcon cursor="pointer" icon="draw" size="2rem" />
            </span>
          </div>
        )}
        {this.state.showSurveyQuestions ? (
          lengthObject(this.props.surveyQuestions) ? (
            <>
              {this.props.answerMode === "question"
                ? this.renderQuestions()
                : this.renderDrawTools()}
              {this.props.collectConfidence && !this.props.flagged && (
                <>
                <div
                  className="row mb-3 mx-1 slide-container py-3"
                  style={{
                    borderRadius: "6px",
                    boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  <input
                    className="slider"
                    max="100"
                    min="0"
                    onChange={(e) => this.props.setConfidence(parseInt(e.target.value))}
                    type="range"
                    value={this.props.confidence}
                  />
                  <label>Plot Confidence: {this.props.confidence}</label>
                </div>
                <div
                  className="row mb-3 mx-1 slide-container py-3"
                  style={{
                    borderRadius: "6px",
                    boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  <label>Comment on the confidence (optional):</label>
                  <textarea
                    className="form-control"
                    id="confidenceComment"
                    onChange={(e) => this.props.setConfidenceComment(e.target.value)}
                    value={this.props.confidenceComment || ""}
                  />
                </div>
                </>
              )}
              {this.renderFlagClearButtons()}
            </>
          ) : (
            <h3>This project is missing survey questions!</h3>
          )
        ) : null}
      </fieldset>
    );
  }
}
