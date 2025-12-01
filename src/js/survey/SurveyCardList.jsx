import React, { useContext } from "react";

import SurveyCard from "./SurveyCard";

import { mapObjectArray } from "../utils/sequence";
import { ProjectContext } from "../project/constants";
import { isNumber } from "../utils/generalUtils";

export default function SurveyCardList({ editMode }) {
  const {setProjectDetails, surveyQuestions, validateCardOrder } = useContext(ProjectContext);

  const topLevelNodes = mapObjectArray(surveyQuestions, ([id, sq]) => ({
    nodeId: id,
    cardOrder: sq.cardOrder,
  }))
    .filter(({ cardOrder }) => isNumber(cardOrder))
    .sort((a, b) => a.cardOrder - b.cardOrder)
    .map(({ nodeId }) => Number(nodeId));

  return topLevelNodes.map((nodeId, idx) => {
    return (
    <SurveyCard
      key={nodeId}
      cardNumber={idx + 1}
      editMode={editMode}
      surveyQuestionId={nodeId}
     topLevelNodeIds={topLevelNodes} />
    );
  });
}
