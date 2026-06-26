import React, { useEffect, useState, useContext } from "react";
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { event_ids, sub_ids } from "../state/projectWizard";

import SvgIcon from '../components/svg/SvgIcon';
import SurveyRule from '../survey/SurveyRule';
import { SurveyQuestions } from '../components/SurveyQuestions';
import { NewMap } from '../components/NewMap';;

import "../../css/project-wizard.css";


export default function ReviewStep ({imageryList = []}) {

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
          <div onClick={()=>{dispatch([event_ids.currentStep, 'overview']);}}>
          <SvgIcon icon='edit' size='2rem'/>
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
    const selectedImageryIds = useSubscription([sub_ids.imagery.imagery]);
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">IMAGERY</p>
          <div onClick={()=>{dispatch([event_ids.currentStep, 'imagery']);}}>
          <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        <p >Imagery Used:</p>
        {selectedImageryIds.map((selectedId)=>{return (
          <b > {imageryList.filter(({id})=> id === selectedId)[0].title} </b>);})
        }
      </div>
    );
  }

  function BoundaryCard () {
    const aoiFeatures = useSubscription([sub_ids.boundary.aoiFeatures]) || [];
    return (
      <div className='projectWizardCard' style={{height: '420px'}}>
        <div className='review-card-header'>
          <p className="card-title">BOUNDARY</p>
          <div onClick={()=>{dispatch([event_ids.currentStep, 'boundary']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
      <div className="map-area" style={{width: '670px',
                                        height: '335px',
                                        marginTop: '3rem',
                                        position: 'absolute'}}>
          <NewMap 
            pan={false}
            aoiToShow={aoiFeatures}
            initZoom={4}
          />
        </div>
      </div>
    );

  }

  function PlotsCard () {
    const plotDistribution = useSubscription([sub_ids.plots.plotDistribution]);
    const numPlots = useSubscription([sub_ids.plots.numPlots]);
    const plotShape = useSubscription([sub_ids.plots.plotShape]);
    const plotSize = useSubscription([sub_ids.plots.plotSize]);
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">SURVEY PLOTS</p>
          <div onClick={()=>{dispatch([event_ids.currentStep, 'plots']);}}>
          <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        <p>Plot Distribution: <b>{plotDistribution}</b></p>
        <p>Number of Plots: <b>{numPlots}</b></p>
        <p>Plot Shape: <b>{plotShape}</b></p>
        <p>Plot Size: <b>{plotSize}</b></p>
        <p>User Assignment: <b>{''}</b></p>
        <p>Quality Control: <b>{''}</b></p>
      </div>
    );
  }

  function SamplesCard () {
    const allowDrawnSamples = useSubscription([sub_ids.samples.allowDrawnSamples]);
    const sampleDistribution = useSubscription([sub_ids.samples.sampleDistribution]);
    const samplesPerPlot = useSubscription([sub_ids.samples.samplesPerPlot]);
    const numPlots = useSubscription([sub_ids.plots.numPlots]);
    return (
      <div className='projectWizardCard'>
        <div className='review-card-header'>
          <p className="card-title">PLOT SAMPLES</p>
          <div  onClick={()=>{dispatch([event_ids.currentStep, 'samples']);}}>
            <SvgIcon icon='edit' size='2rem'/>
          </div>
        </div>
        <p>Sample Distribution: <b>{sampleDistribution}</b></p>
        <p>Samples Per Plot: <b>{samplesPerPlot}</b></p>
        <p>Total Samples: <b>{Number(samplesPerPlot) * Number(numPlots)}</b></p>
        <b > {!allowDrawnSamples && "Don't "} Allow users to draw their own samples</b>
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
           <SurveyQuestions preview={true} surveyQuestions={questions} showHeader={false}/>
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
          <div onClick={()=>{dispatch([event_ids.currentStep, 'rules']);}}>
          <SvgIcon icon='edit' size='2rem'/>
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
