import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useSubscription, dispatch } from '@flexsurfer/reflex';

import { BreadCrumbs, NavigationBar } from "./components/PageComponents";
import Modal from "./components/Modal";
import SvgIcon from "./components/svg/SvgIcon";

import OverviewStep from './wizard/OverviewStep';
import RulesStep from './wizard/RulesStep';
import { ImageryStep } from "./wizard/ImageryStep";
import { BoundaryStep } from "./wizard/BoundaryStep";
import { PlotStep } from "./wizard/PlotStep";
import { SurveyQuestionsStep } from "./wizard/SurveyQuestionsStep";
import { SampleStep } from "./wizard/SampleStep";
import { SurveyQuestions } from "./components/SurveyQuestions";
import SurveyRuleDesigner from "./survey/SurveyRulesDesigner";
import ReviewStep from "./wizard/ReviewStep";

import { 
  event_ids,
  sub_ids
} from "./state/projectWizard";

import "../css/project-wizard.css";


const projectSteps = [
  {id: 'overview', label: 'Project Overview'},
  {id: 'imagery', label: 'Imagery Selection'},
  {id: 'boundary', label: 'Project Boundary'},
  {id: 'plots', label: 'Plot Generation'},
  {id: 'samples', label: 'Sample Design'},
  {id: 'questions', label: 'Survey Questions'},
  {id: 'rules', label: 'Survey Rules'},
  {id: 'review', label: 'Review & Publish'}
];



const publishModal = {
  title: 'Ready to publish this project?',
  id: 'review',
  closeText: "Cancel",
  confirmText: "Publish Project",
  onConfirm: ()=>{dispatch ([event_ids.validate]); }
};

const exitModal = {
  title: 'Exit "Add a New Project" Workflow?',
  id: 'exit',
  closeText: "Exit Workflow",
  confirmText: "Stay",
  onClose: ()=> {
    console.log("save and exit workflow");
  },
  onConfirm: ()=>{
    dispatch([event_ids.modal, null]);
  },

};

function NavButtons  () {
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  const  continueHandler = () => {
    const currentIdx = projectSteps.findIndex(({id})=> (id == currentStep));
    currentIdx + 1 < projectSteps.length
      ? dispatch([event_ids.currentStep, projectSteps[currentIdx + 1].id])
      : dispatch([event_ids.modal, publishModal]);
  };

  return (<div className="nav-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={()=>dispatch([event_ids.modal, exitModal])}
            >Exit</button>
            <button
              className={'btn btn-sm'}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
            >Save Draft</button>
            <button
              className={'btn btn-sm'}
              onClick={()=>continueHandler()}
              style={{backgroundColor: "#2d6f74",
                      color: "#fff"}}
            >Save & {currentStep === 'review' ? 'Publish' : 'Continue'}</button>
          </div>);
};

const ProjectWizardNavigator = () => {
  const currentStep = useSubscription([sub_ids.currentStep]);
  
  return (
    <div
      className="project-wizard-navigator">
      {projectSteps.map(({id, label}, index)=>{
        return(
          <>                         
            <div
              key={id}
              style={{fontWeight: currentStep === id ? 'bold' : 'normal',
                      display: 'inline-flex',
                      cursor: 'pointer'}}
              onClick={
                () => dispatch([event_ids.currentStep, id])
              }
            >
              <span className={currentStep === id && "selected"}
              >{index + 1}</span>
              {label}
            </div>
            {index + 1 < projectSteps.length && "- -- -"}
          </>);
      })}              
    </div>);
};

function NewProjectModal () {
  const newProjectOptions = {
    newProject: ['Create a new project',
                 'Generate a new project from scratch by customizing all steps.'],
    templateProject: ['Select from an existing template',
                      'Select a template and prefill all the steps. You can edit and customize it.'],
    importProject: ['Import Collect Earth Project',
                    'Need Description']};
  const projectSource = useSubscription([sub_ids.projectSource]);

  return (
    <div
      className="inputs">
      {Object.entries(newProjectOptions).map(([id, [title, description]]) => {
        return (
          <div
            className={projectSource === id ?
                       "radio-selected-button"
                       : "radio-selection-button"}
            key={id}
            onClick={()=> {
              dispatch([event_ids.projectSource, id]);
            }}>            
            <p
              className="radio-button-labeled"
            >{projectSource === id
              ? <SvgIcon icon="radioChecked" size="1.2rem" />                            
              : <SvgIcon icon="radio" size="1.2rem"
                         className="radio-button-unchecked"/> }
              {"    "}
              { title } </p>
            <label
              className="radio-button-description"
            >{ description }</label>
          </div>);
      })}
    </div>);
};

function SubmitProjectModal () {
  return (
    <div>
      <p >You are about to publish this project. Once published it will be added to your institution. You’ll still be able to make changes later from the project page within your institution.</p>
      <p > Are you sure you want to continue?</p>
    </div>);
};

function SuccessModal () {
  return (
    <>
      <div className="success-icon">
        <SvgIcon  icon='check' size='2rem'/>
      </div>
      <br/>
      <b>Your Project has been published! </b>
      <p >The Published Project can now be viewed in your Institutions Project Page.</p>
    </>
  );
};

