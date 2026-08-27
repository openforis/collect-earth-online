import React, { useEffect, useState, useContext } from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import SurveyRulesList from "../survey/SurveyRulesList";
import NewRuleDesigner from "../wizard/NewRuleDesigner";
import { SurveyQuestions } from '../components/SurveyQuestions';

import { event_ids,  sub_ids} from "../state/projectWizard";

import "../../css/project-wizard.css";


function SurveyRuleDesigner({events, subs}) {
  return (
    <div className="wizard-sidebar">
      <div className="wizard-card">
        <SurveyRulesList inDesignMode events={events} subs={subs}/>
        <NewRuleDesigner events={events} subs={subs}/>
      </div>
    </div>
  );
}

export default function RulesStep () {

  const questions = useSubscription([sub_ids.questions.questions]);

  const PreviewCard = () => {
    return(
      <div
        className="wizard-preview-body"
        style={{paddingRight: '20px'}}>
        <div>
          <SurveyQuestions
            preview={true}
            surveyQuestions={questions}
          />
        </div>
      </div>
    );
  };
  
  return (
    <div className="wizard-step-layout">
      <SurveyRuleDesigner/>
      <PreviewCard/>
    </div>
  );
};
