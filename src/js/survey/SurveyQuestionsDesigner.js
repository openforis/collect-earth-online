import React, {useContext} from "react";

import SurveyCardList from "./SurveyCardList";
import NewQuestionDesigner from "./NewQuestionDesigner";

import {ProjectContext} from "../project/constants";

export default function SurveyQuestionsDesigner() {
    const {setProjectDetails, surveyQuestions, surveyRules} = useContext(ProjectContext);
    return (
        <div id="survey-design">
            <SurveyCardList
                inDesignMode
                setProjectDetails={setProjectDetails}
                surveyQuestions={surveyQuestions}
                surveyRules={surveyRules}
            />
            <NewQuestionDesigner
                setProjectDetails={setProjectDetails}
                surveyQuestions={surveyQuestions}
                surveyRules={surveyRules}
            />
        </div>
    );
}
