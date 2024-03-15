import React, { useContext , useEffect} from "react";

import SurveyCard from "./SurveyCard";

import { mapObjectArray, mapVals } from "../utils/sequence";
import { ProjectContext } from "../project/constants";
import { isNumber } from "../utils/generalUtils";

export default function SurveyCardList({ editMode }) {
  const {setProjectDetails, surveyQuestions, validateCardOrder } = useContext(ProjectContext);

  const topLevelNodes = mapObjectArray(surveyQuestions, ([id, sq]) => ({
    nodeId: id,
    cardOrder: sq.cardOrder,
    parentQuestionId: sq.parentQuestionId
  }))
    .filter(({ cardOrder }) => isNumber(cardOrder))
    .filter(({parentQuestionId}) => parentQuestionId < 0)
    .sort((a, b) => a.cardOrder - b.cardOrder)
    .map(({ nodeId }) => Number(nodeId));

  return topLevelNodes.map((nodeId, idx) => {
    return (
    <SurveyCard
      key={nodeId}
      cardNumber={idx + 1} // card order saved in the DB isn't necessarily sequential
      editMode={editMode}
      surveyQuestionId={nodeId}
      topLevelNodeIds={topLevelNodes}
    />
  );});
}
