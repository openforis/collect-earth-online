import React from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import SurveyRule from "./SurveyRule";
import SvgIcon from "../components/svg/SvgIcon";

import {event_ids, sub_ids} from "../state/projectWizard";


export default function SurveyRulesList({ inDesignMode}) {
  const surveyQuestions = useSubscription([sub_ids.questions.questions]);
  
  const surveyRules = useSubscription([sub_ids.rules.rules]);
  const ruleSearch = useSubscription([sub_ids.rules.search]);
  function setRuleSearch (query) {dispatch([event_ids.rules.search, query]);}

  const ruleFilter = useSubscription([sub_ids.rules.filter]);
  function setRuleFilter (filter) {dispatch([event_ids.rules.filter, filter]);}
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
                  rule={rule}/>
              </div>
            ))}
          </div>          
        ) : (
          <label className="ml-3">No rules have been created for this survey.</label>
        )}
      {/*
         THE FOLLOWING SECTION DEFINES A PLACEHOLDER COMPONENT THAT FILTERS AND SEARCHES EXISTING RULES. THIS FEATURE IN TEMPORARILY DEPRECTAED AS WE ANTICIPATE USERS CREATING FEWER RULES
         vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
         
      <div className='survey-search-rules'>
        <div className='search-bar'>
          <SvgIcon icon='search' size='1.2rem'/>
          <input
            onChange={(e) => setRuleSearch(e.target.value)}
            type='text'
            placeholder='Search'
            value={ruleSearch}
          ></input>
        </div>
        <div className="rule-filters">
          <p className="filter-header"
          >FILTER BY:</p>
          <div
            style={{display: 'inline-flex', gap: '8px'}}              
            onClick={() => setRuleFilter('institution')}>
            {ruleFilter === 'institution' 
             ? <SvgIcon icon='radioChecked' size="1.2rem"/>
             : <SvgIcon icon='radio' size="1.2rem"
                          className='radio-button-unchecked'/>
            }
            <span
              className="filter-text"
              style={ruleFilter === 'institution'
                     ? {fontWeight: 600}
                     : {fontWeight: 400}}
            >Institution</span>
          </div>
          <div
            style={{display: 'inline-flex', gap: '8px'}}
            onClick={() => setRuleFilter('project')}>
            {ruleFilter === 'project' 
             ? <SvgIcon icon='radioChecked' size="1.2rem"/>
             : <SvgIcon icon='radio' size="1.2rem"
                                              className='radio-button-unchecked'/>
            }
            <p
              className="filter-text"
              style={ruleFilter === 'project'
                     ? {fontWeight: 600}
                     : {fontWeight: 400}} 
            >Project</p>              
            </div>
            
            
            </div>
       
            </div>
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
            */}

    </div>);
}
