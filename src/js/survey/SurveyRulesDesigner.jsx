import React from "react";

import SurveyRulesList from "./SurveyRulesList";
import NewRuleDesigner from "./NewRuleDesigner";

export default function SurveyRuleDesigner({events, subs}) {
  return (
    <div id="survey-rule-designer">
      <SurveyRulesList inDesignMode events={events} subs={subs}/>
      <NewRuleDesigner events={events} subs={subs}/>
    </div>
  );
}
