import React, {Fragment} from "react";

import {CollapsibleTitle} from "./FormComponents";
import RulesCollectionModal from "./RulesCollectionModal";
import SvgIcon from "./svg/SvgIcon";
import RequiredInput from "./RequiredInput";

import {mercator} from "../utils/mercator";
import {removeEnumerator, isNumber} from "../utils/generalUtils";
import {filterObject, firstEntry, intersection, lengthObject, mapObjectArray} from "../utils/sequence";

export class SurveyCollection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentNodeIndex: 0,
            topLevelNodeIds: [],
            showSurveyQuestions: true,
            drawTool: "Point"
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
        if (this.props.selectedQuestionId !== prevProps.selectedQuestionId) {
            const {parentQuestion} = this.props.surveyQuestions[this.props.selectedQuestionId];
            if (parentQuestion === -1) {
                this.setState({currentNodeIndex: this.state.topLevelNodeIds.indexOf(this.props.selectedQuestionId)});
            }
        }

        if (prevProps.surveyQuestions !== this.props.surveyQuestions) {
            this.calculateTopLevelNodes();
        }
    }

    calculateTopLevelNodes = () => {
        const {surveyQuestions} = this.props;
        this.setState({
            topLevelNodeIds: mapObjectArray(
                filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestion === -1),
                ([nodeId, _node]) => Number(nodeId)
            )
        });
    };

    prevSurveyQuestionTree = () => {
        if (this.state.currentNodeIndex > 0) {
            this.setState({currentNodeIndex: this.state.currentNodeIndex - 1});
        } else {
            alert("There are no previous questions.");
        }
    };

    nextSurveyQuestionTree = () => {
        if (this.state.currentNodeIndex < this.state.topLevelNodeIds.length - 1) {
            this.setState({currentNodeIndex: this.state.currentNodeIndex + 1});
        } else {
            alert("There are no more questions.");
        }
    };

    setSurveyQuestionTree = index => this.setState({currentNodeIndex: index});

    getNodeById = id => this.props.surveyQuestions[id]
        || {question: "", answers: [], answered: [], visible: []};

    checkAllSubAnswers = currentQuestionId => {
        const {surveyQuestions} = this.props;
        const {visible, answered} = this.getNodeById(currentQuestionId);
        const childQuestionIds = mapObjectArray(
            filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestion === currentQuestionId),
            ([key, _val]) => Number(key)
        );
        return visible.length === answered.length
            && childQuestionIds.every(cqId => this.checkAllSubAnswers(cqId));
    };

    getTopColor = nodeId => {
        if (this.checkAllSubAnswers(nodeId)) {
            return "0px 0px 6px 4px #3bb9d6 inset";
        } else {
            const {surveyQuestions} = this.props;
            const {answered} = surveyQuestions[nodeId];
            if (answered.length) {
                return "0px 0px 6px 4px yellow inset";
            } else {
                return "0px 0px 6px 4px red inset";
            }
        }
    };

    setDrawTool = newTool => {
        this.setState({drawTool: newTool});
        if (this.props.mapConfig) mercator.changeDrawTool(this.props.mapConfig, "drawLayer", newTool);
    };

    clearAll = drawTool => {
        if (this.props.answerMode === "draw" && confirm("Do you want to clear all samples from the draw area?")) {
            const {mapConfig} = this.props;
            mercator.disableDrawing(mapConfig);
            mercator.removeLayerById(mapConfig, "currentSamples");
            mercator.removeLayerById(mapConfig, "drawLayer");
            mercator.addVectorLayer(mapConfig,
                                    "drawLayer",
                                    null,
                                    mercator.ceoMapStyles("draw", "orange"));
            mercator.enableDrawing(mapConfig, "drawLayer", drawTool);
        } else if (confirm("Do you want to clear all answers?")) {
            this.props.resetPlotValues();
        }
    };

    buttonStyle = selected => ({
        padding: "4px",
        margin: ".25rem",
        ...(selected ? {border: "2px solid black", borderRadius: "4px"} : {})
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
                <label className="form-check-label" htmlFor="radio1">Black</label>
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
                <label className="form-check-label" htmlFor="radio2">White</label>
            </div>
        </div>
    );

    checkRuleTextMatch = (surveyRule, questionIdToSet, answerId, answerText) => {
        if (surveyRule.questionId === questionIdToSet
            && !RegExp(surveyRule.regex).test(answerText)) {
            return `Text match validation failed.\r\n\nPlease enter an answer that matches the expression: ${surveyRule.regex}`;
        } else {
            return null;
        }
    };

    checkRuleNumericRange = (surveyRule, questionIdToSet, answerId, answerText) => {
        if (surveyRule.questionId === questionIdToSet
            && (!isNumber(answerText)
                || answerText < surveyRule.min
                || answerText > surveyRule.max)) {
            return `Numeric range validation failed.\r\n\n Please select a value between ${surveyRule.min} and ${surveyRule.max}`;
        } else {
            return null;
        }
    };

    // TODO, sqId needs to be integer for all checks

    checkRuleSumOfAnswers = (surveyRule, questionIdToSet, answerId, answerText) => {
        if (surveyRule.questions.includes(questionIdToSet)) {
            const answeredQuestions = filterObject(
                this.props.surveyQuestions,
                ([sqId, sq]) => surveyRule.questions.includes(sqId)
                    && sq.answered.length > 0 && sqId !== questionIdToSet
            );
            if (surveyRule.questions.length === answeredQuestions.length + 1) {
                const sampleIds = this.props.getSelectedSampleIds(questionIdToSet);
                const answeredSampleIds = answeredQuestions.map(aq => aq.answered.map(a => a.sampleId));
                const commonSampleIds = answeredSampleIds.reduce(intersection, sampleIds);
                if (commonSampleIds.length > 0) {
                    return commonSampleIds.map(sampleId => {
                        const answeredSum = answeredQuestions
                            .map(aq => aq.answered.find(ans => ans.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        if (answeredSum + parseInt(answerText) !== surveyRule.validSum) {
                            const {question} = this.props.surveyQuestions[questionIdToSet];
                            return "Sum of answers validation failed.\r\n\n"
                                + `Sum for questions [${surveyRule.questionsText.toString()}] must be ${(surveyRule.validSum).toString()}.\r\n\n`
                                + `An acceptable answer for "${question}" is ${(surveyRule.validSum - answeredSum).toString()}.`;
                        } else {
                            return null;
                        }
                    }).find(res => res !== null);
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
        if (surveyRule.questionSetIds1.includes(questionIdToSet)
                || surveyRule.questionSetIds2.includes(questionIdToSet)) {
            const answeredQuestions1 = filterObject(
                this.props.surveyQuestions,
                ([sqId, sq]) => surveyRule.questionSetIds1.includes(sqId)
                    && sq.answered.length > 0 && sqId !== questionIdToSet
            );
            const answeredQuestions2 = filterObject(
                this.props.surveyQuestions,
                ([sqId, sq]) => surveyRule.questionSetIds2.includes(sqId)
                    && sq.answered.length > 0 && sqId !== questionIdToSet
            );
            if (surveyRule.questionSetIds1.length + surveyRule.questionSetIds2.length
                    === answeredQuestions1.length + answeredQuestions2.length + 1) {
                const sampleIds = this.props.getSelectedSampleIds(questionIdToSet);
                const answeredSampleIds1 = answeredQuestions1.map(aq => aq.answered.map(a => a.sampleId));
                const commonSampleIds1 = answeredSampleIds1.reduce(intersection, sampleIds);
                const answeredSampleIds2 = answeredQuestions2.map(aq => aq.answered.map(a => a.sampleId));
                const commonSampleIds2 = answeredSampleIds2.reduce(intersection, sampleIds);
                const commonSampleIds = intersection(commonSampleIds1, commonSampleIds2);
                if (commonSampleIds.length > 0) {
                    const sampleSums = commonSampleIds.map(sampleId => {
                        const sum1 = answeredQuestions1
                            .map(aq => aq.answered.find(a => a.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        const sum2 = answeredQuestions2
                            .map(aq => aq.answered.find(a => a.sampleId === sampleId).answerText)
                            .reduce((sum, num) => sum + parseInt(num), 0);
                        return [sum1, sum2];
                    });
                    const q1Value = surveyRule.questionSetIds1.includes(questionIdToSet) ? parseInt(answerText) : 0;
                    const q2Value = surveyRule.questionSetIds2.includes(questionIdToSet) ? parseInt(answerText) : 0;
                    const invalidSum = sampleSums.find(sums => sums[0] + q1Value !== sums[1] + q2Value);
                    if (invalidSum) {
                        const {question} = this.props.surveyQuestions[questionIdToSet];
                        return "Matching sums validation failed.\r\n\n"
                            + `Totals of the question sets [${surveyRule.questionSetText1.toString()}] and [${surveyRule.questionSetText2.toString()}] do not match.\r\n\n`
                            + `An acceptable answer for "${question}" is ${Math.abs(invalidSum[0] - invalidSum[1])}.`;
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
        if (surveyRule.question1 === questionIdToSet && surveyRule.answer1 === answerId) {
            const ques2 = this.props.surveyQuestions[surveyRule.question2];
            if (ques2.answered.some(ans => ans.answerId === surveyRule.answer2)) {
                const ques1Ids = this.props.getSelectedSampleIds(questionIdToSet);
                const ques2Ids = ques2.answered.filter(ans => ans.answerId === surveyRule.answer2).map(a => a.sampleId);
                const commonSampleIds = intersection(ques1Ids, ques2Ids);
                if (commonSampleIds.length > 0) {
                    return "Incompatible answers validation failed.\r\n\n"
                        + `Answer "${surveyRule.answerText1}" from question "${surveyRule.questionText1}" is incompatible with\r\n`
                        + `answer "${surveyRule.answerText2}" from question "${surveyRule.questionText2}".\r\n\n`;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else if (surveyRule.question2 === questionIdToSet && surveyRule.answer2 === answerId) {
            const ques1 = this.props.surveyQuestions[surveyRule.question1];
            if (ques1.answered.some(ans => ans.answerId === surveyRule.answer1)) {
                const ques2Ids = this.props.getSelectedSampleIds(questionIdToSet);
                const ques1Ids = ques1.answered.filter(ans => ans.answerId === surveyRule.answer1).map(a => a.sampleId);
                const commonSampleIds = intersection(ques1Ids, ques2Ids);
                if (commonSampleIds.length > 0) {
                    return "Incompatible answers validation failed.\r\n\n"
                        + `Answer "${surveyRule.answerText2}" from question "${surveyRule.questionText2}" is incompatible with\r\n`
                        + `answer "${surveyRule.answerText1}" from question "${surveyRule.questionText1}".\r\n\n`;
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

    rulesViolated = (questionIdToSet, answerId, answerText) => {
        const ruleFunctions = {
            "text-match": this.checkRuleTextMatch,
            "numeric-range": this.checkRuleNumericRange,
            "sum-of-answers": this.checkRuleSumOfAnswers,
            "matching-sums": this.checkRuleMatchingSums,
            "incompatible-answers": this.checkRuleIncompatibleAnswers
        };
        return this.props.surveyRules
        && this.props.surveyRules
            .map(surveyRule => ruleFunctions[surveyRule.ruleType](surveyRule, questionIdToSet, answerId, answerText))
            .find(msg => msg);
    };

    validateAndSetCurrentValue = (questionIdToSet, answerId, answerText) => {
        const ruleError = this.rulesViolated(questionIdToSet, answerId, answerText);
        if (ruleError) {
            alert(ruleError);
        } else {
            this.props.setCurrentValue(questionIdToSet, answerId, answerText);
        }
    };

    renderQuestions = () => (
        <div className="SurveyQuestions__questions mx-1">
            {this.unansweredColor()}
            {this.props.flagged
                ? (
                    <>
                        <div style={{color: "red", fontSize: "1.5rem"}}>This plot has been flagged.</div>
                        <div className="my-2">
                            <div className="slide-container">
                                <label>Flagged Reason</label>
                                <textarea
                                    className="form-control"
                                    onChange={e =>
                                        this.props.setFlaggedReason(e.target.value)}
                                    value={this.props.flaggedReason}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="SurveyQuestions__top-questions">
                            <button
                                className="btn btn-outline-lightgreen m-2"
                                disabled={this.state.currentNodeIndex === 0}
                                id="prev-survey-question"
                                onClick={this.prevSurveyQuestionTree}
                                style={{opacity: this.state.currentNodeIndex === 0 ? "0.25" : "1.0"}}
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
                                        boxShadow:
                                    `${(i === this.state.currentNodeIndex)
                                        ? "0 0 4px 2px rgba(0, 0, 0, 1), "
                                        : "0 0 2px 1px rgba(0, 0, 0, 0.1), "}
                                    ${this.getTopColor(this.getNodeById(nodeId))}`
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
                                    opacity: this.state.currentNodeIndex === this.state.topLevelNodeIds.length - 1
                                        ? "0.25"
                                        : "1.0"
                                }}
                                type="button"
                            >
                                {">"}
                            </button>
                        </div>
                        {this.state.topLevelNodeIds.length > 0 && (
                            <SurveyQuestionTree
                                hierarchyLabel=""
                                selectedQuestionId={this.props.selectedQuestionId}
                                selectedSampleId={this.props.selectedSampleId}
                                setSelectedQuestion={this.props.setSelectedQuestion}
                                surveyNodeId={this.getNodeById(this.state.currentNodeIndex)}
                                surveyQuestions={this.props.surveyQuestions}
                                surveyRules={this.props.surveyRules}
                                validateAndSetCurrentValue={this.validateAndSetCurrentValue}
                            />
                        )}
                    </>
                )}
        </div>
    );

    renderDrawTool = ({icon, title, type, state}) => (
        <div
            onClick={() => this.setDrawTool(type)}
            style={{alignItems: "center", cursor: "pointer", display: "flex"}}
            title={title}
        >
            <span style={this.buttonStyle(state.drawTool === type)}>
                <SvgIcon icon={icon} size="2rem"/>
            </span>
            {`${type} tool`}
        </div>
    );

    renderDrawTools = () => (
        <div style={{display: "flex", flexDirection: "column"}}>
            {this.props.sampleGeometries.points
                && this.renderDrawTool({
                    icon: "point",
                    state: this.state,
                    title: "Click anywhere to add a new point.",
                    type: "Point"
                })}
            {this.props.sampleGeometries.lines
                && this.renderDrawTool({
                    icon: "lineString",
                    state: this.state,
                    title: "Click anywhere to start drawing.\n"
                        + "A new point along the line string can be added with a single click.\n"
                        + "Right click or double click to finish drawing.\n",
                    type: "LineString"
                })}
            {this.props.sampleGeometries.polygons
                && this.renderDrawTool({
                    icon: "polygon",
                    state: this.state,
                    title: "Click anywhere to start drawing.\n"
                        + "A new vertex can be added with a single click.\n"
                        + "Right click, double click, or complete the polygon to finish drawing.\n",
                    type: "Polygon"
                })}
            <ul style={{textAlign: "left"}}>
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
                    toggleShow={() => this.setState({showSurveyQuestions: !this.state.showSurveyQuestions})}
                />
                {this.props.allowDrawnSamples && (
                    <div style={{display: "flex", justifyContent: "center"}}>
                        <span
                            onClick={() => this.props.setAnswerMode("question", this.state.drawTool)}
                            style={this.buttonStyle(this.props.answerMode === "question")}
                            title="Answer questions"
                        >
                            <SvgIcon cursor="pointer" icon="question" size="2rem"/>
                        </span>
                        <span
                            onClick={() => this.props.setAnswerMode("draw", this.state.drawTool)}
                            style={this.buttonStyle(this.props.answerMode === "draw")}
                            title="Draw sample points"
                        >
                            <SvgIcon cursor="pointer" icon="draw" size="2rem"/>
                        </span>
                    </div>
                )}
                {this.state.showSurveyQuestions
                    ? lengthObject(this.props.surveyQuestions)
                        ? (
                            <>
                                {this.props.answerMode === "question"
                                    ? this.renderQuestions()
                                    : this.renderDrawTools()}
                                {this.props.collectConfidence && !this.props.flagged && (
                                    <div
                                        className="row mb-3 mx-1 slide-container py-3"
                                        style={{
                                            borderRadius: "6px",
                                            boxShadow: "0 0 2px 1px rgba(0, 0, 0, 0.15)"
                                        }}
                                    >
                                        <input
                                            className="slider"
                                            max="100"
                                            min="0"
                                            onChange={e => this.props.setConfidence(parseInt(e.target.value))}
                                            type="range"
                                            value={this.props.confidence}
                                        />
                                        <label>Plot Confidence: {this.props.confidence}</label>
                                    </div>
                                )}
                                {this.renderFlagClearButtons()}
                            </>
                        ) : <h3>This project is missing survey questions!</h3>
                    : null}
            </fieldset>
        );
    }
}

class SurveyQuestionTree extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showAnswers: true
        };
    }

    toggleShowAnswers = () => this.setState({showAnswers: !this.state.showAnswers});

    render() {
        const {
            hierarchyLabel,
            surveyNodeId,
            surveyQuestions,
            surveyRules,
            selectedQuestionId,
            selectedSampleId,
            setSelectedQuestion,
            validateAndSetCurrentValue
        } = this.props;
        const {showAnswers} = this.state;
        const childNodes = filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestion === surveyNodeId);
        const nodeQuestion = surveyQuestions[surveyNodeId];
        return (
            <>
                <fieldset
                    className="justify-content-center text-center"
                    style={{
                        border: "1px solid rgba(0, 0, 0, 0.2)",
                        borderRadius: "6px",
                        boxShadow: surveyNodeId === selectedQuestionId
                            ? "0 0 4px 2px rgba(0, 0, 0, 1)"
                            : "0 0 2px 1px rgba(0, 0, 0, 0.15)",
                        margin: "1rem 0",
                        padding: ".5rem"
                    }}
                >
                    <div className="SurveyQuestionTree__question-buttons btn-block my-2 d-flex">
                        <button
                            className="text-center btn btn-outline-lightgreen btn-sm text-bold px-3 py-2 mr-1"
                            onClick={this.toggleShowAnswers}
                            type="button"
                        >
                            {showAnswers ? <span>-</span> : <span>+</span>}
                        </button>
                        <RulesCollectionModal surveyNodeId={surveyNodeId} surveyRules={surveyRules}/>
                        <button
                            className="text-center btn btn-outline-lightgreen btn-sm col text-truncate"
                            onClick={() => setSelectedQuestion(surveyNodeId)}
                            style={{
                                boxShadow: nodeQuestion.answered.length === 0
                                    ? "0px 0px 6px 4px red inset"
                                    : nodeQuestion.answered.length === nodeQuestion.visible.length
                                        ? "0px 0px 6px 5px #3bb9d6 inset"
                                        : "0px 0px 6px 4px yellow inset"
                            }}
                            title={removeEnumerator(nodeQuestion.question)}
                            type="button"
                        >
                            {hierarchyLabel + removeEnumerator(nodeQuestion.question)}
                        </button>
                    </div>

                    {showAnswers && (
                        <SurveyAnswers
                            selectedSampleId={selectedSampleId}
                            surveyNode={nodeQuestion} // TODO is it better to pass derived val if already derived?
                            surveyNodeId={surveyNodeId}
                            surveyQuestions={surveyQuestions}
                            validateAndSetCurrentValue={validateAndSetCurrentValue}
                        />
                    )}
                </fieldset>
                {/* TODO, why do the nodes need to be an object */}
                {/* TODO, probably keep passing id? */}
                {mapObjectArray(childNodes, ([strId, node]) => {
                    const nodeId = Number(strId);
                    return surveyQuestions[nodeId].visible.length > 0 && (
                        <SurveyQuestionTree
                            key={nodeId}
                            hierarchyLabel={hierarchyLabel + "- "}
                            selectedQuestionId={selectedQuestionId}
                            selectedSampleId={selectedSampleId}
                            setSelectedQuestion={setSelectedQuestion}
                            surveyNode={node}
                            surveyNodeId={nodeId} // is it better to pass derived val if already derived?
                            surveyQuestions={surveyQuestions}
                            validateAndSetCurrentValue={validateAndSetCurrentValue}
                        />
                    );
                })}
            </>
        );
    }
}

function AnswerButton({surveyNodeId, surveyNode, selectedSampleId, validateAndSetCurrentValue}) {
    const {answers, answered} = surveyNode;
    return (
        <ul className="samplevalue justify-content-center my-1">
            {mapObjectArray(answers, ([strId, ans]) => {
                const ansId = Number(strId);
                return (
                    // TODO, do these need compound keys
                    <li key={ansId} className="mb-1">
                        <button
                            className="btn btn-outline-darkgray btn-sm btn-block pl-1 text-truncate"
                            id={ans.answer + "_" + ansId}
                            onClick={() => validateAndSetCurrentValue(surveyNodeId, ansId, ans.answer)}
                            style={{
                                boxShadow: answered.some(a => a.answerId === ansId && a.sampleId === selectedSampleId)
                                    ? "0px 0px 8px 3px black inset"
                                    : answered.some(a => a.answerId === ansId)
                                        ? "0px 0px 8px 3px grey inset"
                                        : "initial"
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
                                    marginTop: "4px"
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

// TODO, do we really need radio button?
function AnswerRadioButton({
    surveyNode,
    surveyNodeId,
    selectedSampleId,
    validateAndSetCurrentValue
}) {
    const {answers, answered} = surveyNode;
    return (
        <ul className="samplevalue justify-content-center">
            {mapObjectArray(answers, ([strId, ans]) => {
                const ansId = Number(strId);
                return (
                    <li key={ansId} className="mb-1">
                        <button
                            className="btn btn-outline-darkgray btn-sm btn-block pl-1 text-truncate"
                            onClick={() => validateAndSetCurrentValue(surveyNodeId, ansId, ans.answer)}
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
                                    backgroundColor: answered.some(a =>
                                        a.answerId === ansId && a.sampleId === selectedSampleId)
                                        ? "black"
                                        : answered.some(a => a.answerId === ansId)
                                            ? "#e8e8e8"
                                            : "white"
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
            newInput: ""
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props.selectedSampleId !== prevProps.selectedSampleId) {
            this.resetInputText();
        }
    }

    resetInputText = () => {
        const answerId = Number(firstEntry(this.props.surveyNode.answers)[0]);
        const matchingNode = this.props.surveyNode.answered
            .find(a => a.answerId === answerId && a.sampleId === this.props.selectedSampleId);
        this.setState({
            newInput: matchingNode ? matchingNode.answerText : ""
        });
    };

    updateInputValue = value => this.setState({newInput: value});

    render() {
        const {newInput} = this.state;
        const {surveyNode, surveyNodeId, validateAndSetCurrentValue} = this.props;
        const {answers, dataType, required} = surveyNode;
        const [answerId, answer] = firstEntry(answers);
        return answer
            ? (
                <div className="d-inline-flex">
                    <div className="pr-2 pt-2">
                        <div
                            className="circle"
                            style={{
                                backgroundColor: answer.color,
                                border: "1px solid"
                            }}
                        />
                    </div>
                    {required ? (
                        // TODO, 'required' is a future feature to allow the admins to make inputs required or not.
                        //       This is just a place holder
                        // TODO, update RequiredInput to take option required={false}
                        <RequiredInput
                            className="form-control mr-2"
                            id={answer.answer + "_" + answerId}
                            onChange={e => this.updateInputValue(dataType === "number"
                                ? Number(e.target.value)
                                : e.target.value)}
                            placeholder={answer.answer}
                            type={dataType}
                            value={newInput}
                        />
                    ) : (
                        <input
                            className="form-control mr-2"
                            id={answer.answer + "_" + answerId}
                            name={answer.answer + "_" + answerId}
                            onChange={e => this.updateInputValue(dataType === "number"
                                ? Number(e.target.value)
                                : e.target.value)}
                            placeholder={answer.answer}
                            type={dataType}
                            value={newInput}
                        />
                    )}
                    <button
                        className="text-center btn btn-outline-lightgreen btn-sm ml-2"
                        id="save-input"
                        name="save-input"
                        onClick={() => {
                            if (!required || newInput) {
                                validateAndSetCurrentValue(surveyNodeId, answerId, newInput);
                            }
                        }}
                        style={{height: "2.5rem"}}
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
            showDropdown: false
        };
    }

    toggleDropDown = () => this.setState({showDropdown: !this.state.showDropdown});

    render() {
        const {surveyNode, surveyNode: {answers, answered}, selectedSampleId, validateAndSetCurrentValue} = this.props;
        const {showDropdown} = this.state;
        const answerOptions = mapObjectArray(answers, ([strId, ans]) => {
            const ansId = Number(strId);
            return (
                <div
                    key={ansId}
                    className="d-inline-flex py-2 border-bottom"
                    onMouseDown={() => validateAndSetCurrentValue(surveyNode, ansId, ans.answer)}
                    style={{backgroundColor: answered.some(a => a.answerId === ansId) ? "#e8e8e8" : "#f1f1f1"}}
                >
                    <div className="col-1">
                        <span
                            className="dot"
                            style={{
                                height: "15px",
                                width: "15px",
                                backgroundColor: ans.color,
                                borderRadius: "50%",
                                display: "inline-block"
                            }}
                        />
                    </div>
                    <div className="col-11 text-left">
                        {ans.answer}
                    </div>
                </div>
            );
        });

        return (
            <div className="mb-1 d-flex flex-column align-items-start">
                <div className="dropdown-selector ml-3 d-flex pl-0 col-12">
                    <div className="SelectedItem d-inline-flex border col-8">
                        {/* TODO, why are we mapping twice? This looks wrong, should be `find -> lookup answer`, I think. */}
                        {mapObjectArray(answers, ([strId, ans]) => {
                            const ansId = Number(strId);
                            return answered.some(a =>
                                a.answerId === ansId && a.sampleId === selectedSampleId) && (
                                <Fragment key={ansId}>
                                    <div className="col-1 mt-2">
                                        <span
                                            className="dot"
                                            style={{
                                                height: "15px",
                                                width: "15px",
                                                backgroundColor: ans.color,
                                                borderRadius: "50%",
                                                display: "inline-block"
                                            }}
                                        />
                                    </div>
                                    <div className="col-11 text-left mt-1">
                                        {ans.answer}
                                    </div>
                                </Fragment>
                            );
                        })}
                    </div>
                    <button
                        className="btn btn-lightgreen btn-sm"
                        onBlur={() => this.setState({showDropdown: false})}
                        onClick={this.toggleDropDown}
                        type="button"
                    >
                        <SvgIcon icon="downCaret" size="1rem"/>
                    </button>
                </div>
                <div
                    className="dropdown-content col-8"
                    id="dropdown-placeholder"
                >
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
                            cursor: "pointer"
                        }}
                    >
                        {answerOptions}
                    </div>
                </div>
            </div>
        );
    }
}

function SurveyAnswers(props) {
    const type = (props.surveyNode.componentType || "button").toLowerCase();
    return {
        radiobutton: <AnswerRadioButton {...props}/>,
        input: <AnswerInput {...props}/>,
        dropdown: <AnswerDropDown {...props}/>,
        button: <AnswerButton {...props}/>
    }[type];
}
