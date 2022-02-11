import React, {useContext} from "react";

import SurveyCard from "./SurveyCard";

import {mapObjectArray, filterObject} from "../utils/sequence";
import {ProjectContext} from "../project/constants";

export default function SurveyCardList({editMode}) {
    const {surveyQuestions} = useContext(ProjectContext);
    const topLevelNodes = mapObjectArray(
        filterObject(surveyQuestions, ([_id, sq]) => sq.parentQuestionId === -1),
        ([id, _sq]) => Number(id)
    );
    return topLevelNodes.map((nodeId, idx) => (
        <SurveyCard
            key={nodeId}
            cardNumber={idx + 1}
            editMode={editMode}
            surveyQuestionId={nodeId}
            topLevelNodeIds={topLevelNodes}
        />
    ));
}
