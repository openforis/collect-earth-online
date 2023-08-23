import React from "react";

import SurveyRulesList from "./SurveyRulesList";
import NewRuleDesigner from "./NewRuleDesigner";

export default function SurveyRuleDesigner() {
  return (
    <div id="survey-rule-designer">
      <SurveyRulesList inDesignMode />
      <NewRuleDesigner />
    </div>
  );
}
