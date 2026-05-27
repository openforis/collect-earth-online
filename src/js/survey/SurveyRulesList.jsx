import React from "react";

import SurveyRule from "./SurveyRule";

import { useSubscription, dispatch } from '@flexsurfer/reflex';

import {event_ids, sub_ids} from "../state/projectWizard";

export default function SurveyRulesList({ inDesignMode , events, subs}) {
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  function setProjectDetails (projectDetails) {dispatch([event_ids.projectDetails, projectDetails]);}
  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  return (surveyRules || []).length > 0 ? (
    <div>
      {surveyRules.map((rule) => (
        <div key={rule.id} style={{ display: "flex", alignItems: "center" }}>
          <SurveyRule
            inDesignMode={inDesignMode}
            rule={rule}
            setProjectDetails={setProjectDetails}
            surveyQuestions={surveyQuestions}
            surveyRules={surveyRules}
          />
        </div>
      ))}
    </div>
  ) : (
    <label className="ml-3">No rules have been created for this survey.</label>
  );
}
