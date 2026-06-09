//THIS IS A PROJECT-WIZARD STEP AND PROBABLY NEEDS TO BE IN A DISTINCT DIRECTORY FROM SURVEY STEPS

import React, { useEffect, useState, useContext } from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import SurveyRuleDesigner from "../survey/SurveyRulesDesigner";
import { SurveyQuestions } from '../components/SurveyQuestions';

import { ProjectContext } from "./constants";

import { event_ids,  sub_ids} from "../state/projectWizard";

import "../../css/project-wizard.css";


export default function RulesStep () {

  const questions = useSubscription([sub_ids.questions.questions]);

  const context = useContext(ProjectContext);

  useEffect(()=>
    //TODO: delete me!!
    {console.log('Rules Step Context', context);},[]);
  

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