function ErrorModal () {
  const errors = useSubscription([sub_ids.errors]);
  const [visible, setVisible] = useState([]);
  function toggleVisible (errorType) {
    visible.includes(errorType) ? setVisible(visible.filter((e) => e !== errorType)) : setVisible([... visible, errorType]);
  };
  function stepName (errorType) {
    switch(errorType){
    case 'overview' : return 'Overview Step';
    case 'imagery' : return 'Imagery Step';
    case 'plots' : return 'Plot Step';
    case 'samples' : return 'Plot Samples';
    case 'questions' : return 'Survey Questions';
    default: return null;
    }
  }
  return  (
    <div style={{display: 'flex',
                 flexDirection: 'column',
                 gap: '1rem'}}>
      <div className='alert-icon'>
        <SvgIcon  icon='alert' size='2rem'/>
      </div>
      <b className='error-title'> Your Project contains the following errors:</b>
      <br/>      
      {errors.map(([errorType, errorMessages])=> {
        return (<div className='error-card'>
                  <div className='error-header' onClick={()=>toggleVisible(errorType)}>
                    <b > {stepName(errorType)}</b>
                    <SvgIcon icon={visible.includes(errorType) ? 'upCaretNew' : 'downCaretNew'}
                             size='1.2rem'> </SvgIcon>
                  </div>
                  {visible.includes(errorType) &&
                   <div style={{gap: '1rem'}}>
                     <br/>
                     {errorMessages.map((message) => {
                       return (
                         <p > - {message}
                         </p>);
                     })}
                   </div>}                  
                </div>);
      })}
    </div>
  );
};


function ExitModal () {
  return (
    <p > Are you sure you want to exit “Create New Scenario”? Saved steps will be kept in draft form, any steps you haven’t saved will be lost.</p>
  );
}

const ProjectWizardModal = () => {
  // this is the container for any modal related to this page. based on state, this actually renders modals as they are explicitly defined above., provided through "children" value of modal map"
  const projectSource = useSubscription([sub_ids.projectSource]);
  const modal = useSubscription([sub_ids.modal]);

  
  const children = () => {
    switch (modal.id) {
    case 'newProject'  : return (<NewProjectModal/>);
    case 'review'      : return (<SubmitProjectModal/>);
    case 'success'     : return (<SuccessModal/>);
    case 'error'       : return (<ErrorModal/>);
    case 'exit'        : return (<ExitModal/>);
    default : break;
    }};

  const confirmDisabled = () => {
    switch (modal.id) {
    case 'newProject'
      : return projectSource === null;
    default: return false;
    }};
  
  return (
    <Modal
      title={modal.title}
      closeText={modal.closeText}
      confirmText={modal.confirmText}
      onConfirm={modal.onConfirm && modal.onConfirm}
      confirmDisabled={confirmDisabled()}
      onClose={()=>{
        modal.onClose ? modal.onClose()
          : dispatch([event_ids.modal, null]);
      }}>
      {children()}
    </Modal>);
};

const ProjectWizard = ({userId, userName, version, institutionId}) => {

  // -------------------
  // VARS & CONSTANTS
  // ------------------
  
  const currentStep = useSubscription([sub_ids.currentStep]);
  const modal = useSubscription([sub_ids.modal]);

  
  // -------------------
  // HANDLERS
  // ------------------
  
  const handleNewProject = () => {
    dispatch([event_ids.modal, null]);
    dispatch([event_ids.currentStep, 'overview']);
  };

  
  // -------------------
  // HOOKS
  // ------------------
  
  useEffect(() => {
      dispatch([event_ids.modal, {
      title: 'Project Setup',
      closeText: '',
      confirmText: 'Get Started',
      onConfirm: handleNewProject,
      id: 'newProject',
      children: (<NewProjectModal/>)}]);  
    fetch(`/get-institution-imagery?institutionId=${institutionId}`)
      .then(res => res.json())
      .then(data => setAvailableImagery(data))
      .catch(err => console.error("Could not load imagery", err));
    fetch(`/get-institution-users?institutionId=${institutionId}`)
      .then(res  => res.json())
      .then(data => dispatch([event_ids.institution.users, data]))
      .catch(err => console.error("Could not load users", err));
  }, []);

  
  // -------------------
  // RENDER FUNCTIONS
  // ------------------
  
  const [availableImagery, setAvailableImagery] = useState([]);
  
  const CurrentStep = () => {
    switch (currentStep) {
    case null         : return (<></>);
    case 'overview'   : return <OverviewStep />;
    case 'imagery'    : return <ImageryStep imageryList={availableImagery}/>;
    case 'boundary'   : return <BoundaryStep />;
    case 'plots'      : return <PlotStep />;
    case 'samples'    : return <SampleStep />;
    case 'questions'  : return <SurveyQuestionsStep/>;
    case 'rules'      : return <RulesStep />;
    case 'review'     : return <ReviewStep imageryList={availableImagery}/>;
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
      institutionId={params.institutionId}/>,
    document.getElementById("app")
  );
}
