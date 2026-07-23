import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { BreadCrumbs, NavigationBar } from "./components/PageComponents";

import SvgIcon from "./components/svg/SvgIcon";
import { ImageryStep } from "./wizard/ImageryStep";
import { BoundaryStep } from "./wizard/BoundaryStep";
import { PlotStep } from "./wizard/PlotStep";
import { SurveyQuestionsStep } from "./wizard/SurveyQuestionsStep";
import { SampleStep } from "./wizard/SampleStep";
import ReviewStep from "./wizard/ReviewStep";
import OverviewStep from './wizard/OverviewStep';
import RulesStep from './wizard/RulesStep';
import NavButtons, { ProjectWizardNavigator } from './wizard/NavButtons';
import ProjectWizardModal from './wizard/Modals';
import { event_ids,  sub_ids } from "./state/projectWizard";

import "../css/project-wizard.css";


const ProjectWizard = ({userId, userName, version, institutionId, draftId}) => {

  // -------------------
  // VARS & CONSTANTS
  // ------------------
  
  const currentStep = useSubscription([sub_ids.currentStep]);
  const modal = useSubscription([sub_ids.modal]);
  const projectSource = useSubscription([sub_ids.projectSource]);
  function setInstitutionImagery (imagery) {dispatch([event_ids.institution.imagery, imagery]);}
  const institutionImagery = useSubscription([sub_ids.institution.imagery]);
  function setDraftProject (draftProject) {dispatch([event_ids.draftProject, draftProject]);};
  
  // -------------------
  // HOOKS
  // ------------------
  
  useEffect(() => {
    dispatch([event_ids.institutionId, institutionId]);
    dispatch([event_ids.modal, 'newProject']);
    draftId && setDraftProject(draftId);
    fetch(`/get-institution-imagery?institutionId=${institutionId}`)
      .then(res => res.json())
      .then(data => setInstitutionImagery(data))
      .catch(err => console.error("Could not load imagery", err));
    fetch(`/get-institution-users?institutionId=${institutionId}`)
      .then(res  => res.json())
      .then(data => dispatch([event_ids.institution.users, data]))
      .catch(err => console.error("Could not load users", err));
  }, []);
  
  // -------------------
  // RENDER FUNCTIONS
  // ------------------
    
  const CurrentStep = () => {
    switch (currentStep) {
    case null         : return (<></>);
    case 'overview'   : return <OverviewStep />;
    case 'imagery'    : return <ImageryStep imageryList={institutionImagery}/>;
    case 'boundary'   : return <BoundaryStep imageryList={institutionImagery}/>;
    case 'plots'      : return <PlotStep imageryList={institutionImagery}/>;
    case 'samples'    : return <SampleStep />;
    case 'questions'  : return <SurveyQuestionsStep/>;
    case 'rules'      : return <RulesStep />;
    case 'review'     : return <ReviewStep imageryList={institutionImagery}/>;
    default           : return <div style={{padding: "20px"}}>Step {currentStep} coming soon</div>;
    }};
  
  return (
    <div className="project-wizard-container">
      {modal && <ProjectWizardModal/>}
      <NavigationBar userId={userId} userName={userName} version={version}>
        <BreadCrumbs
          crumbs={[
            {display: "Institution",
             id: "institution",
             query: ["institution", institutionId],
             onClick:()=>{window.location.assign(`/review-institution?institutionId=${institutionId}`);
                         }},
            {display: "Add a New Project",
             id: "projectWizard",
             query: ["project", "newProject"],
             onClick:()=>{window.location.assign(`/project-wizard?institutionId=${institutionId}`);
                         }}]}
        />
        <ProjectWizardNavigator/>
        <div className="wizard-step-body" >
          {CurrentStep()}
        </div>
        <NavButtons/>
      </NavigationBar>
    </div>);
};

export function pageInit(params, session) {
  ReactDOM.render(
    <ProjectWizard
      userId={session.userId}
      userName={session.userName}
      version={session.versionDeployed}
      draftId={params.draftId}
      institutionId={params.institutionId}/>,
    document.getElementById("app")
  );
}
