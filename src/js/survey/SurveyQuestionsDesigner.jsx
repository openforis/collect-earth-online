import React, { useContext } from "react";

import SurveyCardList from "./SurveyCardList";
import NewQuestionDesigner from "./NewQuestionDesigner";

import { ProjectContext } from "../project/constants";

export default function SurveyQuestionsDesigner() {
  const { setProjectDetails, surveyQuestions, surveyRules, projectId, originalProject } =
    useContext(ProjectContext);
  const editMode =
    projectId === -1 || originalProject.availability === "unpublished" ? "full" : "partial";
  return (
    <div id="survey-design">
      <SurveyCardList editMode={editMode} />
      {editMode === "full" && (
        <NewQuestionDesigner
          setProjectDetails={setProjectDetails}
          surveyQuestions={surveyQuestions}
          surveyRules={surveyRules}
        />
      )}
    </div>
  );
}
