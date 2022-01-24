import React from "react";
import _ from "lodash";

import SurveyCollection from "./SurveyCollection";

import {ProjectContext} from "../project/constants";
import {lengthObject, mapObjectArray, filterObject, mapObject} from "../utils/sequence";

export default class SurveyQuestionsPreview extends React.Component {
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
            filterObject(surveyQuestions, ([_id, val]) => val.parentQuestionId === currentQuestionId),
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
        const {parentQuestionId, parentAnswerId} = surveyQuestions[currentQuestionId];

        if (parentQuestionId === -1) {
            return [{id: 1}];
        } else {
            return this.calcVisibleSamples(parentQuestionId)
                .filter(sample => {
                    const sampleAnswerId = _.get(userSamples, [sample.id, parentQuestionId, "answerId"]);
                    return sampleAnswerId && (parentAnswerId === -1 || parentAnswerId === sampleAnswerId);
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
SurveyQuestionsPreview.contextType = ProjectContext;
