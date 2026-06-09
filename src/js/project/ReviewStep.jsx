//THIS IS A PROJECT-WIZARD STEP AND PROBABLY NEEDS TO BE IN A DISTINCT DIRECTORY FROM SURVEY STEPS

import React, { useEffect, useState, useContext } from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import { ProjectContext } from './constants';

import { event_ids, sub_ids } from "../state/projectWizard";

import SvgIcon from '../components/svg/SvgIcon';
import SurveyRule from '../survey/SurveyRule';
import { SurveyQuestions } from '../components/SurveyQuestions';

import "../../css/project-wizard.css";


export default function ReviewStep () {
  const context = useContext(ProjectContext);

  function OverviewCard () {
    const projectName = useSubscription([sub_ids.overview.projectName]);
    const projectDescription = useSubscription([sub_ids.overview.projectDescription]);
    const projectVisibility = useSubscription([sub_ids.overview.visibility]);
    const dataLicenseType = "Public-Open Use"; //useSubscription([sub_ids.overview.license])
    const showGee = useSubscription([sub_ids.overview.projectOptions.gee]);
    const extraPlotColumns = useSubscription([sub_ids.overview.projectOptions.extraPlotColumns]);
    const plotConfidence = useSubscription([sub_ids.overview.projectOptions.plotConfidence]);
    const autoGeo = useSubscription([sub_ids.overview.projectOptions.autoGeo]);
    
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">OVERVIEW</p>
          <div       onClick={()=>{dispatch([event_ids.currentStep, 'overview']);}}>
          <SvgIcon icon='edit' size='2rem'
/>
      </div>
        </div>
        
        <p>Name: <b>{projectName}</b></p>
        <p>Description: <b>{projectDescription}</b></p>
        <p>Visibility: <b>{projectVisibility}</b></p>
        <p>Data License Type: <b>{projectVisibility}</b></p>

        <p className='hyperlink' >See the full agreement here.</p>

        <p > Project Options:</p>
        <b > {!showGee && "Don't "} Show GEE Script Link on Collection Page</b>
        <b > {!extraPlotColumns && "Don't "} Show Extra Plot Columns on Collection Page</b>
        <b > {!plotConfidence && "Don't "} Collect Plot Confidence</b>
        <b > {!autoGeo && "Don't "} Auto-launch Geo-Dash Window</b>
                
      </div>
    );
  }

  function ImageryCard () {
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">IMAGERY</p>
          <div 
      onClick={()=>{dispatch([event_ids.currentStep, 'imagery']);}}>
          <SvgIcon icon='edit' size='2rem'/>
      </div>
        </div>
      </div>
    );
  }

  function BoundaryCard () {
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">BOUNDARY</p>
          <div 
      onClick={()=>{dispatch([event_ids.currentStep, 'boundary']);}}>
          <SvgIcon icon='edit' size='2rem'/>
      </div>
        </div>
      </div>
    );
  }

  function PlotsCard () {
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">SURVEY PLOTS</p>
          <div onClick={()=>{dispatch([event_ids.currentStep, 'plots']);}}>
          <SvgIcon icon='edit' size='2rem'/>
      </div>
        </div>
      
      </div>
    );
  }

  function SamplesCard () {
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">PLOT SAMPLES</p>
          <div 
      onClick={()=>{dispatch([event_ids.currentStep, 'samples']);}}>
          <SvgIcon icon='edit' size='2rem'/>
      </div>
        </div>
        
      </div>
    );
  }

  function QuestionsCard () {
    const questions = useSubscription([sub_ids.questions.questions]);
    
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">SURVEY QUESTIONS</p>
          <div 
      onClick={()=>{dispatch([event_ids.currentStep, 'questions']);}}>
          <SvgIcon icon='edit' size='2rem'/>
      </div>
        </div>
        {questions.length > 0 &&
         <div className="review-card">
           <SurveyQuestions preview={true} surveyQuestions={questions}/>
         </div>}
      </div>
    );
  }

  function RulesCard () {
    const rules = useSubscription([sub_ids.rules.rules]);
    
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">SURVEY RULES</p>
          <div          onClick={()=>{dispatch([event_ids.currentStep, 'rules']);}}>
          <SvgIcon icon='edit' size='2rem'
          
        />
      </div>
        </div>

        {rules.length > 0 &&
         rules.map((rule)=>
           <SurveyRule             
             inDesignMode={false}
             rule={rule}/> )}
      </div>
    );
  }

  useEffect(()=>{
    //TODO: delete me!!
    console.log('Review Step context: ', context);
  }, []);

  return (
    <div className="project-wizard review-step">
      <OverviewCard/>
      <ImageryCard/>
      <BoundaryCard/>
      <PlotsCard/>
      <SamplesCard/>
      <QuestionsCard/>
      <RulesCard/>
    </div>
  );
}
