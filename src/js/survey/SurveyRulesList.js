import React, {useContext} from "react";

import SurveyRule from "./SurveyRule";

import {ProjectContext} from "../project/constants";

export default function SurveyRulesList({inDesignMode}) {
    const {surveyRules, surveyQuestions} = useContext(ProjectContext);
    return (surveyRules || []).length > 0
        ? (
            <div>{surveyRules.map(rule => (
                <div key={rule.id} style={{display: "flex", alignItems: "center"}}>
                    <SurveyRule inDesignMode={inDesignMode} rule={rule} surveyQuestions={surveyQuestions}/>
                </div>
            ))}
            </div>
        ) : <label className="ml-3">No rules have been created for this survey.</label>;
}
