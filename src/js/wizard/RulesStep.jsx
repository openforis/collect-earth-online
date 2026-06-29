import React, { useEffect, useState, useContext } from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import SurveyRuleDesigner from "../survey/SurveyRulesDesigner";
import { SurveyQuestions } from '../components/SurveyQuestions';

import { event_ids,  sub_ids} from "../state/projectWizard";

import "../../css/project-wizard.css";


export default function RulesStep () {

  const questions = useSubscription([sub_ids.questions.questions]);

  const PreviewCard = () => {
    return(<div className="question-preview-container">
             <div
               className="map-area"
               style={{ overflowY: 'auto', padding: "20px", width: '100%'}}
             >
               <div>
                 <SurveyQuestions
                   preview={true}
                   surveyQuestions={questions}
                 />
               </div>
             </div>
           </div>);
  };
  
  return (
    <div style={{display: 'inline-flex', width: '100%'}}>
      <SurveyRuleDesigner/>
      <PreviewCard/>
    </div>
  );
};
