import React from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import SurveyRule from "./SurveyRule";
import SvgIcon from "../components/svg/SvgIcon";

import {event_ids, sub_ids} from "../state/projectWizard";


export default function SurveyRulesList({ inDesignMode}) {
  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  function setProjectDetails (projectDetails) {dispatch([event_ids.projectDetails, projectDetails]);}

  const ruleSearch = useSubscription([sub_ids.rules.search]);
  function setRuleSearch (query) {dispatch([event_ids.rules.search, query]);}

  const ruleFilter = useSubscription([sub_ids.rules.filter]);
  function setRuleFilter (filter) {dispatch([event_ids.rules.filter, filter]);}

  console.log('survey rules', surveyRules);
  
  return(
    <div style={{padding: '1rem'}}>
      <div className="survey-rules-header">
        <p>questions to be answered during collection  <span style={
          {fontWeight: 'normal',
           color: 'red'}}>*</span></p></div>
      <p>Descriptive Text Here. Just Placeholder: This is a list of all institution projects. The color around the name shows its progress. Red indicates that it has no plots collected.</p>
      {(surveyRules || []).length > 0 ? (             
        <div className='survey-rules-card'>            
          {surveyRules.map((rule) => (
            <div key={rule.id} style={{ display: "flex", alignItems: "center" }}>
              <SurveyRule
                inDesignMode={inDesignMode}
                rule={rule}
                setProjectDetails={setProjectDetails}
                surveyQuestions={surveyQuestions}
                surveyRules={surveyRules}/>
            </div>
          ))}
        </div>          
      ) : (
        <label className="ml-3">No rules have been created for this survey.</label>
      )}
    </div>);
}
