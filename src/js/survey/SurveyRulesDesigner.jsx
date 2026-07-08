import React from "react";

import SurveyRulesList from "./SurveyRulesList";
// import NewRuleDesigner from "./NewRuleDesigner";

export default function SurveyRuleDesigner({events, subs}) {
  return (
    <div className="survey-rules-container">
      <div style={{backgroundColor: 'white'}} >
        <SurveyRulesList inDesignMode events={events} subs={subs}/>
        {/* <NewRuleDesigner events={events} subs={subs}/> */}
      </div>
    </div>
  );
}
