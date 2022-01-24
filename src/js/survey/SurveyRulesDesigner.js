import React, {useContext} from "react";

import SurveyRulesList from "./SurveyRulesList";
import NewRuleDesigner from "./NewRuleDesigner";
import {ProjectContext} from "../project/constants";

export default function SurveyRuleDesigner() {
    const {setProjectDetails, surveyRules, surveyQuestions} = useContext(ProjectContext);
    return (
        <div id="survey-rule-designer">
            <SurveyRulesList
                inDesignMode
                setProjectDetails={setProjectDetails}
                surveyQuestions={surveyQuestions}
                surveyRules={surveyRules}
            />
            <NewRuleDesigner/>
        </div>
    );
}
