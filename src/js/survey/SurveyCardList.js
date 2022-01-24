import React from "react";

import SurveyCard from "./SurveyCard";

import {mapObjectArray, filterObject} from "../utils/sequence";

export default function SurveyCardList(props) {
    const topLevelNodes = mapObjectArray(
        filterObject(props.surveyQuestions, ([_id, sq]) => sq.parentQuestionId === -1),
        ([id, _sq]) => Number(id)
    );
    return topLevelNodes.map((nodeId, idx) => (
        <SurveyCard
            key={nodeId}
            cardNumber={idx + 1}
            inDesignMode={props.inDesignMode}
            setProjectDetails={props.setProjectDetails}
            surveyQuestionId={nodeId}
            surveyQuestions={props.surveyQuestions}
            surveyRules={props.surveyRules}
            topLevelNodeIds={topLevelNodes}
        />
    ));
}
